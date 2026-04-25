import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useGatewayHealth } from '../api/useGatewayHealth'

function SparkBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)

  return (
    <div className="sparkline" aria-hidden="true">
      {values.map((value, index) => (
        <span key={`${value}-${index}`} className="sparkline-bar" style={{ height: `${Math.max(12, (value / max) * 48)}px` }} />
      ))}
    </div>
  )
}

export function GatewayHealthCard() {
  const { data, isLoading } = useGatewayHealth()
  const values = data?.data.latencySamples?.length ? data.data.latencySamples : [0]

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Gateway performance</p>
          <h3>Health and latency</h3>
        </div>
        <div className="freshness-stack">
          <span className={`badge badge-${data?.data.service ?? 'healthy'}`}>
            {isLoading ? 'Loading' : data?.data.service ?? 'healthy'}
          </span>
          <FreshnessStamp updatedAt={data?.updatedAt} isFetching={isLoading} />
        </div>
      </div>

      <div className="metric-grid metric-grid-health">
        <div className="metric-card">
          <span className="metric-label">active sessions</span>
          <strong className="metric-value">{isLoading ? '...' : data?.data.queueDepth}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">req/min</span>
          <strong className="metric-value">{isLoading ? '...' : data?.data.requestsPerMinute}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">avg latency</span>
          <strong className="metric-value">{isLoading ? '...' : `${data?.data.avgLatencyMs} ms`}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">p95 latency</span>
          <strong className="metric-value">{isLoading ? '...' : `${data?.data.p95LatencyMs} ms`}</strong>
        </div>
      </div>

      <div className="detail-grid gateway-detail-grid">
        <div className="detail-card">
          <span className="metric-label">uptime</span>
          <strong>{isLoading ? '...' : data?.data.uptimeLabel}</strong>
          <p className="detail-copy">Restarted {isLoading ? '...' : new Date(data?.data.lastRestartAt ?? '').toLocaleString('en-US', { timeZone: 'America/New_York' })}</p>
        </div>
        <div className="detail-card">
          <span className="metric-label">heartbeat freshness</span>
          <strong>{isLoading ? '...' : data?.data.lastHeartbeat}</strong>
          <div className="hint-row">
            <span className="cli-pill">openclaw gateway call status</span>
          </div>
        </div>
      </div>

      <div className="sparkline-card">
        <div className="panel-subheader">
          <span className="metric-label">latency samples</span>
          <span className="muted-copy">last {values.length} API requests · taller bars mean slower responses</span>
        </div>
        <SparkBars values={values} />
      </div>
    </section>
  )
}
