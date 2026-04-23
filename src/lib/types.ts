export type LoadState<T> = {
  updatedAt: string
  source: 'mock' | 'live'
  data: T
}

export type IntegrationStatus = {
  available: boolean
}

export type DashboardMeta = {
  updatedAt: string
  integrations: {
    taskgarden: IntegrationStatus
  }
}

export type GatewayHealth = {
  service: 'healthy' | 'degraded' | 'offline'
  queueDepth: number
  lastHeartbeat: string
  notes: string[]
  requestsPerMinute: number
  avgLatencyMs: number
  p95LatencyMs: number
  uptimeLabel: string
  lastRestartAt: string
  latencySamples: number[]
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

export type TaskgardenTask = {
  id: string
  title: string
  bucket: 'planned' | 'unplanned' | 'cron'
  status: 'open' | 'done'
  note?: string
  tags?: string[]
  created_at: string
  completed_at?: string | null
  remind_interval_hours?: number | null
  last_reminder_at?: string | null
}

export type TaskgardenTaskList = {
  updatedAt: string
  items: TaskgardenTask[]
}

export type TaskgardenTaskCreateInput = {
  title: string
  bucket?: 'planned' | 'unplanned'
  note?: string
  remindIntervalHours?: number | null
}

export type TaskgardenTaskUpdateInput = {
  title?: string
  bucket?: 'planned' | 'unplanned'
  status?: 'open' | 'done'
  remindIntervalHours?: number | null
  appendNote?: string
}

export type SessionAdminItem = {
  id: string
  key: string
  label: string
  kind: 'main' | 'subagent' | 'acp'
  state: 'active' | 'waiting' | 'idle'
  summary: string
  updatedAt?: number
  chatType?: string
  channel?: string
  status?: string
  model?: string
  modelProvider?: string
  thinkingLevel?: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
  verboseLevel?: 'off' | 'on'
  reasoningLevel?: 'off' | 'on' | 'stream'
  lastTo?: string
}

export type SessionAdminList = {
  updatedAt: string
  items: SessionAdminItem[]
}

export type SessionModelOption = {
  value: string
  label: string
  provider: string
  id: string
  alias?: string
  reasoning?: boolean
  contextWindow?: number
}

export type SessionModelList = {
  updatedAt: string
  items: SessionModelOption[]
}

export type SessionCreateInput = {
  label?: string
  model?: string | null
  thinking?: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
  verbose?: 'off' | 'on'
  reasoning?: 'off' | 'on' | 'stream'
  message?: string
  channel?: string
}

export type SessionUpdateInput = {
  key: string
  label?: string
  model?: string | null
  thinking?: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
  verbose?: 'off' | 'on'
  reasoning?: 'off' | 'on' | 'stream'
}

export type SessionMessageInput = {
  key: string
  message: string
  thinking?: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
  channel?: string
}

export type LogEvent = {
  id: string
  timestamp: string
  method: string
  path: string
  status: number
  level: 'debug' | 'info' | 'warn' | 'error'
  durationMs: number
}

export type LogEventList = {
  updatedAt: string
  items: LogEvent[]
}

export type PermissionsSummary = {
  updatedAt: string
  gatewayUrl: string
  tokenConfigured: boolean
  tokenMasked: string
  notes: string[]
}
