import { css, keyframes } from 'styled-components'

const turn = keyframes`
  to { transform: rotate(360deg); }
`

/** Applied to the icon itself, which is where the class it replaces sat. */
export const spinning = css`
  animation: ${turn} 0.9s linear infinite;
`
