import { describe, it, expect } from 'vitest'
import { initialAppearance } from './initAppearance'

const stored = (v: string) => ({ getItem: () => v })

describe('initialAppearance', () => {
  it('uses stored light mode on private routes', () => {
    const s = stored('{"skin":"brand","mode":"light"}')
    expect(initialAppearance(s, '/azton/habits', true)).toEqual({ skin: 'brand', variant: 'light' })
  })

  it('forces dark on public routes', () => {
    const s = stored('{"skin":"brand","mode":"light"}')
    expect(initialAppearance(s, '/login', false)).toEqual({ skin: 'brand', variant: 'dark' })
  })

  it('follows the system preference in system mode', () => {
    const s = stored('{"skin":"brand","mode":"system"}')
    expect(initialAppearance(s, '/x', false).variant).toBe('light')
  })

  it('defaults to dark without storage', () => {
    expect(initialAppearance(null, '/x', false)).toEqual({ skin: 'brand', variant: 'dark' })
  })
})
