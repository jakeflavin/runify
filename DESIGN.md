# Runify — design guide

Runify looks like **Strava**, because Strava is the visual language every runner already
reads. This document is the source of truth. If a change to the app contradicts it, either
the change is wrong or this file needs updating first.

The point of matching Strava is not homage — it is that a runner opening this app should not
have to learn where anything is. Where Strava has settled on a convention, we take it.

## Where this comes from

Strava's interface is built from four moves. Everything here is in service of them.

1. **One accent, used sparingly.** Strava orange marks the route, the primary action and the
   selected tab. Nothing else is orange — not headings, not borders, not links in running
   text. The restraint is what makes the orange read as *this is your effort*.
2. **Numbers are the interface.** A stat is a tiny letterspaced caps label over a large,
   tight, tabular number. The label explains; the number is what you came for.
3. **Structure from hairlines, not cards on cards.** Panels sit on a 1px border with almost
   no shadow. Stat groups are divided by rules rather than gaps.
4. **Pills.** Buttons, tabs, chips and badges are fully rounded.

## What we do not take

Strava is a registered trademark of Strava, Inc. This is a personal project that borrows a
**visual idiom**, not an identity.

- No Strava wordmark, no Strava mark, no chevron logo.
- Our own wordmark is "Runify", with a running figure drawn for this project.
- No Strava content, no Strava API, no implication of a connection.
- The orange is our own token. It is close because the idiom needs a hot orange; it is not
  lifted from their brand assets.

## Colour

Two token sets, light and dark, in `src/index.css`. Nothing in the app names a colour
directly — every value comes from a token, which is what makes the theme switch a one-line
change rather than an audit.

| role | light | dark |
|---|---|---|
| page | `#f2f2f5` | `#0f0f11` |
| surface | `#ffffff` | `#1a1a1d` |
| text | `#1c1c1e` | `#f2f2f5` |
| dim | `#767680` | `#8a8a94` |
| hairline | `#dfdfe6` | `#2e2e34` |
| accent | `#fc5200` | `#fc5200` |

The accent is the same in both themes. It is already a hot orange on white and holds up on
near-black, and a route that changed colour with the theme would be a route you had to
re-learn.

### The data palette is content, not chrome

One hue per measured quantity, held constant wherever that quantity appears, and **never
used on a control**:

- pace — orange, the accent, because pace is the thing the app is about
- elevation — slate grey, so a profile reads as terrain rather than as data
- heart rate — crimson
- cadence — violet
- heart-rate zones — a five-step ramp from grey through blue, green and amber to red

The pace-coloured route on the map uses a five-step ramp cut at **percentiles of that run**,
not at absolute paces. The useful comparison is against the rest of this run; a fixed scale
would paint an easy run uniformly slow and a hard one uniformly fast.

## Type

Inter, which is the closest widely available face to Strava's UI sans.

| | size | weight | notes |
|---|---|---|---|
| stat, large | 34px | 700 | tight tracking, tabular |
| stat | 26px | 700 | |
| body | 14px | 400 | |
| section title | 11px | 700 | caps, `0.08em` tracking |
| stat label | 10px | 700 | caps, `0.09em` tracking |

`font-variant-numeric: tabular-nums` is set on `body` and every control. Any number that can
change must not make the layout twitch when it does.

## Layout

A masthead, then a map and a rail beside it. The map is the subject and takes the room; the
rail is the reading.

- Two columns above 900px — map on the left, a fixed 400px rail on the right that scrolls
  on its own.
- One column below that, with the map given `60vh` so there is enough to draw on and the
  numbers start just below the fold.
- The rail is a stack of sections divided by hairlines, in the order a runner asks for them:
  *what is it*, then *how fast*, then *the splits that explain the average*, then *the
  terrain and heart rate that explain the splits*.

### The rail's sections are fixtures

Every section in the rail exists on every visit, in the same order, whether it has data or
not. Nothing appears or disappears as a route is drawn or a file is opened — a section
without data shows an empty state saying why.

This costs some vertical space and is worth it twice over. It makes the rail a place rather
than a feed: the finish time is always in the same spot, so the eye learns where to go
instead of re-reading the stack every time it reflows. And it turns *absent* into *stated* —
"no heart rate in this file" is information, where a section that simply is not there is
indistinguishable from a section the app forgot to render.

The same applies inside a stat row: a channel with no data shows a dash and keeps its
column, rather than collapsing and moving its neighbours.

## Rules that are easy to get wrong

- **Pace axes run fast-side-up.** Plotting seconds-per-mile the natural way round means "the
  line went up" reads as "I slowed down", which is backwards to every runner alive.
- **An elevation axis never starts at zero.** Forcing zero flattens every hill into a
  straight line at the top of the frame.
- **Split bars are scaled from the fastest split, not from zero.** Every split in a run is
  within a minute or so of the others, and a zero-based bar makes them all look identical.
- **A missing channel says so.** A run recorded without a heart-rate strap keeps its zone
  section and explains the absence, rather than dropping the section. (This reverses an
  earlier rule — "absent, not blank" — which optimised for tidiness and produced a rail
  that rearranged itself under the reader. See *The rail's sections are fixtures* above.)
- **Dim means "not comparable", and nothing else.** The part-split at the end of a run gets
  a dim bar because it is not a like-for-like measurement. The slowest full split does not:
  it is already the shortest bar, and one treatment carrying two meanings reads as neither.
- **A stop is a gap.** The pace line breaks where the runner stopped rather than drawing a
  spike down and back through a red light.
- **Say when a number is uncertain.** A leg the router could not snap is drawn straight and
  labelled; a route with no terrain data says the figures assume it is flat.

## The mark

A running figure reduced to one stroke and a head, in orange. It exists as an inline SVG in
`App.tsx`, as `public/favicon.svg`, and as three PNGs generated by `npm run icons` — iOS
ignores an SVG apple-touch-icon, so those have to be real files. The SVG and the generator
are kept in step by hand; change one and change the other.
