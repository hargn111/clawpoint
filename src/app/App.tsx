import { useMemo } from 'react'
import { useDashboardSnapshot } from '../api/dashboard'
import { DashboardShell } from '../components/layout/DashboardShell'
import { ComingSoonPanel } from '../components/navigation/ComingSoonPanel'
import { WorkspaceTabs, type WorkspaceTab } from '../components/navigation/WorkspaceTabs'
import { GatewayHealthCard } from '../features/health/components/GatewayHealthCard'
import { ReminderQueueCard } from '../features/reminders/components/ReminderQueueCard'
import { SessionOverviewCard } from '../features/sessions/components/SessionOverviewCard'

export function App() {
  const { data } = useDashboardSnapshot()
  const taskgardenAvailable = data?.integrations.taskgarden.available ?? true

  const tabs = useMemo<WorkspaceTab[]>(() => {
    const todoContent = taskgardenAvailable ? (
      <div className="workspace-stack">
        <ReminderQueueCard />
      </div>
    ) : (
      <ComingSoonPanel
        title="Taskgarden is not connected yet"
        body="The tab shell is ready. Once the todo integration is available, this view can expand without changing the navigation model."
      />
    )

    return [
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
      {
        id: 'todos',
        label: 'Todos',
        eyebrow: 'Todos',
        title: 'What needs attention next',
        description: 'Reminder-backed work, ready to grow into richer task views.',
        content: todoContent,
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
        id: 'overview',
        label: 'Overview',
        eyebrow: 'Overview',
        title: 'One-screen snapshot',
        description: 'Combined view for fast scanning across sessions, todos, and health.',
        content: (
          <div className="dashboard-grid">
            <GatewayHealthCard />
            {taskgardenAvailable ? <ReminderQueueCard /> : null}
            <SessionOverviewCard />
          </div>
        ),
      },
    ]
  }, [taskgardenAvailable])

  return (
    <DashboardShell>
      <div className="hero-card">
        <div>
          <p className="eyebrow">Clawpoint</p>
          <h1>One screen for the work that matters.</h1>
          <p className="hero-copy">
            A focused dashboard for session control, quick health checks, and optional task visibility
            without forking the main OpenClaw interface.
          </p>
        </div>
        <div className="hero-meta">
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

      <WorkspaceTabs tabs={tabs} defaultTabId="sessions" />
    </DashboardShell>
  )
}
