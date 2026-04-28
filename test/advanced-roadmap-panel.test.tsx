import React from 'react'
import { readFileSync } from 'node:fs'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const roadmapMock = vi.hoisted(() => ({
  value: {
    data: {
      updatedAt: '2026-04-28T04:45:00Z',
      items: [
        {
          id: 'advanced-ux-quality',
          title: 'Advanced UX Quality Pass With A Very Long Label That Must Wrap Cleanly In A Card',
          summary: 'Long summary text should remain readable and should not depend on horizontal scrolling when the card gets narrow.',
          status: 'implemented',
          nextSteps: [
            'Keep adding focused missing-data and overflow tests as each Advanced surface grows new controls.',
          ],
        },
      ],
    },
    isLoading: false,
    isFetching: false,
  },
}))

vi.mock('../src/api/dashboard', () => ({
  useAdvancedRoadmap: () => roadmapMock.value,
}))

import { AdvancedRoadmapPanel } from '../src/features/advanced/components/AdvancedRoadmapPanel'

describe('AdvancedRoadmapPanel UX quality hooks', () => {
  afterEach(() => cleanup())

  it('renders long roadmap content and implemented quality status without clipping-only markup', () => {
    render(<AdvancedRoadmapPanel />)

    expect(screen.getByText(/Advanced UX Quality Pass With A Very Long Label/)).not.toBeNull()
    expect(screen.getByText('implemented')).not.toBeNull()
    expect(screen.getByText(/Long summary text should remain readable/)).not.toBeNull()
    expect(screen.getByText(/Keep adding focused missing-data/)).not.toBeNull()
  })

  it('renders an empty state when roadmap data is available but empty', () => {
    roadmapMock.value = { data: { updatedAt: '2026-04-28T04:45:00Z', items: [] }, isLoading: false, isFetching: false }

    render(<AdvancedRoadmapPanel />)

    expect(screen.getByText('No roadmap items available yet.')).not.toBeNull()
  })

  it('keeps focus and overflow CSS hooks for Advanced surfaces', () => {
    const css = readFileSync('src/styles/index.css', 'utf8')
    expect(css).toContain(':focus-visible')
    expect(css).toContain('outline-offset: 2px')
    expect(css).toContain('.roadmap-card')
    expect(css).toContain('.tool-inventory-item')
    expect(css).toContain('.session-history-session-item')
    expect(css).toContain('min-width: 0')
  })
})
