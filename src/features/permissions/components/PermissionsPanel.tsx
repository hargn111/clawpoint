import { usePermissionsSummary } from '../../../api/dashboard'

export function PermissionsPanel() {
  const { data, isLoading } = usePermissionsSummary()

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Permissions & auth</p>
          <h3>Gateway auth summary</h3>
        </div>
        <span className={`badge badge-${data?.tokenConfigured ? 'healthy' : 'offline'}`}>
          {isLoading ? 'Loading' : data?.tokenConfigured ? 'configured' : 'missing'}
        </span>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <span className="metric-label">gateway url</span>
          <code className="inline-code">{data?.gatewayUrl ?? '...'}</code>
        </div>
        <div className="detail-card">
          <span className="metric-label">token</span>
          <code className="inline-code">{data?.tokenMasked ?? '...'}</code>
        </div>
      </div>

      <ul className="list compact-list">
        {(data?.notes ?? []).map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>

      <div className="hint-row">
        <span className="cli-pill">GATEWAY_TOKEN</span>
        <span className="cli-pill">gateway.remote.url</span>
      </div>
    </section>
  )
}
