/**
 * Writes the home-screen icons as PNGs.
 *
 * iOS ignores an SVG apple-touch-icon, so the PNGs have to exist as files. They are
 * generated here and committed rather than built, which keeps an image library out of the
 * dependency list for three small assets. Run `npm run icons` after changing the mark in
 * `public/favicon.svg`, and keep the two in step by hand — the mark is a stroked stride
 * over a rounded orange tile.
 */
import { writeIcons } from './icon-png.mjs'

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
  const pixels = new Array(size * size)

  for (let y = 0; y < size; y++) {
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

      pixels[y * size + x] = rgb
    }
  }

  return pixels
}

/** Assemble the four chunks a minimal PNG needs. */
for (const size of writeIcons(OUT, [180, 192, 512], render)) {
  console.log(`wrote icon-${size}.png`)
}
