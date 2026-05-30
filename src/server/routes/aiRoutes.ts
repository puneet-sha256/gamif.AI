import type { Request, Response } from 'express'
import { azureAIService } from '../services/azureAIService'
import { findSessionById, findUserById, updateSessionLastAccess, updateUserGeneratedTasks, updateUser } from '../utils/dataOperations'
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorMessages
} from '../utils/responseHelpers'
import type { GoalsData, ProfileData, GeneratedTasks, UnclaimedReward, UnclaimedRewards, CompletedTask, IntakeAnswer, IntakeCorrection, CatalogSignal, CategoryDefaults } from '../../types'
import { AIPromptType } from '../config/aiConfigs'
import {
  generatePersonalCatalog,
  applyCorrectionsToCatalog,
  buildIntakeSummary,
  buildKnownTagsListing,
  buildUserKnownTagsListing,
  loadSeedCatalog,
} from '../utils/catalogGenerator'
import { computeRewardsFromExtraction, type ExtractedActivity } from '../utils/rewardCalculationV2'
import { logger } from '../../utils/logger'

// Generate daily tasks via the v2 catalog-aware pipeline (Milestone 1C).
// AI emits tag + modifier per task; server attaches id + signature and previews
// expected reward from the user's personal catalog at the goal-exact tier (1.20×).
export async function generateTasks(req: Request, res: Response) {
  try {
    const { sessionId, goals: bodyGoals } = req.body

    if (!sessionId) {
      return res.status(400).json(createErrorResponse('Session ID is required'))
    }

    const session = await findSessionById(sessionId)
    if (!session) {
      return res.status(401).json(createErrorResponse(ErrorMessages.INVALID_SESSION))
    }

    const user = await findUserById(session.userId)
    if (!user) {
      return res.status(404).json(createErrorResponse(ErrorMessages.USER_NOT_FOUND))
    }

    if (!user.catalog) {
      return res.status(400).json(createErrorResponse(
        'No catalog. Complete the rewards calibration intake before generating tasks.'
      ))
    }

    const goals = (bodyGoals as GoalsData | undefined)?.longTermGoals?.trim()
      ?? user.goalsData?.longTermGoals?.trim()
    if (!goals) {
      return res.status(400).json(createErrorResponse('No goals set'))
    }

    logger.custom('🤖', `Starting v2 task generation for user: ${user.username}`)

    const inputData = {
      long_term_goals: goals,
      known_tags: buildUserKnownTagsListing(user.catalog),
    }

    const result = await azureAIService.generateCompletion(
      AIPromptType.TASK_GENERATION,
      JSON.stringify(inputData, null, 2)
    )

    if (!result.success || !result.data) {
      logger.error('Task generation failed:', result.error)
      return res.status(500).json(createErrorResponse(result.error || 'Task generation failed'))
    }

    let parsed: ParsedV2Tasks | null = null
    try {
      parsed = JSON.parse(result.data.content) as ParsedV2Tasks
    } catch (parseErr) {
      const jsonMatch = result.data.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]) as ParsedV2Tasks
        } catch {
          /* fall through */
        }
      }
      if (!parsed) {
        logger.error('Failed to parse task generation JSON:', parseErr)
      }
    }

    if (!parsed) {
      return res.status(500).json(createErrorResponse('Invalid response from task generator'))
    }

    // Stamp id + signature on each task, compute preview XP/shards from catalog (goal-exact tier).
    const nowMs = Date.now()
    const generatedTasks: GeneratedTasks = {}
    for (const category of ['Strength', 'Intelligence', 'Charisma'] as const) {
      const list = parsed[category]
      if (!list || !Array.isArray(list)) continue
      generatedTasks[category] = list.map((task: ParsedV2Task, index: number) => {
        const signature = `${task.tag}|${category}|${task.modifier}`
        const preview = previewTaskReward(user.catalog!, signature, task.expected_duration_minutes)
        return {
          id: `${category.toLowerCase()}-${nowMs}-${index}`,
          title: task.title,
          description: task.description,
          expected_duration_minutes: task.expected_duration_minutes,
          tag: task.tag,
          modifier: task.modifier,
          signature,
          xp: preview.xp,
          shards: preview.shards,
        }
      })
    }
    generatedTasks.lastUpdated = new Date().toISOString()

    await updateUserGeneratedTasks(user.id, generatedTasks)
    await updateSessionLastAccess(sessionId)
    logger.success('v2 generated tasks stored in user profile')

    res.json(createSuccessResponse(
      'Tasks generated successfully',
      { generatedTasks, rawResponse: result.data.content },
      undefined,
      undefined,
      {
        processingTime: result.processingTimeMs,
        agentUsed: 'azure-openai-foundry-v2',
      }
    ))
  } catch (error) {
    logger.error('Task generation error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

// ─── Helpers for v2 task generation ────────────────────────────────────────

interface ParsedV2Task {
  title: string
  description: string
  tag: string
  modifier: string
  expected_duration_minutes?: number
}
interface ParsedV2Tasks {
  Strength?: ParsedV2Task[]
  Intelligence?: ParsedV2Task[]
  Charisma?: ParsedV2Task[]
}

// Preview "if you do exactly as planned" reward at goal-exact tier (1.20×).
function previewTaskReward(
  catalog: import('../../shared/types').CatalogData,
  signature: string,
  durationMin: number | undefined
): { xp: number; shards: number } {
  const row = catalog.rows[signature]
  if (!row) return { xp: 0, shards: 0 }
  const tier = 1.20
  if (row.unit === 'time') {
    const cap = row.soft_cap_min ?? Number.POSITIVE_INFINITY
    const effective = Math.min(durationMin ?? row.typical_duration_min ?? 30, cap)
    return {
      xp: Math.floor((row.xp_per_min ?? 0) * effective * tier),
      shards: round2((row.shards_per_min ?? 0) * effective * tier),
    }
  }
  if (row.unit === 'count') {
    const v = row.typical_count ?? 1
    return {
      xp: Math.floor((row.xp_per_unit ?? 0) * v * tier),
      shards: round2((row.shards_per_unit ?? 0) * v * tier),
    }
  }
  return {
    xp: Math.floor((row.xp_flat ?? 0) * tier),
    shards: round2((row.shards_flat ?? 0) * tier),
  }
}

// Analyze daily activity using the v2 catalog-driven pipeline (Milestone 1C).
// Extraction → tier classification → catalog lookup or valuation → caps → persist.
export async function analyzeDailyActivity(req: Request, res: Response) {
  try {
    const { sessionId, dailyActivity, activityDate: reqActivityDate } = req.body
    const activityDate = reqActivityDate || new Date().toISOString().split('T')[0]

    // Validate required fields
    if (!sessionId || !dailyActivity) {
      return res.status(400).json(createErrorResponse(
        'Session ID and daily activity description are required'
      ))
    }

    // Verify session
    const session = await findSessionById(sessionId)
    if (!session) {
      return res.status(401).json(createErrorResponse(ErrorMessages.INVALID_SESSION))
    }

    // Find user
    const user = await findUserById(session.userId)
    if (!user) {
      return res.status(404).json(createErrorResponse(ErrorMessages.USER_NOT_FOUND))
    }

    // Guard: v2 pipeline requires a calibrated catalog. Should never fire because
    // the frontend gates the dashboard on user.catalog and routes to intake first.
    if (!user.catalog) {
      return res.status(400).json(createErrorResponse(
        'No catalog found. Complete the rewards calibration intake before logging activities.'
      ))
    }

    logger.custom('🤖', `Starting v2 activity analysis for user: ${user.username}`)
    logger.custom('📝', 'User Activity:', dailyActivity)

    // ─── Step 1: Extraction ──────────────────────────────────────────────
    const extractionInput = {
      daily_log: dailyActivity,
      known_tags: buildUserKnownTagsListing(user.catalog),
    }

    const extractionResult = await azureAIService.generateCompletion(
      AIPromptType.ACTIVITY_EXTRACTION,
      JSON.stringify(extractionInput, null, 2)
    )

    if (!extractionResult.success || !extractionResult.data) {
      logger.error('Activity extraction failed:', extractionResult.error)
      return res.status(500).json(createErrorResponse(
        extractionResult.error || 'Activity extraction failed'
      ))
    }

    let extracted: { activities?: ExtractedActivity[] } | null = null
    try {
      extracted = JSON.parse(extractionResult.data.content)
    } catch (parseErr) {
      const jsonMatch = extractionResult.data.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          extracted = JSON.parse(jsonMatch[0])
        } catch {
          /* fall through to error */
        }
      }
      if (!extracted) {
        logger.error('Failed to parse extraction JSON:', parseErr)
      }
    }

    if (!extracted?.activities || !Array.isArray(extracted.activities)) {
      return res.status(500).json(createErrorResponse('Invalid response from activity extraction'))
    }

    logger.custom('📊', `Extracted ${extracted.activities.length} activities`)

    // ─── Step 2: Compute rewards via catalog ─────────────────────────────
    let computation: Awaited<ReturnType<typeof computeRewardsFromExtraction>>
    try {
      computation = await computeRewardsFromExtraction(extracted.activities, user)
    } catch (computeErr) {
      logger.error('Reward computation failed:', computeErr)
      return res.status(500).json(createErrorResponse(
        'Reward computation failed'
      ))
    }

    // ─── Step 3: Persist taskHistory + unclaimedRewards + catalog ────────
    if (computation.rewards.length > 0 || computation.catalogChanged) {
      const existingRewards = user.unclaimedRewards
      const nowIso = new Date().toISOString()

      const newUnclaimed: UnclaimedReward[] = computation.rewards.map(r => ({
        activityName: r.activityName,
        matchType: r.tier,
        category: r.category,
        effortRatio: r.tierMultiplier,
        xpEarned: r.xpEarned,
        shardsEarned: r.shardsEarned,
        calculationNotes: buildCalculationNotes(r),
        timestamp: nowIso,
        activityDate,
        signature: r.signature,
        tier: r.tier,
        tierMultiplier: r.tierMultiplier,
        systemVersion: 'v2',
        rateBreakdown: r.rateBreakdown,
      }))

      const allActivities = [...(existingRewards?.activities || []), ...newUnclaimed]
      const totalXP = (existingRewards?.totalXP || 0) + computation.totalXP
      const totalShards = round2((existingRewards?.totalShards || 0) + computation.totalShards)
      const categoryBreakdown = {
        Strength: {
          xp: (existingRewards?.categoryBreakdown?.Strength?.xp || 0) + computation.categoryBreakdown.Strength.xp,
          shards: round2((existingRewards?.categoryBreakdown?.Strength?.shards || 0) + computation.categoryBreakdown.Strength.shards),
        },
        Intelligence: {
          xp: (existingRewards?.categoryBreakdown?.Intelligence?.xp || 0) + computation.categoryBreakdown.Intelligence.xp,
          shards: round2((existingRewards?.categoryBreakdown?.Intelligence?.shards || 0) + computation.categoryBreakdown.Intelligence.shards),
        },
        Charisma: {
          xp: (existingRewards?.categoryBreakdown?.Charisma?.xp || 0) + computation.categoryBreakdown.Charisma.xp,
          shards: round2((existingRewards?.categoryBreakdown?.Charisma?.shards || 0) + computation.categoryBreakdown.Charisma.shards),
        },
      }

      const unclaimedRewards: UnclaimedRewards = {
        activities: allActivities,
        totalXP,
        totalShards,
        categoryBreakdown,
        lastUpdated: nowIso,
      }

      const newCompleted: CompletedTask[] = computation.rewards.map(r => ({
        activityName: r.activityName,
        matchType: r.tier,
        category: r.category,
        effortRatio: r.tierMultiplier,
        xpEarned: r.xpEarned,
        shardsEarned: r.shardsEarned,
        calculationNotes: buildCalculationNotes(r),
        timestamp: nowIso,
        signature: r.signature,
        tier: r.tier,
        tierMultiplier: r.tierMultiplier,
        systemVersion: 'v2',
        rateBreakdown: r.rateBreakdown,
      }))

      const dailyTasks = [...(user.taskHistory?.dailyTasks || [])]
      const existingDayIndex = dailyTasks.findIndex(dt => dt.date === activityDate)
      if (existingDayIndex >= 0) {
        dailyTasks[existingDayIndex] = {
          ...dailyTasks[existingDayIndex],
          tasks: [...dailyTasks[existingDayIndex].tasks, ...newCompleted],
        }
      } else {
        dailyTasks.push({ date: activityDate, tasks: newCompleted })
      }
      const taskHistory = { dailyTasks, lastUpdated: nowIso }

      // Persist atomically. Includes catalog only if auto_added rows were created.
      const updates: Partial<typeof user> = { unclaimedRewards, taskHistory }
      if (computation.catalogChanged) {
        updates.catalog = computation.updatedCatalog
      }
      await updateUser(user.id, updates)
      logger.success(`v2 rewards persisted: ${computation.rewards.length} activities, catalogChanged=${computation.catalogChanged}`)
    }

    await updateSessionLastAccess(sessionId)

    res.json(createSuccessResponse(
      'Daily activity analyzed successfully',
      {
        // Legacy "matches" key preserved for frontend compat; populated with the v2 rewards.
        matches: computation.rewards.map(r => ({
          name: r.activityName,
          match_type: r.tier,
          matched_task: null,
          category: r.category,
          goal_link: null,
          similarity_score: null,
          alignment_factor: null,
          effort_ratio: r.tierMultiplier,
          notes: r.notes,
        })),
        rewards: {
          totalXP: computation.totalXP,
          totalShards: computation.totalShards,
          categoryBreakdown: computation.categoryBreakdown,
          activityRewards: computation.rewards.map(r => ({
            activityName: r.activityName,
            matchType: r.tier,
            category: r.category,
            effortRatio: r.tierMultiplier,
            xpEarned: r.xpEarned,
            shardsEarned: r.shardsEarned,
            calculationNotes: buildCalculationNotes(r),
            signature: r.signature,
            tier: r.tier,
            tierMultiplier: r.tierMultiplier,
            rateBreakdown: r.rateBreakdown,
          })),
          skippedActivities: computation.skipped.map(s => ({
            activityName: s.activityName,
            category: 'Strength',
            reason: s.reason,
            notes: s.notes,
          })),
          processedCount: computation.rewards.length,
          skippedCount: computation.skipped.length,
        },
        rawResponse: extractionResult.data.content,
        processingTime: extractionResult.processingTimeMs,
      },
      undefined,
      undefined,
      {
        processingTime: extractionResult.processingTimeMs,
        agentUsed: 'azure-openai-foundry-v2',
      }
    ))
  } catch (error) {
    logger.error('Activity analysis error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

// Human-readable summary of how the reward was computed — surfaced in the claim modal.
function buildCalculationNotes(r: import('../utils/rewardCalculationV2').RewardV2): string {
  const { rate, value, unit } = r.rateBreakdown
  const unitLabel = unit === 'time' ? 'min' : unit === 'count' ? 'units' : ''
  const base = unit === 'event'
    ? `flat ${rate}`
    : `${rate} × ${value} ${unitLabel}`
  return `${base} × ${r.tierMultiplier} (${r.tier})${r.inferredEffortApplied ? ' × 0.85 (inferred)' : ''}${r.capped ? ' [capped]' : ''} = ${r.xpEarned} XP`
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ─── Intake Calibration (Milestone 1B) ─────────────────────────────────────

// Step 1 of intake: generate the 12 calibration cards from the user's existing goals.
export async function generateIntakeQuestions(req: Request, res: Response) {
  try {
    const { sessionId } = req.body

    if (!sessionId) {
      return res.status(400).json(createErrorResponse('Session ID is required'))
    }

    const session = await findSessionById(sessionId)
    if (!session) {
      return res.status(401).json(createErrorResponse(ErrorMessages.INVALID_SESSION))
    }

    const user = await findUserById(session.userId)
    if (!user) {
      return res.status(404).json(createErrorResponse(ErrorMessages.USER_NOT_FOUND))
    }

    const longTermGoals = user.goalsData?.longTermGoals?.trim()
    if (!longTermGoals) {
      return res.status(400).json(createErrorResponse(
        'No goals set. Please complete goal setup before starting calibration.'
      ))
    }

    logger.custom('🎯', `Generating intake questions for user: ${user.username}`)

    const inputData = {
      long_term_goals: longTermGoals,
      category_meanings: {
        Strength: 'physical, health, discipline',
        Intelligence: 'learning, problem-solving, career development',
        Charisma: 'communication, social, confidence'
      }
    }

    const result = await azureAIService.generateCompletion(
      AIPromptType.INTAKE_QUESTION_GENERATION,
      JSON.stringify(inputData, null, 2)
    )

    if (!result.success || !result.data) {
      logger.error('Intake question generation failed:', result.error)
      return res.status(500).json(createErrorResponse(
        result.error || 'Intake question generation failed'
      ))
    }

    let parsed: { cards?: unknown[] } | null = null
    try {
      parsed = JSON.parse(result.data.content)
    } catch (parseErr) {
      const jsonMatch = result.data.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch (fallbackErr) {
          logger.error('Failed to parse intake questions JSON (fallback):', fallbackErr)
        }
      } else {
        logger.error('Failed to parse intake questions JSON:', parseErr)
      }
    }

    if (!parsed?.cards || !Array.isArray(parsed.cards)) {
      return res.status(500).json(createErrorResponse('Invalid response from question generator'))
    }

    await updateSessionLastAccess(sessionId)
    logger.success(`Generated ${parsed.cards.length} intake cards`)

    res.json(createSuccessResponse(
      'Intake questions generated',
      { cards: parsed.cards },
      undefined,
      undefined,
      undefined,
      { processingTime: result.processingTimeMs, agentUsed: 'azure-openai-foundry' }
    ))
  } catch (error) {
    logger.error('Intake question generation error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

// Step 2 of intake: extract structured signals from answers, generate the personal catalog,
// persist it, and return a summary for the user to review.
export async function submitIntake(req: Request, res: Response) {
  try {
    const { sessionId, answers } = req.body as { sessionId?: string; answers?: IntakeAnswer[] }

    if (!sessionId || !answers || !Array.isArray(answers)) {
      return res.status(400).json(createErrorResponse(
        'Session ID and answers array are required'
      ))
    }

    const session = await findSessionById(sessionId)
    if (!session) {
      return res.status(401).json(createErrorResponse(ErrorMessages.INVALID_SESSION))
    }

    const user = await findUserById(session.userId)
    if (!user) {
      return res.status(404).json(createErrorResponse(ErrorMessages.USER_NOT_FOUND))
    }

    logger.custom('🎯', `Processing intake answers for user: ${user.username} (${answers.length} answers)`)

    // Build extraction input — answers + known tags listing for AI grounding
    const seed = loadSeedCatalog()
    const extractionInput = {
      answers,
      known_tags: buildKnownTagsListing(seed)
    }

    const extractionResult = await azureAIService.generateCompletion(
      AIPromptType.INTAKE_EXTRACTION,
      JSON.stringify(extractionInput, null, 2)
    )

    if (!extractionResult.success || !extractionResult.data) {
      logger.error('Intake extraction failed:', extractionResult.error)
      return res.status(500).json(createErrorResponse(
        extractionResult.error || 'Intake extraction failed'
      ))
    }

    // Parse extraction response
    let parsed: { catalog_signals?: CatalogSignal[]; category_defaults?: CategoryDefaults; goal_tags?: string[] } | null = null
    try {
      parsed = JSON.parse(extractionResult.data.content)
    } catch (parseErr) {
      const jsonMatch = extractionResult.data.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]) } catch { /* swallow */ }
      }
      if (!parsed) {
        logger.error('Failed to parse extraction JSON:', parseErr)
      }
    }

    if (!parsed?.catalog_signals || !parsed?.category_defaults) {
      return res.status(500).json(createErrorResponse('Invalid response from extraction agent'))
    }

    // Normalise goal_tags (optional, may be missing on older prompt outputs).
    const goalTags = Array.isArray(parsed.goal_tags)
      ? Array.from(new Set(parsed.goal_tags.filter(t => typeof t === 'string' && t.length > 0)))
      : []

    // Build personal catalog (pure code, deterministic)
    const catalog = generatePersonalCatalog(
      parsed.catalog_signals,
      parsed.category_defaults,
      answers,
      seed,
      goalTags
    )

    // Persist catalog to user record
    await updateUser(user.id, { catalog })
    logger.success(`Personal catalog written for ${user.username} (${Object.keys(catalog.rows).length} rows)`)

    const summary = buildIntakeSummary(catalog, seed)
    await updateSessionLastAccess(sessionId)

    res.json(createSuccessResponse(
      'Intake submitted; catalog generated',
      { catalog, summary },
      undefined,
      undefined,
      undefined,
      { processingTime: extractionResult.processingTimeMs, agentUsed: 'azure-openai-foundry' }
    ))
  } catch (error) {
    logger.error('Intake submission error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}

// Step 3 of intake: apply user corrections from the summary review and lock in the catalog.
export async function confirmIntake(req: Request, res: Response) {
  try {
    const { sessionId, corrections } = req.body as {
      sessionId?: string
      corrections?: IntakeCorrection[]
    }

    if (!sessionId) {
      return res.status(400).json(createErrorResponse('Session ID is required'))
    }

    const session = await findSessionById(sessionId)
    if (!session) {
      return res.status(401).json(createErrorResponse(ErrorMessages.INVALID_SESSION))
    }

    const user = await findUserById(session.userId)
    if (!user) {
      return res.status(404).json(createErrorResponse(ErrorMessages.USER_NOT_FOUND))
    }

    if (!user.catalog) {
      return res.status(400).json(createErrorResponse(
        'No catalog to confirm. Submit intake first.'
      ))
    }

    const applied = corrections && corrections.length > 0
      ? applyCorrectionsToCatalog(user.catalog, corrections)
      : user.catalog

    if (corrections && corrections.length > 0) {
      await updateUser(user.id, { catalog: applied })
      logger.success(`Applied ${corrections.length} corrections to catalog for ${user.username}`)
    } else {
      logger.custom('🎯', `Intake confirmed with no corrections for ${user.username}`)
    }

    await updateSessionLastAccess(sessionId)

    res.json(createSuccessResponse(
      'Intake confirmed',
      { catalog: applied },
      undefined,
      undefined,
      undefined,
      { agentUsed: 'azure-openai-foundry' }
    ))
  } catch (error) {
    logger.error('Intake confirmation error:', error)
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_ERROR))
  }
}