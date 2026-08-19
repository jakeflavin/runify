/**
 * Geometry on the sphere, plus the polyline codec Valhalla speaks.
 *
 * Everything internal is metres and WGS84 degrees; conversion to whatever the user asked
 * to see happens once, at the edge, in `units.ts`.
 */

export interface LatLng {
  lat: number
  lon: number
}

/** A point on a recorded track: position, plus whatever the device happened to log. */
export interface TrackPoint extends LatLng {
  /** Metres above sea level. */
  ele?: number
  /** Epoch milliseconds. */
  time?: number
  /** Beats per minute. */
  hr?: number
  /** Steps per minute (already doubled from a one-foot sensor). */
  cad?: number
}

const R = 6371008.8 // IUGG mean earth radius, metres
const rad = (deg: number) => (deg * Math.PI) / 180

/** Great-circle distance in metres. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

/** Total length of a path, in metres. */
export function pathLength(points: LatLng[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (a && b) total += haversine(a, b)
  }
  return total
}

/** Distance from the start to each point, in metres. Same length as the input. */
export function cumulative(points: LatLng[]): number[] {
  const out = new Array<number>(points.length)
  let total = 0
  for (let i = 0; i < points.length; i++) {
    const back = points[i - 1]
    const here = points[i]
    if (i > 0 && back && here) total += haversine(back, here)
    out[i] = total
  }
  return out
}

/** Initial bearing from `a` to `b`, in degrees clockwise from north. */
export function bearing(a: LatLng, b: LatLng): number {
  const dLon = rad(b.lon - a.lon)
  const y = Math.sin(dLon) * Math.cos(rad(b.lat))
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(dLon)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

/** Bounding box as Leaflet wants it: [[south, west], [north, east]]. */
export function bounds(points: LatLng[]): [[number, number], [number, number]] | null {
  if (points.length === 0) return null
  let s = Infinity
  let w = Infinity
  let n = -Infinity
  let e = -Infinity
  for (const p of points) {
    if (p.lat < s) s = p.lat
    if (p.lat > n) n = p.lat
    if (p.lon < w) w = p.lon
    if (p.lon > e) e = p.lon
  }
  return [
    [s, w],
    [n, e],
  ]
}

/**
 * Douglas–Peucker, with the tolerance given in metres.
 *
 * Used to thin a route before asking for an elevation profile: the height service is
 * rate-limited and a snapped route can carry a vertex every couple of metres, far finer
 * than any terrain model resolves.
 */
export function simplify<T extends LatLng>(points: T[], toleranceMeters: number): T[] {
  if (points.length < 3) return points.slice()

  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1

  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length) {
    const [first, last] = stack.pop()!
    let worst = 0
    let index = -1
    for (let i = first + 1; i < last; i++) {
      const at = points[i]
      const head = points[first]
      const tail = points[last]
      if (!at || !head || !tail) continue
      const d = perpendicular(at, head, tail)
      if (d > worst) {
        worst = d
        index = i
      }
    }
    if (index !== -1 && worst > toleranceMeters) {
      keep[index] = 1
      stack.push([first, index], [index, last])
    }
  }

  return points.filter((_, i) => keep[i] === 1)
}

/**
 * Perpendicular distance from `p` to segment `a`–`b`, in metres.
 *
 * Degrees are projected to a local flat plane first — over the span of a running route the
 * error is far below the tolerances this is compared against.
 */
function perpendicular(p: LatLng, a: LatLng, b: LatLng): number {
  const k = Math.cos(rad((a.lat + b.lat) / 2))
  const px = (p.lon - a.lon) * k
  const py = p.lat - a.lat
  const bx = (b.lon - a.lon) * k
  const by = b.lat - a.lat

  const lenSq = bx * bx + by * by
  let t = lenSq === 0 ? 0 : (px * bx + py * by) / lenSq
  t = Math.max(0, Math.min(1, t))

  const dx = px - bx * t
  const dy = py - by * t
  return Math.sqrt(dx * dx + dy * dy) * (Math.PI / 180) * R
}

/**
 * Google's encoded-polyline format, which Valhalla returns at six decimal places rather
 * than the usual five.
 */
export function decodePolyline(encoded: string, precision = 6): LatLng[] {
  const factor = 10 ** precision
  const points: LatLng[] = []
  let index = 0
  let lat = 0
  let lon = 0

  while (index < encoded.length) {
    let result = 0
    let shift = 0
    let byte: number
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1

    result = 0
    shift = 0
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lon += result & 1 ? ~(result >> 1) : result >> 1

    points.push({ lat: lat / factor, lon: lon / factor })
  }

  return points
}

/** Linear interpolation between two positions, for placing a marker part-way along a leg. */
export function interpolate(a: LatLng, b: LatLng, t: number): LatLng {
  return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t }
}

/**
 * The position at `meters` along a path, or null if the path is shorter than that.
 * Used to drop the split markers on the map.
 */
export function pointAt(points: LatLng[], meters: number): LatLng | null {
  if (points.length === 0) return null
  if (meters <= 0) return points[0] ?? null

  let travelled = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (!a || !b) continue
    const leg = haversine(a, b)
    if (travelled + leg >= meters) {
      return interpolate(a, b, leg === 0 ? 0 : (meters - travelled) / leg)
    }
    travelled += leg
  }
  return null
}

/** Index of the path vertex nearest to `target`, or -1 for an empty path. */
export function nearestIndex(points: LatLng[], target: LatLng): number {
  let best = -1
  let bestDistance = Infinity
  for (let i = 0; i < points.length; i++) {
    const at = points[i]
    if (!at) continue
    const d = haversine(at, target)
    if (d < bestDistance) {
      bestDistance = d
      best = i
    }
  }
  return best
}
