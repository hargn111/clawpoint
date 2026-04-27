import http from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { createReadStream, existsSync } from 'node:fs'
import { execFile as execFileCallback } from 'node:child_process'
import { spawn } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import {
  advancedRoadmapItems,
  buildAutomationInspector,
  buildDangerZoneSummary,
  buildEffectiveConfigSummary,
  buildChangeAuditLog,
  buildModelProfiles,
  buildPermissionsHardeningSummary,
  buildSessionHistoryDetail,
  buildSessionHistoryList,
  buildSessionPermissionSummary,
  buildToolInventory,
} from './server/advanced-data.mjs'
import {
  buildGatewayHealth,
  buildReminderQueue,
  buildSessionsOverview,
  createDashboardSnapshot,
  formatAge,
  normalizeSessionsFromGateway,
  sessionKind,
  sessionLabel,
  sessionState,
} from './server/dashboard-data.mjs'
import { detectOpenClawVersion } from './server/platform-meta.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DIST_DIR = path.join(__dirname, 'dist')
const TODOS_PATH = process.env.TASKGARDEN_TODOS_PATH || '/home/claw/.local/share/clawpoint/shared/todos.json'
const SESSIONS_PATH = process.env.SESSIONS_PATH || '/root/.openclaw/agents/main/sessions/sessions.json'
const GATEWAY_BASE_URL = process.env.GATEWAY_BASE_URL || 'http://127.0.0.1:18789'
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || process.env.OPENCLAW_GATEWAY_TOKEN || ''
const OPENCLAW_PACKAGE_JSON = process.env.OPENCLAW_PACKAGE_JSON || '/usr/lib/node_modules/openclaw/package.json'
const OPENCLAW_CONFIG_PATH = process.env.OPENCLAW_CONFIG_PATH || '/root/.openclaw/openclaw.json'

const host = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || 4176)
const execFile = promisify(execFileCallback)
const serverStartedAt = Date.now()
const requestEvents = []
const auditEvents = []

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
  })
  res.end(body)
}

function sendText(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache',
  })
  res.end(body)
}

function contentTypeFor(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8'
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8'
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8'
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8'
  if (filePath.endsWith('.svg')) return 'image/svg+xml'
  if (filePath.endsWith('.png')) return 'image/png'
  return 'application/octet-stream'
}

function percentile(values, ratio) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * ratio)))
  return sorted[index]
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function recordRequestEvent(method, pathname, status, durationMs) {
  if (!pathname.startsWith('/api/')) return
  const event = {
    id: randomUUID().slice(0, 8),
    timestamp: new Date().toISOString(),
    method,
    path: pathname,
    status,
    level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
    durationMs,
  }
  requestEvents.push(event)
  if (requestEvents.length > 250) {
    requestEvents.splice(0, requestEvents.length - 250)
  }
}

function recordAuditEvent({ action, target, level = 'info', summary, metadata = {} }) {
  const safeMetadata = Object.fromEntries(
    Object.entries(metadata).filter(([key, value]) => {
      if (/token|secret|password|key|message|note|body/i.test(key)) return false
      return ['string', 'number', 'boolean'].includes(typeof value) || value == null
    }),
  )
  auditEvents.push({
    id: randomUUID().slice(0, 8),
    timestamp: new Date().toISOString(),
    actor: 'dashboard',
    action,
    target,
    level,
    summary,
    metadata: safeMetadata,
  })
  if (auditEvents.length > 250) {
    auditEvents.splice(0, auditEvents.length - 250)
  }
}

function requestMetricsSnapshot(now = Date.now()) {
  const lastMinute = requestEvents.filter((event) => now - new Date(event.timestamp).getTime() <= 60_000)
  const latencies = requestEvents.slice(-24).map((event) => event.durationMs)
  const avgLatencyMs = latencies.length
    ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
    : 0

  return {
    requestsPerMinute: lastMinute.length,
    avgLatencyMs,
    p95LatencyMs: Math.round(percentile(latencies, 0.95)),
    latencySamples: latencies,
    uptimeLabel: formatDuration(now - serverStartedAt),
    lastRestartAt: new Date(serverStartedAt).toISOString(),
  }
}

function maskedToken(token) {
  if (!token) return 'not configured'
  const visible = token.slice(-4)
  return `${'*'.repeat(Math.max(4, token.length - 4))}${visible}`
}

async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk))
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

async function gatewayReachable() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 900)
  try {
    const response = await fetch(`${GATEWAY_BASE_URL}/healthz`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

async function gatewayCall(method, params = {}) {
  if (!GATEWAY_TOKEN) {
    throw new Error(`Gateway token not configured for ${method}`)
  }

  const { stdout } = await execFile(
    'openclaw',
    ['gateway', 'call', method, '--json', '--token', GATEWAY_TOKEN, '--params', JSON.stringify(params)],
    {
      env: process.env,
      timeout: 15000,
      maxBuffer: 1024 * 1024 * 8,
    },
  )

  return JSON.parse(stdout)
}

async function loadTodos() {
  if (!existsSync(TODOS_PATH)) {
    return { available: false, items: [] }
  }
  try {
    const raw = await readFile(TODOS_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    return {
      available: true,
      items: Array.isArray(parsed.items) ? parsed.items : [],
    }
  } catch {
    return { available: false, items: [] }
  }
}

async function loadSessionsFromStore() {
  if (!existsSync(SESSIONS_PATH)) {
    return []
  }

  const raw = await readFile(SESSIONS_PATH, 'utf8')
  const parsed = JSON.parse(raw)
  return Object.entries(parsed).map(([key, value]) => ({ key, ...value }))
}

async function loadSessionsFromGateway(params = {}) {
  if (!GATEWAY_TOKEN) {
    return loadSessionsFromStore()
  }

  const parsed = await gatewayCall('sessions.list', params)
  return normalizeSessionsFromGateway(parsed)
}

function sessionTranscriptPath(session) {
  const directPath = typeof session?.sessionFile === 'string' ? session.sessionFile : ''
  const sessionDir = path.dirname(SESSIONS_PATH)
  const candidates = [
    directPath,
    session?.sessionId ? path.join(sessionDir, `${session.sessionId}.jsonl`) : '',
    session?.id ? path.join(sessionDir, `${session.id}.jsonl`) : '',
  ].filter(Boolean)

  return candidates.find((candidate) => {
    const normalized = path.normalize(candidate)
    return normalized.startsWith(sessionDir) && existsSync(normalized)
  })
}

async function readSessionMessagesFromJsonl(session, limit = 200) {
  const filePath = sessionTranscriptPath(session)
  if (!filePath) return []
  const raw = await readFile(filePath, 'utf8')
  const messages = []
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue
    try {
      const event = JSON.parse(line)
      if (event?.type === 'message' && event.message) {
        messages.push({ ...event.message, timestamp: event.message.timestamp ?? event.timestamp })
      }
    } catch {
      // Ignore malformed historical lines; this is a friendly viewer, not a raw log validator.
    }
  }
  return messages.slice(-Math.max(1, limit))
}

async function loadSessionModelOptions() {
  if (!GATEWAY_TOKEN) {
    return {
      updatedAt: new Date().toISOString(),
      items: [],
    }
  }

  const parsed = await gatewayCall('models.list', {})
  const items = Array.isArray(parsed.models)
    ? parsed.models.map((model) => ({
        value: `${model.provider}/${model.id}`,
        label: model.alias ? `${model.alias} · ${model.name}` : model.name,
        provider: model.provider,
        id: model.id,
        alias: model.alias,
        reasoning: Boolean(model.reasoning),
        contextWindow: model.contextWindow,
      }))
    : []

  return {
    updatedAt: new Date().toISOString(),
    items,
  }
}

async function loadOpenClawConfig() {
  try {
    const raw = await readFile(OPENCLAW_CONFIG_PATH, 'utf8')
    return { config: JSON.parse(raw), loaded: true }
  } catch {
    return { config: null, loaded: false }
  }
}

async function loadGatewayConfig() {
  if (!GATEWAY_TOKEN) return null
  const payload = await gatewayCall('config.get', {})
  return payload.config || payload.parsed || payload.runtimeConfig || null
}

async function loadBestAvailableConfig() {
  const gatewayConfig = await loadGatewayConfig().catch(() => null)
  if (gatewayConfig) return { config: gatewayConfig, loaded: true, source: 'gateway config.get' }
  const local = await loadOpenClawConfig()
  return { config: local.config, loaded: local.loaded, source: local.loaded ? 'local config file' : 'unavailable' }
}

async function advancedConfigSummary() {
  const [{ config, loaded }, openclawVersion, sessionModels] = await Promise.all([
    loadBestAvailableConfig(),
    detectOpenClawVersion(OPENCLAW_PACKAGE_JSON),
    loadSessionModelOptions().catch(() => ({ items: [] })),
  ])

  return buildEffectiveConfigSummary({
    config,
    configPath: OPENCLAW_CONFIG_PATH,
    configLoaded: loaded,
    openclawVersion,
    gatewayBaseUrl: GATEWAY_BASE_URL,
    gatewayTokenConfigured: Boolean(GATEWAY_TOKEN),
    todosPath: TODOS_PATH,
    sessionsPath: SESSIONS_PATH,
    packageJsonPath: OPENCLAW_PACKAGE_JSON,
    runtimeModelCount: sessionModels.items.length,
    runtimeModelSource: sessionModels.items.length ? 'gateway models.list' : null,
  })
}

async function advancedModelProfiles() {
  const { config } = await loadBestAvailableConfig()
  const sessionModels = await loadSessionModelOptions().catch(() => ({ items: [] }))
  return buildModelProfiles({ config, runtimeModels: sessionModels.items })
}

async function advancedToolInventory(sessionKey = 'agent:main:main') {
  const [{ config }, effectiveTools] = await Promise.all([
    loadBestAvailableConfig(),
    GATEWAY_TOKEN ? gatewayCall('tools.effective', { sessionKey }).catch(() => null) : Promise.resolve(null),
  ])
  return buildToolInventory({ config, effectiveTools, sessionKey })
}

async function advancedSessionPermissions(sessionKey = '') {
  const sessions = await loadSessionsFromGateway().catch(() => [])
  const selectedKey = sessionKey || sessions[0]?.key || 'agent:main:main'
  const inventory = selectedKey ? await advancedToolInventory(selectedKey).catch(() => null) : null
  return buildSessionPermissionSummary({
    sessions,
    selectedKey,
    inventory,
    patchSupportsToolsAllow: false,
  })
}

async function advancedSessionHistoryList() {
  const sessions = await loadSessionsFromGateway({ limit: 100, includeGlobal: true, includeUnknown: true, includeDerivedTitles: true }).catch(() => [])
  const keys = sessions.map((session) => session.key).filter(Boolean).slice(0, 64)
  let previews = []
  if (keys.length && GATEWAY_TOKEN) {
    previews = (await gatewayCall('sessions.preview', { keys, limit: 4, maxChars: 220 }).catch(() => ({ previews: [] })))?.previews ?? []
  }
  if (!previews.length) {
    previews = await Promise.all(sessions.slice(0, 64).map(async (session) => {
      const messages = await readSessionMessagesFromJsonl(session, 4).catch(() => [])
      return {
        key: session.key,
        status: messages.length ? 'ok' : 'missing',
        items: messages.map((message) => {
          const role = message.role || 'event'
          const text = role === 'toolResult'
            ? 'Tool result hidden in friendly viewer.'
            : String(message.content?.find?.((entry) => entry?.type === 'text')?.text || '').slice(0, 220)
          return { role, text: text || '[non-text message]' }
        }),
      }
    }))
  }
  return buildSessionHistoryList({ sessions, previews })
}

async function advancedSessionHistoryDetail(sessionKey = '') {
  if (!sessionKey) {
    const error = new Error('Session key is required.')
    error.statusCode = 400
    throw error
  }
  const [sessions, payload] = await Promise.all([
    loadSessionsFromGateway({ limit: 100, includeGlobal: true, includeUnknown: true, includeDerivedTitles: true }).catch(() => []),
    gatewayCall('sessions.get', { key: sessionKey, limit: 200 }).catch(() => ({ messages: [] })),
  ])
  const session = sessions.find((item) => item.key === sessionKey)
  const messages = payload?.messages?.length ? payload.messages : await readSessionMessagesFromJsonl(session, 200).catch(() => [])
  return buildSessionHistoryDetail({ key: sessionKey, session, messages })
}

async function advancedRoadmap() {
  return {
    updatedAt: new Date().toISOString(),
    items: advancedRoadmapItems(),
  }
}

async function advancedChangeAuditLog() {
  return buildChangeAuditLog({ events: auditEvents })
}

async function advancedAutomationInspector() {
  if (!GATEWAY_TOKEN) {
    return buildAutomationInspector({
      status: { enabled: false, running: false },
      jobs: [],
    })
  }
  const [status, list] = await Promise.all([
    gatewayCall('cron.status', {}).catch(() => null),
    gatewayCall('cron.list', { includeDisabled: true }).catch(() => ({ jobs: [] })),
  ])
  return buildAutomationInspector({ status, jobs: list?.jobs ?? [] })
}

async function updateAutomationJob(id, action) {
  if (action === 'enable' || action === 'disable') {
    await gatewayCall('cron.update', { id, patch: { enabled: action === 'enable' } })
    recordAuditEvent({
      action: `cron.${action}`,
      target: id,
      summary: action === 'enable' ? 'Enabled a cron job from the dashboard.' : 'Disabled a cron job from the dashboard.',
      metadata: { enabled: action === 'enable' },
    })
    return { ok: true }
  }
  if (action === 'run-now') {
    await gatewayCall('cron.run', { id, runMode: 'force' })
    recordAuditEvent({
      action: 'cron.run-now',
      target: id,
      summary: 'Triggered a cron job run from the dashboard.',
      metadata: { runMode: 'force' },
    })
    return { ok: true }
  }
  throw new Error(`Unsupported automation action: ${action}`)
}

async function advancedDangerZoneSummary() {
  const [{ loaded }, reachable] = await Promise.all([loadBestAvailableConfig(), gatewayReachable()])
  return buildDangerZoneSummary({
    gatewayReachable: reachable,
    configLoaded: loaded,
    release: __dirname,
  })
}

async function dangerDiagnostics() {
  const [meta, health, roadmap, automation, permissions] = await Promise.all([
    buildMetaPayload().catch((error) => ({ error: String(error?.message || error) })),
    buildGatewayHealthPayload().catch((error) => ({ error: String(error?.message || error) })),
    advancedRoadmap().catch((error) => ({ error: String(error?.message || error) })),
    advancedAutomationInspector().catch((error) => ({ error: String(error?.message || error) })),
    permissionsSummary().catch((error) => ({ error: String(error?.message || error) })),
  ])
  return {
    exportedAt: new Date().toISOString(),
    release: __dirname,
    meta,
    health,
    roadmap,
    automation,
    permissions,
    notes: ['Diagnostic export omits raw config, payload bodies, delivery destinations, tokens, and secrets.'],
  }
}

async function runDangerAction(action, body = {}) {
  if (action === 'export-diagnostics') {
    recordAuditEvent({
      action: 'danger.export-diagnostics',
      target: 'clawpoint-dev',
      summary: 'Exported dashboard diagnostics.',
      metadata: { release: __dirname },
    })
    return dangerDiagnostics()
  }

  if (body.confirmation !== 'I UNDERSTAND') {
    const error = new Error('Confirmation phrase is required.')
    error.statusCode = 400
    throw error
  }

  if (action === 'clear-volatile-state') {
    requestEvents.splice(0, requestEvents.length)
    auditEvents.splice(0, auditEvents.length)
    recordAuditEvent({
      action: 'danger.clear-volatile-state',
      target: 'clawpoint-dev',
      summary: 'Cleared in-memory dashboard API and audit buffers.',
      metadata: { release: __dirname },
    })
    return { ok: true }
  }

  if (action === 'restart-dashboard') {
    recordAuditEvent({
      action: 'danger.restart-dashboard',
      target: 'clawpoint-dev.service',
      summary: 'Requested Clawpoint dev service restart from Danger Zone.',
      metadata: { release: __dirname },
    })
    const child = spawn('bash', ['-lc', 'sleep 1; systemctl --user restart clawpoint-dev.service'], {
      detached: true,
      stdio: 'ignore',
    })
    child.unref()
    return { ok: true, restarting: true }
  }

  throw new Error(`Unsupported danger action: ${action}`)
}

function dashboardMeta(todosAvailable, now = new Date()) {
  return {
    updatedAt: now.toISOString(),
    integrations: {
      taskgarden: {
        available: todosAvailable,
      },
    },
  }
}

async function loadSessionsForSnapshot() {
  try {
    const storeSessions = await loadSessionsFromStore()
    if (storeSessions.length) return storeSessions
  } catch {
    // The dev dashboard often runs as an unprivileged user; root-owned session
    // files may not be readable there. Fall through to a bounded gateway lookup.
  }

  if (!GATEWAY_TOKEN) return []

  return Promise.race([
    loadSessionsFromGateway().catch(() => []),
    new Promise((resolve) => setTimeout(() => resolve([]), 750)),
  ])
}

async function buildDashboardSnapshot() {
  const [sessions, todosState, reachable] = await Promise.all([loadSessionsForSnapshot(), loadTodos(), gatewayReachable()])
  return createDashboardSnapshot({
    sessions,
    todosAvailable: todosState.available,
    todos: todosState.items,
    reachable,
  })
}

async function buildMetaPayload() {
  const [todosState, openclawVersion] = await Promise.all([loadTodos(), detectOpenClawVersion(OPENCLAW_PACKAGE_JSON)])
  return {
    ...dashboardMeta(todosState.available),
    platform: {
      openclawVersion,
    },
  }
}

async function buildReminderPayload() {
  const todosState = await loadTodos()
  return buildReminderQueue(todosState.available ? todosState.items : [])
}

async function buildGatewayHealthPayload() {
  const reachable = await gatewayReachable()
  let sessions = []
  try {
    sessions = await loadSessionsFromStore()
  } catch {
    sessions = []
  }

  const payload = buildGatewayHealth(sessions, reachable)
  const metrics = requestMetricsSnapshot()
  payload.data = {
    ...payload.data,
    ...metrics,
  }
  return payload
}

async function buildSessionsPayload() {
  const sessions = await loadSessionsFromGateway()
  return buildSessionsOverview(sessions)
}

async function saveTodos(items) {
  const payload = {
    version: 1,
    items,
  }
  await writeFile(TODOS_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

async function listTaskgardenTasks() {
  const todosState = await loadTodos()
  return {
    updatedAt: new Date().toISOString(),
    items: todosState.items,
  }
}

async function getTaskById(id) {
  const todosState = await loadTodos()
  return todosState.items.find((item) => item.id === id) ?? null
}

async function createTaskgardenTask(input) {
  const todosState = await loadTodos()
  const item = {
    id: randomUUID().replace(/-/g, '').slice(0, 8),
    title: input.title.trim(),
    bucket: input.bucket || 'unplanned',
    status: 'open',
    note: input.note || '',
    tags: [],
    created_at: new Date().toISOString(),
    completed_at: null,
    remind_interval_hours: typeof input.remindIntervalHours === 'number' ? input.remindIntervalHours : null,
    last_reminder_at: null,
  }
  await saveTodos([...todosState.items, item])
  recordAuditEvent({
    action: 'task.create',
    target: item.id,
    summary: 'Created a Task Garden task.',
    metadata: { bucket: item.bucket, remindIntervalHours: item.remind_interval_hours },
  })
  return item
}

async function updateTaskgardenTask(id, input) {
  const todosState = await loadTodos()
  const current = todosState.items.find((item) => item.id === id)
  if (!current) {
    throw new Error(`Task not found: ${id}`)
  }

  if (typeof input.title === 'string' && input.title.trim()) {
    current.title = input.title.trim()
  }
  if (typeof input.bucket === 'string') {
    current.bucket = input.bucket
  }
  if (typeof input.status === 'string') {
    current.status = input.status
    current.completed_at = input.status === 'done' ? new Date().toISOString() : null
  }
  if ('remindIntervalHours' in input) {
    current.remind_interval_hours = typeof input.remindIntervalHours === 'number' ? input.remindIntervalHours : null
    if (current.remind_interval_hours == null) {
      current.last_reminder_at = null
    }
  }
  if (typeof input.appendNote === 'string' && input.appendNote.trim()) {
    current.note = current.note ? `${current.note}\n${input.appendNote.trim()}` : input.appendNote.trim()
  }

  await saveTodos(todosState.items)
  recordAuditEvent({
    action: 'task.update',
    target: id,
    summary: 'Updated a Task Garden task.',
    metadata: { status: current.status, bucket: current.bucket, reminderConfigured: current.remind_interval_hours != null },
  })
  return current
}

function buildSessionAdminList(sessions, now = new Date()) {
  const items = sessions
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
    .slice(0, 20)
    .map((session) => {
      const ageMs = now.getTime() - Number(session.updatedAt || 0)
      return {
        id: session.sessionId,
        key: session.key,
        label: sessionLabel(session),
        kind: sessionKind(session),
        state: sessionState(ageMs),
        summary: `${formatAge(ageMs)} · ${session.lastChannel || 'direct'} · ${session.chatType || 'n/a'}`,
        updatedAt: Number(session.updatedAt || 0),
        chatType: session.chatType || 'direct',
        channel: session.lastChannel || 'direct',
        status: session.status,
        model: session.model,
        modelProvider: session.modelProvider,
        thinkingLevel: session.thinkingLevel,
        verboseLevel: session.verboseLevel,
        reasoningLevel: session.reasoningLevel,
        lastTo: session.lastTo,
      }
    })

  return {
    updatedAt: now.toISOString(),
    items,
  }
}

async function patchSessionSettings(key, input) {
  const payload = { key }
  if ('label' in input) payload.label = input.label?.trim() || null
  if ('model' in input) payload.model = input.model?.trim() || null
  if ('thinking' in input && input.thinking) payload.thinkingLevel = input.thinking
  if ('verbose' in input && input.verbose) payload.verboseLevel = input.verbose
  if ('reasoning' in input && input.reasoning) payload.reasoningLevel = input.reasoning
  const result = await gatewayCall('sessions.patch', payload)
  recordAuditEvent({
    action: 'session.patch',
    target: key,
    summary: 'Updated session settings.',
    metadata: {
      labelChanged: 'label' in input,
      modelChanged: 'model' in input,
      thinking: input.thinking,
      verbose: input.verbose,
      reasoning: input.reasoning,
    },
  })
  return result
}

async function sendMessageToSession(key, input) {
  const payload = {
    key,
    message: input.message,
  }
  if (input.channel?.trim()) payload.channel = input.channel.trim()
  if (input.thinking && input.thinking !== 'off') payload.thinking = input.thinking
  const result = await gatewayCall('sessions.send', payload)
  recordAuditEvent({
    action: 'session.message',
    target: key,
    summary: 'Sent a dashboard-authored message to a session.',
    metadata: { channel: input.channel?.trim() || 'default', thinking: input.thinking || 'default' },
  })
  return result
}

async function createSession(input) {
  const created = await gatewayCall('sessions.create', {})
  const key = created.key
  const sessionId = created.sessionId

  if (input.label?.trim() || input.model?.trim() || input.thinking || input.verbose || input.reasoning) {
    await patchSessionSettings(key, input)
  }

  if (input.message?.trim()) {
    await sendMessageToSession(key, {
      message: input.message.trim(),
      channel: input.channel,
    })
  }

  recordAuditEvent({
    action: 'session.create',
    target: key,
    summary: 'Created a session from the dashboard.',
    metadata: { sessionId, hasInitialMessage: Boolean(input.message?.trim()), model: input.model || 'default' },
  })

  return { ok: true, sessionId, key }
}

async function permissionsSummary() {
  const [{ config }, reachable, health] = await Promise.all([
    loadBestAvailableConfig(),
    gatewayReachable(),
    GATEWAY_TOKEN
      ? Promise.race([
          gatewayCall('health', {}).catch(() => null),
          new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
        ])
      : Promise.resolve(null),
  ])

  return buildPermissionsHardeningSummary({
    config,
    gatewayUrl: GATEWAY_BASE_URL,
    gatewayTokenConfigured: Boolean(GATEWAY_TOKEN),
    tokenMasked: maskedToken(GATEWAY_TOKEN),
    reachable,
    health,
  })
}

async function legacyPermissionsSummary() {
  return {
    updatedAt: new Date().toISOString(),
    gatewayUrl: GATEWAY_BASE_URL,
    tokenConfigured: Boolean(GATEWAY_TOKEN),
    tokenMasked: maskedToken(GATEWAY_TOKEN),
    notes: [
      'Gateway auth is configured through environment for the dev service.',
      'Key rotation and scoped auth rules still need first-class backend routes.',
    ],
  }
}

async function logsEvents() {
  return {
    updatedAt: new Date().toISOString(),
    items: [...requestEvents].reverse(),
  }
}

async function serveStatic(req, res) {
  const requestPath = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname
  const cleanPath = requestPath === '/' ? '/index.html' : requestPath
  const filePath = path.join(DIST_DIR, cleanPath)
  const normalized = path.normalize(filePath)
  if (!normalized.startsWith(DIST_DIR)) {
    sendText(res, 403, 'Forbidden')
    return
  }

  const target = existsSync(normalized) ? normalized : path.join(DIST_DIR, 'index.html')
  const headers = {
    'Content-Type': contentTypeFor(target),
    'Cache-Control': target.endsWith('.html')
      ? 'no-store, max-age=0, must-revalidate'
      : 'public, max-age=31536000, immutable',
  }
  res.writeHead(200, headers)
  createReadStream(target).pipe(res)
}

const server = http.createServer(async (req, res) => {
  const requestStartedAt = Date.now()
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  res.on('finish', () => {
    recordRequestEvent(req.method || 'GET', url.pathname, res.statusCode, Date.now() - requestStartedAt)
  })

  try {
    if (url.pathname === '/api/healthz') {
      sendJson(res, 200, {
        ok: true,
        service: 'clawpoint',
        taskgarden: existsSync(TODOS_PATH),
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/dashboard') {
      sendJson(res, 200, await buildDashboardSnapshot())
      return
    }
    if (req.method === 'GET' && url.pathname === '/api/dashboard/meta') {
      sendJson(res, 200, await buildMetaPayload())
      return
    }
    if (req.method === 'GET' && url.pathname === '/api/dashboard/reminders') {
      sendJson(res, 200, await buildReminderPayload())
      return
    }
    if (req.method === 'GET' && url.pathname === '/api/dashboard/gateway-health') {
      sendJson(res, 200, await buildGatewayHealthPayload())
      return
    }
    if (req.method === 'GET' && url.pathname === '/api/dashboard/sessions') {
      sendJson(res, 200, await buildSessionsPayload())
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/taskgarden/tasks') {
      sendJson(res, 200, await listTaskgardenTasks())
      return
    }
    if (req.method === 'POST' && url.pathname === '/api/taskgarden/tasks') {
      const body = await readJsonBody(req)
      const item = await createTaskgardenTask(body)
      sendJson(res, 200, { item })
      return
    }
    if (req.method === 'PATCH' && url.pathname.startsWith('/api/taskgarden/tasks/')) {
      const id = url.pathname.split('/').pop()
      const body = await readJsonBody(req)
      const item = await updateTaskgardenTask(id, body)
      sendJson(res, 200, { item })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/session-admin/sessions') {
      const sessions = await loadSessionsFromGateway()
      sendJson(res, 200, buildSessionAdminList(sessions))
      return
    }
    if (req.method === 'GET' && url.pathname === '/api/session-admin/models') {
      sendJson(res, 200, await loadSessionModelOptions())
      return
    }
    if (req.method === 'POST' && url.pathname === '/api/session-admin/sessions') {
      const body = await readJsonBody(req)
      sendJson(res, 200, await createSession(body))
      return
    }
    if (req.method === 'PATCH' && url.pathname.startsWith('/api/session-admin/sessions/')) {
      const body = await readJsonBody(req)
      const sessionKey = body.key
      if (!sessionKey) {
        sendJson(res, 400, { error: 'Session key is required.' })
        return
      }
      await patchSessionSettings(sessionKey, body)
      sendJson(res, 200, { ok: true })
      return
    }
    if (req.method === 'POST' && url.pathname.startsWith('/api/session-admin/sessions/')) {
      const parts = url.pathname.split('/').filter(Boolean)
      const action = parts[4]
      if (action === 'message') {
        const body = await readJsonBody(req)
        const sessionKey = body.key
        if (!sessionKey) {
          sendJson(res, 400, { error: 'Session key is required.' })
          return
        }
        await sendMessageToSession(sessionKey, body)
        sendJson(res, 200, { ok: true })
        return
      }
    }

    if (req.method === 'GET' && url.pathname === '/api/logs/events') {
      sendJson(res, 200, await logsEvents())
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/permissions/summary') {
      sendJson(res, 200, await permissionsSummary())
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/advanced/effective-config') {
      sendJson(res, 200, await advancedConfigSummary())
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/advanced/model-profiles') {
      sendJson(res, 200, await advancedModelProfiles())
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/advanced/tool-inventory') {
      sendJson(res, 200, await advancedToolInventory(url.searchParams.get('sessionKey') || 'agent:main:main'))
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/advanced/session-permissions') {
      sendJson(res, 200, await advancedSessionPermissions(url.searchParams.get('sessionKey') || ''))
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/advanced/session-history') {
      sendJson(res, 200, await advancedSessionHistoryList())
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/advanced/session-history/detail') {
      sendJson(res, 200, await advancedSessionHistoryDetail(url.searchParams.get('sessionKey') || ''))
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/advanced/roadmap') {
      sendJson(res, 200, await advancedRoadmap())
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/advanced/change-audit-log') {
      sendJson(res, 200, await advancedChangeAuditLog())
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/advanced/automation-inspector') {
      sendJson(res, 200, await advancedAutomationInspector())
      return
    }

    if (req.method === 'POST' && url.pathname.startsWith('/api/advanced/automation-inspector/')) {
      const parts = url.pathname.split('/').filter(Boolean)
      const id = decodeURIComponent(parts[3] || '')
      const action = parts[4]
      if (!id || !action) {
        sendJson(res, 400, { error: 'Automation job id and action are required.' })
        return
      }
      sendJson(res, 200, await updateAutomationJob(id, action))
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/advanced/danger-zone') {
      sendJson(res, 200, await advancedDangerZoneSummary())
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/advanced/danger-zone/diagnostics') {
      sendJson(res, 200, await runDangerAction('export-diagnostics'))
      return
    }

    if (req.method === 'POST' && url.pathname.startsWith('/api/advanced/danger-zone/')) {
      const action = url.pathname.split('/').filter(Boolean)[3]
      const body = await readJsonBody(req)
      sendJson(res, 200, await runDangerAction(action, body))
      return
    }

    await serveStatic(req, res)
  } catch (error) {
    sendJson(res, error?.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : 500, {
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

server.listen(port, host, () => {
  console.log(`OpenClaw dashboard server listening on http://${host}:${port}`)
})
