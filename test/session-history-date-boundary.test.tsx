import { describe, expect, it } from 'vitest'

import { localDateBoundaryIso } from '../src/api/dashboard'

describe('localDateBoundaryIso', () => {
  it('converts selected dates to local-day boundaries before API requests', () => {
    const start = localDateBoundaryIso('2026-04-28', 'start')
    const end = localDateBoundaryIso('2026-04-28', 'end')

    expect(start).toBe(new Date(2026, 3, 28, 0, 0, 0, 0).toISOString())
    expect(end).toBe(new Date(2026, 3, 28, 23, 59, 59, 999).toISOString())
    expect(localDateBoundaryIso('2026-04-28T04:00:00.000Z', 'start')).toBe('2026-04-28T04:00:00.000Z')
  })
})
