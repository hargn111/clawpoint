import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  DashboardMeta,
  GatewayHealth,
  LoadState,
  LogEventList,
  PermissionsSummary,
  ReminderItem,
  SessionAdminList,
  SessionCreateInput,
  SessionItem,
  SessionMessageInput,
  TaskgardenTask,
  TaskgardenTaskCreateInput,
  TaskgardenTaskList,
  TaskgardenTaskUpdateInput,
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

export function useCreateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SessionCreateInput) =>
      sendJson<{ sessionId: string; ok: true }>('/api/session-admin/sessions', 'POST', input),
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
