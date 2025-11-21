"use strict";
/**
 * Level Calculation Utilities
 * Provides functions to calculate user level from experience points
 * and detect level-up events
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getXpForLevel = getXpForLevel;
exports.calculateLevelFromXp = calculateLevelFromXp;
exports.detectLevelUp = detectLevelUp;
exports.calculateLevelProgress = calculateLevelProgress;
/**
 * Calculate the XP required for a specific level
 * Formula: 100 + Math.floor((n - 1) / 10) * 50
 */
function getXpForLevel(level) {
    return 100 + Math.floor((level - 1) / 10) * 50;
}
/**
 * Calculate the actual level from total experience
 */
function calculateLevelFromXp(totalExp) {
    let level = 1;
    let expUsed = 0;
    while (true) {
        const expNeededForNextLevel = getXpForLevel(level);
        if (expUsed + expNeededForNextLevel > totalExp) {
            break;
        }
        expUsed += expNeededForNextLevel;
        level++;
    }
    return level;
}
/**
 * Detect if a level-up occurred between old and new XP values
 * Returns the new level if a level-up occurred, null otherwise
 */
function detectLevelUp(oldXp, newXp) {
    const oldLevel = calculateLevelFromXp(oldXp);
    const newLevel = calculateLevelFromXp(newXp);
    if (newLevel > oldLevel) {
        return newLevel;
    }
    return null;
}
/**
 * Calculate level progress information
 */
function calculateLevelProgress(experience) {
    const actualLevel = calculateLevelFromXp(experience);
    // Calculate total XP needed up to the start of actual level
    let totalExpForCurrentLevel = 0;
    for (let i = 1; i < actualLevel; i++) {
        totalExpForCurrentLevel += getXpForLevel(i);
    }
    const expNeededForNextLevel = getXpForLevel(actualLevel);
    // Calculate progress within current level
    const expInCurrentLevel = Math.max(0, experience - totalExpForCurrentLevel);
    const progressPercentage = Math.min((expInCurrentLevel / expNeededForNextLevel) * 100, 100);
    return {
        current: expInCurrentLevel,
        needed: expNeededForNextLevel,
        percentage: progressPercentage,
        actualLevel: actualLevel
    };
}
//# sourceMappingURL=levelCalculation.js.map