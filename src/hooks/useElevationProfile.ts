/**
 * The terrain under a planned route.
 *
 * A plan has no recorded altitude, so the climb has to be looked up. The query is keyed on
 * a coarse fingerprint of the path rather than the path itself: nudging one waypoint by a
 * couple of metres does not change the hills, and re-requesting on every drag frame would
 * hammer a service that is offered as a courtesy.
 */

import { useQuery } from '@tanstack/react-query'
import { cumulative, pathLength, type LatLng } from '@/lib/geo'
import { heightProfile } from '@/api/valhalla'
import { summarise, type ElevationSummary } from '@/lib/elevation'

/** Round to ~11 m, so a fingerprint changes only when the route meaningfully moves. */
const fingerprint = (path: LatLng[]) =>
  path.map((p) => `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`).join(';')

export interface RouteProfile extends ElevationSummary {
  /** Distance from the start for each sampled point, in metres. */
  distances: number[]
}

export function useElevationProfile(path: LatLng[]) {
  return useQuery<RouteProfile | null>({
    queryKey: ['elevation', fingerprint(path)],
    enabled: path.length >= 2,
    // Terrain does not move; once fetched for a shape it is good for the session.
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: 0,
    queryFn: async ({ signal }) => {
      const result = await heightProfile(path, signal)
      if (!result) return null

      // The heights were sampled along a thinned copy of the route, which is measurably
      // shorter than the route itself — simplification cuts corners. Left alone, every
      // figure derived from this profile would be quietly short: the chart's x-axis, the
      // split boundaries, and the predicted finish time. Rescaling the distances onto the
      // route's true length fixes all three at once, and slightly relaxes the gradients,
      // which is also correct: the same climb spread over a longer path is a gentler one.
      const sampled = cumulative(result.shape)
      const sampledLength = sampled[sampled.length - 1] ?? 0
      const scale = sampledLength > 0 ? pathLength(path) / sampledLength : 1

      return {
        ...summarise(result.elevations),
        distances: sampled.map((distance) => distance * scale),
      }
    },
  })
}
