/**
 * The drawing surface.
 *
 * Leaflet is driven imperatively rather than through a React wrapper, matching how the map
 * is handled elsewhere in this workspace. The reason here is dragging: a waypoint drag fires
 * dozens of times a second, and reconciling a marker tree through React on every frame makes
 * the pin lag the cursor. Instead each concern below owns one effect and one layer group,
 * and React only ever hands this component data.
 *
 * The basemap is CARTO's keyless pair, chosen so the light and dark variants are the same
 * cartography rather than two different maps — and both are deliberately low-contrast, so
 * an orange route reads as the only saturated thing on screen.
 */

import { useEffect, useRef } from 'react'
import { MapSurface } from './RouteMap.styled'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LatLng } from '@/lib/geo'
import type { Waypoint } from '@/hooks/useRoute'
import { useResolvedTheme } from '@/hooks/useResolvedTheme'

const BASEMAP = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
}

const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a> · routing <a href="https://valhalla.readthedocs.io/">Valhalla</a>'

/** Roughly the middle of the contiguous United States, at a zoom that shows the country. */
const FALLBACK_VIEW: [number, number] = [39.83, -98.58]
const FALLBACK_ZOOM = 4
const LOCATED_ZOOM = 15

const toLatLng = (p: LatLng): [number, number] => [p.lat, p.lon]

/** Where the map should point. A new `nonce` re-applies the same target. */
export interface MapFocus {
  center?: LatLng
  bounds?: [[number, number], [number, number]]
  zoom?: number
  nonce: number
}

export interface RouteMapProps {
  /** The line to draw, already resolved to a continuous path. */
  path: LatLng[]
  /** Draggable pins. Omit for a read-only track. */
  waypoints?: Waypoint[]
  /** One colour per point of `path`; contiguous runs are drawn as separate segments. */
  colors?: string[]
  /** Markers at fixed distances along the path — the mile posts. */
  markers?: { at: LatLng; label: string }[]
  /** A single highlighted position, driven by hovering a chart. */
  cursor?: LatLng | null
  focus?: MapFocus
  onClick?: (point: LatLng) => void
  onWaypointDrag?: (id: string, point: LatLng) => void
  onWaypointClick?: (id: string) => void
}

export function RouteMap({
  path,
  waypoints,
  colors,
  markers,
  cursor,
  focus,
  onClick,
  onWaypointDrag,
  onWaypointClick,
}: RouteMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const tiles = useRef<L.TileLayer | null>(null)
  const theme = useResolvedTheme()

  // One layer group per concern, so each effect can clear only what it owns.
  const lineLayer = useRef<L.LayerGroup | null>(null)
  const pinLayer = useRef<L.LayerGroup | null>(null)
  const markerLayer = useRef<L.LayerGroup | null>(null)
  const cursorMarker = useRef<L.CircleMarker | null>(null)

  // Handlers are read through a ref so the map is created once and never torn down when a
  // parent re-renders with a new closure.
  const handlers = useRef({ onClick, onWaypointDrag, onWaypointClick })
  handlers.current = { onClick, onWaypointDrag, onWaypointClick }

  // ── Create the map, once ────────────────────────────────────────────────
  useEffect(() => {
    if (!container.current || map.current) return

    const instance = L.map(container.current, {
      center: FALLBACK_VIEW,
      zoom: FALLBACK_ZOOM,
      zoomControl: false,
      attributionControl: true,
      // The default 250 ms of inertia after a pan makes dropping a pin feel imprecise.
      inertia: false,
    })

    L.control.zoom({ position: 'bottomright' }).addTo(instance)

    instance.on('click', (event: L.LeafletMouseEvent) => {
      handlers.current.onClick?.({ lat: event.latlng.lat, lon: event.latlng.lng })
    })

    lineLayer.current = L.layerGroup().addTo(instance)
    markerLayer.current = L.layerGroup().addTo(instance)
    pinLayer.current = L.layerGroup().addTo(instance)
    map.current = instance

    // Start on the runner's own doorstep when they allow it; the view stays put otherwise.
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        if (!map.current) return
        map.current.setView([position.coords.latitude, position.coords.longitude], LOCATED_ZOOM)
      },
      () => {},
      { timeout: 8000, maximumAge: 300000 },
    )

    // Leaflet caches the container size at construction. In a flex/grid layout that size is
    // not final on the first frame, and the map ends up rendering tiles for a box the wrong
    // shape until something happens to nudge it. Watching the element covers every case —
    // first layout, window resize, and the rail collapsing at the mobile breakpoint.
    // `animate: false` matters: the default kicks off a pan animation, and a fitBounds that
    // lands mid-animation leaves the SVG renderer's clip bounds stale — the route is then
    // present in the DOM but clipped away to nothing.
    const refreshSize = () => instance.invalidateSize({ animate: false, pan: false })
    const resize = new ResizeObserver(refreshSize)
    resize.observe(container.current)

    // A map built while its tab is in the background caches a zero size, and a browser that
    // skips layout for hidden documents may never fire a resize to correct it. Every click
    // would then project through a stale origin and land nowhere near the cursor, so the
    // size is refreshed whenever the document comes back to the front.
    document.addEventListener('visibilitychange', refreshSize)

    return () => {
      resize.disconnect()
      document.removeEventListener('visibilitychange', refreshSize)
      instance.remove()
      map.current = null
    }
  }, [])

  // ── Basemap, swapped with the theme ─────────────────────────────────────
  useEffect(() => {
    if (!map.current) return
    tiles.current?.remove()
    tiles.current = L.tileLayer(BASEMAP[theme], {
      attribution: ATTRIBUTION,
      maxZoom: 20,
      detectRetina: true,
    }).addTo(map.current)
    // Keep the basemap under every route layer regardless of when it was added.
    tiles.current.setZIndex(0)
  }, [theme])

  // ── The route line ──────────────────────────────────────────────────────
  useEffect(() => {
    const group = lineLayer.current
    if (!group) return
    group.clearLayers()
    if (path.length < 2) return

    const latlngs = path.map(toLatLng)

    // A dark casing under the line, so the route stays legible over pale streets and parks.
    L.polyline(latlngs, {
      color: theme === 'dark' ? '#000' : '#fff',
      weight: 8,
      opacity: 0.5,
      lineJoin: 'round',
      lineCap: 'round',
      interactive: false,
    }).addTo(group)

    if (colors && colors.length === path.length) {
      // Split into runs of equal colour, repeating the boundary point so there is no gap.
      let start = 0
      for (let i = 1; i <= path.length; i++) {
        if (i === path.length || colors[i] !== colors[start]) {
          L.polyline(latlngs.slice(start, Math.min(i + 1, path.length)), {
            color: colors[start],
            weight: 5,
            lineJoin: 'round',
            lineCap: 'round',
            interactive: false,
          }).addTo(group)
          start = i
        }
      }
    } else {
      L.polyline(latlngs, {
        color: '#fc5200',
        weight: 5,
        lineJoin: 'round',
        lineCap: 'round',
        interactive: false,
      }).addTo(group)
    }
  }, [path, colors, theme])

  // ── Waypoint pins ───────────────────────────────────────────────────────
  useEffect(() => {
    const group = pinLayer.current
    if (!group) return
    group.clearLayers()
    if (!waypoints?.length) return

    waypoints.forEach((waypoint, index) => {
      const role = index === 0 ? 'start' : index === waypoints.length - 1 ? 'end' : ''
      const marker = L.marker(toLatLng(waypoint), {
        draggable: Boolean(handlers.current.onWaypointDrag),
        icon: L.divIcon({
          className: '',
          html: `<div class="wp ${role}"></div>`,
          iconSize: role ? [16, 16] : [12, 12],
          iconAnchor: role ? [8, 8] : [6, 6],
        }),
        // Keep pins above the line but let the map still receive clicks around them.
        zIndexOffset: 400,
        title: index === 0 ? 'Start' : `Waypoint ${index + 1}`,
      })

      marker.on('drag', (event) => {
        const { lat, lng } = (event.target as L.Marker).getLatLng()
        handlers.current.onWaypointDrag?.(waypoint.id, { lat, lon: lng })
      })

      marker.on('click', (event) => {
        L.DomEvent.stopPropagation(event)
        handlers.current.onWaypointClick?.(waypoint.id)
      })

      marker.addTo(group)
    })
  }, [waypoints])

  // ── Distance markers ────────────────────────────────────────────────────
  useEffect(() => {
    const group = markerLayer.current
    if (!group) return
    group.clearLayers()
    if (!markers?.length) return

    for (const marker of markers) {
      L.circleMarker(toLatLng(marker.at), {
        radius: 4,
        color: theme === 'dark' ? '#0f0f11' : '#ffffff',
        weight: 2,
        fillColor: theme === 'dark' ? '#f2f2f5' : '#1c1c1e',
        fillOpacity: 1,
        interactive: false,
      })
        .addTo(group)
        .bindTooltip(marker.label, { permanent: false, direction: 'top' })
    }
  }, [markers, theme])

  // ── Chart cursor ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current) return
    if (!cursor) {
      cursorMarker.current?.remove()
      cursorMarker.current = null
      return
    }
    if (!cursorMarker.current) {
      cursorMarker.current = L.circleMarker(toLatLng(cursor), {
        radius: 7,
        color: '#ffffff',
        weight: 3,
        fillColor: '#fc5200',
        fillOpacity: 1,
        interactive: false,
      }).addTo(map.current)
    } else {
      cursorMarker.current.setLatLng(toLatLng(cursor))
    }
  }, [cursor])

  // ── Imperative focus ────────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current || !focus) return
    // A focus can arrive in the same commit that first sizes the container — dropping a file
    // does exactly that. Fitting to a stale size would frame the route against the wrong box,
    // so the size is refreshed first and the fit deferred a frame to let layout settle.
    const instance = map.current
    instance.invalidateSize({ animate: false, pan: false })

    const frame = requestAnimationFrame(() => {
      if (focus.bounds) {
        instance.fitBounds(focus.bounds, { padding: [48, 48], maxZoom: 16, animate: false })
      } else if (focus.center) {
        instance.setView(toLatLng(focus.center), focus.zoom ?? LOCATED_ZOOM, { animate: false })
      }
    })

    return () => cancelAnimationFrame(frame)
  }, [focus])

  return <MapSurface ref={container}  role="application" aria-label="Route map"/>
}
