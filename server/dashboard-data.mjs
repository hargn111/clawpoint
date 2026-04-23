export function formatAge(ms) {
  if (!Number.isFinite(ms) || ms < 0) return 'unknown'
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function safeParseDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDueLabel(nextDueAt, now) {
  const deltaMs = nextDueAt.getTime() - now.getTime()
  const absMs = Math.abs(deltaMs)
  const absMinutes = Math.round(absMs / 60000)
  if (deltaMs <= 0) {
    if (absMinutes < 1) return 'due now'
    if (absMinutes < 60) return `${absMinutes}m overdue`
    const hours = Math.round(absMinutes / 60)
    return `${hours}h overdue`
  }
  if (absMinutes < 60) return `in ${absMinutes}m`
  const hours = Math.round(absMinutes / 60)
  if (hours < 48) return `in ${hours}h`
  const days = Math.round(hours / 24)
  return `in ${days}d`
}

export function reminderState(nextDueAt, now) {
  const deltaMs = nextDueAt.getTime() - now.getTime()
  if (deltaMs <= 0) return 'due-soon'
  if (deltaMs <= 6 * 60 * 60 * 1000) return 'waiting'
  return 'stalled'
}

export function buildGatewayHealth(sessions, reachable, now = new Date()) {
  const recentHeartbeat = sessions
    .filter((session) => typeof session.key === 'string' && session.key.includes(':heartbeat'))
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))[0]
  const sessionCount = sessions.length

  return {
    updatedAt: now.toISOString(),
    source: 'live',
    data: {
      service: reachable ? 'healthy' : 'offline',
      queueDepth: sessionCount,
      lastHeartbeat: recentHeartbeat
        ? formatAge(now.getTime() - Number(recentHeartbeat.updatedAt || 0))
        : 'No heartbeat session seen',
      notes: [
        `Gateway ${reachable ? 'reachable' : 'not reachable'} on loopback port 18789.`,
        `${sessionCount} tracked sessions in the main agent store.`,
      ],
    },
  }
}

export function buildReminderQueue(items, now = new Date()) {
  const reminders = items
    .filter((item) => item?.status === 'open' && Number.isFinite(item?.remind_interval_hours))
    .map((item) => {
      const anchor = safeParseDate(item.last_reminder_at) || safeParseDate(item.created_at)
      if (!anchor) return null
      const nextDueAt = new Date(anchor.getTime() + Number(item.remind_interval_hours) * 60 * 60 * 1000)
      return {
        id: item.id,
        title: item.title,
        bucket: item.bucket,
        dueAt: nextDueAt,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      title: item.title,
      bucket: item.bucket,
      dueLabel: formatDueLabel(item.dueAt, now),
      status: reminderState(item.dueAt, now),
    }))

  return {
    updatedAt: now.toISOString(),
    source: 'live',
    data: reminders,
  }
}

export function sessionState(ageMs) {
  if (!Number.isFinite(ageMs)) return 'idle'
  if (ageMs < 15 * 60 * 1000) return 'active'
  if (ageMs < 6 * 60 * 60 * 1000) return 'waiting'
  return 'idle'
}

export function sessionLabel(session) {
  if (typeof session.label === 'string' && session.label.trim()) return session.label.trim()
  if (session.key === 'agent:main:main') return 'Freya main session'
  if (typeof session.key === 'string' && session.key.includes(':heartbeat')) return 'Heartbeat session'
  if (typeof session.key === 'string' && session.key.includes(':telegram:')) return 'Telegram session'
  if (typeof session.key === 'string' && session.key.includes(':discord:')) return 'Discord session'
  if (typeof session.key === 'string' && session.key.includes(':cron:')) return 'Cron session'
  return session.key || session.sessionId || 'Session'
}

export function sessionKind(session) {
  if (typeof session.key === 'string' && session.key.includes(':cron:')) return 'subagent'
  return 'main'
}

export function buildSessionsOverview(sessions, now = new Date()) {
  const recent = sessions
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
    .slice(0, 6)
    .map((session) => {
      const ageMs = now.getTime() - Number(session.updatedAt || 0)
      return {
        id: session.sessionId,
        label: sessionLabel(session),
        kind: sessionKind(session),
        summary: `${formatAge(ageMs)} · ${session.lastChannel || 'direct'} · ${session.chatType || 'n/a'}`,
        state: sessionState(ageMs),
      }
    })

  return {
    updatedAt: now.toISOString(),
    source: 'live',
    data: recent,
  }
}

export function normalizeSessionsFromGateway(payload) {
  if (!payload || !Array.isArray(payload.sessions)) return []
  return payload.sessions.map((session) => ({
    ...session,
    key: session.key || session.sessionKey || session.id || session.sessionId,
  }))
}

export function createDashboardSnapshot({ sessions, todosAvailable, todos, reachable, now = new Date() }) {
  return {
    updatedAt: now.toISOString(),
    integrations: {
      taskgarden: {
        available: todosAvailable,
      },
    },
    gatewayHealth: buildGatewayHealth(sessions, reachable, now),
    reminderQueue: buildReminderQueue(todosAvailable ? todos : [], now),
    sessionsOverview: buildSessionsOverview(sessions, now),
  }
}
