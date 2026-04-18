export type LoadState<T> = {
  updatedAt: string
  source: 'mock' | 'live'
  data: T
}

export type IntegrationStatus = {
  available: boolean
}

export type DashboardSnapshot = {
  updatedAt: string
  integrations: {
    taskgarden: IntegrationStatus
  }
  gatewayHealth: LoadState<GatewayHealth>
  reminderQueue: LoadState<ReminderItem[]>
  sessionsOverview: LoadState<SessionItem[]>
}

export type GatewayHealth = {
  service: 'healthy' | 'degraded' | 'offline'
  queueDepth: number
  lastHeartbeat: string
  notes: string[]
}

export type ReminderItem = {
  id: string
  title: string
  bucket: 'planned' | 'unplanned' | 'cron'
  dueLabel: string
  status: 'due-soon' | 'waiting' | 'stalled'
}

export type SessionItem = {
  id: string
  label: string
  kind: 'main' | 'subagent' | 'acp'
  summary: string
  state: 'active' | 'waiting' | 'idle'
}
