import { useMemo } from 'react'
import { useDashboardSnapshot } from '../api/dashboard'
import { DashboardShell } from '../components/layout/DashboardShell'
import { WorkspaceTabs, type WorkspaceTab } from '../components/navigation/WorkspaceTabs'
import { GatewayHealthCard } from '../features/health/components/GatewayHealthCard'
import { ReminderQueueCard } from '../features/reminders/components/ReminderQueueCard'
import { SessionOverviewCard } from '../features/sessions/components/SessionOverviewCard'

export function App() {
  const { data } = useDashboardSnapshot()
  const taskgardenAvailable = data?.integrations.taskgarden.available ?? false

  const tabs = useMemo<WorkspaceTab[]>(() => {
    const orderedTabs: WorkspaceTab[] = [
      {
        id: 'overview',
        label: 'Overview',
        eyebrow: 'Overview',
        title: 'One-screen snapshot',
        description: 'Fast scan across service health and recent sessions.',
        content: (
          <div className="overview-grid">
            <GatewayHealthCard />
            <SessionOverviewCard />
          </div>
        ),
      },
      {
        id: 'health',
        label: 'Health',
        eyebrow: 'Health',
        title: 'Gateway and system pulse',
        description: 'Quick checks for service health and dashboard freshness.',
        content: (
          <div className="workspace-stack">
            <GatewayHealthCard />
          </div>
        ),
      },
      {
        id: 'sessions',
        label: 'Sessions',
        eyebrow: 'Sessions',
        title: 'Who is doing what',
        description: 'Owner-centric view of active, waiting, and idle sessions.',
        content: (
          <div className="workspace-stack">
            <SessionOverviewCard />
          </div>
        ),
      },
    ]

    if (taskgardenAvailable) {
      orderedTabs.push({
        id: 'todos',
        label: 'Todos',
        eyebrow: 'Todos',
        title: 'What needs attention next',
        description: 'Reminder-backed work, ready to grow into richer task views.',
        content: (
          <div className="workspace-stack">
            <ReminderQueueCard />
          </div>
        ),
      })
    }

    return orderedTabs
  }, [taskgardenAvailable])

  return (
    <DashboardShell>
      <div className="hero-card hero-card-compact">
        <div>
          <p className="eyebrow">Clawpoint</p>
          <h1>Focused control, less clutter.</h1>
          <p className="hero-copy">
            Session control, health checks, and task visibility in one local dashboard.
          </p>
        </div>
        <div className="hero-meta hero-meta-compact">
          <div>
            <span className="hero-meta-label">Mode</span>
            <strong>Live local snapshot</strong>
          </div>
          <div>
            <span className="hero-meta-label">Navigation</span>
            <strong>Extendable tabbed workspace</strong>
          </div>
        </div>
      </div>

      <WorkspaceTabs tabs={tabs} defaultTabId="overview" />
    </DashboardShell>
  )
}
