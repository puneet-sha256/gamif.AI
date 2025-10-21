import type { Request, Response } from 'express'
import {
  validateExperienceUpdateRequest,
  validateShardsUpdateRequest
} from '../utils/validation'
import {
  findSessionById,
  findUserById,
  updateUser,
  updateSessionLastAccess,
  getUserGeneratedTasks,
  updateTaskInGeneratedTasks,
  deleteTaskFromGeneratedTasks
} from '../utils/dataOperations'
import {
  createSuccessResponse,
  createErrorResponse,
  sanitizeUser,
  ErrorMessages,
  SuccessMessages
} from '../utils/responseHelpers'
import type { UserStats } from '../../shared/types'

// Get current user by session
export async function getCurrentUser(req: Request, res: Response) {
  try {
    const { sessionId } = req.params

    const session = await findSessionById(sessionId)
    if (!session) {
      return res.status(401).json(createErrorResponse(ErrorMessages.INVALID_SESSION))
    }

    const user = await findUserById(session.userId)
    if (!user) {
      return res.status(404).json(createErrorResponse(ErrorMessages.USER_NOT_FOUND))
    }

    // Update session last access
    await updateSessionLastAccess(sessionId)

    res.json(createSuccessResponse(
      'User data retrieved successfully',
      undefined,
      sanitizeUser(user)
    ))

  } catch (error) {
    console.error('Get user by session error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

// Update user
export async function updateUserData(req: Request, res: Response) {
  try {
    const { userId } = req.params
    const updates = req.body

    const updatedUser = await updateUser(userId, updates)
    if (!updatedUser) {
      return res.status(404).json(createErrorResponse(ErrorMessages.USER_NOT_FOUND))
    }

    res.json(createSuccessResponse(
      SuccessMessages.UPDATE_SUCCESS,
      undefined,
      sanitizeUser(updatedUser)
    ))

  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

// Update experience points for attributes
export async function updateExperience(req: Request, res: Response) {
  try {
    // Validate request body
    if (!validateExperienceUpdateRequest(req.body)) {
      return res.status(400).json(createErrorResponse(
        'Invalid request. Session ID is required and deltas must be valid numbers'
      ))
    }

    const { sessionId, strengthDelta, intelligenceDelta, charismaDelta } = req.body

    const strengthChange = strengthDelta || 0
    const intelligenceChange = intelligenceDelta || 0
    const charismaChange = charismaDelta || 0

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

    // Ensure user has stats with proper typing
    if (!user.stats) {
      user.stats = {
        experience: 0,
        shards: 0,
        strength: 0,
        intelligence: 0,
        charisma: 0
      } as UserStats
    }

    // Calculate new attribute values (prevent negative values)
    const newStrength = Math.max(0, (user.stats.strength || 0) + strengthChange)
    const newIntelligence = Math.max(0, (user.stats.intelligence || 0) + intelligenceChange)
    const newCharisma = Math.max(0, (user.stats.charisma || 0) + charismaChange)

    // Update stats
    user.stats.strength = newStrength
    user.stats.intelligence = newIntelligence
    user.stats.charisma = newCharisma
    
    // Total experience is sum of all attributes
    user.stats.experience = newStrength + newIntelligence + newCharisma

    // Update session last access and save user
    await updateSessionLastAccess(sessionId)
    const updatedUser = await updateUser(user.id, user)

    if (!updatedUser) {
      return res.status(500).json(createErrorResponse('Failed to update user'))
    }

    // Return updated stats
    res.json(createSuccessResponse(
      SuccessMessages.EXPERIENCE_UPDATED,
      undefined,
      sanitizeUser(updatedUser),
      undefined,
      {
        strengthChange,
        intelligenceChange,
        charismaChange,
        totalExperienceChange: strengthChange + intelligenceChange + charismaChange
      }
    ))

  } catch (error) {
    console.error('Update experience error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

// Update shards (in-game currency)
export async function updateShards(req: Request, res: Response) {
  try {
    // Validate request body
    if (!validateShardsUpdateRequest(req.body)) {
      return res.status(400).json(createErrorResponse(
        'Invalid request. Session ID and shards delta (number) are required'
      ))
    }

    const { sessionId, shardsDelta, reason } = req.body

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

    // Ensure user has stats
    if (!user.stats) {
      user.stats = {
        experience: 0,
        shards: 0,
        strength: 0,
        intelligence: 0,
        charisma: 0
      } as UserStats
    }

    // Calculate new shards value (prevent negative shards)
    const currentShards = user.stats.shards || 0
    const newShards = Math.max(0, currentShards + shardsDelta)
    
    // Check if user has enough shards for subtraction
    if (shardsDelta < 0 && currentShards + shardsDelta < 0) {
      return res.status(400).json(createErrorResponse(
        `Insufficient shards. Current balance: ${currentShards}, attempted to subtract: ${Math.abs(shardsDelta)}`
      ))
    }

    // Update shards
    user.stats.shards = newShards

    // Update session last access and save user
    await updateSessionLastAccess(sessionId)
    const updatedUser = await updateUser(user.id, user)

    if (!updatedUser) {
      return res.status(500).json(createErrorResponse('Failed to update user'))
    }

    // Return updated stats
    res.json(createSuccessResponse(
      reason 
        ? `Shards updated successfully: ${reason}` 
        : `Shards ${shardsDelta >= 0 ? 'added' : 'subtracted'} successfully`,
      undefined,
      sanitizeUser(updatedUser),
      undefined,
      {
        shardsChange: shardsDelta,
        newShardsBalance: newShards,
        reason
      }
    ))

  } catch (error) {
    console.error('Update shards error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

// Get user's generated tasks
export async function getUserTasks(req: Request, res: Response) {
  try {
    const { sessionId } = req.params

    const session = await findSessionById(sessionId)
    if (!session) {
      return res.status(401).json(createErrorResponse(ErrorMessages.INVALID_SESSION))
    }

    const user = await findUserById(session.userId)
    if (!user) {
      return res.status(404).json(createErrorResponse(ErrorMessages.USER_NOT_FOUND))
    }

    // Update session last access
    await updateSessionLastAccess(sessionId)

    // Get generated tasks
    const generatedTasks = await getUserGeneratedTasks(user.id)

    res.json(createSuccessResponse(
      'Generated tasks retrieved successfully',
      { generatedTasks },
      undefined,
      undefined,
      {
        hasGeneratedTasks: !!generatedTasks,
        tasksLastUpdated: generatedTasks?.lastUpdated
      }
    ))

  } catch (error) {
    console.error('Get user tasks error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

// Update a specific generated task
export async function updateGeneratedTask(req: Request, res: Response) {
  try {
    const { sessionId, taskId, category, updates } = req.body

    // Validate required fields
    if (!sessionId || !taskId || !category || !updates) {
      return res.status(400).json(createErrorResponse(
        'Session ID, task ID, category, and updates are required'
      ))
    }

    // Validate category
    if (!['Strength', 'Intelligence', 'Charisma'].includes(category)) {
      return res.status(400).json(createErrorResponse(
        'Invalid category. Must be Strength, Intelligence, or Charisma'
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

    // Update the task
    const success = await updateTaskInGeneratedTasks(user.id, taskId, category, updates)

    if (!success) {
      return res.status(404).json(createErrorResponse(
        'Task not found or could not be updated'
      ))
    }

    // Update session last access
    await updateSessionLastAccess(sessionId)

    // Get updated tasks
    const updatedTasks = await getUserGeneratedTasks(user.id)

    res.json(createSuccessResponse(
      'Task updated successfully',
      { generatedTasks: updatedTasks }
    ))

  } catch (error) {
    console.error('Update generated task error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

// Delete a specific generated task
export async function deleteGeneratedTask(req: Request, res: Response) {
  try {
    const { sessionId, taskId, category } = req.body

    // Validate required fields
    if (!sessionId || !taskId || !category) {
      return res.status(400).json(createErrorResponse(
        'Session ID, task ID, and category are required'
      ))
    }

    // Validate category
    if (!['Strength', 'Intelligence', 'Charisma'].includes(category)) {
      return res.status(400).json(createErrorResponse(
        'Invalid category. Must be Strength, Intelligence, or Charisma'
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

    // Delete the task
    const success = await deleteTaskFromGeneratedTasks(user.id, taskId, category)

    if (!success) {
      return res.status(404).json(createErrorResponse(
        'Task not found or could not be deleted'
      ))
    }

    // Update session last access
    await updateSessionLastAccess(sessionId)

    // Get updated tasks
    const updatedTasks = await getUserGeneratedTasks(user.id)

    res.json(createSuccessResponse(
      'Task deleted successfully',
      { generatedTasks: updatedTasks }
    ))

  } catch (error) {
    console.error('Delete generated task error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}