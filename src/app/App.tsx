import { useMemo } from 'react'
import { DashboardShell } from '../components/layout/DashboardShell'
import { WorkspaceTabs, type WorkspaceTab } from '../components/navigation/WorkspaceTabs'
import { AdvancedRoadmapPanel } from '../features/advanced/components/AdvancedRoadmapPanel'
import { AutomationInspectorPanel } from '../features/advanced/components/AutomationInspectorPanel'
import { ChangeAuditLogPanel } from '../features/advanced/components/ChangeAuditLogPanel'
import { DangerZonePanel } from '../features/advanced/components/DangerZonePanel'
import { EffectiveConfigPanel } from '../features/advanced/components/EffectiveConfigPanel'
import { ModelProfilesPanel } from '../features/advanced/components/ModelProfilesPanel'
import { SessionHistoryPanel } from '../features/advanced/components/SessionHistoryPanel'
import { SessionPermissionsPanel } from '../features/advanced/components/SessionPermissionsPanel'
import { ToolInventoryPanel } from '../features/advanced/components/ToolInventoryPanel'
import { GatewayHealthCard } from '../features/health/components/GatewayHealthCard'
import { LogsEventsPanel } from '../features/logs/components/LogsEventsPanel'
import { AttentionOverviewPanel } from '../features/overview/components/AttentionOverviewPanel'
import { PersonalOperationsHomePanel } from '../features/overview/components/PersonalOperationsHomePanel'
import { UnifiedWorkQueuePanel } from '../features/overview/components/UnifiedWorkQueuePanel'
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
        description: 'Attention-first health, active work, reminders, and recent failures.',
        content: (
          <div className="workspace-stack">
            <PersonalOperationsHomePanel taskgardenAvailable={taskgardenAvailable} />
            <UnifiedWorkQueuePanel taskgardenAvailable={taskgardenAvailable} />
            <AttentionOverviewPanel />
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
        description: 'Gateway performance, heartbeat freshness, latency, and restart context.',
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
        description: 'Find active or waiting sessions, edit defaults, and send follow-ups.',
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
        description: 'Triage open work, reminder-backed tasks, and planned/unplanned queues.',
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
        id: 'session-history',
        label: 'Session History',
        group: 'Archives',
        icon: '≋',
        eyebrow: 'Historical Session Viewer',
        title: 'Session History',
        description: 'Formatted historical JSONL transcripts with readable conversation flow and safe omissions.',
        content: <SessionHistoryPanel />,
      },
      {
        id: 'model-profiles',
        label: 'Model Profiles',
        group: 'Config & Access',
        icon: '⌘',
        eyebrow: 'Model Profiles',
        title: 'Model Profiles',
        description: 'Launch-ready session presets for fast, careful, coding, and long-context work.',
        content: (
          <div className="workspace-stack">
            <ModelProfilesPanel />
          </div>
        ),
      },
      {
        id: 'effective-config',
        label: 'Effective Config',
        group: 'Config & Access',
        icon: '◈',
        eyebrow: 'Effective Config',
        title: 'Effective Config',
        description: 'Read-only runtime config with safe values, source labels, and edit-safety notes.',
        content: (
          <div className="workspace-stack">
            <EffectiveConfigPanel />
          </div>
        ),
      },
      {
        id: 'mcp-servers',
        label: 'Tool Inventory',
        group: 'Config & Access',
        icon: '⌗',
        eyebrow: 'MCP / Tool Inventory',
        title: 'MCP / Tool Inventory',
        description: 'Effective runtime tools, plugin inventory, MCP server metadata, and safe config policy.',
        content: (
          <div className="workspace-stack">
            <ToolInventoryPanel />
          </div>
        ),
      },
      {
        id: 'session-permissions',
        label: 'Session Permissions',
        group: 'Config & Access',
        icon: '◇',
        eyebrow: 'Session Permissions',
        title: 'Session Permissions',
        description: 'Read-only effective tool access by session, with gateway limitations called out clearly.',
        content: (
          <div className="workspace-stack">
            <SessionPermissionsPanel />
          </div>
        ),
      },
      {
        id: 'change-audit-log',
        label: 'Change Audit Log',
        group: 'Automation & Safety',
        icon: '≣',
        eyebrow: 'Change Audit Log',
        title: 'Change Audit Log',
        description: 'Dashboard write audit trail for sessions and Task Garden without sensitive content.',
        content: <ChangeAuditLogPanel />,
      },
      {
        id: 'automation-inspector',
        label: 'Automation Inspector',
        group: 'Automation & Safety',
        icon: '↻',
        eyebrow: 'Automation Inspector',
        title: 'Automation Inspector',
        description: 'Cron jobs, next/last run state, failures, and guarded job controls.',
        content: <AutomationInspectorPanel />,
      },
      {
        id: 'danger-zone',
        label: 'Danger Zone',
        group: 'Automation & Safety',
        icon: '⚠',
        eyebrow: 'Danger Zone',
        title: 'Danger Zone',
        description: 'Guarded restart, diagnostics, volatile-state clearing, and local cache controls.',
        content: <DangerZonePanel />,
      },
      {
        id: 'logs-events',
        label: 'Logs & Events',
        group: 'Monitoring',
        icon: '⋯',
        eyebrow: 'Logs & Events',
        title: 'Logs & Events',
        description: 'Recent API events with error-first filters, status, route, and duration.',
        content: <LogsEventsPanel />,
      },
      {
        id: 'permissions-auth',
        label: 'Permissions & Auth',
        group: 'Config & Access',
        icon: '⚿',
        eyebrow: 'Permissions & Auth',
        title: 'Permissions & Auth',
        description: 'Current gateway auth summary and the next controls worth wiring.',
        content: <PermissionsPanel />,
      },
      {
        id: 'advanced-roadmap',
        label: 'Roadmap',
        group: 'Planning',
        icon: '□',
        eyebrow: 'Product Roadmap',
        title: 'Product Roadmap',
        description: 'The next Clawpoint era beyond Control UI parity and raw diagnostics.',
        content: <AdvancedRoadmapPanel />,
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
