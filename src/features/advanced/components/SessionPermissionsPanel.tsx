import { useEffect, useMemo, useState } from 'react'
import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useSessionPermissions } from '../../../api/dashboard'

export function SessionPermissionsPanel() {
  const [selectedKey, setSelectedKey] = useState('')
  const { data, isLoading, isFetching } = useSessionPermissions(selectedKey)
  const sessions = data?.sessions ?? []
  const selected = useMemo(
    () => sessions.find((session) => session.key === (data?.selectedKey || selectedKey)) ?? sessions[0] ?? null,
    [data?.selectedKey, selectedKey, sessions],
  )

  useEffect(() => {
    if (!selectedKey && data?.selectedKey) setSelectedKey(data.selectedKey)
  }, [data?.selectedKey, selectedKey])

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Per-session permissions</p>
          <h3>Effective tool access by session</h3>
          <p className="panel-copy">Read-only view of the tools available to a selected session. Writable allowlists wait for gateway patch support.</p>
        </div>
        <div className="freshness-stack">
          <span className={`badge ${data?.patchSupportsToolsAllow ? 'badge-healthy' : 'badge-waiting'}`}>
            {data?.patchSupportsToolsAllow ? 'writable-ready' : 'read-only'}
          </span>
          <FreshnessStamp updatedAt={data?.updatedAt} isFetching={isLoading || isFetching} />
        </div>
      </div>

      <div className="manager-layout permissions-layout">
        <div className="editor-card">
          <div className="panel-subheader">
            <div>
              <h4>Session</h4>
              <p className="selector-copy">Choose a session to inspect its effective tool inventory.</p>
            </div>
          </div>

          <label className="field-label">
            Active session
            <select value={selectedKey || data?.selectedKey || ''} onChange={(event) => setSelectedKey(event.target.value)}>
              {sessions.map((session) => (
                <option key={session.key} value={session.key}>{session.label}</option>
              ))}
            </select>
          </label>

          {selected ? (
            <dl className="detail-list manager-detail-list">
              <div>
                <dt>Key</dt>
                <dd>{selected.key}</dd>
              </div>
              <div>
                <dt>State</dt>
                <dd>{selected.state}</dd>
              </div>
              <div>
                <dt>Model</dt>
                <dd>{selected.model}</dd>
              </div>
              <div>
                <dt>Allowlist</dt>
                <dd>{selected.toolsAllow?.length ? selected.toolsAllow.join(', ') : 'session default'}</dd>
              </div>
            </dl>
          ) : null}
        </div>

        <div className="editor-card permissions-effective-card">
          <div className="panel-subheader">
            <div>
              <h4>Effective access</h4>
              <p className="selector-copy">Summarized from the gateway tools.effective view.</p>
            </div>
          </div>

          <div className="metric-grid metric-grid-compact">
            <div className="metric-card">
              <span className="metric-label">profile</span>
              <span className="metric-value">{data?.effective?.profile ?? '...'}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">tools</span>
              <span className="metric-value">{data?.effective?.toolCount ?? '...'}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">groups</span>
              <span className="metric-value">{data?.effective?.groupCount ?? '...'}</span>
            </div>
          </div>

          <div className="hint-row permissions-group-row">
            {(data?.effective?.groupLabels ?? []).map((label) => (
              <span key={label} className="cli-pill">{label}</span>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? <div className="empty-state">Loading session permissions…</div> : null}

      <ul className="list compact-list">
        {(data?.notes ?? []).map((note) => <li key={note}>{note}</li>)}
      </ul>
    </section>
  )
}
