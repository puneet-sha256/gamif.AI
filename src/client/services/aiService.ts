/**
 * AI Service
 * Handles all AI-related API calls including task generation and activity analysis
 */

import { apiClient, type ApiResponse } from './apiClient'
import type { 
  AnalyzeDailyActivityRequest,
  AnalyzeDailyActivityResponse 
} from '../../shared/types/api.types'
import type { GoalsData, ProfileData, GeneratedTasks } from '../../shared/types'

export interface GenerateTasksRequest {
  sessionId: string
  goals: GoalsData
  userProfile?: ProfileData
}

export interface GenerateTasksResponse {
  success: boolean
  message?: string
  data?: {
    generatedTasks: GeneratedTasks
    rawResponse?: string
  }
  metadata?: {
    processingTime: number
  }
}

class AIService {
  /**
   * Generate AI tasks based on user goals and profile
   */
  async generateTasks(
    sessionId: string,
    goals: GoalsData,
    userProfile?: ProfileData
  ): Promise<GenerateTasksResponse> {
    try {
      const response = await apiClient.post<GenerateTasksResponse['data']>('/ai/generate-tasks', {
        sessionId,
        goals,
        userProfile
      })

      return {
        success: response.success,
        message: response.message,
        data: response.data
      }
    } catch (error: any) {
      console.error('❌ AIService: Task generation failed:', error)
      return {
        success: false,
        message: error.message || 'Failed to generate tasks'
      }
    }
  }

  /**
   * Analyze daily activity and match with tasks
   */
  async analyzeDailyActivity(
    request: AnalyzeDailyActivityRequest
  ): Promise<ApiResponse<AnalyzeDailyActivityResponse['data']>> {
    try {
      const response = await apiClient.post<AnalyzeDailyActivityResponse['data']>(
        '/ai/analyze-activity',
        request
      )

      return response
    } catch (error: any) {
      console.error('❌ AIService: Activity analysis failed:', error)
      throw error
    }
  }

  /**
   * Health check for AI service
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await apiClient.get('/ai/health')
      return response.success
    } catch (error) {
      console.error('❌ AIService: Health check failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const aiService = new AIService()
