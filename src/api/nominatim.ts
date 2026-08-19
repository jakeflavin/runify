/**
 * Place search, against OSM's own geocoder.
 *
 * Nominatim's usage policy asks for at most one request a second and an identifying
 * User-Agent. A browser will not let us set that header, so the identification is the
 * Referer the browser sends on its own; the rate limit is respected by debouncing in the
 * component and by React Query holding results long enough that retyping a query does not
 * re-ask.
 */

const HOST = 'https://nominatim.openstreetmap.org'

export interface Place {
  id: number
  name: string
  detail: string
  lat: number
  lon: number
  /** [[south, west], [north, east]], when the result covers an area. */
  bounds?: [[number, number], [number, number]]
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const trimmed = query.trim()
  if (trimmed.length < 3) return []

  const params = new URLSearchParams({
    q: trimmed,
    format: 'jsonv2',
    limit: '6',
    addressdetails: '0',
  })
  const response = await fetch(`${HOST}/search?${params}`, { signal })
  if (!response.ok) throw new Error('Search is unavailable right now.')

  const data = (await response.json()) as {
    place_id: number
    name?: string
    display_name: string
    lat: string
    lon: string
    boundingbox?: [string, string, string, string]
  }[]

  return data.map((row) => {
    // display_name is "Name, District, City, …" — the head is the label, the tail the context.
    const parts = row.display_name.split(',').map((s) => s.trim())
    const box = row.boundingbox?.map(Number)

    return {
      id: row.place_id,
      name: row.name || parts[0] || row.display_name,
      detail: parts.slice(1).join(', '),
      lat: Number(row.lat),
      lon: Number(row.lon),
      bounds:
        box && box.length === 4 && box.every(Number.isFinite)
          ? ([
              [box[0] ?? 0, box[2] ?? 0],
              [box[1] ?? 0, box[3] ?? 0],
            ] as [[number, number], [number, number]])
          : undefined,
    }
  })
}
