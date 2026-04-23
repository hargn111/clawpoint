export function PlatformWatchCard() {
  const notes = [
    '2026.4.20-beta.1 looks worth watching for stable because cron runtime state split and session pruning target backlog/OOM pain.',
    'Active Memory fail-open is a meaningful quality-of-life change for turns that should not break on memory retrieval issues.',
    'Third-party memory packages still look lower value than native memory for this setup, so this dashboard stays native-first.',
  ]

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Platform watch</p>
          <h3>Worth watching upstream</h3>
        </div>
        <span className="badge badge-waiting">beta watch</span>
      </div>

      <ul className="list compact-list">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  )
}
