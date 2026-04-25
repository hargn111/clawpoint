import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useSessionsOverview } from '../api/useSessionsOverview'

export function SessionOverviewCard() {
  const { data, isLoading } = useSessionsOverview()
  const items = data?.data ?? []

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Recent sessions</p>
          <h3>Active workstreams</h3>
        </div>
        <FreshnessStamp updatedAt={data?.updatedAt} isFetching={isLoading} />
      </div>

      {items.length === 0 && !isLoading ? <div className="empty-state">No recent sessions are visible.</div> : null}

      <ul className="list">
        {items.map((session) => (
          <li key={session.id} className="list-row">
            <div>
              <strong>{session.label}</strong>
              <p>
                {session.kind} · {session.summary}
              </p>
            </div>
            <span className={`badge badge-${session.state}`}>{session.state}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
