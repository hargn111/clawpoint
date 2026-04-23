import http from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { createReadStream, existsSync } from 'node:fs'
import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DIST_DIR = path.join(__dirname, 'dist')
const TODOS_PATH = process.env.TASKGARDEN_TODOS_PATH || '/home/claw/.local/share/clawpoint/shared/todos.json'
const SESSIONS_PATH = process.env.SESSIONS_PATH || '/root/.openclaw/agents/main/sessions/sessions.json'
const GATEWAY_BASE_URL = process.env.GATEWAY_BASE_URL || 'http://127.0.0.1:18789'
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || process.env.OPENCLAW_GATEWAY_TOKEN || ''

const host = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || 4176)
const execFile = promisify(execFileCallback)
const serverStartedAt = Date.now()
const requestEvents = []

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
  const timeout = setTimeout(() => controller.abort(), 3000)
  try {
    const response = await fetch(`${GATEWAY_BASE_URL}/`, {
      signal: controller.signal,
    })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
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

async function loadSessionsFromGateway() {
  if (!GATEWAY_TOKEN) {
    return loadSessionsFromStore()
  }

  const { stdout } = await execFile(
    'openclaw',
    ['gateway', 'call', 'sessions.list', '--json', '--token', GATEWAY_TOKEN, '--params', '{}'],
    {
      env: process.env,
      timeout: 10000,
      maxBuffer: 1024 * 1024 * 4,
    },
  )
  const parsed = JSON.parse(stdout)
  return normalizeSessionsFromGateway(parsed)
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

async function buildDashboardSnapshot() {
  const [sessions, todosState, reachable] = await Promise.all([loadSessionsFromGateway(), loadTodos(), gatewayReachable()])
  return createDashboardSnapshot({
    sessions,
    todosAvailable: todosState.available,
    todos: todosState.items,
    reachable,
  })
}

async function buildMetaPayload() {
  const todosState = await loadTodos()
  return dashboardMeta(todosState.available)
}

async function buildReminderPayload() {
  const todosState = await loadTodos()
  return buildReminderQueue(todosState.available ? todosState.items : [])
}

async function buildGatewayHealthPayload() {
  const [sessions, reachable] = await Promise.all([loadSessionsFromGateway(), gatewayReachable()])
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
      }
    })

  return {
    updatedAt: now.toISOString(),
    items,
  }
}

async function sendAgentMessageToSession(sessionId, input) {
  const args = ['agent', '--session-id', sessionId, '--message', input.message, '--json', '--timeout', '120']
  if (input.thinking && input.thinking !== 'off') {
    args.push('--thinking', input.thinking)
  }
  if (input.verbose) {
    args.push('--verbose', input.verbose)
  }

  await execFile('openclaw', args, {
    env: process.env,
    timeout: 150000,
    maxBuffer: 1024 * 1024 * 4,
  })
}

async function createSession(input) {
  const sessionId = randomUUID()
  await sendAgentMessageToSession(sessionId, input)
  return { ok: true, sessionId }
}

async function permissionsSummary() {
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
    if (req.method === 'POST' && url.pathname === '/api/session-admin/sessions') {
      const body = await readJsonBody(req)
      sendJson(res, 200, await createSession(body))
      return
    }
    if (req.method === 'POST' && url.pathname.startsWith('/api/session-admin/sessions/')) {
      const parts = url.pathname.split('/').filter(Boolean)
      const sessionId = parts[3]
      const action = parts[4]
      if (action === 'message') {
        const body = await readJsonBody(req)
        await sendAgentMessageToSession(sessionId, body)
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

    await serveStatic(req, res)
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

server.listen(port, host, () => {
  console.log(`OpenClaw dashboard server listening on http://${host}:${port}`)
})
