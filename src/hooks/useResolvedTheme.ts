import { useEffect, useState } from 'react'

/**
 * The theme actually in force — `light` or `dark`, with `system` already resolved.
 *
 * `useSettings` writes it to `<html data-theme>`; anything that needs the resolved value in
 * JS rather than CSS (the map's basemap, for one) reads it back from there.
 */
export function useResolvedTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (document.documentElement.dataset.theme as 'light' | 'dark') ?? 'light',
  )

  useEffect(() => {
    const read = () => setTheme((document.documentElement.dataset.theme as 'light' | 'dark') ?? 'light')
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return theme
}
