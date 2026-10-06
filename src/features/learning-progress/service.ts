import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
    calculateModuleSessionMastery,
    calculateRecipeSessionMastery,
    calculateUpdatedMasteryScore,
    determineProgressStatus,
    isModuleCompleted,
    isRecipeCompleted,
} from "./calculations";
import type {
    ProgressSummary,
    SessionProgressResult,
    SessionProgressUpdate,
    UserLearningProgress,
} from "./types";

type UserLearningProgressRow = Database["public"]["Tables"]["user_learning_progress"]["Row"];

export interface ProgressPersistence {
    getUserProgressRows(userId: string): Promise<UserLearningProgressRow[]>;
    getModuleProgressRow(userId: string, learningModuleId: string): Promise<UserLearningProgressRow | null>;
    getRecipeProgressRow(userId: string, recipeId: string): Promise<UserLearningProgressRow | null>;
    upsertModuleProgress(input: {
        userId: string;
        learningModuleId: string;
        masteryScore: number;
        completedAt: string | null;
        lastAttemptedAt: string;
    }): Promise<UserLearningProgressRow>;
    upsertRecipeProgress(input: {
        userId: string;
        recipeId: string;
        masteryScore: number;
        completedAt: string | null;
        lastAttemptedAt: string;
    }): Promise<UserLearningProgressRow>;
    getSession(sessionId: string): Promise<{
        id: string;
        user_id: string;
        game_mode: string;
        status: string;
    } | null>;
    getSessionAttempts(sessionId: string): Promise<Array<{
        id: string;
        session_id: string;
        question_id: string | null;
        recipe_id: string | null;
        is_correct: boolean;
    }>>;
    getQuestionModuleMap(questionIds: string[]): Promise<Map<string, { moduleId: string; moduleTitle: string }>>;
    getRecipeTitleMap(recipeIds: string[]): Promise<Map<string, string>>;
}

export function toUserLearningProgress(row: UserLearningProgressRow): UserLearningProgress {
    return {
        id: row.id,
        userId: row.user_id,
        learningModuleId: row.learning_module_id,
        recipeId: row.recipe_id,
        masteryScore: Number(row.mastery_score),
        completedAt: row.completed_at,
        lastAttemptedAt: row.last_attempted_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        status: determineProgressStatus(row.completed_at, row.last_attempted_at, Number(row.mastery_score)),
    };
}

export class LearningProgressService {
    constructor(
        private readonly persistence: ProgressPersistence,
        private readonly defaultUserId?: string,
    ) { }

    private resolveUserId(explicitUserId?: string): string {
        const userId = explicitUserId ?? this.defaultUserId ?? "";
        if (!userId) {
            throw new Error("You must be authenticated to access or update learning progress.");
        }
        return userId;
    }

    async getUserProgress(userId?: string): Promise<ProgressSummary> {
        const authedId = this.resolveUserId(userId);
        const rows = await this.persistence.getUserProgressRows(authedId);

        const modules: Record<string, UserLearningProgress> = {};
        const recipes: Record<string, UserLearningProgress> = {};

        for (const row of rows) {
            const progress = toUserLearningProgress(row);
            if (row.learning_module_id) {
                modules[row.learning_module_id] = progress;
            } else if (row.recipe_id) {
                recipes[row.recipe_id] = progress;
            }
        }

        return { modules, recipes };
    }

    async getModuleProgress(moduleId: string, userId?: string): Promise<UserLearningProgress | null> {
        const authedId = this.resolveUserId(userId);
        const row = await this.persistence.getModuleProgressRow(authedId, moduleId);
        return row ? toUserLearningProgress(row) : null;
    }

    async getRecipeProgress(recipeId: string, userId?: string): Promise<UserLearningProgress | null> {
        const authedId = this.resolveUserId(userId);
        const row = await this.persistence.getRecipeProgressRow(authedId, recipeId);
        return row ? toUserLearningProgress(row) : null;
    }

    async recordSessionProgress(input: {
        userId?: string;
        sessionId: string;
    }): Promise<SessionProgressResult> {
        const authedId = this.resolveUserId(input.userId);
        const session = await this.persistence.getSession(input.sessionId);

        if (!session) {
            throw new Error("Game session not found.");
        }
        if (session.user_id !== authedId) {
            throw new Error("You cannot record learning progress for another user's session.");
        }

        const attempts = await this.persistence.getSessionAttempts(input.sessionId);
        const now = new Date().toISOString();
        const updates: SessionProgressUpdate[] = [];

        const isQuestionBased = session.game_mode === "ingredient_quiz"
            || session.game_mode === "kitchen_challenge"
            || session.game_mode === "food_detective";

        if (isQuestionBased) {
            const questionIds = [...new Set(attempts.map((a) => a.question_id).filter((id): id is string => Boolean(id)))];
            if (questionIds.length > 0) {
                const questionMap = await this.persistence.getQuestionModuleMap(questionIds);
                const moduleAttempts = new Map<string, { correct: number; total: number; title: string }>();

                for (const attempt of attempts) {
                    if (!attempt.question_id) continue;
                    const moduleInfo = questionMap.get(attempt.question_id);
                    if (!moduleInfo) continue;

                    const current = moduleAttempts.get(moduleInfo.moduleId) ?? { correct: 0, total: 0, title: moduleInfo.moduleTitle };
                    current.total += 1;
                    if (attempt.is_correct) {
                        current.correct += 1;
                    }
                    moduleAttempts.set(moduleInfo.moduleId, current);
                }

                for (const [moduleId, stats] of moduleAttempts) {
                    const existingRow = await this.persistence.getModuleProgressRow(authedId, moduleId);
                    const previousScore = existingRow ? Number(existingRow.mastery_score) : 0;
                    const wasPreviouslyCompleted = Boolean(existingRow?.completed_at);

                    const sessionMastery = calculateModuleSessionMastery(stats.correct, stats.total);
                    const newMasteryScore = calculateUpdatedMasteryScore(previousScore, sessionMastery);
                    const isCompleted = isModuleCompleted(newMasteryScore, wasPreviouslyCompleted);

                    const completedAt = isCompleted
                        ? (existingRow?.completed_at ?? now)
                        : null;

                    await this.persistence.upsertModuleProgress({
                        userId: authedId,
                        learningModuleId: moduleId,
                        masteryScore: newMasteryScore,
                        completedAt,
                        lastAttemptedAt: now,
                    });

                    updates.push({
                        targetType: "learning_module",
                        targetId: moduleId,
                        title: stats.title,
                        masteryScore: newMasteryScore,
                        previousMasteryScore: previousScore,
                        isCompleted,
                        wasPreviouslyCompleted,
                    });
                }
            }
        } else if (session.game_mode === "recipe_builder" || session.game_mode === "cooking_order") {
            const recipeIds = [...new Set(attempts.map((a) => a.recipe_id).filter((id): id is string => Boolean(id)))];
            if (recipeIds.length > 0) {
                const recipeTitleMap = await this.persistence.getRecipeTitleMap(recipeIds);

                for (const recipeId of recipeIds) {
                    const recipeAttempt = attempts.find((a) => a.recipe_id === recipeId);
                    if (!recipeAttempt) continue;

                    const title = recipeTitleMap.get(recipeId) ?? "Recipe Practice";
                    const existingRow = await this.persistence.getRecipeProgressRow(authedId, recipeId);
                    const previousScore = existingRow ? Number(existingRow.mastery_score) : 0;
                    const wasPreviouslyCompleted = Boolean(existingRow?.completed_at);

                    const sessionMastery = calculateRecipeSessionMastery(recipeAttempt.is_correct);
                    const newMasteryScore = calculateUpdatedMasteryScore(previousScore, sessionMastery);
                    const isCompleted = isRecipeCompleted(recipeAttempt.is_correct, wasPreviouslyCompleted);

                    const completedAt = isCompleted
                        ? (existingRow?.completed_at ?? now)
                        : null;

                    await this.persistence.upsertRecipeProgress({
                        userId: authedId,
                        recipeId,
                        masteryScore: newMasteryScore,
                        completedAt,
                        lastAttemptedAt: now,
                    });

                    updates.push({
                        targetType: "recipe",
                        targetId: recipeId,
                        title,
                        masteryScore: newMasteryScore,
                        previousMasteryScore: previousScore,
                        isCompleted,
                        wasPreviouslyCompleted,
                    });
                }
            }
        }

        return {
            sessionId: input.sessionId,
            gameMode: session.game_mode,
            updates,
        };
    }
}

export function createSupabaseProgressPersistence(client: SupabaseClient<Database>): ProgressPersistence {
    return {
        async getUserProgressRows(userId: string) {
            const { data, error } = await client
                .from("user_learning_progress")
                .select("*")
                .eq("user_id", userId);

            if (error) {
                throw new Error(`Failed to fetch user learning progress: ${error.message}`);
            }
            return data ?? [];
        },

        async getModuleProgressRow(userId: string, learningModuleId: string) {
            const { data, error } = await client
                .from("user_learning_progress")
                .select("*")
                .eq("user_id", userId)
                .eq("learning_module_id", learningModuleId)
                .maybeSingle();

            if (error) {
                throw new Error(`Failed to fetch module progress: ${error.message}`);
            }
            return data ?? null;
        },

        async getRecipeProgressRow(userId: string, recipeId: string) {
            const { data, error } = await client
                .from("user_learning_progress")
                .select("*")
                .eq("user_id", userId)
                .eq("recipe_id", recipeId)
                .maybeSingle();

            if (error) {
                throw new Error(`Failed to fetch recipe progress: ${error.message}`);
            }
            return data ?? null;
        },

        async upsertModuleProgress(input: {
            userId: string;
            learningModuleId: string;
            masteryScore: number;
            completedAt: string | null;
            lastAttemptedAt: string;
        }) {
            const { data, error } = await client
                .from("user_learning_progress")
                .upsert(
                    {
                        user_id: input.userId,
                        learning_module_id: input.learningModuleId,
                        recipe_id: null,
                        mastery_score: input.masteryScore,
                        completed_at: input.completedAt,
                        last_attempted_at: input.lastAttemptedAt,
                    },
                    { onConflict: "user_id, learning_module_id" },
                )
                .select()
                .single();

            if (error || !data) {
                throw new Error(`Failed to record module progress: ${error?.message}`);
            }
            return data;
        },

        async upsertRecipeProgress(input: {
            userId: string;
            recipeId: string;
            masteryScore: number;
            completedAt: string | null;
            lastAttemptedAt: string;
        }) {
            const { data, error } = await client
                .from("user_learning_progress")
                .upsert(
                    {
                        user_id: input.userId,
                        learning_module_id: null,
                        recipe_id: input.recipeId,
                        mastery_score: input.masteryScore,
                        completed_at: input.completedAt,
                        last_attempted_at: input.lastAttemptedAt,
                    },
                    { onConflict: "user_id, recipe_id" },
                )
                .select()
                .single();

            if (error || !data) {
                throw new Error(`Failed to record recipe progress: ${error?.message}`);
            }
            return data;
        },

        async getSession(sessionId: string) {
            const { data, error } = await client
                .from("game_sessions")
                .select("id, user_id, game_mode, status")
                .eq("id", sessionId)
                .maybeSingle();

            if (error) {
                throw new Error(`Failed to fetch session: ${error.message}`);
            }
            return data ?? null;
        },

        async getSessionAttempts(sessionId: string) {
            const { data, error } = await client
                .from("game_attempts")
                .select("id, session_id, question_id, recipe_id, is_correct")
                .eq("session_id", sessionId);

            if (error) {
                throw new Error(`Failed to fetch attempts: ${error.message}`);
            }
            return data ?? [];
        },

        async getQuestionModuleMap(questionIds: string[]) {
            if (questionIds.length === 0) {
                return new Map();
            }

            const { data: questionRows, error: questionError } = await client
                .from("questions")
                .select("id, learning_module_id")
                .in("id", questionIds);

            if (questionError) {
                throw new Error(`Failed to fetch questions for module mapping: ${questionError.message}`);
            }

            const moduleIds = [...new Set((questionRows ?? []).map((q) => q.learning_module_id).filter((id): id is string => Boolean(id)))];
            if (moduleIds.length === 0) {
                return new Map();
            }

            const { data: moduleRows, error: moduleError } = await client
                .from("learning_modules")
                .select("id, title")
                .in("id", moduleIds);

            if (moduleError) {
                throw new Error(`Failed to fetch modules: ${moduleError.message}`);
            }

            const titleByModuleId = new Map((moduleRows ?? []).map((m) => [m.id, m.title]));
            const map = new Map<string, { moduleId: string; moduleTitle: string }>();

            for (const q of questionRows ?? []) {
                if (q.learning_module_id && titleByModuleId.has(q.learning_module_id)) {
                    map.set(q.id, {
                        moduleId: q.learning_module_id,
                        moduleTitle: titleByModuleId.get(q.learning_module_id) ?? "Learning Module",
                    });
                }
            }

            return map;
        },

        async getRecipeTitleMap(recipeIds: string[]) {
            if (recipeIds.length === 0) {
                return new Map();
            }

            const { data, error } = await client
                .from("recipes")
                .select("id, title")
                .in("id", recipeIds);

            if (error) {
                throw new Error(`Failed to fetch recipes: ${error.message}`);
            }

            return new Map((data ?? []).map((r) => [r.id, r.title]));
        },
    };
}
