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
  // Base shards breakdown by category (before multipliers)
  baseShardsBreakdown?: {
    strength: number
    intelligence: number
    charisma: number
  }
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
   * The experience update will return multiplier information that will be used to calculate final shards
   */
  async claimRewards(data: ClaimRewardsData): Promise<{
    experienceResult: ApiResponse
    shardsResult: ApiResponse
    success: boolean
    appliedMultipliers?: {
      strength: number
      intelligence: number
      charisma: number
    }
    baseShards?: number
    finalShards?: number
  }> {
    

    try {
      // Update experience first to get updated multipliers
      const experienceResult = await this.updateExperience({
        sessionId: data.sessionId,
        strengthDelta: data.strengthXP,
        intelligenceDelta: data.intelligenceXP,
        charismaDelta: data.charismaXP,
        activityDate: data.activityDate
      })

      // Get multipliers from experience result
      const multipliers = experienceResult.metadata?.multipliers

      // Calculate final shards with multipliers
      let finalShards = data.totalShards
      let baseShards = data.totalShards

      if (multipliers && data.baseShardsBreakdown) {
        // Apply multipliers to each category's shards
        const strengthShards = Number((data.baseShardsBreakdown.strength * multipliers.strength).toFixed(2))
        const intelligenceShards = Number((data.baseShardsBreakdown.intelligence * multipliers.intelligence).toFixed(2))
        const charismaShards = Number((data.baseShardsBreakdown.charisma * multipliers.charisma).toFixed(2))
        
        finalShards = Number((strengthShards + intelligenceShards + charismaShards).toFixed(2))
        baseShards = Number((data.baseShardsBreakdown.strength + data.baseShardsBreakdown.intelligence + data.baseShardsBreakdown.charisma).toFixed(2))
        
      }

      // Update shards with the multiplied amount
      const shardsResult = await this.updateShards({
        sessionId: data.sessionId,
        shardsDelta: finalShards,
        reason: 'Daily activity rewards claimed'
      })

      const success = experienceResult.success && shardsResult.success

      if (success) {
      } else {
      }

      return {
        experienceResult,
        shardsResult,
        success,
        appliedMultipliers: multipliers,
        baseShards,
        finalShards
      }
    } catch (error: any) {
      console.error('❌ UserService: Failed to claim rewards:', error)
      throw error
    }
  }
}

// Export singleton instance
export const userService = new UserService()
