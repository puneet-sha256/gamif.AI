/**
 * Streak Calculation Utilities
 * Handles streak tracking, decay, and multiplier calculations for three categories
 * Streaks are calculated from activity history, not stored directly
 */

import type { ActivityHistory, DailyActivity, StreakCache } from '../shared/types/user.types'

export interface CategoryStreaks {
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
 * @returns Decayed streak value
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
  const date = new Date(dateStr)
  date.setDate(date.getDate() - 1)
  return date.toISOString().split('T')[0]
}

/**
 * Calculate streak from scratch by iterating through activity history
 * Starts from the beginning and counts consecutive days with 10+ XP
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

  // Start from the most recent activity and work backwards
  let currentDate = getPreviousDate(targetDate)
  let expectedDate = currentDate
  
  for (let i = relevantActivities.length - 1; i >= 0; i--) {
    const activity = relevantActivities[i]
    
    // Check if this activity is on the expected date
    if (activity.date === expectedDate) {
      // Increment streaks for categories with 10+ XP
      if (activity.strength >= 10) {
        streaks.strengthStreak++
      }
      if (activity.intelligence >= 10) {
        streaks.intelligenceStreak++
      }
      if (activity.charisma >= 10) {
        streaks.charismaStreak++
      }
      
      // Move to previous day
      expectedDate = getPreviousDate(expectedDate)
    } else if (activity.date < expectedDate) {
      // Gap detected - apply decay for missed days
      const daysMissed = daysBetween(activity.date, expectedDate)
      
      for (let j = 0; j < daysMissed; j++) {
        streaks.strengthStreak = applyStreakDecay(streaks.strengthStreak)
        streaks.intelligenceStreak = applyStreakDecay(streaks.intelligenceStreak)
        streaks.charismaStreak = applyStreakDecay(streaks.charismaStreak)
      }
      
      // Process this activity if it has 10+ XP
      if (activity.strength >= 10) {
        streaks.strengthStreak++
      }
      if (activity.intelligence >= 10) {
        streaks.intelligenceStreak++
      }
      if (activity.charisma >= 10) {
        streaks.charismaStreak++
      }
      
      expectedDate = getPreviousDate(activity.date)
    }
    // If activity.date > expectedDate, skip it (shouldn't happen with proper filtering)
  }

  return streaks
}

/**
 * Calculate streak incrementally from cache
 * Only processes days between cache date and target date
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

  // Get activities between cache date and target date (exclusive)
  const relevantActivities = activities.filter(
    a => a.date > cache.asOfDate && a.date < targetDate
  ).sort((a, b) => a.date.localeCompare(b.date))

  if (relevantActivities.length === 0) {
    // No activities between cache and target - apply decay for all missed days
    const daysMissed = daysBetween(cache.asOfDate, getPreviousDate(targetDate))
    
    for (let i = 0; i < daysMissed; i++) {
      streaks.strengthStreak = applyStreakDecay(streaks.strengthStreak)
      streaks.intelligenceStreak = applyStreakDecay(streaks.intelligenceStreak)
      streaks.charismaStreak = applyStreakDecay(streaks.charismaStreak)
    }
    
    return streaks
  }

  // Process each day from cache date to target date
  let expectedDate = getPreviousDate(targetDate)
  
  for (let i = relevantActivities.length - 1; i >= 0; i--) {
    const activity = relevantActivities[i]
    
    if (activity.date === expectedDate) {
      // Activity on expected date
      if (activity.strength >= 10) {
        streaks.strengthStreak++
      }
      if (activity.intelligence >= 10) {
        streaks.intelligenceStreak++
      }
      if (activity.charisma >= 10) {
        streaks.charismaStreak++
      }
      
      expectedDate = getPreviousDate(expectedDate)
    } else if (activity.date < expectedDate) {
      // Gap detected
      const daysMissed = daysBetween(activity.date, expectedDate)
      
      for (let j = 0; j < daysMissed; j++) {
        streaks.strengthStreak = applyStreakDecay(streaks.strengthStreak)
        streaks.intelligenceStreak = applyStreakDecay(streaks.intelligenceStreak)
        streaks.charismaStreak = applyStreakDecay(streaks.charismaStreak)
      }
      
      if (activity.strength >= 10) {
        streaks.strengthStreak++
      }
      if (activity.intelligence >= 10) {
        streaks.intelligenceStreak++
      }
      if (activity.charisma >= 10) {
        streaks.charismaStreak++
      }
      
      expectedDate = getPreviousDate(activity.date)
    }
  }
  
  // Handle any remaining gap between earliest activity and cache date
  if (expectedDate > cache.asOfDate) {
    const daysMissed = daysBetween(cache.asOfDate, expectedDate)
    
    for (let i = 0; i < daysMissed; i++) {
      streaks.strengthStreak = applyStreakDecay(streaks.strengthStreak)
      streaks.intelligenceStreak = applyStreakDecay(streaks.intelligenceStreak)
      streaks.charismaStreak = applyStreakDecay(streaks.charismaStreak)
    }
  }

  return streaks
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
  // Calculate streaks up to and including this activity date
  const streaks = calculateStreaksFromHistory(activityHistory, getPreviousDate(activityDate))
  
  // Find the activity for this date to check if streaks should increment
  const activity = activityHistory.dailyActivities.find(a => a.date === activityDate)
  
  const updatedStreaks = { ...streaks }
  
  if (activity) {
    // Increment streaks for categories with 10+ XP
    if (activity.strength >= 10) {
      updatedStreaks.strengthStreak++
    }
    if (activity.intelligence >= 10) {
      updatedStreaks.intelligenceStreak++
    }
    if (activity.charisma >= 10) {
      updatedStreaks.charismaStreak++
    }
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
