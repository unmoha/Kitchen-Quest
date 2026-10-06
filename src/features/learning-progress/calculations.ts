import type { LearningProgressStatus } from "./types";

export const MODULE_COMPLETION_THRESHOLD_PERCENT = 70;

export function clampMasteryScore(score: number): number {
    if (!Number.isFinite(score) || Number.isNaN(score)) {
        return 0;
    }
    return Math.max(0, Math.min(100, Math.round(score)));
}

export function determineProgressStatus(
    completedAt: string | null | undefined,
    lastAttemptedAt: string | null | undefined,
    masteryScore: number,
): LearningProgressStatus {
    if (completedAt) {
        return "completed";
    }
    if (lastAttemptedAt || masteryScore > 0) {
        return "in_progress";
    }
    return "not_started";
}

export function calculateModuleSessionMastery(correctCount: number, totalCount: number): number {
    if (totalCount <= 0) {
        return 0;
    }
    const rawRatio = correctCount / totalCount;
    return clampMasteryScore(rawRatio * 100);
}

export function calculateRecipeSessionMastery(isCorrect: boolean): number {
    return isCorrect ? 100 : 0;
}

export function calculateUpdatedMasteryScore(
    previousMastery: number | null | undefined,
    sessionScore: number,
): number {
    const validPrevious = clampMasteryScore(previousMastery ?? 0);
    const validSession = clampMasteryScore(sessionScore);
    // Replaying a game improves or maintains mastery, bounded between 0 and 100.
    return clampMasteryScore(Math.max(validPrevious, validSession));
}

export function isModuleCompleted(
    masteryScore: number,
    wasPreviouslyCompleted: boolean,
): boolean {
    if (wasPreviouslyCompleted) {
        return true;
    }
    return masteryScore >= MODULE_COMPLETION_THRESHOLD_PERCENT;
}

export function isRecipeCompleted(
    isCorrect: boolean,
    wasPreviouslyCompleted: boolean,
): boolean {
    if (wasPreviouslyCompleted) {
        return true;
    }
    return isCorrect;
}
