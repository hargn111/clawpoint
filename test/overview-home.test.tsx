import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/features/health/api/useGatewayHealth', () => ({
  useGatewayHealth: () => ({
    data: { updatedAt: '2026-04-24T00:00:00Z', data: { service: 'healthy', lastHeartbeat: 'now' } },
    isLoading: false,
    isFetching: false,
  }),
}))

vi.mock('../src/features/reminders/api/useReminderQueue', () => ({
  useReminderQueue: () => ({ data: { updatedAt: '2026-04-24T00:00:00Z', data: [] }, isFetching: false }),
}))

vi.mock('../src/features/sessions/api/useSessionAdmin', () => ({
  useSessionListAdmin: () => ({
    data: {
      updatedAt: '2026-04-24T00:00:00Z',
      items: [{ id: 'session-1', label: 'Waiting session', state: 'waiting', summary: 'Needs follow-up' }],
    },
    isFetching: false,
  }),
}))

vi.mock('../src/features/taskgarden/api/useTaskgardenTasks', () => ({
  useTaskgardenTaskList: () => ({
    data: {
      updatedAt: '2026-04-24T00:00:00Z',
      items: [{ id: 'task-1', title: 'Planned task', bucket: 'planned', status: 'open', created_at: '2026-04-24T00:00:00Z' }],
    },
    isFetching: false,
  }),
}))

vi.mock('../src/api/dashboard', () => ({
  useAutomationInspector: () => ({ data: { updatedAt: '2026-04-24T00:00:00Z', items: [] }, isFetching: false }),
  useLogsEvents: () => ({ data: { items: [] } }),
}))

import { PersonalOperationsHomePanel } from '../src/features/overview/components/PersonalOperationsHomePanel'
import { UnifiedWorkQueuePanel } from '../src/features/overview/components/UnifiedWorkQueuePanel'

describe('overview taskgarden availability', () => {
  afterEach(() => {
    cleanup()
    window.location.hash = ''
    window.localStorage.clear()
  })

  it('reroutes the home work card away from the missing Task Garden tab', () => {
    render(<PersonalOperationsHomePanel taskgardenAvailable={false} />)

    fireEvent.click(screen.getByText(/Task Garden is unavailable/).closest('button')!)

    expect(window.location.hash).toBe('#sessions')
    expect(screen.getByText(/Task Garden is unavailable/)).not.toBeNull()
  })

  it('omits Task Garden-backed queue items when Task Garden is unavailable', () => {
    render(<UnifiedWorkQueuePanel taskgardenAvailable={false} />)

    expect(screen.queryByText('Planned task')).toBeNull()
    expect(screen.getByText('Waiting session')).not.toBeNull()
  })
})
