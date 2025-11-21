/**
 * Level Calculation Utilities
 * Provides functions to calculate user level from experience points
 * and detect level-up events
 */

/**
 * Calculate the XP required for a specific level
 * Formula: 100 + Math.floor((n - 1) / 10) * 50
 */
export function getXpForLevel(level: number): number {
  return 100 + Math.floor((level - 1) / 10) * 50
}

/**
 * Calculate the actual level from total experience
 */
export function calculateLevelFromXp(totalExp: number): number {
  let level = 1
  let expUsed = 0
  
  while (true) {
    const expNeededForNextLevel = getXpForLevel(level)
    if (expUsed + expNeededForNextLevel > totalExp) {
      break
    }
    expUsed += expNeededForNextLevel
    level++
  }
  
  return level
}

/**
 * Detect if a level-up occurred between old and new XP values
 * Returns the new level if a level-up occurred, null otherwise
 */
export function detectLevelUp(oldXp: number, newXp: number): number | null {
  const oldLevel = calculateLevelFromXp(oldXp)
  const newLevel = calculateLevelFromXp(newXp)
  
  if (newLevel > oldLevel) {
    return newLevel
  }
  
  return null
}

/**
 * Calculate level progress information
 */
export function calculateLevelProgress(experience: number) {
  const actualLevel = calculateLevelFromXp(experience)
  
  // Calculate total XP needed up to the start of actual level
  let totalExpForCurrentLevel = 0
  for (let i = 1; i < actualLevel; i++) {
    totalExpForCurrentLevel += getXpForLevel(i)
  }
  
  const expNeededForNextLevel = getXpForLevel(actualLevel)
  
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
