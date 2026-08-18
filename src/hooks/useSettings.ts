import { useEffect } from 'react'
import { usePersistentState } from './usePersistentState'
import type { UnitSystem } from '../lib/units'
import { maxHrForAge } from '../lib/pace'

export type Theme = 'light' | 'dark' | 'system'

/** Units default to the locale's convention, so the first render is usually already right. */
function defaultUnits(): UnitSystem {
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en'
  const region = locale.split('-')[1]?.toUpperCase()
  return region === 'US' || region === 'LR' || region === 'MM' ? 'imperial' : 'metric'
}

export function useSettings() {
  const [units, setUnits] = usePersistentState<UnitSystem>('runify:units', defaultUnits())
  const [theme, setTheme] = usePersistentState<Theme>('runify:theme', 'system')
  // Zones need a maximum heart rate. Age 35 is a placeholder the runner can correct once,
  // after which it is remembered — asking for it up front would gate the whole app on a form.
  const [maxHr, setMaxHr] = usePersistentState<number>('runify:maxHr', maxHrForAge(35))

  // The resolved theme lives on <html> so CSS can switch tokens without a re-render, and
  // is recomputed when the OS preference changes while 'system' is selected.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
      document.documentElement.dataset.theme = resolved
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', resolved === 'dark' ? '#0f0f11' : '#ffffff')
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  return { units, setUnits, theme, setTheme, maxHr, setMaxHr }
}
