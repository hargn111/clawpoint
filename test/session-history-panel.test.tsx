import React from 'react'
import { readFileSync } from 'node:fs'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const historyMocks = vi.hoisted(() => ({
  list: {
    data: {
      updatedAt: '2026-04-28T02:00:00Z',
      counts: { sessions: 2, withPreview: 1 },
      items: [
        {
          key: 'agent:main:telegram:direct:very-long-session-key-that-should-wrap-instead-of-clipping-or-overflowing',
          id: 'long-session',
          label: 'A very long historical session title that should remain readable inside the archive selector item',
          agentId: 'main-agent-with-a-long-id',
          status: 'running',
          updatedAt: '2026-04-28T01:55:00Z',
          previewStatus: 'ok',
          preview: [
            {
              role: 'user',
              text: 'This is a long preview line that should render as its own wrapped snippet instead of being squeezed into one unreadable row.',
            },
            {
              role: 'assistant',
              text: 'Second preview line proves multi-line snippets keep their role labels and readable text blocks.',
            },
          ],
        },
        {
          key: 'agent:main:missing-preview',
          id: 'missing-preview',
          label: 'Missing Preview Session',
          agentId: 'main',
          status: 'idle',
          updatedAt: null,
          previewStatus: 'missing',
          preview: [],
        },
      ],
      notes: ['List note'],
    },
    isLoading: false,
    isFetching: false,
  },
  detail: {
    data: {
      updatedAt: '2026-04-28T02:00:00Z',
      key: 'agent:main:telegram:direct:very-long-session-key-that-should-wrap-instead-of-clipping-or-overflowing',
      label: 'A very long historical session title that should remain readable inside the archive selector item',
      status: 'running',
      counts: { messages: 1, user: 1, assistant: 0, tools: 0 },
      messages: [{ id: 'm-1', role: 'user', kind: 'user', timestamp: '2026-04-28T01:55:00Z', toolName: null, text: 'Hello from detail.' }],
      notes: ['Detail note'],
    },
    isLoading: false,
    isFetching: false,
  },
}))

vi.mock('../src/api/dashboard', () => ({
  useSessionHistoryList: () => historyMocks.list,
  useSessionHistoryDetail: () => historyMocks.detail,
}))

import { SessionHistoryPanel } from '../src/features/advanced/components/SessionHistoryPanel'

describe('SessionHistoryPanel archive rows', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders long archive rows as readable labelled preview cards with an empty fallback', () => {
    render(<SessionHistoryPanel />)

    const longSession = screen.getByRole('button', {
      name: /A very long historical session title that should remain readable/i,
    })
    expect(longSession.className).toContain('session-history-session-item')
    expect(within(longSession).getByText('ok')).not.toBeNull()
    expect(within(longSession).getByText(/very-long-session-key-that-should-wrap/)).not.toBeNull()
    expect(within(longSession).getByText('user')).not.toBeNull()
    expect(within(longSession).getByText(/long preview line/)).not.toBeNull()
    expect(within(longSession).getByText('assistant')).not.toBeNull()
    expect(within(longSession).getByText(/Second preview line proves multi-line snippets/)).not.toBeNull()

    const missingSession = screen.getByRole('button', { name: /Missing Preview Session/i })
    expect(within(missingSession).getByText('missing')).not.toBeNull()
    expect(within(missingSession).getByText('No preview available yet.')).not.toBeNull()
  })

  it('keeps responsive archive-row CSS hooks for wrapping and narrow widths', () => {
    const css = readFileSync('src/styles/index.css', 'utf8')
    expect(css).toContain('.session-history-session-item')
    expect(css).toContain('grid-template-columns: minmax(0, 1fr)')
    expect(css).toContain('.session-history-preview-line')
    expect(css).toContain('overflow-wrap: anywhere')
    expect(css).toContain('.session-history-session-title-row')
    expect(css).toContain('@media (max-width: 720px)')
  })
})
