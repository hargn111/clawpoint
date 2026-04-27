import { useMemo, useState } from 'react'
import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useLogsEvents } from '../../../api/dashboard'
import { isNewerThanWatermark, readLogsReviewedUntil, writeLogsReviewedUntil } from '../logReviewState'

export function LogsEventsPanel() {
  const { data, isLoading } = useLogsEvents()
  const [severity, setSeverity] = useState<'all' | 'info' | 'warn' | 'error'>('all')
  const [pathFilter, setPathFilter] = useState('')
  const [logsReviewedUntil, setLogsReviewedUntil] = useState(readLogsReviewedUntil)

  const source = data?.items ?? []
  const issueEvents = source.filter((item) => item.level === 'error' || item.level === 'warn' || item.status >= 400)
  const sortedIssueTimestamps = issueEvents.map((item) => item.timestamp).sort()
  const latestIssueTimestamp = sortedIssueTimestamps[sortedIssueTimestamps.length - 1] ?? ''
  const unreviewedIssueEvents = issueEvents.filter((item) => isNewerThanWatermark(item.timestamp, logsReviewedUntil))
  const errorCount = source.filter((item) => item.level === 'error' || item.status >= 500).length
  const warnCount = source.filter((item) => item.level === 'warn' || (item.status >= 400 && item.status < 500)).length
  const unreviewedCount = unreviewedIssueEvents.length

  const items = useMemo(() => {
    const source = data?.items ?? []
    return source.filter((item) => {
      const severityMatch =
        severity === 'all' ||
        item.level === severity ||
        (severity === 'error' && item.status >= 500) ||
        (severity === 'warn' && item.status >= 400 && item.status < 500)
      const pathMatch = !pathFilter.trim() || item.path.toLowerCase().includes(pathFilter.toLowerCase())
      return severityMatch && pathMatch
    })
  }, [data?.items, pathFilter, severity])

  function markReviewed() {
    const watermark = latestIssueTimestamp || new Date().toISOString()
    writeLogsReviewedUntil(watermark)
    setLogsReviewedUntil(watermark)
  }

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Logs & events</p>
          <h3>Recent API events</h3>
          <p className="panel-copy">Review API issues here; marking them reviewed clears the Overview notice until a newer issue appears.</p>
        </div>
        <div className="freshness-stack">
          <span className="muted-copy">{isLoading ? 'Loading…' : `${items.length} rows`}</span>
          <FreshnessStamp updatedAt={data?.updatedAt} isFetching={isLoading} />
        </div>
      </div>

      <div className="action-row action-row-inline">
        <span className="muted-copy">{unreviewedCount ? `${unreviewedCount} unreviewed issue${unreviewedCount === 1 ? '' : 's'}` : 'No unreviewed issues'}</span>
        <button type="button" className="secondary-button" onClick={markReviewed} disabled={!issueEvents.length}>
          Mark current issues reviewed
        </button>
      </div>

      <div className="quick-filter-row" aria-label="Quick log filters">
        <button className={`filter-chip ${severity === 'all' ? 'filter-chip-active' : ''}`} type="button" onClick={() => setSeverity('all')}>
          All
        </button>
        <button className={`filter-chip ${severity === 'error' ? 'filter-chip-active' : ''}`} type="button" onClick={() => setSeverity('error')}>
          Errors · {errorCount}
        </button>
        <button className={`filter-chip ${severity === 'warn' ? 'filter-chip-active' : ''}`} type="button" onClick={() => setSeverity('warn')}>
          Warnings · {warnCount}
        </button>
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
