/**
 * Time in each heart-rate zone.
 *
 * Drawn as five rows rather than a stacked bar or a donut: the question a runner asks of
 * this is "how long was I in zone 4?", which a row answers directly and a donut makes you
 * estimate. Widths are relative to the largest zone so the shape of the distribution is
 * visible even on a run that never left two of them.
 */

import { HR_ZONES } from '@/lib/pace'
import { Muted } from './ui.styled'
import { formatDuration } from '@/lib/units'

export function HrZones({ seconds, maxHr }: { seconds: number[]; maxHr: number }) {
  const total = seconds.reduce((a, b) => a + b, 0)
  if (total <= 0) return null
  const peak = Math.max(...seconds)

  return (
    <div>
      {HR_ZONES.map((zone, i) => (
        <div className="zone-row" key={zone.zone}>
          <Muted as="div"  title={zone.name}>
            Z{zone.zone}
          </Muted>
          <div className="zone-track">
            <div
              className="zone-fill"
              style={{
                width: `${peak > 0 ? ((seconds[i] ?? 0) / peak) * 100 : 0}%`,
                background: zone.color,
              }}
            />
          </div>
          <div style={{ textAlign: 'right' }}>
            {formatDuration(seconds[i] ?? 0)}
            <Muted> {Math.round(((seconds[i] ?? 0) / total) * 100)}%</Muted>
          </div>
        </div>
      ))}
      <Muted as="div"  style={{ fontSize: 11, marginTop: 6 }}>
        Zones from a maximum of {maxHr} bpm — Z1 under {Math.round(maxHr * 0.6)}, Z5 over{' '}
        {Math.round(maxHr * 0.9)}.
      </Muted>
    </div>
  )
}
