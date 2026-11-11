export type Skin = 'brand' | 'nothing' | 'glass'
export type Mode = 'system' | 'light' | 'dark'
export type Variant = 'light' | 'dark'

export interface Appearance {
  skin: Skin
  mode: Mode
}

export const DEFAULT_APPEARANCE: Appearance = { skin: 'brand', mode: 'dark' }

// Only brand is selectable in this phase; nothing and glass are typed but hidden.
export const SELECTABLE_SKINS: readonly Skin[] = ['brand']

export const STORAGE_KEY = 'appearance.v1'

const MODES: readonly Mode[] = ['system', 'light', 'dark']
const PUBLIC_PATHS: readonly string[] = ['/', '/login', '/terms', '/privacy']

export function loadAppearance(storage: Pick<Storage, 'getItem'> | null): Appearance {
  if (!storage) return { ...DEFAULT_APPEARANCE }
  let parsed: unknown
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null) return { ...DEFAULT_APPEARANCE }
    parsed = JSON.parse(raw)
  } catch {
    return { ...DEFAULT_APPEARANCE }
  }
  if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_APPEARANCE }
  const { skin, mode } = parsed as Record<string, unknown>
  return {
    skin: SELECTABLE_SKINS.includes(skin as Skin) ? (skin as Skin) : DEFAULT_APPEARANCE.skin,
    mode: MODES.includes(mode as Mode) ? (mode as Mode) : DEFAULT_APPEARANCE.mode,
  }
}

export function saveAppearance(storage: Pick<Storage, 'setItem'> | null, a: Appearance): void {
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ skin: a.skin, mode: a.mode }))
  } catch {
    // Storage can be unavailable or full; appearance is a convenience only.
  }
}

export function resolveVariant(mode: Mode, prefersDark: boolean): Variant {
  if (mode === 'system') return prefersDark ? 'dark' : 'light'
  return mode
}

export function isPublicPath(pathname: string): boolean {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return PUBLIC_PATHS.includes(normalized || '/')
}

export function effectiveAppearance(
  a: Appearance,
  pathname: string,
  prefersDark: boolean,
): { skin: Skin; variant: Variant } {
  if (isPublicPath(pathname)) return { skin: 'brand', variant: 'dark' }
  return { skin: a.skin, variant: resolveVariant(a.mode, prefersDark) }
}
