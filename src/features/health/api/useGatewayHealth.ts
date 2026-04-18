import { useDashboardSnapshot } from '../../../api/dashboard'

export function useGatewayHealth() {
  const query = useDashboardSnapshot()

  return {
    ...query,
    data: query.data?.gatewayHealth,
  }
}
