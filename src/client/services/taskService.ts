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
    console.log('🔄 TaskService: Updating task:', taskId, 'in category:', category)
    console.log('📝 TaskService: Updates:', Object.keys(updates))

    try {
      const response = await apiClient.put('/user/tasks/update', {
        sessionId,
        taskId,
        category,
        updates
      } as UpdateTaskRequest)

      if (response.success) {
        console.log('✅ TaskService: Task updated successfully')
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
    console.log('🗑️ TaskService: Deleting task:', taskId, 'from category:', category)

    try {
      const response = await apiClient.delete('/user/tasks/delete', {
        sessionId,
        taskId,
        category
      } as DeleteTaskRequest)

      if (response.success) {
        console.log('✅ TaskService: Task deleted successfully')
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
    console.log('➕ TaskService: Adding new task:', task.title)
    console.log('📝 TaskService: Category:', task.category, 'XP:', task.xp, 'Shards:', task.shards)

    try {
      const response = await apiClient.post('/user/tasks/add', {
        sessionId,
        ...task
      } as AddTaskRequest)

      if (response.success) {
        console.log('✅ TaskService: Task added successfully')
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
    console.log('📋 TaskService: Fetching tasks for session:', sessionId.substring(0, 8) + '...')

    try {
      const response = await apiClient.get(`/user/tasks/${sessionId}`)

      if (response.success) {
        console.log('✅ TaskService: Tasks fetched successfully')
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
