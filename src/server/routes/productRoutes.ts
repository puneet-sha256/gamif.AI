import type { Request, Response } from 'express'
import { fetchProductMetadata } from '../services/productMetadataService'
import { findSessionById, updateSessionLastAccess } from '../utils/dataOperations'
import { createErrorResponse, createSuccessResponse, ErrorMessages } from '../utils/responseHelpers'
import { logger } from '../../utils/logger'

export async function previewProduct(req: Request, res: Response) {
  try {
    const { sessionId, url } = req.body || {}
    if (typeof sessionId !== 'string' || typeof url !== 'string' || url.length > 2000) {
      return res.status(400).json(createErrorResponse('A valid sessionId and product URL are required'))
    }
    const session = await findSessionById(sessionId)
    if (!session) return res.status(401).json(createErrorResponse(ErrorMessages.INVALID_SESSION))

    const metadata = await fetchProductMetadata(url)
    await updateSessionLastAccess(sessionId)
    return res.json(createSuccessResponse('Product details retrieved successfully', metadata))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Product details could not be retrieved'
    logger.warn('Product preview failed:', message)
    return res.status(422).json(createErrorResponse(message))
  }
}
