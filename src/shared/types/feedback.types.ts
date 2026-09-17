export type FeedbackType = 'bug' | 'feature'
export type BugSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface FeedbackDiagnostics {
  pageUrl: string
  userAgent: string
  viewport: string
  language: string
  platform: string
  timezone: string
}

export interface FeedbackSubmission {
  sessionId: string
  type: FeedbackType
  title: string
  description: string
  category: string
  severity?: BugSeverity
  stepsToReproduce?: string
  expectedBehavior?: string
  actualBehavior?: string
  proposedSolution?: string
  userBenefit?: string
  contactAllowed: boolean
  diagnostics: FeedbackDiagnostics
}

export interface FeedbackReceipt {
  reportId: string
  submittedAt: string
}
