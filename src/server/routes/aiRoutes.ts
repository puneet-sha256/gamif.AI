import type { Request, Response } from 'express'
import { azureAIService } from '../services/azureAIService'
import { findSessionById, findUserById, updateSessionLastAccess } from '../utils/dataOperations'
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorMessages
} from '../utils/responseHelpers'
import type { GoalsData, ProfileData } from '../../types'

// Analyze user goals using Azure AI
export async function analyzeGoals(req: Request, res: Response) {
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

    console.log('🤖 Server: Starting Azure AI goals analysis for user:', user.username)

    // Call Azure AI service
    const analysisResult = await azureAIService.analyzeGoals(
      goals as GoalsData,
      userProfile as ProfileData
    )

    if (analysisResult.success) {
      // Update session last access
      await updateSessionLastAccess(sessionId)

      console.log('✅ Server: Azure AI analysis completed successfully')
      res.json(createSuccessResponse(
        'Goals analyzed successfully',
        analysisResult.data,
        undefined,
        undefined,
        {
          processingTime: analysisResult.processingTimeMs,
          agentUsed: 'azure-openai-foundry'
        }
      ))
    } else {
      console.log('❌ Server: Azure AI analysis failed:', analysisResult.error)
      res.status(500).json(createErrorResponse(
        analysisResult.error || 'AI analysis failed'
      ))
    }
  } catch (error) {
    console.error('❌ Server: AI analysis error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

// Get Azure AI health status
export async function getAIHealth(_req: Request, res: Response) {
  try {
    const connectionTest = await azureAIService.testConnection()
    
    res.json(createSuccessResponse(
      'AI health check completed',
      {
        azureAI: connectionTest,
        timestamp: new Date().toISOString()
      }
    ))
  } catch (error) {
    console.error('❌ Server: AI health check error:', error)
    res.status(500).json(createErrorResponse('AI health check failed'))
  }
}