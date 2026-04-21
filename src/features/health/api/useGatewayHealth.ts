import { useGatewayHealthQuery } from '../../../api/dashboard'

export function useGatewayHealth() {
  return useGatewayHealthQuery()
}
