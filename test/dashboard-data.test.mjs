import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createDashboardSnapshot,
  buildReminderQueue,
  buildSessionsOverview,
  formatDueLabel,
  normalizeSessionsFromGateway,
} from '../server/dashboard-data.mjs'

test('formatDueLabel handles overdue and future times', () => {
  const now = new Date('2026-04-18T18:00:00Z')
  assert.equal(formatDueLabel(new Date('2026-04-18T17:30:00Z'), now), '30m overdue')
  assert.equal(formatDueLabel(new Date('2026-04-18T19:00:00Z'), now), 'in 1h')
})

test('buildReminderQueue sorts due items and limits to six', () => {
  const now = new Date('2026-04-18T18:00:00Z')
  const items = Array.from({ length: 8 }, (_, index) => ({
    id: `todo-${index}`,
    title: `Todo ${index}`,
    bucket: 'planned',
    status: 'open',
    created_at: '2026-04-18T00:00:00Z',
    last_reminder_at: `2026-04-18T${String(9 + index).padStart(2, '0')}:00:00Z`,
    remind_interval_hours: 1,
  }))

  const queue = buildReminderQueue(items, now)
  assert.equal(queue.data.length, 6)
  assert.equal(queue.data[0].id, 'todo-0')
  assert.equal(queue.data[0].status, 'due-soon')
})

test('buildSessionsOverview orders sessions by recency', () => {
  const now = new Date('2026-04-18T18:00:00Z')
  const sessions = [
    {
      key: 'agent:main:telegram:direct:1',
      sessionId: 'telegram',
      updatedAt: new Date('2026-04-18T12:00:00Z').getTime(),
      lastChannel: 'telegram',
      chatType: 'direct',
    },
    {
      key: 'agent:main:main',
      sessionId: 'main',
      updatedAt: new Date('2026-04-18T17:55:00Z').getTime(),
      lastChannel: 'webchat',
      chatType: 'direct',
    },
  ]

  const overview = buildSessionsOverview(sessions, now)
  assert.equal(overview.data[0].id, 'main')
  assert.equal(overview.data[0].state, 'active')
  assert.match(overview.data[1].summary, /telegram/)
})

test('createDashboardSnapshot disables taskgarden-backed reminders when unavailable', () => {
  const now = new Date('2026-04-18T18:00:00Z')
  const snapshot = createDashboardSnapshot({
    sessions: [],
    todosAvailable: false,
    todos: [
      {
        id: 'x',
        title: 'Should not render',
        bucket: 'planned',
        status: 'open',
        created_at: '2026-04-18T00:00:00Z',
        remind_interval_hours: 1,
      },
    ],
    reachable: true,
    now,
  })

  assert.equal(snapshot.integrations.taskgarden.available, false)
  assert.deepEqual(snapshot.reminderQueue.data, [])
})

test('createDashboardSnapshot still builds sessions when todos are unavailable', () => {
  const now = new Date('2026-04-18T18:00:00Z')
  const snapshot = createDashboardSnapshot({
    sessions: [
      {
        key: 'agent:main:main',
        sessionId: 'main',
        updatedAt: new Date('2026-04-18T17:55:00Z').getTime(),
        lastChannel: 'webchat',
        chatType: 'direct',
      },
    ],
    todosAvailable: false,
    todos: [],
    reachable: true,
    now,
  })

  assert.equal(snapshot.integrations.taskgarden.available, false)
  assert.equal(snapshot.sessionsOverview.data[0].id, 'main')
})

test('normalizeSessionsFromGateway preserves gateway session entries', () => {
  const sessions = normalizeSessionsFromGateway({
    sessions: [
      {
        sessionKey: 'agent:main:main',
        sessionId: 'abc',
        updatedAt: 123,
      },
    ],
  })

  assert.equal(sessions.length, 1)
  assert.equal(sessions[0].key, 'agent:main:main')
  assert.equal(sessions[0].sessionId, 'abc')
})
