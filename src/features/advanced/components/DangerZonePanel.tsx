import { useState } from 'react'
import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useDangerZoneAction, useDangerZoneSummary } from '../../../api/dashboard'

function badgeClass(status: string) {
  if (status === 'healthy') return 'badge-healthy'
  if (status === 'error') return 'badge-error'
  return 'badge-waiting'
}

export function DangerZonePanel() {
  const { data, isLoading, isFetching } = useDangerZoneSummary()
  const dangerAction = useDangerZoneAction()
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  function exportDiagnostics() {
    window.open('/api/advanced/danger-zone/diagnostics', '_blank', 'noopener,noreferrer')
    setMessage('Diagnostics export opened in a new tab.')
  }

  function clearLocalCache() {
    localStorage.clear()
    sessionStorage.clear()
    setMessage('Browser local/session storage cleared for this dashboard origin.')
  }

  function runAction(action: string) {
    setMessage(null)
    dangerAction.mutate(
      { action, confirmation },
      {
        onSuccess: () => {
          setMessage(action === 'restart-dashboard' ? 'Restart requested. The dashboard may disconnect briefly.' : 'Action completed.')
          setConfirmation('')
        },
      },
    )
  }

  return (
    <section className="panel-card panel-card-wide danger-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Danger Zone</p>
          <h3>Guarded operational actions</h3>
          <p className="panel-copy">Useful sharp tools with explicit blast-radius copy. Host-wide gateway restart and config writes are deliberately not exposed in this pass.</p>
        </div>
        <div className="freshness-stack">
          <span className="badge badge-waiting">guarded</span>
          <FreshnessStamp updatedAt={data?.updatedAt} isFetching={isLoading || isFetching} />
        </div>
      </div>

      <div className="status-strip status-strip-compact">
        <div className="status-tile status-tile-primary">
          <span className="metric-label">posture</span>
          <strong>{data?.posture ?? '...'}</strong>
          <span>phrase: {data?.confirmationPhrase ?? '...'}</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">release</span>
          <strong>current</strong>
          <span>{data?.release ?? '...'}</span>
        </div>
      </div>

      {isLoading ? <div className="empty-state">Loading guarded actions…</div> : null}

      <div className="advanced-config-grid">
        {(data?.checks ?? []).map((check) => (
          <article key={check.id} className="detail-card">
            <div className="panel-subheader compact-panel-subheader">
              <strong>{check.label}</strong>
              <span className={`badge ${badgeClass(check.status)}`}>{check.status}</span>
            </div>
            <p className="detail-copy">{check.detail}</p>
          </article>
        ))}
      </div>

      <div className="panel-subheader advanced-section-header">
        <div>
          <h4>Actions</h4>
          <p className="selector-copy">Type <strong>{data?.confirmationPhrase ?? 'I UNDERSTAND'}</strong> before running confirmed server-side actions.</p>
        </div>
        <label className="field-label field-label-inline danger-confirmation">
          Confirmation
          <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="I UNDERSTAND" />
        </label>
      </div>

      <div className="danger-action-grid">
        {(data?.actions ?? []).map((action) => (
          <article key={action.id} className="editor-card danger-action-card">
            <div className="panel-subheader compact-panel-subheader">
              <h4>{action.label}</h4>
              <span className={`badge ${action.confirmationRequired ? 'badge-waiting' : 'badge-idle'}`}>{action.confirmationRequired ? 'confirm' : 'safe'}</span>
            </div>
            <p className="detail-copy">{action.blastRadius}</p>
            <button
              type="button"
              className={action.id === 'restart-dashboard' ? 'button button-danger' : 'button'}
              onClick={() => action.id === 'export-diagnostics' ? exportDiagnostics() : runAction(action.id)}
              disabled={dangerAction.isPending || (action.confirmationRequired && confirmation !== (data?.confirmationPhrase ?? 'I UNDERSTAND'))}
            >
              {action.label}
            </button>
          </article>
        ))}
        <article className="editor-card danger-action-card">
          <div className="panel-subheader compact-panel-subheader">
            <h4>Clear browser UI cache</h4>
            <span className="badge badge-idle">local</span>
          </div>
          <p className="detail-copy">Low: clears this browser's localStorage/sessionStorage for Clawpoint only. It does not touch server state.</p>
          <button type="button" className="button" onClick={clearLocalCache}>Clear browser cache</button>
        </article>
      </div>

      {message ? <div className="empty-state">{message}</div> : null}
      {dangerAction.error ? <div className="empty-state empty-state-error">{dangerAction.error.message}</div> : null}

      <div className="advanced-config-grid">
        <article className="editor-card">
          <div className="panel-subheader"><h4>Unavailable by design</h4></div>
          <ul className="list compact-list">
            {(data?.unavailableActions ?? []).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>
        <article className="editor-card">
          <div className="panel-subheader"><h4>Notes</h4></div>
          <ul className="list compact-list">
            {(data?.notes ?? []).map((note) => <li key={note}>{note}</li>)}
          </ul>
        </article>
      </div>
    </section>
  )
}
