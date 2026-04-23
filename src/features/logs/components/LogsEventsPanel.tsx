import { useMemo, useState } from 'react'
import { useLogsEvents } from '../../../api/dashboard'

export function LogsEventsPanel() {
  const { data, isLoading } = useLogsEvents()
  const [severity, setSeverity] = useState<'all' | 'info' | 'warn' | 'error'>('all')
  const [pathFilter, setPathFilter] = useState('')

  const items = useMemo(() => {
    const source = data?.items ?? []
    return source.filter((item) => {
      const severityMatch = severity === 'all' || item.level === severity
      const pathMatch = !pathFilter.trim() || item.path.toLowerCase().includes(pathFilter.toLowerCase())
      return severityMatch && pathMatch
    })
  }, [data?.items, pathFilter, severity])

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Logs & events</p>
          <h3>Recent API activity</h3>
        </div>
        <span className="muted-copy">{isLoading ? 'Loading…' : `${items.length} rows`}</span>
      </div>

      <div className="toolbar-row">
        <label className="field-label field-label-inline">
          Level
          <select value={severity} onChange={(event) => setSeverity(event.target.value as typeof severity)}>
            <option value="all">All</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
          </select>
        </label>
        <label className="field-label field-label-inline field-grow">
          Filter path
          <input value={pathFilter} onChange={(event) => setPathFilter(event.target.value)} placeholder="/api/session-admin" />
        </label>
      </div>

      {!items.length && !isLoading ? <div className="empty-state">No API events match the current filters.</div> : null}

      <div className="log-stream">
        {items.map((item) => (
          <div key={item.id} className={`log-row log-row-${item.level}`}>
            <span className="log-ts">{new Date(item.timestamp).toLocaleTimeString('en-US', { timeZone: 'America/New_York' })}</span>
            <span className="log-method">{item.method}</span>
            <span className="log-path">{item.path}</span>
            <span className="log-status">{item.status}</span>
            <span className="log-duration">{item.durationMs} ms</span>
          </div>
        ))}
      </div>
    </section>
  )
}
