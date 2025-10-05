import type { Request, Response } from 'express'
import { 
  validateRegisterRequest,
  validateLoginRequest
} from '../utils/validation'
import {
  loadUsers,
  saveUsers,
  findUserByEmail,
  findUserByUsername,
  createSession,
  removeSession
} from '../utils/dataOperations'
import {
  hashPassword,
  verifyPassword,
  generateUserId,
  generateSessionId
} from '../utils/authUtils'
import {
  createSuccessResponse,
  createErrorResponse,
  sanitizeUser,
  ErrorMessages,
  SuccessMessages
} from '../utils/responseHelpers'
import type { User, LogoutRequest } from '../../shared/types'

// Register new user
export async function registerUser(req: Request, res: Response) {
  try {
    // Validate request body
    if (!validateRegisterRequest(req.body)) {
      return res.status(400).json(createErrorResponse(
        'Invalid request. Username, valid email, and password (min 6 chars) are required'
      ))
    }

    const { username, email, password } = req.body

    // Check if user already exists
    const existingUserByEmail = await findUserByEmail(email)
    const existingUserByUsername = await findUserByUsername(username)

    if (existingUserByEmail) {
      return res.status(400).json(createErrorResponse(ErrorMessages.USER_EXISTS))
    }

    if (existingUserByUsername) {
      return res.status(400).json(createErrorResponse(ErrorMessages.USERNAME_TAKEN))
    }

    // Create new user
    const newUser: User = {
      id: generateUserId(),
      username,
      email,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      stats: {
        experience: 0,
        shards: 0,
        strength: 0,
        intelligence: 0,
        charisma: 0
      }
    }

    const users = await loadUsers()
    users.push(newUser)
    await saveUsers(users)

    res.json(createSuccessResponse(
      SuccessMessages.REGISTRATION_SUCCESS,
      undefined,
      sanitizeUser(newUser)
    ))

  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

// Login user
export async function loginUser(req: Request, res: Response) {
  try {
    // Validate request body
    if (!validateLoginRequest(req.body)) {
      return res.status(400).json(createErrorResponse(
        'Invalid request. Valid email and password are required'
      ))
    }

    const { email, password } = req.body
    const user = await findUserByEmail(email)

    if (!user) {
      return res.status(400).json(createErrorResponse(ErrorMessages.USER_NOT_FOUND))
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return res.status(400).json(createErrorResponse(ErrorMessages.INVALID_CREDENTIALS))
    }

    // Update last login
    user.lastLogin = new Date().toISOString()
    const users = await loadUsers()
    const userIndex = users.findIndex(u => u.id === user.id)
    if (userIndex !== -1) {
      users[userIndex] = user
      await saveUsers(users)
    }

    // Create session
    const sessionId = generateSessionId()
    await createSession(user.id, sessionId)

    res.json(createSuccessResponse(
      SuccessMessages.LOGIN_SUCCESS,
      undefined,
      sanitizeUser(user),
      sessionId
    ))

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

// Logout user
export async function logoutUser(req: Request, res: Response) {
  try {
    const { sessionId }: LogoutRequest = req.body

    if (sessionId && typeof sessionId === 'string' && sessionId.trim().length > 0) {
      await removeSession(sessionId)
    }

    res.json(createSuccessResponse(SuccessMessages.LOGOUT_SUCCESS))

  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}