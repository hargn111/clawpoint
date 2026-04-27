import { useState } from 'react'
import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useModelProfiles } from '../../../api/dashboard'
import { useSessionCreate } from '../../sessions/api/useSessionAdmin'
import type { ModelProfile } from '../../../lib/types'

function profileDefaults(profile: ModelProfile) {
  return [
    ['Model', profile.model || 'not configured'],
    ['Thinking', profile.thinking],
    ['Verbose', profile.verbose],
    ['Reasoning', profile.reasoning],
    ['Context', profile.contextBudget],
  ]
}

export function ModelProfilesPanel() {
  const { data, isLoading, isFetching } = useModelProfiles()
  const createSession = useSessionCreate()
  const [status, setStatus] = useState<string>('')

  async function launchProfile(profile: ModelProfile) {
    setStatus(`Starting ${profile.name} profile…`)
    try {
      const created = await createSession.mutateAsync({
        label: profile.launchLabel,
        model: profile.model,
        thinking: profile.thinking,
        verbose: profile.verbose,
        reasoning: profile.reasoning,
      })
      setStatus(`Created ${profile.name} profile session: ${created.key}`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Model profiles</p>
          <h3>Launch-ready session presets</h3>
          <p className="panel-copy">Dashboard-owned presets for common modes of work. They create sessions without mutating global defaults.</p>
        </div>
        <div className="freshness-stack">
          <span className="badge badge-healthy">implemented</span>
          <FreshnessStamp updatedAt={data?.updatedAt} isFetching={isLoading || isFetching} />
        </div>
      </div>

      {isLoading ? <div className="empty-state">Loading model profiles…</div> : null}

      <div className="profile-grid">
        {(data?.items ?? []).map((profile) => (
          <article key={profile.id} className="editor-card profile-card">
            <div className="panel-subheader">
              <div>
                <p className="eyebrow">{profile.contextBudget} context</p>
                <h4>{profile.name}</h4>
              </div>
              <span className={`badge ${profile.available ? 'badge-healthy' : 'badge-waiting'}`}>
                {profile.available ? 'ready' : 'missing model'}
              </span>
            </div>

            <p className="detail-copy">{profile.purpose}</p>

            <div className="profile-defaults">
              {profileDefaults(profile).map(([label, value]) => (
                <div key={label} className="profile-default-row">
                  <span className="metric-label">{label}</span>
                  <code className="inline-code">{value}</code>
                </div>
              ))}
            </div>

            <p className="selector-copy">Model source: {profile.modelSource}</p>

            <button
              type="button"
              className="button-primary"
              disabled={!profile.available || createSession.isPending}
              onClick={() => void launchProfile(profile)}
            >
              Start session from profile
            </button>
          </article>
        ))}
      </div>

      {status ? <div className="empty-state">{status}</div> : null}

      <ul className="list compact-list">
        {(data?.notes ?? []).map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  )
}
