import { useDashboardSnapshot } from '../../../api/dashboard'

export function useSessionsOverview() {
  const query = useDashboardSnapshot()

  return {
    ...query,
    data: query.data?.sessionsOverview,
  }
}
