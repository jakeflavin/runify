import { describe, expect, it } from 'vitest'
import { gradeFactor, hrZone, maxHrForAge, riegel, vdot } from './pace'

describe('gradeFactor', () => {
  it('is exactly 1 on the flat', () => {
    expect(gradeFactor(0)).toBeCloseTo(1, 6)
  })

  it('makes uphill running cost more', () => {
    expect(gradeFactor(0.05)).toBeGreaterThan(1)
    expect(gradeFactor(0.1)).toBeGreaterThan(gradeFactor(0.05))
  })

  it('makes a shallow downhill cheaper than flat', () => {
    expect(gradeFactor(-0.05)).toBeLessThan(1)
  })

  it('turns back upward on a steep downhill, where braking costs more than gravity gives', () => {
    expect(gradeFactor(-0.4)).toBeGreaterThan(gradeFactor(-0.2))
  })

  it('clamps outside the range the curve was fitted over', () => {
    expect(gradeFactor(5)).toBe(gradeFactor(0.45))
    expect(gradeFactor(-5)).toBe(gradeFactor(-0.45))
  })
})

describe('riegel', () => {
  it('predicts a marathon slower than twice the half', () => {
    const half = 90 * 60
    expect(riegel(21097.5, half, 42195)).toBeGreaterThan(2 * half)
  })

  it('returns the same time for the same distance', () => {
    expect(riegel(5000, 1200, 5000)).toBeCloseTo(1200, 6)
  })
})

describe('vdot', () => {
  it('puts a 20-minute 5K in the mid-forties, as the published tables do', () => {
    const value = vdot(5000, 20 * 60)
    expect(value).toBeGreaterThan(48)
    expect(value).toBeLessThan(52)
  })

  it('rises as the same distance is run faster', () => {
    expect(vdot(5000, 18 * 60)).toBeGreaterThan(vdot(5000, 22 * 60))
  })
})

describe('heart rate', () => {
  it('places a rate in the zone its percentage falls in', () => {
    expect(hrZone(100, 200)).toBe(1)
    expect(hrZone(130, 200)).toBe(2)
    expect(hrZone(150, 200)).toBe(3)
    expect(hrZone(170, 200)).toBe(4)
    expect(hrZone(195, 200)).toBe(5)
  })

  it('uses Tanaka rather than 220 minus age', () => {
    expect(maxHrForAge(40)).toBe(180)
  })
})
