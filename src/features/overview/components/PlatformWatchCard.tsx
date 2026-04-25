import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useDashboardMeta } from '../../../api/dashboard'

export function PlatformWatchCard() {
  const { data, isLoading, isFetching } = useDashboardMeta()
  const openclawVersion = data?.platform?.openclawVersion
  const notes = [
    openclawVersion
      ? `Running OpenClaw ${openclawVersion}. Platform Watch now reports the installed version instead of a remembered beta note.`
      : 'OpenClaw version could not be detected from the dashboard runtime.',
    'No newer upstream watch item is configured in Clawpoint yet. This panel should stay factual until it has a live release feed or an explicit watch source.',
    'If we keep this panel, the next step should be replacing static notes with release metadata from the gateway or an explicit updater job.',
  ]

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Platform watch</p>
          <h3>Installed platform</h3>
        </div>
        <div className="freshness-stack">
          <span className="badge badge-idle">{isLoading ? 'checking' : openclawVersion ?? 'unknown'}</span>
          <FreshnessStamp updatedAt={data?.updatedAt} isFetching={isFetching} />
        </div>
      </div>

      <ul className="list compact-list">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  )
}
