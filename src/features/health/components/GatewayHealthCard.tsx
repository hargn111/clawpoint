import { useGatewayHealth } from '../api/useGatewayHealth'

export function GatewayHealthCard() {
  const { data, isLoading } = useGatewayHealth()

  return (
    <section className="panel-card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Gateway health</p>
          <h3>Service status</h3>
        </div>
        <span className={`badge badge-${data?.data.service ?? 'healthy'}`}>
          {isLoading ? 'Loading' : data?.data.service ?? 'Healthy'}
        </span>
      </div>

      <dl className="stat-grid">
        <div>
          <dt>Session count</dt>
          <dd>{isLoading ? '...' : data?.data.queueDepth}</dd>
        </div>
        <div>
          <dt>Last heartbeat</dt>
          <dd>{isLoading ? '...' : data?.data.lastHeartbeat}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{data?.source ?? 'mock'}</dd>
        </div>
      </dl>

      <ul className="list compact-list">
        {data?.data.notes.map((note) => <li key={note}>{note}</li>)}
      </ul>
    </section>
  )
}
