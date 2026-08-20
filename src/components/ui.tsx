/**
 * The small set of shapes the interface is built from.
 *
 * They exist so that a stat looks identical whether it is showing a planned distance or a
 * recorded one — the Strava idiom is a tiny caps label over a large tabular number, and it
 * only reads as a system if every instance is the same instance.
 */

import type { ReactNode } from 'react'
import {
  Band,
  Head,
  SegmentedGroup,
  Spacer,
  StatBox,
  StatLabel,
  StatSub,
  StatValue,
  SwitchLabel,
  Title,
  Unit,
} from './ui.styled'

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
    <StatBox $size={size}>
      <StatLabel>{label}</StatLabel>
      <StatValue style={tone ? { color: tone } : undefined}>
        {value}
        {unit ? <Unit>{unit}</Unit> : null}
      </StatValue>
      {sub ? <StatSub>{sub}</StatSub> : null}
    </StatBox>
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
    <Band>
      {(title || action) && (
        <Head>
          {title ? <Title>{title}</Title> : null}
          <Spacer />
          {action}
        </Head>
      )}
      {children}
    </Band>
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
    <SegmentedGroup $brand={brand} role="group" aria-label={label}>
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
    </SegmentedGroup>
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
    <SwitchLabel>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </SwitchLabel>
  )
}
