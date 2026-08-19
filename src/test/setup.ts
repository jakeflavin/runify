import '@testing-library/jest-dom'

/*
 * jsdom has no media queries at all, and every app in this set reads one — the theme
 * hooks watch prefers-color-scheme, and roll asks whether there is a pointer worth
 * showing keyboard shortcuts for. Without this, rendering any of them throws.
 *
 * Nothing matches, which is the honest answer for a headless DOM with no device behind
 * it. A test that needs a query to match overrides this stub.
 */
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
