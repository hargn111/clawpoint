import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { createReadStream, existsSync } from 'node:fs'
import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildGatewayHealth,
  buildReminderQueue,
  buildSessionsOverview,
  createDashboardSnapshot,
  normalizeSessionsFromGateway,
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

async function loadSessions() {
  if (GATEWAY_TOKEN) {
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

  if (!existsSync(SESSIONS_PATH)) {
    return []
  }

  const raw = await readFile(SESSIONS_PATH, 'utf8')
  const parsed = JSON.parse(raw)
  return Object.entries(parsed).map(([key, value]) => ({ key, ...value }))
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
  const [sessions, todosState, reachable] = await Promise.all([loadSessions(), loadTodos(), gatewayReachable()])
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
  const [sessions, reachable] = await Promise.all([loadSessions(), gatewayReachable()])
  return buildGatewayHealth(sessions, reachable)
}

async function buildSessionsPayload() {
  const sessions = await loadSessions()
  return buildSessionsOverview(sessions)
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
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    if (url.pathname === '/api/healthz') {
      sendJson(res, 200, {
        ok: true,
        service: 'clawpoint',
        taskgarden: existsSync(TODOS_PATH),
      })
      return
    }
    if (url.pathname === '/api/dashboard') {
      const payload = await buildDashboardSnapshot()
      sendJson(res, 200, payload)
      return
    }
    if (url.pathname === '/api/dashboard/meta') {
      const payload = await buildMetaPayload()
      sendJson(res, 200, payload)
      return
    }
    if (url.pathname === '/api/dashboard/reminders') {
      const payload = await buildReminderPayload()
      sendJson(res, 200, payload)
      return
    }
    if (url.pathname === '/api/dashboard/gateway-health') {
      const payload = await buildGatewayHealthPayload()
      sendJson(res, 200, payload)
      return
    }
    if (url.pathname === '/api/dashboard/sessions') {
      const payload = await buildSessionsPayload()
      sendJson(res, 200, payload)
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
