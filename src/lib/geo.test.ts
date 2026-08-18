import { describe, expect, it } from 'vitest'
import { decodePolyline, haversine, pathLength, pointAt, simplify } from './geo'

// Two points about 111 km apart: one degree of latitude at the equator.
const A = { lat: 0, lon: 0 }
const B = { lat: 1, lon: 0 }

describe('haversine', () => {
  it('measures a degree of latitude as about 111 km', () => {
    expect(haversine(A, B)).toBeCloseTo(111195, -2)
  })

  it('is zero for a point against itself', () => {
    expect(haversine(A, A)).toBe(0)
  })

  it('is symmetric', () => {
    expect(haversine(A, B)).toBeCloseTo(haversine(B, A), 6)
  })
})

describe('pathLength', () => {
  it('is zero for a path that cannot have length', () => {
    expect(pathLength([])).toBe(0)
    expect(pathLength([A])).toBe(0)
  })

  it('sums the legs', () => {
    expect(pathLength([A, B, A])).toBeCloseTo(2 * haversine(A, B), 3)
  })
})

describe('pointAt', () => {
  it('interpolates part-way along a leg', () => {
    const half = pointAt([A, B], haversine(A, B) / 2)
    expect(half?.lat).toBeCloseTo(0.5, 3)
  })

  it('returns null past the end, so mile markers stop', () => {
    expect(pointAt([A, B], 1e9)).toBeNull()
  })
})

describe('simplify', () => {
  it('drops points that lie on the line between their neighbours', () => {
    const straight = [
      { lat: 0, lon: 0 },
      { lat: 0.5, lon: 0 },
      { lat: 1, lon: 0 },
    ]
    expect(simplify(straight, 25)).toHaveLength(2)
  })

  it('keeps a point that departs from the line by more than the tolerance', () => {
    const bent = [
      { lat: 0, lon: 0 },
      { lat: 0.5, lon: 0.01 },
      { lat: 1, lon: 0 },
    ]
    expect(simplify(bent, 25)).toHaveLength(3)
  })
})

describe('decodePolyline', () => {
  it('round-trips a known Google-encoded string at precision 5', () => {
    const points = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5)
    expect(points).toHaveLength(3)
    expect(points[0].lat).toBeCloseTo(38.5, 5)
    expect(points[0].lon).toBeCloseTo(-120.2, 5)
    expect(points[2].lat).toBeCloseTo(43.252, 5)
  })
})
