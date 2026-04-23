import { useMemo } from 'react'
import { DashboardShell } from '../components/layout/DashboardShell'
import { PlaceholderPanel } from '../components/common/PlaceholderPanel'
import { WorkspaceTabs, type WorkspaceTab } from '../components/navigation/WorkspaceTabs'
import { GatewayHealthCard } from '../features/health/components/GatewayHealthCard'
import { LogsEventsPanel } from '../features/logs/components/LogsEventsPanel'
import { PlatformWatchCard } from '../features/overview/components/PlatformWatchCard'
import { OverviewSummaryPanel } from '../features/overview/components/OverviewSummaryPanel'
import { PermissionsPanel } from '../features/permissions/components/PermissionsPanel'
import { ReminderQueueCard } from '../features/reminders/components/ReminderQueueCard'
import { SessionManagerCard } from '../features/sessions/components/SessionManagerCard'
import { SessionOverviewCard } from '../features/sessions/components/SessionOverviewCard'
import { TaskgardenManagerCard } from '../features/taskgarden/components/TaskgardenManagerCard'
import { useDashboardMeta } from '../api/dashboard'

export function App() {
  const { data } = useDashboardMeta()
  const taskgardenAvailable = data?.integrations.taskgarden.available ?? false

  const tabs = useMemo<WorkspaceTab[]>(() => {
    const orderedTabs: WorkspaceTab[] = [
      {
        id: 'overview',
        label: 'Overview',
        group: 'Monitoring',
        icon: '◫',
        eyebrow: 'Overview',
        title: 'Overview',
        description: 'Live workspace status, recent activity, and upstream watch items.',
        content: (
          <div className="workspace-stack">
            <OverviewSummaryPanel />
            <GatewayHealthCard />
            <SessionOverviewCard />
            <PlatformWatchCard />
          </div>
        ),
      },
      {
        id: 'health',
        label: 'Gateway Health',
        group: 'Monitoring',
        icon: '◎',
        eyebrow: 'Gateway health',
        title: 'Gateway Health',
        description: 'Latency, request volume, uptime, and recent service pulse.',
        content: (
          <div className="workspace-stack">
            <GatewayHealthCard />
          </div>
        ),
      },
      {
        id: 'sessions',
        label: 'Sessions',
        group: 'Operations',
        icon: '◧',
        eyebrow: 'Sessions',
        title: 'Sessions',
        description: 'Create sessions, send follow-ups, and scan recent state.',
        content: (
          <div className="workspace-stack">
            <SessionManagerCard />
            <SessionOverviewCard />
          </div>
        ),
      },
    ]

    if (taskgardenAvailable) {
      orderedTabs.push({
        id: 'todos',
        label: 'Task Garden',
        group: 'Operations',
        icon: '▣',
        eyebrow: 'Task Garden',
        title: 'Task Garden',
        description: 'Manage tasks, reminders, and work triage from one place.',
        content: (
          <div className="workspace-stack">
            <TaskgardenManagerCard />
            <ReminderQueueCard />
          </div>
        ),
      })
    }

    orderedTabs.push(
      {
        id: 'model-config',
        label: 'Model Config',
        group: 'Configuration',
        icon: '⌘',
        eyebrow: 'Model Config',
        title: 'Model Config',
        description: 'Draft surface for default model, thinking, and token-budget controls.',
        content: (
          <PlaceholderPanel
            eyebrow="Model Config"
            title="Model defaults are next"
            body="This needs real gateway-backed config mutation before it should become editable. For now the dashboard keeps the shape visible without pretending the backend is ready."
            bullets={[
              'Default model selection and session-type ceilings should land here.',
              'Thinking defaults and token budget bars should be gateway-backed, not local-only UI state.',
              'System prompt editing needs a real config write path before it becomes safe.',
            ]}
            cliHints={['openclaw models', '--thinking', 'agents.defaults.contextTokens']}
          />
        ),
      },
      {
        id: 'mcp-servers',
        label: 'MCP Servers',
        group: 'Configuration',
        icon: '⌗',
        eyebrow: 'MCP Servers',
        title: 'MCP Servers',
        description: 'Placeholder for live MCP routing, tool inspection, and per-session overrides.',
        content: (
          <PlaceholderPanel
            eyebrow="MCP Servers"
            title="MCP routing needs backend inventory"
            body="The useful next step is to expose configured servers and live status from OpenClaw first, then layer enable/disable and tool testing on top."
            bullets={[
              'Server inventory and status should come from the gateway, not handwritten config snapshots.',
              'Per-session server allowlists belong next to session creation and patch flows.',
              'Inline tool testing makes sense once schemas are available over an API route.',
            ]}
            cliHints={['openclaw mcp', 'plugins.entries', 'sessions.patch']}
          />
        ),
      },
      {
        id: 'logs-events',
        label: 'Logs & Events',
        group: 'Monitoring',
        icon: '⋯',
        eyebrow: 'Logs & Events',
        title: 'Logs & Events',
        description: 'Recent API events with filterable severity and route matching.',
        content: <LogsEventsPanel />,
      },
      {
        id: 'permissions-auth',
        label: 'Permissions & Auth',
        group: 'Configuration',
        icon: '⚿',
        eyebrow: 'Permissions & Auth',
        title: 'Permissions & Auth',
        description: 'Current gateway auth summary and the next controls worth wiring.',
        content: <PermissionsPanel />,
      },
    )

    return orderedTabs
  }, [taskgardenAvailable])

  return (
    <DashboardShell>
      <WorkspaceTabs tabs={tabs} defaultTabId="overview" />
    </DashboardShell>
  )
}
