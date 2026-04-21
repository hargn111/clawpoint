import { useGatewayHealth } from '../api/useGatewayHealth'

export function GatewayHealthCard() {
  const { data, isLoading } = useGatewayHealth()

  return (
    <section className="panel-card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Gateway</p>
          <h3>Service status</h3>
        </div>
        <span className={`badge badge-${data?.data.service ?? 'healthy'}`}>
          {isLoading ? 'Loading' : data?.data.service ?? 'Healthy'}
        </span>
      </div>

      <dl className="stat-grid stat-grid-two-up">
        <div>
          <dt>Sessions</dt>
          <dd>{isLoading ? '...' : data?.data.queueDepth}</dd>
        </div>
        <div>
          <dt>Last heartbeat</dt>
          <dd>{isLoading ? '...' : data?.data.lastHeartbeat}</dd>
        </div>
      </dl>
    </section>
  )
}
