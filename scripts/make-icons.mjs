/**
 * Writes the home-screen icons as PNGs.
 *
 * iOS ignores an SVG apple-touch-icon, so the PNGs have to exist as files. They are
 * generated here and committed rather than built, which keeps an image library out of the
 * dependency list for three small assets. Run `npm run icons` after changing the mark in
 * `public/favicon.svg`, and keep the two in step by hand — the mark is a stroked stride
 * over a rounded orange tile.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const OUT = new URL('../public/', import.meta.url)

const BRAND = [252, 82, 0]
const INK = [255, 255, 255]

/** The mark, in fractions of the canvas: a polyline and a head, both drawn as strokes. */
const STROKE = 0.094
const HEAD = { x: 0.641, y: 0.203, r: 0.102 }
const LINES = [
  [0.25, 0.813, 0.391, 0.594],
  [0.391, 0.594, 0.281, 0.453],
  [0.281, 0.453, 0.344, 0.266],
  [0.344, 0.266, 0.531, 0.203],
  [0.531, 0.203, 0.688, 0.313],
  [0.688, 0.313, 0.813, 0.359],
  [0.391, 0.594, 0.578, 0.656],
  [0.578, 0.656, 0.641, 0.813],
]

/** Distance from (u, v) to a segment, so a stroked line can be drawn by thresholding it. */
function toSegment(u, v, [x1, y1, x2, y2]) {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  let t = lenSq === 0 ? 0 : ((u - x1) * dx + (v - y1) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(u - (x1 + dx * t), v - (y1 + dy * t))
}

/** The tile's rounded-rectangle mask, as a signed distance in canvas fractions. */
function insideTile(u, v, radius = 0.219) {
  const dx = Math.abs(u - 0.5) - (0.5 - radius)
  const dy = Math.abs(v - 0.5) - (0.5 - radius)
  if (dx <= 0 || dy <= 0) return true
  return Math.hypot(dx, dy) <= radius
}

function render(size) {
  // Raw RGB rows, each prefixed with a zero filter byte — the simplest valid PNG scanline.
  const stride = size * 3 + 1
  const raw = Buffer.alloc(stride * size)

  for (let y = 0; y < size; y++) {
    const row = y * stride
    raw[row] = 0
    const v = (y + 0.5) / size

    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size
      let rgb = [255, 255, 255]

      if (insideTile(u, v)) {
        rgb = BRAND
        const onStroke = LINES.some((line) => toSegment(u, v, line) <= STROKE / 2)
        const onHead = Math.hypot(u - HEAD.x, v - HEAD.y) <= HEAD.r
        if (onStroke || onHead) rgb = INK
      }

      const at = row + 1 + x * 3
      raw[at] = rgb[0]
      raw[at + 1] = rgb[1]
      raw[at + 2] = rgb[2]
    }
  }

  return png(size, raw)
}

/** Assemble the four chunks a minimal PNG needs. */
function png(size, raw) {
  const chunk = (type, data) => {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body) >>> 0)
    return Buffer.concat([length, body, crc])
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // truecolour
  

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return c ^ 0xffffffff
}

for (const size of [180, 192, 512]) {
  writeFileSync(new URL(`icon-${size}.png`, OUT), render(size))
  console.log(`wrote icon-${size}.png`)
}
