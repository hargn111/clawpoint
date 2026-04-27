import { useMemo, useState } from 'react'
import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useLogsEvents, usePermissionsSummary } from '../../../api/dashboard'
import { isNewerThanWatermark, readLogsReviewedUntil, writeLogsReviewedUntil } from '../../logs/logReviewState'
import { useGatewayHealth } from '../../health/api/useGatewayHealth'
import { useReminderQueue } from '../../reminders/api/useReminderQueue'
import { useSessionListAdmin } from '../../sessions/api/useSessionAdmin'
import { useTaskgardenTaskList } from '../../taskgarden/api/useTaskgardenTasks'

function valueOrLoading(value: string | number | undefined, loading: boolean) {
  if (loading) return '—'
  return value ?? '0'
}

function navigateTo(tabId: string) {
  if (typeof window !== 'undefined') {
    window.location.hash = tabId
  }
}

export function AttentionOverviewPanel() {
  const gateway = useGatewayHealth()
  const reminders = useReminderQueue()
  const sessions = useSessionListAdmin()
  const tasks = useTaskgardenTaskList()
  const logs = useLogsEvents()
  const permissions = usePermissionsSummary()
  const [logsReviewedUntil, setLogsReviewedUntil] = useState(readLogsReviewedUntil)

  const sessionItems = sessions.data?.items ?? []
  const taskItems = tasks.data?.items ?? []
  const reminderItems = reminders.data?.data ?? []
  const logItems = logs.data?.items ?? []

  const activeSessions = sessionItems.filter((item) => item.state === 'active').length
  const waitingSessions = sessionItems.filter((item) => item.state === 'waiting').length
  const openTasks = taskItems.filter((item) => item.status === 'open').length
  const reminderBackedTasks = taskItems.filter((item) => item.status === 'open' && item.remind_interval_hours != null).length
  const recentIssueEvents = logItems.filter((item) => item.level === 'error' || item.level === 'warn' || item.status >= 400)
  const unreviewedIssueEvents = recentIssueEvents.filter((item) => isNewerThanWatermark(item.timestamp, logsReviewedUntil))
  const recentErrors = unreviewedIssueEvents.filter((item) => item.level === 'error' || item.status >= 500).length
  const recentWarnings = unreviewedIssueEvents.filter((item) => item.level === 'warn' || (item.status >= 400 && item.status < 500)).length
  const latestIssueTimestamp = useMemo(() => {
    const sortedTimestamps = recentIssueEvents.map((item) => item.timestamp).sort()
    return sortedTimestamps[sortedTimestamps.length - 1] ?? ''
  }, [recentIssueEvents])
  const authMissing = permissions.data && !permissions.data.tokenConfigured
  const service = gateway.data?.data.service ?? 'healthy'
  const displayedService = gateway.isLoading ? 'checking' : service

  const urgentItems = [
    !gateway.isLoading && service !== 'healthy'
      ? `${service === 'offline' ? 'Gateway offline' : 'Gateway degraded'} — open Gateway Health before sending work.`
      : null,
    authMissing ? 'Gateway token is missing; external dashboard actions may fail.' : null,
    reminderItems.length ? `${reminderItems.length} reminder-backed item${reminderItems.length === 1 ? '' : 's'} need attention.` : null,
  ].filter(Boolean) as string[]

  const notificationItems = [
    recentErrors ? `${recentErrors} new API error${recentErrors === 1 ? '' : 's'} since you last reviewed Logs & Events.` : null,
    recentWarnings ? `${recentWarnings} new warning/client-error event${recentWarnings === 1 ? '' : 's'} since you last reviewed Logs & Events.` : null,
    waitingSessions ? `${waitingSessions} session${waitingSessions === 1 ? '' : 's'} waiting for follow-up.` : null,
  ].filter(Boolean) as string[]

  function markLogIssuesReviewed() {
    const watermark = latestIssueTimestamp || new Date().toISOString()
    writeLogsReviewedUntil(watermark)
    setLogsReviewedUntil(watermark)
  }

  return (
    <section className={`panel-card panel-card-wide command-center command-center-${displayedService}`}>
      <div className="panel-header command-center-header">
        <div>
          <p className="eyebrow">Needs attention</p>
          <h3>Operational snapshot</h3>
          <p className="panel-copy">Brief status cards. Click any card for the full tab.</p>
        </div>
        <div className="freshness-stack">
          <span className={`badge badge-${displayedService}`}>Gateway {displayedService}</span>
          <FreshnessStamp updatedAt={gateway.data?.updatedAt} isFetching={gateway.isFetching} />
        </div>
      </div>

      <div className="status-strip status-strip-compact">
        <button className="status-tile status-tile-primary status-tile-action" type="button" onClick={() => navigateTo('health')}>
          <span className="metric-label">gateway</span>
          <strong>{displayedService}</strong>
          <span>{gateway.isLoading ? 'Checking health…' : gateway.data?.data.lastHeartbeat ?? 'No heartbeat yet'}</span>
        </button>
        <button className="status-tile status-tile-action" type="button" onClick={() => navigateTo('sessions')}>
          <span className="metric-label">sessions</span>
          <strong>{valueOrLoading(activeSessions, sessions.isLoading)}</strong>
          <span>{waitingSessions} waiting</span>
        </button>
        <button className="status-tile status-tile-action" type="button" onClick={() => navigateTo('todos')}>
          <span className="metric-label">tasks</span>
          <strong>{valueOrLoading(openTasks, tasks.isLoading)}</strong>
          <span>{reminderBackedTasks} reminder-backed</span>
        </button>
        <button className="status-tile status-tile-action" type="button" onClick={() => navigateTo('todos')}>
          <span className="metric-label">reminders</span>
          <strong>{valueOrLoading(reminderItems.length, reminders.isLoading)}</strong>
          <span>{reminders.data?.source === 'mock' ? 'mock source' : 'live source'}</span>
        </button>
        <button className={`status-tile status-tile-action ${recentErrors ? 'status-tile-danger' : ''}`} type="button" onClick={() => navigateTo('logs-events')}>
          <span className="metric-label">new log issues</span>
          <strong>{valueOrLoading(recentErrors + recentWarnings, logs.isLoading)}</strong>
          <span>{recentErrors} errors · {recentWarnings} warnings</span>
        </button>
      </div>

      <div className="attention-list">
        {urgentItems.map((item) => (
          <div key={item} className="attention-item">
            <span aria-hidden="true">!</span>
            <p>{item}</p>
          </div>
        ))}

        {notificationItems.map((item) => (
          <div key={item} className="attention-item attention-item-notice">
            <span aria-hidden="true">i</span>
            <p>{item}</p>
            {(recentErrors || recentWarnings) && item.includes('API') ? (
              <button type="button" className="inline-action" onClick={markLogIssuesReviewed}>
                Mark reviewed
              </button>
            ) : null}
          </div>
        ))}

        {!urgentItems.length && !notificationItems.length ? (
          <div className="attention-item attention-item-clear">
            <span aria-hidden="true">✓</span>
            <p>No urgent dashboard signals right now.</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
