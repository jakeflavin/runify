/**
 * Pace and heart rate against distance, on one frame.
 *
 * Pace is inverted — the axis runs fast-at-the-top — because "the line went up" has to mean
 * "I sped up". Plotting seconds-per-mile the natural way round reads backwards to every
 * runner alive, and it is the single most common way this chart gets drawn wrong.
 *
 * Heart rate rides on its own right-hand axis when the file carries it, because the useful
 * thing is the *divergence*: pace flat while heart rate climbs is the shape of a hard day.
 */

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { pointAt, type LatLng } from '../../lib/geo'
import {
  formatDistance,
  formatPace,
  toDistance,
  unitLabels,
  type UnitSystem,
} from '../../lib/units'

export function PaceChart({
  distances,
  paces,
  heartRates,
  path,
  units,
  height = 160,
  onHover,
}: {
  /** Metres from the start, one per sample. */
  distances: number[]
  /** Seconds per unit, one per sample. Infinity where the runner was stopped. */
  paces: number[]
  heartRates?: (number | undefined)[]
  path?: LatLng[]
  units: UnitSystem
  height?: number
  onHover?: (position: LatLng | null) => void
}) {
  const labels = unitLabels(units)

  const running = paces.filter(Number.isFinite).sort((a, b) => a - b)
  if (running.length < 2) return null
  const median = running[Math.floor(running.length / 2)]

  /**
   * What counts as running at all.
   *
   * The stop itself is easy — it has no speed. The trouble is the samples on either side of
   * it: the speed window straddles the pause, so they come out at some pace that is neither
   * running nor stopped, and a handful of them is enough to flatten the whole chart. Twice
   * the median is not a pace this runner ran.
   */
  const ceiling = (median ?? 0) * 2

  // Rows are kept but their pace goes null outside that, so the line *breaks* at a stop
  // rather than drawing a spike down and back. A gap is what actually happened.
  const data = distances.map((distance, i) => ({
    x: toDistance(distance, units),
    meters: distance,
    pace:
      Number.isFinite(paces[i]) && (paces[i] ?? Infinity) <= ceiling ? (paces[i] ?? null) : null,
    hr: heartRates?.[i] ?? null,
  }))

  const kept = data.map((row) => row.pace).filter((pace): pace is number => pace !== null)
  if (kept.length < 2) return null

  const sorted = [...kept].sort((a, b) => a - b)
  const low = sorted[Math.floor(sorted.length * 0.02)]
  const high = sorted[Math.floor(sorted.length * 0.98)]
  const pad = Math.max(5, ((high ?? 0) - (low ?? 0)) * 0.15)
  const hasHr = data.some((row) => row.hr !== null)

  return (
    <div
      className="chart"
      onMouseLeave={() => onHover?.(null)}
      style={{ height }}
      aria-label="Pace"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 4, right: hasHr ? 0 : 4, bottom: 0, left: -4 }}
          onMouseMove={(state) => {
            if (!onHover || !path) return
            const point = data[Number(state?.activeIndex)]
            onHover(point ? pointAt(path, point.meters) : null)
          }}
        >
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="x"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value: number) => value.toFixed(value < 10 ? 1 : 0)}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            yAxisId="pace"
            width={46}
            // Reversed: faster is up.
            reversed
            domain={[Math.max(0, (low ?? 0) - pad), (high ?? 0) + pad]}
            tickFormatter={formatPace}
            tickLine={false}
            axisLine={false}
            tickCount={4}
          />
          {hasHr && (
            <YAxis
              yAxisId="hr"
              orientation="right"
              width={34}
              domain={['dataMin - 5', 'dataMax + 5']}
              tickLine={false}
              axisLine={false}
              tickCount={4}
            />
          )}
          <Tooltip
            cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const point = payload[0]?.payload as (typeof data)[number] | undefined
              if (!point) return null
              return (
                <div className="tooltip">
                  <div>
                    <span className="k">At</span>
                    <span className="v">
                      {formatDistance(point.meters, units)} {labels.distance}
                    </span>
                  </div>
                  <div>
                    <span className="k">Pace</span>
                    <span className="v">
                      {point.pace === null ? 'stopped' : `${formatPace(point.pace)}${labels.pace}`}
                    </span>
                  </div>
                  {point.hr !== null && (
                    <div>
                      <span className="k">Heart rate</span>
                      <span className="v">{Math.round(point.hr)} bpm</span>
                    </div>
                  )}
                </div>
              )
            }}
          />
          <Line
            yAxisId="pace"
            type="monotone"
            dataKey="pace"
            stroke="var(--s-pace)"
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
          {hasHr && (
            <Line
              yAxisId="hr"
              type="monotone"
              dataKey="hr"
              stroke="var(--s-hr)"
              strokeWidth={1.25}
              dot={false}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
