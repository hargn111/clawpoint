import {
  useCreateSession,
  useSendSessionMessage,
  useSessionAdminList,
  useSessionModelList,
  useUpdateSession,
} from '../../../api/dashboard'

export function useSessionListAdmin() {
  return useSessionAdminList()
}

export function useSessionModels() {
  return useSessionModelList()
}

export function useSessionCreate() {
  return useCreateSession()
}

export function useSessionUpdate() {
  return useUpdateSession()
}

export function useSessionMessageSend() {
  return useSendSessionMessage()
}
