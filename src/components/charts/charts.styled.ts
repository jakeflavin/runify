import styled from 'styled-components'

export const Chart = styled.div`
  width: 100%;
  user-select: none;

  .recharts-cartesian-axis-tick text {
    fill: var(--dim);
    font-size: 10px;
  }

  .recharts-surface {
    overflow: visible;
  }
`

export const Tooltip = styled.div`
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: var(--shadow-float);
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.5;
`

export const Key = styled.span`
  color: var(--dim);
  margin-right: 8px;
`

export const Value = styled.span`
  font-weight: 700;
`
