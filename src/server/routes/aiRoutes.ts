import type { Request, Response } from 'express'
import { azureAIService } from '../services/azureAIService'
import { findSessionById, findUserById, updateSessionLastAccess, updateUserGeneratedTasks } from '../utils/dataOperations'
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorMessages
} from '../utils/responseHelpers'
import type { GoalsData, ProfileData } from '../../types'
import { AIPromptType } from '../config/aiConfigs'

// Generate tasks using Azure AI
export async function generateTasks(req: Request, res: Response) {
  try {
    const { sessionId, goals, userProfile } = req.body

    // Validate required fields
    if (!sessionId || !goals) {
      return res.status(400).json(createErrorResponse(
        'Session ID and goals are required'
      ))
    }

    // Verify session
    const session = await findSessionById(sessionId)
    if (!session) {
      return res.status(401).json(createErrorResponse(ErrorMessages.INVALID_SESSION))
    }

    // Find user
    const user = await findUserById(session.userId)
    if (!user) {
      return res.status(404).json(createErrorResponse(ErrorMessages.USER_NOT_FOUND))
    }

    console.log('🤖 Server: Starting Azure AI task generation for user:', user.username)

    // Call Azure AI service
    const taskGenerationResult = await azureAIService.generateTasks(
      goals as GoalsData,
      userProfile as ProfileData
    )

    if (taskGenerationResult.success) {
      // Update session last access
      await updateSessionLastAccess(sessionId)

      // Store generated tasks in user profile if successfully parsed
      if (taskGenerationResult.data?.generatedTasks) {
        await updateUserGeneratedTasks(user.id, taskGenerationResult.data.generatedTasks)
        console.log('✅ Server: Generated tasks stored in user profile')
      }

      console.log('✅ Server: Azure AI task generation completed successfully')
      console.log('🎯 Generated Tasks:', taskGenerationResult.data)
      
      res.json(createSuccessResponse(
        'Tasks generated successfully',
        taskGenerationResult.data,
        undefined,
        undefined,
        {
          processingTime: taskGenerationResult.processingTimeMs,
          agentUsed: 'azure-openai-foundry'
        }
      ))
    } else {
      console.log('❌ Server: Azure AI task generation failed:', taskGenerationResult.error)
      res.status(500).json(createErrorResponse(
        taskGenerationResult.error || 'Task generation failed'
      ))
    }
  } catch (error) {
    console.error('❌ Server: Task generation error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

// Analyze daily activity using Azure AI
export async function analyzeDailyActivity(req: Request, res: Response) {
  try {
    const { sessionId, dailyActivity, currentTasks } = req.body

    // Validate required fields
    if (!sessionId || !dailyActivity) {
      return res.status(400).json(createErrorResponse(
        'Session ID and daily activity description are required'
      ))
    }

    // Verify session
    const session = await findSessionById(sessionId)
    if (!session) {
      return res.status(401).json(createErrorResponse(ErrorMessages.INVALID_SESSION))
    }

    // Find user
    const user = await findUserById(session.userId)
    if (!user) {
      return res.status(404).json(createErrorResponse(ErrorMessages.USER_NOT_FOUND))
    }

    console.log('🤖 Server: Starting Azure AI daily activity analysis for user:', user.username)
    console.log('📝 User Activity:', dailyActivity)

    // Build the user message with activity and tasks
    let userMessage = `**User's Daily Activity:**\n${dailyActivity}\n\n`
    
    if (currentTasks) {
      userMessage += `**Current Tasks:**\n`
      
      if (currentTasks.Strength && currentTasks.Strength.length > 0) {
        userMessage += `- Strength:\n`
        currentTasks.Strength.forEach((task: { description: string; xp: number; shards: number }) => {
          userMessage += `  * "${task.description}" (${task.xp} XP, ${task.shards} shards)\n`
        })
      }
      
      if (currentTasks.Intelligence && currentTasks.Intelligence.length > 0) {
        userMessage += `- Intelligence:\n`
        currentTasks.Intelligence.forEach((task: { description: string; xp: number; shards: number }) => {
          userMessage += `  * "${task.description}" (${task.xp} XP, ${task.shards} shards)\n`
        })
      }
      
      if (currentTasks.Charisma && currentTasks.Charisma.length > 0) {
        userMessage += `- Charisma:\n`
        currentTasks.Charisma.forEach((task: { description: string; xp: number; shards: number }) => {
          userMessage += `  * "${task.description}" (${task.xp} XP, ${task.shards} shards)\n`
        })
      }
    } else {
      userMessage += `**Current Tasks:** None provided\n`
    }

    console.log('📋 Formatted message for AI:', userMessage)

    // Call Azure AI service
    const analysisResult = await azureAIService.generateCompletion(
      AIPromptType.ACTIVITY_ANALYSIS,
      userMessage
    )

    if (analysisResult.success && analysisResult.data) {
      // Update session last access
      await updateSessionLastAccess(sessionId)

      console.log('✅ Server: Azure AI activity analysis completed successfully')
      console.log('🎯 AI Response:')
      console.log('='.repeat(80))
      console.log(analysisResult.data.content)
      console.log('='.repeat(80))
      
      res.json(createSuccessResponse(
        'Daily activity analyzed successfully',
        {
          aiResponse: analysisResult.data.content,
          processingTime: analysisResult.processingTimeMs
        },
        undefined,
        undefined,
        {
          processingTime: analysisResult.processingTimeMs,
          agentUsed: 'azure-openai-foundry'
        }
      ))
    } else {
      console.log('❌ Server: Azure AI activity analysis failed:', analysisResult.error)
      res.status(500).json(createErrorResponse(
        analysisResult.error || 'Activity analysis failed'
      ))
    }
  } catch (error) {
    console.error('❌ Server: Activity analysis error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}