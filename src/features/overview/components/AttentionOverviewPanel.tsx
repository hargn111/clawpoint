import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useLogsEvents, usePermissionsSummary } from '../../../api/dashboard'
import { useGatewayHealth } from '../../health/api/useGatewayHealth'
import { useReminderQueue } from '../../reminders/api/useReminderQueue'
import { useSessionListAdmin } from '../../sessions/api/useSessionAdmin'
import { useTaskgardenTaskList } from '../../taskgarden/api/useTaskgardenTasks'

function valueOrLoading(value: string | number | undefined, loading: boolean) {
  if (loading) return '—'
  return value ?? '0'
}

export function AttentionOverviewPanel() {
  const gateway = useGatewayHealth()
  const reminders = useReminderQueue()
  const sessions = useSessionListAdmin()
  const tasks = useTaskgardenTaskList()
  const logs = useLogsEvents()
  const permissions = usePermissionsSummary()

  const sessionItems = sessions.data?.items ?? []
  const taskItems = tasks.data?.items ?? []
  const reminderItems = reminders.data?.data ?? []
  const logItems = logs.data?.items ?? []

  const activeSessions = sessionItems.filter((item) => item.state === 'active').length
  const waitingSessions = sessionItems.filter((item) => item.state === 'waiting').length
  const openTasks = taskItems.filter((item) => item.status === 'open').length
  const reminderBackedTasks = taskItems.filter((item) => item.status === 'open' && item.remind_interval_hours != null).length
  const recentErrors = logItems.filter((item) => item.level === 'error' || item.status >= 500).length
  const recentWarnings = logItems.filter((item) => item.level === 'warn' || (item.status >= 400 && item.status < 500)).length
  const authMissing = permissions.data && !permissions.data.tokenConfigured
  const service = gateway.data?.data.service ?? 'offline'

  const attentionItems = [
    service !== 'healthy' ? `${service === 'offline' ? 'Gateway offline' : 'Gateway degraded'} — check health before sending work.` : null,
    authMissing ? 'Gateway token is missing; external dashboard actions may fail.' : null,
    recentErrors ? `${recentErrors} recent API error${recentErrors === 1 ? '' : 's'} in Logs & Events.` : null,
    recentWarnings ? `${recentWarnings} warning/client-error event${recentWarnings === 1 ? '' : 's'} to review.` : null,
    waitingSessions ? `${waitingSessions} session${waitingSessions === 1 ? '' : 's'} waiting for follow-up.` : null,
    reminderItems.length ? `${reminderItems.length} reminder-backed item${reminderItems.length === 1 ? '' : 's'} need attention.` : null,
  ].filter(Boolean) as string[]

  return (
    <section className={`panel-card panel-card-wide command-center command-center-${service}`}>
      <div className="panel-header command-center-header">
        <div>
          <p className="eyebrow">Needs attention</p>
          <h3>Operational snapshot</h3>
          <p className="panel-copy">Start here: health, active work, reminders, and recent failures.</p>
        </div>
        <div className="freshness-stack">
          <span className={`badge badge-${service}`}>Gateway {service}</span>
          <FreshnessStamp updatedAt={gateway.data?.updatedAt} isFetching={gateway.isFetching} />
        </div>
      </div>

      <div className="status-strip">
        <div className="status-tile status-tile-primary">
          <span className="metric-label">gateway</span>
          <strong>{service}</strong>
          <span>{gateway.isLoading ? 'Waiting for health sample' : gateway.data?.data.lastHeartbeat ?? 'No heartbeat yet'}</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">active sessions</span>
          <strong>{valueOrLoading(activeSessions, sessions.isLoading)}</strong>
          <span>{waitingSessions} waiting</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">open tasks</span>
          <strong>{valueOrLoading(openTasks, tasks.isLoading)}</strong>
          <span>{reminderBackedTasks} reminder-backed</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">due reminders</span>
          <strong>{valueOrLoading(reminderItems.length, reminders.isLoading)}</strong>
          <span>{reminders.data?.source === 'mock' ? 'mock source' : 'live source'}</span>
        </div>
        <div className={`status-tile ${recentErrors ? 'status-tile-danger' : ''}`}>
          <span className="metric-label">recent errors</span>
          <strong>{valueOrLoading(recentErrors, logs.isLoading)}</strong>
          <span>{recentWarnings} warnings</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">p95 latency</span>
          <strong>{gateway.isLoading ? '—' : `${gateway.data?.data.p95LatencyMs ?? 0} ms`}</strong>
          <span>{gateway.data?.data.requestsPerMinute ?? 0} req/min</span>
        </div>
      </div>

      <div className="attention-list">
        {attentionItems.length ? (
          attentionItems.map((item) => (
            <div key={item} className="attention-item">
              <span aria-hidden="true">!</span>
              <p>{item}</p>
            </div>
          ))
        ) : (
          <div className="attention-item attention-item-clear">
            <span aria-hidden="true">✓</span>
            <p>No urgent dashboard signals right now.</p>
          </div>
        )}
      </div>
    </section>
  )
}
