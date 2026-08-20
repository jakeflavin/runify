/**
 * Splits, with a bar per row.
 *
 * The bar is the point of the table. Reading a column of `7:42 7:38 8:05 7:51` tells you
 * very little at a glance; the same numbers as bars show instantly where the run fell apart.
 * Bars are scaled from the slowest split rather than from zero, because every split in a run
 * is within a minute or so of the others and a zero-based bar makes them all look identical.
 */

import type { Split } from '@/lib/analysis'
import { Bar, BarCell, Muted, Num, Table } from './ui.styled'
import {
  formatDecimal,
  formatDuration,
  formatElevation,
  formatPace,
  unitLabels,
  type UnitSystem,
} from '@/lib/units'

export function SplitsTable({
  splits,
  units,
  showHr,
  showGap,
}: {
  splits: Split[]
  units: UnitSystem
  showHr?: boolean
  showGap?: boolean
}) {
  if (splits.length === 0) return null

  const labels = unitLabels(units)
  const paces = splits.map((s) => s.pace).filter(Number.isFinite)
  const fastest = Math.min(...paces)

  return (
    <Table>
      <thead>
        <tr>
          <th>{units === 'imperial' ? 'Mile' : 'Km'}</th>
          <th>Pace</th>
          <BarCell as="th"  aria-hidden="true"/>
          {showGap && <th>GAP</th>}
          <th>Elev</th>
          {showHr && <th>HR</th>}
        </tr>
      </thead>
      <tbody>
        {splits.map((split) => {
          // A part-split at the end is not comparable to a full one, so it gets a dim bar.
          const partial = split.meters < 0.95 * (splits[0]?.meters ?? split.meters)
          const width = Number.isFinite(split.pace) ? (fastest / split.pace) * 100 : 0

          return (
            <tr key={split.index}>
              <td>
                {split.index}
                {partial && (
                  <Muted>
                    {' '}
                    · {formatDecimal(split.meters / (splits[0]?.meters ?? 1), 2)}
                  </Muted>
                )}
              </td>
              <Num>
                {formatPace(split.pace)}
                <Muted>{labels.pace}</Muted>
              </Num>
              <BarCell>
                {/* Dim means exactly one thing: this bar is not comparable to the others.
                    The slowest full split used to share the treatment, which put two
                    unrelated facts in one grey — being slowest is already told by the
                    shortest bar. */}
                <Bar
                  data-bar
                  data-dim={partial || undefined}
                  $dim={partial}
                  style={{ width: `${Math.max(3, width)}%` }}
                />
              </BarCell>
              {showGap && (
                <Muted as="td">
                  {Number.isFinite(split.gradeAdjustedPace)
                    ? formatPace(split.gradeAdjustedPace)
                    : '—'}
                </Muted>
              )}
              <Muted as="td">
                {split.gain - split.loss >= 0 ? '+' : '−'}
                {formatElevation(Math.abs(split.gain - split.loss), units)}
              </Muted>
              {showHr && <Muted as="td">{split.avgHr ?? '—'}</Muted>}
            </tr>
          )
        })}
      </tbody>
      <tfoot>
        <tr>
          <Muted as="td">Total</Muted>
          <Num>{formatDuration(splits.reduce((sum, s) => sum + s.seconds, 0))}</Num>
          <td colSpan={2 + (showGap ? 1 : 0) + (showHr ? 1 : 0)} />
        </tr>
      </tfoot>
    </Table>
  )
}
