/**
 * PNG encoding for the app icon scripts.
 *
 * Home-screen icons have to be PNG — iOS ignores an SVG apple-touch-icon — so every app
 * generates and commits its own. What differs between apps is the drawing; what does not
 * is this, which was copied into six repos and spelled five different ways.
 *
 * The canonical copy lives in the portfolio's `templates/`, beside release.yml, and is
 * installed into each repo rather than depended on across them: an app has to build on
 * its own, with no knowledge of the directory that publishes it.
 *
 * Truecolour, 8 bits, no alpha — an icon is opaque, and leaving alpha out keeps the
 * encoder to one filter mode and the files small.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

export const lerp = (a, b, t) => a + (b - a) * t
export const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n)

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/**
 * `pixels` is one `[r, g, b]` per pixel, row-major — the shape every render already
 * produces. Each scanline carries a leading filter byte; 0 means "store as is".
 */
export function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // truecolour, no alpha

  const raw = Buffer.alloc(size * (size * 3 + 1))
  let at = 0
  for (let y = 0; y < size; y++) {
    raw[at++] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixels[y * size + x]
      raw[at++] = r
      raw[at++] = g
      raw[at++] = b
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Writes `icon-<size>.png` into `outDir` for each size, drawn by `render(size)`. */
export function writeIcons(outDir, sizes, render) {
  for (const size of sizes) {
    writeFileSync(new URL(`icon-${size}.png`, outDir), encodePng(size, render(size)))
  }
  return sizes
}
