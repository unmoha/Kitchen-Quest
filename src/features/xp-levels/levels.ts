import type { UserLevelInfo } from "./types";

export const XP_REWARDS = {
    CORRECT_ANSWER: 10,
    SESSION_COMPLETION: 25,
    LEARNING_COMPLETION: 25,
} as const;

/**
 * Returns the cumulative total XP required to reach a given level (Level >= 1).
 * Level 1: 0 XP
 * Level 2: 100 XP
 * Level 3: 250 XP
 * Level 4: 450 XP
 * Level 5: 700 XP
 * Level 6: 1000 XP
 * Level 7: 1350 XP
 * Level 8: 1750 XP
 * Level 9: 2200 XP
 * Level 10: 2700 XP
 * Level L (L > 10): 25 * (L - 1) * (L + 2)
 */
export function getLevelThreshold(level: number): number {
    const validLevel = Math.max(1, Math.floor(level));
    return 25 * (validLevel - 1) * (validLevel + 2);
}

/**
 * Calculates the user's level based on total earned XP.
 * Derived from solving: 25 * (L^2 + L - 2) <= totalXp
 * => L = floor((-1 + sqrt(9 + 0.16 * totalXp)) / 2)
 */
export function calculateLevel(totalXp: number): number {
    if (!Number.isFinite(totalXp) || Number.isNaN(totalXp) || totalXp <= 0) {
        return 1;
    }
    const safeXp = Math.floor(totalXp);
    const calculated = Math.floor((-1 + Math.sqrt(9 + 0.16 * safeXp)) / 2);
    return Math.max(1, calculated);
}

/**
 * Returns complete level progress information for a given XP amount.
 */
export function calculateUserLevelInfo(totalXp: number): UserLevelInfo {
    const safeTotalXp = !Number.isFinite(totalXp) || Number.isNaN(totalXp) || totalXp < 0
        ? 0
        : Math.floor(totalXp);

    const level = calculateLevel(safeTotalXp);
    const currentLevelXp = getLevelThreshold(level);
    const nextLevelXp = getLevelThreshold(level + 1);
    const xpIntoLevel = Math.max(0, safeTotalXp - currentLevelXp);
    const xpNeededForNextLevel = Math.max(1, nextLevelXp - currentLevelXp);

    const rawPercent = (xpIntoLevel / xpNeededForNextLevel) * 100;
    const progressPercent = Math.max(0, Math.min(100, Math.round(rawPercent * 100) / 100));

    return {
        level,
        totalXp: safeTotalXp,
        currentLevelXp,
        nextLevelXp,
        xpIntoLevel,
        xpNeededForNextLevel,
        progressPercent,
    };
}

/**
 * Checks whether gaining XP caused the user to cross one or more level boundaries.
 */
export function hasLeveledUp(
    previousXp: number,
    currentXp: number,
): { leveledUp: boolean; previousLevel: number; currentLevel: number } {
    const previousLevel = calculateLevel(previousXp);
    const currentLevel = calculateLevel(currentXp);
    return {
        leveledUp: currentLevel > previousLevel,
        previousLevel,
        currentLevel,
    };
}
