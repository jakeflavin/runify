import { useCallback, useEffect, useState } from 'react'

/**
 * `useState` that survives a reload, and stays in step across tabs.
 *
 * Reads are lazy and defensive: a value written by an older build (or hand-edited) that no
 * longer parses falls back to the initial value rather than taking the app down.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw == null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Private-mode quota failures are not worth interrupting the session over.
    }
  }, [key, value])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key || event.newValue == null) return
      try {
        setValue(JSON.parse(event.newValue) as T)
      } catch {
        /* ignore an unparseable write from another tab */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])

  const reset = useCallback(() => setValue(initial), [initial])

  return [value, setValue, reset] as const
}
