import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sessionMocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  send: vi.fn(),
}))

const taskMocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock('../src/features/sessions/api/useSessionAdmin', () => ({
  useSessionListAdmin: () => ({
    data: {
      updatedAt: '2026-04-24T00:00:00Z',
      items: [
        {
          id: 'session-1',
          key: 'session-1',
          label: 'Session One',
          kind: 'main',
          state: 'active',
          summary: 'Test session',
          updatedAt: Date.now(),
          status: 'ready',
        },
      ],
    },
    isLoading: false,
    isFetching: false,
    refetch: sessionMocks.refetch,
  }),
  useSessionModels: () => ({ data: { updatedAt: '2026-04-24T00:00:00Z', items: [] } }),
  useSessionCreate: () => ({ isPending: false, mutateAsync: sessionMocks.create }),
  useSessionUpdate: () => ({ isPending: false, mutateAsync: sessionMocks.update }),
  useSessionMessageSend: () => ({ isPending: false, mutateAsync: sessionMocks.send }),
}))

vi.mock('../src/features/taskgarden/api/useTaskgardenTasks', () => ({
  useTaskgardenTaskList: () => ({
    data: {
      updatedAt: '2026-04-24T00:00:00Z',
      items: [
        {
          id: 'task-1',
          title: 'Task One',
          bucket: 'planned',
          status: 'open',
          created_at: '2026-04-24T00:00:00Z',
        },
      ],
    },
    isLoading: false,
    isFetching: false,
    refetch: taskMocks.refetch,
  }),
  useTaskgardenTaskCreate: () => ({ isPending: false, mutateAsync: taskMocks.create }),
  useTaskgardenTaskUpdate: () => ({ isPending: false, mutateAsync: taskMocks.update }),
}))

import { SessionManagerCard } from '../src/features/sessions/components/SessionManagerCard'
import { TaskgardenManagerCard } from '../src/features/taskgarden/components/TaskgardenManagerCard'

describe('manager refresh controls', () => {
  beforeEach(() => {
    sessionMocks.refetch.mockReset()
    sessionMocks.create.mockReset()
    sessionMocks.update.mockReset()
    sessionMocks.send.mockReset()
    taskMocks.refetch.mockReset()
    taskMocks.create.mockReset()
    taskMocks.update.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('sessions refresh button triggers refetch', () => {
    render(<SessionManagerCard />)
    fireEvent.click(screen.getByRole('button', { name: 'Refresh list' }))
    expect(sessionMocks.refetch).toHaveBeenCalledTimes(1)
  })

  it('tasks refresh button triggers refetch', () => {
    render(<TaskgardenManagerCard />)
    fireEvent.click(screen.getByRole('button', { name: 'Refresh list' }))
    expect(taskMocks.refetch).toHaveBeenCalledTimes(1)
  })

  it('sessions open in a keyboard-dismissible drawer and return focus', async () => {
    render(<SessionManagerCard />)

    const trigger = screen.getByRole('button', { name: /Session One/ })
    trigger.focus()
    fireEvent.click(trigger)

    expect(screen.getByRole('dialog', { name: 'Session editor' })).not.toBeNull()
    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Session editor' })).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  it('tasks open in a keyboard-dismissible drawer and return focus', async () => {
    render(<TaskgardenManagerCard />)

    const trigger = screen.getByRole('button', { name: /Task One/ })
    trigger.focus()
    fireEvent.click(trigger)

    expect(screen.getByRole('dialog', { name: 'Task editor' })).not.toBeNull()
    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Task editor' })).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })
})
