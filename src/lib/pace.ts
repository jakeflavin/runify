/**
 * Running physiology, reduced to the three curves this app needs.
 *
 * Each one is an empirical fit from the literature rather than anything derived, so each
 * carries its source and its domain of validity. They are kept apart from the geometry so
 * they can be tested against published values.
 */

/**
 * Grade-adjusted pace.
 *
 * Minetti et al. (2002), "Energy cost of walking and running at extreme uphill and downhill
 * slopes", fits the metabolic cost of running as a quintic in the gradient. Dividing by the
 * level-ground cost gives a multiplier: how much harder a metre at this grade is than a
 * metre on the flat. Multiply elapsed time on a hill by it and you get the time the same
 * effort would have produced on the flat, which is what "GAP" means.
 *
 * The fit was measured over ±45% and is nonsense outside that, so the gradient is clamped.
 * Note the curve is not monotonic: a shallow downhill is genuinely cheaper than flat, with
 * a minimum near −20%, after which braking costs more than gravity gives back.
 */
export function gradeFactor(gradient: number): number {
  const i = Math.max(-0.45, Math.min(0.45, gradient))
  const cost = 155.4 * i ** 5 - 30.4 * i ** 4 - 43.3 * i ** 3 + 46.3 * i ** 2 + 19.5 * i + 3.6
  return cost / 3.6
}

/**
 * Riegel's endurance formula: t₂ = t₁ · (d₂/d₁)^1.06.
 *
 * Peter Riegel, "Athletic Records and Human Endurance" (1981). The 1.06 exponent is the
 * fitted fatigue factor across running events; it holds well between about 1 500 m and the
 * marathon, and over-predicts outside that range, which is why the table stops where it does.
 */
export function riegel(knownMeters: number, knownSeconds: number, targetMeters: number): number {
  if (knownMeters <= 0 || knownSeconds <= 0) return NaN
  return knownSeconds * (targetMeters / knownMeters) ** 1.06
}

/**
 * Daniels & Gilbert VDOT: the VO₂max implied by running `meters` in `seconds`.
 *
 * From Daniels' Running Formula — the ratio of the oxygen cost of that velocity to the
 * fraction of VO₂max sustainable for that duration. Useful as a single number to compare
 * two efforts at different distances.
 */
export function vdot(meters: number, seconds: number): number {
  if (meters <= 0 || seconds <= 0) return NaN
  const minutes = seconds / 60
  const velocity = meters / minutes // metres per minute
  const cost = -4.6 + 0.182258 * velocity + 0.000104 * velocity ** 2
  const fraction =
    0.8 + 0.1894393 * Math.exp(-0.012778 * minutes) + 0.2989558 * Math.exp(-0.1932605 * minutes)
  return cost / fraction
}

/** The five-zone model, as percentages of maximum heart rate. */
export const HR_ZONES = [
  { zone: 1, name: 'Endurance', min: 0.5, max: 0.6, color: 'var(--z1)' },
  { zone: 2, name: 'Moderate', min: 0.6, max: 0.7, color: 'var(--z2)' },
  { zone: 3, name: 'Tempo', min: 0.7, max: 0.8, color: 'var(--z3)' },
  { zone: 4, name: 'Threshold', min: 0.8, max: 0.9, color: 'var(--z4)' },
  { zone: 5, name: 'Anaerobic', min: 0.9, max: Infinity, color: 'var(--z5)' },
] as const

/** Which zone a heart rate falls in, 1–5. Anything under 50% of max counts as zone 1. */
export function hrZone(bpm: number, maxHr: number): number {
  const fraction = bpm / maxHr
  for (const z of HR_ZONES) if (fraction < z.max) return z.zone
  return 5
}

/** Age-predicted maximum heart rate — Tanaka et al. (2001), which beats the old 220−age. */
export const maxHrForAge = (age: number) => Math.round(208 - 0.7 * age)
