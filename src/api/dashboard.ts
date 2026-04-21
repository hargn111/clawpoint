import { useQuery } from '@tanstack/react-query'
import type { DashboardMeta, LoadState, GatewayHealth, ReminderItem, SessionItem } from '../lib/types'

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Dashboard API failed with ${response.status}`)
  }
  return response.json()
}

export function useDashboardMeta() {
  return useQuery({
    queryKey: ['dashboard-meta'],
    queryFn: () => getJson<DashboardMeta>('/api/dashboard/meta'),
    refetchInterval: 30_000,
  })
}

export function useGatewayHealthQuery() {
  return useQuery({
    queryKey: ['gateway-health'],
    queryFn: () => getJson<LoadState<GatewayHealth>>('/api/dashboard/gateway-health'),
    refetchInterval: 30_000,
  })
}

export function useReminderQueueQuery() {
  return useQuery({
    queryKey: ['reminder-queue'],
    queryFn: () => getJson<LoadState<ReminderItem[]>>('/api/dashboard/reminders'),
    refetchInterval: 30_000,
  })
}

export function useSessionsOverviewQuery() {
  return useQuery({
    queryKey: ['sessions-overview'],
    queryFn: () => getJson<LoadState<SessionItem[]>>('/api/dashboard/sessions'),
    refetchInterval: 30_000,
  })
}
