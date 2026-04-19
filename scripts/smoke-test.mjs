const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:4176'

async function getJson(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`)
  if (!response.ok) {
    throw new Error(`${pathname} returned ${response.status}`)
  }
  return response.json()
}

async function getText(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`)
  if (!response.ok) {
    throw new Error(`${pathname} returned ${response.status}`)
  }
  return response.text()
}

const health = await getJson('/api/healthz')
if (!health.ok || health.service !== 'clawpoint') {
  throw new Error('health endpoint did not report clawpoint healthy')
}

const snapshot = await getJson('/api/dashboard')
if (!snapshot.gatewayHealth || !snapshot.sessionsOverview || !snapshot.reminderQueue) {
  throw new Error('dashboard snapshot missing expected sections')
}

const html = await getText('/')
if (!html.includes('<div id="root"></div>')) {
  throw new Error('root page did not return the app shell')
}

console.log('smoke-ok')
