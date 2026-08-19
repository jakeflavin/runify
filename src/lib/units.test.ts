import { describe, expect, it } from 'vitest'
import {
  formatAxisDistance,
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  formatPercent,
  parseDuration,
  toDistance,
} from './units'

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

describe('locale-aware number formatting', () => {
  // These assert against Intl rather than against a literal, because a literal would only
  // be true on a machine whose default locale is English — which is the bug being fixed.
  const en = (value: number, options: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat('en-US', options).format(value)

  it('formats a distance at the requested precision', () => {
    expect(formatDistance(5000, 'metric')).toBe(
      en(5, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    )
    expect(formatDistance(5000, 'metric', 0)).toBe(en(5, { maximumFractionDigits: 0 }))
  })

  it('groups an elevation, since feet run to four figures', () => {
    expect(formatElevation(1000, 'imperial')).toBe(en(3281, { maximumFractionDigits: 0 }))
  })

  it('formats a gradient as a percentage from the ratio, not from a pre-multiplied number', () => {
    expect(formatPercent(0.015)).toBe(
      en(0.015, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    )
  })

  it('drops the axis decimal once the numbers are big enough not to need it', () => {
    expect(formatAxisDistance(4.25)).toBe(en(4.25, { minimumFractionDigits: 1, maximumFractionDigits: 1 }))
    expect(formatAxisDistance(26)).toBe(en(26, { maximumFractionDigits: 0 }))
  })

  it('uses the decimal mark the reader expects, which is the whole point', () => {
    // Proven directly: the module's formatters follow the runtime locale, so a French
    // reader sees 7,45 where an English one sees 7.45.
    expect(new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 }).format(7.45)).toBe('7,45')
    expect(new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(7.45)).toBe('7.45')
  })
})
