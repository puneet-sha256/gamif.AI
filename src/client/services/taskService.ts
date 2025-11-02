/**
 * Task Service
 * Handles all task-related API calls including CRUD operations
 */

import { apiClient, type ApiResponse } from './apiClient'
import type { 
  UpdateTaskRequest,
  DeleteTaskRequest,
  AddTaskRequest 
} from '../../shared/types/api.types'

export interface TaskUpdateData {
  title?: string
  description?: string
  xp?: number
  shards?: number
}

export interface NewTaskData {
  title: string
  description: string
  category: 'Strength' | 'Intelligence' | 'Charisma'
  xp: number
  shards: number
}

class TaskService {
  /**
   * Update an existing task
   */
  async updateTask(
    sessionId: string,
    taskId: string,
    category: 'Strength' | 'Intelligence' | 'Charisma',
    updates: TaskUpdateData
  ): Promise<ApiResponse> {

    try {
      const response = await apiClient.put('/user/tasks/update', {
        sessionId,
        taskId,
        category,
        updates
      } as UpdateTaskRequest)

      if (response.success) {
      }

      return response
    } catch (error: any) {
      console.error('❌ TaskService: Task update failed:', error)
      throw error
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(
    sessionId: string,
    taskId: string,
    category: 'Strength' | 'Intelligence' | 'Charisma'
  ): Promise<ApiResponse> {

    try {
      const response = await apiClient.delete('/user/tasks/delete', {
        sessionId,
        taskId,
        category
      } as DeleteTaskRequest)

      if (response.success) {
      }

      return response
    } catch (error: any) {
      console.error('❌ TaskService: Task deletion failed:', error)
      throw error
    }
  }

  /**
   * Add a new user-created task
   */
  async addTask(
    sessionId: string,
    task: NewTaskData
  ): Promise<ApiResponse> {

    try {
      const response = await apiClient.post('/user/tasks/add', {
        sessionId,
        ...task
      } as AddTaskRequest)

      if (response.success) {
      }

      return response
    } catch (error: any) {
      console.error('❌ TaskService: Task addition failed:', error)
      throw error
    }
  }

  /**
   * Get all tasks for a user
   */
  async getUserTasks(sessionId: string): Promise<ApiResponse> {

    try {
      const response = await apiClient.get(`/user/tasks/${sessionId}`)

      if (response.success) {
      }

      return response
    } catch (error: any) {
      console.error('❌ TaskService: Task fetch failed:', error)
      throw error
    }
  }
}

// Export singleton instance
export const taskService = new TaskService()
