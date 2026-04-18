import type { PropsWithChildren } from 'react'

export function DashboardShell({ children }: PropsWithChildren) {
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Prototype</p>
          <h2>Control without the clutter</h2>
        </div>
        <div className="status-pill">
          <span className="status-dot" />
          Live data connected
        </div>
      </header>
      {children}
    </main>
  )
}
