import { useMemo } from 'react'
import { useDashboardMeta } from '../api/dashboard'
import { DashboardShell } from '../components/layout/DashboardShell'
import { WorkspaceTabs, type WorkspaceTab } from '../components/navigation/WorkspaceTabs'
import { GatewayHealthCard } from '../features/health/components/GatewayHealthCard'
import { ReminderQueueCard } from '../features/reminders/components/ReminderQueueCard'
import { SessionOverviewCard } from '../features/sessions/components/SessionOverviewCard'

export function App() {
  const { data } = useDashboardMeta()
  const taskgardenAvailable = data?.integrations.taskgarden.available ?? false

  const tabs = useMemo<WorkspaceTab[]>(() => {
    const orderedTabs: WorkspaceTab[] = [
      {
        id: 'overview',
        label: 'Overview',
        eyebrow: 'Overview',
        title: 'Overview',
        description: 'Service health and recent sessions.',
        content: (
          <div className="overview-grid">
            <GatewayHealthCard />
            <SessionOverviewCard />
          </div>
        ),
      },
      {
        id: 'health',
        label: 'Gateway Health',
        eyebrow: 'Health',
        title: 'Gateway Health',
        description: 'Gateway status and recent heartbeat.',
        content: (
          <div className="workspace-stack">
            <GatewayHealthCard />
          </div>
        ),
      },
      {
        id: 'sessions',
        label: 'Chat Sessions',
        eyebrow: 'Sessions',
        title: 'Chat Sessions',
        description: 'Recent active, waiting, and idle sessions.',
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
        label: 'Taskgarden',
        eyebrow: 'Taskgarden',
        title: 'Taskgarden',
        description: 'Upcoming reminder-backed tasks.',
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
      <header className="hero-card hero-card-compact">
        <h1>Clawpoint</h1>
      </header>

      <WorkspaceTabs tabs={tabs} defaultTabId="overview" />
    </DashboardShell>
  )
}
