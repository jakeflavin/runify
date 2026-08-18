/**
 * The way a run gets into the app.
 *
 * Everything happens in the browser — the file is read with FileReader and never leaves the
 * machine — which is worth saying plainly on the control itself, because "upload your
 * training data" is a reasonable thing to hesitate over.
 */

import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'

export function FileDrop({
  onFile,
  error,
}: {
  onFile: (file: File) => void
  error?: string | null
}) {
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  return (
    <>
      <div
        className={`dropzone${over ? ' over' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            input.current?.click()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setOver(false)
          const file = event.dataTransfer.files[0]
          if (file) onFile(file)
        }}
      >
        <Upload size={22} aria-hidden="true" style={{ marginBottom: 8 }} />
        <strong>Drop a GPX or TCX file</strong>
        Export one from Strava, Garmin Connect, COROS or Apple Fitness.
        <br />
        It is read here in the browser and never uploaded anywhere.
      </div>

      <input
        ref={input}
        type="file"
        accept=".gpx,.tcx,application/gpx+xml,application/xml,text/xml"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFile(file)
          // Reset, so picking the same file twice in a row still fires a change.
          event.target.value = ''
        }}
      />

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 0 }} role="alert">
          {error}
        </p>
      )}
    </>
  )
}
