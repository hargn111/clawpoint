import { useMemo, useState } from 'react'
import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useAutomationInspector, useAutomationJobAction } from '../../../api/dashboard'

function badgeClass(health?: string) {
  if (health === 'healthy') return 'badge-healthy'
  if (health === 'warning') return 'badge-waiting'
  return 'badge-idle'
}

function dateLabel(value: string | null) {
  if (!value) return 'never'
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function durationLabel(value: number | null) {
  if (value == null) return 'n/a'
  if (value < 1000) return `${value}ms`
  return `${Math.round(value / 1000)}s`
}

export function AutomationInspectorPanel() {
  const { data, isLoading, isFetching } = useAutomationInspector()
  const jobAction = useAutomationJobAction()
  const [filter, setFilter] = useState('all')
  const [confirming, setConfirming] = useState<{ id: string; action: 'enable' | 'disable' | 'run-now' } | null>(null)
  const jobs = data?.items ?? []
  const visibleJobs = useMemo(
    () => jobs.filter((job) => {
      if (filter === 'enabled') return job.enabled
      if (filter === 'warning') return job.health === 'warning'
      if (filter === 'disabled') return !job.enabled
      return true
    }),
    [jobs, filter],
  )

  function requestAction(id: string, action: 'enable' | 'disable' | 'run-now') {
    if (confirming?.id === id && confirming.action === action) {
      jobAction.mutate({ id, action })
      setConfirming(null)
      return
    }
    setConfirming({ id, action })
  }

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Cron / Automation Inspector</p>
          <h3>Scheduled jobs and guarded controls</h3>
          <p className="panel-copy">Cron jobs from the gateway scheduler with next run, last run, failure state, and two-click enable/disable/run-now controls.</p>
        </div>
        <div className="freshness-stack">
          <span className="badge badge-healthy">implemented</span>
          <FreshnessStamp updatedAt={data?.updatedAt} isFetching={isLoading || isFetching} />
        </div>
      </div>

      <div className="status-strip status-strip-compact">
        <div className="status-tile status-tile-primary">
          <span className="metric-label">scheduler</span>
          <strong>{data?.scheduler.running ? 'running' : 'not running'}</strong>
          <span>{data?.scheduler.enabled ? 'enabled' : 'disabled'}</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">jobs</span>
          <strong>{data?.counts.total ?? '...'}</strong>
          <span>{data?.counts.enabled ?? 0} enabled</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">disabled</span>
          <strong>{data?.counts.disabled ?? '...'}</strong>
          <span>paused jobs</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">warnings</span>
          <strong>{data?.counts.warning ?? '...'}</strong>
          <span>failures or errors</span>
        </div>
      </div>

      <div className="panel-subheader advanced-section-header">
        <div>
          <h4>Automation jobs</h4>
          <p className="selector-copy">Payload bodies, webhook URLs, tokens, and delivery destinations are hidden.</p>
        </div>
        <label className="field-label field-label-inline">
          Filter
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All jobs</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
            <option value="warning">Warnings</option>
          </select>
        </label>
      </div>

      {isLoading ? <div className="empty-state">Loading automation jobs…</div> : null}
      {!isLoading && visibleJobs.length === 0 ? <div className="empty-state">No matching automation jobs.</div> : null}

      <div className="automation-grid">
        {visibleJobs.map((job) => {
          const toggleAction = job.enabled ? 'disable' : 'enable'
          const toggleLabel = job.enabled ? 'Pause' : 'Enable'
          return (
            <article key={job.id} className="editor-card automation-card">
              <div className="panel-subheader compact-panel-subheader">
                <div>
                  <p className="eyebrow">{job.scheduleKind} · {job.sessionTarget}</p>
                  <h4>{job.name}</h4>
                </div>
                <span className={`badge ${badgeClass(job.health)}`}>{job.enabled ? job.health : 'disabled'}</span>
              </div>
              {job.description ? <p className="detail-copy">{job.description}</p> : null}
              <div className="profile-defaults">
                <div className="profile-default-row"><span>Schedule</span><code>{job.scheduleLabel}</code></div>
                <div className="profile-default-row"><span>Next</span><code>{dateLabel(job.nextRunAt)}</code></div>
                <div className="profile-default-row"><span>Last</span><code>{dateLabel(job.lastRunAt)} · {job.lastRunStatus}</code></div>
                <div className="profile-default-row"><span>Duration</span><code>{durationLabel(job.lastDurationMs)}</code></div>
                <div className="profile-default-row"><span>Delivery</span><code>{job.deliveryMode}</code></div>
              </div>
              {job.consecutiveErrors > 0 ? <p className="selector-copy">{job.consecutiveErrors} consecutive errors.</p> : null}
              <div className="action-row action-row-split">
                <button type="button" className="button button-secondary" onClick={() => requestAction(job.id, toggleAction)} disabled={jobAction.isPending}>
                  {confirming?.id === job.id && confirming.action === toggleAction ? `Confirm ${toggleLabel}` : toggleLabel}
                </button>
                <button type="button" className="button" onClick={() => requestAction(job.id, 'run-now')} disabled={jobAction.isPending || !job.enabled}>
                  {confirming?.id === job.id && confirming.action === 'run-now' ? 'Confirm Run' : 'Run now'}
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {jobAction.error ? <div className="empty-state empty-state-error">{jobAction.error.message}</div> : null}

      <ul className="list compact-list">
        {(data?.notes ?? []).map((note) => <li key={note}>{note}</li>)}
      </ul>
    </section>
  )
}
