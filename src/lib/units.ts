/**
 * The unit boundary.
 *
 * Everything upstream of this file is SI — metres, seconds, metres per second. Nothing
 * downstream of it does arithmetic. Keeping the conversion in one place is what stops the
 * "is this already miles?" class of bug, which in a pace calculator is silent and wrong
 * rather than loud and wrong.
 */

export type UnitSystem = 'imperial' | 'metric'

const MILE = 1609.344
const FOOT = 0.3048

export const unitLabels = (units: UnitSystem) =>
  units === 'imperial'
    ? { distance: 'mi', elevation: 'ft', pace: '/mi', speed: 'mph' }
    : { distance: 'km', elevation: 'm', pace: '/km', speed: 'km/h' }

/*
 * Number formatting goes through Intl so the decimal mark follows the reader — 7,45 km
 * in fr, 7.45 in en — and thousands are grouped the way they expect. The formatters are
 * built once and reused: constructing one costs far more than using it, and these are
 * called per split row and per chart tick.
 */
const fractional = new Map<number, Intl.NumberFormat>()
const toDigits = (digits: number) => {
  const existing = fractional.get(digits)
  if (existing) return existing
  const format = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
  fractional.set(digits, format)
  return format
}

const grouped = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })

/** A whole number, grouped. Any count the reader scans. */
export const formatNumber = (value: number) => grouped.format(value)

/** A number at a fixed precision — VDOT, a split fraction, anything with a decimal. */
export const formatDecimal = (value: number, digits = 1) => toDigits(digits).format(value)

/**
 * A chart's distance axis: one decimal while the numbers are small, none once they are
 * not, so the ticks stay the same width as the run gets longer.
 */
export const formatAxisDistance = (value: number) => toDigits(value < 10 ? 1 : 0).format(value)

/*
 * A gradient, given as a ratio rather than as a number already multiplied out — the
 * formatter places the sign and the symbol, which is "%1,5" in tr and "1,5 %" in fr.
 */
const percent = new Intl.NumberFormat(undefined, {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
export const formatPercent = (ratio: number) => percent.format(ratio)

/** Metres in one distance unit — the divisor for every per-unit figure. */
export const unitMeters = (units: UnitSystem) => (units === 'imperial' ? MILE : 1000)

export const toDistance = (meters: number, units: UnitSystem) => meters / unitMeters(units)
export const fromDistance = (value: number, units: UnitSystem) => value * unitMeters(units)
export const toElevation = (meters: number, units: UnitSystem) =>
  units === 'imperial' ? meters / FOOT : meters

/** Distance, at the precision a runner actually reads: hundredths under a marathon. */
export function formatDistance(meters: number, units: UnitSystem, digits = 2): string {
  return toDigits(digits).format(toDistance(meters, units))
}

export function formatElevation(meters: number, units: UnitSystem): string {
  // Rounded before formatting rather than by the formatter, so a negative loss rounds
  // the same way it always has.
  return grouped.format(Math.round(toElevation(meters, units)))
}

/**
 * A duration as `h:mm:ss`, or `m:ss` under an hour — the way a watch shows it.
 * Non-finite input becomes an em dash rather than `NaN:NaN`.
 */
export function formatDuration(seconds: number, forceHours = false): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 || forceHours ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** Pace, given as seconds per distance unit, as `m:ss`. */
export function formatPace(secondsPerUnit: number): string {
  if (!Number.isFinite(secondsPerUnit) || secondsPerUnit <= 0) return '—'
  const total = Math.round(secondsPerUnit)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** Speed in m/s expressed as pace, in seconds per distance unit. */
export const speedToPace = (metersPerSecond: number, units: UnitSystem) =>
  metersPerSecond > 0 ? unitMeters(units) / metersPerSecond : Infinity

/** Seconds per distance unit, from a distance and a time. */
export const paceOf = (meters: number, seconds: number, units: UnitSystem) =>
  meters > 0 ? seconds / toDistance(meters, units) : Infinity

export const formatSpeed = (metersPerSecond: number, units: UnitSystem) =>
  toDigits(1).format((metersPerSecond * 3600) / unitMeters(units))

/**
 * Parse `m:ss`, `h:mm:ss` or a bare number of minutes. Returns seconds, or null.
 * Accepts the sloppy input people actually type — `7:3` means seven-thirty, not 7:03.
 */
export function parseDuration(input: string): number | null {
  const text = input.trim()
  if (!text) return null
  const parts = text.split(':')
  if (parts.length > 3 || parts.some((p) => p !== '' && !/^\d*\.?\d*$/.test(p))) return null

  const numbers = parts.map((p) => (p === '' ? 0 : Number(p)))
  if (numbers.some((n) => !Number.isFinite(n))) return null

  const [a = 0, b = 0, c = 0] = numbers
  if (numbers.length === 1) return a * 60
  if (numbers.length === 2) return a * 60 + b
  return a * 3600 + b * 60 + c
}

/** The standard race distances, in metres, for the equivalent-performance table. */
export const RACES: { name: string; meters: number }[] = [
  { name: '1 mile', meters: MILE },
  { name: '5K', meters: 5000 },
  { name: '10K', meters: 10000 },
  { name: 'Half', meters: 21097.5 },
  { name: 'Marathon', meters: 42195 },
]
