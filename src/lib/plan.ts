/**
 * Turning a drawn route into a race plan.
 *
 * The idea the whole panel rests on: a runner holds an *effort*, not a pace. Given the pace
 * they can hold on the flat, the time a hilly route will actually take is the flat pace
 * multiplied by the route's *effort length* — every metre weighted by how much the grade
 * there costs. That is the same Minetti curve the analysis side uses to compute GAP, run
 * backwards, and it is why a 10 km with 200 m of climb is not a 10 km.
 *
 * The predicted splits fall straight out of it: each split is slower or faster than the flat
 * pace in proportion to its own terrain, while the grade-adjusted pace stays pinned at the
 * effort the runner asked for.
 */

import type { Split } from './analysis'
import { gradients } from './elevation'
import { gradeFactor } from './pace'

/**
 * The route's length after weighting each metre by the cost of its grade.
 *
 * A perfectly flat route returns its own length. A hilly one returns more, and the ratio is
 * how much longer it will take at the same effort.
 */
export function effortLength(distances: number[], elevations: number[]): number {
  if (distances.length < 2) return 0
  const grade = gradients(distances, elevations)
  let total = 0
  for (let i = 1; i < distances.length; i++) {
    total += (distances[i] - distances[i - 1]) * gradeFactor(grade[i])
  }
  return total
}

/**
 * Predicted splits for holding `flatPace` (seconds per unit) as an effort over the route.
 *
 * `unitMeters` is how long a split is; the last one is short whenever the route does not
 * divide evenly, exactly as it does on a watch.
 */
export function predictSplits(
  distances: number[],
  elevations: number[],
  unitMeters: number,
  flatPace: number,
): Split[] {
  const total = distances[distances.length - 1] ?? 0
  if (total <= 0 || !Number.isFinite(flatPace) || flatPace <= 0) return []

  const grade = gradients(distances, elevations)
  const splits: Split[] = []
  const count = Math.ceil(total / unitMeters)

  for (let n = 0; n < count; n++) {
    const from = n * unitMeters
    const to = Math.min(total, (n + 1) * unitMeters)

    let effort = 0
    let gain = 0
    let loss = 0

    for (let i = 1; i < distances.length; i++) {
      const segFrom = distances[i - 1]
      const segTo = distances[i]
      if (segTo <= from || segFrom >= to) continue

      const legLength = segTo - segFrom
      const share = legLength > 0 ? (Math.min(segTo, to) - Math.max(segFrom, from)) / legLength : 1

      effort += legLength * share * gradeFactor(grade[i])

      const rise = (elevations[i] ?? 0) - (elevations[i - 1] ?? 0)
      if (rise > 0) gain += rise * share
      else loss -= rise * share
    }

    const meters = to - from
    const seconds = (effort / unitMeters) * flatPace

    splits.push({
      index: n + 1,
      meters,
      seconds,
      pace: meters > 0 ? (seconds / meters) * unitMeters : Infinity,
      // Constant by construction: this is the effort the runner asked to hold.
      gradeAdjustedPace: flatPace,
      gain,
      loss,
    })
  }

  return splits
}
