/**
 * Intake Service
 * Handles the three-step rewards calibration intake flow:
 *   1. generateQuestions — fetch 12 cards tailored to the user's goals
 *   2. submitAnswers     — extract signals, build the personal catalog, persist it
 *   3. confirmIntake     — apply user corrections from the summary review
 */

import { apiClient } from './apiClient'
import type {
  IntakeCard,
  IntakeAnswer,
  IntakeCorrection,
  IntakeSummaryItem,
  CatalogData,
} from '../../shared/types'

interface GenerateQuestionsResponse {
  cards: IntakeCard[]
}

interface SubmitIntakeResponse {
  catalog: CatalogData
  summary: IntakeSummaryItem[]
}

interface ConfirmIntakeResponse {
  catalog: CatalogData
}

class IntakeService {
  async generateQuestions(sessionId: string): Promise<IntakeCard[]> {
    const response = await apiClient.post<GenerateQuestionsResponse>(
      '/ai/intake/generate-questions',
      { sessionId }
    )
    if (!response.success || !response.data) {
      throw new Error(response.message || response.error || 'Failed to generate intake questions')
    }
    return response.data.cards
  }

  async submitAnswers(
    sessionId: string,
    answers: IntakeAnswer[]
  ): Promise<SubmitIntakeResponse> {
    const response = await apiClient.post<SubmitIntakeResponse>(
      '/ai/intake/submit',
      { sessionId, answers }
    )
    if (!response.success || !response.data) {
      throw new Error(response.message || response.error || 'Failed to submit intake')
    }
    return response.data
  }

  async confirmIntake(
    sessionId: string,
    corrections: IntakeCorrection[]
  ): Promise<CatalogData> {
    const response = await apiClient.post<ConfirmIntakeResponse>(
      '/ai/intake/confirm',
      { sessionId, corrections }
    )
    if (!response.success || !response.data) {
      throw new Error(response.message || response.error || 'Failed to confirm intake')
    }
    return response.data.catalog
  }
}

export const intakeService = new IntakeService()
