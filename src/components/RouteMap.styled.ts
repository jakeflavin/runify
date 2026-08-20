import styled from 'styled-components'

/**
 * The map surface, and everything Leaflet draws inside it.
 *
 * Leaflet's own chrome and the waypoint markers are rendered as HTML strings by Leaflet
 * rather than by React, so they cannot be styled components. They are still inside this
 * element, so they are reached as descendants — which keeps them out of the global sheet.
 */
export const MapSurface = styled.div`
  position: absolute;
  inset: 0;
  background: var(--surface-sunken);

  &:focus-visible {
    outline-offset: -2px;
  }

  /* Leaflet initialises on this element, so it *is* the container — not a descendant. */
  &.leaflet-container {
    background: var(--surface-sunken);
    font: inherit;
  }

  .leaflet-control-attribution {
    background: rgba(255, 255, 255, 0.75) !important;
    font-size: 10px !important;
  }

  :root[data-theme='dark'] & .leaflet-control-attribution {
    background: rgba(0, 0, 0, 0.6) !important;
    color: var(--dim) !important;
  }

  :root[data-theme='dark'] & .leaflet-control-attribution a {
    color: var(--text-mid) !important;
  }

  /* Route waypoint markers, drawn as divIcons so they inherit the palette. */
  .wp {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--surface);
    border: 3px solid var(--brand);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    cursor: grab;
  }

  .wp.start {
    background: var(--brand);
    border-color: var(--surface);
    width: 16px;
    height: 16px;
  }

  .wp.end {
    background: var(--text);
    border-color: var(--surface);
    width: 16px;
    height: 16px;
  }

  .wp:active {
    cursor: grabbing;
  }
`
