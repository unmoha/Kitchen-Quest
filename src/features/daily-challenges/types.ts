import type { DailyChallengeType, ContentStatus, Database } from "@/types/database";

export type DailyChallengeRow = Database["public"]["Tables"]["daily_challenges"]["Row"];
export type UserDailyChallengeRow = Database["public"]["Tables"]["user_daily_challenges"]["Row"];
export type UserStreakRow = Database["public"]["Tables"]["user_streaks"]["Row"];

export interface DailyChallengeItem {
    id: string;
    challengeDate: string;
    title: string;
    slug: string;
    description: string;
    challengeType: DailyChallengeType;
    recipeId: string | null;
    learningModuleId: string | null;
    ingredientId: string | null;
    status: ContentStatus;
    createdAt: string;
}

export interface DailyChallengeWithStatus extends DailyChallengeItem {
    isCompleted: boolean;
    completedAt: string | null;
}

export interface UserStreakInfo {
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string | null;
    hasActiveStreakToday: boolean;
}

export interface StreakSessionUpdate {
    currentStreak: number;
    longestStreak: number;
    isIncremented: boolean;
}

export interface DailyChallengeSessionUpdate {
    dailyChallengeId: string;
    title: string;
    isCompleted: boolean;
    isNewlyCompleted: boolean;
}
