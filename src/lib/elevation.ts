/**
 * Elevation gain, which is a filtering problem rather than an arithmetic one.
 *
 * Summing every positive step in a raw barometric or GPS trace gives an absurd number —
 * a flat out-and-back can read several hundred metres of climb — because the noise floor
 * of the sensor is a metre or two and there are thousands of samples. Every service that
 * publishes a gain figure filters first, and they disagree about how, which is why the same
 * run reads differently on two sites.
 *
 * Here it is done in two passes: a moving average to take out sample-to-sample jitter, then
 * a hysteresis threshold so a run of small wobbles has to accumulate past a real step before
 * it counts. The threshold is the number that matters, and 3 m is roughly what the major
 * platforms settle on.
 */

const SMOOTH_WINDOW = 5
const THRESHOLD_METERS = 3

/** Centred moving average, with the window shrinking at the ends rather than padding. */
export function smooth(values: number[], window = SMOOTH_WINDOW): number[] {
  if (values.length === 0) return []
  const half = Math.floor(window / 2)
  return values.map((_, i) => {
    const from = Math.max(0, i - half)
    const to = Math.min(values.length - 1, i + half)
    let sum = 0
    for (let j = from; j <= to; j++) sum += values[j] ?? 0
    return sum / (to - from + 1)
  })
}

export interface ElevationSummary {
  /** Metres climbed, after filtering. */
  gain: number
  /** Metres descended, after filtering — a positive number. */
  loss: number
  min: number
  max: number
  /** The smoothed series, so the chart draws the same shape the totals were taken from. */
  series: number[]
}

export function summarise(elevations: number[], threshold = THRESHOLD_METERS): ElevationSummary {
  if (elevations.length === 0) return { gain: 0, loss: 0, min: 0, max: 0, series: [] }

  const series = smooth(elevations)
  let gain = 0
  let loss = 0

  // `anchor` is the last elevation we committed to. Movement away from it only counts once
  // it exceeds the threshold, at which point the anchor jumps and we start measuring again.
  let anchor = series[0] ?? 0
  for (const value of series) {
    const delta = (value ?? 0) - anchor
    if (delta >= threshold) {
      gain += delta
      anchor = value
    } else if (delta <= -threshold) {
      loss -= delta
      anchor = value
    }
  }

  return { gain, loss, min: Math.min(...series), max: Math.max(...series), series }
}

/**
 * Gradient at each point, as a rise-over-run fraction, measured over a window wide enough
 * that GPS position noise does not dominate the denominator.
 */
export function gradients(distances: number[], elevations: number[], windowMeters = 30): number[] {
  const series = smooth(elevations)
  return distances.map((d, i) => {
    let from = i
    let to = i
    // Each end of the window is resolved before it is compared; the walk is otherwise
    // unchanged.
    while (from > 0 && d - (distances[from] ?? 0) < windowMeters / 2) from--
    while (to < distances.length - 1 && (distances[to] ?? 0) - d < windowMeters / 2) to++
    const run = (distances[to] ?? 0) - (distances[from] ?? 0)
    return run > 0 ? ((series[to] ?? 0) - (series[from] ?? 0)) / run : 0
  })
}
