import { readFileSync } from 'fs'
import { join } from 'path'
import type {
  CatalogData,
  CatalogRow,
  CatalogSignal,
  CategoryDefaults,
  Category,
  CatalogUnit,
  DifficultySource,
  IntakeAnswer,
  IntakeSummaryItem,
} from '../../shared/types'
import { logger } from '../../utils/logger'

// ─── Seed catalog types ──────────────────────────────────────────────────────
// These types describe the on-disk shape of src/server/data/catalog/seed-v1.json.

export interface SeedTemplate {
  id: string
  tag: string
  category: Category
  secondary_category?: Category
  secondary_category_split?: number
  modifier: string
  modifier_dimension: string
  unit: CatalogUnit

  xp_per_min_floor?: number
  shards_per_min_floor?: number
  soft_cap_min?: number
  typical_duration_min?: number

  xp_per_unit_floor?: number
  shards_per_unit_floor?: number
  daily_cap?: number
  typical_count?: number

  xp_flat_floor?: number
  shards_flat_floor?: number

  description: string
  natural_language_examples?: string[]
  effort_pair?: string | null
}

export interface SeedCatalog {
  version: number
  version_date: string
  description: string
  rate_formula: {
    personal_rate: string
    difficulty_range: [number, number]
    personal_multiplier_at_difficulty_1: number
    personal_multiplier_at_difficulty_5: number
  }
  modifier_meanings: Record<string, string>
  global_rules: {
    category_daily_xp_cap: number
    inferred_effort_penalty: number
    auto_added_provisional_until_uses: number
  }
  templates: SeedTemplate[]
}

// ─── Loader (cached) ─────────────────────────────────────────────────────────

let cachedSeed: SeedCatalog | null = null

const SEED_PATH = join(__dirname, '..', 'data', 'catalog', 'seed-v1.json')

export function loadSeedCatalog(): SeedCatalog {
  if (cachedSeed) return cachedSeed
  try {
    const raw = readFileSync(SEED_PATH, 'utf-8')
    cachedSeed = JSON.parse(raw) as SeedCatalog
    logger.custom('📦', `Loaded seed catalog v${cachedSeed.version} (${cachedSeed.templates.length} templates)`)
    return cachedSeed
  } catch (err) {
    logger.error('Failed to load seed catalog from', SEED_PATH, err)
    throw new Error(`Seed catalog not found at ${SEED_PATH}`)
  }
}

// ─── Difficulty → multiplier ─────────────────────────────────────────────────

export function difficultyMultiplier(difficulty: number): number {
  // Clamp to [1, 5]
  const d = Math.max(1, Math.min(5, difficulty))
  return 0.75 + d * 0.25
}

// ─── Per-template instantiation ──────────────────────────────────────────────

export function applyDifficultyToTemplate(
  template: SeedTemplate,
  difficulty: number,
  difficultySource: DifficultySource,
  seededAt: string
): CatalogRow {
  const mult = difficultyMultiplier(difficulty)

  const row: CatalogRow = {
    id: template.id,
    tag: template.tag,
    category: template.category,
    secondary_category: template.secondary_category,
    secondary_category_split: template.secondary_category_split,
    modifier: template.modifier,
    modifier_dimension: template.modifier_dimension,
    unit: template.unit,

    intake_difficulty: difficulty,
    difficulty_source: difficultySource,
    effort_pair: template.effort_pair ?? null,

    stability_score: 0,
    feedback_count: 0,
    auto_added: false,
    seeded_at: seededAt,
  }

  // Populate the unit-specific fields
  if (template.unit === 'time') {
    if (template.xp_per_min_floor !== undefined) {
      row.xp_per_min = round2(template.xp_per_min_floor * mult)
    }
    if (template.shards_per_min_floor !== undefined) {
      row.shards_per_min = round2(template.shards_per_min_floor * mult)
    }
    row.soft_cap_min = template.soft_cap_min
    row.typical_duration_min = template.typical_duration_min
  } else if (template.unit === 'count') {
    if (template.xp_per_unit_floor !== undefined) {
      row.xp_per_unit = round2(template.xp_per_unit_floor * mult)
    }
    if (template.shards_per_unit_floor !== undefined) {
      row.shards_per_unit = round2(template.shards_per_unit_floor * mult)
    }
    row.daily_cap = template.daily_cap
    row.typical_count = template.typical_count
  } else if (template.unit === 'event') {
    if (template.xp_flat_floor !== undefined) {
      row.xp_flat = round2(template.xp_flat_floor * mult)
    }
    if (template.shards_flat_floor !== undefined) {
      row.shards_flat = round2(template.shards_flat_floor * mult)
    }
    row.daily_cap = template.daily_cap
  }

  return row
}

// ─── Difficulty selection (signals → per-template difficulty) ────────────────

function selectDifficulty(
  template: SeedTemplate,
  signals: CatalogSignal[],
  categoryDefaults: CategoryDefaults
): { difficulty: number; source: DifficultySource } {
  // 1. Exact match: same tag, category, modifier
  const exact = signals.find(
    s =>
      s.tag === template.tag &&
      s.category === template.category &&
      s.modifier === template.modifier
  )
  if (exact) {
    return { difficulty: exact.difficulty, source: 'exact' }
  }

  // 2. Tag+category match (modifier-agnostic)
  const tagMatch = signals.find(s => s.tag === template.tag && s.category === template.category)
  if (tagMatch) {
    return { difficulty: tagMatch.difficulty, source: 'tag' }
  }

  // 3. Fall back to category catch-all default
  const defaultDifficulty = categoryDefaults[template.category]
  return { difficulty: defaultDifficulty, source: 'category_default' }
}

// ─── Top-level generator ─────────────────────────────────────────────────────

export function generatePersonalCatalog(
  signals: CatalogSignal[],
  categoryDefaults: CategoryDefaults,
  rawAnswers: IntakeAnswer[],
  seed?: SeedCatalog
): CatalogData {
  const s = seed ?? loadSeedCatalog()
  const now = new Date().toISOString()
  const rows: Record<string, CatalogRow> = {}

  for (const template of s.templates) {
    const { difficulty, source } = selectDifficulty(template, signals, categoryDefaults)
    rows[template.id] = applyDifficultyToTemplate(template, difficulty, source, now)
  }

  return {
    rows,
    calibration: {
      rawAnswers,
      extractedSignals: signals,
      categoryDefaults,
      completedAt: now,
    },
    seedVersion: s.version,
    createdAt: now,
    lastUpdated: now,
  }
}

// ─── Apply corrections after summary review ──────────────────────────────────

export function applyCorrectionsToCatalog(
  catalog: CatalogData,
  corrections: { signature: string; new_difficulty: number }[],
  seed?: SeedCatalog
): CatalogData {
  if (corrections.length === 0) return catalog
  const s = seed ?? loadSeedCatalog()
  const now = new Date().toISOString()
  const newRows = { ...catalog.rows }

  for (const correction of corrections) {
    const template = s.templates.find(t => t.id === correction.signature)
    if (!template) {
      logger.warn(`Correction references unknown signature: ${correction.signature}`)
      continue
    }
    newRows[correction.signature] = applyDifficultyToTemplate(
      template,
      correction.new_difficulty,
      'exact', // user-stated corrections become exact
      now
    )
  }

  return {
    ...catalog,
    rows: newRows,
    calibration: {
      ...catalog.calibration,
      corrections: [...(catalog.calibration.corrections ?? []), ...corrections],
    },
    lastUpdated: now,
  }
}

// ─── Summary items for user review ───────────────────────────────────────────

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Very easy for me',
  2: 'Manageable',
  3: 'Moderate',
  4: 'Challenging',
  5: 'Very challenging',
}

export function buildIntakeSummary(catalog: CatalogData, seed?: SeedCatalog): IntakeSummaryItem[] {
  const s = seed ?? loadSeedCatalog()
  const items: IntakeSummaryItem[] = []
  const seenSignatures = new Set<string>()

  // Iterate the user-driven signals (not category defaults) so we surface what the user actually told us.
  for (const signal of catalog.calibration.extractedSignals) {
    const signature = `${signal.tag}|${signal.category}|${signal.modifier}`
    if (seenSignatures.has(signature)) continue
    seenSignatures.add(signature)

    const template = s.templates.find(t => t.id === signature)
    const label = template
      ? `${capitalise(template.tag.replace(/_/g, ' '))} (${template.modifier.replace(/_/g, ' ')})`
      : `${signal.tag} (${signal.modifier})`

    items.push({
      signature,
      display_label: label,
      difficulty: signal.difficulty,
      difficulty_label: DIFFICULTY_LABELS[signal.difficulty] ?? 'Moderate',
    })
  }

  return items
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Known-tags listing for the extraction prompt ────────────────────────────

export function buildKnownTagsListing(seed?: SeedCatalog) {
  const s = seed ?? loadSeedCatalog()
  return s.templates.map(t => ({
    tag: t.tag,
    category: t.category,
    modifier: t.modifier,
    modifier_dimension: t.modifier_dimension,
    description: t.description,
  }))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
