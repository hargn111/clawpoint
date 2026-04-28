import { useMemo, useState } from 'react'
import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useToolInventory } from '../../../api/dashboard'

function badgeClass(status?: string) {
  if (status === 'healthy') return 'badge-healthy'
  if (status === 'warning') return 'badge-waiting'
  return 'badge-idle'
}

export function ToolInventoryPanel() {
  const { data, isLoading, isFetching } = useToolInventory()
  const [groupFilter, setGroupFilter] = useState('all')
  const [selectedToolId, setSelectedToolId] = useState('')
  const groups = data?.groups ?? []
  const visibleGroups = useMemo(
    () => (groupFilter === 'all' ? groups : groups.filter((group) => group.id === groupFilter)),
    [groupFilter, groups],
  )
  const selectedTool = useMemo(() => {
    const tools = groups.flatMap((group) => group.tools.map((tool) => ({ ...tool, groupLabel: group.label })))
    return tools.find((tool) => tool.id === selectedToolId) ?? tools[0]
  }, [groups, selectedToolId])

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">MCP / Tool Inventory</p>
          <h3>Effective tools and configured providers</h3>
          <p className="panel-copy">Runtime tool groups for the main session plus safe metadata for plugins, MCP servers, and tool config.</p>
        </div>
        <div className="freshness-stack">
          <span className="badge badge-healthy">implemented</span>
          <FreshnessStamp updatedAt={data?.updatedAt} isFetching={isLoading || isFetching} />
        </div>
      </div>

      <div className="status-strip status-strip-compact">
        <div className="status-tile status-tile-primary">
          <span className="metric-label">profile</span>
          <strong>{data?.profile ?? '...'}</strong>
          <span>effective runtime profile</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">tools</span>
          <strong>{data?.counts.tools ?? '...'}</strong>
          <span>{data?.counts.groups ?? 0} groups</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">plugins</span>
          <strong>{data?.counts.plugins ?? '...'}</strong>
          <span>configured entries</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">mcp</span>
          <strong>{data?.counts.mcpServers ?? '...'}</strong>
          <span>configured servers</span>
        </div>
        <div className="status-tile">
          <span className="metric-label">web search</span>
          <strong>{data?.toolsConfig.webSearch ?? '...'}</strong>
          <span>tool config</span>
        </div>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <span className="metric-label">Tool profile</span>
          <strong>{data?.toolsConfig.profile ?? '...'}</strong>
          <p className="detail-copy">Configured profile in the OpenClaw tools section.</p>
        </article>
        <article className="detail-card">
          <span className="metric-label">Elevated tool policy</span>
          <strong>{data?.toolsConfig.elevated ?? '...'}</strong>
          <p className="detail-copy">Secret-bearing config remains hidden; this only shows safe policy state.</p>
        </article>
      </div>

      <div className="panel-subheader advanced-section-header">
        <div>
          <h4>Effective tool groups</h4>
          <p className="selector-copy">Descriptions are shortened to keep the dashboard scannable.</p>
        </div>
        <label className="field-label field-label-inline">
          Group
          <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
            <option value="all">All groups</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>{group.label}</option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? <div className="empty-state">Loading tool inventory…</div> : null}

      {!isLoading && visibleGroups.length === 0 ? <div className="empty-state">No tool groups match the selected filter.</div> : null}
      <div className="tool-group-grid">
        {visibleGroups.map((group) => (
          <article key={group.id} className="editor-card tool-group-card">
            <div className="panel-subheader">
              <div>
                <p className="eyebrow">{group.source}</p>
                <h4>{group.label}</h4>
              </div>
              <span className="badge badge-idle">{group.tools.length} tools</span>
            </div>
            {group.tools.length === 0 ? <div className="empty-state">No tools exposed by this group.</div> : null}
            <div className="selector-list tool-list-compact">
              {group.tools.slice(0, 12).map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  className={`selector-item tool-inventory-item ${selectedTool?.id === tool.id ? 'selector-item-active' : ''}`}
                  onClick={() => setSelectedToolId(tool.id)}
                >
                  <span className="selector-item-copy">
                    <strong>{tool.label}</strong>
                    <span className="selector-copy">{tool.id}</span>
                    {tool.description ? <span className="selector-copy">{tool.description}</span> : null}
                  </span>
                </button>
              ))}
            </div>
            {group.tools.length > 12 ? <p className="selector-copy">+{group.tools.length - 12} more tools in this group.</p> : null}
          </article>
        ))}
      </div>

      <div className="advanced-config-grid">
        <article className="editor-card">
          <div className="panel-subheader">
            <div>
              <h4>Selected tool detail</h4>
              <p className="selector-copy">Schema-safe drawer for the next inventory wave.</p>
            </div>
            <span className="badge badge-idle">{selectedTool?.groupLabel ?? 'runtime'}</span>
          </div>
          {selectedTool ? (
            <div className="detail-card tool-detail-drawer">
              <span className="metric-label">{selectedTool.source}</span>
              <strong>{selectedTool.label}</strong>
              <code>{selectedTool.id}</code>
              <ul className="list compact-list">
                {selectedTool.detail.map((line) => <li key={line}>{line}</li>)}
              </ul>
              <p className="selector-copy">Schema keys: {selectedTool.inputSchemaKeys.length ? selectedTool.inputSchemaKeys.join(', ') : 'none exposed'}</p>
            </div>
          ) : <div className="empty-state">No tool selected.</div>}
        </article>

        <article className="editor-card">
          <div className="panel-subheader">
            <h4>Plugins</h4>
            <span className="badge badge-idle">{data?.plugins.length ?? 0}</span>
          </div>
          <div className="selector-list tool-list-compact">
            {(data?.plugins ?? []).map((plugin) => (
              <div key={plugin.id} className="selector-item tool-inventory-item">
                <span className="selector-item-copy">
                  <strong>{plugin.id}</strong>
                  <span className="selector-copy">{plugin.hasConfig ? `config: ${plugin.configKeys.join(', ') || 'present'}` : 'no config block'}</span>
                </span>
                <span className={`badge ${badgeClass(plugin.status)}`}>{plugin.enabled ? 'enabled' : 'disabled'}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="editor-card">
          <div className="panel-subheader">
            <h4>MCP servers</h4>
            <span className="badge badge-idle">{data?.mcpServers.length ?? 0}</span>
          </div>
          {(data?.mcpServers.length ?? 0) === 0 ? <div className="empty-state">No MCP servers configured.</div> : null}
          <div className="selector-list tool-list-compact">
            {(data?.mcpServers ?? []).map((server) => (
              <div key={server.id} className="selector-item tool-inventory-item">
                <span className="selector-item-copy">
                  <strong>{server.id}</strong>
                  <span className="selector-copy">{server.transport}</span>
                  {server.urlHost ? <span className="selector-copy">host: {server.urlHost}</span> : null}
                  {server.command ? <span className="selector-copy">command: {server.command}</span> : null}
                </span>
                <span className={`badge ${badgeClass(server.status)}`}>{server.status}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <ul className="list compact-list">
        {(data?.notes ?? []).map((note) => <li key={note}>{note}</li>)}
      </ul>
    </section>
  )
}
