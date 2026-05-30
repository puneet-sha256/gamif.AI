// Catalog feedback application (Milestone 1D).
// Given a user vote on a claimed reward, returns a new CatalogRow with its
// rate nudged, stability_score adjusted, and feedback_count incremented.
//
// Rules:
//   - 'up'    → no rate change, +1 stability_score
//   - 'over'  → rate × 0.92 (low stability) or × 0.96 (stable),  -1 stability_score
//   - 'under' → rate × 1.10 (low stability) or × 1.05 (stable),  -1 stability_score
//   - Rate is clamped to [0.5×, 2×] of the seed floor for this signature, so
//     repeated votes can't drag a row arbitrarily far from sensible bounds.
//   - stability_score floors at 0.

import type { CatalogRow, CatalogVote } from '../../shared/types'
import type { SeedTemplate, SeedCatalog } from './catalogGenerator'
import { loadSeedCatalog } from './catalogGenerator'
import { logger } from '../../utils/logger'

interface RateMultipliers {
  up: number
  over: number
  under: number
}

const LOW_STABILITY_MULT: RateMultipliers = { up: 1, over: 0.92, under: 1.10 }
const STABLE_MULT: RateMultipliers = { up: 1, over: 0.96, under: 1.05 }

const STABILITY_THRESHOLD = 10

export function applyFeedbackToRow(
  row: CatalogRow,
  vote: CatalogVote,
  seed?: SeedCatalog
): CatalogRow {
  const s = seed ?? loadSeedCatalog()
  const template = s.templates.find(t => t.id === row.id)

  // Auto-added rows have no seed template — use the row's own current rate as the
  // floor anchor so clamping still applies but relative to its initial valuation.
  const floor = computeSeedFloor(template, row)

  const multipliers = row.stability_score >= STABILITY_THRESHOLD ? STABLE_MULT : LOW_STABILITY_MULT
  const mult = multipliers[vote]

  const stabilityDelta = vote === 'up' ? 1 : -1
  const nextStability = Math.max(0, row.stability_score + stabilityDelta)

  const updated: CatalogRow = {
    ...row,
    feedback_count: row.feedback_count + 1,
    stability_score: nextStability,
  }

  // Apply mult to whichever rate fields exist for this unit type.
  if (updated.xp_per_min !== undefined) {
    updated.xp_per_min = clampRate(updated.xp_per_min * mult, floor.xp_per_min)
  }
  if (updated.shards_per_min !== undefined) {
    updated.shards_per_min = clampRate(updated.shards_per_min * mult, floor.shards_per_min)
  }
  if (updated.xp_per_unit !== undefined) {
    updated.xp_per_unit = clampRate(updated.xp_per_unit * mult, floor.xp_per_unit)
  }
  if (updated.shards_per_unit !== undefined) {
    updated.shards_per_unit = clampRate(updated.shards_per_unit * mult, floor.shards_per_unit)
  }
  if (updated.xp_flat !== undefined) {
    updated.xp_flat = clampRate(updated.xp_flat * mult, floor.xp_flat)
  }
  if (updated.shards_flat !== undefined) {
    updated.shards_flat = clampRate(updated.shards_flat * mult, floor.shards_flat)
  }

  logger.custom('🔄', `Feedback ${vote} on ${row.id}: rate ×${mult}, stability ${row.stability_score} → ${nextStability}`)

  return updated
}

// ─── Internal helpers ────────────────────────────────────────────────────────

interface RateFloors {
  xp_per_min?: number
  shards_per_min?: number
  xp_per_unit?: number
  shards_per_unit?: number
  xp_flat?: number
  shards_flat?: number
}

function computeSeedFloor(template: SeedTemplate | undefined, row: CatalogRow): RateFloors {
  if (template) {
    return {
      xp_per_min: template.xp_per_min_floor,
      shards_per_min: template.shards_per_min_floor,
      xp_per_unit: template.xp_per_unit_floor,
      shards_per_unit: template.shards_per_unit_floor,
      xp_flat: template.xp_flat_floor,
      shards_flat: template.shards_flat_floor,
    }
  }
  // Auto-added row — use the row's own initial rate as the floor anchor.
  // We don't know the "original" rate, so use the current rate divided by the user's
  // intake_difficulty multiplier to approximate the floor.
  const mult = 0.75 + row.intake_difficulty * 0.25
  return {
    xp_per_min: row.xp_per_min !== undefined ? row.xp_per_min / mult : undefined,
    shards_per_min: row.shards_per_min !== undefined ? row.shards_per_min / mult : undefined,
    xp_per_unit: row.xp_per_unit !== undefined ? row.xp_per_unit / mult : undefined,
    shards_per_unit: row.shards_per_unit !== undefined ? row.shards_per_unit / mult : undefined,
    xp_flat: row.xp_flat !== undefined ? row.xp_flat / mult : undefined,
    shards_flat: row.shards_flat !== undefined ? row.shards_flat / mult : undefined,
  }
}

function clampRate(value: number, floor: number | undefined): number {
  const f = floor ?? value
  const lo = f * 0.5
  const hi = f * 2
  return round2(Math.max(lo, Math.min(hi, value)))
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
