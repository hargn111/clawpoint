import { useEffect, useState } from 'react'
import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useSessionHistoryDetail, useSessionHistoryList } from '../../../api/dashboard'

function roleBadge(role: string) {
  if (role === 'user') return 'badge-healthy'
  if (role === 'assistant') return 'badge-idle'
  if (role === 'toolResult') return 'badge-waiting'
  return 'badge-idle'
}

function formatDate(value?: string | number | null) {
  if (!value) return 'no timestamp'
  const date = typeof value === 'number' ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return 'unknown'
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function SessionHistoryPanel() {
  const [query, setQuery] = useState('')
  const [agentId, setAgentId] = useState('')
  const [channel, setChannel] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const { data, isLoading, isFetching } = useSessionHistoryList({ q: query, agentId, channel, dateFrom, dateTo })
  const [selectedKey, setSelectedKey] = useState('')
  const sessions = data?.items ?? []

  useEffect(() => {
    if (!selectedKey && sessions[0]?.key) setSelectedKey(sessions[0].key)
  }, [selectedKey, sessions])

  const visibleSessions = sessions
  const selectedSession = sessions.find((session) => session.key === selectedKey) ?? visibleSessions[0]
  const detail = useSessionHistoryDetail(selectedSession?.key ?? '')

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Historical session viewer</p>
          <h3>Formatted transcript archive</h3>
          <p className="panel-copy">Browse older OpenClaw JSONL session transcripts as a readable conversation stream instead of raw log lines.</p>
        </div>
        <div className="freshness-stack">
          <span className="badge badge-healthy">implemented</span>
          <FreshnessStamp updatedAt={data?.updatedAt} isFetching={isLoading || isFetching || detail.isFetching} />
        </div>
      </div>

      <div className="status-strip status-strip-compact">
        <div className="status-tile status-tile-primary">
          <span className="metric-label">sessions</span>
          <strong>{data?.counts.sessions ?? '...'}</strong>
          <span>known transcripts</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">previewable</span>
          <strong>{data?.counts.matched ?? '...'}</strong>
          <span>matching filters</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">messages</span>
          <strong>{detail.data?.counts.messages ?? '...'}</strong>
          <span>selected transcript</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">tools</span>
          <strong>{detail.data?.counts.tools ?? '...'}</strong>
          <span>summarized safely</span>
        </div>
      </div>

      <div className="advanced-config-grid">
        <article className="editor-card">
          <div className="panel-subheader advanced-section-header session-history-archive-header">
            <div>
              <h4>Session archive</h4>
              <p className="selector-copy">Search the bounded safe-summary index by text, date, agent, and channel. Select a result to load its formatted transcript.</p>
            </div>
            <div className="session-history-filter-grid">
              <label className="field-label field-label-inline">
                Search
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="main, heartbeat, project…" />
              </label>
              <label className="field-label field-label-inline">
                Agent
                <select value={agentId} onChange={(event) => setAgentId(event.target.value)}>
                  <option value="">All agents</option>
                  {(data?.facets.agentIds ?? []).map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className="field-label field-label-inline">
                Channel
                <select value={channel} onChange={(event) => setChannel(event.target.value)}>
                  <option value="">All channels</option>
                  {(data?.facets.channels ?? []).map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className="field-label field-label-inline">
                From
                <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
              </label>
              <label className="field-label field-label-inline">
                To
                <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
              </label>
            </div>
          </div>

          {isLoading ? <div className="empty-state">Loading session archive…</div> : null}
          <div className="session-history-index-status">
            <span className="badge badge-idle">{data?.index.status ?? 'loading'}</span>
            <span>{data?.counts.indexed ?? 0} indexed / {data?.counts.sessions ?? 0} sessions · {data?.index.secretPosture}</span>
            {data?.index.staleWarning ? <span className="badge badge-waiting">{data.index.staleWarning}</span> : null}
          </div>

          {!isLoading && visibleSessions.length === 0 ? <div className="empty-state">No sessions match these filters.</div> : null}
          <div className="selector-list session-history-archive-list">
            {visibleSessions.slice(0, 50).map((session) => (
              <button
                key={session.key}
                type="button"
                className={`selector-item tool-inventory-item session-history-session-item ${session.key === selectedSession?.key ? 'selector-item-active' : ''}`}
                onClick={() => setSelectedKey(session.key)}
              >
                <span className="selector-item-copy session-history-session-copy">
                  <span className="session-history-session-title-row">
                    <strong>{session.label}</strong>
                    <span className={`badge ${session.previewStatus === 'ok' ? 'badge-healthy' : 'badge-idle'}`}>{session.previewStatus}</span>
                  </span>
                  <span className="selector-copy session-history-session-meta">{session.agentId} · {session.channel} · {formatDate(session.updatedAt)}</span>
                  <span className="selector-copy session-history-session-key">{session.key}</span>
                  <span className="session-history-preview-stack">
                    {session.preview.length ? session.preview.map((item, previewIndex) => (
                      <span key={`${item.role}-${previewIndex}`} className="session-history-preview-line">
                        <span className="session-history-preview-role">{item.role}</span>
                        <span>{item.text}</span>
                      </span>
                    )) : <span className="session-history-preview-line session-history-preview-empty">No preview available yet.</span>}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </article>

        <article className="editor-card">
          <div className="panel-subheader">
            <div>
              <h4>{detail.data?.label ?? selectedSession?.label ?? 'Transcript'}</h4>
              <p className="selector-copy">{selectedSession?.key ?? 'Select a session'}</p>
            </div>
            <span className="badge badge-idle">{detail.data?.status ?? selectedSession?.status ?? 'unknown'}</span>
          </div>

          {detail.isLoading ? <div className="empty-state">Loading transcript…</div> : null}
          <div className="session-history-thread">
            {(detail.data?.messages ?? []).slice(-80).map((message) => (
              <div key={message.id} className={`session-history-message session-history-${message.role}`}>
                <div className="panel-subheader">
                  <span className={`badge ${roleBadge(message.role)}`}>{message.toolName ?? message.role}</span>
                  <span className="selector-copy">{formatDate(message.timestamp)}</span>
                </div>
                <p className="session-history-text">{message.text}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <ul className="list compact-list">
        {(detail.data?.notes ?? data?.notes ?? []).map((note) => <li key={note}>{note}</li>)}
      </ul>
    </section>
  )
}
