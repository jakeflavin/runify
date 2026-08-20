/**
 * The rail after a run: the headline numbers, then the evidence for them.
 *
 * Order matters here and follows what a runner actually looks at, in order — distance and
 * pace first, then the splits that explain the average, then the terrain and heart rate that
 * explain the splits. Anything the file did not record is simply absent rather than shown
 * as a dash: an activity without a heart-rate strap should not have an empty zone chart.
 */

import { Suspense, lazy, useMemo } from 'react'
import { Button, Chip, Empty, Input, Muted, Row, StatRow } from '../ui.styled'
import { Heart, Repeat2, TrendingUp } from 'lucide-react'
import { Section, Stat } from '@/components/ui'
import { SplitsTable } from '@/components/SplitsTable'
import { HrZones } from '@/components/HrZones'
// Deferred for the same reason as on the planning side: the charting library is only
// needed once a file has actually been opened.
const ElevationChart = lazy(() =>
  import('@/components/charts/ElevationChart').then((m) => ({ default: m.ElevationChart })),
)
const PaceChart = lazy(() => import('@/components/charts/PaceChart').then((m) => ({ default: m.PaceChart })))
import { timeInZones, type Activity, type Analysis } from '@/lib/analysis'
import { vdot } from '@/lib/pace'
import type { LatLng } from '@/lib/geo'
import {
  formatDistance,
  formatDuration,
  formatDecimal,
  formatElevation,
  formatPace,
  unitLabels,
  type UnitSystem,
} from '@/lib/units'

export function AnalyzePanel({
  activity,
  analysis,
  units,
  maxHr,
  setMaxHr,
  onReplace,
  onHoverPoint,
}: {
  activity: Activity
  analysis: Analysis
  units: UnitSystem
  maxHr: number
  setMaxHr: (value: number) => void
  onReplace: () => void
  onHoverPoint: (point: LatLng | null) => void
}) {
  const labels = unitLabels(units)
  const zones = useMemo(
    () => (analysis.hasHr ? timeInZones(activity.points, maxHr) : null),
    [activity.points, analysis.hasHr, maxHr],
  )

  const stopped = analysis.elapsed - analysis.movingTime
  const fitness = analysis.hasTime ? vdot(analysis.distance, analysis.movingTime) : NaN

  return (
    <>
      <Section
        title={
          activity.startTime
            ? new Date(activity.startTime).toLocaleString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })
            : 'Activity'
        }
        action={
          <Button $ghost $small type="button"  onClick={onReplace}>
            <Repeat2 size={14} /> New file
          </Button>
        }
      >
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 14px', letterSpacing: '-0.01em' }}>
          {activity.name}
        </h1>

        <StatRow  style={{ marginBottom: 14 }}>
          <Stat
            label="Distance"
            value={formatDistance(analysis.distance, units)}
            unit={labels.distance}
            size="lg"
          />
          <Stat
            label="Moving time"
            value={formatDuration(analysis.movingTime)}
            size="lg"
            sub={stopped > 30 ? `${formatDuration(stopped)} stopped` : undefined}
          />
        </StatRow>

        {/* Both rows always render every stat. A channel the file did not record shows a
            dash rather than removing its column, so two runs from the same watch put the
            same number in the same place and the eye can go straight to it. */}
        <StatRow>
          <Stat
            label="Pace"
            value={formatPace(analysis.avgPace)}
            unit={labels.pace}
            tone="var(--brand)"
          />
          <Stat
            label="GAP"
            value={analysis.hasElevation ? formatPace(analysis.gradeAdjustedPace) : '—'}
            unit={analysis.hasElevation ? labels.pace : undefined}
            sub="grade adjusted"
          />
          <Stat
            label="Climb"
            value={analysis.hasElevation ? formatElevation(analysis.elevation.gain, units) : '—'}
            unit={analysis.hasElevation ? labels.elevation : undefined}
          />
        </StatRow>

        <StatRow  style={{ marginTop: 14 }}>
          <Stat
            label="Avg HR"
            value={analysis.hasHr ? (analysis.avgHr ?? '—') : '—'}
            unit={analysis.hasHr ? 'bpm' : undefined}
            size="sm"
            sub={analysis.hasHr ? `max ${analysis.maxHr}` : undefined}
          />
          <Stat
            label="Cadence"
            value={analysis.hasCadence ? (analysis.avgCadence ?? '—') : '—'}
            unit={analysis.hasCadence ? 'spm' : undefined}
            size="sm"
          />
          <Stat
            label="VDOT"
            value={Number.isFinite(fitness) ? formatDecimal(fitness) : '—'}
            size="sm"
            sub="Daniels & Gilbert"
          />
        </StatRow>
      </Section>

      {/* The four sections below are fixtures of the rail. A file that did not record a
          channel gets a sentence naming what is missing, rather than the section silently
          not existing — the rail then has one shape for every run, and the reason a chart
          is absent is on screen instead of inferred. */}
      <Section title="Pace">
        {analysis.hasTime && analysis.series.pace.some(Number.isFinite) ? (
          <>
            <Suspense fallback={<div style={{ height: 160 }} />}>
              <PaceChart
                distances={analysis.series.distance}
                paces={analysis.series.pace}
                heartRates={analysis.hasHr ? activity.points.map((p) => p.hr) : undefined}
                path={activity.points}
                units={units}
                onHover={onHoverPoint}
              />
            </Suspense>
            {analysis.hasHr && (
              <Row  style={{ gap: 14, marginTop: 8, fontSize: 12 }}>
                <Muted>
                  <span style={{ color: 'var(--s-pace)' }}>●</span> Pace
                </Muted>
                <Muted>
                  <span style={{ color: 'var(--s-hr)' }}>●</span> Heart rate
                </Muted>
              </Row>
            )}
          </>
        ) : (
          <Empty as="p"  style={{ padding: '8px 0' }}>
            This file has no timestamps, so there is no pace to plot.
          </Empty>
        )}
      </Section>

      <Section title={`Splits · per ${units === 'imperial' ? 'mile' : 'kilometre'}`}>
        {analysis.splits.length > 0 ? (
          <SplitsTable
            splits={analysis.splits}
            units={units}
            showHr={analysis.hasHr}
            showGap={analysis.hasElevation}
          />
        ) : (
          <Empty as="p"  style={{ padding: '8px 0' }}>
            The run is shorter than one {units === 'imperial' ? 'mile' : 'kilometre'} — no
            splits yet.
          </Empty>
        )}
      </Section>

      <Section
        title="Elevation"
        action={
          analysis.hasElevation ? (
            <Chip>
              <TrendingUp size={11} aria-hidden="true" />+
              {formatElevation(analysis.elevation.gain, units)} / −
              {formatElevation(analysis.elevation.loss, units)} {labels.elevation}
            </Chip>
          ) : undefined
        }
      >
        {analysis.hasElevation ? (
          <Suspense fallback={<div style={{ height: 132 }} />}>
            <ElevationChart
              points={analysis.series.distance.flatMap((distance, i) => {
                const elevation = analysis.series.elevation[i]
                return elevation === undefined
                  ? []
                  : [{ distance, elevation, gradient: analysis.series.gradient[i] ?? 0 }]
              })}
              path={activity.points}
              units={units}
              onHover={onHoverPoint}
            />
          </Suspense>
        ) : (
          <Empty as="p"  style={{ padding: '8px 0' }}>
            This file recorded no elevation, so there is no profile to draw.
          </Empty>
        )}
      </Section>

      <Section
        title="Heart rate zones"
        action={
          zones ? (
            <Row as="label"  style={{ gap: 6, fontSize: 12 }}>
              <Muted as={Heart} size={12} aria-hidden="true" />
              <Muted>Max</Muted>
              <Input

                style={{ width: 62, height: 26 }}
                type="number"
                min={120}
                max={230}
                value={maxHr}
                aria-label="Maximum heart rate"
                onChange={(event) => {
                  const value = Number(event.target.value)
                  if (value >= 120 && value <= 230) setMaxHr(value)
                }}/>
            </Row>
          ) : undefined
        }
      >
        {zones ? (
          <HrZones seconds={zones} maxHr={maxHr} />
        ) : (
          <Empty as="p"  style={{ padding: '8px 0' }}>
            No heart rate in this file — recorded without a strap or a watch that reports it.
          </Empty>
        )}
      </Section>
    </>
  )
}
