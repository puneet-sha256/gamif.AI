/**
 * Level calculation utilities
 * Shared between frontend and backend for consistent level calculation
 */

/**
 * Maximum level cap to prevent infinite loops and performance issues
 */
const MAX_LEVEL = 10000

/**
 * Calculate XP required for a specific level
 * Formula: xp_for_level(n) = 100 + Math.floor((n - 1) / 10) * 50
 * 
 * @param level - The level number (must be >= 1)
 * @returns The amount of XP required to reach the next level
 */
export function xpForLevel(level: number): number {
  if (level < 1) {
    throw new Error('Level must be at least 1')
  }
  return 100 + Math.floor((level - 1) / 10) * 50
}

/**
 * Calculate the actual level based on total experience
 * 
 * @param totalExp - Total experience points (must be >= 0)
 * @returns The current level (minimum 1, maximum MAX_LEVEL)
 * @throws Error if totalExp is negative
 */
export function calculateActualLevel(totalExp: number): number {
  if (totalExp < 0) {
    throw new Error('Total experience cannot be negative')
  }
  
  let level = 1
  let expUsed = 0
  
  while (level < MAX_LEVEL) {
    const expNeededForNextLevel = xpForLevel(level)
    if (expUsed + expNeededForNextLevel > totalExp) {
      break
    }
    expUsed += expNeededForNextLevel
    level++
  }
  
  return level
}

/**
 * Calculate level progress details
 * @param experience - Total experience points
 * @returns Object containing current level, XP in current level, XP needed for next level, and percentage
 */
export function calculateLevelProgress(experience: number) {
  const actualLevel = calculateActualLevel(experience)
  
  // Calculate total XP needed up to the start of actual level
  let totalExpForCurrentLevel = 0
  for (let i = 1; i < actualLevel; i++) {
    totalExpForCurrentLevel += xpForLevel(i)
  }
  
  const expNeededForNextLevel = xpForLevel(actualLevel)
  
  // Calculate progress within current level
  const expInCurrentLevel = Math.max(0, experience - totalExpForCurrentLevel)
  const progressPercentage = Math.min((expInCurrentLevel / expNeededForNextLevel) * 100, 100)
  
  return {
    current: expInCurrentLevel,
    needed: expNeededForNextLevel,
    percentage: progressPercentage,
    actualLevel: actualLevel
  }
}
