import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { usePermissionsSummary } from '../../../api/dashboard'

function badgeClass(status?: string) {
  if (status === 'healthy' || status === 'ready') return 'badge-healthy'
  if (status === 'warning' || status === 'manual') return 'badge-waiting'
  if (status === 'error' || status === 'blocked') return 'badge-error'
  return 'badge-idle'
}

export function PermissionsPanel() {
  const { data, isLoading, isFetching } = usePermissionsSummary()

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Permissions & auth</p>
          <h3>Auth hardening posture</h3>
          <p className="panel-copy">Gateway auth, exposure checks, rotation checklist, and channel probe state without exposing secrets.</p>
        </div>
        <div className="freshness-stack">
          <span className={`badge ${badgeClass(data?.posture)}`}>
            {isLoading ? 'Loading' : data?.posture ?? 'unknown'}
          </span>
          <FreshnessStamp updatedAt={data?.updatedAt} isFetching={isLoading || isFetching} />
        </div>
      </div>

      <div className="status-strip status-strip-compact">
        <div className="status-tile status-tile-primary">
          <span className="metric-label">gateway auth</span>
          <strong>{data?.gateway.mode ?? '...'}</strong>
          <span>{data?.gateway.bind ?? '...'}</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">token</span>
          <strong>{data?.tokenConfigured ? 'configured' : 'missing'}</strong>
          <span>{data?.tokenMasked ?? '...'}</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">warnings</span>
          <strong>{data?.counts.warnings ?? '...'}</strong>
          <span>{data?.counts.errors ?? 0} errors</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">profiles</span>
          <strong>{data?.counts.authProfiles ?? '...'}</strong>
          <span>provider auth profiles</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">channels</span>
          <strong>{data?.counts.channels ?? '...'}</strong>
          <span>configured/probed</span>
        </div>
      </div>

      <div className="detail-grid gateway-detail-grid">
        <div className="detail-card">
          <span className="metric-label">gateway url</span>
          <code className="inline-code">{data?.gatewayUrl ?? '...'}</code>
        </div>
        <div className="detail-card">
          <span className="metric-label">exposure</span>
          <strong>{data?.gateway.tailscaleMode ?? '...'}</strong>
          <p className="detail-copy">
            Control UI insecure auth: {data?.gateway.controlUiInsecureAllowed ? 'allowed' : 'not allowed'} · node denies:{' '}
            {data?.gateway.nodeDenyCommandCount ?? 0}
          </p>
        </div>
      </div>

      <div className="advanced-section-header panel-subheader">
        <div>
          <h4>Hardening checks</h4>
          <p className="selector-copy">Operator-facing checks with concrete next actions.</p>
        </div>
      </div>

      <div className="advanced-config-grid">
        {(data?.checks ?? []).map((check) => (
          <article key={check.id} className="detail-card roadmap-card">
            <div className="panel-subheader">
              <span className="metric-label">{check.label}</span>
              <span className={`badge ${badgeClass(check.status)}`}>{check.status}</span>
            </div>
            <strong>{check.detail}</strong>
            <p className="detail-copy">{check.action}</p>
          </article>
        ))}
      </div>

      <div className="advanced-config-grid">
        <article className="editor-card">
          <div className="panel-subheader">
            <h4>Rotation checklist</h4>
            <span className="badge badge-idle">manual</span>
          </div>
          <div className="selector-list tool-list-compact">
            {(data?.rotationChecklist ?? []).map((item) => (
              <div key={item.id} className="selector-item tool-inventory-item">
                <span className="selector-item-copy">
                  <strong>{item.label}</strong>
                </span>
                <span className={`badge ${badgeClass(item.status)}`}>{item.status}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="editor-card">
          <div className="panel-subheader">
            <h4>Provider auth profiles</h4>
            <span className="badge badge-idle">{data?.authProfiles.length ?? 0}</span>
          </div>
          <div className="selector-list tool-list-compact">
            {(data?.authProfiles ?? []).map((profile) => (
              <div key={profile.id} className="selector-item tool-inventory-item">
                <span className="selector-item-copy">
                  <strong>{profile.provider}</strong>
                  <span className="selector-copy">{profile.mode}</span>
                </span>
                <span className={`badge ${badgeClass(profile.status)}`}>{profile.status}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="editor-card permissions-channel-card">
        <div className="panel-subheader">
          <h4>Channel probes</h4>
          <span className="badge badge-idle">{data?.channels.length ?? 0}</span>
        </div>
        {(data?.channels.length ?? 0) === 0 ? <div className="empty-state">No channel probe data available.</div> : null}
        <div className="advanced-config-grid compact-toolbar-stack">
          {(data?.channels ?? []).map((channel) => (
            <div key={channel.id} className="detail-card">
              <div className="panel-subheader">
                <strong>{channel.label}</strong>
                <span className={`badge ${badgeClass(channel.status)}`}>{channel.probeOk ? 'probe ok' : 'check'}</span>
              </div>
              <p className="detail-copy">
                configured: {channel.configured ? 'yes' : 'no'} · running: {channel.running ? 'yes' : 'no'} · token source: {channel.tokenSource}
              </p>
            </div>
          ))}
        </div>
      </article>

      <ul className="list compact-list">
        {(data?.notes ?? []).map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>

      <div className="hint-row">
        <span className="cli-pill">GATEWAY_TOKEN</span>
        <span className="cli-pill">gateway.auth.mode</span>
        <span className="cli-pill">gateway.nodes.denyCommands</span>
      </div>
    </section>
  )
}
