import type { ActivityMatch } from '../../shared/types/api.types'
import type { GeneratedTask } from '../../shared/types/user.types'
import { logger } from '../../utils/logger'

/**
 * Reward breakdown for a single activity
 */
export interface ActivityReward {
  activityName: string
  matchType: string
  category: string
  matchedTask?: string
  goalLink?: string
  effortRatio: number
  xpEarned: number
  shardsEarned: number
  calculationNotes: string
}

/**
 * Skipped activity details
 */
export interface SkippedActivity {
  activityName: string
  category: string
  reason: string
  notes: string
}

/**
 * Category-wise reward breakdown
 */
export interface CategoryRewards {
  xp: number
  shards: number
}

/**
 * Complete reward calculation result
 */
export interface RewardCalculationResult {
  totalXP: number
  totalShards: number
  categoryBreakdown: {
    Strength: CategoryRewards
    Intelligence: CategoryRewards
    Charisma: CategoryRewards
  }
  activityRewards: ActivityReward[]
  skippedActivities: SkippedActivity[]
  processedCount: number
  skippedCount: number
}

/**
 * Helper type for flattened tasks with category info
 */
interface TaskWithCategory extends GeneratedTask {
  category: 'Strength' | 'Intelligence' | 'Charisma'
}

/**
 * Calculate average XP and shards for tasks in a specific category
 */
function calculateCategoryAverage(
  tasks: TaskWithCategory[],
  category: 'Strength' | 'Intelligence' | 'Charisma'
): { avgXP: number; avgShards: number } {
  const categoryTasks = tasks.filter(task => task.category === category)
  
  if (categoryTasks.length === 0) {
    return { avgXP: 0, avgShards: 0 }
  }

  const totalXP = categoryTasks.reduce((sum, task) => sum + task.xp, 0)
  const totalShards = categoryTasks.reduce((sum, task) => sum + task.shards, 0)

  return {
    avgXP: totalXP / categoryTasks.length,
    avgShards: totalShards / categoryTasks.length
  }
}

/**
 * Find a task by matching its title or description
 */
function findMatchingTask(
  taskName: string,
  tasks: TaskWithCategory[]
): TaskWithCategory | undefined {
  return tasks.find(task => {
    const title = task.title?.toLowerCase() || ''
    const description = task.description.toLowerCase()
    const searchName = taskName.toLowerCase()
    
    return title.includes(searchName) || 
           description.includes(searchName) ||
           searchName.includes(title) ||
           searchName.includes(description)
  })
}

/**
 * Calculate XP and shards rewards from activity analysis
 * 
 * @param matches - Activity matches from AI analysis
 * @param userTasks - User's current tasks organized by category
 * @returns Detailed reward calculation result
 */
export function calculateRewardsFromAnalysis(
  matches: ActivityMatch[],
  userTasks?: {
    Strength?: Array<{ 
      id: string; 
      title?: string;
      description: string; 
      category: string;
      xp: number; 
      shards: number 
    }>;
    Intelligence?: Array<{ 
      id: string; 
      title?: string;
      description: string; 
      category: string;
      xp: number; 
      shards: number 
    }>;
    Charisma?: Array<{ 
      id: string; 
      title?: string;
      description: string; 
      category: string;
      xp: number; 
      shards: number 
    }>;
  }
): RewardCalculationResult {
  // Initialize result structure
  const result: RewardCalculationResult = {
    totalXP: 0,
    totalShards: 0,
    categoryBreakdown: {
      Strength: { xp: 0, shards: 0 },
      Intelligence: { xp: 0, shards: 0 },
      Charisma: { xp: 0, shards: 0 }
    },
    activityRewards: [],
    skippedActivities: [],
    processedCount: 0,
    skippedCount: 0
  }

  // If no tasks provided, skip all activities
  if (!userTasks) {
    logger.warn('No user tasks provided for reward calculation')
    matches.forEach(match => {
      result.skippedActivities.push({
        activityName: match.name,
        category: match.category,
        reason: 'No tasks available for comparison',
        notes: match.notes
      })
      result.skippedCount++
    })
    return result
  }

  // Flatten tasks into a single array with category info
  const allTasks: TaskWithCategory[] = [
    ...(userTasks.Strength?.map(t => ({ ...t, category: 'Strength' as const })) || []),
    ...(userTasks.Intelligence?.map(t => ({ ...t, category: 'Intelligence' as const })) || []),
    ...(userTasks.Charisma?.map(t => ({ ...t, category: 'Charisma' as const })) || [])
  ]

  logger.custom('💰', 'Starting reward calculation...')
  logger.info(`Total tasks available: ${allTasks.length}`)
  logger.info(`Activities to process: ${matches.length}`)

  // Process each activity match
  matches.forEach((match, index) => {
    logger.info(`[${index + 1}/${matches.length}] Processing: ${match.name}`)
    
    // Skip unrelated activities
    if (match.match_type === 'unrelated') {
      logger.custom('⏭️', 'Skipping (unrelated)')
      result.skippedActivities.push({
        activityName: match.name,
        category: match.category,
        reason: 'Unrelated to goals and tasks',
        notes: match.notes
      })
      result.skippedCount++
      return
    }

    let xpEarned = 0
    let shardsEarned = 0
    let calculationNotes = ''
    const category = match.category as 'Strength' | 'Intelligence' | 'Charisma'

    // Handle different match types
    switch (match.match_type) {
      case 'exact': {
        // Find the exact matching task
        const matchedTask = findMatchingTask(match.matched_task || match.name, allTasks)
        
        if (matchedTask) {
          xpEarned = matchedTask.xp * match.effort_ratio
          shardsEarned = matchedTask.shards * match.effort_ratio
          calculationNotes = `Exact match: ${matchedTask.xp} XP × ${match.effort_ratio} effort = ${xpEarned.toFixed(1)} XP`
          logger.success(`Exact match found: ${matchedTask.title || matchedTask.description}`)
        } else {
          logger.warn('Exact match task not found, treating as goal-aligned')
          // Fallback to category average
          const avg = calculateCategoryAverage(allTasks, category)
          xpEarned = avg.avgXP * match.effort_ratio
          shardsEarned = avg.avgShards * match.effort_ratio
          calculationNotes = `Task not found, using category average: ${avg.avgXP.toFixed(1)} XP × ${match.effort_ratio} effort = ${xpEarned.toFixed(1)} XP`
        }
        break
      }

      case 'similar': {
        // Find the similar task
        const matchedTask = findMatchingTask(match.matched_task || match.name, allTasks)
        
        if (matchedTask) {
          xpEarned = matchedTask.xp * 0.8 * match.effort_ratio
          shardsEarned = matchedTask.shards * 0.8 * match.effort_ratio
          calculationNotes = `Similar match (80%): ${matchedTask.xp} XP × 0.8 × ${match.effort_ratio} effort = ${xpEarned.toFixed(1)} XP`
          logger.custom('🔄', `Similar task found: ${matchedTask.title || matchedTask.description}`)
        } else {
          logger.warn('Similar match task not found, treating as goal-aligned')
          // Fallback to category average
          const avg = calculateCategoryAverage(allTasks, category)
          xpEarned = avg.avgXP * match.effort_ratio
          shardsEarned = avg.avgShards * match.effort_ratio
          calculationNotes = `Task not found, using category average: ${avg.avgXP.toFixed(1)} XP × ${match.effort_ratio} effort = ${xpEarned.toFixed(1)} XP`
        }
        break
      }

      case 'goal-aligned': {
        // Use category average for goal-aligned activities
        const avg = calculateCategoryAverage(allTasks, category)
        xpEarned = avg.avgXP * match.effort_ratio
        shardsEarned = avg.avgShards * match.effort_ratio
        calculationNotes = `Goal-aligned (category avg): ${avg.avgXP.toFixed(1)} XP × ${match.effort_ratio} effort = ${xpEarned.toFixed(1)} XP`
        logger.custom('🎯', `Using ${category} category average`)
        break
      }
    }

    // Round XP to floor value, shards to reasonable precision
    xpEarned = Math.floor(xpEarned)
    shardsEarned = Math.round(shardsEarned * 10) / 10

    logger.custom('💰', `Earned: ${xpEarned} XP, ${shardsEarned} shards`)

    // Add to totals
    result.totalXP += xpEarned
    result.totalShards += shardsEarned
    result.categoryBreakdown[category].xp += xpEarned
    result.categoryBreakdown[category].shards += shardsEarned

    // Add to activity rewards list
    result.activityRewards.push({
      activityName: match.name,
      matchType: match.match_type,
      category: match.category,
      matchedTask: match.matched_task || undefined,
      goalLink: match.goal_link || undefined,
      effortRatio: match.effort_ratio,
      xpEarned,
      shardsEarned,
      calculationNotes
    })

    result.processedCount++
  })

  // Round final totals - XP to floor, shards to one decimal
  result.totalXP = Math.floor(result.totalXP)
  result.totalShards = Math.round(result.totalShards * 10) / 10

  logger.custom('💰', '='.repeat(80))
  logger.custom('💰', 'REWARD CALCULATION SUMMARY')
  logger.custom('💰', '='.repeat(80))
  logger.success(`Processed: ${result.processedCount} activities`)
  logger.custom('⏭️', `Skipped: ${result.skippedCount} activities`)
  logger.custom('🎁', `Total XP: ${result.totalXP}`)
  logger.custom('💎', `Total Shards: ${result.totalShards}`)
  logger.info('Category Breakdown:')
  logger.custom('💪', `Strength: ${result.categoryBreakdown.Strength.xp} XP, ${result.categoryBreakdown.Strength.shards} shards`)
  logger.custom('🧠', `Intelligence: ${result.categoryBreakdown.Intelligence.xp} XP, ${result.categoryBreakdown.Intelligence.shards} shards`)
  logger.custom('✨', `Charisma: ${result.categoryBreakdown.Charisma.xp} XP, ${result.categoryBreakdown.Charisma.shards} shards`)
  logger.custom('💰', '='.repeat(80))

  return result
}
