// Types for the rewards calibration catalog system.
// See docs/REWARDS_CALIBRATION.md for the full design.

export type Category = 'Strength' | 'Intelligence' | 'Charisma'
export type CatalogUnit = 'time' | 'count' | 'event'
export type DifficultySource = 'exact' | 'tag' | 'category_default'
export type SignalSource = 'option' | 'free_text' | 'both'

// One structured signal extracted from intake answers.
// Multiple signals can come from a single intake card if the user's free text
// distinguishes between modifiers (e.g. "comfortable with friends, anxious with strangers").
export interface CatalogSignal {
  tag: string
  category: Category
  modifier: string
  difficulty: number  // 1 = very easy for user, 5 = very hard for user
  source: SignalSource
}

// Difficulty defaults per category, derived from the catch-all intake questions.
// Used for templates that no signal explicitly mentions.
export interface CategoryDefaults {
  Strength: number       // 1-5
  Intelligence: number   // 1-5
  Charisma: number       // 1-5
}

// A row in the user's personal catalog (instantiated from a seed template
// or created by AI valuation on a catalog miss).
export interface CatalogRow {
  // Signature components
  id: string                          // tag|category|modifier
  tag: string
  category: Category
  secondary_category?: Category
  secondary_category_split?: number
  modifier: string
  modifier_dimension: string
  unit: CatalogUnit

  // Rate fields — populated based on unit. Only the relevant subset is set per row.
  xp_per_min?: number
  shards_per_min?: number
  soft_cap_min?: number
  typical_duration_min?: number

  xp_per_unit?: number
  shards_per_unit?: number
  daily_cap?: number
  typical_count?: number

  xp_flat?: number
  shards_flat?: number

  // Calibration metadata
  intake_difficulty: number           // 1-5
  difficulty_source: DifficultySource

  // Effort-pair link (signature of paired tag, if this row has one)
  effort_pair?: string | null

  // Feedback-loop state
  stability_score: number
  feedback_count: number

  // Provenance
  auto_added: boolean                 // false = seed-instantiated; true = catalog-miss-created
  seeded_at: string                   // ISO timestamp
}

// One answer the user submitted for one intake card.
export interface IntakeAnswer {
  card_id: string
  question: string                    // captured so extraction has full context
  selected_option?: string            // option value (stable id), not the display label
  free_text?: string
  goal_id?: string                    // omitted for category catch-all cards
}

// One option displayed on an intake card.
export interface IntakeOption {
  value: string                       // stable identifier returned as selected_option
  label: string                       // display text the user reads
}

// One intake card (one question).
export interface IntakeCard {
  id: string                          // e.g. 'goal-0-q1', 'category-strength'
  goal_id?: string                    // index or label of the goal this card targets; omitted for catch-alls
  question: string
  options: IntakeOption[]
  free_text_placeholder: string
  modifier_dimension_hint?: string    // hint for extraction: which modifier dimension this card targets
}

// One item shown in the summary review at the end of intake.
export interface IntakeSummaryItem {
  signature: string
  display_label: string               // human-readable, e.g. "Presenting to unknown audiences"
  difficulty: number                  // 1-5
  difficulty_label: string            // e.g. "Very challenging"
}

// A user-submitted correction from the summary review.
export interface IntakeCorrection {
  signature: string
  new_difficulty: number
}

// Persisted calibration metadata (the intake transcript + extracted signals).
export interface CatalogCalibration {
  rawAnswers: IntakeAnswer[]
  extractedSignals: CatalogSignal[]
  categoryDefaults: CategoryDefaults
  // Tags from known_tags that the user's stated goals directly advance.
  // Used by the reward tier classifier to distinguish "in a goal category"
  // (loose) from "directly aligned with a stated goal" (tight). Optional
  // for backward-compat with catalogs created before this field existed —
  // missing/empty → classifier falls back to category-level check.
  goalTags?: string[]
  corrections?: IntakeCorrection[]
  completedAt: string                 // ISO timestamp
}

// Top-level catalog data attached to a user.
export interface CatalogData {
  rows: Record<string, CatalogRow>    // keyed by signature
  calibration: CatalogCalibration
  seedVersion: number
  createdAt: string
  lastUpdated: string
}
