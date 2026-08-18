import { describe, expect, it } from 'vitest'
import { formatDuration, formatPace, parseDuration, toDistance } from './units'

describe('parseDuration', () => {
  it('reads m:ss as minutes and seconds', () => {
    expect(parseDuration('7:30')).toBe(450)
  })

  it('reads h:mm:ss', () => {
    expect(parseDuration('1:23:45')).toBe(5025)
  })

  it('treats a bare number as minutes, which is how people type a pace', () => {
    expect(parseDuration('8')).toBe(480)
  })

  it('does not pad a short seconds field — 7:3 is seven-thirty', () => {
    expect(parseDuration('7:3')).toBe(423)
  })

  it('rejects nonsense rather than returning NaN', () => {
    expect(parseDuration('abc')).toBeNull()
    expect(parseDuration('')).toBeNull()
    expect(parseDuration('1:2:3:4')).toBeNull()
  })
})

describe('formatting', () => {
  it('drops the hour field under an hour', () => {
    expect(formatDuration(450)).toBe('7:30')
    expect(formatDuration(5025)).toBe('1:23:45')
  })

  it('shows an em dash rather than NaN for a missing value', () => {
    expect(formatDuration(Number.NaN)).toBe('—')
    expect(formatPace(Infinity)).toBe('—')
  })

  it('converts to miles and kilometres', () => {
    expect(toDistance(1609.344, 'imperial')).toBeCloseTo(1, 6)
    expect(toDistance(5000, 'metric')).toBe(5)
  })
})
