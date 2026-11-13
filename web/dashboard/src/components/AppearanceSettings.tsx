import { useAppearance } from '../theme/AppearanceContext'
import { SELECTABLE_SKINS, type Mode, type Skin } from '../theme/appearance'
import './AppearanceSettings.css'

// Allowed literal colors outside tokens.css: a skin preview must show that skin's
// own colors regardless of the active variant, so CSS vars cannot be used here.
const SKIN_SWATCHES: Partial<Record<Skin, { label: string; bg: string; surface: string; accent: string }>> = {
  brand: { label: 'Brand', bg: '#081022', surface: '#111A2E', accent: '#00D9FF' },
  nothing: { label: 'Nothing', bg: '#000000', surface: '#111111', accent: '#E61921' },
}

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
]

export default function AppearanceSettings() {
  const { appearance, setAppearance } = useAppearance()

  return (
    <div className="appearance-settings">
      <p className="menu-section-label">Apariencia</p>

      <div className="appearance-skins" role="radiogroup" aria-label="Apariencia">
        {SELECTABLE_SKINS.map(skin => {
          const sw = SKIN_SWATCHES[skin]
          if (!sw) return null
          const checked = appearance.skin === skin
          return (
            <button
              key={skin}
              type="button"
              role="radio"
              aria-checked={checked}
              className={`appearance-skin ${checked ? 'is-selected' : ''}`}
              onClick={() => setAppearance({ ...appearance, skin })}
            >
              <span className="appearance-swatch" aria-hidden="true" style={{ background: sw.bg }}>
                <span className="appearance-swatch-surface" style={{ background: sw.surface }} />
                <span className="appearance-swatch-accent" style={{ background: sw.accent }} />
              </span>
              {sw.label}
            </button>
          )
        })}
      </div>

      <p className="appearance-sublabel" id="appearance-mode-label">Modo</p>
      <div className="appearance-modes" role="radiogroup" aria-labelledby="appearance-mode-label">
        {MODE_OPTIONS.map(opt => {
          const checked = appearance.mode === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={checked}
              className={`appearance-mode ${checked ? 'is-selected' : ''}`}
              onClick={() => setAppearance({ ...appearance, mode: opt.value })}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
