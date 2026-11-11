import {
  effectiveAppearance,
  loadAppearance,
  type Skin,
  type Variant,
} from './appearance'
import { safeLocalStorage } from './safeStorage'

export function initialAppearance(
  storage: Pick<Storage, 'getItem'> | null,
  pathname: string,
  prefersDark: boolean,
): { skin: Skin; variant: Variant } {
  return effectiveAppearance(loadAppearance(storage), pathname, prefersDark)
}

// Sets the skin/variant attributes and keeps <meta name="color-scheme"> in sync
// (index.html is not edited, so the meta is created from code).
export function applyToDocument(skin: Skin, variant: Variant): void {
  const root = document.documentElement
  root.dataset.skin = skin
  root.dataset.variant = variant
  let meta = document.head.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'color-scheme'
    document.head.appendChild(meta)
  }
  meta.content = variant
}

// Called synchronously before the first render so the first styled paint
// already has the right skin and variant.
export function applyInitialAppearance(): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const { skin, variant } = initialAppearance(safeLocalStorage(), window.location.pathname, prefersDark)
  applyToDocument(skin, variant)
}
