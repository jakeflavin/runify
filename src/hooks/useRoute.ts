/**
 * The state behind the drawing surface.
 *
 * A route is a list of waypoints the runner dropped, and a *leg* for each consecutive pair.
 * Legs are cached by their endpoints, which is what makes the whole thing feel immediate:
 * dragging one waypoint invalidates only the two legs touching it, undo replays instantly
 * because every leg it needs is already in the cache, and toggling snapping off and on again
 * costs nothing.
 *
 * Until a leg comes back from the router it is shown as the straight line between its pins.
 * That is deliberate — the route stays continuous and the distance stays roughly right while
 * the network catches up, rather than the line disappearing and reappearing.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { haversine, pathLength, type LatLng } from '../lib/geo'
import { routeLeg, type Costing, type RoutedLeg } from '../api/valhalla'

export interface Waypoint extends LatLng {
  id: string
}

/** How deep undo goes. Deeper than anyone reaches, shallow enough not to hold memory. */
const HISTORY_LIMIT = 50

const key = (from: LatLng, to: LatLng, costing: Costing) =>
  `${costing}:${from.lat.toFixed(6)},${from.lon.toFixed(6)}>${to.lat.toFixed(6)},${to.lon.toFixed(6)}`

let counter = 0
const makeWaypoint = (point: LatLng): Waypoint => ({ ...point, id: `wp${++counter}` })

export function useRoute(snap: boolean, costing: Costing) {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [history, setHistory] = useState<Waypoint[][]>([])
  const [cache, setCache] = useState<Map<string, RoutedLeg>>(() => new Map())
  const [routing, setRouting] = useState(false)

  // Kept in a ref as well so the fetch effect can read the cache without depending on it —
  // depending on it would restart the effect on every leg that lands.
  const cacheRef = useRef(cache)
  cacheRef.current = cache

  /** Replace the waypoints, pushing the current set onto the undo stack. */
  const commit = useCallback((next: (current: Waypoint[]) => Waypoint[]) => {
    setWaypoints((current) => {
      const updated = next(current)
      if (updated === current) return current
      setHistory((past) => [...past, current].slice(-HISTORY_LIMIT))
      return updated
    })
  }, [])

  // Fetch whatever legs are missing. Snapping off short-circuits the whole thing.
  useEffect(() => {
    if (!snap || waypoints.length < 2) {
      setRouting(false)
      return
    }

    const missing = []
    for (let i = 1; i < waypoints.length; i++) {
      const from = waypoints[i - 1]
      const to = waypoints[i]
      if (!from || !to) continue
      const id = key(from, to, costing)
      if (!cacheRef.current.has(id)) missing.push({ id, from, to })
    }
    if (missing.length === 0) {
      setRouting(false)
      return
    }

    const controller = new AbortController()
    setRouting(true)

    Promise.all(
      missing.map(
        async (leg) =>
          [leg.id, await routeLeg(leg.from, leg.to, costing, controller.signal)] as const,
      ),
    ).then((results) => {
      if (controller.signal.aborted) return
      setCache((current) => {
        const next = new Map(current)
        for (const [id, leg] of results) next.set(id, leg)
        return next
      })
      setRouting(false)
    })

    return () => controller.abort()
  }, [waypoints, snap, costing])

  /** The legs as they stand right now, falling back to straight lines. */
  const legs = useMemo<RoutedLeg[]>(() => {
    const out: RoutedLeg[] = []
    for (let i = 1; i < waypoints.length; i++) {
      const from = waypoints[i - 1]
      const to = waypoints[i]
      if (!from || !to) continue
      const cached = snap ? cache.get(key(from, to, costing)) : undefined
      out.push(
        cached ?? {
          shape: [
            { lat: from.lat, lon: from.lon },
            { lat: to.lat, lon: to.lon },
          ],
          meters: haversine(from, to),
          snapped: false,
        },
      )
    }
    return out
  }, [waypoints, cache, snap, costing])

  /** The whole route as one continuous path, with each leg's duplicated join dropped. */
  const path = useMemo<LatLng[]>(() => {
    if (waypoints.length === 0) return []
    const head = waypoints[0]
    if (legs.length === 0) return head ? [{ lat: head.lat, lon: head.lon }] : []

    const start = legs[0]?.shape[0]
    const out: LatLng[] = start ? [start] : []
    for (const leg of legs) out.push(...leg.shape.slice(1))
    return out
  }, [legs, waypoints])

  const meters = useMemo(() => pathLength(path), [path])

  return {
    waypoints,
    path,
    meters,
    routing,
    /** True once every leg has come back snapped — the line follows real paths end to end. */
    fullySnapped: legs.length > 0 && legs.every((leg) => leg.snapped),

    add: useCallback(
      (point: LatLng) => commit((current) => [...current, makeWaypoint(point)]),
      [commit],
    ),

    move: useCallback(
      (id: string, point: LatLng) =>
        commit((current) => current.map((wp) => (wp.id === id ? { ...wp, ...point } : wp))),
      [commit],
    ),

    remove: useCallback(
      (id: string) => commit((current) => current.filter((wp) => wp.id !== id)),
      [commit],
    ),

    /** Back to where the finish already is — the usual way to make a lap. */
    closeLoop: useCallback(
      () =>
        commit((current) =>
          current.length < 2 || !current[0] ? current : [...current, makeWaypoint(current[0])],
        ),
      [commit],
    ),

    /** Retrace the route to the start, which doubles the distance. */
    outAndBack: useCallback(
      () =>
        commit((current) =>
          current.length < 2
            ? current
            : [...current, ...current.slice(0, -1).reverse().map(makeWaypoint)],
        ),
      [commit],
    ),

    reverse: useCallback(() => commit((current) => [...current].reverse()), [commit]),

    load: useCallback((points: LatLng[]) => commit(() => points.map(makeWaypoint)), [commit]),

    undo: useCallback(() => {
      setHistory((past) => {
        if (past.length === 0) return past
        const previous = past[past.length - 1]
        if (previous) setWaypoints(previous)
        return past.slice(0, -1)
      })
    }, []),

    canUndo: history.length > 0,

    clear: useCallback(() => commit((current) => (current.length === 0 ? current : [])), [commit]),
  }
}
