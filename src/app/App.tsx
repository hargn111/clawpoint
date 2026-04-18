import { DashboardShell } from '../components/layout/DashboardShell'
import { useDashboardSnapshot } from '../api/dashboard'
import { GatewayHealthCard } from '../features/health/components/GatewayHealthCard'
import { ReminderQueueCard } from '../features/reminders/components/ReminderQueueCard'
import { SessionOverviewCard } from '../features/sessions/components/SessionOverviewCard'

export function App() {
  const { data } = useDashboardSnapshot()
  const taskgardenAvailable = data?.integrations.taskgarden.available ?? true

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
            <span className="hero-meta-label">Next milestone</span>
            <strong>Add control actions and richer todo views</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <GatewayHealthCard />
        {taskgardenAvailable ? <ReminderQueueCard /> : null}
        <SessionOverviewCard />
      </div>
    </DashboardShell>
  )
}
