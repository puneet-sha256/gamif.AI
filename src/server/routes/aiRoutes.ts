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
import { calculateRewardsFromAnalysis } from '../utils/rewardCalculation'
import { logger } from '../../utils/logger'

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

    logger.custom('🤖', `Starting Azure AI task generation for user: ${user.username}`)

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
        logger.success('Generated tasks stored in user profile')
      }

      logger.success('Azure AI task generation completed successfully')
      logger.custom('🎯', 'Generated Tasks:', taskGenerationResult.data)
      
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
      logger.error('Azure AI task generation failed:', taskGenerationResult.error)
      res.status(500).json(createErrorResponse(
        taskGenerationResult.error || 'Task generation failed'
      ))
    }
  } catch (error) {
    logger.error('Task generation error:', error)
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

    logger.custom('🤖', `Starting Azure AI daily activity analysis for user: ${user.username}`)
    logger.custom('📝', 'User Activity:', dailyActivity)

    // Format daily planned tasks as a JSON array
    const plannedTasks: Array<{ 
      title: string; 
      description: string; 
      category: string;
      xp: number; 
      shards: number 
    }> = []
    
    if (currentTasks) {
      if (currentTasks.Strength && currentTasks.Strength.length > 0) {
        currentTasks.Strength.forEach((task: { 
          id: string; 
          title?: string;
          description: string; 
          category: string;
          xp: number; 
          shards: number 
        }) => {
          plannedTasks.push({
            title: task.title || task.description,
            description: task.description,
            category: task.category || 'Strength',
            xp: task.xp,
            shards: task.shards
          })
        })
      }
      
      if (currentTasks.Intelligence && currentTasks.Intelligence.length > 0) {
        currentTasks.Intelligence.forEach((task: { 
          id: string; 
          title?: string;
          description: string; 
          category: string;
          xp: number; 
          shards: number 
        }) => {
          plannedTasks.push({
            title: task.title || task.description,
            description: task.description,
            category: task.category || 'Intelligence',
            xp: task.xp,
            shards: task.shards
          })
        })
      }
      
      if (currentTasks.Charisma && currentTasks.Charisma.length > 0) {
        currentTasks.Charisma.forEach((task: { 
          id: string; 
          title?: string;
          description: string; 
          category: string;
          xp: number; 
          shards: number 
        }) => {
          plannedTasks.push({
            title: task.title || task.description,
            description: task.description,
            category: task.category || 'Charisma',
            xp: task.xp,
            shards: task.shards
          })
        })
      }
    }

    // Get user's long-term goals
    const longTermGoals = user.goalsData?.longTermGoals || 'No specific goals set'

    // Build the formatted message for the AI as a JSON object
    const inputData = {
      daily_planned_tasks: plannedTasks,
      long_term_goals: longTermGoals,
      user_daily_update: dailyActivity
    }

    const userMessage = JSON.stringify(inputData, null, 2)

    logger.custom('📋', 'Formatted JSON input for AI:')
    logger.debug(userMessage)

    // Call Azure AI service
    const analysisResult = await azureAIService.generateCompletion(
      AIPromptType.ACTIVITY_ANALYSIS,
      userMessage
    )

    if (analysisResult.success && analysisResult.data) {
      // Update session last access
      await updateSessionLastAccess(sessionId)

      logger.success('Azure AI activity analysis completed successfully')
      logger.custom('🎯', 'Raw AI Response:')
      logger.debug('='.repeat(80))
      logger.debug(analysisResult.data.content)
      logger.debug('='.repeat(80))

      // Parse the JSON response (should be clean JSON with json_object mode)
      let parsedMatches = null
      try {
        parsedMatches = JSON.parse(analysisResult.data.content)
        logger.success('Successfully parsed activity matches as object')
        logger.custom('📊', `Total matches found: ${parsedMatches.matches?.length || 0}`)
        
        // Log the parsed object structure
        logger.custom('📦', 'Parsed Activity Analysis Object:')
        logger.debug('='.repeat(80))
        logger.debug(JSON.stringify(parsedMatches, null, 2))
        logger.debug('='.repeat(80))
        
      } catch (parseError) {
        logger.error('Failed to parse AI response as JSON:', parseError)
        logger.debug('Raw response:', analysisResult.data.content)
        
        // Fallback: try to extract JSON if wrapped in markdown
        try {
          const jsonMatch = analysisResult.data.content.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            parsedMatches = JSON.parse(jsonMatch[0])
            logger.success('Extracted and parsed JSON from markdown')
          }
        } catch (fallbackError) {
          logger.error('Fallback parsing also failed:', fallbackError)
        }
      }

      // Calculate rewards from the parsed matches
      let rewardCalculation = null
      if (parsedMatches?.matches) {
        logger.custom('💰', 'Calculating rewards from activity matches...')
        rewardCalculation = calculateRewardsFromAnalysis(
          parsedMatches.matches,
          currentTasks
        )
      }
      
      res.json(createSuccessResponse(
        'Daily activity analyzed successfully',
        {
          matches: parsedMatches?.matches || [],
          rewards: rewardCalculation,
          rawResponse: analysisResult.data.content,
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
      logger.error('Azure AI activity analysis failed:', analysisResult.error)
      res.status(500).json(createErrorResponse(
        analysisResult.error || 'Activity analysis failed'
      ))
    }
  } catch (error) {
    logger.error('Activity analysis error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}