import { describe, it, expect } from 'vitest'
import {
  DEFAULT_APPEARANCE,
  STORAGE_KEY,
  effectiveAppearance,
  isPublicPath,
  loadAppearance,
  resolveVariant,
  saveAppearance,
} from './appearance'

const storageWith = (value: string | null) => ({ getItem: () => value })
const throwing = () => {
  throw new Error('denied')
}

describe('loadAppearance', () => {
  it('returns default for null storage', () => {
    expect(loadAppearance(null)).toEqual(DEFAULT_APPEARANCE)
  })

  it('returns default when getItem throws', () => {
    expect(loadAppearance({ getItem: throwing })).toEqual(DEFAULT_APPEARANCE)
  })

  it('reads from the versioned key', () => {
    let key = ''
    loadAppearance({ getItem: (k: string) => ((key = k), null) })
    expect(key).toBe(STORAGE_KEY)
  })

  it.each(['not json', 'null', '{"skin":"neon","mode":"dark"}'])(
    'returns default for invalid payload %s',
    (raw) => {
      expect(loadAppearance(storageWith(raw))).toEqual(DEFAULT_APPEARANCE)
    },
  )

  it('falls back only for the invalid field', () => {
    expect(loadAppearance(storageWith('{"skin":"brand","mode":"sepia"}'))).toEqual({
      skin: 'brand',
      mode: 'dark',
    })
  })

  it('round-trips a valid value', () => {
    expect(loadAppearance(storageWith('{"skin":"brand","mode":"light"}'))).toEqual({
      skin: 'brand',
      mode: 'light',
    })
  })

  it('falls back to brand for a skin that is not selectable', () => {
    expect(loadAppearance(storageWith('{"skin":"glass","mode":"light"}'))).toEqual({
      skin: 'brand',
      mode: 'light',
    })
  })
})

describe('saveAppearance', () => {
  it('does not throw when setItem throws', () => {
    expect(() => saveAppearance({ setItem: throwing }, DEFAULT_APPEARANCE)).not.toThrow()
  })

  it('does not throw for null storage', () => {
    expect(() => saveAppearance(null, DEFAULT_APPEARANCE)).not.toThrow()
  })

  it('writes JSON under the storage key', () => {
    const written: Record<string, string> = {}
    saveAppearance({ setItem: (k, v) => void (written[k] = v) }, { skin: 'brand', mode: 'light' })
    expect(JSON.parse(written[STORAGE_KEY])).toEqual({ skin: 'brand', mode: 'light' })
  })
})

describe('resolveVariant', () => {
  it('follows system preference only in system mode', () => {
    expect(resolveVariant('system', true)).toBe('dark')
    expect(resolveVariant('system', false)).toBe('light')
    expect(resolveVariant('light', true)).toBe('light')
    expect(resolveVariant('dark', false)).toBe('dark')
  })
})

describe('isPublicPath', () => {
  it.each(['/', '/login', '/terms', '/privacy', '/login/'])('%s is public', (p) => {
    expect(isPublicPath(p)).toBe(true)
  })
  it.each(['/finance/overview', '/azton/habits'])('%s is not public', (p) => {
    expect(isPublicPath(p)).toBe(false)
  })
})

describe('effectiveAppearance', () => {
  it('forces brand dark on public paths', () => {
    expect(effectiveAppearance({ skin: 'brand', mode: 'light' }, '/login', false)).toEqual({
      skin: 'brand',
      variant: 'dark',
    })
  })
  it('uses the chosen mode elsewhere', () => {
    expect(effectiveAppearance({ skin: 'brand', mode: 'light' }, '/azton/mood', false)).toEqual({
      skin: 'brand',
      variant: 'light',
    })
  })
})
