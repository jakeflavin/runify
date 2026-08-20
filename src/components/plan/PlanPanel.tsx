/**
 * The planning rail: what you have drawn, what it will cost you, and where to put it.
 */

import { Suspense, lazy, useState } from 'react'
import { Button, Chip, Empty, Input, Row, Spinner, StatRow } from '../ui.styled'
import {
  Bike,
  Download,
  Footprints,
  Loader2,
  Redo2,
  Repeat,
  RotateCcw,
  Save,
  Trash2,
  Undo2,
} from 'lucide-react'
import { Section, Segmented, Stat, Switch } from '@/components/ui'
import { PacePlanner } from './PacePlanner'
import { SavedRoutes } from './SavedRoutes'
// Recharts is a third of the bundle and nothing on the first screen needs it — the chart
// only appears once a route has been drawn.
const ElevationChart = lazy(() =>
  import('@/components/charts/ElevationChart').then((m) => ({ default: m.ElevationChart })),
)
import type { useRoute } from '@/hooks/useRoute'
import type { RouteProfile } from '@/hooks/useElevationProfile'
import type { SavedRoute } from '@/hooks/useSavedRoutes'
import type { Costing } from '@/api/valhalla'
import type { LatLng } from '@/lib/geo'
import { formatDistance, formatElevation, unitLabels, type UnitSystem } from '@/lib/units'

export function PlanPanel({
  route,
  profile,
  profileLoading,
  units,
  snap,
  setSnap,
  costing,
  setCosting,
  savedRoutes,
  onSave,
  onOpenSaved,
  onRemoveSaved,
  onExport,
  onHoverPoint,
}: {
  route: ReturnType<typeof useRoute>
  profile: RouteProfile | null | undefined
  profileLoading: boolean
  units: UnitSystem
  snap: boolean
  setSnap: (value: boolean) => void
  costing: Costing
  setCosting: (value: Costing) => void
  savedRoutes: SavedRoute[]
  onSave: (name: string) => void
  onOpenSaved: (route: SavedRoute) => void
  onRemoveSaved: (id: string) => void
  onExport: () => void
  onHoverPoint: (point: LatLng | null) => void
}) {
  const [name, setName] = useState('')
  const labels = unitLabels(units)
  const empty = route.waypoints.length === 0

  return (
    <>
      <Section
        title="Draw"
        action={
          <Segmented<Costing>
            label="Route along"
            value={costing}
            onChange={setCosting}
            options={[
              { value: 'pedestrian', label: 'Run', icon: <Footprints size={13} /> },
              { value: 'bicycle', label: 'Bike', icon: <Bike size={13} /> },
            ]}
          />
        }
      >
        <Row  style={{ marginBottom: 12 }}>
          <Switch checked={snap} onChange={setSnap}>
            Follow roads and paths
          </Switch>
          {route.routing && (
            <Chip>
              <Spinner as={Loader2} size={11} aria-hidden="true" /> Routing
            </Chip>
          )}
          {!route.routing && route.waypoints.length > 1 && snap && !route.fullySnapped && (
            <Chip
              
              title="The routing service could not snap every leg; those are straight lines.">
              Partly straight
            </Chip>
          )}
        </Row>

        <Row>
          <Button $small type="button"  onClick={route.undo} disabled={!route.canUndo}>
            <Undo2 size={14} /> Undo
          </Button>
          <Button $small
            type="button"
            
            onClick={route.closeLoop}
            disabled={route.waypoints.length < 2}
            title="Add a leg back to the start">
            <Repeat size={14} /> Loop
          </Button>
          <Button $small
            type="button"
            
            onClick={route.outAndBack}
            disabled={route.waypoints.length < 2}
            title="Retrace the route back to the start">
            <Redo2 size={14} /> Out &amp; back
          </Button>
          <Button $small
            type="button"
            
            onClick={route.reverse}
            disabled={route.waypoints.length < 2}>
            <RotateCcw size={14} /> Reverse
          </Button>
          <Button $small $danger type="button"  onClick={route.clear} disabled={empty}>
            <Trash2 size={14} /> Clear
          </Button>
        </Row>

        {empty && (
          <Empty as="p"  style={{ paddingBottom: 0 }}>
            Click the map to drop your start, then keep clicking to build the route.
            <br />
            Drag any pin to move it; click a pin to remove it.
          </Empty>
        )}
      </Section>

      {!empty && (
        <Section title="The route">
          <StatRow>
            <Stat
              label="Distance"
              value={formatDistance(route.meters, units)}
              unit={labels.distance}
              size="lg"
            />
            <Stat
              label="Climb"
              value={profile ? formatElevation(profile.gain, units) : profileLoading ? '…' : '—'}
              unit={profile ? labels.elevation : undefined}
              sub={profile ? `−${formatElevation(profile.loss, units)} down` : undefined}
            />
            <Stat label="Waypoints" value={route.waypoints.length} />
          </StatRow>

          {/* A route with no length has no profile to draw — every sample sits at the same
              place, and the chart would render a flat line across a zero-wide axis. */}
          {profile && route.meters > 0 && profile.distances.length > 1 && (
            <div style={{ marginTop: 14 }}>
              <Suspense fallback={<div style={{ height: 132 }} />}>
                <ElevationChart
                  points={profile.distances.flatMap((distance, i) => {
                    const elevation = profile.series[i]
                    return elevation === undefined ? [] : [{ distance, elevation }]
                  })}
                  path={route.path}
                  units={units}
                  onHover={onHoverPoint}
                />
              </Suspense>
            </div>
          )}
        </Section>
      )}

      {!empty && <PacePlanner meters={route.meters} profile={profile} units={units} />}

      {!empty && (
        <Section title="Keep it">
          <Row>
            <Input
              
              style={{ flex: 1, minWidth: 140 }}
              placeholder="Name this route"
              value={name}
              aria-label="Route name"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onSave(name)
                  setName('')
                }
              }}/>
            <Button $primary
              type="button"
              
              onClick={() => {
                onSave(name)
                setName('')
              }}>
              <Save size={14} /> Save
            </Button>
            <Button type="button"  onClick={onExport} title="Download as GPX">
              <Download size={14} /> GPX
            </Button>
          </Row>
        </Section>
      )}

      <SavedRoutes
        routes={savedRoutes}
        units={units}
        onOpen={onOpenSaved}
        onRemove={onRemoveSaved}
      />
    </>
  )
}
