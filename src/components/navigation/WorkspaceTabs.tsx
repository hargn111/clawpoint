import { useMemo, useState, type ReactNode } from 'react'

export type WorkspaceTab = {
  id: string
  label: string
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

  if (!activeTab) {
    return null
  }

  return (
    <section className="workspace-tabs">
      <aside className="workspace-sidebar">
        <div className="workspace-sidebar-header">
          <span className="workspace-sidebar-label">Sections</span>
        </div>

        <div className="workspace-tab-list" role="tablist" aria-label="Clawpoint sections">
          {tabs.map((tab) => {
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
              >
                <span className="workspace-tab-label">{tab.label}</span>
                <span
                  className="workspace-tab-tooltip"
                  aria-label={`${tab.label}: ${tab.description}`}
                  title={tab.description}
                >
                  ?
                </span>
              </button>
            )
          })}
        </div>
      </aside>

      <div className="workspace-panel" role="tabpanel" aria-labelledby={`tab-${activeTab.id}`}>
        <div className="workspace-panel-header">
          <div>
            {activeTab.eyebrow ? <p className="eyebrow">{activeTab.eyebrow}</p> : null}
            <h2>{activeTab.title}</h2>
          </div>
        </div>

        <div className="workspace-panel-content">{activeTab.content}</div>
      </div>
    </section>
  )
}
