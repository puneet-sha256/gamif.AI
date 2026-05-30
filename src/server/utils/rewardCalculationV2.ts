// Reward Calculation V2 (Milestone 1C)
//
// Replaces the old `rewardCalculation.ts` for users who have a personal catalog.
// Same activity, same signature → same row → same reward, every time.
//
// Pipeline per activity:
//   1. Build signature: tag|category|modifier
//   2. Tier classification (pure code, 5-tier)
//   3. Catalog hit → use stored rate
//      Catalog miss → fire activity-valuation AI call, write auto_added row
//   4. Reward = rate × value × tierMultiplier × inferredEffortPenalty
//   5. Apply per-signature daily_cap and per-category daily XP cap (80)

import type {
  User,
  CatalogData,
  CatalogRow,
  Category,
  RewardTier,
  RewardRateBreakdown,
  GeneratedTasks,
  CatalogUnit,
} from '../../shared/types'
import {
  loadSeedCatalog,
  getRowBySignature,
  addAutoAddedRow,
  pickAnchorRows,
  type SeedCatalog,
} from './catalogGenerator'
import { azureAIService } from '../services/azureAIService'
import { AIPromptType } from '../config/aiConfigs'
import { logger } from '../../utils/logger'

// ─── Public types ────────────────────────────────────────────────────────────

export interface ExtractedActivity {
  name: string
  tag: string
  category: Category
  modifier: string
  unit: CatalogUnit
  value: number
  value_source: 'stated' | 'inferred' | 'default'
  completed: boolean
  confidence: 'high' | 'partial' | 'low'
  // Per-activity goal judgment from the extraction AI:
  //   'advances'      → activity advances a stated goal → goal-aligned tier (1.0x)
  //   'category-only' → in a goal category but doesn't advance → category-aligned (0.80x)
  //   'neither'       → not self-improvement / wrong category → unrelated (skipped)
  // Optional for backward-compat with older extractions that didn't include it.
  goal_advancement?: 'advances' | 'category-only' | 'neither'
  notes: string
}

export interface RewardV2 {
  activityName: string
  signature: string
  tag: string
  category: Category
  modifier: string
  unit: CatalogUnit
  tier: RewardTier
  tierMultiplier: number
  xpEarned: number
  shardsEarned: number
  rateBreakdown: RewardRateBreakdown
  inferredEffortApplied: boolean
  capped: boolean
  notes: string
}

export interface SkippedV2 {
  activityName: string
  reason: string
  notes: string
}

export interface RewardComputationResult {
  rewards: RewardV2[]
  skipped: SkippedV2[]
  totalXP: number
  totalShards: number
  categoryBreakdown: Record<Category, { xp: number; shards: number }>
  catalogChanged: boolean
  updatedCatalog: CatalogData
}

// ─── Constants ───────────────────────────────────────────────────────────────

// Per-entry caps (soft_cap_min on time-based rows, daily_cap on count/event rows)
// already prevent single-activity gaming. We deliberately do NOT impose a
// per-category daily XP cap — it caused legitimate cross-tag activity to pay 0
// once the cap was hit, which felt punishing for active users.
const INFERRED_EFFORT_PENALTY = 0.85

const TIER_MULTIPLIER: Record<RewardTier, number> = {
  'goal-exact': 1.20,
  'goal-similar': 1.10,
  'goal-aligned': 1.00,
  'category-aligned': 0.80,
  'unrelated': 0,
}

// ─── Tier classification (pure code) ─────────────────────────────────────────

export function classifyTier(
  signature: string,
  extractedTag: string,
  extractedCategory: Category,
  generatedTasks: GeneratedTasks | undefined,
  goalCategories: Set<Category>,
  goalTags?: Set<string>,
  goalAdvancement?: 'advances' | 'category-only' | 'neither'
): { tier: RewardTier; multiplier: number } {
  // 1. Exact match against any planned task today — pure code, takes precedence
  const plannedSignatures = collectPlannedSignatures(generatedTasks)
  if (plannedSignatures.has(signature)) {
    return { tier: 'goal-exact', multiplier: TIER_MULTIPLIER['goal-exact'] }
  }

  // 2. Same tag+category as a planned task (modifier differs) — also pure code
  const plannedTagCats = collectPlannedTagCats(generatedTasks)
  if (plannedTagCats.has(`${extractedTag}|${extractedCategory}`)) {
    return { tier: 'goal-similar', multiplier: TIER_MULTIPLIER['goal-similar'] }
  }

  const knownCategory =
    extractedCategory === 'Strength' ||
    extractedCategory === 'Intelligence' ||
    extractedCategory === 'Charisma'

  // 3. Preferred: per-activity AI judgment (content-aware — distinguishes
  //    "read a Python article" from "read a sci-fi novel" even though both
  //    are reading_session).
  if (goalAdvancement) {
    if (goalAdvancement === 'advances') {
      return { tier: 'goal-aligned', multiplier: TIER_MULTIPLIER['goal-aligned'] }
    }
    if (goalAdvancement === 'category-only') {
      return knownCategory
        ? { tier: 'category-aligned', multiplier: TIER_MULTIPLIER['category-aligned'] }
        : { tier: 'unrelated', multiplier: 0 }
    }
    // 'neither' → unrelated regardless of category
    return { tier: 'unrelated', multiplier: 0 }
  }

  // 4. Fallback: catalog-level goal_tags (intake-time judgment).
  if (goalTags && goalTags.size > 0) {
    if (goalTags.has(extractedTag)) {
      return { tier: 'goal-aligned', multiplier: TIER_MULTIPLIER['goal-aligned'] }
    }
    return knownCategory
      ? { tier: 'category-aligned', multiplier: TIER_MULTIPLIER['category-aligned'] }
      : { tier: 'unrelated', multiplier: 0 }
  }

  // 5. Oldest fallback: category-level membership (for catalogs predating goal_tags).
  if (goalCategories.has(extractedCategory)) {
    return { tier: 'goal-aligned', multiplier: TIER_MULTIPLIER['goal-aligned'] }
  }

  // 6. Recognised activity category but no goal info
  if (knownCategory) {
    return { tier: 'category-aligned', multiplier: TIER_MULTIPLIER['category-aligned'] }
  }

  // 7. Unknown — skip
  return { tier: 'unrelated', multiplier: 0 }
}

function collectPlannedSignatures(tasks: GeneratedTasks | undefined): Set<string> {
  const set = new Set<string>()
  if (!tasks) return set
  for (const category of ['Strength', 'Intelligence', 'Charisma'] as const) {
    const list = tasks[category] ?? []
    for (const task of list) {
      if (task.signature) set.add(task.signature)
    }
  }
  return set
}

function collectPlannedTagCats(tasks: GeneratedTasks | undefined): Set<string> {
  const set = new Set<string>()
  if (!tasks) return set
  for (const category of ['Strength', 'Intelligence', 'Charisma'] as const) {
    const list = tasks[category] ?? []
    for (const task of list) {
      if (task.tag) set.add(`${task.tag}|${category}`)
    }
  }
  return set
}

// ─── Catalog hit / miss ──────────────────────────────────────────────────────

interface LookupResult {
  row: CatalogRow
  isNewRow: boolean
}

async function lookupOrValuate(
  signature: string,
  category: Category,
  unit: CatalogUnit,
  catalog: CatalogData,
  seed: SeedCatalog
): Promise<LookupResult> {
  const existing = getRowBySignature(catalog, signature)
  if (existing) return { row: existing, isNewRow: false }

  logger.custom('🆕', `Catalog miss for ${signature} — firing valuation AI call`)

  const anchors = pickAnchorRows(seed, category, 3)
  const valuationInput = {
    signature,
    target: parseSignature(signature),
    unit,
    category,
    anchors: anchors.map(a => ({
      signature: a.id,
      unit: a.unit,
      xp_per_min: a.xp_per_min_floor,
      shards_per_min: a.shards_per_min_floor,
      xp_per_unit: a.xp_per_unit_floor,
      shards_per_unit: a.shards_per_unit_floor,
      xp_flat: a.xp_flat_floor,
      shards_flat: a.shards_flat_floor,
      typical_duration_min: a.typical_duration_min,
      typical_count: a.typical_count,
      soft_cap_min: a.soft_cap_min,
      daily_cap: a.daily_cap,
      description: a.description,
    })),
  }

  const result = await azureAIService.generateCompletion(
    AIPromptType.ACTIVITY_VALUATION,
    JSON.stringify(valuationInput, null, 2)
  )

  if (!result.success || !result.data) {
    throw new Error(`Activity valuation failed: ${result.error ?? 'no data'}`)
  }

  let parsed: ValuationResponse
  try {
    parsed = JSON.parse(result.data.content)
  } catch (err) {
    const match = result.data.content.match(/\{[\s\S]*\}/)
    if (match) {
      parsed = JSON.parse(match[0])
    } else {
      throw new Error(`Failed to parse valuation response: ${err}`)
    }
  }

  const clamped = clampValuationToBand(parsed, category, unit)
  const { tag, modifier } = parseSignature(signature)

  const newRow: CatalogRow = {
    id: signature,
    tag,
    category,
    modifier,
    modifier_dimension: clamped.modifier_dimension ?? 'general',
    unit,
    xp_per_min: clamped.xp_per_min,
    shards_per_min: clamped.shards_per_min,
    soft_cap_min: clamped.soft_cap_min,
    typical_duration_min: clamped.typical_duration_min,
    xp_per_unit: clamped.xp_per_unit,
    shards_per_unit: clamped.shards_per_unit,
    daily_cap: clamped.daily_cap,
    typical_count: clamped.typical_count,
    xp_flat: clamped.xp_flat,
    shards_flat: clamped.shards_flat,
    intake_difficulty: 3,
    difficulty_source: 'category_default',
    effort_pair: null,
    stability_score: 0,
    feedback_count: 0,
    auto_added: true,
    seeded_at: new Date().toISOString(),
  }

  logger.success(`Valuation completed for ${signature}`)
  return { row: newRow, isNewRow: true }
}

interface ValuationResponse {
  xp_per_min?: number
  shards_per_min?: number
  xp_per_unit?: number
  shards_per_unit?: number
  xp_flat?: number
  shards_flat?: number
  soft_cap_min?: number
  daily_cap?: number
  typical_duration_min?: number
  typical_count?: number
  modifier_dimension?: string
  rationale?: string
}

// Per-category XP/min bands clamp the AI's proposal to sensible ranges.
const CATEGORY_BANDS: Record<Category, { xp_per_min: [number, number]; xp_per_unit: [number, number]; xp_flat: [number, number] }> = {
  Strength: { xp_per_min: [0.10, 0.70], xp_per_unit: [2, 12], xp_flat: [2, 25] },
  Intelligence: { xp_per_min: [0.10, 0.50], xp_per_unit: [2, 15], xp_flat: [3, 25] },
  Charisma: { xp_per_min: [0.10, 0.50], xp_per_unit: [2, 12], xp_flat: [3, 40] },
}

function clampValuationToBand(
  v: ValuationResponse,
  category: Category,
  unit: CatalogUnit
): ValuationResponse {
  const band = CATEGORY_BANDS[category]
  const out: ValuationResponse = { ...v }
  if (unit === 'time') {
    if (out.xp_per_min !== undefined) out.xp_per_min = clamp(out.xp_per_min, band.xp_per_min[0], band.xp_per_min[1])
    if (out.shards_per_min !== undefined) out.shards_per_min = clamp(out.shards_per_min, band.xp_per_min[0] * 2, band.xp_per_min[1] * 2)
    out.soft_cap_min = out.soft_cap_min ?? 90
    out.typical_duration_min = out.typical_duration_min ?? 30
  }
  if (unit === 'count') {
    if (out.xp_per_unit !== undefined) out.xp_per_unit = clamp(out.xp_per_unit, band.xp_per_unit[0], band.xp_per_unit[1])
    if (out.shards_per_unit !== undefined) out.shards_per_unit = clamp(out.shards_per_unit, band.xp_per_unit[0] * 2, band.xp_per_unit[1] * 2)
    out.daily_cap = out.daily_cap ?? 5
    out.typical_count = out.typical_count ?? 1
  }
  if (unit === 'event') {
    if (out.xp_flat !== undefined) out.xp_flat = clamp(out.xp_flat, band.xp_flat[0], band.xp_flat[1])
    if (out.shards_flat !== undefined) out.shards_flat = clamp(out.shards_flat, band.xp_flat[0] * 2, band.xp_flat[1] * 2)
    out.daily_cap = out.daily_cap ?? 1
  }
  return out
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function parseSignature(signature: string): { tag: string; category: Category; modifier: string } {
  const parts = signature.split('|')
  return {
    tag: parts[0] ?? '',
    category: (parts[1] ?? 'Strength') as Category,
    modifier: parts[2] ?? '',
  }
}

// ─── Reward computation per activity ─────────────────────────────────────────

interface BaseReward {
  xp: number
  shards: number
  rateBreakdown: RewardRateBreakdown
  capped: boolean
}

function computeBaseReward(row: CatalogRow, value: number): BaseReward {
  if (row.unit === 'time') {
    const cap = row.soft_cap_min ?? Number.POSITIVE_INFINITY
    const effective = Math.min(value, cap)
    const xp = (row.xp_per_min ?? 0) * effective
    const shards = (row.shards_per_min ?? 0) * effective
    return {
      xp,
      shards,
      rateBreakdown: { rate: row.xp_per_min ?? 0, value: effective, unit: 'time' },
      capped: effective < value,
    }
  }
  if (row.unit === 'count') {
    const cap = row.daily_cap ?? Number.POSITIVE_INFINITY
    const effective = Math.min(value, cap)
    const xp = (row.xp_per_unit ?? 0) * effective
    const shards = (row.shards_per_unit ?? 0) * effective
    return {
      xp,
      shards,
      rateBreakdown: { rate: row.xp_per_unit ?? 0, value: effective, unit: 'count' },
      capped: effective < value,
    }
  }
  // event
  return {
    xp: row.xp_flat ?? 0,
    shards: row.shards_flat ?? 0,
    rateBreakdown: { rate: row.xp_flat ?? 0, value: 1, unit: 'event' },
    capped: false,
  }
}

// ─── Top-level orchestrator ──────────────────────────────────────────────────

export async function computeRewardsFromExtraction(
  activities: ExtractedActivity[],
  user: User
): Promise<RewardComputationResult> {
  if (!user.catalog) {
    throw new Error('User has no catalog. Cannot compute v2 rewards.')
  }

  const seed = loadSeedCatalog()
  let catalog = user.catalog
  let catalogChanged = false
  const goalCategories = new Set<Category>(
    user.catalog.calibration.extractedSignals.map(s => s.category)
  )
  // Tag-level goal mapping from intake (when present). Empty / undefined means
  // the catalog predates this field — classifyTier falls back to category check.
  const goalTags = user.catalog.calibration.goalTags && user.catalog.calibration.goalTags.length > 0
    ? new Set<string>(user.catalog.calibration.goalTags)
    : undefined

  const rewards: RewardV2[] = []
  const skipped: SkippedV2[] = []
  const categoryBreakdown: Record<Category, { xp: number; shards: number }> = {
    Strength: { xp: 0, shards: 0 },
    Intelligence: { xp: 0, shards: 0 },
    Charisma: { xp: 0, shards: 0 },
  }

  for (const act of activities) {
    const signature = `${act.tag}|${act.category}|${act.modifier}`

    // Tier classification
    const { tier, multiplier } = classifyTier(
      signature,
      act.tag,
      act.category,
      user.generatedTasks,
      goalCategories,
      goalTags,
      act.goal_advancement
    )

    if (tier === 'unrelated') {
      skipped.push({
        activityName: act.name,
        reason: 'No category fit',
        notes: act.notes,
      })
      continue
    }

    // Catalog lookup or valuation
    let lookup: LookupResult
    try {
      lookup = await lookupOrValuate(signature, act.category, act.unit, catalog, seed)
    } catch (err) {
      logger.error(`Valuation failed for ${signature}; skipping activity`, err)
      skipped.push({
        activityName: act.name,
        reason: 'Catalog valuation failed',
        notes: act.notes,
      })
      continue
    }

    if (lookup.isNewRow) {
      catalog = addAutoAddedRow(catalog, lookup.row)
      catalogChanged = true
    }

    // Compute base reward
    const base = computeBaseReward(lookup.row, act.value)

    // Apply tier multiplier
    let xp = base.xp * multiplier
    let shards = base.shards * multiplier

    // Apply inferred-effort penalty if value wasn't stated
    const inferredEffortApplied = act.value_source !== 'stated'
    if (inferredEffortApplied) {
      xp *= INFERRED_EFFORT_PENALTY
      shards *= INFERRED_EFFORT_PENALTY
    }

    // No per-category daily cap. Per-entry caps (soft_cap_min for time-based
    // rows, daily_cap on count/event rows) already limit single-activity gaming.

    xp = Math.floor(xp)
    shards = round2(shards)

    rewards.push({
      activityName: act.name,
      signature,
      tag: act.tag,
      category: act.category,
      modifier: act.modifier,
      unit: act.unit,
      tier,
      tierMultiplier: multiplier,
      xpEarned: xp,
      shardsEarned: shards,
      rateBreakdown: base.rateBreakdown,
      inferredEffortApplied,
      capped: base.capped,
      notes: act.notes,
    })

    categoryBreakdown[act.category].xp += xp
    categoryBreakdown[act.category].shards = round2(categoryBreakdown[act.category].shards + shards)
  }

  const totalXP = rewards.reduce((sum, r) => sum + r.xpEarned, 0)
  const totalShards = round2(rewards.reduce((sum, r) => sum + r.shardsEarned, 0))

  return {
    rewards,
    skipped,
    totalXP,
    totalShards,
    categoryBreakdown,
    catalogChanged,
    updatedCatalog: catalog,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
