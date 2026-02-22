import type { Request, Response } from 'express'
import {
  validateRegisterRequest,
  validateLoginRequest,
  validateSendOtpRequest,
  validateVerifyOtpRequest,
  validateForgotPasswordRequest,
  validateResetPasswordRequest
} from '../utils/validation'
import {
  findUserByEmail,
  findUserByUsername,
  createUser,
  updateUser,
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
import { generateOtp, storeOtp, verifyOtp } from '../utils/otpStore'
import { storeResetOtp, verifyResetOtp } from '../utils/resetOtpStore'
import { sendOtpEmail, sendPasswordResetEmail } from '../services/emailService'
import { logger } from '../../utils/logger'

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

    await createUser(newUser)

    res.json(createSuccessResponse(
      SuccessMessages.REGISTRATION_SUCCESS,
      undefined,
      sanitizeUser(newUser)
    ))

  } catch (error) {
    logger.error('Registration error:', error)
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
    await updateUser(user.id, { lastLogin: new Date().toISOString() })

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
    logger.error('Login error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

// Send OTP for email verification during registration
export async function sendOtp(req: Request, res: Response) {
  try {
    if (!validateSendOtpRequest(req.body)) {
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

    // Generate OTP and store with hashed password
    const otp = generateOtp()
    const hashedPassword = hashPassword(password)
    storeOtp(email, otp, username, hashedPassword)

    // Send OTP email
    const emailResult = await sendOtpEmail(email, otp)

    if (!emailResult.success) {
      return res.status(500).json(createErrorResponse(ErrorMessages.OTP_SEND_FAILED))
    }

    res.json(createSuccessResponse(SuccessMessages.OTP_SENT))

  } catch (error) {
    logger.error('Send OTP error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

// Verify OTP and complete registration
export async function verifyOtpAndRegister(req: Request, res: Response) {
  try {
    if (!validateVerifyOtpRequest(req.body)) {
      return res.status(400).json(createErrorResponse(
        'Invalid request. Valid email and 6-digit verification code are required'
      ))
    }

    const { email, otp } = req.body

    // Verify OTP
    const result = verifyOtp(email, otp)

    if (!result.valid) {
      const message = result.reason === 'expired'
        ? ErrorMessages.OTP_EXPIRED
        : ErrorMessages.OTP_INVALID
      return res.status(400).json(createErrorResponse(message))
    }

    // OTP valid — create the user
    const newUser: User = {
      id: generateUserId(),
      username: result.username,
      email: result.email,
      passwordHash: result.passwordHash,
      createdAt: new Date().toISOString(),
      stats: {
        experience: 0,
        shards: 0,
        strength: 0,
        intelligence: 0,
        charisma: 0
      }
    }

    await createUser(newUser)

    // Auto-create session
    const sessionId = generateSessionId()
    await createSession(newUser.id, sessionId)

    res.json(createSuccessResponse(
      SuccessMessages.OTP_VERIFIED,
      undefined,
      sanitizeUser(newUser),
      sessionId
    ))

  } catch (error) {
    logger.error('Verify OTP error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

// Send OTP for password reset
export async function sendPasswordResetOtp(req: Request, res: Response) {
  try {
    if (!validateForgotPasswordRequest(req.body)) {
      return res.status(400).json(createErrorResponse(
        'Invalid request. A valid email address is required'
      ))
    }

    const { email } = req.body

    // Check if user exists
    const user = await findUserByEmail(email)
    if (!user) {
      return res.status(400).json(createErrorResponse(ErrorMessages.PASSWORD_RESET_EMAIL_NOT_FOUND))
    }

    // Generate OTP and store for password reset
    const otp = generateOtp()
    storeResetOtp(email, otp)

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(email, otp)

    if (!emailResult.success) {
      return res.status(500).json(createErrorResponse(ErrorMessages.PASSWORD_RESET_OTP_SEND_FAILED))
    }

    res.json(createSuccessResponse(SuccessMessages.PASSWORD_RESET_OTP_SENT))

  } catch (error) {
    logger.error('Send password reset OTP error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

// Verify password reset OTP (without consuming it)
export async function verifyPasswordResetOtp(req: Request, res: Response) {
  try {
    if (!validateVerifyOtpRequest(req.body)) {
      return res.status(400).json(createErrorResponse(
        'Invalid request. Valid email and 6-digit verification code are required'
      ))
    }

    const { email, otp } = req.body

    // Verify OTP without consuming — keep it for the actual reset call
    const result = verifyResetOtp(email, otp, false)

    if (!result.valid) {
      const message = result.reason === 'expired'
        ? ErrorMessages.OTP_EXPIRED
        : ErrorMessages.OTP_INVALID
      return res.status(400).json(createErrorResponse(message))
    }

    res.json(createSuccessResponse('Verification code is valid'))

  } catch (error) {
    logger.error('Verify password reset OTP error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

// Verify OTP and reset password
export async function resetPassword(req: Request, res: Response) {
  try {
    if (!validateResetPasswordRequest(req.body)) {
      return res.status(400).json(createErrorResponse(
        'Invalid request. Valid email, 6-digit code, and new password (min 6 chars) are required'
      ))
    }

    const { email, otp, newPassword } = req.body

    // Verify OTP
    const result = verifyResetOtp(email, otp)

    if (!result.valid) {
      const message = result.reason === 'expired'
        ? ErrorMessages.OTP_EXPIRED
        : ErrorMessages.OTP_INVALID
      return res.status(400).json(createErrorResponse(message))
    }

    // OTP valid — update the user's password
    const user = await findUserByEmail(email)
    if (!user) {
      return res.status(400).json(createErrorResponse(ErrorMessages.USER_NOT_FOUND))
    }

    await updateUser(user.id, { passwordHash: hashPassword(newPassword) })

    res.json(createSuccessResponse(SuccessMessages.PASSWORD_RESET_SUCCESS))

  } catch (error) {
    logger.error('Reset password error:', error)
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
    logger.error('Logout error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}