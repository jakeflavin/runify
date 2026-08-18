/**
 * The rail after a run: the headline numbers, then the evidence for them.
 *
 * Order matters here and follows what a runner actually looks at, in order — distance and
 * pace first, then the splits that explain the average, then the terrain and heart rate that
 * explain the splits. Anything the file did not record is simply absent rather than shown
 * as a dash: an activity without a heart-rate strap should not have an empty zone chart.
 */

import { Suspense, lazy, useMemo } from 'react'
import { Heart, Repeat2, TrendingUp } from 'lucide-react'
import { Section, Stat } from '../ui'
import { SplitsTable } from '../SplitsTable'
import { HrZones } from '../HrZones'
// Deferred for the same reason as on the planning side: the charting library is only
// needed once a file has actually been opened.
const ElevationChart = lazy(() =>
  import('../charts/ElevationChart').then((m) => ({ default: m.ElevationChart })),
)
const PaceChart = lazy(() => import('../charts/PaceChart').then((m) => ({ default: m.PaceChart })))
import { timeInZones, type Activity, type Analysis } from '../../lib/analysis'
import { vdot } from '../../lib/pace'
import type { LatLng } from '../../lib/geo'
import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  unitLabels,
  type UnitSystem,
} from '../../lib/units'

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
        title={activity.startTime ? new Date(activity.startTime).toLocaleString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }) : 'Activity'}
        action={
          <button type="button" className="btn ghost sm" onClick={onReplace}>
            <Repeat2 size={14} /> New file
          </button>
        }
      >
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 14px', letterSpacing: '-0.01em' }}>
          {activity.name}
        </h1>

        <div className="stat-row" style={{ marginBottom: 14 }}>
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
        </div>

        <div className="stat-row">
          <Stat
            label="Pace"
            value={formatPace(analysis.avgPace)}
            unit={labels.pace}
            tone="var(--brand)"
          />
          {analysis.hasElevation && (
            <Stat
              label="GAP"
              value={formatPace(analysis.gradeAdjustedPace)}
              unit={labels.pace}
              sub="grade adjusted"
            />
          )}
          {analysis.hasElevation && (
            <Stat
              label="Climb"
              value={formatElevation(analysis.elevation.gain, units)}
              unit={labels.elevation}
            />
          )}
        </div>

        {(analysis.hasHr || analysis.hasCadence || Number.isFinite(fitness)) && (
          <div className="stat-row" style={{ marginTop: 14 }}>
            {analysis.hasHr && (
              <Stat
                label="Avg HR"
                value={analysis.avgHr ?? '—'}
                unit="bpm"
                size="sm"
                sub={`max ${analysis.maxHr}`}
              />
            )}
            {analysis.hasCadence && (
              <Stat label="Cadence" value={analysis.avgCadence ?? '—'} unit="spm" size="sm" />
            )}
            {Number.isFinite(fitness) && (
              <Stat
                label="VDOT"
                value={fitness.toFixed(1)}
                size="sm"
                sub="Daniels & Gilbert"
              />
            )}
          </div>
        )}
      </Section>

      {analysis.hasTime && analysis.series.pace.some(Number.isFinite) && (
        <Section title="Pace">
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
            <div className="row" style={{ gap: 14, marginTop: 8, fontSize: 12 }}>
              <span className="muted">
                <span style={{ color: 'var(--s-pace)' }}>●</span> Pace
              </span>
              <span className="muted">
                <span style={{ color: 'var(--s-hr)' }}>●</span> Heart rate
              </span>
            </div>
          )}
        </Section>
      )}

      {analysis.splits.length > 0 && (
        <Section title={`Splits · per ${units === 'imperial' ? 'mile' : 'kilometre'}`}>
          <SplitsTable
            splits={analysis.splits}
            units={units}
            showHr={analysis.hasHr}
            showGap={analysis.hasElevation}
          />
        </Section>
      )}

      {analysis.hasElevation && (
        <Section
          title="Elevation"
          action={
            <span className="chip">
              <TrendingUp size={11} aria-hidden="true" />
              +{formatElevation(analysis.elevation.gain, units)} / −
              {formatElevation(analysis.elevation.loss, units)} {labels.elevation}
            </span>
          }
        >
          <Suspense fallback={<div style={{ height: 132 }} />}>
            <ElevationChart
              points={analysis.series.distance.map((distance, i) => ({
                distance,
                elevation: analysis.series.elevation[i],
                gradient: analysis.series.gradient[i],
              }))}
              path={activity.points}
              units={units}
              onHover={onHoverPoint}
            />
          </Suspense>
        </Section>
      )}

      {zones && (
        <Section
          title="Heart rate zones"
          action={
            <label className="row" style={{ gap: 6, fontSize: 12 }}>
              <Heart size={12} className="muted" aria-hidden="true" />
              <span className="muted">Max</span>
              <input
                className="input"
                style={{ width: 62, height: 26 }}
                type="number"
                min={120}
                max={230}
                value={maxHr}
                aria-label="Maximum heart rate"
                onChange={(event) => {
                  const value = Number(event.target.value)
                  if (value >= 120 && value <= 230) setMaxHr(value)
                }}
              />
            </label>
          }
        >
          <HrZones seconds={zones} maxHr={maxHr} />
        </Section>
      )}
    </>
  )
}
