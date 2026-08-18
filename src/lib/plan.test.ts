import { describe, expect, it } from 'vitest'
import { effortLength, predictSplits } from './plan'

/** A symmetric hill: up to `peak` at halfway, back down to where it started. */
function hill(meters: number, step: number, peak: number) {
  const distances: number[] = []
  const elevations: number[] = []
  for (let d = 0; d <= meters; d += step) {
    distances.push(d)
    const t = d / meters
    elevations.push(peak * (t <= 0.5 ? 2 * t : 2 * (1 - t)))
  }
  return { distances, elevations }
}

const flat = (meters: number, step = 10) => {
  const distances = Array.from({ length: Math.floor(meters / step) + 1 }, (_, i) => i * step)
  return { distances, elevations: distances.map(() => 100) }
}

describe('effortLength', () => {
  it('equals the distance on level ground', () => {
    const { distances, elevations } = flat(3000)
    expect(effortLength(distances, elevations)).toBeCloseTo(3000, 0)
  })

  it('exceeds the distance on a loop that climbs and comes back down', () => {
    // Climbing costs more than the descent gives back, so a balanced hill is never a wash.
    const { distances, elevations } = hill(3000, 10, 60)
    expect(effortLength(distances, elevations)).toBeGreaterThan(3000)
  })

  it('grows with the size of the hill', () => {
    const small = hill(3000, 10, 30)
    const large = hill(3000, 10, 90)
    expect(effortLength(large.distances, large.elevations)).toBeGreaterThan(
      effortLength(small.distances, small.elevations),
    )
  })

  it('falls below the distance on a route that only descends', () => {
    const distances = Array.from({ length: 301 }, (_, i) => i * 10)
    // A gentle 2% downhill throughout.
    const elevations = distances.map((d) => 200 - d * 0.02)
    expect(effortLength(distances, elevations)).toBeLessThan(3000)
  })

  it('is zero for a path too short to have a gradient', () => {
    expect(effortLength([0], [100])).toBe(0)
  })
})

describe('predictSplits', () => {
  const { distances, elevations } = flat(3000)

  it('cuts one split per unit, with the remainder last', () => {
    const splits = predictSplits(distances, elevations, 1000, 300)
    expect(splits).toHaveLength(3)
    expect(splits[0].meters).toBeCloseTo(1000, 6)
  })

  it('returns the requested pace on level ground', () => {
    const splits = predictSplits(distances, elevations, 1000, 300)
    for (const split of splits) expect(split.pace).toBeCloseTo(300, 0)
  })

  it('holds the grade-adjusted pace fixed — that is the effort being planned', () => {
    const climb = hill(3000, 10, 90)
    const splits = predictSplits(climb.distances, climb.elevations, 1000, 300)
    for (const split of splits) expect(split.gradeAdjustedPace).toBe(300)
  })

  it('predicts the uphill split slower than the downhill one', () => {
    const climb = hill(3000, 10, 90)
    const splits = predictSplits(climb.distances, climb.elevations, 1000, 300)
    expect(splits[0].pace).toBeGreaterThan(300)
    expect(splits[2].pace).toBeLessThan(300)
  })

  it('sums to the route effort, so the splits agree with the headline finish time', () => {
    const climb = hill(3000, 10, 60)
    const splits = predictSplits(climb.distances, climb.elevations, 1000, 300)
    const total = splits.reduce((sum, split) => sum + split.seconds, 0)
    expect(total).toBeCloseTo((effortLength(climb.distances, climb.elevations) / 1000) * 300, 3)
  })

  it('gives nothing back for a pace that cannot be run', () => {
    expect(predictSplits(distances, elevations, 1000, Number.NaN)).toEqual([])
    expect(predictSplits(distances, elevations, 1000, 0)).toEqual([])
  })
})
