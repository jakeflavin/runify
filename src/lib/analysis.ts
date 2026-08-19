/**
 * Turning a recorded track into the numbers a runner looks at afterwards.
 *
 * The one judgement call is moving time. A watch pauses when you stop; a GPX file does not
 * record that it did, so elapsed time includes every red light unless we detect them. The
 * rule below — drop samples under a walking crawl — is the same heuristic the platforms use,
 * and it is applied on a smoothed speed so a single bad fix cannot pause the clock.
 */

import { cumulative, haversine, type TrackPoint } from './geo'
import { gradients, summarise, type ElevationSummary } from './elevation'
import { gradeFactor } from './pace'
import { unitMeters, type UnitSystem } from './units'

/** Below this speed the runner is taken to be stopped. 0.5 m/s is a slow walk. */
const MOVING_THRESHOLD = 0.5

export interface Activity {
  name: string
  /** Epoch ms of the first sample, when the file carries timestamps. */
  startTime?: number
  points: TrackPoint[]
}

export interface Split {
  /** 1-based; the last one is usually a partial. */
  index: number
  /** Metres covered in this split — one full unit except at the end. */
  meters: number
  seconds: number
  /** Seconds per distance unit. */
  pace: number
  /** Pace the same effort would have produced on flat ground. */
  gradeAdjustedPace: number
  gain: number
  loss: number
  avgHr?: number
  avgCadence?: number
}

export interface Analysis {
  distance: number
  elapsed: number
  movingTime: number
  /** Seconds per distance unit, over moving time. */
  avgPace: number
  gradeAdjustedPace: number
  elevation: ElevationSummary
  avgHr?: number
  maxHr?: number
  avgCadence?: number
  splits: Split[]
  /** Per-point series, aligned with `Activity.points`, for the charts. */
  series: {
    distance: number[]
    elevation: number[]
    /** Seconds per distance unit at each point, smoothed. Infinity where stopped. */
    pace: number[]
    gradient: number[]
    time: number[]
  }
  hasTime: boolean
  hasElevation: boolean
  hasHr: boolean
  hasCadence: boolean
}

const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined

/**
 * Instantaneous speed at each sample, in m/s, averaged over a window of a few seconds.
 *
 * A per-sample delta is far too noisy to show or to threshold against: at one sample per
 * second, GPS scatter alone swings apparent pace by a minute per mile.
 */
function speeds(points: TrackPoint[], distances: number[], windowSeconds = 10): number[] {
  return points.map((p, i) => {
    if (p.time === undefined) return 0
    let from = i
    let to = i
    // Indexed reads are checked, so each end of the window is resolved to a value before
    // it is compared. The walk is unchanged: the same conditions, read off the point
    // rather than off the array a second time.
    while (from > 0) {
      const prev = points[from]
      if (prev?.time === undefined || (p.time - prev.time) / 1000 >= windowSeconds / 2) break
      from--
    }
    while (to < points.length - 1) {
      const next = points[to]
      if (next?.time === undefined || (next.time - p.time) / 1000 >= windowSeconds / 2) break
      to++
    }
    const start = points[from]
    const end = points[to]
    if (start?.time === undefined || end?.time === undefined) return 0
    const dt = (end.time - start.time) / 1000
    const spanned = (distances[to] ?? 0) - (distances[from] ?? 0)
    return dt > 0 ? spanned / dt : 0
  })
}

/**
 * Which samples sit too close to a pause to have a measurable pace.
 *
 * A sample is stopped if its own raw step was stationary, and — this is the part that
 * matters — so is every sample whose smoothing window reaches one that was. Without the
 * second rule a ninety-second wait at a crossing leaves a spike of impossible paces on
 * either side of it, which then sets the scale of the whole pace chart.
 */
function stoppedMask(points: TrackPoint[], speed: number[], windowSeconds = 10): boolean[] {
  const mask = points.map(() => false)
  if (speed.length === 0) return mask

  for (let i = 1; i < points.length; i++) {
    const cur = points[i]
    const prev = points[i - 1]
    if (!cur || !prev || cur.time === undefined || prev.time === undefined) continue
    const dt = (cur.time - prev.time) / 1000
    if (dt <= 0) continue
    const raw = haversine(prev, cur) / dt
    if (raw >= MOVING_THRESHOLD) continue

    // Spread the mark across everything whose window can see this pause.
    mask[i] = true
    for (let j = i - 1; j >= 0; j--) {
      const back = points[j]
      if (back?.time === undefined || (cur.time - back.time) / 1000 > windowSeconds) break
      mask[j] = true
    }
    for (let j = i + 1; j < points.length; j++) {
      const ahead = points[j]
      if (ahead?.time === undefined || (ahead.time - cur.time) / 1000 > windowSeconds) break
      mask[j] = true
    }
  }

  return mask
}

export function analyse(activity: Activity, units: UnitSystem): Analysis {
  const points = activity.points
  const distance = cumulative(points)
  const total = distance[distance.length - 1] ?? 0

  const hasTime = points.length > 1 && points.every((p) => p.time !== undefined)
  const hasElevation = points.length > 0 && points.some((p) => p.ele !== undefined)
  const hasHr = points.some((p) => p.hr !== undefined)
  const hasCadence = points.some((p) => p.cad !== undefined)

  const elevations = points.map((p) => p.ele ?? 0)
  const elevation = summarise(hasElevation ? elevations : [])
  const gradient = hasElevation ? gradients(distance, elevations) : distance.map(() => 0)

  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]
  const elapsed =
    hasTime && firstPoint?.time !== undefined && lastPoint?.time !== undefined
      ? (lastPoint.time - firstPoint.time) / 1000
      : 0

  // Moving time: sum the gaps in which the runner was actually moving.
  const speed = hasTime ? speeds(points, distance) : []
  let movingTime = 0
  if (hasTime) {
    for (let i = 1; i < points.length; i++) {
      const cur = points[i]
      const prev = points[i - 1]
      if (cur?.time === undefined || prev?.time === undefined) continue
      if ((speed[i] ?? 0) >= MOVING_THRESHOLD) movingTime += (cur.time - prev.time) / 1000
    }
  }

  const per = unitMeters(units)
  const avgPace = movingTime > 0 && total > 0 ? (movingTime / total) * per : Infinity

  // Grade-adjusted average: weight each metre by how hard that metre's grade made it.
  let adjustedMeters = 0
  for (let i = 1; i < points.length; i++) {
    const step = (distance[i] ?? 0) - (distance[i - 1] ?? 0)
    adjustedMeters += step * gradeFactor(gradient[i] ?? 0)
  }
  const gradeAdjustedPace =
    movingTime > 0 && adjustedMeters > 0 ? (movingTime / adjustedMeters) * per : Infinity

  const hrValues = points.map((p) => p.hr).filter((v): v is number => v !== undefined)
  const cadValues = points.map((p) => p.cad).filter((v): v is number => v !== undefined && v > 0)

  // Samples whose speed window overlaps a pause have no meaningful pace: the window
  // averages running with standing, and reports something in between that the runner never
  // ran. Marking them stopped is more honest than plotting the artefact — see `stoppedMask`.
  const stopped = stoppedMask(points, speed)

  return {
    distance: total,
    elapsed,
    movingTime,
    avgPace,
    gradeAdjustedPace,
    elevation,
    avgHr: hrValues.length ? Math.round(mean(hrValues)!) : undefined,
    maxHr: hrValues.length ? Math.max(...hrValues) : undefined,
    avgCadence: cadValues.length ? Math.round(mean(cadValues)!) : undefined,
    splits: hasTime ? splitBy(points, distance, gradient, units) : [],
    series: {
      distance,
      elevation: elevation.series.length ? elevation.series : elevations,
      pace: speed.map((s, i) => (!stopped[i] && s >= MOVING_THRESHOLD ? per / s : Infinity)),
      gradient,
      time:
        hasTime && firstPoint?.time !== undefined
          ? points.map((p) => (p.time === undefined ? 0 : (p.time - firstPoint.time!) / 1000))
          : [],
    },
    hasTime,
    hasElevation,
    hasHr,
    hasCadence,
  }
}

/**
 * Cut the track into one split per distance unit.
 *
 * Boundaries land mid-sample almost always, so the sample straddling a boundary is split
 * proportionally between the two — without that, splits on a watch logging every few seconds
 * drift by a second or two each mile and the errors accumulate visibly over a long run.
 */
function splitBy(
  points: TrackPoint[],
  distance: number[],
  gradient: number[],
  units: UnitSystem,
): Split[] {
  const per = unitMeters(units)
  const total = distance[distance.length - 1] ?? 0
  if (total <= 0) return []

  const splits: Split[] = []
  const count = Math.ceil(total / per)

  for (let n = 0; n < count; n++) {
    const from = n * per
    const to = Math.min(total, (n + 1) * per)

    let seconds = 0
    let gain = 0
    let loss = 0
    let adjusted = 0
    const hrs: number[] = []
    const cads: number[] = []

    for (let i = 1; i < points.length; i++) {
      const segFrom = distance[i - 1]
      const segTo = distance[i]
      if (segFrom === undefined || segTo === undefined) continue
      if (segTo <= from || segFrom >= to) continue

      const legLength = segTo - segFrom
      // Fraction of this sample's leg that lies inside the split.
      const share = legLength > 0 ? (Math.min(segTo, to) - Math.max(segFrom, from)) / legLength : 1

      const cur = points[i]
      const prev = points[i - 1]
      if (cur?.time !== undefined && prev?.time !== undefined) {
        seconds += ((cur.time - prev.time) / 1000) * share
      }
      adjusted += legLength * share * gradeFactor(gradient[i] ?? 0)

      const rise = (cur?.ele ?? 0) - (prev?.ele ?? 0)
      if (rise > 0) gain += rise * share
      else loss -= rise * share

      if (cur?.hr !== undefined) hrs.push(cur.hr)
      if (cur?.cad) cads.push(cur.cad)
    }

    const meters = to - from
    splits.push({
      index: n + 1,
      meters,
      seconds,
      pace: meters > 0 ? (seconds / meters) * per : Infinity,
      gradeAdjustedPace: adjusted > 0 ? (seconds / adjusted) * per : Infinity,
      gain,
      loss,
      avgHr: hrs.length ? Math.round(mean(hrs)!) : undefined,
      avgCadence: cads.length ? Math.round(mean(cads)!) : undefined,
    })
  }

  return splits
}

/** Time in each heart-rate zone, in seconds, indexed 0–4 for zones 1–5. */
export function timeInZones(points: TrackPoint[], maxHr: number): number[] {
  const buckets = [0, 0, 0, 0, 0]
  for (let i = 1; i < points.length; i++) {
    const sample = points[i]
    const before = points[i - 1]
    if (!sample || !before) continue
    const { hr, time } = sample
    if (hr === undefined || time === undefined || before.time === undefined) continue
    const dt = (time - before.time) / 1000
    const fraction = hr / maxHr
    const zone = fraction < 0.6 ? 0 : fraction < 0.7 ? 1 : fraction < 0.8 ? 2 : fraction < 0.9 ? 3 : 4
    buckets[zone] = (buckets[zone] ?? 0) + dt
  }
  return buckets
}
