import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import {
  DEFAULT_APPEARANCE,
  effectiveAppearance,
  loadAppearance,
  saveAppearance,
  type Appearance,
  type Variant,
} from './appearance'
import { applyToDocument } from './initAppearance'
import { safeLocalStorage } from './safeStorage'

interface AppearanceValue {
  appearance: Appearance
  setAppearance: (a: Appearance) => void
  variant: Variant
}

const DARK_QUERY = '(prefers-color-scheme: dark)'

const AppearanceContext = createContext<AppearanceValue>({
  appearance: DEFAULT_APPEARANCE,
  setAppearance: () => {},
  variant: 'dark',
})

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [appearance, setAppearanceState] = useState<Appearance>(() => loadAppearance(safeLocalStorage()))
  const [prefersDark, setPrefersDark] = useState(() => window.matchMedia(DARK_QUERY).matches)

  useEffect(() => {
    const mq = window.matchMedia(DARK_QUERY)
    const onChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const { skin, variant } = effectiveAppearance(appearance, pathname, prefersDark)

  useLayoutEffect(() => {
    applyToDocument(skin, variant)
  }, [skin, variant])

  const value = useMemo<AppearanceValue>(
    () => ({
      appearance,
      variant,
      setAppearance: (a) => {
        saveAppearance(safeLocalStorage(), a)
        setAppearanceState(a)
      },
    }),
    [appearance, variant],
  )

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

export function useAppearance(): AppearanceValue {
  return useContext(AppearanceContext)
}

export interface ChartColors {
  series: string[]
  text: string
  grid: string
  tooltipBg: string
}

function readChartColors(): ChartColors {
  const style = getComputedStyle(document.documentElement)
  const get = (name: string) => style.getPropertyValue(name).trim()
  return {
    series: Array.from({ length: 8 }, (_, i) => get(`--c-chart-${i + 1}`)),
    text: get('--c-text-2'),
    grid: get('--c-hairline'),
    tooltipBg: get('--c-surface'),
  }
}

// Resolved CSS token values for Recharts, which cannot take var() in all props.
// Re-read in a passive effect so it runs after the provider's layout effect has
// applied the new skin/variant to the document.
export function useChartColors(): ChartColors {
  const { appearance, variant } = useAppearance()
  const [colors, setColors] = useState<ChartColors>(readChartColors)
  useEffect(() => {
    setColors(readChartColors())
  }, [appearance.skin, variant])
  return colors
}
