import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useGatewayHealth } from '../../health/api/useGatewayHealth'
import { useReminderQueue } from '../../reminders/api/useReminderQueue'
import { useSessionListAdmin } from '../../sessions/api/useSessionAdmin'
import { useTaskgardenTaskList } from '../../taskgarden/api/useTaskgardenTasks'

function metricValue(value: string | number | undefined, fallback = '...') {
  if (value == null || value === '') return fallback
  return value
}

export function OverviewSummaryPanel() {
  const { data: gateway } = useGatewayHealth()
  const { data: reminders } = useReminderQueue()
  const { data: sessions } = useSessionListAdmin()
  const { data: tasks } = useTaskgardenTaskList()

  const openTasks = tasks?.items.filter((item) => item.status === 'open').length ?? 0

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Current activity</p>
          <h3>Workspace totals</h3>
        </div>
        <FreshnessStamp updatedAt={gateway?.updatedAt ?? sessions?.updatedAt ?? tasks?.updatedAt} />
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <span className="metric-label">sessions</span>
          <strong className="metric-value">{metricValue(sessions?.items.length)}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">open tasks</span>
          <strong className="metric-value">{metricValue(openTasks)}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">due reminders</span>
          <strong className="metric-value">{metricValue(reminders?.data.length)}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">req/min</span>
          <strong className="metric-value">{metricValue(gateway?.data.requestsPerMinute)}</strong>
        </div>
      </div>
    </section>
  )
}
