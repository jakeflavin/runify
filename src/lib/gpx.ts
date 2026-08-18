/**
 * Reading and writing the two file formats a runner can actually get out of their watch.
 *
 * Both are XML, so the browser's own DOMParser does the work and there is no dependency
 * here. The awkward part is not the parsing, it is that the interesting fields — heart rate
 * and cadence — live in vendor extension namespaces that differ between Garmin, Strava,
 * Apple and everyone else. `extensionValue` below walks the subtree by local name and
 * ignores namespaces entirely, which is the only approach that survives contact with real
 * files.
 */

import type { TrackPoint } from './geo'
import type { Activity } from './analysis'

export class ParseError extends Error {}

/** Every element under `node` whose local name matches, namespace ignored. */
function byName(node: Element | Document, name: string): Element[] {
  const lower = name.toLowerCase()
  return Array.from(node.getElementsByTagName('*')).filter(
    (el) => el.localName.toLowerCase() === lower,
  )
}

/** Text of the first descendant with this local name, or undefined. */
function text(node: Element, name: string): string | undefined {
  const lower = name.toLowerCase()
  for (const el of Array.from(node.getElementsByTagName('*'))) {
    if (el.localName.toLowerCase() === lower) return el.textContent?.trim() || undefined
  }
  return undefined
}

const number = (value: string | undefined): number | undefined => {
  if (value === undefined) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Pull a value out of whatever extension namespace happens to carry it.
 *
 * Tries each candidate local name in order, so callers can list the vendor spellings they
 * know about ('hr', 'heartratebpm') and get the first that is present.
 */
function extensionValue(point: Element, names: string[]): number | undefined {
  const wanted = new Set(names.map((n) => n.toLowerCase()))
  for (const el of Array.from(point.getElementsByTagName('*'))) {
    if (wanted.has(el.localName.toLowerCase())) {
      const value = number(el.textContent?.trim())
      if (value !== undefined) return value
    }
  }
  return undefined
}

const parseTime = (value: string | undefined): number | undefined => {
  if (!value) return undefined
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? undefined : ms
}

/** Parse a GPX or TCX document. The format is chosen by the root element, not the filename. */
export function parseActivityFile(xml: string, fallbackName: string): Activity {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) throw new ParseError('That file is not valid XML.')

  const root = doc.documentElement?.localName?.toLowerCase()
  const activity =
    root === 'gpx' ? parseGpx(doc, fallbackName) : root === 'trainingcenterdatabase' ? parseTcx(doc, fallbackName) : null

  if (!activity) throw new ParseError('Expected a GPX or TCX file.')
  if (activity.points.length < 2) throw new ParseError('That file has no track points in it.')
  return activity
}

function parseGpx(doc: Document, fallbackName: string): Activity {
  const points: TrackPoint[] = []

  for (const trkpt of byName(doc, 'trkpt')) {
    const lat = number(trkpt.getAttribute('lat') ?? undefined)
    const lon = number(trkpt.getAttribute('lon') ?? undefined)
    if (lat === undefined || lon === undefined) continue

    points.push({
      lat,
      lon,
      ele: number(text(trkpt, 'ele')),
      time: parseTime(text(trkpt, 'time')),
      hr: extensionValue(trkpt, ['hr', 'heartrate', 'heartratebpm']),
      // Garmin's `cad` is one foot; runners and Strava both mean both feet.
      cad: doubleCadence(extensionValue(trkpt, ['cad', 'cadence', 'runcadence'])),
    })
  }

  // The track name, then the file's metadata name, then whatever the file was called.
  const name =
    byName(doc, 'trk').map((trk) => text(trk, 'name')).find(Boolean) ??
    byName(doc, 'metadata').map((meta) => text(meta, 'name')).find(Boolean) ??
    fallbackName

  return { name, startTime: points.find((p) => p.time)?.time, points }
}

function parseTcx(doc: Document, fallbackName: string): Activity {
  const points: TrackPoint[] = []

  for (const tp of byName(doc, 'Trackpoint')) {
    const position = byName(tp, 'Position')[0]
    if (!position) continue
    const lat = number(text(position, 'LatitudeDegrees'))
    const lon = number(text(position, 'LongitudeDegrees'))
    if (lat === undefined || lon === undefined) continue

    points.push({
      lat,
      lon,
      ele: number(text(tp, 'AltitudeMeters')),
      time: parseTime(text(tp, 'Time')),
      // HeartRateBpm wraps its number in a <Value>, so read the descendant not the element.
      hr: number(text(tp, 'Value')) ?? extensionValue(tp, ['heartratebpm']),
      cad: doubleCadence(extensionValue(tp, ['cadence', 'runcadence'])),
    })
  }

  const sport = byName(doc, 'Activity')[0]?.getAttribute('Sport')
  return {
    name: sport ? `${sport[0] + sport.slice(1).toLowerCase()} activity` : fallbackName,
    startTime: points.find((p) => p.time)?.time,
    points,
  }
}

/**
 * Normalise cadence to both feet.
 *
 * Devices log either steps per minute (~160–190 running) or revolutions per minute of one
 * foot (~80–95). Anything under 120 is taken to be the latter and doubled — a real running
 * cadence below 120 spm is a walk, and a walk logged at 60 doubles to a sensible 120.
 */
function doubleCadence(value: number | undefined): number | undefined {
  if (value === undefined || value <= 0) return undefined
  return value < 120 ? value * 2 : value
}

/** Serialise a planned route as a GPX track, so it can go onto a watch. */
export function toGpx(name: string, points: { lat: number; lon: number; ele?: number }[]): string {
  const escape = (value: string) =>
    value.replace(/[<>&'"]/g, (c) => `&${{ '<': 'lt', '>': 'gt', '&': 'amp', "'": 'apos', '"': 'quot' }[c]};`)

  const body = points
    .map((p) => {
      const ele = p.ele === undefined ? '' : `<ele>${p.ele.toFixed(1)}</ele>`
      return `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}">${ele}</trkpt>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Runify" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escape(name)}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${escape(name)}</name>
    <trkseg>
${body}
    </trkseg>
  </trk>
</gpx>
`
}

/** Hand a string to the browser as a download. */
export function download(filename: string, contents: string, type = 'application/gpx+xml') {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
