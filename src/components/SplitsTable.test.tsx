import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SplitsTable } from './SplitsTable'
import type { Split } from '@/lib/analysis'

const split = (over: Partial<Split> = {}): Split => ({
  index: 1,
  meters: 1609,
  seconds: 462,
  pace: 462,
  gradeAdjustedPace: 460,
  gain: 10,
  loss: 4,
  avgHr: 150,
  ...over,
})

const bars = (c: HTMLElement) => [...c.querySelectorAll('[data-bar]')] as HTMLElement[]

describe('SplitsTable', () => {
  it('renders nothing at all when there are no splits', () => {
    const { container } = render(<SplitsTable splits={[]} units="imperial" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('names the distance column after the unit in play', () => {
    const { rerender } = render(<SplitsTable splits={[split()]} units="imperial" />)
    expect(screen.getByRole('columnheader', { name: 'Mile' })).toBeInTheDocument()
    rerender(<SplitsTable splits={[split()]} units="metric" />)
    expect(screen.getByRole('columnheader', { name: 'Km' })).toBeInTheDocument()
  })

  it('scales the bars from the fastest split, not from zero', () => {
    // Two splits a minute apart should look clearly different; from zero they would not.
    const { container } = render(
      <SplitsTable splits={[split(), split({ index: 2, pace: 924 })]} units="imperial" />,
    )
    const [first, second] = bars(container)
    expect(first!.style.width).toBe('100%')
    expect(second!.style.width).toBe('50%')
  })

  it('dims the slowest split so the worst one reads as the worst', () => {
    const { container } = render(
      <SplitsTable splits={[split(), split({ index: 2, pace: 600 })]} units="imperial" />,
    )
    expect(bars(container)[1]).toHaveAttribute('data-dim')
    expect(bars(container)[0]).not.toHaveAttribute('data-dim')
  })

  it('marks a part-split at the end, since it is not comparable to a full one', () => {
    const { container } = render(
      <SplitsTable splits={[split(), split({ index: 2, meters: 800 })]} units="imperial" />,
    )
    expect(screen.getByText(/· 0\.50/)).toBeInTheDocument()
    expect(bars(container)[1]).toHaveAttribute('data-dim')
  })

  it('keeps a bar visible even when the split is far off the pace', () => {
    const { container } = render(
      <SplitsTable splits={[split(), split({ index: 2, pace: 99_999 })]} units="imperial" />,
    )
    expect(parseFloat(bars(container)[1]!.style.width)).toBeGreaterThanOrEqual(3)
  })

  it('hides the optional columns unless asked for them', () => {
    const { rerender } = render(<SplitsTable splits={[split()]} units="imperial" />)
    expect(screen.queryByRole('columnheader', { name: 'HR' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'GAP' })).not.toBeInTheDocument()
    rerender(<SplitsTable splits={[split()]} units="imperial" showHr showGap />)
    expect(screen.getByRole('columnheader', { name: 'HR' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'GAP' })).toBeInTheDocument()
  })

  it('falls back to a dash when a split has no heart rate', () => {
    render(<SplitsTable splits={[split({ avgHr: undefined })]} units="imperial" showHr />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('totals the elapsed time in the footer', () => {
    render(
      <SplitsTable splits={[split({ seconds: 60 }), split({ index: 2, seconds: 90 })]} units="imperial" />,
    )
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('2:30')).toBeInTheDocument()
  })
})
