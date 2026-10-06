import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
    XP_REWARDS,
    calculateUserLevelInfo,
    hasLeveledUp,
} from "./levels";
import type {
    SessionXpSummary,
    UserLevelInfo,
    UserXpTransaction,
    XpAwardResult,
    XpSourceType,
} from "./types";

type UserXpTransactionRow = Database["public"]["Tables"]["user_xp_transactions"]["Row"];

export interface XpPersistence {
    getUserXpTransactions(userId: string, limit?: number): Promise<UserXpTransactionRow[]>;
    getUserTotalXp(userId: string): Promise<number>;
    insertXpTransaction(input: {
        userId: string;
        amount: number;
        sourceType: XpSourceType;
        sourceId: string;
        description: string;
    }): Promise<boolean>;
}

export function toUserXpTransaction(row: UserXpTransactionRow): UserXpTransaction {
    return {
        id: row.id,
        userId: row.user_id,
        amount: row.amount,
        sourceType: row.source_type,
        sourceId: row.source_id,
        description: row.description,
        createdAt: row.created_at,
    };
}

export class XpService {
    constructor(
        private readonly persistence: XpPersistence,
        private readonly defaultUserId?: string,
    ) { }

    private resolveUserId(explicitUserId?: string): string {
        const userId = explicitUserId ?? this.defaultUserId ?? "";
        if (!userId) {
            throw new Error("You must be authenticated to access or update XP.");
        }
        return userId;
    }

    async getUserLevelInfo(userId?: string): Promise<UserLevelInfo> {
        const authedId = this.resolveUserId(userId);
        const totalXp = await this.persistence.getUserTotalXp(authedId);
        return calculateUserLevelInfo(totalXp);
    }

    async getUserTransactions(limit = 20, userId?: string): Promise<UserXpTransaction[]> {
        const authedId = this.resolveUserId(userId);
        const rows = await this.persistence.getUserXpTransactions(authedId, limit);
        return rows.map(toUserXpTransaction);
    }

    async awardAnswerXp(input: {
        userId?: string;
        attemptId: string;
        isCorrect: boolean;
        description?: string;
    }): Promise<XpAwardResult> {
        const authedId = this.resolveUserId(input.userId);

        if (!input.isCorrect) {
            return {
                awarded: false,
                amount: 0,
                sourceType: "game_answer",
                sourceId: input.attemptId,
                description: input.description ?? "Incorrect answer",
            };
        }

        const description = input.description ?? "Correct answer";
        const inserted = await this.persistence.insertXpTransaction({
            userId: authedId,
            amount: XP_REWARDS.CORRECT_ANSWER,
            sourceType: "game_answer",
            sourceId: input.attemptId,
            description,
        });

        return {
            awarded: inserted,
            amount: inserted ? XP_REWARDS.CORRECT_ANSWER : 0,
            sourceType: "game_answer",
            sourceId: input.attemptId,
            description,
        };
    }

    async awardSessionCompletionXp(input: {
        userId?: string;
        sessionId: string;
        description?: string;
    }): Promise<XpAwardResult> {
        const authedId = this.resolveUserId(input.userId);
        const description = input.description ?? "Completed game session";

        const inserted = await this.persistence.insertXpTransaction({
            userId: authedId,
            amount: XP_REWARDS.SESSION_COMPLETION,
            sourceType: "game_session_completion",
            sourceId: input.sessionId,
            description,
        });

        return {
            awarded: inserted,
            amount: inserted ? XP_REWARDS.SESSION_COMPLETION : 0,
            sourceType: "game_session_completion",
            sourceId: input.sessionId,
            description,
        };
    }

    async awardLearningCompletionXp(input: {
        userId?: string;
        targetType: "learning_module" | "recipe";
        targetId: string;
        isFirstCompletion: boolean;
        title?: string;
    }): Promise<XpAwardResult> {
        const authedId = this.resolveUserId(input.userId);
        const label = input.targetType === "recipe" ? "recipe" : "learning module";
        const description = input.title
            ? `First-time completion of ${label}: ${input.title}`
            : `First-time completion of ${label}`;

        if (!input.isFirstCompletion) {
            return {
                awarded: false,
                amount: 0,
                sourceType: "learning_completion",
                sourceId: input.targetId,
                description,
            };
        }

        const inserted = await this.persistence.insertXpTransaction({
            userId: authedId,
            amount: XP_REWARDS.LEARNING_COMPLETION,
            sourceType: "learning_completion",
            sourceId: input.targetId,
            description,
        });

        return {
            awarded: inserted,
            amount: inserted ? XP_REWARDS.LEARNING_COMPLETION : 0,
            sourceType: "learning_completion",
            sourceId: input.targetId,
            description,
        };
    }

    async processSessionXp(input: {
        userId?: string;
        sessionId: string;
        correctAttemptIds: string[];
        newlyCompletedTargets?: Array<{
            targetId: string;
            targetType: "learning_module" | "recipe";
            title?: string;
        }>;
        sessionDescription?: string;
    }): Promise<SessionXpSummary> {
        const authedId = this.resolveUserId(input.userId);
        const previousTotalXp = await this.persistence.getUserTotalXp(authedId);
        const breakdown: Array<{ description: string; amount: number; sourceType: XpSourceType }> = [];
        let totalXpEarned = 0;

        // 1. Award answer XP for each correct attempt
        for (const attemptId of input.correctAttemptIds) {
            const result = await this.awardAnswerXp({
                userId: authedId,
                attemptId,
                isCorrect: true,
                description: "Correct answer",
            });
            if (result.awarded) {
                totalXpEarned += result.amount;
                breakdown.push({
                    description: result.description,
                    amount: result.amount,
                    sourceType: result.sourceType,
                });
            }
        }

        // 2. Award session completion XP
        const sessionResult = await this.awardSessionCompletionXp({
            userId: authedId,
            sessionId: input.sessionId,
            description: input.sessionDescription ?? "Completed game session",
        });
        if (sessionResult.awarded) {
            totalXpEarned += sessionResult.amount;
            breakdown.push({
                description: sessionResult.description,
                amount: sessionResult.amount,
                sourceType: sessionResult.sourceType,
            });
        }

        // 3. Award learning completion XP for targets newly completing for the first time
        if (input.newlyCompletedTargets && input.newlyCompletedTargets.length > 0) {
            for (const target of input.newlyCompletedTargets) {
                const targetResult = await this.awardLearningCompletionXp({
                    userId: authedId,
                    targetType: target.targetType,
                    targetId: target.targetId,
                    isFirstCompletion: true,
                    title: target.title,
                });
                if (targetResult.awarded) {
                    totalXpEarned += targetResult.amount;
                    breakdown.push({
                        description: targetResult.description,
                        amount: targetResult.amount,
                        sourceType: targetResult.sourceType,
                    });
                }
            }
        }

        const currentTotalXp = await this.persistence.getUserTotalXp(authedId);
        const levelInfo = calculateUserLevelInfo(currentTotalXp);
        const levelTransition = hasLeveledUp(previousTotalXp, currentTotalXp);

        return {
            totalXpEarned,
            breakdown,
            levelInfo,
            leveledUp: levelTransition.leveledUp,
            previousLevel: levelTransition.previousLevel,
            currentLevel: levelTransition.currentLevel,
        };
    }
}

export function createSupabaseXpPersistence(client: SupabaseClient<Database>): XpPersistence {
    return {
        async getUserXpTransactions(userId: string, limit = 20) {
            const { data, error } = await client
                .from("user_xp_transactions")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(limit);

            if (error) {
                throw new Error(`Failed to fetch user XP transactions: ${error.message}`);
            }
            return data ?? [];
        },

        async getUserTotalXp(userId: string) {
            const { data, error } = await client
                .from("user_xp_transactions")
                .select("amount")
                .eq("user_id", userId);

            if (error) {
                throw new Error(`Failed to calculate user total XP: ${error.message}`);
            }

            if (!data || data.length === 0) {
                return 0;
            }

            return data.reduce((sum, row) => sum + (row.amount ?? 0), 0);
        },

        async insertXpTransaction(input) {
            const { data, error } = await client.rpc("award_user_xp", {
                p_user_id: input.userId,
                p_amount: input.amount,
                p_source_type: input.sourceType,
                p_source_id: input.sourceId,
                p_description: input.description,
            });

            if (error) {
                // Postgres unique constraint code '23505' indicates duplicate idempotency key
                if (error.code === "23505" || error.message?.toLowerCase().includes("unique")) {
                    return false;
                }
                throw new Error(`Failed to record XP transaction: ${error.message}`);
            }

            return Boolean(data);
        },
    };
}
