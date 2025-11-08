import type { Request, Response } from 'express'
import { 
  validateRegisterRequest,
  validateLoginRequest,
  validateVerifyOTPRequest,
  validateResendOTPRequest
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
import { logger } from '../../utils/logger'
import { generateOTP, sendOTPEmail } from '../services/emailService'

// Register new user (step 1: create account and send OTP)
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

    // Generate OTP
    const otp = generateOTP()
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

    // Create new user with unverified email
    const newUser: User = {
      id: generateUserId(),
      username,
      email,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      emailVerified: false,
      otp,
      otpExpiry,
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

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, username)
    
    if (!emailSent) {
      logger.warn(`Failed to send OTP email to ${email}, but user created`)
      return res.json(createSuccessResponse(
        'Registration successful, but email could not be sent. Please contact support.',
        undefined,
        sanitizeUser(newUser)
      ))
    }

    res.json(createSuccessResponse(
      'Registration successful! Please check your email for the verification code.',
      undefined,
      sanitizeUser(newUser)
    ))

  } catch (error) {
    logger.error('Registration error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

// Verify OTP (step 2: verify email with OTP)
export async function verifyOTP(req: Request, res: Response) {
  try {
    if (!validateVerifyOTPRequest(req.body)) {
      return res.status(400).json(createErrorResponse(
        'Invalid request. Email and 6-digit OTP code are required'
      ))
    }

    const { email, otp } = req.body

    const users = await loadUsers()
    const userIndex = users.findIndex(u => u.email === email)

    if (userIndex === -1) {
      return res.status(404).json(createErrorResponse('User not found'))
    }

    const user = users[userIndex]

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json(createErrorResponse('Email already verified'))
    }

    // Check if OTP exists
    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json(createErrorResponse('No OTP found. Please request a new one'))
    }

    // Check if OTP expired
    if (new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json(createErrorResponse('OTP has expired. Please request a new one'))
    }

    // Verify OTP
    if (user.otp !== otp) {
      return res.status(400).json(createErrorResponse('Invalid OTP code'))
    }

    // Mark email as verified and clear OTP
    user.emailVerified = true
    user.otp = undefined
    user.otpExpiry = undefined
    users[userIndex] = user
    await saveUsers(users)

    // Create session for the verified user
    const sessionId = generateSessionId()
    await createSession(user.id, sessionId)

    res.json(createSuccessResponse(
      'Email verified successfully! Welcome to Gamif.AI',
      undefined,
      sanitizeUser(user),
      sessionId
    ))

  } catch (error) {
    logger.error('OTP verification error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

// Resend OTP
export async function resendOTP(req: Request, res: Response) {
  try {
    if (!validateResendOTPRequest(req.body)) {
      return res.status(400).json(createErrorResponse(
        'Invalid request. Email is required'
      ))
    }

    const { email } = req.body

    const users = await loadUsers()
    const userIndex = users.findIndex(u => u.email === email)

    if (userIndex === -1) {
      return res.status(404).json(createErrorResponse('User not found'))
    }

    const user = users[userIndex]

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json(createErrorResponse('Email already verified'))
    }

    // Generate new OTP
    const otp = generateOTP()
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    user.otp = otp
    user.otpExpiry = otpExpiry
    users[userIndex] = user
    await saveUsers(users)

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, user.username)
    
    if (!emailSent) {
      return res.status(500).json(createErrorResponse(
        'Failed to send OTP email. Please try again later'
      ))
    }

    res.json(createSuccessResponse(
      'OTP resent successfully! Please check your email'
    ))

  } catch (error) {
    logger.error('Resend OTP error:', error)
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

    // Check if email is verified
    if (user.emailVerified === false) {
      return res.status(403).json(createErrorResponse(
        'Email not verified. Please verify your email before logging in'
      ))
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
    logger.error('Login error:', error)
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