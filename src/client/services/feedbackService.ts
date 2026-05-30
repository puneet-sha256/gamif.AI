/**
 * Feedback Service (Milestone 1D)
 * Submits per-activity feedback on claimed rewards. Backend nudges the catalog row's
 * rate and updates stability_score so future rewards converge to the user's truth.
 */

import { apiClient } from './apiClient'
import type { CatalogVote, CatalogRow } from '../../shared/types'

interface FeedbackResponse {
  row: CatalogRow
}

class FeedbackService {
  async submitFeedback(
    sessionId: string,
    signature: string,
    vote: CatalogVote
  ): Promise<CatalogRow> {
    const response = await apiClient.post<FeedbackResponse>(
      '/user/catalog/feedback',
      { sessionId, signature, vote }
    )
    if (!response.success || !response.data) {
      throw new Error(response.message || response.error || 'Feedback submit failed')
    }
    return response.data.row
  }
}

export const feedbackService = new FeedbackService()
