import { useCallback, useMemo, useState } from 'react'
import { Activity as ActivityIcon, Moon, PenLine, Sun } from 'lucide-react'
import { RouteMap, type MapFocus } from './components/RouteMap'
import { Section, Segmented } from './components/ui'
import { PlanPanel } from './components/plan/PlanPanel'
import { PlaceSearch } from './components/plan/PlaceSearch'
import { FileDrop } from './components/analyze/FileDrop'
import { AnalyzePanel } from './components/analyze/AnalyzePanel'
import { useSettings, type Theme } from './hooks/useSettings'
import { useRoute } from './hooks/useRoute'
import { useElevationProfile } from './hooks/useElevationProfile'
import { useSavedRoutes, type SavedRoute } from './hooks/useSavedRoutes'
import { usePersistentState } from './hooks/usePersistentState'
import { analyse, type Activity } from './lib/analysis'
import { ParseError, download, parseActivityFile, toGpx } from './lib/gpx'
import { pointAt, type LatLng } from './lib/geo'
import { formatDistance, unitLabels, unitMeters, type UnitSystem } from './lib/units'
import type { Costing } from './api/valhalla'

type Mode = 'plan' | 'analyze'

export default function App() {
  const { units, setUnits, theme, setTheme, maxHr, setMaxHr } = useSettings()
  const [mode, setMode] = useState<Mode>('plan')
  const [cursor, setCursor] = useState<LatLng | null>(null)
  const [focus, setFocus] = useState<MapFocus | undefined>()

  // Both preferences outlive a session — a runner who plans on foot paths always does.
  const [snap, setSnap] = usePersistentState('runify:snap', true)
  const [costing, setCosting] = usePersistentState<Costing>('runify:costing', 'pedestrian')

  const route = useRoute(snap, costing)
  const { data: profile, isFetching: profileLoading } = useElevationProfile(route.path)
  const { routes: savedRoutes, save, remove } = useSavedRoutes()

  const [activity, setActivity] = useState<Activity | null>(null)
  const [parseFailure, setParseFailure] = useState<string | null>(null)
  const analysis = useMemo(() => (activity ? analyse(activity, units) : null), [activity, units])

  // The map shows whichever side is in front.
  const planning = mode === 'plan'
  const path = planning ? route.path : (activity?.points ?? [])

  const handleFile = useCallback(async (file: File) => {
    setParseFailure(null)
    try {
      const text = await file.text()
      const parsed = parseActivityFile(text, file.name.replace(/\.(gpx|tcx)$/i, ''))
      setActivity(parsed)
      setFocus({ bounds: boundsOf(parsed.points), nonce: Date.now() })
    } catch (error) {
      setParseFailure(error instanceof ParseError ? error.message : 'That file could not be read.')
      setActivity(null)
    }
  }, [])

  const openSaved = useCallback(
    (saved: SavedRoute) => {
      route.load(saved.points)
      setMode('plan')
      setFocus({ bounds: boundsOf(saved.points), nonce: Date.now() })
    },
    [route],
  )

  return (
    <div className="app">
      <header className="masthead">
        <div className="wordmark">
          <Mark />
          <span>Runify</span>
        </div>

        <Segmented<Mode>
          label="Mode"
          brand
          value={mode}
          onChange={setMode}
          options={[
            { value: 'plan', label: 'Plan', icon: <PenLine size={14} /> },
            { value: 'analyze', label: 'Analyse', icon: <ActivityIcon size={14} /> },
          ]}
        />

        <div className="masthead-spacer" />

        <Segmented<UnitSystem>
          label="Units"
          value={units}
          onChange={setUnits}
          options={[
            { value: 'imperial', label: 'mi' },
            { value: 'metric', label: 'km' },
          ]}
        />

        <button
          type="button"
          className="btn ghost icon"
          title={`Theme: ${theme}`}
          aria-label={`Theme: ${theme}. Change it.`}
          onClick={() =>
            setTheme((current: Theme) =>
              current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark',
            )
          }
        >
          {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </header>

      <div className="workspace">
        <div className="stage">
          <RouteMap
            path={path}
            waypoints={planning ? route.waypoints : undefined}
            colors={planning ? undefined : paceColors(analysis)}
            markers={useDistanceMarkers(path, units)}
            cursor={cursor}
            focus={focus}
            onClick={planning ? route.add : undefined}
            onWaypointDrag={planning ? route.move : undefined}
            onWaypointClick={planning ? route.remove : undefined}
          />

          {planning && (
            <div className="map-overlay top-left">
              <PlaceSearch
                onPick={(place) =>
                  setFocus({
                    bounds: place.bounds,
                    center: { lat: place.lat, lon: place.lon },
                    nonce: Date.now(),
                  })
                }
              />
            </div>
          )}

          {!planning && activity && (
            <div className="map-overlay top-left">
              <div className="hint">
                Colour is pace — brighter is faster. Hover a chart to follow the run.
              </div>
            </div>
          )}
        </div>

        <aside className="rail">
          {planning ? (
            <PlanPanel
              route={route}
              profile={profile}
              profileLoading={profileLoading}
              units={units}
              snap={snap}
              setSnap={setSnap}
              costing={costing}
              setCosting={setCosting}
              savedRoutes={savedRoutes}
              onSave={(name) => save(name, route.waypoints, route.meters)}
              onOpenSaved={openSaved}
              onRemoveSaved={remove}
              onExport={() =>
                download(
                  'runify-route.gpx',
                  toGpx(
                    `Runify route · ${formatDistance(route.meters, units)} ${unitLabels(units).distance}`,
                    route.path,
                  ),
                )
              }
              onHoverPoint={setCursor}
            />
          ) : activity && analysis ? (
            <AnalyzePanel
              activity={activity}
              analysis={analysis}
              units={units}
              maxHr={maxHr}
              setMaxHr={setMaxHr}
              onReplace={() => setActivity(null)}
              onHoverPoint={setCursor}
            />
          ) : (
            <Section title="Analyse a run">
              <FileDrop onFile={handleFile} error={parseFailure} />
            </Section>
          )}
        </aside>
      </div>
    </div>
  )
}

/** Bounding box in the order Leaflet wants: [[south, west], [north, east]]. */
function boundsOf(points: LatLng[]): [[number, number], [number, number]] | undefined {
  if (points.length === 0) return undefined
  const lats = points.map((p) => p.lat)
  const lons = points.map((p) => p.lon)
  return [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ]
}

/** A dot on the map at every whole mile or kilometre. */
function useDistanceMarkers(path: LatLng[], units: UnitSystem) {
  return useMemo(() => {
    const per = unitMeters(units)
    const markers: { at: LatLng; label: string }[] = []
    // Cheap guard: a very long path would otherwise place hundreds of dots.
    for (let n = 1; n <= 200; n++) {
      const at = pointAt(path, n * per)
      if (!at) break
      markers.push({ at, label: `${n} ${unitLabels(units).distance}` })
    }
    return markers
  }, [path, units])
}

/**
 * Colour the recorded track by pace.
 *
 * Five bands, cut at percentiles of the runner's own pace rather than at absolute values —
 * the useful comparison is against the rest of *this* run, and a fixed scale would paint an
 * easy run uniformly slow and a hard one uniformly fast.
 */
function paceColors(analysis: ReturnType<typeof analyse> | null): string[] | undefined {
  if (!analysis?.hasTime) return undefined

  const paces = analysis.series.pace
  const finite = paces.filter(Number.isFinite).sort((a, b) => a - b)
  if (finite.length < 10) return undefined

  const at = (fraction: number) => finite[Math.floor(finite.length * fraction)]
  const cuts = [at(0.2), at(0.4), at(0.6), at(0.8)]
  const ramp = ['#ffb300', '#fc7a00', '#fc5200', '#c93f00', '#8a2c00']

  return paces.map((pace): string => {
    if (!Number.isFinite(pace)) return '#9aa4ad' // stopped
    // Lower pace is faster, so the first band is the brightest.
    for (let i = 0; i < cuts.length; i++)
      if (pace <= (cuts[i] ?? Infinity)) return ramp[i] ?? '#8a2c00'
    return ramp[4] ?? '#8a2c00'
  })
}

/** The mark: a running figure reduced to a stride, drawn as one stroke. */
function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="15.5" cy="4.5" r="2.5" fill="currentColor" />
      <path
        d="M6 21l3.5-5.5L7 12l1.5-4.5L13 6l4 2.5 3 1"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 15.5L14 17l1.5 4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
