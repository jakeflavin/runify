import { describe, expect, it } from 'vitest'
import { analyse, timeInZones, type Activity } from './analysis'
import type { TrackPoint } from './geo'

/**
 * A synthetic run heading due east at a fixed speed, so every derived figure has a value
 * that can be checked by hand rather than by rerunning the code.
 */
function straightRun({
  meters,
  secondsPerMeter,
  climbPerMeter = 0,
  hr,
  stopAfter,
}: {
  meters: number
  secondsPerMeter: number
  climbPerMeter?: number
  hr?: number
  /** Metres after which the runner stands still for five minutes. */
  stopAfter?: number
}): Activity {
  const points: TrackPoint[] = []
  const start = Date.parse('2026-04-01T12:00:00Z')
  // One degree of longitude at the equator, on the same mean-radius sphere `haversine`
  // uses: 2πR/360 with R = 6 371 008.8 m.
  const degreesPerMeter = 360 / (2 * Math.PI * 6371008.8)

  let time = start
  for (let d = 0; d <= meters; d += 10) {
    points.push({
      lat: 0,
      lon: d * degreesPerMeter,
      ele: 100 + d * climbPerMeter,
      time,
      hr,
    })
    time += 10 * secondsPerMeter * 1000
    if (stopAfter !== undefined && d === stopAfter) {
      // Five minutes of samples going nowhere.
      for (let s = 0; s < 5; s++) {
        time += 60_000
        points.push({ lat: 0, lon: d * degreesPerMeter, ele: 100 + d * climbPerMeter, time, hr })
      }
    }
  }
  return { name: 'Test', startTime: start, points }
}

describe('analyse', () => {
  // 5 km at 0.3 s/m = 5 min/km exactly.
  const flat = analyse(straightRun({ meters: 5000, secondsPerMeter: 0.3 }), 'metric')

  it('measures the distance it was given', () => {
    expect(flat.distance).toBeCloseTo(5000, -1)
  })

  it('reports the pace that was run', () => {
    expect(flat.avgPace).toBeCloseTo(300, 0)
  })

  it('cuts one split per kilometre', () => {
    expect(flat.splits).toHaveLength(5)
    expect(flat.splits[0].pace).toBeCloseTo(300, 0)
  })

  it('notices which channels the file actually carried', () => {
    expect(flat.hasTime).toBe(true)
    expect(flat.hasHr).toBe(false)
    expect(flat.hasCadence).toBe(false)
  })

  it('leaves splits empty when the file has no timestamps', () => {
    const untimed = straightRun({ meters: 3000, secondsPerMeter: 0.3 })
    untimed.points = untimed.points.map(({ time: _time, ...rest }) => rest)
    const result = analyse(untimed, 'metric')
    expect(result.hasTime).toBe(false)
    expect(result.splits).toEqual([])
  })
})

describe('moving time', () => {
  const paused = analyse(
    straightRun({ meters: 3000, secondsPerMeter: 0.3, stopAfter: 1500 }),
    'metric',
  )

  it('excludes the standing still from moving time', () => {
    expect(paused.elapsed - paused.movingTime).toBeGreaterThan(240)
  })

  it('so pace still reflects how fast the runner was actually running', () => {
    expect(paused.avgPace).toBeCloseTo(300, -1)
  })

  it('reports no pace at all around the pause, rather than an impossible one', () => {
    // Every sample that does report a pace should be a pace that was plausibly run.
    const measured = paused.series.pace.filter(Number.isFinite)
    expect(measured.length).toBeGreaterThan(0)
    expect(Math.max(...measured)).toBeLessThan(360)
  })

  it('leaves the pace series untouched on a run with no stops in it', () => {
    const clean = analyse(straightRun({ meters: 3000, secondsPerMeter: 0.3 }), 'metric')
    const measured = clean.series.pace.filter(Number.isFinite)
    // Only the very first sample lacks a window to measure over.
    expect(measured.length).toBeGreaterThan(clean.series.pace.length - 3)
  })
})

describe('grade adjustment', () => {
  it('reports a GAP faster than the pace run, on a climb', () => {
    // 3 km at 5 min/km, climbing 5%.
    const uphill = analyse(
      straightRun({ meters: 3000, secondsPerMeter: 0.3, climbPerMeter: 0.05 }),
      'metric',
    )
    expect(uphill.elevation.gain).toBeGreaterThan(140)
    expect(uphill.gradeAdjustedPace).toBeLessThan(uphill.avgPace)
  })

  it('leaves the GAP of a flat run equal to its pace', () => {
    const level = analyse(straightRun({ meters: 3000, secondsPerMeter: 0.3 }), 'metric')
    expect(level.gradeAdjustedPace).toBeCloseTo(level.avgPace, 0)
  })
})

describe('timeInZones', () => {
  it('puts a steady effort entirely in one zone', () => {
    const run = straightRun({ meters: 2000, secondsPerMeter: 0.3, hr: 150 })
    const zones = timeInZones(run.points, 200) // 75% of max → zone 3
    expect(zones[2]).toBeGreaterThan(0)
    expect(zones[0] + zones[1] + zones[3] + zones[4]).toBe(0)
  })

  it('is all zeroes when nothing was recorded', () => {
    const run = straightRun({ meters: 1000, secondsPerMeter: 0.3 })
    expect(timeInZones(run.points, 200)).toEqual([0, 0, 0, 0, 0])
  })
})
