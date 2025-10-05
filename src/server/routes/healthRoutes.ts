import type { Request, Response } from 'express'
import { createSuccessResponse } from '../utils/responseHelpers'

// Health check
export function healthCheck(_req: Request, res: Response) {
  const response = createSuccessResponse(
    'Server is running',
    { timestamp: new Date().toISOString() }
  )
  res.json(response)
}