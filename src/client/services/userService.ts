/**
 * User Service
 * Handles user stats-related API calls (experience, shards, etc.)
 */

import { apiClient, type ApiResponse } from './apiClient'

export interface UpdateExperienceData {
  sessionId: string
  strengthDelta?: number
  intelligenceDelta?: number
  charismaDelta?: number
  activityDate?: string // Optional activity date (YYYY-MM-DD)
}

export interface UpdateShardsData {
  sessionId: string
  shardsDelta: number
  reason?: string
}

export interface ClaimRewardsData {
  sessionId: string
  totalXP: number
  totalShards: number
  strengthXP: number
  intelligenceXP: number
  charismaXP: number
  activityDate?: string // Optional activity date (YYYY-MM-DD)
}

class UserService {
  /**
   * Update user experience points across attributes
   */
  async updateExperience(data: UpdateExperienceData): Promise<ApiResponse> {
    

    try {
      const response = await apiClient.patch('/user/experience', data)

      if (response.success) {
      }

      return response
    } catch (error: any) {
      console.error('❌ UserService: Failed to update experience:', error)
      throw error
    }
  }

  /**
   * Update user shards (currency)
   */
  async updateShards(data: UpdateShardsData): Promise<ApiResponse> {

    try {
      const response = await apiClient.patch('/user/shards', data)

      if (response.success) {
      }

      return response
    } catch (error: any) {
      console.error('❌ UserService: Failed to update shards:', error)
      throw error
    }
  }

  /**
   * Claim all pending rewards (XP and shards)
   * This is a convenience method that calls both updateExperience and updateShards
   */
  async claimRewards(data: ClaimRewardsData): Promise<{
    experienceResult: ApiResponse
    shardsResult: ApiResponse
    success: boolean
  }> {
    

    try {
      // Update experience first
      const experienceResult = await this.updateExperience({
        sessionId: data.sessionId,
        strengthDelta: data.strengthXP,
        intelligenceDelta: data.intelligenceXP,
        charismaDelta: data.charismaXP,
        activityDate: data.activityDate
      })

      // Update shards
      const shardsResult = await this.updateShards({
        sessionId: data.sessionId,
        shardsDelta: data.totalShards,
        reason: 'Daily activity rewards claimed'
      })

      const success = experienceResult.success && shardsResult.success

      if (success) {
      } else {
      }

      return {
        experienceResult,
        shardsResult,
        success
      }
    } catch (error: any) {
      console.error('❌ UserService: Failed to claim rewards:', error)
      throw error
    }
  }
}

// Export singleton instance
export const userService = new UserService()
