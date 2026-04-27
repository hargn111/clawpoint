import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useAdvancedRoadmap } from '../../../api/dashboard'

export function AdvancedRoadmapPanel() {
  const { data, isLoading, isFetching } = useAdvancedRoadmap()

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Advanced roadmap</p>
          <h3>Next six operator-console additions</h3>
          <p className="panel-copy">Tracked here so the remaining Advanced work stays visible after Model Profiles and Effective Config.</p>
        </div>
        <div className="freshness-stack">
          <span className="badge badge-waiting">next</span>
          <FreshnessStamp updatedAt={data?.updatedAt} isFetching={isLoading || isFetching} />
        </div>
      </div>

      {isLoading ? <div className="empty-state">Loading roadmap…</div> : null}

      <div className="roadmap-grid">
        {(data?.items ?? []).map((item, index) => (
          <article key={item.id} className="detail-card roadmap-card">
            <div className="panel-subheader">
              <span className="metric-label">#{index + 1}</span>
              <span className="badge badge-idle">{item.status}</span>
            </div>
            <strong>{item.title}</strong>
            <p className="detail-copy">{item.summary}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
