import { useCallback, useEffect, useState } from 'react'

/**
 * `useState` that survives a reload, and stays in step across tabs.
 *
 * Reads are lazy and defensive: a value written by an older build (or hand-edited) that no
 * longer parses falls back to the initial value rather than taking the app down.
 *
 * `read` is for state whose stored shape has changed since it was written. It receives the
 * raw string and owns the whole decode, so migration and repair happen once, on the way in,
 * and the corrected value is what gets written back.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  options: { read?: (raw: string | null) => T } = {},
) {
  const { read } = options

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (read) return read(raw)
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
        setValue(read ? read(event.newValue) : (JSON.parse(event.newValue) as T))
      } catch {
        /* ignore an unparseable write from another tab */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key, read])

  const reset = useCallback(() => setValue(initial), [initial])

  return [value, setValue, reset] as const
}
