/**
 * Routes kept between visits.
 *
 * Only the waypoints are stored, never the snapped path: the waypoints are a handful of
 * coordinates where the path can be thousands, and re-snapping on load is a couple of
 * requests. It also means a saved route quietly benefits from any later improvement to the
 * map data underneath it.
 */

import { useCallback } from 'react'
import { usePersistentState } from './usePersistentState'
import type { LatLng } from '../lib/geo'

export interface SavedRoute {
  id: string
  name: string
  savedAt: number
  meters: number
  points: LatLng[]
}

export function useSavedRoutes() {
  const [routes, setRoutes] = usePersistentState<SavedRoute[]>('runify:routes', [])

  const save = useCallback(
    (name: string, points: LatLng[], meters: number) => {
      const route: SavedRoute = {
        id: `r${Date.now().toString(36)}`,
        name: name.trim() || 'Untitled route',
        savedAt: Date.now(),
        meters,
        // Strip the waypoint ids and anything else the caller happened to carry.
        points: points.map((p) => ({ lat: p.lat, lon: p.lon })),
      }
      setRoutes((current) => [route, ...current])
      return route
    },
    [setRoutes],
  )

  const remove = useCallback(
    (id: string) => setRoutes((current) => current.filter((route) => route.id !== id)),
    [setRoutes],
  )

  return { routes, save, remove }
}
