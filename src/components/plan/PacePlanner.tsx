/**
 * "How long will this take me?"
 *
 * Two ways in, because runners arrive with either question: *I can hold 8:00, when do I
 * finish?* or *I want to break 50 minutes, what do I need to run?* Whichever is typed, the
 * other is derived, and both are computed against the route's terrain rather than its length
 * — the number this panel exists to give is the one a flat calculator gets wrong.
 */

import { useMemo, useState } from 'react'
import { Empty, Field, Grid2, Input, Muted, Num, StatRow, Table } from '../ui.styled'
import { Flag, Timer } from 'lucide-react'
import { Section, Segmented, Stat } from '@/components/ui'
import { SplitsTable } from '@/components/SplitsTable'
import { effortLength, predictSplits } from '@/lib/plan'
import {
  RACES,
  formatDistance,
  formatDuration,
  formatPace,
  parseDuration,
  toDistance,
  unitLabels,
  unitMeters,
  type UnitSystem,
} from '@/lib/units'
import { riegel } from '@/lib/pace'
import type { RouteProfile } from '@/hooks/useElevationProfile'

type Mode = 'pace' | 'time'

export function PacePlanner({
  meters,
  profile,
  units,
}: {
  meters: number
  profile: RouteProfile | null | undefined
  units: UnitSystem
}) {
  const [mode, setMode] = useState<Mode>('pace')
  const [paceText, setPaceText] = useState('9:00')
  const [timeText, setTimeText] = useState('45:00')

  const labels = unitLabels(units)
  const per = unitMeters(units)

  // Without a terrain profile the route is treated as flat, and the panel says so. Both
  // arrays are memoised because every calculation below keys off their identity.
  const distances = useMemo(() => profile?.distances ?? [0, meters], [profile, meters])
  const elevations = useMemo(() => profile?.series ?? [0, 0], [profile])

  const effort = useMemo(() => {
    const length = effortLength(distances, elevations)
    return length > 0 ? length : meters
  }, [distances, elevations, meters])

  /**
   * What the terrain does to the route, as a multiplier on flat. Above 1 the hills cost
   * you time; below 1 the route is net downhill and gives some back.
   */
  const terrainFactor = meters > 0 ? effort / meters : 1

  // The flat-ground pace the runner is holding — typed directly, or backed out of a target.
  const flatPace = useMemo(() => {
    if (mode === 'pace') return parseDuration(paceText) ?? NaN
    const target = parseDuration(timeText)
    return target && effort > 0 ? (target / effort) * per : NaN
  }, [mode, paceText, timeText, effort, per])

  const finish = Number.isFinite(flatPace) ? (effort / per) * flatPace : NaN
  const actualPace = meters > 0 && Number.isFinite(finish) ? (finish / meters) * per : NaN

  const splits = useMemo(
    () => (Number.isFinite(flatPace) ? predictSplits(distances, elevations, per, flatPace) : []),
    [distances, elevations, per, flatPace],
  )

  if (meters <= 0) return null

  return (
    <>
      <Section
        title="Plan the effort"
        action={
          <Segmented<Mode>
            label="Plan by"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'pace', label: 'By pace', icon: <Timer size={13} /> },
              { value: 'time', label: 'By finish', icon: <Flag size={13} /> },
            ]}
          />
        }
      >
        <Grid2  style={{ marginBottom: 14 }}>
          <Field>
            <label htmlFor="plan-pace">Flat pace {labels.pace}</label>
            <Input
              id="plan-pace"
              
              inputMode="numeric"
              placeholder="9:00"
              value={
                mode === 'pace' ? paceText : Number.isFinite(flatPace) ? formatPace(flatPace) : ''
              }
              readOnly={mode === 'time'}
              onChange={(event) => setPaceText(event.target.value)}/>
          </Field>
          <Field>
            <label htmlFor="plan-time">Target finish</label>
            <Input
              id="plan-time"
              
              inputMode="numeric"
              placeholder="45:00"
              value={
                mode === 'time' ? timeText : Number.isFinite(finish) ? formatDuration(finish) : ''
              }
              readOnly={mode === 'pace'}
              onChange={(event) => setTimeText(event.target.value)}/>
          </Field>
        </Grid2>

        <StatRow>
          <Stat label="Finish" value={formatDuration(finish)} size="lg" tone="var(--brand)" />
          <Stat
            label="Average pace"
            value={formatPace(actualPace)}
            unit={labels.pace}
            sub={terrainDescription(terrainFactor, flatPace)}
          />
        </StatRow>

        {!profile && (
          <Muted as="p"  style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
            No terrain data for this route yet — these figures assume it is flat.
          </Muted>
        )}
      </Section>

      {splits.length > 0 && (
        <Section title={`Predicted splits · ${splits.length} ${labels.distance}`}>
          <SplitsTable splits={splits} units={units} showGap />
          <Muted as="p"  style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
            Each split is the pace the terrain will produce while you hold the same effort. GAP
            stays fixed — that is the effort you asked for.
          </Muted>
        </Section>
      )}

      <Section title="If you raced this distance">
        <RaceEquivalents meters={meters} seconds={finish} units={units} />
      </Section>
    </>
  )
}

/**
 * How the route's terrain changes the pace, in words.
 *
 * Both directions matter: a net climb costs time, and a net descent gives some back. Saying
 * only the first — and calling everything else "flat" — is how a downhill route ends up
 * labelled flat while showing a pace a good deal faster than the effort that was asked for.
 */
function terrainDescription(factor: number, flatPace: number): string {
  if (!Number.isFinite(flatPace)) return ''
  const percent = Math.round(Math.abs(factor - 1) * 100)
  // A balanced loop climbs and descends in equal measure and comes out near zero. Saying
  // it is "level" would be wrong — saying the terrain nets out is what actually happened.
  if (percent < 1) return `${formatPace(flatPace)} effort, terrain nets out`
  return factor > 1
    ? `${formatPace(flatPace)} effort, +${percent}% for the climbing`
    : `${formatPace(flatPace)} effort, −${percent}% from the descent`
}

/**
 * The same fitness, expressed at the standard distances.
 *
 * Riegel's exponent is only trustworthy from about 1 500 m to the marathon, so the table
 * stops there rather than extrapolating into numbers that would flatter everyone.
 */
function RaceEquivalents({
  meters,
  seconds,
  units,
}: {
  meters: number
  seconds: number
  units: UnitSystem
}) {
  if (!Number.isFinite(seconds) || seconds <= 0 || meters < 1000) {
    return (
      <Empty as="p"  style={{ padding: '8px 0' }}>
        Draw a longer route to see race equivalents.
      </Empty>
    )
  }

  const labels = unitLabels(units)

  return (
    <Table>
      <thead>
        <tr>
          <th>Race</th>
          <th>Time</th>
          <th>Pace</th>
        </tr>
      </thead>
      <tbody>
        {RACES.map((race) => {
          const predicted = riegel(meters, seconds, race.meters)
          return (
            <tr key={race.name}>
              <td>
                {race.name}
                <Muted>
                  {' '}
                  · {formatDistance(race.meters, units, 1)} {labels.distance}
                </Muted>
              </td>
              <Num>{formatDuration(predicted)}</Num>
              <Muted as="td">
                {formatPace(predicted / toDistance(race.meters, units))}
                {labels.pace}
              </Muted>
            </tr>
          )
        })}
      </tbody>
    </Table>
  )
}
