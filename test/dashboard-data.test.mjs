import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  createDashboardSnapshot,
  buildReminderQueue,
  buildSessionsOverview,
  formatDueLabel,
  normalizeSessionsFromGateway,
} from '../server/dashboard-data.mjs'
import {
  advancedRoadmapItems,
  buildAutomationInspector,
  buildChangeAuditLog,
  buildDangerZoneSummary,
  buildEffectiveConfigSummary,
  buildModelProfiles,
  buildPermissionsHardeningSummary,
  buildSessionHistoryDetail,
  buildSessionHistoryList,
  buildSessionPermissionSummary,
  buildToolInventory,
} from '../server/advanced-data.mjs'
import { detectOpenClawVersion } from '../server/platform-meta.mjs'

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

test('detectOpenClawVersion reads package metadata and falls back to null', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'clawpoint-platform-'))
  try {
    const packagePath = path.join(tempDir, 'package.json')
    await writeFile(packagePath, JSON.stringify({ version: '2026.4.23' }), 'utf8')

    assert.equal(await detectOpenClawVersion(packagePath), '2026.4.23')
    assert.equal(await detectOpenClawVersion(path.join(tempDir, 'missing.json')), null)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('buildEffectiveConfigSummary exposes safe source-labelled config values', () => {
  const summary = buildEffectiveConfigSummary({
    configPath: '/tmp/openclaw.json',
    configLoaded: true,
    openclawVersion: '2026.4.23',
    gatewayBaseUrl: 'http://127.0.0.1:18789',
    gatewayTokenConfigured: true,
    todosPath: '/tmp/todos.json',
    sessionsPath: '/tmp/sessions.json',
    packageJsonPath: '/tmp/package.json',
    now: new Date('2026-04-26T19:00:00Z'),
    env: { GATEWAY_TOKEN: 'secret-token' },
    config: {
      agents: {
        defaults: {
          model: { primary: 'openai-codex/gpt-5.5', fallbacks: [] },
          thinkingDefault: 'medium',
          models: { 'openai-codex/gpt-5.5': { alias: 'GPT55' } },
        },
      },
      gateway: { auth: { enabled: true }, bind: '127.0.0.1', port: 18789 },
    },
  })

  assert.equal(summary.readOnly, true)
  assert.equal(summary.items.find((item) => item.key === 'default-model').value, 'openai-codex/gpt-5.5')
  assert.equal(summary.items.find((item) => item.key === 'dashboard-token').value, 'configured')
  assert.equal(summary.items.find((item) => item.key === 'dashboard-token').sensitive, true)
  assert.equal(summary.items.some((item) => item.value === 'secret-token'), false)
})

test('buildModelProfiles returns launchable presets from configured models', () => {
  const profiles = buildModelProfiles({
    now: new Date('2026-04-26T19:00:00Z'),
    config: {
      agents: {
        defaults: {
          thinkingDefault: 'medium',
          model: { primary: 'openai-codex/gpt-5.5' },
          models: {
            'openai-codex/gpt-5.5': { alias: 'GPT55' },
            'google/gemini-3-flash-preview': {},
            'google/gemini-2.5-pro': {},
          },
        },
      },
    },
  })

  assert.deepEqual(
    profiles.items.map((profile) => profile.id),
    ['fast', 'careful', 'coding', 'long-context'],
  )
  assert.equal(profiles.items.find((profile) => profile.id === 'fast').model, 'google/gemini-3-flash-preview')
  assert.equal(profiles.items.find((profile) => profile.id === 'coding').thinking, 'high')
})

test('buildModelProfiles falls back to runtime model options when config is unreadable', () => {
  const profiles = buildModelProfiles({
    runtimeModels: [
      { value: 'deepseek/deepseek-chat' },
      { value: 'openai-codex/gpt-5.5', alias: 'GPT55' },
      { value: 'google/gemini-3-flash-preview' },
    ],
  })

  assert.equal(profiles.items.find((profile) => profile.id === 'fast').model, 'google/gemini-3-flash-preview')
  assert.equal(profiles.items.find((profile) => profile.id === 'careful').model, 'openai-codex/gpt-5.5')
})

test('advancedRoadmapItems tracks next-era roadmap status and shipped foundations', () => {
  const items = advancedRoadmapItems()
  assert.ok(items.length >= 16)
  assert.equal(items[0].title, 'Personal Operations Home')
  assert.equal(items[0].status, 'implemented')
  assert.ok(items[0].summary.includes('configurable local landing cards'))
  assert.ok(items[0].nextSteps.some((step) => step.includes('preferred landing tab')))
  assert.equal(items[1].title, 'Unified Work Queue')
  assert.equal(items[1].status, 'implemented')
  assert.ok(items[1].summary.includes('Task Garden tasks'))
  const backgroundMonitor = items.find((item) => item.id === 'taskflow-background-monitor')
  assert.equal(backgroundMonitor.status, 'planned')
  assert.ok(backgroundMonitor.nextSteps.some((step) => step.includes('sub-agent sessions')))
  const memoryWorkbench = items.find((item) => item.id === 'memory-reference-workbench')
  assert.equal(memoryWorkbench.status, 'planned')
  assert.ok(memoryWorkbench.summary.includes('daily notes'))
  const permissions = items.find((item) => item.id === 'per-session-permissions')
  assert.equal(permissions.status, 'partial')
  assert.match(permissions.blockedBy, /toolsAllow/)
  assert.ok(permissions.nextSteps.some((step) => step.includes('sessions.patch')))
  const sessionHistory = items.find((item) => item.id === 'session-history-viewer')
  assert.equal(sessionHistory.status, 'implemented')
  const toolInventory = items.find((item) => item.id === 'mcp-tool-inventory')
  assert.equal(toolInventory.status, 'implemented')
  assert.equal(items.at(-1).title, 'Danger Zone')
})

test('buildDangerZoneSummary exposes guarded actions and unavailable host controls', () => {
  const summary = buildDangerZoneSummary({
    gatewayReachable: true,
    configLoaded: true,
    release: '/tmp/current',
    now: new Date('2026-04-27T20:40:00Z'),
  })

  assert.equal(summary.posture, 'guarded')
  assert.equal(summary.confirmationPhrase, 'I UNDERSTAND')
  assert.equal(summary.actions.some((action) => action.id === 'restart-dashboard' && action.confirmationRequired), true)
  assert.equal(summary.actions.some((action) => action.id === 'export-diagnostics' && !action.confirmationRequired), true)
  assert.equal(summary.unavailableActions.some((item) => item.includes('Gateway restart/reload')), true)
})

test('buildAutomationInspector summarizes cron jobs without payload bodies', () => {
  const inspector = buildAutomationInspector({
    now: new Date('2026-04-27T20:45:00Z'),
    status: { enabled: true, running: true },
    jobs: [
      {
        id: 'job1',
        name: 'Daily check',
        enabled: true,
        schedule: { kind: 'cron', expr: '0 9 * * *', tz: 'UTC' },
        sessionTarget: 'isolated',
        payload: { kind: 'agentTurn', message: 'private prompt body' },
        delivery: { mode: 'announce', to: 'private-destination' },
        state: { nextRunAtMs: Date.parse('2026-04-28T09:00:00Z'), lastRunStatus: 'ok', consecutiveErrors: 0 },
      },
    ],
  })

  assert.equal(inspector.scheduler.running, true)
  assert.equal(inspector.counts.enabled, 1)
  assert.equal(inspector.items[0].scheduleLabel, '0 9 * * * · UTC')
  assert.equal(inspector.items[0].payloadKind, 'agentTurn')
  assert.equal(JSON.stringify(inspector).includes('private prompt body'), false)
  assert.equal(JSON.stringify(inspector).includes('private-destination'), false)
})

test('buildAutomationInspector treats missing scheduler status as warning', () => {
  const inspector = buildAutomationInspector({ status: null, jobs: [] })

  assert.equal(inspector.scheduler.enabled, false)
  assert.equal(inspector.scheduler.running, false)
  assert.equal(inspector.scheduler.status, 'warning')
})

test('buildChangeAuditLog summarizes safe dashboard write metadata only', () => {
  const log = buildChangeAuditLog({
    now: new Date('2026-04-27T20:30:00Z'),
    events: [
      {
        id: 'evt1',
        timestamp: '2026-04-27T20:29:00Z',
        actor: 'dashboard',
        action: 'session.message',
        target: 'agent:main:main',
        level: 'info',
        summary: 'Sent a message.',
        metadata: { channel: 'webchat', message: 'secret body', token: 'secret-token' },
      },
    ],
  })

  assert.equal(log.counts.total, 1)
  assert.equal(log.items[0].action, 'session.message')
  assert.equal(log.items[0].metadata.channel, 'webchat')
  assert.equal(JSON.stringify(log).includes('secret body'), false)
  assert.equal(JSON.stringify(log).includes('secret-token'), false)
})

test('buildToolInventory redacts secret-like plugin config and summarizes effective tools', () => {
  const inventory = buildToolInventory({
    sessionKey: 'agent:main:main',
    config: {
      tools: { profile: 'coding', web: { search: { enabled: true, provider: 'duckduckgo' } }, elevated: { enabled: true } },
      plugins: {
        entries: {
          google: { enabled: true, config: { apiKey: 'secret', project: 'safe' } },
          acpx: { enabled: false },
        },
      },
      mcp: { servers: { docs: { url: 'https://example.com/mcp', enabled: true } } },
    },
    effectiveTools: {
      profile: 'coding',
      groups: [
        { id: 'core', label: 'Core', source: 'core', tools: [{ id: 'read', label: 'Read', description: 'Read files safely.' }] },
      ],
    },
  })

  assert.equal(inventory.counts.tools, 1)
  assert.equal(inventory.counts.plugins, 2)
  assert.equal(inventory.plugins.find((plugin) => plugin.id === 'google').configKeys.includes('apiKey'), false)
  assert.equal(inventory.plugins.find((plugin) => plugin.id === 'google').configKeys.includes('project'), true)
  assert.equal(inventory.mcpServers[0].urlHost, 'example.com')
})


test('buildToolInventory redacts sensitive text from tool details and schema key summaries', () => {
  const inventory = buildToolInventory({
    effectiveTools: {
      groups: [
        {
          id: 'runtime',
          tools: [
            {
              id: 'secret_tool',
              label: 'Secret Tool',
              rawDescription: 'Call me at human@example.com with token=sk-live-abcdefghijklmnopqrstuvwxyz123456.',
              inputSchema: { token: { type: 'string' }, safeId: { type: 'string' } },
            },
          ],
        },
      ],
    },
  })

  const serialized = JSON.stringify(inventory)
  assert.equal(serialized.includes('human@example.com'), false)
  assert.equal(serialized.includes('sk-live-abcdefghijklmnopqrstuvwxyz123456'), false)
  assert.equal(inventory.groups[0].tools[0].description.includes('[redacted-email]'), true)
  assert.equal(inventory.groups[0].tools[0].detail.some((line) => line.includes('[redacted-token]') || line.includes('token=[redacted]')), true)
  assert.deepEqual(inventory.groups[0].tools[0].inputSchemaKeys, ['safeId'])
})

test('buildSessionHistoryList sanitizes gateway previews and keeps fallback preview state', () => {
  const list = buildSessionHistoryList({
    sessions: [
      { key: 'agent:main:main', sessionId: 'main', label: 'Main', status: 'running' },
      { key: 'agent:main:other', sessionId: 'other', status: 'idle' },
    ],
    previews: [
      {
        key: 'agent:main:main',
        status: 'ok',
        items: [
          { role: 'user', text: 'email human@example.com token=secret-token-value' },
          { role: 'toolResult', content: 'raw command output with password=hunter2' },
          { role: 'tool', text: 'raw internal preview with token=tool-secret-body' },
        ],
      },
    ],
  })

  assert.equal(list.counts.withPreview, 1)
  assert.equal(list.items[0].previewStatus, 'ok')
  assert.equal(list.items[1].previewStatus, 'missing')
  assert.equal(list.items[1].preview.length, 0)
  const serialized = JSON.stringify(list)
  assert.equal(serialized.includes('human@example.com'), false)
  assert.equal(serialized.includes('secret-token-value'), false)
  assert.equal(serialized.includes('hunter2'), false)
  assert.equal(serialized.includes('tool-secret-body'), false)
  assert.equal(list.items[0].preview.at(-1).text, 'Tool/internal content available in raw transcript; hidden in the friendly viewer.')
  assert.equal(serialized.includes('[redacted-email]'), true)
})

test('buildSessionHistoryList filters the bounded safe-summary archive index', () => {
  const list = buildSessionHistoryList({
    filters: { q: 'roadmap', agentId: 'main', channel: 'webchat', dateFrom: '2026-04-28', dateTo: '2026-04-29' },
    sessions: [
      { key: 'agent:main:main', sessionId: 'main', label: 'Roadmap work', agentId: 'main', lastChannel: 'webchat', updatedAt: '2026-04-28T02:00:00Z' },
      { key: 'agent:main:discord', sessionId: 'discord', label: 'Casual chat', agentId: 'main', lastChannel: 'discord', updatedAt: '2026-04-28T02:00:00Z' },
      { key: 'agent:worker:old', sessionId: 'old', label: 'Roadmap old', agentId: 'worker', lastChannel: 'webchat', updatedAt: '2026-04-20T02:00:00Z' },
    ],
    previews: [
      { key: 'agent:main:main', status: 'ok', items: [{ role: 'assistant', text: 'Built roadmap search without token=super-secret-value' }] },
      { key: 'agent:main:discord', status: 'ok', items: [{ role: 'assistant', text: 'Different channel' }] },
    ],
  })

  assert.equal(list.counts.indexed, 3)
  assert.equal(list.counts.matched, 1)
  assert.equal(list.items[0].key, 'agent:main:main')
  assert.deepEqual(list.facets.channels, ['discord', 'webchat'])
  assert.equal(list.filters.q, 'roadmap')
  assert.equal(list.index.status, 'ready')
  assert.equal(JSON.stringify(list).includes('super-secret-value'), false)
})

test('buildSessionHistoryList supports local-day ISO ranges that cross UTC boundaries and warns when bounded', () => {
  const sessions = Array.from({ length: 101 }, (_, index) => ({
    key: `agent:main:${index}`,
    sessionId: `session-${index}`,
    label: index === 0 ? 'Late local session' : `Session ${index}`,
    agentId: 'main',
    lastChannel: 'webchat',
    updatedAt: index === 0 ? '2026-04-29T03:30:00.000Z' : '2026-04-28T12:00:00.000Z',
  }))
  const list = buildSessionHistoryList({
    sessions,
    filters: {
      q: 'late local',
      dateFrom: '2026-04-28T04:00:00.000Z',
      dateTo: '2026-04-29T03:59:59.999Z',
    },
  })

  assert.equal(list.counts.sessions, 100)
  assert.equal(list.counts.indexed, 100)
  assert.equal(list.counts.hasMore, true)
  assert.equal(list.counts.matched, 1)
  assert.equal(list.items[0].key, 'agent:main:0')
  assert.match(list.index.staleWarning, /Showing latest 100 indexed sessions; more history exists/)
})

test('buildSessionHistoryDetail redacts session text and hides tool-result bodies', () => {
  const detail = buildSessionHistoryDetail({
    key: 'agent:main:main',
    messages: [
      { role: 'user', content: 'contact human@example.com and use apiKey=abcdef1234567890' },
      { role: 'toolResult', content: 'payload password=hunter2' },
      { role: 'assistant', content: [{ type: 'toolCall', name: 'exec' }] },
    ],
  })

  const serialized = JSON.stringify(detail)
  assert.equal(serialized.includes('human@example.com'), false)
  assert.equal(serialized.includes('abcdef1234567890'), false)
  assert.equal(serialized.includes('hunter2'), false)
  assert.equal(detail.messages[1].text, 'Tool/internal content available in raw transcript; hidden in the friendly viewer.')
  assert.equal(detail.counts.messages, 3)
})

test('buildSessionPermissionSummary stays read-only when sessions.patch lacks toolsAllow', () => {
  const summary = buildSessionPermissionSummary({
    selectedKey: 'agent:main:main',
    patchSupportsToolsAllow: false,
    sessions: [{ key: 'agent:main:main', sessionId: 'main', label: 'Main', status: 'running', modelProvider: 'openai', model: 'gpt' }],
    inventory: { profile: 'coding', counts: { tools: 12, groups: 2 }, groups: [{ label: 'Core' }, { label: 'Files' }] },
  })

  assert.equal(summary.patchSupportsToolsAllow, false)
  assert.equal(summary.sessions[0].toolsAllow, null)
  assert.equal(summary.effective.toolCount, 12)
  assert.deepEqual(summary.effective.groupLabels, ['Core', 'Files'])
})

test('buildPermissionsHardeningSummary reports posture without leaking account identifiers', () => {
  const summary = buildPermissionsHardeningSummary({
    gatewayUrl: 'http://127.0.0.1:18789',
    gatewayTokenConfigured: true,
    tokenMasked: '********1234',
    reachable: true,
    config: {
      gateway: {
        port: 18789,
        bind: 'loopback',
        auth: { mode: 'token', token: 'secret' },
        controlUi: { allowInsecureAuth: true },
        tailscale: { mode: 'off' },
        nodes: { denyCommands: ['sms.send'] },
      },
      auth: {
        profiles: {
          'provider:human@example.com': { provider: 'provider', mode: 'oauth', email: 'human@example.com' },
          'discord:123456789012345678': { provider: 'discord', mode: 'bot' },
          'telegram:987654321': { mode: 'bot' },
        },
      },
    },
    health: {
      channels: { discord: { configured: true, running: false, tokenSource: 'none', probe: { ok: true } } },
      channelLabels: { discord: 'Discord' },
    },
  })

  assert.equal(summary.tokenMasked, '********1234')
  assert.equal(summary.posture, 'warning')
  assert.equal(summary.gateway.mode, 'token')
  assert.deepEqual(
    summary.authProfiles.map((profile) => profile.id),
    ['provider:account-1', 'discord:account-2', 'telegram:account-3'],
  )
  const serialized = JSON.stringify(summary)
  assert.equal(serialized.includes('human@example.com'), false)
  assert.equal(serialized.includes('123456789012345678'), false)
  assert.equal(serialized.includes('987654321'), false)
  assert.equal(summary.channels[0].status, 'healthy')
  assert.equal(summary.rotationChecklist.find((item) => item.id === 'verify-health').status, 'ready')
})
