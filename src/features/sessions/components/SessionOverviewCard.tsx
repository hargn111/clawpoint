import { useSessionsOverview } from '../api/useSessionsOverview'

export function SessionOverviewCard() {
  const { data, isLoading } = useSessionsOverview()
  const items = data?.data ?? []

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Sessions</p>
          <h3>Who is doing what</h3>
        </div>
        <span className="muted-copy">{isLoading ? 'Loading…' : 'Owner-centric view'}</span>
      </div>

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
