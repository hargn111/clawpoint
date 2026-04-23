import { useMemo, useState, type ReactNode } from 'react'

export type WorkspaceTab = {
  id: string
  label: string
  group: string
  icon?: string
  eyebrow?: string
  title: string
  description: string
  content: ReactNode
}

type WorkspaceTabsProps = {
  tabs: WorkspaceTab[]
  defaultTabId?: string
}

export function WorkspaceTabs({ tabs, defaultTabId }: WorkspaceTabsProps) {
  const initialTab = useMemo(() => {
    if (defaultTabId && tabs.some((tab) => tab.id === defaultTabId)) {
      return defaultTabId
    }
    return tabs[0]?.id ?? ''
  }, [defaultTabId, tabs])

  const [activeTabId, setActiveTabId] = useState(initialTab)
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]

  const groupedTabs = useMemo(() => {
    const groups = new Map<string, WorkspaceTab[]>()
    for (const tab of tabs) {
      const existing = groups.get(tab.group) ?? []
      existing.push(tab)
      groups.set(tab.group, existing)
    }
    return [...groups.entries()]
  }, [tabs])

  if (!activeTab) {
    return null
  }

  return (
    <section className="workspace-layout">
      <aside className="workspace-sidebar">
        <div className="workspace-sidebar-header">
          <span className="workspace-brand">Clawpoint</span>
          <span className="workspace-sidebar-copy">Management dashboard</span>
        </div>

        {groupedTabs.map(([group, groupTabs]) => (
          <div key={group} className="workspace-sidebar-group">
            <span className="workspace-sidebar-label">{group}</span>
            <div className="workspace-tab-list" role="tablist" aria-label={`${group} sections`}>
              {groupTabs.map((tab) => {
                const selected = tab.id === activeTab.id
                return (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    className={`workspace-tab ${selected ? 'workspace-tab-active' : ''}`}
                    onClick={() => setActiveTabId(tab.id)}
                    title={tab.description}
                  >
                    <span className="workspace-tab-main">
                      <span className="workspace-tab-icon" aria-hidden="true">
                        {tab.icon ?? '•'}
                      </span>
                      <span className="workspace-tab-label">{tab.label}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </aside>

      <div className="workspace-panel" role="tabpanel" aria-labelledby={`tab-${activeTab.id}`}>
        <div className="workspace-panel-header">
          <div>
            {activeTab.eyebrow ? <p className="eyebrow">{activeTab.eyebrow}</p> : null}
            <h2>{activeTab.title}</h2>
            <p className="panel-copy">{activeTab.description}</p>
          </div>
        </div>

        <div className="workspace-panel-content">{activeTab.content}</div>
      </div>
    </section>
  )
}
