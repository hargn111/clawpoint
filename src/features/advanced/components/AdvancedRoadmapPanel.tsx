import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useAdvancedRoadmap } from '../../../api/dashboard'

export function AdvancedRoadmapPanel() {
  const { data, isLoading, isFetching } = useAdvancedRoadmap()

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Product roadmap</p>
          <h3>Next-era Clawpoint</h3>
          <p className="panel-copy">Tracks the next useful surfaces for local operations, especially workflows that Control UI does not own or cannot easily make durable.</p>
        </div>
        <div className="freshness-stack">
          <span className="badge badge-waiting">next</span>
          <FreshnessStamp updatedAt={data?.updatedAt} isFetching={isLoading || isFetching} />
        </div>
      </div>

      {isLoading ? <div className="empty-state">Loading roadmap…</div> : null}
      {!isLoading && (data?.items ?? []).length === 0 ? <div className="empty-state">No roadmap items available yet.</div> : null}

      <div className="roadmap-grid">
        {(data?.items ?? []).map((item, index) => (
          <article key={item.id} className="detail-card roadmap-card">
            <div className="panel-subheader">
              <span className="metric-label">#{index + 1}</span>
              <span className="badge badge-idle">{item.status}</span>
            </div>
            <strong>{item.title}</strong>
            <p className="detail-copy">{item.summary}</p>
            {item.blockedBy ? <p className="detail-copy warning-copy">Blocked by: {item.blockedBy}</p> : null}
            <ul className="roadmap-next-steps">
              {item.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
