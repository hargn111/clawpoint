import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useReminderQueue } from '../api/useReminderQueue'

export function ReminderQueueCard() {
  const { data, isLoading } = useReminderQueue()
  const items = data?.data ?? []

  return (
    <section className="panel-card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Reminder-backed tasks</p>
          <h3>Attention queue</h3>
        </div>
        <div className="freshness-stack">
          <span className="muted-copy">{isLoading ? 'Loading…' : `${items.length} items`}</span>
          <FreshnessStamp updatedAt={data?.updatedAt} isFetching={isLoading} />
        </div>
      </div>

      {items.length === 0 && !isLoading ? (
        <div className="empty-state">No reminder-backed tasks are currently visible.</div>
      ) : null}

      <ul className="list">
        {items.map((item) => (
          <li key={item.id} className="list-row">
            <div>
              <strong>{item.title}</strong>
              <p>
                {item.bucket} · {item.dueLabel}
              </p>
            </div>
            <span className={`badge badge-${item.status}`}>{item.status}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
