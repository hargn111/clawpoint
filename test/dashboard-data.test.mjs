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

test('advancedRoadmapItems tracks the remaining six advanced implementations', () => {
  const items = advancedRoadmapItems()
  assert.equal(items.length, 6)
  assert.equal(items[0].title, 'MCP / Tool Inventory')
  assert.equal(items[0].status, 'implemented')
  assert.equal(items[1].status, 'partial')
  assert.equal(items[2].status, 'implemented')
  assert.equal(items[3].status, 'implemented')
  assert.equal(items[4].status, 'implemented')
  assert.equal(items[5].status, 'implemented')
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
