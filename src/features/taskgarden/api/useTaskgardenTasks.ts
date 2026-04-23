import {
  useCreateTaskgardenTask,
  useTaskgardenTasks,
  useUpdateTaskgardenTask,
} from '../../../api/dashboard'

export function useTaskgardenTaskList() {
  return useTaskgardenTasks()
}

export function useTaskgardenTaskCreate() {
  return useCreateTaskgardenTask()
}

export function useTaskgardenTaskUpdate() {
  return useUpdateTaskgardenTask()
}
