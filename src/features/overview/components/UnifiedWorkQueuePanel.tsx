import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useAutomationInspector } from '../../../api/dashboard'
import { useReminderQueue } from '../../reminders/api/useReminderQueue'
import { useSessionListAdmin } from '../../sessions/api/useSessionAdmin'
import { useTaskgardenTaskList } from '../../taskgarden/api/useTaskgardenTasks'

type QueueItem = {
  id: string
  title: string
  source: 'task' | 'session' | 'reminder' | 'automation'
  urgency: 'high' | 'medium' | 'normal'
  reason: string
  tabId: string
}

function navigateTo(tabId: string) {
  if (typeof window !== 'undefined') window.location.hash = tabId
}

function sourceLabel(source: QueueItem['source']) {
  if (source === 'task') return 'Task Garden'
  if (source === 'session') return 'Session'
  if (source === 'reminder') return 'Reminder'
  return 'Automation'
}

type UnifiedWorkQueuePanelProps = {
  taskgardenAvailable?: boolean
}

export function UnifiedWorkQueuePanel({ taskgardenAvailable = true }: UnifiedWorkQueuePanelProps) {
  const tasks = useTaskgardenTaskList()
  const sessions = useSessionListAdmin()
  const reminders = useReminderQueue()
  const automation = useAutomationInspector()

  const taskItems = taskgardenAvailable ? tasks.data?.items ?? [] : []
  const sessionItems = sessions.data?.items ?? []
  const reminderItems = taskgardenAvailable ? reminders.data?.data ?? [] : []
  const automationItems = automation.data?.items ?? []

  const queue: QueueItem[] = [
    ...reminderItems.map((item): QueueItem => ({
      id: `reminder-${item.id}`,
      title: item.title,
      source: 'reminder',
      urgency: item.status === 'stalled' ? 'high' : 'medium',
      reason: item.dueLabel,
      tabId: 'todos',
    })),
    ...sessionItems
      .filter((item) => item.state === 'waiting')
      .map((item): QueueItem => ({
        id: `session-${item.id}`,
        title: item.label,
        source: 'session',
        urgency: 'medium',
        reason: item.summary || 'Waiting for follow-up.',
        tabId: 'sessions',
      })),
    ...automationItems
      .filter((item) => item.lastRunStatus === 'error' || item.consecutiveErrors > 0)
      .map((item): QueueItem => ({
        id: `automation-${item.id}`,
        title: item.name,
        source: 'automation',
        urgency: 'high',
        reason: item.lastRunStatus === 'error' ? 'Last run failed.' : `${item.consecutiveErrors} consecutive errors.`,
        tabId: 'automation-inspector',
      })),
    ...taskItems
      .filter((item) => item.status === 'open' && item.bucket === 'planned')
      .slice(0, 8)
      .map((item): QueueItem => ({
        id: `task-${item.id}`,
        title: item.title,
        source: 'task',
        urgency: item.remind_interval_hours != null ? 'medium' : 'normal',
        reason: item.remind_interval_hours != null ? `Reminder every ${item.remind_interval_hours}h.` : 'Planned open task.',
        tabId: 'todos',
      })),
  ]

  const sortedQueue = queue.sort((a, b) => {
    const score = { high: 0, medium: 1, normal: 2 }
    return score[a.urgency] - score[b.urgency]
  }).slice(0, 12)

  const updatedAt = reminders.data?.updatedAt ?? tasks.data?.updatedAt ?? sessions.data?.updatedAt ?? automation.data?.updatedAt

  return (
    <section className="panel-card panel-card-wide unified-work-queue-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Unified work queue</p>
          <h3>Next actions across sources</h3>
          <p className="panel-copy">Read-only queue joining tasks, reminders, waiting sessions, and automation failures with deep links to the owning tab.</p>
        </div>
        <div className="freshness-stack">
          <span className="badge badge-waiting">{sortedQueue.length} items</span>
          <FreshnessStamp updatedAt={updatedAt} isFetching={tasks.isFetching || sessions.isFetching || reminders.isFetching || automation.isFetching} />
        </div>
      </div>

      {sortedQueue.length === 0 ? <div className="empty-state">No queued cross-source work right now.</div> : null}

      <div className="work-queue-list">
        {sortedQueue.map((item) => (
          <button key={item.id} type="button" className={`selector-item work-queue-item work-queue-${item.urgency}`} onClick={() => navigateTo(item.tabId)}>
            <span className="selector-item-copy">
              <strong>{item.title}</strong>
              <span className="selector-copy">{sourceLabel(item.source)} · {item.reason}</span>
            </span>
            <span className="selector-item-actions">
              <span className={`badge badge-${item.urgency === 'high' ? 'error' : item.urgency === 'medium' ? 'waiting' : 'idle'}`}>{item.urgency}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
