import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  useCreateSession,
  useCreateTaskgardenTask,
  useSendSessionMessage,
  useUpdateSession,
  useUpdateTaskgardenTask,
} from '../src/api/dashboard'

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('dashboard mutation invalidation', () => {
  it('session mutations invalidate the session-admin list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, sessionId: 's-1', key: 'key-1' }) }),
    )

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined)
    const wrapper = createWrapper(queryClient)

    const createHook = renderHook(() => useCreateSession(), { wrapper })
    await act(async () => {
      await createHook.result.current.mutateAsync({ label: 'One' })
    })

    const updateHook = renderHook(() => useUpdateSession(), { wrapper })
    await act(async () => {
      await updateHook.result.current.mutateAsync({ id: 's-1', input: { key: 'key-1', label: 'Updated' } })
    })

    const sendHook = renderHook(() => useSendSessionMessage(), { wrapper })
    await act(async () => {
      await sendHook.result.current.mutateAsync({ id: 's-1', input: { key: 'key-1', message: 'Hello' } })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['session-admin-list'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['sessions-overview'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['logs-events'] })
  })

  it('task mutations invalidate the taskgarden task list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ item: { id: 't-1', title: 'Task', bucket: 'planned', status: 'open', created_at: '2026-04-24T00:00:00Z' } }),
      }),
    )

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined)
    const wrapper = createWrapper(queryClient)

    const createHook = renderHook(() => useCreateTaskgardenTask(), { wrapper })
    await act(async () => {
      await createHook.result.current.mutateAsync({ title: 'Task' })
    })

    const updateHook = renderHook(() => useUpdateTaskgardenTask(), { wrapper })
    await act(async () => {
      await updateHook.result.current.mutateAsync({ id: 't-1', input: { title: 'Task updated' } })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['taskgarden-tasks'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['reminder-queue'] })
  })
})
