import type { PropsWithChildren } from 'react'

export function DashboardShell({ children }: PropsWithChildren) {
  return <main className="shell">{children}</main>
}
