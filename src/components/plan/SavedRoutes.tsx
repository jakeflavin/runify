import { useEffect, useRef, useState } from 'react'
import { Trash2, Undo2 } from 'lucide-react'
import { Button, Empty, Grow, ItemMeta, ItemName, List, ListItem, Muted } from '../ui.styled'
import { Section } from '@/components/ui'
import type { SavedRoute } from '@/hooks/useSavedRoutes'
import { formatDistance, unitLabels, type UnitSystem } from '@/lib/units'

const when = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

/** How long a deleted route stays undoable before the removal is committed. */
const UNDO_MS = 5000

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
  /*
   * Deleting is the only destructive act in the app against persisted data, so it gets a
   * grace period instead of a confirm dialog: the row flips to "Deleted · Undo" and the
   * actual removal commits five seconds later. A dialog would interrogate every delete;
   * this punishes none and rescues the mistaken one.
   */
  const [pending, setPending] = useState<Set<string>>(() => new Set())
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  // Commit anything still pending if the panel goes away (switching to Analyse).
  useEffect(() => {
    const held = timers.current
    return () => {
      for (const [id, timer] of held) {
        clearTimeout(timer)
        onRemove(id)
      }
      held.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const beginDelete = (id: string) => {
    setPending((current) => new Set(current).add(id))
    timers.current.set(
      id,
      setTimeout(() => {
        timers.current.delete(id)
        setPending((current) => {
          const next = new Set(current)
          next.delete(id)
          return next
        })
        onRemove(id)
      }, UNDO_MS),
    )
  }

  const undoDelete = (id: string) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setPending((current) => {
      const next = new Set(current)
      next.delete(id)
      return next
    })
  }

  const labels = unitLabels(units)

  return (
    <Section title={`Saved routes · ${routes.length}`}>
      {routes.length === 0 ? (
        <Empty as="p"  style={{ padding: '8px 0' }}>
          Routes you save are kept here, on this device.
        </Empty>
      ) : (
        <List>
          {routes.map((route) =>
            pending.has(route.id) ? (
              <ListItem as="div" key={route.id}  style={{ cursor: 'default' }}>
                <Grow as="span">
                  <Muted>Deleted “{route.name}”.</Muted>
                </Grow>
                <Button $small type="button"  onClick={() => undoDelete(route.id)}>
                  <Undo2 size={14} /> Undo
                </Button>
              </ListItem>
            ) : (
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
                  onClick={() => beginDelete(route.id)}>
                  <Trash2 size={14} />
                </Button>
              </ListItem>
            ),
          )}
        </List>
      )}
    </Section>
  )
}
