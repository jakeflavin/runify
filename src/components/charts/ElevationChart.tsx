/**
 * The elevation profile — the one chart that appears on both sides of the app.
 *
 * It is drawn as a filled area against distance, which is how every mapping tool draws a
 * climb and therefore what a runner can read without a legend. Hovering reports the height
 * and the grade at that point, and pushes the position back up so the map can mark it: the
 * chart and the map are two views of the same run, and linking them is what turns "there is
 * a hill at 4 km" into "the hill is *there*".
 */

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { pointAt, type LatLng } from '@/lib/geo'
import {
  formatDistance,
  formatElevation,
  toDistance,
  toElevation,
  unitLabels,
  type UnitSystem,
  formatAxisDistance,
  formatNumber,
  formatPercent,
} from '@/lib/units'

export interface ElevationPoint {
  /** Metres from the start. */
  distance: number
  /** Metres above sea level. */
  elevation: number
  /** Rise over run, as a fraction. */
  gradient?: number
}

export function ElevationChart({
  points,
  path,
  units,
  height = 132,
  onHover,
}: {
  points: ElevationPoint[]
  /** The route, so a hovered distance can be turned back into a position. */
  path?: LatLng[]
  units: UnitSystem
  height?: number
  onHover?: (position: LatLng | null) => void
}) {
  const labels = unitLabels(units)

  const data = points.map((p) => ({
    x: toDistance(p.distance, units),
    y: toElevation(p.elevation, units),
    meters: p.distance,
    raw: p.elevation,
    gradient: p.gradient,
  }))

  return (
    <div
      className="chart"
      onMouseLeave={() => onHover?.(null)}
      style={{ height }}
      aria-label="Elevation profile"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 4, right: 4, bottom: 0, left: -8 }}
          onMouseMove={(state) => {
            if (!onHover || !path) return
            const point = data[Number(state?.activeIndex)]
            onHover(point ? pointAt(path, point.meters) : null)
          }}
        >
          <defs>
            <linearGradient id="elevation-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--s-elevation)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="var(--s-elevation)" stopOpacity={0.06} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="x"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatAxisDistance}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            width={44}
            tickFormatter={(value: number) => formatNumber(Math.round(value))}
            tickLine={false}
            axisLine={false}
            // Elevation almost never starts at sea level, and forcing zero flattens every
            // hill into a straight line at the top of the frame.
            domain={['dataMin - 5', 'dataMax + 5']}
            tickCount={4}
          />
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
                    <span className="k">Elevation</span>
                    <span className="v">
                      {formatElevation(point.raw, units)} {labels.elevation}
                    </span>
                  </div>
                  {point.gradient !== undefined && (
                    <div>
                      <span className="k">Grade</span>
                      <span className="v">{formatPercent(point.gradient)}</span>
                    </div>
                  )}
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="y"
            stroke="var(--s-elevation)"
            strokeWidth={1.5}
            fill="url(#elevation-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
