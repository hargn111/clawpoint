import { useQuery } from '@tanstack/react-query'
import type { DashboardSnapshot } from '../lib/types'

async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const response = await fetch('/api/dashboard')
  if (!response.ok) {
    throw new Error(`Dashboard API failed with ${response.status}`)
  }
  return response.json()
}

export function useDashboardSnapshot() {
  return useQuery({
    queryKey: ['dashboard-snapshot'],
    queryFn: getDashboardSnapshot,
    refetchInterval: 30_000,
  })
}
