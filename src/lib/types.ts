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
  platform?: {
    openclawVersion?: string | null
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
  posture: 'healthy' | 'warning' | 'error'
  gateway: {
    mode: string
    bind: string
    reachable: boolean
    tailscaleMode: string
    controlUiInsecureAllowed: boolean
    nodeDenyCommandCount: number
  }
  counts: {
    checks: number
    warnings: number
    errors: number
    authProfiles: number
    channels: number
  }
  checks: Array<{
    id: string
    label: string
    status: 'healthy' | 'warning' | 'error'
    detail: string
    action: string
  }>
  authProfiles: Array<{
    id: string
    provider: string
    mode: string
    status: 'healthy' | 'warning' | 'idle'
  }>
  channels: Array<{
    id: string
    label: string
    configured: boolean
    running: boolean
    probeOk: boolean
    tokenSource: string
    status: 'healthy' | 'warning' | 'idle'
  }>
  rotationChecklist: Array<{
    id: string
    label: string
    status: 'manual' | 'ready' | 'blocked'
  }>
  notes: string[]
}

export type EffectiveConfigItem = {
  key: string
  label: string
  value: string
  source: string
  status: 'healthy' | 'warning' | 'idle'
  sensitive?: boolean
}

export type EffectiveConfigSummary = {
  updatedAt: string
  readOnly: boolean
  items: EffectiveConfigItem[]
  notes: string[]
}

export type ModelProfile = {
  id: string
  name: string
  purpose: string
  model: string
  modelSource: string
  thinking: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
  verbose: 'off' | 'on'
  reasoning: 'off' | 'on' | 'stream'
  contextBudget: 'standard' | 'high' | 'large'
  launchLabel: string
  available: boolean
}

export type ModelProfileList = {
  updatedAt: string
  items: ModelProfile[]
  notes: string[]
}

export type AdvancedRoadmapItem = {
  id: string
  title: string
  summary: string
  status: 'implemented' | 'partial' | 'next' | 'planned' | 'later'
  nextSteps: string[]
  blockedBy?: string
}

export type AdvancedRoadmap = {
  updatedAt: string
  items: AdvancedRoadmapItem[]
}

export type ChangeAuditEvent = {
  id: string
  timestamp: string
  action: string
  target: string
  actor: string
  level: 'info' | 'warning' | 'error'
  summary: string
  metadata: Record<string, string | number | boolean | null>
}

export type ChangeAuditLog = {
  updatedAt: string
  retention: string
  counts: {
    total: number
    info: number
    warning: number
    error: number
  }
  items: ChangeAuditEvent[]
  notes: string[]
}

export type AutomationJob = {
  id: string
  name: string
  description: string
  enabled: boolean
  scheduleKind: string
  scheduleLabel: string
  sessionTarget: string
  payloadKind: string
  deliveryMode: string
  nextRunAt: string | null
  lastRunAt: string | null
  lastRunStatus: string
  lastDurationMs: number | null
  consecutiveErrors: number
  health: 'healthy' | 'warning' | 'idle'
}

export type AutomationInspector = {
  updatedAt: string
  scheduler: {
    enabled: boolean
    running: boolean
    status: 'healthy' | 'warning'
  }
  counts: {
    total: number
    enabled: number
    disabled: number
    warning: number
  }
  items: AutomationJob[]
  notes: string[]
}

export type DangerZoneSummary = {
  updatedAt: string
  posture: 'guarded'
  confirmationPhrase: string
  release: string
  checks: Array<{
    id: string
    label: string
    status: 'healthy' | 'warning' | 'error'
    detail: string
  }>
  actions: Array<{
    id: 'export-diagnostics' | 'clear-volatile-state' | 'restart-dashboard'
    label: string
    blastRadius: string
    confirmationRequired: boolean
  }>
  unavailableActions: string[]
  notes: string[]
}

export type ToolInventoryTool = {
  id: string
  label: string
  source: string
  description: string
  inputSchemaKeys: string[]
  detail: string[]
}

export type ToolInventoryGroup = {
  id: string
  label: string
  source: string
  tools: ToolInventoryTool[]
}

export type PluginInventoryItem = {
  id: string
  enabled: boolean
  status: 'healthy' | 'warning' | 'idle'
  hasConfig: boolean
  configKeys: string[]
}

export type McpServerInventoryItem = {
  id: string
  transport: string
  status: 'healthy' | 'warning' | 'idle'
  command?: string
  urlHost?: string
}

export type ToolInventory = {
  updatedAt: string
  sessionKey: string
  profile: string
  counts: {
    groups: number
    tools: number
    plugins: number
    mcpServers: number
  }
  toolsConfig: {
    profile: string
    webSearch: string
    elevated: string
  }
  plugins: PluginInventoryItem[]
  mcpServers: McpServerInventoryItem[]
  groups: ToolInventoryGroup[]
  notes: string[]
}

export type SessionPermissionItem = {
  key: string
  id: string
  label: string
  state: string
  model: string
  toolsAllow: string[] | null
}

export type SessionPermissionSummary = {
  updatedAt: string
  selectedKey: string
  patchSupportsToolsAllow: boolean
  sessions: SessionPermissionItem[]
  effective: {
    profile: string
    toolCount: number
    groupCount: number
    groupLabels: string[]
  } | null
  notes: string[]
}

export type SessionHistoryPreviewItem = {
  role: string
  text: string
}

export type SessionHistoryItem = {
  key: string
  id: string
  label: string
  agentId: string
  status: string
  updatedAt: string | number | null
  channel: string
  previewStatus: string
  preview: SessionHistoryPreviewItem[]
}

export type SessionHistoryList = {
  updatedAt: string
  counts: {
    sessions: number
    indexed: number
    matched: number
    hasMore: boolean
    withPreview: number
  }
  filters: {
    q: string
    agentId: string
    channel: string
    dateFrom: string | null
    dateTo: string | null
  }
  facets: {
    agentIds: string[]
    channels: string[]
  }
  index: {
    status: string
    boundedTo: number
    searchedFields: string[]
    secretPosture: string
    staleWarning: string
  }
  items: SessionHistoryItem[]
  notes: string[]
}

export type SessionHistoryMessage = {
  id: string
  role: string
  kind: string
  timestamp: string | null
  toolName: string | null
  text: string
}

export type SessionHistoryDetail = {
  updatedAt: string
  key: string
  label: string
  status: string
  counts: {
    messages: number
    user: number
    assistant: number
    tools: number
  }
  messages: SessionHistoryMessage[]
  notes: string[]
}
