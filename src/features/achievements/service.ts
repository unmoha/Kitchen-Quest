import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { calculateLevel } from "../xp-levels/levels";
import {
    buildAchievementsWithProgress,
    evaluateRequirement,
} from "./evaluator";
import type {
    AchievementEvaluationContext,
    AchievementItem,
    AchievementRequirement,
    AchievementRow,
    AchievementsSummary,
    AchievementWithProgress,
    UserAchievementItem,
    UserAchievementRow,
} from "./types";

export interface AchievementPersistence {
    getPublishedAchievements(): Promise<AchievementRow[]>;
    getUserAchievements(userId: string): Promise<UserAchievementRow[]>;
    getUserEvaluationContext(userId: string): Promise<AchievementEvaluationContext>;
    unlockAchievement(userId: string, achievementId: string): Promise<boolean>;
}

export function toAchievementItem(row: AchievementRow): AchievementItem {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        icon: row.icon,
        requirement: row.requirement as AchievementRequirement,
        status: row.status,
        createdAt: row.created_at,
    };
}

export function toUserAchievementItem(row: UserAchievementRow): UserAchievementItem {
    return {
        id: row.id,
        userId: row.user_id,
        achievementId: row.achievement_id,
        unlockedAt: row.unlocked_at,
        createdAt: row.created_at,
    };
}

export class AchievementService {
    constructor(
        private readonly persistence: AchievementPersistence,
        private readonly defaultUserId?: string,
    ) { }

    private resolveUserId(explicitUserId?: string): string {
        const userId = explicitUserId ?? this.defaultUserId ?? "";
        if (!userId) {
            throw new Error("You must be authenticated to access or update achievements.");
        }
        return userId;
    }

    async getAchievementsWithProgress(userId?: string): Promise<AchievementWithProgress[]> {
        const authedId = this.resolveUserId(userId);
        const [achievementsRows, userUnlockRows, context] = await Promise.all([
            this.persistence.getPublishedAchievements(),
            this.persistence.getUserAchievements(authedId),
            this.persistence.getUserEvaluationContext(authedId),
        ]);

        const achievements = achievementsRows.map(toAchievementItem);
        const userUnlocks = userUnlockRows.map(toUserAchievementItem);

        return buildAchievementsWithProgress(achievements, userUnlocks, context);
    }

    async getAchievementsSummary(userId?: string): Promise<AchievementsSummary> {
        const authedId = this.resolveUserId(userId);
        const items = await this.getAchievementsWithProgress(authedId);

        const unlocked = items.filter((item) => item.isUnlocked);
        const total = items.length;
        const percent = total > 0 ? Math.round((unlocked.length / total) * 100) : 0;

        // Sort recently unlocked first, fallback to unlockedAt or createdAt
        const recentUnlocks = [...unlocked].sort((a, b) => {
            const dateA = a.unlockedAt ?? a.createdAt;
            const dateB = b.unlockedAt ?? b.createdAt;
            return dateB.localeCompare(dateA);
        }).slice(0, 4);

        return {
            totalAchievements: total,
            unlockedCount: unlocked.length,
            percentComplete: percent,
            recentUnlocks,
        };
    }

    async evaluateAndUnlockAchievements(userId?: string): Promise<AchievementItem[]> {
        const authedId = this.resolveUserId(userId);
        const [achievementsRows, userUnlockRows, context] = await Promise.all([
            this.persistence.getPublishedAchievements(),
            this.persistence.getUserAchievements(authedId),
            this.persistence.getUserEvaluationContext(authedId),
        ]);

        const achievements = achievementsRows.map(toAchievementItem);
        const unlockedIds = new Set(userUnlockRows.map((u) => u.achievement_id));
        const newlyUnlocked: AchievementItem[] = [];

        for (const achievement of achievements) {
            if (unlockedIds.has(achievement.id)) {
                continue;
            }

            const evalResult = evaluateRequirement(achievement.requirement, context);
            if (evalResult.isSatisfied) {
                const inserted = await this.persistence.unlockAchievement(authedId, achievement.id);
                if (inserted) {
                    newlyUnlocked.push(achievement);
                    unlockedIds.add(achievement.id);
                }
            }
        }

        return newlyUnlocked;
    }
}

export function createSupabaseAchievementPersistence(client: SupabaseClient<Database>): AchievementPersistence {
    return {
        async getPublishedAchievements() {
            const { data, error } = await client
                .from("achievements")
                .select("*")
                .eq("status", "published")
                .order("created_at", { ascending: true });

            if (error) {
                throw new Error(`Failed to fetch published achievements: ${error.message}`);
            }
            return data ?? [];
        },

        async getUserAchievements(userId: string) {
            const { data, error } = await client
                .from("user_achievements")
                .select("*")
                .eq("user_id", userId)
                .order("unlocked_at", { ascending: false });

            if (error) {
                throw new Error(`Failed to fetch user achievements: ${error.message}`);
            }
            return data ?? [];
        },

        async getUserEvaluationContext(userId: string): Promise<AchievementEvaluationContext> {
            // 1. Fetch completed game sessions
            const { data: sessionData, error: sessionError } = await client
                .from("game_sessions")
                .select("id, game_mode, status")
                .eq("user_id", userId)
                .eq("status", "completed");

            if (sessionError) {
                throw new Error(`Failed to fetch user game sessions: ${sessionError.message}`);
            }

            const completedSessionCount = sessionData ? sessionData.length : 0;
            const completedGameModes = Array.from(new Set((sessionData ?? []).map((s) => s.game_mode)));

            // 2. Fetch learning progress
            const { data: progressData, error: progressError } = await client
                .from("user_learning_progress")
                .select("id, learning_module_id, recipe_id, mastery_score, completed_at, updated_at")
                .eq("user_id", userId);

            if (progressError) {
                throw new Error(`Failed to fetch user learning progress: ${progressError.message}`);
            }

            const completedModules = (progressData ?? []).filter((p) => p.learning_module_id && p.completed_at !== null);
            const completedRecipes = (progressData ?? []).filter((p) => p.recipe_id && p.completed_at !== null);

            const completedModuleIds = completedModules.map((p) => p.learning_module_id as string);
            const completedRecipeIds = completedRecipes.map((p) => p.recipe_id as string);

            let highestMasteryScore = 0;
            const distinctDates = new Set<string>();

            for (const p of progressData ?? []) {
                if (p.mastery_score > highestMasteryScore) {
                    highestMasteryScore = Number(p.mastery_score);
                }
                const dateSource = p.completed_at ?? p.updated_at;
                if (dateSource) {
                    distinctDates.add(dateSource.substring(0, 10));
                }
            }

            // 3. Fetch module and recipe metadata (slugs, cuisines)
            let completedModuleSlugs: string[] = [];
            if (completedModuleIds.length > 0) {
                const { data: modulesData } = await client
                    .from("learning_modules")
                    .select("id, slug")
                    .in("id", completedModuleIds);

                completedModuleSlugs = (modulesData ?? []).map((m) => m.slug);
            }

            let completedRecipeSlugs: string[] = [];
            const distinctCuisines = new Set<string>();

            if (completedRecipeIds.length > 0) {
                const { data: recipesData } = await client
                    .from("recipes")
                    .select("id, slug, cuisine")
                    .in("id", completedRecipeIds);

                completedRecipeSlugs = (recipesData ?? []).map((r) => r.slug);
                for (const r of recipesData ?? []) {
                    if (r.cuisine) {
                        distinctCuisines.add(r.cuisine.toLowerCase());
                    }
                }
            }

            // 4. Fetch total XP to derive level
            const { data: xpData, error: xpError } = await client
                .from("user_xp_transactions")
                .select("amount")
                .eq("user_id", userId);

            if (xpError) {
                throw new Error(`Failed to fetch user XP: ${xpError.message}`);
            }

            const totalXp = (xpData ?? []).reduce((sum, tx) => sum + (tx.amount ?? 0), 0);
            const userLevel = calculateLevel(totalXp);

            return {
                completedSessionCount,
                completedGameModes,
                userLevel,
                totalXp,
                completedModuleIds,
                completedModuleSlugs,
                completedRecipeIds,
                completedRecipeSlugs,
                highestMasteryScore,
                distinctLearningDaysCount: distinctDates.size,
                distinctCuisineCount: distinctCuisines.size,
            };
        },

        async unlockAchievement(userId: string, achievementId: string) {
            const { data, error } = await client.rpc("unlock_user_achievement", {
                p_user_id: userId,
                p_achievement_id: achievementId,
            });

            if (error) {
                // Duplicate key / conflict check
                if (error.code === "23505" || error.message?.toLowerCase().includes("unique")) {
                    return false;
                }
                throw new Error(`Failed to unlock achievement: ${error.message}`);
            }

            return Boolean(data);
        },
    };
}
