import styled from 'styled-components'

export const Shell = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
`

export const Masthead = styled.header`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  height: 56px;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 0;
  z-index: 500;

  @media (max-width: 560px) {
    gap: 8px;
    padding: 0 10px;
  }

  /* At 320px the full row measured 362px and pushed the theme button off-screen. With
     the mode labels collapsed to icons (see SegmentedGroup) and the gaps closed up,
     everything fits with room to spare. Phones with room keep the labels. */
  @media (max-width: 374px) {
    gap: 6px;
    padding: 0 8px;
  }
`

/*
 * On a phone the masthead has to hold the mode switch, the units and the theme, and there
 * is not room for the name as well. The mark stays — it is the thing people recognise — and
 * the wordmark returns as soon as there is room for it.
 */
export const Wordmark = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text);

  svg {
    color: var(--brand);
  }

  @media (max-width: 560px) {
    span {
      display: none;
    }
  }
`

export const MastheadSpacer = styled.div`
  flex: 1;
`

/*
 * The map inside the stage is absolutely positioned, so the stage has no content height of
 * its own. On the two-column layout the grid row stretches it to match the rail and that is
 * invisible; on the single-column layout there is no rail beside it to borrow height from,
 * and without a floor the map would collapse to nothing.
 */
export const Stage = styled.div`
  min-width: 0;
  min-height: 320px;
  position: relative;

  /* Enough map to draw on, with the numbers starting just below the fold. */
  @media (max-width: 900px) {
    min-height: 60vh;
  }
`

export const Workspace = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  min-height: 0;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

export const Rail = styled.div`
  border-left: 1px solid var(--line);
  background: var(--surface);
  overflow-y: auto;
  max-height: calc(100dvh - 56px);

  @media (max-width: 900px) {
    border-left: none;
    border-top: 1px solid var(--line);
    max-height: none;
  }
`
