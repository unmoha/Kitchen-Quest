import type { Database, ContentStatus } from "@/types/database";

export type AchievementRow = Database["public"]["Tables"]["achievements"]["Row"];
export type UserAchievementRow = Database["public"]["Tables"]["user_achievements"]["Row"];

export type AchievementRequirement =
    | { kind: "game_sessions_completed"; count: number }
    | { kind: "distinct_game_modes"; count: number }
    | { kind: "min_level"; level: number }
    | { kind: "mastery_score"; min_score: number }
    | { kind: "module_completions"; count: number }
    | { kind: "ingredient_lessons"; count: number }
    | { kind: "module_slug"; slug: string }
    | { kind: "recipe_views" | "recipe_completions"; count: number }
    | { kind: "cuisine_modules"; count: number }
    | { kind: "learning_days"; count: number }
    | { kind: string; [key: string]: unknown };

export interface AchievementItem {
    id: string;
    name: string;
    slug: string;
    description: string;
    icon: string;
    requirement: AchievementRequirement;
    status: ContentStatus;
    createdAt: string;
}

export interface UserAchievementItem {
    id: string;
    userId: string;
    achievementId: string;
    unlockedAt: string;
    createdAt: string;
}

export interface AchievementWithProgress extends AchievementItem {
    isUnlocked: boolean;
    unlockedAt: string | null;
    currentProgress: number;
    maxProgress: number;
    progressPercent: number;
}

export interface AchievementEvaluationContext {
    completedSessionCount: number;
    completedGameModes: string[];
    userLevel: number;
    totalXp: number;
    completedModuleIds: string[];
    completedModuleSlugs: string[];
    completedRecipeIds: string[];
    completedRecipeSlugs: string[];
    highestMasteryScore: number;
    distinctLearningDaysCount: number;
    distinctCuisineCount: number;
}

export interface AchievementUnlockResult {
    unlocked: boolean;
    achievement: AchievementItem;
}

export interface AchievementsSummary {
    totalAchievements: number;
    unlockedCount: number;
    percentComplete: number;
    recentUnlocks: AchievementWithProgress[];
}
