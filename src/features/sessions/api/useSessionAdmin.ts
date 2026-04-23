import { useCreateSession, useSendSessionMessage, useSessionAdminList } from '../../../api/dashboard'

export function useSessionListAdmin() {
  return useSessionAdminList()
}

export function useSessionCreate() {
  return useCreateSession()
}

export function useSessionMessageSend() {
  return useSendSessionMessage()
}
