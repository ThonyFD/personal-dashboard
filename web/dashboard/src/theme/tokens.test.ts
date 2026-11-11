import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { contrastRatio, parseTokenBlock } from './contrast'

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')
const dark = parseTokenBlock(css, ':root')
const light = { ...parseTokenBlock(css, ':root[data-variant="light"]') }

describe('contrastRatio', () => {
  it('computes extremes', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contrastRatio('#777777', '#777777')).toBe(1)
  })
  it('accepts short hex and rgba composited over the second argument', () => {
    expect(contrastRatio('#FFF', '#000')).toBeCloseTo(21, 5)
    expect(contrastRatio('rgba(255, 255, 255, 1)', '#000000')).toBeCloseTo(21, 5)
    expect(contrastRatio('rgba(255, 255, 255, 0)', '#000000')).toBe(1)
  })
})

const variants: Array<[string, Record<string, string>]> = [
  ['dark', dark],
  ['light', light],
]

describe.each(variants)('brand %s tokens', (_name, t) => {
  const c = (fg: string, bg: string) => contrastRatio(t[fg], t[bg])
  it('text tokens meet 4.5:1', () => {
    expect(c('--c-text', '--c-bg')).toBeGreaterThanOrEqual(4.5)
    expect(c('--c-text-2', '--c-bg')).toBeGreaterThanOrEqual(4.5)
    expect(c('--c-text', '--c-surface')).toBeGreaterThanOrEqual(4.5)
  })
  it('tertiary text meets 3:1', () => {
    expect(c('--c-text-3', '--c-bg')).toBeGreaterThanOrEqual(3)
  })
  it.each(['--c-primary', '--c-green', '--c-negative', '--c-warning'])('%s meets 3:1 on bg', (k) => {
    expect(c(k, '--c-bg')).toBeGreaterThanOrEqual(3)
  })
  it('on-accent over primary meets 4.5:1', () => {
    expect(c('--c-on-accent', '--c-primary')).toBeGreaterThanOrEqual(4.5)
  })
})

describe('variant parity', () => {
  it('every dark token exists in light', () => {
    for (const k of Object.keys(dark)) expect(light, k).toHaveProperty(k)
  })
})
