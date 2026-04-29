import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/api/dashboard', () => ({
  useDashboardMeta: () => ({ data: { integrations: { taskgarden: { available: true } } } }),
}))

vi.mock('../src/features/advanced/components/AdvancedRoadmapPanel', () => ({ AdvancedRoadmapPanel: () => <div>Roadmap body</div> }))
vi.mock('../src/features/advanced/components/AutomationInspectorPanel', () => ({ AutomationInspectorPanel: () => <div>Automation body</div> }))
vi.mock('../src/features/advanced/components/ChangeAuditLogPanel', () => ({ ChangeAuditLogPanel: () => <div>Audit body</div> }))
vi.mock('../src/features/advanced/components/DangerZonePanel', () => ({ DangerZonePanel: () => <div>Danger body</div> }))
vi.mock('../src/features/advanced/components/EffectiveConfigPanel', () => ({ EffectiveConfigPanel: () => <div>Config body</div> }))
vi.mock('../src/features/advanced/components/ModelProfilesPanel', () => ({ ModelProfilesPanel: () => <div>Profiles body</div> }))
vi.mock('../src/features/advanced/components/SessionHistoryPanel', () => ({ SessionHistoryPanel: () => <div>History body</div> }))
vi.mock('../src/features/advanced/components/SessionPermissionsPanel', () => ({ SessionPermissionsPanel: () => <div>Session permissions body</div> }))
vi.mock('../src/features/advanced/components/ToolInventoryPanel', () => ({ ToolInventoryPanel: () => <div>Tools body</div> }))
vi.mock('../src/features/health/components/GatewayHealthCard', () => ({ GatewayHealthCard: () => <div>Health body</div> }))
vi.mock('../src/features/logs/components/LogsEventsPanel', () => ({ LogsEventsPanel: () => <div>Logs body</div> }))
vi.mock('../src/features/overview/components/AttentionOverviewPanel', () => ({ AttentionOverviewPanel: () => <div>Overview body</div> }))
vi.mock('../src/features/overview/components/PersonalOperationsHomePanel', () => ({ PersonalOperationsHomePanel: () => <div>Personal operations body</div> }))
vi.mock('../src/features/overview/components/UnifiedWorkQueuePanel', () => ({ UnifiedWorkQueuePanel: () => <div>Unified queue body</div> }))
vi.mock('../src/features/permissions/components/PermissionsPanel', () => ({ PermissionsPanel: () => <div>Auth body</div> }))
vi.mock('../src/features/reminders/components/ReminderQueueCard', () => ({ ReminderQueueCard: () => <div>Reminders body</div> }))
vi.mock('../src/features/sessions/components/SessionManagerCard', () => ({ SessionManagerCard: () => <div>Sessions manager body</div> }))
vi.mock('../src/features/sessions/components/SessionOverviewCard', () => ({ SessionOverviewCard: () => <div>Sessions overview body</div> }))
vi.mock('../src/features/taskgarden/components/TaskgardenManagerCard', () => ({ TaskgardenManagerCard: () => <div>Task Garden body</div> }))

import { App } from '../src/app/App'

describe('App navigation organization', () => {
  afterEach(() => {
    cleanup()
    window.location.hash = ''
  })

  it('renders intent-based sidebar groups and the Product Roadmap surface', () => {
    render(<App />)

    for (const group of ['Monitoring', 'Operations', 'Archives', 'Config & Access', 'Automation & Safety', 'Planning']) {
      expect(screen.getByText(group)).not.toBeNull()
    }

    fireEvent.click(screen.getByRole('tab', { name: /Roadmap/ }))

    expect(screen.getByRole('heading', { name: 'Product Roadmap' })).not.toBeNull()
    expect(screen.getByText(/beyond Control UI parity/)).not.toBeNull()
  })
})
