# Runify

A running route planner and run analyser, in one page. Draw a route that follows real
paths, see what the hills are going to cost you, then drop yesterday's GPX in and read
back what actually happened.

It grew out of the running route estimator in my portfolio, which measured straight lines
between clicks. Everything below is new.

## What it does

### Planning

- **Draw a route by clicking the map.** Legs snap to real roads, pavements and park paths
  rather than cutting across gardens — on foot or on a bike. Drag a pin to move it, click
  one to remove it, undo as far back as you like.
- **Close the loop, retrace it, or reverse it** in one click, which is how most runs are
  actually shaped.
- **See the terrain**: an elevation profile under the route, with the climb and descent
  filtered so sensor noise does not report a hundred metres of climb on a flat lap.
- **Plan the effort, not the distance.** Give it the pace you hold on the flat and it tells
  you when you will finish *this* route — every metre weighted by what its gradient costs.
  Or name a finish time and it tells you the effort you need. Predicted splits come with it,
  each one slower or faster than the last according to its own hills.
- **Race equivalents** for the mile through the marathon, from the distance you just drew.
- **Search for anywhere** by name, **save routes** for next time, and **export GPX** to put
  on a watch.

### Analysing

- **Drop in a GPX or TCX** from Strava, Garmin, COROS or Apple Fitness. It is read in the
  browser and never uploaded anywhere.
- **The headline numbers**: distance, moving time, pace, grade-adjusted pace, climb,
  heart rate, cadence, and the VDOT the run implies.
- **Splits** per mile or kilometre, each with a bar, plus grade-adjusted pace and the
  elevation and heart rate for that split.
- **Pace and heart rate on one chart**, with pace plotted fast-side-up. The line breaks
  where you stopped rather than drawing a spike through a red light.
- **The route coloured by pace**, and hovering any chart marks that exact spot on the map.
- **Time in each heart-rate zone**, against a maximum you can correct.

Miles or kilometres throughout, light or dark, and it remembers which you chose.

## Running it

```bash
npm install
npm run dev
```

No API keys, no accounts, no `.env`. Everything it talks to is keyless:
[CARTO](https://carto.com/attributions) basemaps over
[OpenStreetMap](https://www.openstreetmap.org/copyright) data,
[Valhalla](https://valhalla.readthedocs.io/) on the public OSM instance for path routing and
terrain, and [Nominatim](https://nominatim.openstreetmap.org/) for place search. They are
courtesy services with no SLA, so every call degrades rather than fails — a leg that cannot
be snapped is drawn straight and labelled as such, and a route with no terrain data says so
instead of quietly pretending to be flat.

| | |
|---|---|
| `npm run dev` | development server |
| `npm run build` | typecheck and build to `dist/` |
| `npm test` | unit tests |
| `npm run typecheck` | types only |
| `npm run lint` | oxlint |
| `npm run icons` | regenerate the PNG app icons from the mark |

## How it is put together

React 19, TypeScript and Vite. Leaflet for the map, driven imperatively — a waypoint drag
fires dozens of times a second and reconciling a marker tree through React on every frame
makes the pin lag the cursor. Recharts for the charts, loaded lazily, since nothing on the
first screen needs it. React Query for the network. No component library.

The interesting code is in `src/lib`, and it is all pure:

| | |
|---|---|
| `geo.ts` | distances, bearings, simplification, the polyline codec |
| `elevation.ts` | gain and loss, and why filtering is the whole problem |
| `pace.ts` | the Minetti grade curve, Riegel, Daniels & Gilbert, heart-rate zones |
| `analysis.ts` | a recorded track to splits, moving time and series |
| `plan.ts` | a drawn route to a finish time and predicted splits |
| `gpx.ts` | reading GPX and TCX, and writing GPX |

Each of those has tests, because they are where a wrong answer would be quiet rather than
obvious. `npm test` covers the lot.

## A note on the numbers

Grade adjustment uses the metabolic cost curve from Minetti et al. (2002), race equivalents
use Riegel's formula, and VDOT is Daniels & Gilbert. Each is an empirical fit with a range
it was measured over, and each is documented in `src/lib/pace.ts` along with what it is and
where it stops being trustworthy. Elevation gain is filtered with a 3 m threshold, which is
roughly what the major platforms use — it is why the same run reads differently on two sites.

## Licence

MIT.

## Standards

Code in this repo follows the [shared standards](https://github.com/jakeflavin/portfolio/blob/main/docs/STANDARDS.md) and [layout](https://github.com/jakeflavin/portfolio/blob/main/docs/LAYOUT.md) used across the directory.
