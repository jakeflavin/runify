// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { ParseError, parseActivityFile, toGpx } from './gpx'

const GPX = `<?xml version="1.0"?>
<gpx version="1.1" creator="Garmin" xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <trk>
    <name>Morning Run</name>
    <trkseg>
      <trkpt lat="40.7128" lon="-74.0060">
        <ele>10.0</ele>
        <time>2026-04-01T12:00:00Z</time>
        <extensions><gpxtpx:TrackPointExtension>
          <gpxtpx:hr>140</gpxtpx:hr><gpxtpx:cad>85</gpxtpx:cad>
        </gpxtpx:TrackPointExtension></extensions>
      </trkpt>
      <trkpt lat="40.7138" lon="-74.0050">
        <ele>12.0</ele>
        <time>2026-04-01T12:00:30Z</time>
        <extensions><gpxtpx:TrackPointExtension>
          <gpxtpx:hr>150</gpxtpx:hr><gpxtpx:cad>88</gpxtpx:cad>
        </gpxtpx:TrackPointExtension></extensions>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`

const TCX = `<?xml version="1.0"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities><Activity Sport="Running"><Lap><Track>
    <Trackpoint>
      <Time>2026-04-01T12:00:00Z</Time>
      <Position><LatitudeDegrees>40.7128</LatitudeDegrees><LongitudeDegrees>-74.0060</LongitudeDegrees></Position>
      <AltitudeMeters>10.0</AltitudeMeters>
      <HeartRateBpm><Value>142</Value></HeartRateBpm>
    </Trackpoint>
    <Trackpoint>
      <Time>2026-04-01T12:00:30Z</Time>
      <Position><LatitudeDegrees>40.7138</LatitudeDegrees><LongitudeDegrees>-74.0050</LongitudeDegrees></Position>
      <AltitudeMeters>12.0</AltitudeMeters>
      <HeartRateBpm><Value>151</Value></HeartRateBpm>
    </Trackpoint>
  </Track></Lap></Activity></Activities>
</TrainingCenterDatabase>`

describe('GPX', () => {
  const activity = parseActivityFile(GPX, 'fallback')

  it('takes the track name over the filename', () => {
    expect(activity.name).toBe('Morning Run')
  })

  it('reads position, elevation and time', () => {
    expect(activity.points).toHaveLength(2)
    expect(activity.points[0]?.lat).toBeCloseTo(40.7128, 6)
    expect(activity.points[0]?.ele).toBe(10)
    expect(activity.points[0]?.time).toBe(Date.parse('2026-04-01T12:00:00Z'))
  })

  it('finds heart rate inside the Garmin extension namespace', () => {
    expect(activity.points[0]?.hr).toBe(140)
  })

  it('doubles a one-foot cadence to steps per minute', () => {
    expect(activity.points[0]?.cad).toBe(170)
  })
})

describe('TCX', () => {
  const activity = parseActivityFile(TCX, 'fallback')

  it('is recognised from the root element, not the filename', () => {
    expect(activity.points).toHaveLength(2)
  })

  it('names the activity from its sport', () => {
    expect(activity.name).toBe('Running activity')
  })

  it('reads heart rate out of the nested Value element', () => {
    expect(activity.points[0]?.hr).toBe(142)
  })
})

describe('rejections', () => {
  it('refuses a file that is not XML', () => {
    expect(() => parseActivityFile('not xml at all', 'x')).toThrow(ParseError)
  })

  it('refuses XML that is neither format', () => {
    expect(() => parseActivityFile('<html><body/></html>', 'x')).toThrow(ParseError)
  })

  it('refuses a track with nothing in it', () => {
    expect(() => parseActivityFile('<gpx><trk><trkseg/></trk></gpx>', 'x')).toThrow(ParseError)
  })
})

describe('toGpx', () => {
  it('writes a document that parses back to the same points', () => {
    const xml = toGpx('Test route', [
      { lat: 40.7128, lon: -74.006 },
      { lat: 40.7138, lon: -74.005 },
    ])
    const round = parseActivityFile(xml, 'x')
    expect(round.name).toBe('Test route')
    expect(round.points).toHaveLength(2)
    expect(round.points[1]?.lon).toBeCloseTo(-74.005, 6)
  })

  it('escapes a name that would otherwise break the document', () => {
    const xml = toGpx('Bill & Ben <fast>', [
      { lat: 1, lon: 1 },
      { lat: 2, lon: 2 },
    ])
    expect(xml).toContain('Bill &amp; Ben &lt;fast&gt;')
    expect(parseActivityFile(xml, 'x').name).toBe('Bill & Ben <fast>')
  })
})
