import { useMemo, useState } from 'react'
import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useChangeAuditLog } from '../../../api/dashboard'

function badgeClass(level: string) {
  if (level === 'error') return 'badge-error'
  if (level === 'warning') return 'badge-waiting'
  return 'badge-idle'
}

function timeLabel(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function ChangeAuditLogPanel() {
  const { data, isLoading, isFetching } = useChangeAuditLog()
  const [filter, setFilter] = useState('all')
  const events = data?.items ?? []
  const visibleEvents = useMemo(
    () => (filter === 'all' ? events : events.filter((event) => event.action.startsWith(filter))),
    [events, filter],
  )

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Change audit log</p>
          <h3>Dashboard-triggered writes</h3>
          <p className="panel-copy">A safe audit trail for task edits, session changes, and dashboard sends. Message bodies, task notes, and secrets stay out of the log.</p>
        </div>
        <div className="freshness-stack">
          <span className="badge badge-healthy">implemented</span>
          <FreshnessStamp updatedAt={data?.updatedAt} isFetching={isLoading || isFetching} />
        </div>
      </div>

      <div className="status-strip status-strip-compact">
        <div className="status-tile status-tile-primary">
          <span className="metric-label">events</span>
          <strong>{data?.counts.total ?? '...'}</strong>
          <span>{data?.retention ?? 'loading retention'}</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">info</span>
          <strong>{data?.counts.info ?? '...'}</strong>
          <span>normal writes</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">warnings</span>
          <strong>{data?.counts.warning ?? '...'}</strong>
          <span>needs review</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">errors</span>
          <strong>{data?.counts.error ?? '...'}</strong>
          <span>failed/blocked writes</span>
        </div>
      </div>

      <div className="panel-subheader advanced-section-header">
        <div>
          <h4>Recent change events</h4>
          <p className="selector-copy">Targets are IDs or session keys; unsafe free-text fields are intentionally omitted.</p>
        </div>
        <label className="field-label field-label-inline">
          Type
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All writes</option>
            <option value="task.">Task Garden</option>
            <option value="session.">Sessions</option>
          </select>
        </label>
      </div>

      {isLoading ? <div className="empty-state">Loading audit log…</div> : null}
      {!isLoading && visibleEvents.length === 0 ? <div className="empty-state">No matching dashboard write events in this process yet.</div> : null}

      <div className="audit-stream">
        {visibleEvents.map((event) => (
          <article key={event.id} className={`editor-card audit-row audit-row-${event.level}`}>
            <span className="metric-label">{timeLabel(event.timestamp)}</span>
            <span className={`badge ${badgeClass(event.level)}`}>{event.level}</span>
            <div className="audit-row-main">
              <strong>{event.action}</strong>
              <span>{event.summary}</span>
              <code>{event.target}</code>
            </div>
            <span className="selector-copy">{Object.entries(event.metadata).map(([key, value]) => `${key}: ${String(value)}`).join(' · ') || 'no metadata'}</span>
          </article>
        ))}
      </div>

      <ul className="list compact-list">
        {(data?.notes ?? []).map((note) => <li key={note}>{note}</li>)}
      </ul>
    </section>
  )
}
