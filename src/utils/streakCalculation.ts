/**
 * Streak Calculation Utilities
 * Handles streak tracking, decay, and multiplier calculations for three categories
 * Streaks are calculated from activity history, not stored directly
 */

import type { ActivityHistory, DailyActivity, StreakCache } from '../shared/types/user.types'

/**
 * Multiplier streaks - used for calculating reward bonuses
 * Requires 10+ XP per day, uses soft decay on missed days
 */
export interface CategoryStreaks {
  strengthStreak: number
  intelligenceStreak: number
  charismaStreak: number
}

/**
 * Display streaks - shown on dashboard
 * Counts consecutive days with any XP (1+), breaks on missed day
 */
export interface DisplayStreaks {
  strengthStreak: number
  intelligenceStreak: number
  charismaStreak: number
}

export interface StreakMultipliers {
  strengthMultiplier: number
  intelligenceMultiplier: number
  charismaMultiplier: number
}

/**
 * Calculate multiplier for a given streak value
 * Formula: 1 + (streak ** 0.6) * 0.05
 * Gives fast early growth and slower long-term growth
 * 
 * @param streak - Current streak value
 * @returns Multiplier value (minimum 1.0)
 */
export function calculateStreakMultiplier(streak: number): number {
  if (streak <= 0) {
    return 1.0
  }
  return 1 + Math.pow(streak, 0.6) * 0.05
}

/**
 * Apply soft decay to a streak value
 * Formula: floor(oldStreak * 0.65)
 * 
 * @param streak - Current streak value
 * @returns Decayed streak value (floored to integer)
 */
export function applyStreakDecay(streak: number): number {
  if (streak <= 0) {
    return 0
  }
  return Math.floor(streak * 0.65)
}

/**
 * Calculate days between two dates
 * 
 * @param date1 - First date (ISO string YYYY-MM-DD)
 * @param date2 - Second date (ISO string YYYY-MM-DD)
 * @returns Number of days between dates
 */
export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Get the date for yesterday relative to a given date
 * 
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @returns ISO date string for the previous day
 */
export function getPreviousDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00.000Z')
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().split('T')[0]
}

/**
 * Calculate display streaks (consecutive days with ANY XP)
 * Pure consecutive day count, breaks on missed day
 * Used for dashboard display to show user engagement
 * Each category tracks independently - gaps only affect that specific category
 * 
 * @param activities - Array of daily activities
 * @param targetDate - Date to calculate streak up to (not including)
 * @returns Display streaks (consecutive days with 1+ XP)
 */
export function calculateDisplayStreaks(
  activities: DailyActivity[],
  targetDate: string
): DisplayStreaks {
  const streaks: DisplayStreaks = {
    strengthStreak: 0,
    intelligenceStreak: 0,
    charismaStreak: 0
  }

  if (activities.length === 0) {
    return streaks
  }

  // Create a map for quick date lookup
  const activityMap = new Map<string, DailyActivity>()
  activities.forEach(a => activityMap.set(a.date, a))
  
  // Track which categories are still active (haven't broken yet)
  const categoryActive = {
    strength: true,
    intelligence: true,
    charisma: true
  }
  
  // Start from yesterday and work backwards
  let currentDate = getPreviousDate(targetDate)
  
  // Count consecutive days - each category independently
  let iterationCount = 0
  const maxIterations = 365 // Safety limit
  
  while (iterationCount < maxIterations) {
    iterationCount++
    
    // If all categories have broken, we can stop
    if (!categoryActive.strength && !categoryActive.intelligence && !categoryActive.charisma) {
      break
    }
    
    const activity = activityMap.get(currentDate)
    
    if (!activity) {
      // No activity for this date - all remaining active streaks end
      break
    }
    
    // Count day if category has ANY XP (1+) and is still active
    if (categoryActive.strength) {
      if (activity.strength > 0) {
        streaks.strengthStreak++
      } else {
        categoryActive.strength = false // This category's streak ends
      }
    }
    
    if (categoryActive.intelligence) {
      if (activity.intelligence > 0) {
        streaks.intelligenceStreak++
      } else {
        categoryActive.intelligence = false
      }
    }
    
    if (categoryActive.charisma) {
      if (activity.charisma > 0) {
        streaks.charismaStreak++
      } else {
        categoryActive.charisma = false
      }
    }
    
    // Move to previous day
    currentDate = getPreviousDate(currentDate)
  }

  return streaks
}

/**
 * Calculate streak from scratch by iterating through activity history
 * Works FORWARD through time, applying increments for qualifying days and decay for missing/failing days
 * 
 * @param activities - Sorted array of daily activities (oldest to newest)
 * @param targetDate - Date to calculate streak up to (not including)
 * @returns Category streaks as of the day before targetDate
 */
function calculateStreakFromScratch(
  activities: DailyActivity[],
  targetDate: string
): CategoryStreaks {
  const streaks: CategoryStreaks = {
    strengthStreak: 0,
    intelligenceStreak: 0,
    charismaStreak: 0
  }

  if (activities.length === 0) {
    return streaks
  }

  // Sort activities by date (oldest first)
  const sortedActivities = [...activities].sort((a, b) => a.date.localeCompare(b.date))
  
  // Only process activities before targetDate
  const relevantActivities = sortedActivities.filter(a => a.date < targetDate)
  
  if (relevantActivities.length === 0) {
    return streaks
  }

  // Process forward through time
  let lastProcessedDate: string | null = null
  
  for (const activity of relevantActivities) {
    // Check for gaps (missed days between last activity and this one)
    if (lastProcessedDate) {
      const daysSince = daysBetween(lastProcessedDate, activity.date)
      
      // Apply decay for each missed day
      for (let i = 1; i < daysSince; i++) {
        streaks.strengthStreak = applyStreakDecay(streaks.strengthStreak)
        streaks.intelligenceStreak = applyStreakDecay(streaks.intelligenceStreak)
        streaks.charismaStreak = applyStreakDecay(streaks.charismaStreak)
      }
    }
    
    // Process this day's activity
    if (activity.strength >= 10) {
      streaks.strengthStreak += 1
    } else {
      streaks.strengthStreak = applyStreakDecay(streaks.strengthStreak)
    }
    
    if (activity.intelligence >= 10) {
      streaks.intelligenceStreak += 1
    } else {
      streaks.intelligenceStreak = applyStreakDecay(streaks.intelligenceStreak)
    }
    
    if (activity.charisma >= 10) {
      streaks.charismaStreak += 1
    } else {
      streaks.charismaStreak = applyStreakDecay(streaks.charismaStreak)
    }
    
    lastProcessedDate = activity.date
  }

  return streaks
}

/**
 * Calculate streak incrementally from cache
 * Uses cached values and only processes days after cache date
 * Each category's streak continues independently based on consecutive days
 * 
 * @param cache - Cached streak data
 * @param activities - Array of daily activities
 * @param targetDate - Date to calculate streak up to (not including)
 * @returns Updated category streaks
 */
function calculateIncrementalStreak(
  cache: StreakCache,
  activities: DailyActivity[],
  targetDate: string
): CategoryStreaks {
  const streaks: CategoryStreaks = {
    strengthStreak: cache.strengthStreak,
    intelligenceStreak: cache.intelligenceStreak,
    charismaStreak: cache.charismaStreak
  }

  // Create a map for quick date lookup
  const activityMap = new Map<string, DailyActivity>()
  activities.forEach(a => activityMap.set(a.date, a))
  
  // Start from the day after cache date and go forward to yesterday
  let currentDate = cache.asOfDate
  const yesterday = getPreviousDate(targetDate)
  
  // Process each day from cache date to yesterday
  while (currentDate < yesterday) {
    currentDate = getNextDate(currentDate)
    const activity = activityMap.get(currentDate)
    
    if (!activity) {
      // No activity for this date - apply decay
      streaks.strengthStreak = applyStreakDecay(streaks.strengthStreak)
      streaks.intelligenceStreak = applyStreakDecay(streaks.intelligenceStreak)
      streaks.charismaStreak = applyStreakDecay(streaks.charismaStreak)
    } else {
      // Check each category independently
      if (activity.strength >= 10) {
        streaks.strengthStreak += 1
      } else {
        streaks.strengthStreak = applyStreakDecay(streaks.strengthStreak)
      }
      
      if (activity.intelligence >= 10) {
        streaks.intelligenceStreak += 1
      } else {
        streaks.intelligenceStreak = applyStreakDecay(streaks.intelligenceStreak)
      }
      
      if (activity.charisma >= 10) {
        streaks.charismaStreak += 1
      } else {
        streaks.charismaStreak = applyStreakDecay(streaks.charismaStreak)
      }
    }
  }

  return streaks
}

/**
 * Get the date for tomorrow relative to a given date
 * 
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @returns ISO date string for the next day
 */
function getNextDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00.000Z')
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().split('T')[0]
}

/**
 * Calculate current streaks from activity history with caching
 * Returns streak as of the day BEFORE targetDate (for use as multiplier)
 * 
 * @param activityHistory - User's activity history with cache
 * @param targetDate - Date to calculate streak for (ISO string YYYY-MM-DD)
 * @returns Category streaks as of yesterday (for today's multiplier)
 */
export function calculateStreaksFromHistory(
  activityHistory: ActivityHistory | undefined,
  targetDate: string
): CategoryStreaks {
  // No history = no streak
  if (!activityHistory || activityHistory.dailyActivities.length === 0) {
    return {
      strengthStreak: 0,
      intelligenceStreak: 0,
      charismaStreak: 0
    }
  }

  const cache = activityHistory.streakCache
  
  // No cache - calculate from scratch
  if (!cache) {
    return calculateStreakFromScratch(activityHistory.dailyActivities, targetDate)
  }

  // Cache is for target date or later - use cached values directly
  const cacheDate = cache.asOfDate
  if (cacheDate >= getPreviousDate(targetDate)) {
    return {
      strengthStreak: cache.strengthStreak,
      intelligenceStreak: cache.intelligenceStreak,
      charismaStreak: cache.charismaStreak
    }
  }

  // Calculate incrementally from cache
  return calculateIncrementalStreak(
    cache,
    activityHistory.dailyActivities,
    targetDate
  )
}

/**
 * Create updated streak cache after processing activity for a date
 * This should be called AFTER the activity is saved to history
 * 
 * @param activityHistory - User's activity history
 * @param activityDate - Date of the activity that was just processed
 * @returns Updated streak cache
 */
export function updateStreakCache(
  activityHistory: ActivityHistory,
  activityDate: string
): StreakCache {
  // Calculate streaks up to (but not including) this activity date
  // This gives us the streak as of yesterday
  const streaks = calculateStreaksFromHistory(activityHistory, activityDate)
  
  // Find the activity for this date to check if streaks should increment or decay
  const activity = activityHistory.dailyActivities.find(a => a.date === activityDate)
  
  const updatedStreaks = { ...streaks }
  
  if (activity) {
    // Increment streaks for categories with 10+ XP, apply decay for < 10 XP
    if (activity.strength >= 10) {
      updatedStreaks.strengthStreak += 1
    } else {
      updatedStreaks.strengthStreak = applyStreakDecay(updatedStreaks.strengthStreak)
    }
    
    if (activity.intelligence >= 10) {
      updatedStreaks.intelligenceStreak += 1
    } else {
      updatedStreaks.intelligenceStreak = applyStreakDecay(updatedStreaks.intelligenceStreak)
    }
    
    if (activity.charisma >= 10) {
      updatedStreaks.charismaStreak += 1
    } else {
      updatedStreaks.charismaStreak = applyStreakDecay(updatedStreaks.charismaStreak)
    }
  } else {
    // No activity found (edge case) - apply decay to all categories
    updatedStreaks.strengthStreak = applyStreakDecay(updatedStreaks.strengthStreak)
    updatedStreaks.intelligenceStreak = applyStreakDecay(updatedStreaks.intelligenceStreak)
    updatedStreaks.charismaStreak = applyStreakDecay(updatedStreaks.charismaStreak)
  }
  
  return {
    asOfDate: activityDate,
    strengthStreak: updatedStreaks.strengthStreak,
    intelligenceStreak: updatedStreaks.intelligenceStreak,
    charismaStreak: updatedStreaks.charismaStreak
  }
}

/**
 * Get current multipliers for all categories based on their streaks
 * 
 * @param streaks - Current streak state
 * @returns Multipliers for each category
 */
export function getStreakMultipliers(streaks: CategoryStreaks): StreakMultipliers {
  return {
    strengthMultiplier: calculateStreakMultiplier(streaks.strengthStreak),
    intelligenceMultiplier: calculateStreakMultiplier(streaks.intelligenceStreak),
    charismaMultiplier: calculateStreakMultiplier(streaks.charismaStreak)
  }
}

/**
 * Apply streak multiplier to shards earned for a specific category
 * 
 * @param baseShards - Base shards earned
 * @param multiplier - Streak multiplier
 * @returns Multiplied shards value (rounded to 2 decimal places)
 */
export function applyStreakMultiplierToShards(baseShards: number, multiplier: number): number {
  return Number((baseShards * multiplier).toFixed(2))
}

/**
 * Format multiplier for display (e.g., "1.25x")
 * 
 * @param multiplier - Multiplier value
 * @returns Formatted string
 */
export function formatMultiplier(multiplier: number): string {
  return `${multiplier.toFixed(2)}x`
}
