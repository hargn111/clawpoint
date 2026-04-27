function stringValue(value, fallback = 'not configured') {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

function sourceForEnv(env, key, defaultSource) {
  return env[key] ? `env:${key}` : defaultSource
}

function boolLabel(value) {
  if (value === true) return 'enabled'
  if (value === false) return 'disabled'
  return 'not configured'
}

function redactDescription(value, maxLength = 180) {
  if (typeof value !== 'string') return ''
  const collapsed = value.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= maxLength) return collapsed
  return `${collapsed.slice(0, maxLength - 1)}…`
}

function statusFromEnabled(value) {
  if (value === false) return 'idle'
  if (value === true || value === undefined) return 'healthy'
  return 'warning'
}

function safeUrlHost(value) {
  if (typeof value !== 'string') return undefined
  try {
    return new URL(value).host
  } catch {
    return 'invalid url'
  }
}

function checkStatus(condition, warningCondition = false) {
  if (condition) return 'healthy'
  if (warningCondition) return 'warning'
  return 'error'
}

function authMode(config) {
  return config?.gateway?.auth?.mode || (config?.gateway?.auth?.enabled ? 'token' : 'not configured')
}

function gatewayBindLabel(gateway = {}) {
  const bind = gateway.bind || 'default'
  const port = gateway.port || 'default'
  return `${bind}:${port}`
}

export function buildEffectiveConfigSummary({
  config = null,
  configPath,
  configLoaded,
  openclawVersion = null,
  gatewayBaseUrl,
  gatewayTokenConfigured,
  todosPath,
  sessionsPath,
  packageJsonPath,
  runtimeModelCount = null,
  runtimeModelSource = null,
  env = process.env,
  now = new Date(),
} = {}) {
  const defaults = config?.agents?.defaults ?? {}
  const modelConfig = defaults.model ?? {}
  const modelCatalog = defaults.models ?? {}
  const gateway = config?.gateway ?? {}
  const heartbeat = defaults.heartbeat ?? {}
  const contextPruning = defaults.contextPruning ?? {}
  const hiddenWhenUnreadable = (value, fallback = 'not configured') => (configLoaded ? stringValue(value, fallback) : 'not visible to dashboard service')
  const configSource = (pathName) => (configLoaded ? pathName : 'config unreadable by service')

  const items = [
    {
      key: 'openclaw-version',
      label: 'OpenClaw version',
      value: openclawVersion ?? 'unknown',
      source: sourceForEnv(env, 'OPENCLAW_PACKAGE_JSON', 'package metadata'),
      status: openclawVersion ? 'healthy' : 'idle',
    },
    {
      key: 'config-file',
      label: 'Config file',
      value: configPath,
      source: configLoaded ? 'loaded' : 'missing/unreadable',
      status: configLoaded ? 'healthy' : 'warning',
    },
    {
      key: 'default-model',
      label: 'Default model',
      value: hiddenWhenUnreadable(modelConfig.primary),
      source: configSource('agents.defaults.model.primary'),
      status: configLoaded && modelConfig.primary ? 'healthy' : 'warning',
    },
    {
      key: 'model-fallbacks',
      label: 'Model fallbacks',
      value: Array.isArray(modelConfig.fallbacks) && modelConfig.fallbacks.length ? modelConfig.fallbacks.join(', ') : 'none',
      source: 'agents.defaults.model.fallbacks',
      status: 'idle',
    },
    {
      key: 'thinking-default',
      label: 'Thinking default',
      value: stringValue(defaults.thinkingDefault),
      source: 'agents.defaults.thinkingDefault',
      status: defaults.thinkingDefault ? 'healthy' : 'idle',
    },
    {
      key: 'model-catalog',
      label: 'Configured models',
      value: `${runtimeModelCount ?? Object.keys(modelCatalog).length} entries`,
      source: runtimeModelSource ?? 'agents.defaults.models',
      status: (runtimeModelCount ?? Object.keys(modelCatalog).length) ? 'healthy' : 'warning',
    },
    {
      key: 'heartbeat',
      label: 'Heartbeat cadence',
      value: stringValue(heartbeat.every),
      source: 'agents.defaults.heartbeat.every',
      status: heartbeat.every ? 'healthy' : 'idle',
    },
    {
      key: 'context-pruning',
      label: 'Context pruning',
      value: stringValue(contextPruning.mode),
      source: 'agents.defaults.contextPruning.mode',
      status: contextPruning.mode ? 'healthy' : 'idle',
    },
    {
      key: 'gateway-url',
      label: 'Gateway URL',
      value: gatewayBaseUrl,
      source: sourceForEnv(env, 'GATEWAY_BASE_URL', 'dashboard default'),
      status: 'healthy',
    },
    {
      key: 'gateway-bind',
      label: 'Gateway bind',
      value: `${stringValue(gateway.bind, 'default')} : ${stringValue(gateway.port, 'default')}`,
      source: 'gateway.bind/gateway.port',
      status: gateway.bind || gateway.port ? 'healthy' : 'idle',
    },
    {
      key: 'gateway-auth',
      label: 'Gateway auth',
      value: boolLabel(gateway.auth?.enabled),
      source: 'gateway.auth.enabled',
      status: gateway.auth?.enabled ? 'healthy' : 'warning',
    },
    {
      key: 'dashboard-token',
      label: 'Dashboard gateway token',
      value: gatewayTokenConfigured ? 'configured' : 'missing',
      source: env.GATEWAY_TOKEN ? 'env:GATEWAY_TOKEN' : env.OPENCLAW_GATEWAY_TOKEN ? 'env:OPENCLAW_GATEWAY_TOKEN' : 'environment',
      status: gatewayTokenConfigured ? 'healthy' : 'warning',
      sensitive: true,
    },
    {
      key: 'taskgarden-path',
      label: 'Taskgarden export',
      value: todosPath,
      source: sourceForEnv(env, 'TASKGARDEN_TODOS_PATH', 'dashboard default'),
      status: 'healthy',
    },
    {
      key: 'sessions-source',
      label: 'Fallback sessions store',
      value: sessionsPath,
      source: sourceForEnv(env, 'SESSIONS_PATH', 'dashboard default'),
      status: 'healthy',
    },
    {
      key: 'package-json-path',
      label: 'Package metadata path',
      value: packageJsonPath,
      source: sourceForEnv(env, 'OPENCLAW_PACKAGE_JSON', 'dashboard default'),
      status: 'idle',
    },
  ]

  return {
    updatedAt: now.toISOString(),
    readOnly: true,
    items,
    notes: [
      'This is a read-only effective view: it shows safe values and sources, not raw config or secrets.',
      'Editable config should be added behind a diff/confirm/restart flow rather than direct form writes.',
    ],
  }
}

function modelEntries(config, runtimeModels = []) {
  const models = config?.agents?.defaults?.models ?? {}
  const configEntries = Object.entries(models).map(([value, meta]) => ({ value, alias: meta?.alias }))
  if (configEntries.length) return configEntries
  return runtimeModels.map((model) => ({ value: model.value, alias: model.alias }))
}

function primaryModel(config, runtimeModels = []) {
  return config?.agents?.defaults?.model?.primary || modelEntries(config, runtimeModels)[0]?.value || ''
}

function pickModel(config, runtimeModels, preferred) {
  const entries = modelEntries(config, runtimeModels)
  const available = new Set(entries.map((entry) => entry.value))
  const exact = preferred.find((candidate) => available.has(candidate))
  if (exact) return { value: exact, source: 'configured preference' }
  const alias = entries.find((entry) => preferred.includes(entry.alias))
  if (alias) return { value: alias.value, source: `alias ${alias.alias}` }
  const fallback = primaryModel(config, runtimeModels)
  return { value: fallback, source: fallback ? 'default model fallback' : 'not configured' }
}

export function buildModelProfiles({ config = null, runtimeModels = [], now = new Date() } = {}) {
  const defaultThinking = config?.agents?.defaults?.thinkingDefault || 'medium'
  const profiles = [
    {
      id: 'fast',
      name: 'Fast',
      purpose: 'Quick triage, short answers, low-latency checks, and low-risk dashboard work.',
      modelPick: pickModel(config, runtimeModels, ['google/gemini-3-flash-preview', 'google/gemini-3.1-flash-lite-preview', 'gemini-flash', 'gemini-flash-lite']),
      thinking: 'low',
      verbose: 'off',
      reasoning: 'off',
      contextBudget: 'standard',
      launchLabel: 'Fast profile session',
    },
    {
      id: 'careful',
      name: 'Careful',
      purpose: 'Ambiguous decisions, planning, reviews, and tasks where correctness matters more than speed.',
      modelPick: pickModel(config, runtimeModels, ['openai-codex/gpt-5.5', 'GPT55', 'openai-codex/gpt-5.4-pro', 'GPT54Pro']),
      thinking: 'high',
      verbose: 'off',
      reasoning: 'on',
      contextBudget: 'high',
      launchLabel: 'Careful profile session',
    },
    {
      id: 'coding',
      name: 'Coding',
      purpose: 'Implementation, refactors, tests, and codebase-first changes with stronger reasoning.',
      modelPick: pickModel(config, runtimeModels, ['openai-codex/gpt-5.5', 'GPT55', 'openai-codex/gpt-5.4', 'GPT54']),
      thinking: 'high',
      verbose: 'on',
      reasoning: 'stream',
      contextBudget: 'high',
      launchLabel: 'Coding profile session',
    },
    {
      id: 'long-context',
      name: 'Long Context',
      purpose: 'Large-memory sweeps, long transcripts, documentation passes, and broad cross-file reading.',
      modelPick: pickModel(config, runtimeModels, ['google/gemini-2.5-pro', 'google/gemini-3-flash-preview', 'openai-codex/gpt-5.5', 'GPT55']),
      thinking: defaultThinking === 'off' ? 'medium' : defaultThinking,
      verbose: 'off',
      reasoning: 'on',
      contextBudget: 'large',
      launchLabel: 'Long Context profile session',
    },
  ]

  return {
    updatedAt: now.toISOString(),
    items: profiles.map(({ modelPick, ...profile }) => ({
      ...profile,
      model: modelPick.value,
      modelSource: modelPick.source,
      available: Boolean(modelPick.value),
    })),
    notes: [
      'Profiles are dashboard-owned presets for new sessions; they do not mutate OpenClaw defaults yet.',
      'The next step is persisting editable profiles after the config write/diff path exists.',
    ],
  }
}

export function buildToolInventory({ config = null, effectiveTools = null, sessionKey = 'agent:main:main', now = new Date() } = {}) {
  const toolsConfig = config?.tools ?? {}
  const pluginEntries = config?.plugins?.entries ?? {}
  const mcpServers = config?.mcp?.servers ?? {}
  const groups = Array.isArray(effectiveTools?.groups)
    ? effectiveTools.groups.map((group) => ({
        id: group.id,
        label: group.label || group.id,
        source: group.source || 'runtime',
        tools: Array.isArray(group.tools)
          ? group.tools.map((tool) => ({
              id: tool.id,
              label: tool.label || tool.id,
              source: tool.source || group.source || 'runtime',
              description: redactDescription(tool.description || tool.rawDescription),
            }))
          : [],
      }))
    : []

  const toolCount = groups.reduce((sum, group) => sum + group.tools.length, 0)
  const plugins = Object.entries(pluginEntries).map(([id, entry]) => ({
    id,
    enabled: entry?.enabled !== false,
    status: statusFromEnabled(entry?.enabled),
    hasConfig: Boolean(entry?.config),
    configKeys: entry?.config && typeof entry.config === 'object' ? Object.keys(entry.config).filter((key) => !/key|token|secret|password/i.test(key)).slice(0, 8) : [],
  }))
  const servers = Object.entries(mcpServers).map(([id, server]) => {
    const transport = server?.transport || (server?.url ? 'http' : server?.command ? 'stdio' : 'unknown')
    return {
      id,
      transport,
      status: statusFromEnabled(server?.enabled),
      command: server?.command ? redactDescription(server.command, 80) : undefined,
      urlHost: safeUrlHost(server?.url),
    }
  })

  return {
    updatedAt: now.toISOString(),
    sessionKey,
    profile: effectiveTools?.profile || toolsConfig.profile || 'not configured',
    counts: {
      groups: groups.length,
      tools: toolCount,
      plugins: plugins.length,
      mcpServers: servers.length,
    },
    toolsConfig: {
      profile: toolsConfig.profile || 'not configured',
      webSearch: toolsConfig.web?.search?.enabled ? `enabled (${toolsConfig.web.search.provider || 'provider default'})` : 'disabled or not configured',
      elevated: toolsConfig.elevated?.enabled ? 'enabled' : 'disabled or not configured',
    },
    plugins,
    mcpServers: servers,
    groups,
    notes: [
      'Tool inventory is read-only and built from gateway effective tools plus safe config metadata.',
      servers.length ? 'MCP server details intentionally omit headers, env, and secret-bearing fields.' : 'No MCP servers are configured in the current OpenClaw config.',
    ],
  }
}

export function buildSessionPermissionSummary({ sessions = [], selectedKey = '', inventory = null, patchSupportsToolsAllow = false, now = new Date() } = {}) {
  return {
    updatedAt: now.toISOString(),
    selectedKey,
    patchSupportsToolsAllow,
    sessions: sessions.slice(0, 30).map((session) => ({
      key: session.key,
      id: session.sessionId || session.id || session.key,
      label: session.label || session.key,
      state: session.state || session.status || 'unknown',
      model: session.modelProvider && session.model ? `${session.modelProvider}/${session.model}` : session.model || 'agent default',
      toolsAllow: Array.isArray(session.toolsAllow) ? session.toolsAllow : null,
    })),
    effective: inventory
      ? {
          profile: inventory.profile,
          toolCount: inventory.counts.tools,
          groupCount: inventory.counts.groups,
          groupLabels: inventory.groups.map((group) => group.label),
        }
      : null,
    notes: [
      patchSupportsToolsAllow
        ? 'This OpenClaw build exposes toolsAllow through sessions.patch; writable controls can be layered next.'
        : 'This OpenClaw build does not expose toolsAllow through sessions.patch, so Clawpoint keeps this view read-only.',
      'Cron jobs and spawned agent turns can still use toolsAllow at creation time; session-level editing needs gateway support first.',
    ],
  }
}

export function buildPermissionsHardeningSummary({
  config = null,
  gatewayUrl,
  gatewayTokenConfigured,
  tokenMasked,
  reachable = false,
  health = null,
  now = new Date(),
} = {}) {
  const gateway = config?.gateway ?? {}
  const auth = gateway.auth ?? {}
  const profiles = config?.auth?.profiles ?? {}
  const channels = health?.channels ?? {}
  const denyCommands = Array.isArray(gateway.nodes?.denyCommands) ? gateway.nodes.denyCommands : []
  const channelItems = Object.entries(channels).map(([id, channel]) => ({
    id,
    label: health?.channelLabels?.[id] || id,
    configured: Boolean(channel?.configured),
    running: Boolean(channel?.running),
    probeOk: channel?.probe?.ok === true,
    tokenSource: channel?.tokenSource || 'none',
    status: channel?.probe?.ok === true ? 'healthy' : channel?.configured ? 'warning' : 'idle',
  }))
  const profileItems = Object.entries(profiles).map(([id, profile]) => ({
    id: String(id).replace(/:.+@.+$/, ':account'),
    provider: profile?.provider || String(id).split(':')[0] || 'unknown',
    mode: profile?.mode || 'unknown',
    status: profile?.mode ? 'healthy' : 'warning',
  }))
  const controlUiInsecureAllowed = gateway.controlUi?.allowInsecureAuth === true
  const mode = authMode(config)
  const bind = gateway.bind || 'default'
  const tailscaleMode = gateway.tailscale?.mode || 'not configured'

  const checks = [
    {
      id: 'gateway-token',
      label: 'Dashboard gateway token',
      status: checkStatus(gatewayTokenConfigured),
      detail: gatewayTokenConfigured ? 'Dashboard has an environment-provided token for gateway calls.' : 'Dashboard cannot make authenticated gateway calls.',
      action: gatewayTokenConfigured ? 'Keep token material in env/root-only storage.' : 'Configure GATEWAY_TOKEN or OPENCLAW_GATEWAY_TOKEN for the service.',
    },
    {
      id: 'gateway-auth-mode',
      label: 'Gateway auth mode',
      status: checkStatus(mode === 'token'),
      detail: `Gateway auth mode is ${mode}.`,
      action: mode === 'token' ? 'Token auth is active.' : 'Prefer token auth before exposing gateway controls.',
    },
    {
      id: 'gateway-reachability',
      label: 'Gateway reachability',
      status: checkStatus(reachable),
      detail: reachable ? 'Loopback health probe succeeded.' : 'Loopback health probe failed or timed out.',
      action: reachable ? 'No action needed.' : 'Check gateway service status and port binding.',
    },
    {
      id: 'gateway-bind',
      label: 'Gateway bind posture',
      status: checkStatus(['loopback', '127.0.0.1', 'localhost', 'default'].includes(bind), bind !== 'loopback'),
      detail: `Configured bind is ${gatewayBindLabel(gateway)}.`,
      action: ['loopback', '127.0.0.1', 'localhost', 'default'].includes(bind) ? 'Loopback posture is appropriate for local dashboard use.' : 'Review before exposing beyond loopback.',
    },
    {
      id: 'control-ui-auth',
      label: 'Control UI insecure auth',
      status: controlUiInsecureAllowed ? 'warning' : 'healthy',
      detail: controlUiInsecureAllowed ? 'Control UI allows insecure auth in config.' : 'No insecure Control UI auth override is enabled.',
      action: controlUiInsecureAllowed ? 'Accept only for trusted local/dev use; disable before remote exposure.' : 'No action needed.',
    },
    {
      id: 'tailscale',
      label: 'Tailscale exposure',
      status: tailscaleMode === 'off' || tailscaleMode === 'not configured' ? 'healthy' : 'warning',
      detail: `Tailscale gateway mode is ${tailscaleMode}.`,
      action: tailscaleMode === 'off' || tailscaleMode === 'not configured' ? 'No tailnet gateway exposure detected.' : 'Confirm auth and ACLs before relying on tailnet access.',
    },
    {
      id: 'node-denylist',
      label: 'Node command denylist',
      status: denyCommands.length ? 'healthy' : 'warning',
      detail: `${denyCommands.length} sensitive node commands are denied by gateway policy.`,
      action: denyCommands.length ? 'Keep denylist reviewed as node capabilities expand.' : 'Add deny rules for high-risk node commands.',
    },
    {
      id: 'secret-redaction',
      label: 'Secret display posture',
      status: 'healthy',
      detail: 'Dashboard shows token presence/masked values only.',
      action: 'Never add raw token, API key, password, or email display to this panel.',
    },
  ]

  const statusCounts = checks.reduce((acc, check) => {
    acc[check.status] = (acc[check.status] || 0) + 1
    return acc
  }, {})

  return {
    updatedAt: now.toISOString(),
    gatewayUrl,
    tokenConfigured: Boolean(gatewayTokenConfigured),
    tokenMasked,
    posture: statusCounts.error ? 'error' : statusCounts.warning ? 'warning' : 'healthy',
    gateway: {
      mode,
      bind: gatewayBindLabel(gateway),
      reachable: Boolean(reachable),
      tailscaleMode,
      controlUiInsecureAllowed,
      nodeDenyCommandCount: denyCommands.length,
    },
    counts: {
      checks: checks.length,
      warnings: statusCounts.warning || 0,
      errors: statusCounts.error || 0,
      authProfiles: profileItems.length,
      channels: channelItems.length,
    },
    checks,
    authProfiles: profileItems,
    channels: channelItems,
    rotationChecklist: [
      { id: 'stage-new-token', label: 'Stage new gateway token in root-only service env', status: 'manual' },
      { id: 'restart-dashboard', label: 'Restart Clawpoint dev/prod service with the new token', status: 'manual' },
      { id: 'restart-gateway', label: 'Restart or reload gateway using the matching token', status: 'manual' },
      { id: 'verify-health', label: 'Verify health/config/model endpoints from dashboard', status: reachable && gatewayTokenConfigured ? 'ready' : 'blocked' },
      { id: 'remove-old-token', label: 'Remove old token from env files, shells, and service overrides', status: 'manual' },
    ],
    notes: [
      'Auth hardening is read-only: it reports posture and rotation steps without writing secrets or config.',
      'Provider account identifiers are intentionally summarized by provider/mode rather than displayed verbatim.',
    ],
  }
}

export function buildChangeAuditLog({ events = [], now = new Date() } = {}) {
  const safeMetadata = (metadata) => Object.fromEntries(
    Object.entries(metadata && typeof metadata === 'object' ? metadata : {}).filter(([key, value]) => {
      if (/token|secret|password|key|message|note|body/i.test(key)) return false
      return ['string', 'number', 'boolean'].includes(typeof value) || value == null
    }),
  )

  const items = events
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 80)
    .map((event) => ({
      id: event.id,
      timestamp: event.timestamp,
      action: event.action || 'unknown',
      target: event.target || 'unknown',
      actor: event.actor || 'dashboard',
      level: event.level || 'info',
      summary: event.summary || 'Change recorded.',
      metadata: safeMetadata(event.metadata),
    }))

  const counts = items.reduce(
    (acc, item) => {
      acc.total += 1
      acc[item.level] = (acc[item.level] || 0) + 1
      return acc
    },
    { total: 0, info: 0, warning: 0, error: 0 },
  )

  return {
    updatedAt: now.toISOString(),
    retention: 'in-memory current dashboard process, latest 80 entries',
    counts,
    items,
    notes: [
      'Audit events intentionally record action, target, status, and safe metadata only; message bodies, task notes, and secrets are omitted.',
      'This is an operator-console audit trail for dashboard-triggered writes. Durable file-backed retention can be added with the config-write flow.',
    ],
  }
}

function formatSchedule(schedule = {}) {
  if (schedule.kind === 'cron') return `${schedule.expr || 'cron'}${schedule.tz ? ` · ${schedule.tz}` : ''}`
  if (schedule.kind === 'every') return `every ${Math.round((schedule.everyMs || 0) / 1000)}s`
  if (schedule.kind === 'at') return `at ${schedule.at || 'unknown'}`
  return schedule.kind || 'not configured'
}

function isoFromMs(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? new Date(value).toISOString() : null
}

export function buildAutomationInspector({ status = null, jobs = [], now = new Date() } = {}) {
  const items = jobs.map((job) => {
    const state = job.state ?? {}
    const consecutiveErrors = Number(state.consecutiveErrors || 0)
    const lastStatus = state.lastRunStatus || state.lastStatus || 'never'
    return {
      id: job.id,
      name: job.name || job.id,
      description: redactDescription(job.description || '', 220),
      enabled: job.enabled !== false,
      scheduleKind: job.schedule?.kind || 'unknown',
      scheduleLabel: formatSchedule(job.schedule),
      sessionTarget: job.sessionTarget || 'default',
      payloadKind: job.payload?.kind || 'unknown',
      deliveryMode: job.delivery?.mode || 'default',
      nextRunAt: isoFromMs(state.nextRunAtMs),
      lastRunAt: isoFromMs(state.lastRunAtMs),
      lastRunStatus: lastStatus,
      lastDurationMs: typeof state.lastDurationMs === 'number' ? state.lastDurationMs : null,
      consecutiveErrors,
      health: job.enabled === false ? 'idle' : consecutiveErrors > 0 || /error|fail/i.test(lastStatus) ? 'warning' : 'healthy',
    }
  })

  const counts = items.reduce(
    (acc, item) => {
      acc.total += 1
      if (item.enabled) acc.enabled += 1
      else acc.disabled += 1
      if (item.consecutiveErrors > 0 || item.health === 'warning') acc.warning += 1
      return acc
    },
    { total: 0, enabled: 0, disabled: 0, warning: 0 },
  )

  return {
    updatedAt: now.toISOString(),
    scheduler: {
      enabled: status?.enabled === true,
      running: status?.running === true || (status?.running === undefined && status?.enabled === true),
      status: status?.enabled === true ? 'healthy' : 'warning',
    },
    counts,
    items,
    notes: [
      'Automation Inspector uses gateway cron APIs and hides payload message bodies, webhook URLs, tokens, and delivery destinations.',
      'Enable, disable, and run-now actions are gateway writes and are recorded in the Change Audit Log.',
    ],
  }
}

export function buildDangerZoneSummary({ gatewayReachable = false, configLoaded = false, release = 'unknown', now = new Date() } = {}) {
  return {
    updatedAt: now.toISOString(),
    posture: 'guarded',
    confirmationPhrase: 'I UNDERSTAND',
    release,
    checks: [
      {
        id: 'gateway-reachable',
        label: 'Gateway reachable',
        status: gatewayReachable ? 'healthy' : 'warning',
        detail: gatewayReachable ? 'Gateway health probe currently succeeds.' : 'Gateway health probe is failing or timed out.',
      },
      {
        id: 'config-readable',
        label: 'Config readable',
        status: configLoaded ? 'healthy' : 'warning',
        detail: configLoaded ? 'Effective config can be read for diagnostics.' : 'Effective config is unavailable to the dashboard service.',
      },
      {
        id: 'dashboard-restart',
        label: 'Dashboard restart',
        status: 'warning',
        detail: 'Restarting Clawpoint dev interrupts the dashboard briefly and relies on the user service coming back cleanly.',
      },
    ],
    actions: [
      {
        id: 'export-diagnostics',
        label: 'Export diagnostics',
        blastRadius: 'Low: downloads a safe JSON snapshot with secrets and payload bodies omitted.',
        confirmationRequired: false,
      },
      {
        id: 'clear-volatile-state',
        label: 'Clear volatile dashboard state',
        blastRadius: 'Medium: clears in-memory API log and audit buffers for the current dashboard process only.',
        confirmationRequired: true,
      },
      {
        id: 'restart-dashboard',
        label: 'Restart Clawpoint dev service',
        blastRadius: 'High: restarts this dashboard service and may disconnect the UI for a few seconds.',
        confirmationRequired: true,
      },
    ],
    unavailableActions: [
      'Gateway restart/reload is intentionally not exposed here yet; this dashboard service should not gain broad host-control powers casually.',
      'Config writes still need a diff/confirm/restart flow before becoming editable from Clawpoint.',
    ],
    notes: [
      'Danger Zone actions are intentionally narrow, explicit, and audit-logged.',
      'Confirmation is phrase-based to prevent accidental clicks; destructive host-level controls remain out of scope for this pass.',
    ],
  }
}

export function advancedRoadmapItems() {
  return [
    {
      id: 'mcp-tool-inventory',
      title: 'MCP / Tool Inventory',
      summary: 'List configured MCP/tool servers, reachability, available tools, schemas, and safe test calls.',
      status: 'implemented',
    },
    {
      id: 'per-session-permissions',
      title: 'Per-Session Tool Permissions',
      summary: 'Read effective tools per selected session now; writable allow/deny controls wait on sessions.patch toolsAllow support.',
      status: 'partial',
    },
    {
      id: 'auth-hardening',
      title: 'Permissions & Auth Hardening',
      summary: 'Add rotation checklists, scoped auth visibility, and safer gateway auth diagnostics without exposing secrets.',
      status: 'implemented',
    },
    {
      id: 'change-audit-log',
      title: 'Change Audit Log',
      summary: 'Track dashboard-triggered task edits, session setting changes, sends, and safe write metadata without logging bodies or secrets.',
      status: 'implemented',
    },
    {
      id: 'automation-inspector',
      title: 'Cron / Automation Inspector',
      summary: 'Show cron jobs, schedules, next/last run state, failures, and guarded enable/disable/run-now controls.',
      status: 'implemented',
    },
    {
      id: 'danger-zone',
      title: 'Danger Zone',
      summary: 'Guarded diagnostics export, volatile-state clearing, and Clawpoint dev restart with blast-radius copy and audit logging.',
      status: 'implemented',
    },
  ]
}
