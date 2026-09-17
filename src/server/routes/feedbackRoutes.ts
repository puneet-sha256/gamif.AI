import type { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import type { BugSeverity, FeedbackSubmission } from '../../shared/types'
import {
  findSessionById,
  findUserById,
  updateSessionLastAccess,
  updateUser,
} from '../utils/dataOperations'
import { createErrorResponse, createSuccessResponse, ErrorMessages } from '../utils/responseHelpers'
import { sendFeedbackEmail } from '../services/emailService'
import { logger } from '../../utils/logger'

const FEEDBACK_WINDOW_MS = 60 * 60 * 1000
const FEEDBACK_LIMIT = 5
const severities = new Set<BugSeverity>(['low', 'medium', 'high', 'critical'])

function validText(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max
}

function validOptionalText(value: unknown, max: number): value is string | undefined {
  return value === undefined || (typeof value === 'string' && value.trim().length <= max)
}

function validateFeedback(body: unknown): body is FeedbackSubmission {
  if (!body || typeof body !== 'object') return false
  const value = body as Partial<FeedbackSubmission>
  const diagnostics = value.diagnostics
  if (
    !validText(value.sessionId, 1, 128)
    || (value.type !== 'bug' && value.type !== 'feature')
    || !validText(value.title, 5, 120)
    || !validText(value.description, 20, 5000)
    || !validText(value.category, 2, 80)
    || typeof value.contactAllowed !== 'boolean'
    || !validOptionalText(value.stepsToReproduce, 5000)
    || !validOptionalText(value.expectedBehavior, 3000)
    || !validOptionalText(value.actualBehavior, 3000)
    || !validOptionalText(value.proposedSolution, 5000)
    || !validOptionalText(value.userBenefit, 3000)
    || !diagnostics
    || !validText(diagnostics.pageUrl, 1, 1000)
    || !validText(diagnostics.userAgent, 1, 1000)
    || !validText(diagnostics.viewport, 1, 40)
    || !validText(diagnostics.language, 1, 40)
    || !validText(diagnostics.platform, 1, 100)
    || !validText(diagnostics.timezone, 1, 100)
  ) {
    return false
  }

  if (value.type === 'bug') {
    return !!value.severity
      && severities.has(value.severity)
      && validText(value.stepsToReproduce, 10, 5000)
      && validText(value.expectedBehavior, 10, 3000)
      && validText(value.actualBehavior, 10, 3000)
  }

  return validText(value.userBenefit, 10, 3000)
}

function recentSubmissionTimestamps(timestamps: string[] | undefined): string[] {
  const cutoff = Date.now() - FEEDBACK_WINDOW_MS
  return (timestamps || []).filter(timestamp => {
    const parsed = Date.parse(timestamp)
    return Number.isFinite(parsed) && parsed >= cutoff
  })
}

export async function submitFeedback(req: Request, res: Response) {
  try {
    if (!validateFeedback(req.body)) {
      return res.status(400).json(createErrorResponse(
        'Invalid feedback. Complete all required fields and stay within the allowed lengths.'
      ))
    }

    const session = await findSessionById(req.body.sessionId)
    if (!session) {
      return res.status(401).json(createErrorResponse(ErrorMessages.INVALID_SESSION))
    }
    const user = await findUserById(session.userId)
    if (!user) {
      return res.status(404).json(createErrorResponse(ErrorMessages.USER_NOT_FOUND))
    }
    const recentSubmissions = recentSubmissionTimestamps(user.feedbackSubmissionTimestamps)
    if (recentSubmissions.length >= FEEDBACK_LIMIT) {
      return res.status(429).json(createErrorResponse(
        'Feedback limit reached. Please try again in an hour.'
      ))
    }

    const submittedAt = new Date().toISOString()
    const reportId = `GAM-${submittedAt.slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`
    const reservedTimestamps = [...recentSubmissions, submittedAt]
    const reservedUser = await updateUser(user.id, {
      feedbackSubmissionTimestamps: reservedTimestamps,
    })
    if (!reservedUser) {
      return res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
    }

    const delivery = await sendFeedbackEmail(reportId, submittedAt, user, req.body)
    if (!delivery.success) {
      await updateUser(user.id, {
        feedbackSubmissionTimestamps: recentSubmissions,
      })
      return res.status(502).json(createErrorResponse(
        'Your report could not be delivered. Please try again later.'
      ))
    }

    await updateSessionLastAccess(req.body.sessionId)
    return res.status(201).json(createSuccessResponse(
      'Thank you. Your feedback was sent successfully.',
      { reportId, submittedAt }
    ))
  } catch (error) {
    logger.error('Submit feedback error:', error)
    return res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}
