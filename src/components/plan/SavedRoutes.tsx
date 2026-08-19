import { Trash2 } from 'lucide-react'
import { Section } from '@/components/ui'
import type { SavedRoute } from '@/hooks/useSavedRoutes'
import { formatDistance, unitLabels, type UnitSystem } from '@/lib/units'

const when = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export function SavedRoutes({
  routes,
  units,
  onOpen,
  onRemove,
}: {
  routes: SavedRoute[]
  units: UnitSystem
  onOpen: (route: SavedRoute) => void
  onRemove: (id: string) => void
}) {
  if (routes.length === 0) return null
  const labels = unitLabels(units)

  return (
    <Section title={`Saved routes · ${routes.length}`}>
      <div className="list">
        {routes.map((route) => (
          <div key={route.id} className="list-item" style={{ cursor: 'default' }}>
            <button
              type="button"
              className="grow"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onClick={() => onOpen(route)}
            >
              <span className="name">{route.name}</span>
              <span className="meta" style={{ display: 'block' }}>
                {formatDistance(route.meters, units)} {labels.distance} · {when(route.savedAt)}
              </span>
            </button>
            <button
              type="button"
              className="btn ghost sm icon danger"
              aria-label={`Delete ${route.name}`}
              onClick={() => onRemove(route.id)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </Section>
  )
}
