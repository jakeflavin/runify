/**
 * Valhalla, on the public OSM instance — routing and terrain from the same host.
 *
 * Two endpoints are used. `/route` with the pedestrian costing model snaps a pair of
 * dropped pins onto real paths, which is the difference between a route you can run and a
 * straight line across somebody's garden. `/height` returns terrain elevation along a
 * shape, which is where a planned route's climb comes from — a plan has no barometer.
 *
 * It is a courtesy service with no key and no SLA, so every call here is written to fail
 * softly: the caller gets a straight line or a flat profile rather than an error, and the
 * interface says which it got.
 */

import { decodePolyline, simplify, type LatLng } from '../lib/geo'

const HOST = 'https://valhalla1.openstreetmap.de'

/** Valhalla encodes its shapes at six decimal places, not the usual five. */
const POLYLINE_PRECISION = 6

/**
 * The height service samples a terrain model, so vertices closer together than its
 * resolution add nothing but request size. 25 m keeps every real hill.
 */
const HEIGHT_TOLERANCE_METERS = 25
const MAX_HEIGHT_POINTS = 500

export type Costing = 'pedestrian' | 'bicycle'

export interface RoutedLeg {
  /** The snapped path between the two waypoints. */
  shape: LatLng[]
  meters: number
  /** False when the service failed and this is the straight line between the pins. */
  snapped: boolean
}

/**
 * Snap one leg — the path between two consecutive waypoints.
 *
 * Legs are requested one at a time rather than as a single multi-stop trip so that dragging
 * one waypoint only re-fetches the two legs it touches, and so a failure degrades to a
 * straight line for that leg alone instead of losing the whole route.
 */
export async function routeLeg(
  from: LatLng,
  to: LatLng,
  costing: Costing,
  signal?: AbortSignal,
): Promise<RoutedLeg> {
  const straight: RoutedLeg = {
    shape: [from, to],
    meters: 0,
    snapped: false,
  }

  const body = {
    locations: [
      { lat: from.lat, lon: from.lon, type: 'break' },
      { lat: to.lat, lon: to.lon, type: 'break' },
    ],
    costing,
    // Let the router leave the road network to reach a pin dropped in a park or a field.
    costing_options: { [costing]: { shortest: false } },
    directions_type: 'none',
    units: 'kilometers',
  }

  try {
    const response = await fetch(`${HOST}/route?json=${encodeURIComponent(JSON.stringify(body))}`, {
      signal,
    })
    if (!response.ok) return straight

    const data = (await response.json()) as {
      trip?: { legs?: { shape?: string; summary?: { length?: number } }[] }
    }
    const leg = data.trip?.legs?.[0]
    if (!leg?.shape) return straight

    const shape = decodePolyline(leg.shape, POLYLINE_PRECISION)
    if (shape.length < 2) return straight

    return { shape, meters: (leg.summary?.length ?? 0) * 1000, snapped: true }
  } catch {
    return straight
  }
}

export interface HeightProfile {
  /** Elevation in metres, one per point of the shape that was sent. */
  elevations: number[]
  /** The shape the elevations correspond to — thinned from the input. */
  shape: LatLng[]
}

/**
 * Terrain elevation along a path.
 *
 * The path is thinned first: the service caps how many points it will take, and a snapped
 * city route easily runs to thousands of vertices that all sample the same terrain cell.
 */
export async function heightProfile(
  path: LatLng[],
  signal?: AbortSignal,
): Promise<HeightProfile | null> {
  if (path.length < 2) return null

  let shape = simplify(path, HEIGHT_TOLERANCE_METERS)
  if (shape.length > MAX_HEIGHT_POINTS) {
    // Still too many after simplifying: take an even sample, keeping both ends.
    const step = (shape.length - 1) / (MAX_HEIGHT_POINTS - 1)
    shape = Array.from({ length: MAX_HEIGHT_POINTS }, (_, i) => shape[Math.round(i * step)]).filter(
      (p): p is (typeof shape)[number] => p !== undefined,
    )
  }

  const body = { shape: shape.map((p) => ({ lat: p.lat, lon: p.lon })) }

  try {
    const response = await fetch(
      `${HOST}/height?json=${encodeURIComponent(JSON.stringify(body))}`,
      {
        signal,
      },
    )
    if (!response.ok) return null

    const data = (await response.json()) as { height?: number[] }
    if (!data.height || data.height.length !== shape.length) return null

    // The service returns null for cells it has no data for; carry the last known value.
    let last = 0
    const elevations = data.height.map((value) => {
      if (typeof value === 'number') last = value
      return last
    })

    return { elevations, shape }
  } catch {
    return null
  }
}
