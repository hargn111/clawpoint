import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AdvancedRoadmap,
  AutomationInspector,
  ChangeAuditLog,
  DangerZoneSummary,
  DashboardMeta,
  EffectiveConfigSummary,
  GatewayHealth,
  LoadState,
  LogEventList,
  ModelProfileList,
  PermissionsSummary,
  ReminderItem,
  SessionAdminList,
  SessionCreateInput,
  SessionHistoryDetail,
  SessionHistoryList,
  SessionItem,
  SessionMessageInput,
  SessionModelList,
  SessionPermissionSummary,
  SessionUpdateInput,
  TaskgardenTask,
  TaskgardenTaskCreateInput,
  TaskgardenTaskList,
  TaskgardenTaskUpdateInput,
  ToolInventory,
} from '../lib/types'

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Dashboard API failed with ${response.status}`)
  }
  return response.json()
}

async function sendJson<T>(url: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message = payload?.error || `Dashboard API failed with ${response.status}`
    throw new Error(message)
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
    refetchInterval: 10_000,
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

export function useTaskgardenTasks() {
  return useQuery({
    queryKey: ['taskgarden-tasks'],
    queryFn: () => getJson<TaskgardenTaskList>('/api/taskgarden/tasks'),
    refetchInterval: 30_000,
  })
}

export function useLogsEvents() {
  return useQuery({
    queryKey: ['logs-events'],
    queryFn: () => getJson<LogEventList>('/api/logs/events'),
    refetchInterval: 10_000,
  })
}

export function usePermissionsSummary() {
  return useQuery({
    queryKey: ['permissions-summary'],
    queryFn: () => getJson<PermissionsSummary>('/api/permissions/summary'),
    refetchInterval: 30_000,
  })
}

export function useEffectiveConfigSummary() {
  return useQuery({
    queryKey: ['effective-config-summary'],
    queryFn: () => getJson<EffectiveConfigSummary>('/api/advanced/effective-config'),
    refetchInterval: 30_000,
  })
}

export function useModelProfiles() {
  return useQuery({
    queryKey: ['model-profiles'],
    queryFn: () => getJson<ModelProfileList>('/api/advanced/model-profiles'),
    refetchInterval: 60_000,
  })
}

export function useToolInventory(sessionKey = 'agent:main:main') {
  return useQuery({
    queryKey: ['tool-inventory', sessionKey],
    queryFn: () => getJson<ToolInventory>(`/api/advanced/tool-inventory?sessionKey=${encodeURIComponent(sessionKey)}`),
    refetchInterval: 60_000,
  })
}

export function useSessionPermissions(sessionKey = '') {
  return useQuery({
    queryKey: ['session-permissions', sessionKey],
    queryFn: () => getJson<SessionPermissionSummary>(`/api/advanced/session-permissions?sessionKey=${encodeURIComponent(sessionKey)}`),
    refetchInterval: 60_000,
  })
}

export type SessionHistoryFilters = { q?: string; agentId?: string; channel?: string; dateFrom?: string; dateTo?: string }

export function localDateBoundaryIso(value = '', boundary: 'start' | 'end' = 'start') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const [year, month, day] = value.split('-').map(Number)
  const date = boundary === 'end'
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0)
  return date.toISOString()
}

export function useSessionHistoryList(filters: SessionHistoryFilters = {}) {
  return useQuery({
    queryKey: ['session-history-list', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(filters)) {
        if (!value) continue
        if (key === 'dateFrom') params.set(key, localDateBoundaryIso(value, 'start'))
        else if (key === 'dateTo') params.set(key, localDateBoundaryIso(value, 'end'))
        else params.set(key, value)
      }
      const query = params.toString()
      return getJson<SessionHistoryList>(`/api/advanced/session-history${query ? `?${query}` : ''}`)
    },
    refetchInterval: 60_000,
  })
}

export function useSessionHistoryDetail(sessionKey = '') {
  return useQuery({
    queryKey: ['session-history-detail', sessionKey],
    queryFn: () => getJson<SessionHistoryDetail>(`/api/advanced/session-history/detail?sessionKey=${encodeURIComponent(sessionKey)}`),
    enabled: Boolean(sessionKey),
    refetchInterval: 60_000,
  })
}

export function useAdvancedRoadmap() {
  return useQuery({
    queryKey: ['advanced-roadmap'],
    queryFn: () => getJson<AdvancedRoadmap>('/api/advanced/roadmap'),
    staleTime: 5 * 60_000,
  })
}

export function useChangeAuditLog() {
  return useQuery({
    queryKey: ['change-audit-log'],
    queryFn: () => getJson<ChangeAuditLog>('/api/advanced/change-audit-log'),
    refetchInterval: 10_000,
  })
}

export function useAutomationInspector() {
  return useQuery({
    queryKey: ['automation-inspector'],
    queryFn: () => getJson<AutomationInspector>('/api/advanced/automation-inspector'),
    refetchInterval: 15_000,
  })
}

export function useAutomationJobAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'enable' | 'disable' | 'run-now' }) =>
      sendJson<{ ok: true }>(`/api/advanced/automation-inspector/${encodeURIComponent(id)}/${action}`, 'POST'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['automation-inspector'] })
      void queryClient.invalidateQueries({ queryKey: ['change-audit-log'] })
    },
  })
}

export function useDangerZoneSummary() {
  return useQuery({
    queryKey: ['danger-zone'],
    queryFn: () => getJson<DangerZoneSummary>('/api/advanced/danger-zone'),
    refetchInterval: 30_000,
  })
}

export function useDangerZoneAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ action, confirmation }: { action: string; confirmation?: string }) =>
      sendJson<unknown>(`/api/advanced/danger-zone/${action}`, 'POST', { confirmation }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['danger-zone'] })
      void queryClient.invalidateQueries({ queryKey: ['change-audit-log'] })
      void queryClient.invalidateQueries({ queryKey: ['logs-events'] })
    },
  })
}

export function useCreateTaskgardenTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: TaskgardenTaskCreateInput) =>
      sendJson<{ item: TaskgardenTask }>('/api/taskgarden/tasks', 'POST', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['taskgarden-tasks'] })
      void queryClient.invalidateQueries({ queryKey: ['reminder-queue'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-meta'] })
    },
  })
}

export function useUpdateTaskgardenTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TaskgardenTaskUpdateInput }) =>
      sendJson<{ item: TaskgardenTask }>(`/api/taskgarden/tasks/${id}`, 'PATCH', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['taskgarden-tasks'] })
      void queryClient.invalidateQueries({ queryKey: ['reminder-queue'] })
    },
  })
}

export function useSessionAdminList() {
  return useQuery({
    queryKey: ['session-admin-list'],
    queryFn: () => getJson<SessionAdminList>('/api/session-admin/sessions'),
    refetchInterval: 30_000,
  })
}

export function useSessionModelList() {
  return useQuery({
    queryKey: ['session-model-list'],
    queryFn: () => getJson<SessionModelList>('/api/session-admin/models'),
    staleTime: 5 * 60_000,
  })
}

export function useCreateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SessionCreateInput) =>
      sendJson<{ sessionId: string; key: string; ok: true }>('/api/session-admin/sessions', 'POST', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['session-admin-list'] })
      void queryClient.invalidateQueries({ queryKey: ['sessions-overview'] })
      void queryClient.invalidateQueries({ queryKey: ['logs-events'] })
    },
  })
}

export function useUpdateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SessionUpdateInput }) =>
      sendJson<{ ok: true }>(`/api/session-admin/sessions/${id}`, 'PATCH', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['session-admin-list'] })
      void queryClient.invalidateQueries({ queryKey: ['sessions-overview'] })
      void queryClient.invalidateQueries({ queryKey: ['logs-events'] })
    },
  })
}

export function useSendSessionMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SessionMessageInput }) =>
      sendJson<{ ok: true }>(`/api/session-admin/sessions/${id}/message`, 'POST', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['session-admin-list'] })
      void queryClient.invalidateQueries({ queryKey: ['sessions-overview'] })
      void queryClient.invalidateQueries({ queryKey: ['logs-events'] })
    },
  })
}
