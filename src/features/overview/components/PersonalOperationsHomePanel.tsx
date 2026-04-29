import { useMemo, useState } from 'react'
import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useAutomationInspector, useLogsEvents } from '../../../api/dashboard'
import { useGatewayHealth } from '../../health/api/useGatewayHealth'
import { useReminderQueue } from '../../reminders/api/useReminderQueue'
import { useSessionListAdmin } from '../../sessions/api/useSessionAdmin'
import { useTaskgardenTaskList } from '../../taskgarden/api/useTaskgardenTasks'

type HomeSection = 'health' | 'work' | 'automation' | 'logs'

const sectionLabels: Record<HomeSection, string> = {
  health: 'Health',
  work: 'Work',
  automation: 'Automation',
  logs: 'Logs',
}

const defaultSections: HomeSection[] = ['health', 'work', 'automation', 'logs']

function readSections(): HomeSection[] {
  if (typeof window === 'undefined') return defaultSections
  const raw = window.localStorage.getItem('clawpoint.home.sections')
  if (!raw) return defaultSections
  try {
    const parsed = JSON.parse(raw) as string[]
    const valid = parsed.filter((item): item is HomeSection => item in sectionLabels)
    return valid.length ? valid : defaultSections
  } catch {
    return defaultSections
  }
}

function writeSections(sections: HomeSection[]) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('clawpoint.home.sections', JSON.stringify(sections))
  }
}

function navigateTo(tabId: string) {
  if (typeof window !== 'undefined') window.location.hash = tabId
}

type PersonalOperationsHomePanelProps = {
  taskgardenAvailable?: boolean
}

export function PersonalOperationsHomePanel({ taskgardenAvailable = true }: PersonalOperationsHomePanelProps) {
  const gateway = useGatewayHealth()
  const reminders = useReminderQueue()
  const sessions = useSessionListAdmin()
  const tasks = useTaskgardenTaskList()
  const automation = useAutomationInspector()
  const logs = useLogsEvents()
  const [sections, setSections] = useState<HomeSection[]>(readSections)

  const sessionItems = sessions.data?.items ?? []
  const taskItems = tasks.data?.items ?? []
  const reminderItems = reminders.data?.data ?? []
  const automationItems = automation.data?.items ?? []
  const logItems = logs.data?.items ?? []

  const visible = useMemo(() => new Set(sections), [sections])
  const openTasks = taskgardenAvailable ? taskItems.filter((item) => item.status === 'open') : []
  const plannedTasks = openTasks.filter((item) => item.bucket === 'planned')
  const waitingSessions = sessionItems.filter((item) => item.state === 'waiting')
  const failedJobs = automationItems.filter((item) => item.lastRunStatus === 'error' || item.consecutiveErrors > 0)
  const recentIssues = logItems.filter((item) => item.level === 'error' || item.level === 'warn' || item.status >= 400)
  const newestUpdate = gateway.data?.updatedAt ?? tasks.data?.updatedAt ?? sessions.data?.updatedAt ?? automation.data?.updatedAt

  function toggle(section: HomeSection) {
    const next = sections.includes(section) ? sections.filter((item) => item !== section) : [...sections, section]
    const normalized = next.length ? next : defaultSections
    setSections(normalized)
    writeSections(normalized)
  }

  return (
    <section className="panel-card panel-card-wide personal-home-panel">
      <div className="panel-header command-center-header">
        <div>
          <p className="eyebrow">Personal operations home</p>
          <h3>Daily command center</h3>
          <p className="panel-copy">Configurable local landing cards for the work and risks most likely to need attention.</p>
        </div>
        <FreshnessStamp updatedAt={newestUpdate} isFetching={gateway.isFetching || tasks.isFetching || sessions.isFetching || automation.isFetching} />
      </div>

      <div className="preference-strip" aria-label="Home sections">
        {(Object.keys(sectionLabels) as HomeSection[]).map((section) => (
          <button
            key={section}
            type="button"
            className={`button-compact ${visible.has(section) ? 'button-primary' : 'button-secondary'}`}
            onClick={() => toggle(section)}
            aria-pressed={visible.has(section)}
          >
            {sectionLabels[section]}
          </button>
        ))}
      </div>

      <div className="home-card-grid">
        {visible.has('health') ? (
          <button type="button" className="detail-card home-action-card" onClick={() => navigateTo('health')}>
            <span className="metric-label">gateway</span>
            <strong>{gateway.isLoading ? 'checking' : gateway.data?.data.service ?? 'unknown'}</strong>
            <p className="detail-copy">{gateway.data?.data.lastHeartbeat ?? 'No heartbeat reported yet.'}</p>
          </button>
        ) : null}
        {visible.has('work') ? (
          <button type="button" className="detail-card home-action-card" onClick={() => navigateTo(taskgardenAvailable ? 'todos' : 'sessions')}>
            <span className="metric-label">work</span>
            <strong>{taskgardenAvailable ? `${openTasks.length} open · ` : ''}{waitingSessions.length} waiting</strong>
            <p className="detail-copy">{taskgardenAvailable ? `${plannedTasks.length} planned tasks and ${reminderItems.length} reminder-backed items need routing.` : 'Task Garden is unavailable, so work routing is limited to waiting sessions.'}</p>
          </button>
        ) : null}
        {visible.has('automation') ? (
          <button type="button" className="detail-card home-action-card" onClick={() => navigateTo('automation-inspector')}>
            <span className="metric-label">automation</span>
            <strong>{failedJobs.length} job issue{failedJobs.length === 1 ? '' : 's'}</strong>
            <p className="detail-copy">{automationItems.length} scheduled jobs visible from the gateway cron inspector.</p>
          </button>
        ) : null}
        {visible.has('logs') ? (
          <button type="button" className="detail-card home-action-card" onClick={() => navigateTo('logs-events')}>
            <span className="metric-label">logs</span>
            <strong>{recentIssues.length} recent issue{recentIssues.length === 1 ? '' : 's'}</strong>
            <p className="detail-copy">Jump to Logs & Events for status, route, and duration details.</p>
          </button>
        ) : null}
      </div>
    </section>
  )
}
