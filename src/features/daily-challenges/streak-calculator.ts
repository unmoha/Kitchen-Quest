export interface StreakCalculationResult {
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string;
    isIncremented: boolean;
}

/**
 * Returns today's date in YYYY-MM-DD UTC format.
 */
export function getUtcDateString(date: Date = new Date()): string {
    return date.toISOString().substring(0, 10);
}

/**
 * Parses YYYY-MM-DD to a UTC timestamp in ms (midnight).
 */
export function parseDateStringToUtcMidnight(dateStr: string): number {
    const [year, month, day] = dateStr.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
}

/**
 * Calculates day difference between two YYYY-MM-DD dates (d2 - d1 in whole calendar days).
 */
export function getDaysDifference(d1: string, d2: string): number {
    const ms1 = parseDateStringToUtcMidnight(d1);
    const ms2 = parseDateStringToUtcMidnight(d2);
    const dayMs = 24 * 60 * 60 * 1000;
    return Math.round((ms2 - ms1) / dayMs);
}

/**
 * Pure calculation for updating a user's streak based on the activity date.
 */
export function calculateNextStreak(
    existingCurrentStreak: number,
    existingLongestStreak: number,
    lastActivityDate: string | null,
    activityDate: string,
): StreakCalculationResult {
    if (!lastActivityDate) {
        // First activity ever
        return {
            currentStreak: 1,
            longestStreak: Math.max(1, existingLongestStreak),
            lastActivityDate: activityDate,
            isIncremented: true,
        };
    }

    const diff = getDaysDifference(lastActivityDate, activityDate);

    if (diff === 0) {
        // Same day: idempotent, no increment
        return {
            currentStreak: existingCurrentStreak,
            longestStreak: existingLongestStreak,
            lastActivityDate,
            isIncremented: false,
        };
    }

    if (diff === 1) {
        // Consecutive calendar day
        const nextCurrent = existingCurrentStreak + 1;
        const nextLongest = Math.max(existingLongestStreak, nextCurrent);
        return {
            currentStreak: nextCurrent,
            longestStreak: nextLongest,
            lastActivityDate: activityDate,
            isIncremented: true,
        };
    }

    if (diff > 1) {
        // Streak broken
        const nextCurrent = 1;
        const nextLongest = Math.max(existingLongestStreak, 1);
        return {
            currentStreak: nextCurrent,
            longestStreak: nextLongest,
            lastActivityDate: activityDate,
            isIncremented: true,
        };
    }

    // Past date submitted older than lastActivityDate (should not downgrade existing streak)
    return {
        currentStreak: existingCurrentStreak,
        longestStreak: existingLongestStreak,
        lastActivityDate,
        isIncremented: false,
    };
}

/**
 * Determines whether the user has already completed a qualifying activity today.
 */
export function isStreakActiveToday(lastActivityDate: string | null, todayDate: string = getUtcDateString()): boolean {
    if (!lastActivityDate) return false;
    return lastActivityDate === todayDate;
}
