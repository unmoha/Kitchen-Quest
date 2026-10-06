import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
    getUtcDateString,
    isStreakActiveToday,
    getDaysDifference,
} from "./streak-calculator";
import type {
    DailyChallengeItem,
    DailyChallengeRow,
    DailyChallengeWithStatus,
    DailyChallengeSessionUpdate,
    StreakSessionUpdate,
    UserStreakInfo,
    UserStreakRow,
} from "./types";

export interface DailyChallengePersistence {
    getPublishedChallenges(): Promise<DailyChallengeRow[]>;
    getUserStreak(userId: string): Promise<UserStreakRow | null>;
    getUserDailyChallenge(userId: string, challengeId: string): Promise<{ completed_at: string } | null>;
    recordUserStreak(userId: string, sessionId: string): Promise<{
        current_streak: number;
        longest_streak: number;
        last_activity_date: string;
        incremented: boolean;
    } | null>;
    completeUserDailyChallenge(userId: string, challengeId: string, sessionId: string): Promise<boolean>;
}

function toDailyChallengeItem(row: DailyChallengeRow): DailyChallengeItem {
    return {
        id: row.id,
        challengeDate: row.challenge_date,
        title: row.title,
        slug: row.slug,
        description: row.description,
        challengeType: row.challenge_type,
        recipeId: row.recipe_id,
        learningModuleId: row.learning_module_id,
        ingredientId: row.ingredient_id,
        status: row.status,
        createdAt: row.created_at,
    };
}

export class DailyChallengeService {
    constructor(
        private persistence: DailyChallengePersistence,
        private currentUserId?: string,
    ) {}

    private resolveUserId(explicitUserId?: string): string {
        const id = explicitUserId ?? this.currentUserId;
        if (!id) {
            throw new Error("User ID is required for user-specific challenge operations");
        }
        return id;
    }

    async getTodaysChallenge(userId?: string, targetDate: string = getUtcDateString()): Promise<DailyChallengeWithStatus | null> {
        const challenges = await this.persistence.getPublishedChallenges();
        if (challenges.length === 0) {
            return null;
        }

        // 1. Try exact match for target date
        let matched = challenges.find((c) => c.challenge_date === targetDate);

        // 2. Fallback to latest or cyclic published challenge if no exact date match
        if (!matched) {
            const sorted = [...challenges].sort((a, b) => b.challenge_date.localeCompare(a.challenge_date));
            matched = sorted[0];
        }

        const challengeItem = toDailyChallengeItem(matched);

        let isCompleted = false;
        let completedAt: string | null = null;

        const effectiveUserId = userId ?? this.currentUserId;
        if (effectiveUserId) {
            const userCompletion = await this.persistence.getUserDailyChallenge(effectiveUserId, challengeItem.id);
            if (userCompletion) {
                isCompleted = true;
                completedAt = userCompletion.completed_at;
            }
        }

        return {
            ...challengeItem,
            isCompleted,
            completedAt,
        };
    }

    async getUserStreak(userId?: string, targetDate: string = getUtcDateString()): Promise<UserStreakInfo> {
        const effectiveUserId = userId ?? this.currentUserId;
        if (!effectiveUserId) {
            return {
                currentStreak: 0,
                longestStreak: 0,
                lastActivityDate: null,
                hasActiveStreakToday: false,
            };
        }

        const row = await this.persistence.getUserStreak(effectiveUserId);
        if (!row || !row.last_activity_date) {
            return {
                currentStreak: 0,
                longestStreak: 0,
                lastActivityDate: null,
                hasActiveStreakToday: false,
            };
        }

        const daysDiff = getDaysDifference(row.last_activity_date, targetDate);
        const hasActiveStreakToday = isStreakActiveToday(row.last_activity_date, targetDate);

        // If more than 1 day has passed without activity, the active streak has lapsed back to 0
        // until a new qualifying session is completed. Longest streak is always retained.
        const currentStreak = daysDiff <= 1 ? row.current_streak : 0;

        return {
            currentStreak,
            longestStreak: row.longest_streak,
            lastActivityDate: row.last_activity_date,
            hasActiveStreakToday,
        };
    }

    async processSessionDailyChallengeAndStreak({
        userId,
        sessionId,
        targetDate = getUtcDateString(),
    }: {
        userId: string;
        sessionId: string;
        targetDate?: string;
    }): Promise<{
        streakUpdate: StreakSessionUpdate | null;
        dailyChallengeUpdate: DailyChallengeSessionUpdate | null;
    }> {
        const authedId = this.resolveUserId(userId);

        // 1. Process Streak server-authoritatively
        let streakUpdate: StreakSessionUpdate | null = null;
        try {
            const streakRes = await this.persistence.recordUserStreak(authedId, sessionId);
            if (streakRes) {
                streakUpdate = {
                    currentStreak: streakRes.current_streak,
                    longestStreak: streakRes.longest_streak,
                    isIncremented: streakRes.incremented,
                };
            }
        } catch {
            // Non-blocking fallback
        }

        // 2. Process Daily Challenge server-authoritatively
        let dailyChallengeUpdate: DailyChallengeSessionUpdate | null = null;
        try {
            const todaysChallenge = await this.getTodaysChallenge(authedId, targetDate);
            if (todaysChallenge) {
                const wasPreviouslyCompleted = todaysChallenge.isCompleted;
                const isNewlyCompleted = await this.persistence.completeUserDailyChallenge(
                    authedId,
                    todaysChallenge.id,
                    sessionId,
                );

                dailyChallengeUpdate = {
                    dailyChallengeId: todaysChallenge.id,
                    title: todaysChallenge.title,
                    isCompleted: wasPreviouslyCompleted || isNewlyCompleted,
                    isNewlyCompleted,
                };
            }
        } catch {
            // Non-blocking fallback
        }

        return {
            streakUpdate,
            dailyChallengeUpdate,
        };
    }
}

export function createSupabaseDailyChallengePersistence(client: SupabaseClient<Database>): DailyChallengePersistence {
    return {
        async getPublishedChallenges() {
            const { data, error } = await client
                .from("daily_challenges")
                .select("*")
                .eq("status", "published")
                .order("challenge_date", { ascending: true });

            if (error) {
                throw new Error(`Failed to fetch daily challenges: ${error.message}`);
            }
            return data ?? [];
        },

        async getUserStreak(userId: string) {
            const { data, error } = await client
                .from("user_streaks")
                .select("*")
                .eq("user_id", userId)
                .maybeSingle();

            if (error) {
                throw new Error(`Failed to fetch user streak: ${error.message}`);
            }
            return data;
        },

        async getUserDailyChallenge(userId: string, challengeId: string) {
            const { data, error } = await client
                .from("user_daily_challenges")
                .select("completed_at")
                .eq("user_id", userId)
                .eq("daily_challenge_id", challengeId)
                .maybeSingle();

            if (error) {
                throw new Error(`Failed to fetch user daily challenge: ${error.message}`);
            }
            return data;
        },

        async recordUserStreak(userId: string, sessionId: string) {
            const { data, error } = await client.rpc("record_user_streak", {
                p_user_id: userId,
                p_session_id: sessionId,
            });

            if (error) {
                throw new Error(`Failed to record user streak: ${error.message}`);
            }
            return data;
        },

        async completeUserDailyChallenge(userId: string, challengeId: string, sessionId: string) {
            const { data, error } = await client.rpc("complete_user_daily_challenge", {
                p_user_id: userId,
                p_daily_challenge_id: challengeId,
                p_session_id: sessionId,
            });

            if (error) {
                throw new Error(`Failed to complete user daily challenge: ${error.message}`);
            }
            return Boolean(data);
        },
    };
}
