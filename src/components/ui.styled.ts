import styled from 'styled-components'
import { spinning } from '@/styles/spin'

export const Panel = styled.div`
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: var(--shadow-card);
`

export const Band = styled.section`
  border-bottom: 1px solid var(--line);
  padding: 16px;

  &:last-child {
    border-bottom: none;
  }
`

export const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`

export const Title = styled.h2`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--dim);
`

export const Spacer = styled.div`
  flex: 1;
`

export const StatLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const Unit = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: var(--dim);
  margin-left: 2px;
  letter-spacing: 0;
`

export const StatValue = styled.div`
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
  margin-top: 2px;
  /* Kept as a last-ditch backstop only: the row's columns are sized so a value always
     gets at least its own width (see StatRow). The number is what the stat exists to
     show — an ellipsized "11.3…" is the one rendering this component must not produce. */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const StatSub = styled.div`
  font-size: 12px;
  color: var(--dim);
  margin-top: 1px;
`

export const StatBox = styled.div<{ $size?: 'sm' | 'lg' }>`
  padding: 0 12px;
  min-width: 0;

  &:first-child {
    padding-left: 0;
  }

  ${(props) => props.$size === 'lg' && `${StatValue} { font-size: 34px; }`}
  ${(props) => props.$size === 'sm' && `${StatValue} { font-size: 18px; }`}
`

export const StatRow = styled.div`
  display: grid;
  grid-auto-flow: column;
  /* Every column gets at least its content's width, and only the leftover space is shared
     equally. Plain 1fr divided the row into equal thirds regardless of content, which is
     how a double-digit distance ended up clipped to "11.3…" beside a two-digit waypoint
     count that used a fraction of its share. */
  grid-auto-columns: minmax(max-content, 1fr);

  > ${StatBox} + ${StatBox} {
    border-left: 1px solid var(--line);
  }
`

export const Button = styled.button<{
  $primary?: boolean
  $ghost?: boolean
  $icon?: boolean
  $small?: boolean
  $danger?: boolean
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.12s,
    border-color 0.12s,
    color 0.12s;

  &:hover:not(:disabled) {
    background: var(--surface-hi);
  }

  &:disabled {
    opacity: 0.42;
    cursor: not-allowed;
  }

  ${(props) =>
    props.$primary &&
    `
    background: var(--brand);
    border-color: var(--brand);
    color: var(--brand-ink);

    &:hover:not(:disabled) {
      background: var(--brand-hover);
      border-color: var(--brand-hover);
    }
  `}

  ${(props) =>
    props.$ghost &&
    `
    border-color: transparent;
    background: transparent;

    &:hover:not(:disabled) { background: var(--surface-hi); }
  `}

  ${(props) => props.$icon && 'width: 34px; padding: 0;'}

  ${(props) =>
    props.$small &&
    `
    height: 28px;
    padding: 0 10px;
    font-size: 12px;
  `}

  ${(props) => props.$small && props.$icon && 'width: 28px; padding: 0;'}

  ${(props) =>
    props.$danger &&
    `
    &:hover:not(:disabled) {
      color: var(--danger);
      border-color: var(--danger);
      background: transparent;
    }
  `}

  /* On touch devices the pill keeps its size but the finger gets a 44px hit area. The
     vertical reach is generous; the horizontal stays inside the 8px row gap so adjacent
     buttons never trade taps. */
  @media (pointer: coarse) {
    position: relative;

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: -4px;
      right: -4px;
      height: 44px;
      transform: translateY(-50%);
    }
  }
`

/** Segmented control — the Strava tab pill. */
export const SegmentedGroup = styled.div<{ $brand?: boolean }>`
  display: inline-flex;
  background: var(--surface-sunken);
  border-radius: 999px;
  padding: 3px;
  gap: 2px;

  button {
    border: none;
    background: transparent;
    color: var(--dim);
    font-size: 13px;
    font-weight: 600;
    padding: 0 14px;
    height: 28px;
    border-radius: 999px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    transition:
      background 0.12s,
      color 0.12s;
  }

  button:hover:not([aria-pressed='true']) {
    color: var(--text);
  }

  button[aria-pressed='true'] {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-card);
  }

  ${(props) =>
    props.$brand &&
    `
    button[aria-pressed='true'] {
      background: var(--brand);
      color: var(--brand-ink);
    }
  `}

  /*
   * The stylesheet also carried a narrow-viewport padding override for these buttons, at
   * max-width 560. It never applied: the base rule was written 235 lines further down and
   * won on source order at equal specificity. Reproducing it here would apply it for the
   * first time, which is a change, not a migration — so it is dropped.
   */

  /* Touch reach without touching the layout: the buttons stay 28px pills, the fingers
     get 44px. Vertical only — the segments already touch each other horizontally, and
     an overlapping hit area would mean a tap near the seam operates the wrong one. */
  @media (pointer: coarse) {
    button {
      position: relative;
    }

    button::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 44px;
      transform: translateY(-50%);
    }
  }

  /*
   * Width, where there is width to give. Below 375px the masthead has about 16px spare
   * once the labels are down to icons, and widening six segments to 44px each needs 36 —
   * so the narrowest phones keep 44px-tall targets at their natural width. That is the
   * honest trade: full height everywhere, full width as soon as the screen allows it.
   */
  @media (pointer: coarse) and (min-width: 375px) {
    button {
      min-width: 44px;
    }
  }

  /*
   * The masthead's full-width content measures about 362px, so anything narrower than
   * ~375px cannot hold it — at 320px it used to overflow the viewport by 42px and push
   * the theme control clean off the screen. Only those genuinely tight screens give up
   * the labels; a 390px phone keeps them, because it has the room. Options that carry an
   * icon shed their text first; text-only options (the units) always keep theirs.
   */
  @media (max-width: 374px) {
    button[data-icon='true'] .seg-label {
      display: none;
    }

    button {
      padding: 0 10px;
    }
  }
`

export const SwitchLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  user-select: none;

  input {
    appearance: none;
    width: 34px;
    height: 20px;
    border-radius: 999px;
    background: var(--line-strong);
    position: relative;
    cursor: pointer;
    transition: background 0.15s;
    margin: 0;
    flex: none;
  }

  input::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.15s;
  }

  input:checked {
    background: var(--brand);
  }

  input:checked::after {
    transform: translateX(14px);
  }

  /* The 34×20 track is under the touch minimum; the whole label is the target anyway,
     so on touch devices it stretches to a 44px row without moving the layout much. */
  @media (pointer: coarse) {
    min-height: 44px;
  }
`

export const Chip = styled.span<{ $brand?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  background: var(--surface-hi);
  border: 1px solid var(--line);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-mid);
  white-space: nowrap;

  ${(props) =>
    props.$brand &&
    `
    background: var(--brand-wash);
    border-color: transparent;
    color: var(--brand);
  `}
`

export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

export const Grid2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`

export const Muted = styled.span`
  color: var(--dim);
`

export const Empty = styled.div`
  color: var(--dim);
  font-size: 13px;
  text-align: center;
  padding: 24px 12px;
  line-height: 1.5;
`

/*
 * Both of these were written as `.table .num` and `.table .bar-cell`, which outranked the
 * table's own `td` rule. As standalone components they score lower than it, so they double
 * their class to keep the padding and weight they had.
 */
export const Num = styled.td`
  && {
    font-weight: 600;
  }
`

export const BarCell = styled.td`
  && {
    width: 40%;
    padding-left: 10px;
    padding-right: 10px;
  }
`

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--dim);
    text-align: right;
    padding: 0 0 6px;
    border-bottom: 1px solid var(--line);
  }

  th:first-child,
  td:first-child {
    text-align: left;
  }

  td {
    padding: 7px 0;
    text-align: right;
    border-bottom: 1px solid var(--line);
    white-space: nowrap;
  }

  tr:last-child td {
    border-bottom: none;
  }
`

/** The horizontal pace bar Strava draws beside each split. */
export const Bar = styled.div<{ $dim?: boolean }>`
  height: 9px;
  border-radius: 999px;
  background: var(--brand);
  min-width: 3px;

  ${(props) => props.$dim && 'background: var(--line-strong);'}
`

export const Floating = styled.div`
  background: var(--surface);
  border-radius: 999px;
  box-shadow: var(--shadow-float);
  padding: 4px;
  display: flex;
  gap: 2px;
  align-items: center;
`

export const Hint = styled.div`
  background: var(--surface);
  border-radius: 8px;
  box-shadow: var(--shadow-float);
  padding: 6px 10px;
  font-size: 12px;
  color: var(--text-mid);
  max-width: 260px;
`

export const Grow = styled.div`
  flex: 1;
  min-width: 0;
`

/*
 * Copy that names an interaction the device does not have is worse than no copy at all —
 * "hover a chart" on a phone describes something the reader cannot do. These two let one
 * sentence carry the right verb for whichever input is actually present.
 */
export const OnHover = styled.span`
  @media (hover: none) {
    display: none;
  }
`

export const OnTouch = styled.span`
  @media (hover: hover) {
    display: none;
  }
`

export const ItemName = styled.div`
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  /* Rendered through \`as="span"\` inside list rows, where an inline box ignores the
     ellipsis above and a long saved-route name runs underneath its own delete button. */
  display: block;
`

export const ItemMeta = styled.div`
  font-size: 12px;
  color: var(--dim);
`

export const List = styled.div`
  display: flex;
  flex-direction: column;
`

export const ListItem = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
  text-align: left;
  background: none;
  border-left: none;
  border-right: none;
  border-top: none;
  width: 100%;
  cursor: pointer;

  &:hover {
    background: var(--surface-hi);
  }

  &:last-child {
    border-bottom: none;
  }
`

/** Zone meter — one stacked bar per heart-rate zone. */
export const ZoneRow = styled.div`
  display: grid;
  grid-template-columns: 28px 1fr 62px;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  font-size: 12px;
`

export const ZoneTrack = styled.div`
  height: 10px;
  border-radius: 999px;
  background: var(--surface-sunken);
  overflow: hidden;
`

export const ZoneFill = styled.div`
  height: 100%;
  border-radius: 999px;
`

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;

  > label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--dim);
  }
`

export const Input = styled.input`
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--text);
  width: 100%;
  min-width: 0;

  &:focus {
    border-color: var(--brand);
    outline: none;
  }

  &:disabled {
    opacity: 0.42;
    cursor: not-allowed;
  }

  /* min-height rather than height, so it also lifts the few inputs that carry an inline
     height of their own — the max-heart-rate box in the zones header, for one. */
  @media (pointer: coarse) {
    min-height: 44px;
  }
`

export const MapOverlay = styled.div<{ $bottom?: boolean }>`
  position: absolute;
  z-index: 450;
  display: flex;
  gap: 8px;
  align-items: center;

  ${(props) =>
    props.$bottom
      ? `
    bottom: 24px;
    left: 12px;
  `
      : `
    top: 12px;
    left: 12px;
    right: 12px;
    flex-wrap: wrap;
  `}
`

export const DropZone = styled.div<{ $over?: boolean }>`
  border: 2px dashed var(--line-strong);
  border-radius: 12px;
  padding: 32px 20px;
  text-align: center;
  color: var(--dim);
  cursor: pointer;
  background: var(--surface-hi);
  transition:
    border-color 0.15s,
    background 0.15s,
    color 0.15s;

  strong {
    display: block;
    color: var(--text);
    font-size: 15px;
    margin-bottom: 4px;
  }

  &:hover {
    border-color: var(--brand);
    background: var(--brand-wash);
    color: var(--brand);
  }

  ${(props) =>
    props.$over &&
    `
    border-color: var(--brand);
    background: var(--brand-wash);
    color: var(--brand);

    strong { color: var(--brand); }
  `}
`

/** A turning icon, applied through `as` so it keeps the icon's own element. */
export const Spinner = styled.span`
  ${spinning}
`
