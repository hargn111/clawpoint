import { useDashboardSnapshot } from '../../../api/dashboard'

export function useReminderQueue() {
  const query = useDashboardSnapshot()

  return {
    ...query,
    data: query.data?.reminderQueue,
  }
}
