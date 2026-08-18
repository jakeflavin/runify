/**
 * The small set of shapes the interface is built from.
 *
 * They exist so that a stat looks identical whether it is showing a planned distance or a
 * recorded one — the Strava idiom is a tiny caps label over a large tabular number, and it
 * only reads as a system if every instance is the same instance.
 */

import type { ReactNode } from 'react'

export function Stat({
  label,
  value,
  unit,
  sub,
  size,
  tone,
}: {
  label: string
  value: ReactNode
  unit?: string
  sub?: ReactNode
  size?: 'sm' | 'lg'
  tone?: string
}) {
  return (
    <div className={`stat${size ? ` ${size}` : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={tone ? { color: tone } : undefined}>
        {value}
        {unit ? <span className="unit">{unit}</span> : null}
      </div>
      {sub ? <div className="stat-sub">{sub}</div> : null}
    </div>
  )
}

export function Section({
  title,
  action,
  children,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="section">
      {(title || action) && (
        <div className="section-head">
          {title ? <h2 className="section-title">{title}</h2> : null}
          <div className="spacer" />
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  brand,
  label,
}: {
  value: T
  options: { value: T; label: string; icon?: ReactNode }[]
  onChange: (value: T) => void
  brand?: boolean
  label: string
}) {
  return (
    <div className={`segmented${brand ? ' brand' : ''}`} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
}) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  )
}
