import { describe, expect, it } from 'vitest'
import { gradients, smooth, summarise } from './elevation'

describe('summarise', () => {
  it('ignores sensor noise below the threshold', () => {
    // A flat trace jittering by a metre, which naive summing would report as a big climb.
    const noisy = Array.from({ length: 200 }, (_, i) => 100 + (i % 2 ? 1 : -1))
    const result = summarise(noisy)
    expect(result.gain).toBeLessThan(1)
    expect(result.loss).toBeLessThan(1)
  })

  it('counts a real climb', () => {
    const hill = Array.from({ length: 100 }, (_, i) => i) // 0 → 99 m
    const result = summarise(hill)
    expect(result.gain).toBeGreaterThan(90)
    expect(result.loss).toBeLessThan(1)
  })

  it('counts the descent of an out-and-back separately', () => {
    const up = Array.from({ length: 100 }, (_, i) => i)
    const result = summarise([...up, ...up.slice().reverse()])
    expect(result.gain).toBeGreaterThan(85)
    expect(result.loss).toBeGreaterThan(85)
  })

  it('survives an empty series', () => {
    expect(summarise([])).toEqual({ gain: 0, loss: 0, min: 0, max: 0, series: [] })
  })
})

describe('smooth', () => {
  it('leaves a constant series alone', () => {
    expect(smooth([5, 5, 5, 5, 5])).toEqual([5, 5, 5, 5, 5])
  })

  it('keeps the same number of samples', () => {
    expect(smooth([1, 9, 1, 9, 1, 9, 1])).toHaveLength(7)
  })
})

describe('gradients', () => {
  it('reads a 10% climb as 0.1', () => {
    const distances = Array.from({ length: 50 }, (_, i) => i * 10) // 0 → 490 m
    const elevations = distances.map((d) => d * 0.1)
    const grade = gradients(distances, elevations)
    // Check the middle, away from the ends where the window is clipped.
    expect(grade[25]).toBeCloseTo(0.1, 2)
  })

  it('is zero on the flat', () => {
    const distances = Array.from({ length: 20 }, (_, i) => i * 10)
    expect(gradients(distances, distances.map(() => 42))[10]).toBe(0)
  })
})
