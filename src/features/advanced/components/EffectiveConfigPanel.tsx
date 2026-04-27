import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useEffectiveConfigSummary } from '../../../api/dashboard'

function badgeClass(status?: string) {
  if (status === 'healthy') return 'badge-healthy'
  if (status === 'warning') return 'badge-waiting'
  return 'badge-idle'
}

export function EffectiveConfigPanel() {
  const { data, isLoading, isFetching } = useEffectiveConfigSummary()

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Effective config</p>
          <h3>Current runtime shape</h3>
          <p className="panel-copy">Safe read-only values with their source, so config state is inspectable before it becomes editable.</p>
        </div>
        <div className="freshness-stack">
          <span className="badge badge-idle">read-only</span>
          <FreshnessStamp updatedAt={data?.updatedAt} isFetching={isLoading || isFetching} />
        </div>
      </div>

      <div className="advanced-config-grid">
        {(data?.items ?? []).map((item) => (
          <article key={item.key} className="detail-card advanced-config-card">
            <div className="panel-subheader">
              <span className="metric-label">{item.label}</span>
              <span className={`badge ${badgeClass(item.status)}`}>{item.status}</span>
            </div>
            <strong>{item.value}</strong>
            <span className="selector-copy">Source: {item.source}</span>
            {item.sensitive ? <span className="selector-copy">Secret material is intentionally not displayed.</span> : null}
          </article>
        ))}
      </div>

      {isLoading ? <div className="empty-state">Loading effective config…</div> : null}

      <ul className="list compact-list">
        {(data?.notes ?? []).map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  )
}
