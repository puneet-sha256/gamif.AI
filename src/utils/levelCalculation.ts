/**
 * Level calculation utilities
 * Shared between frontend and backend for consistent level calculation
 */

/**
 * Calculate XP required for a specific level
 * Formula: xp_for_level(n) = 100 + Math.floor((n - 1) / 10) * 50
 */
export function xpForLevel(level: number): number {
  return 100 + Math.floor((level - 1) / 10) * 50
}

/**
 * Calculate the actual level based on total experience
 * @param totalExp - Total experience points
 * @returns The current level
 */
export function calculateActualLevel(totalExp: number): number {
  let level = 1
  let expUsed = 0
  
  while (true) {
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
