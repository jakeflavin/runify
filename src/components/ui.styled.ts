import styled from 'styled-components'

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
  /* Stats sit in equal grid columns. A value wider than its share has to be clipped to its
     own column rather than spilling across the hairline into the next one. */
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
  grid-auto-columns: 1fr;

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
