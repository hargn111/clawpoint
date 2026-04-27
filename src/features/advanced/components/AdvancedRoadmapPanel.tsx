import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useAdvancedRoadmap } from '../../../api/dashboard'

export function AdvancedRoadmapPanel() {
  const { data, isLoading, isFetching } = useAdvancedRoadmap()

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Advanced roadmap</p>
          <h3>Operator-console next steps</h3>
          <p className="panel-copy">Tracks what shipped, what is partial, and the concrete follow-up work for each Advanced surface.</p>
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
