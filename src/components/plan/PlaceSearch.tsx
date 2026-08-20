/**
 * Jump the map somewhere by name.
 *
 * Nominatim asks callers to keep to about a request a second, so the query is debounced and
 * only fires from three characters up; React Query then holds each result long enough that
 * backspacing and retyping costs nothing.
 */

import { useEffect, useRef, useState } from 'react'
import { Button, Floating, Grow, Input, ItemMeta, ItemName, List, ListItem, Muted, Panel, Spinner } from '../ui.styled'
import { useQuery } from '@tanstack/react-query'
import { Loader2, MapPin, Search, X } from 'lucide-react'
import { searchPlaces, type Place } from '@/api/nominatim'

const DEBOUNCE_MS = 400

export function PlaceSearch({ onPick }: { onPick: (place: Place) => void }) {
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setQuery(text), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [text])

  // Dismiss on an outside click, so the list does not sit over the map after a pick.
  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const { data, isFetching } = useQuery({
    queryKey: ['places', query],
    queryFn: ({ signal }) => searchPlaces(query, signal),
    enabled: query.trim().length >= 3,
    staleTime: 10 * 60 * 1000,
    retry: 0,
  })

  const results = data ?? []

  // Silence after a search reads as "still thinking" or "broken", never as "no such
  // place". Only a settled query gets the message — while typing or fetching, nothing.
  const nothingFound =
    open && !isFetching && data !== undefined && results.length === 0 && query.trim().length >= 3

  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 320 }}>
      <Floating  style={{ borderRadius: 8, padding: '0 8px' }}>
        <Muted as={Search} size={15} aria-hidden="true" />
        <Input
          
          style={{ border: 'none', background: 'transparent', height: 36 }}
          placeholder="Search for a place"
          value={text}
          aria-label="Search for a place"
          onChange={(event) => {
            setText(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false)
            if (event.key === 'Enter' && results[0]) {
              onPick(results[0])
              setOpen(false)
            }
          }}/>
        {isFetching ? (
          <Muted as={Spinner} forwardedAs={Loader2} size={14} aria-hidden="true" />
        ) : text ? (
          <Button $ghost $small $icon
            type="button"
            
            aria-label="Clear search"
            onClick={() => {
              setText('')
              setOpen(false)
            }}>
            <X size={14} />
          </Button>
        ) : null}
      </Floating>

      {nothingFound && (
        <Panel

          style={{
            position: 'absolute',
            top: 44,
            left: 0,
            right: 0,
            boxShadow: 'var(--shadow-float)',
            padding: '10px 14px',
          }}>
          <Muted style={{ fontSize: 13 }}>Nothing found for that — try a town or a street.</Muted>
        </Panel>
      )}

      {open && results.length > 0 && (
        <Panel
          
          style={{
            position: 'absolute',
            top: 44,
            left: 0,
            right: 0,
            boxShadow: 'var(--shadow-float)',
          }}>
          <List  style={{ padding: '4px 12px' }}>
            {results.map((place) => (
              <ListItem
                key={place.id}
                type="button"
                
                onClick={() => {
                  onPick(place)
                  setOpen(false)
                  setText(place.name)
                }}>
                <Muted as={MapPin} size={14} aria-hidden="true" />
                <Grow as="span">
                  <ItemName as="span">{place.name}</ItemName>
                  <ItemMeta as="span"  style={{ display: 'block' }}>
                    {place.detail}
                  </ItemMeta>
                </Grow>
              </ListItem>
            ))}
          </List>
        </Panel>
      )}
    </div>
  )
}
