import { Trash2 } from 'lucide-react'
import { Button, Grow, ItemMeta, ItemName, List, ListItem } from '../ui.styled'
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
      <List>
        {routes.map((route) => (
          <ListItem as="div" key={route.id}  style={{ cursor: 'default' }}>
            <Grow as="button"
              type="button"
              
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onClick={() => onOpen(route)}>
              <ItemName as="span">{route.name}</ItemName>
              <ItemMeta as="span"  style={{ display: 'block' }}>
                {formatDistance(route.meters, units)} {labels.distance} · {when(route.savedAt)}
              </ItemMeta>
            </Grow>
            <Button $ghost $small $icon $danger
              type="button"
              
              aria-label={`Delete ${route.name}`}
              onClick={() => onRemove(route.id)}>
              <Trash2 size={14} />
            </Button>
          </ListItem>
        ))}
      </List>
    </Section>
  )
}
