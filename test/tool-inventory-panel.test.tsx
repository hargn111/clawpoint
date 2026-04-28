import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const inventoryMock = vi.hoisted(() => {
  const baseData = {
    updatedAt: '2026-04-28T04:50:00Z',
    sessionKey: 'main',
    profile: 'default',
    counts: { groups: 1, tools: 0, plugins: 0, mcpServers: 0 },
    toolsConfig: { profile: 'default', webSearch: 'enabled', elevated: 'guarded' },
    plugins: [],
    mcpServers: [],
    groups: [
      {
        id: 'empty-group',
        label: 'Empty group',
        source: 'runtime',
        tools: [],
      },
    ],
    notes: [],
  }
  return {
    baseData,
    value: {
      data: baseData,
      isLoading: false,
      isFetching: false,
    },
  }
})

vi.mock('../src/api/dashboard', () => ({
  useToolInventory: () => inventoryMock.value,
}))

import { ToolInventoryPanel } from '../src/features/advanced/components/ToolInventoryPanel'

describe('ToolInventoryPanel empty states', () => {
  afterEach(() => {
    cleanup()
    inventoryMock.value = { data: inventoryMock.baseData, isLoading: false, isFetching: false }
  })

  it('renders an empty state for groups with no exposed tools', () => {
    render(<ToolInventoryPanel />)

    expect(screen.getByText('No tools exposed by this group.')).not.toBeNull()
  })

  it('renders an empty state when a selected group filter no longer has visible groups', () => {
    inventoryMock.value = {
      data: {
        ...inventoryMock.baseData,
        groups: [
          { id: 'alpha', label: 'Alpha', source: 'runtime', tools: [] },
          { id: 'beta', label: 'Beta', source: 'runtime', tools: [] },
        ],
      },
      isLoading: false,
      isFetching: false,
    }

    const { rerender } = render(<ToolInventoryPanel />)
    fireEvent.change(screen.getByLabelText('Group'), { target: { value: 'beta' } })

    inventoryMock.value = {
      data: {
        ...inventoryMock.baseData,
        groups: [{ id: 'alpha', label: 'Alpha', source: 'runtime', tools: [] }],
      },
      isLoading: false,
      isFetching: false,
    }
    rerender(<ToolInventoryPanel />)

    expect(screen.getByText('No tool groups match the selected filter.')).not.toBeNull()
  })
})
