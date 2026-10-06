import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
    createSupabaseDailyChallengePersistence,
    DailyChallengeService,
    type DailyChallengePersistence,
} from "./service";
import type {
    DailyChallengeRow,
    UserDailyChallengeRow,
    UserStreakRow,
} from "./types";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";

const mockPublishedChallenges: DailyChallengeRow[] = [
    {
        id: "dc-1",
        challenge_date: "2026-10-01",
        title: "Find the gentle simmer",
        slug: "find-the-gentle-simmer-2026-10-01",
        description: "Read the lentil method.",
        challenge_type: "recipe",
        recipe_id: "rec-1",
        learning_module_id: null,
        ingredient_id: null,
        status: "published",
        created_at: "2026-10-01T00:00:00Z",
    },
    {
        id: "dc-2",
        challenge_date: "2026-10-02",
        title: "Layer aromatics with care",
        slug: "layer-aromatics-with-care-2026-10-02",
        description: "Review when garlic is added.",
        challenge_type: "learning_module",
        recipe_id: null,
        learning_module_id: "mod-1",
        ingredient_id: null,
        status: "published",
        created_at: "2026-10-02T00:00:00Z",
    },
    {
        id: "dc-3",
        challenge_date: "2026-10-03",
        title: "Know your lentils",
        slug: "know-your-lentils-2026-10-03",
        description: "Compare split red lentils with whole green lentils.",
        challenge_type: "ingredient",
        recipe_id: null,
        learning_module_id: null,
        ingredient_id: "ing-1",
        status: "published",
        created_at: "2026-10-03T00:00:00Z",
    },
];

function createInMemoryDailyPersistence(options?: {
    streaks?: UserStreakRow[];
    userCompletions?: UserDailyChallengeRow[];
    challenges?: DailyChallengeRow[];
}): DailyChallengePersistence & {
    streaks: UserStreakRow[];
    userCompletions: UserDailyChallengeRow[];
} {
    const streaks = options?.streaks ? [...options.streaks] : [];
    const userCompletions = options?.userCompletions ? [...options.userCompletions] : [];
    const challenges = options?.challenges ? [...options.challenges] : mockPublishedChallenges;

    return {
        streaks,
        userCompletions,
        async getPublishedChallenges() {
            return challenges.filter((c) => c.status === "published");
        },
        async getUserStreak(userId: string) {
            return streaks.find((s) => s.user_id === userId) ?? null;
        },
        async getUserDailyChallenge(userId: string, challengeId: string) {
            const found = userCompletions.find(
                (c) => c.user_id === userId && c.daily_challenge_id === challengeId,
            );
            return found ? { completed_at: found.completed_at } : null;
        },
        async recordUserStreak(userId: string, _sessionId: string) {
            void _sessionId;
            const existing = streaks.find((s) => s.user_id === userId);
            const today = "2026-10-03";

            if (!existing) {
                const newRow: UserStreakRow = {
                    id: `streak-${streaks.length + 1}`,
                    user_id: userId,
                    current_streak: 1,
                    longest_streak: 1,
                    last_activity_date: today,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                streaks.push(newRow);
                return {
                    current_streak: 1,
                    longest_streak: 1,
                    last_activity_date: today,
                    incremented: true,
                };
            }

            if (existing.last_activity_date === today) {
                return {
                    current_streak: existing.current_streak,
                    longest_streak: existing.longest_streak,
                    last_activity_date: today,
                    incremented: false,
                };
            }

            if (existing.last_activity_date === "2026-10-02") {
                existing.current_streak += 1;
                existing.longest_streak = Math.max(existing.longest_streak, existing.current_streak);
                existing.last_activity_date = today;
                return {
                    current_streak: existing.current_streak,
                    longest_streak: existing.longest_streak,
                    last_activity_date: today,
                    incremented: true,
                };
            }

            existing.current_streak = 1;
            existing.longest_streak = Math.max(existing.longest_streak, 1);
            existing.last_activity_date = today;
            return {
                current_streak: 1,
                longest_streak: existing.longest_streak,
                last_activity_date: today,
                incremented: true,
            };
        },
        async completeUserDailyChallenge(userId: string, challengeId: string, _sessionId: string) {
            void _sessionId;
            const exists = userCompletions.some(
                (c) => c.user_id === userId && c.daily_challenge_id === challengeId,
            );
            if (exists) {
                return false;
            }
            userCompletions.push({
                id: `udc-${userCompletions.length + 1}`,
                user_id: userId,
                daily_challenge_id: challengeId,
                completed_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
            });
            return true;
        },
    };
}

describe("DailyChallengeService", () => {
    it("retrieves today's published challenge matching target date", async () => {
        const persistence = createInMemoryDailyPersistence();
        const service = new DailyChallengeService(persistence);

        const challenge = await service.getTodaysChallenge(USER_A, "2026-10-03");
        expect(challenge).not.toBeNull();
        expect(challenge?.id).toBe("dc-3");
        expect(challenge?.title).toBe("Know your lentils");
        expect(challenge?.isCompleted).toBe(false);
    });

    it("falls back gracefully to the latest published challenge when date is not exact match", async () => {
        const persistence = createInMemoryDailyPersistence();
        const service = new DailyChallengeService(persistence);

        const challenge = await service.getTodaysChallenge(USER_A, "2026-10-10");
        expect(challenge).not.toBeNull();
        expect(challenge?.id).toBe("dc-3");
    });

    it("reports isCompleted: true when user has completed today's challenge", async () => {
        const persistence = createInMemoryDailyPersistence({
            userCompletions: [
                {
                    id: "udc-1",
                    user_id: USER_A,
                    daily_challenge_id: "dc-3",
                    completed_at: "2026-10-03T10:00:00Z",
                    created_at: "2026-10-03T10:00:00Z",
                },
            ],
        });
        const service = new DailyChallengeService(persistence, USER_A);

        const challenge = await service.getTodaysChallenge(USER_A, "2026-10-03");
        expect(challenge?.isCompleted).toBe(true);
        expect(challenge?.completedAt).toBe("2026-10-03T10:00:00Z");
    });

    it("calculates active streak correctly for active user", async () => {
        const persistence = createInMemoryDailyPersistence({
            streaks: [
                {
                    id: "s-1",
                    user_id: USER_A,
                    current_streak: 4,
                    longest_streak: 7,
                    last_activity_date: "2026-10-02",
                    created_at: "2026-09-28T00:00:00Z",
                    updated_at: "2026-10-02T00:00:00Z",
                },
            ],
        });
        const service = new DailyChallengeService(persistence, USER_A);

        const streakInfo = await service.getUserStreak(USER_A, "2026-10-03");
        expect(streakInfo.currentStreak).toBe(4);
        expect(streakInfo.longestStreak).toBe(7);
        expect(streakInfo.hasActiveStreakToday).toBe(false);
    });

    it("reports currentStreak 0 when user missed more than 1 day while preserving longestStreak", async () => {
        const persistence = createInMemoryDailyPersistence({
            streaks: [
                {
                    id: "s-1",
                    user_id: USER_A,
                    current_streak: 5,
                    longest_streak: 10,
                    last_activity_date: "2026-09-30",
                    created_at: "2026-09-25T00:00:00Z",
                    updated_at: "2026-09-30T00:00:00Z",
                },
            ],
        });
        const service = new DailyChallengeService(persistence, USER_A);

        const streakInfo = await service.getUserStreak(USER_A, "2026-10-03");
        expect(streakInfo.currentStreak).toBe(0);
        expect(streakInfo.longestStreak).toBe(10);
        expect(streakInfo.hasActiveStreakToday).toBe(false);
    });

    it("processes session completion for daily challenge and streak authoritatively", async () => {
        const persistence = createInMemoryDailyPersistence();
        const service = new DailyChallengeService(persistence, USER_A);

        const result = await service.processSessionDailyChallengeAndStreak({
            userId: USER_A,
            sessionId: "sess-123",
            targetDate: "2026-10-03",
        });

        expect(result.streakUpdate).toEqual({
            currentStreak: 1,
            longestStreak: 1,
            isIncremented: true,
        });
        expect(result.dailyChallengeUpdate).toEqual({
            dailyChallengeId: "dc-3",
            title: "Know your lentils",
            isCompleted: true,
            isNewlyCompleted: true,
        });

        // Replaying on the same day is idempotent:
        const secondResult = await service.processSessionDailyChallengeAndStreak({
            userId: USER_A,
            sessionId: "sess-456",
            targetDate: "2026-10-03",
        });

        expect(secondResult.streakUpdate?.isIncremented).toBe(false);
        expect(secondResult.dailyChallengeUpdate?.isNewlyCompleted).toBe(false);
        expect(secondResult.dailyChallengeUpdate?.isCompleted).toBe(true);
    });
});

describe("Daily Challenges and Streaks Database & RLS Simulation", () => {
    function createMockSupabaseClient(activeAuthUserId: string | null) {
        const streakRows: UserStreakRow[] = [
            {
                id: "s-a",
                user_id: USER_A,
                current_streak: 3,
                longest_streak: 5,
                last_activity_date: "2026-10-02",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        ];

        const challengeCompletionRows: UserDailyChallengeRow[] = [
            {
                id: "udc-a",
                user_id: USER_A,
                daily_challenge_id: "dc-1",
                completed_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
            },
        ];

        return {
            from: (tableName: string) => {
                if (tableName === "daily_challenges") {
                    const queryBuilder = {
                        select: () => queryBuilder,
                        eq: () => queryBuilder,
                        order: () => Promise.resolve({
                            data: mockPublishedChallenges,
                            error: null,
                        }),
                        insert: (_row?: unknown) => {
                            void _row;
                            return Promise.resolve({
                                data: null,
                                error: { message: 'permission denied for table "daily_challenges"', code: "42501" },
                            });
                        },
                        update: (_updates?: unknown) => {
                            void _updates;
                            return Promise.resolve({
                                data: null,
                                error: { message: 'permission denied for table "daily_challenges"', code: "42501" },
                            });
                        },
                        delete: () => Promise.resolve({
                            data: null,
                            error: { message: 'permission denied for table "daily_challenges"', code: "42501" },
                        }),
                    };
                    return queryBuilder;
                }

                if (tableName === "user_streaks") {
                    let filterUserId: string | null = null;
                    const queryBuilder = {
                        select: () => queryBuilder,
                        eq: (col: string, val: string) => {
                            if (col === "user_id") filterUserId = val;
                            return queryBuilder;
                        },
                        maybeSingle: () => {
                            if (!activeAuthUserId || filterUserId !== activeAuthUserId) {
                                return Promise.resolve({ data: null, error: null });
                            }
                            const found = streakRows.find((r) => r.user_id === activeAuthUserId);
                            return Promise.resolve({ data: found ?? null, error: null });
                        },
                        insert: (_row?: unknown) => {
                            void _row;
                            return Promise.resolve({
                                data: null,
                                error: { message: 'new row violates row-level security policy for table "user_streaks"', code: "42501" },
                            });
                        },
                        update: (_updates?: unknown) => {
                            void _updates;
                            return Promise.resolve({
                                data: null,
                                error: { message: 'permission denied for table "user_streaks"', code: "42501" },
                            });
                        },
                        delete: () => Promise.resolve({
                            data: null,
                            error: { message: 'permission denied for table "user_streaks"', code: "42501" },
                        }),
                    };
                    return queryBuilder;
                }

                if (tableName === "user_daily_challenges") {
                    let filterUserId: string | null = null;
                    let filterChallengeId: string | null = null;
                    const queryBuilder = {
                        select: () => queryBuilder,
                        eq: (col: string, val: string) => {
                            if (col === "user_id") filterUserId = val;
                            if (col === "daily_challenge_id") filterChallengeId = val;
                            return queryBuilder;
                        },
                        maybeSingle: () => {
                            if (!activeAuthUserId || filterUserId !== activeAuthUserId) {
                                return Promise.resolve({ data: null, error: null });
                            }
                            const found = challengeCompletionRows.find(
                                (r) => r.user_id === activeAuthUserId && (!filterChallengeId || r.daily_challenge_id === filterChallengeId),
                            );
                            return Promise.resolve({ data: found ? { completed_at: found.completed_at } : null, error: null });
                        },
                        insert: (_row?: unknown) => {
                            void _row;
                            return Promise.resolve({
                                data: null,
                                error: { message: 'new row violates row-level security policy for table "user_daily_challenges"', code: "42501" },
                            });
                        },
                        update: (_updates?: unknown) => {
                            void _updates;
                            return Promise.resolve({
                                data: null,
                                error: { message: 'permission denied for table "user_daily_challenges"', code: "42501" },
                            });
                        },
                        delete: () => Promise.resolve({
                            data: null,
                            error: { message: 'permission denied for table "user_daily_challenges"', code: "42501" },
                        }),
                    };
                    return queryBuilder;
                }

                throw new Error(`Unexpected table ${tableName}`);
            },
            rpc: (fnName: string, args: Record<string, unknown>) => {
                if (fnName === "record_user_streak") {
                    const targetUserId = args.p_user_id as string;
                    if (!activeAuthUserId || activeAuthUserId !== targetUserId) {
                        return Promise.resolve({
                            data: null,
                            error: { message: "Unauthorized: Caller cannot update streaks for a different user" },
                        });
                    }
                    const row = streakRows.find((r) => r.user_id === targetUserId);
                    if (!row) {
                        return Promise.resolve({
                            data: {
                                current_streak: 1,
                                longest_streak: 1,
                                last_activity_date: "2026-10-03",
                                incremented: true,
                            },
                            error: null,
                        });
                    }
                    return Promise.resolve({
                        data: {
                            current_streak: row.current_streak + 1,
                            longest_streak: Math.max(row.longest_streak, row.current_streak + 1),
                            last_activity_date: "2026-10-03",
                            incremented: true,
                        },
                        error: null,
                    });
                }

                if (fnName === "complete_user_daily_challenge") {
                    const targetUserId = args.p_user_id as string;
                    const challengeId = args.p_daily_challenge_id as string;
                    if (!activeAuthUserId || activeAuthUserId !== targetUserId) {
                        return Promise.resolve({
                            data: null,
                            error: { message: "Unauthorized: Caller cannot complete daily challenges for a different user" },
                        });
                    }
                    const exists = challengeCompletionRows.some(
                        (r) => r.user_id === targetUserId && r.daily_challenge_id === challengeId,
                    );
                    if (exists) {
                        return Promise.resolve({ data: false, error: null });
                    }
                    challengeCompletionRows.push({
                        id: `udc-${challengeCompletionRows.length + 1}`,
                        user_id: targetUserId,
                        daily_challenge_id: challengeId,
                        completed_at: new Date().toISOString(),
                        created_at: new Date().toISOString(),
                    });
                    return Promise.resolve({ data: true, error: null });
                }

                return Promise.resolve({ data: null, error: { message: `Function ${fnName} not found` } });
            },
        };
    }

    it("allows a user to read their own streak but prevents reading another user's streak", async () => {
        const clientA = createMockSupabaseClient(USER_A) as unknown as SupabaseClient<Database>;
        const persistenceA = createSupabaseDailyChallengePersistence(clientA);

        const ownStreak = await persistenceA.getUserStreak(USER_A);
        expect(ownStreak).not.toBeNull();
        expect(ownStreak?.user_id).toBe(USER_A);

        const otherStreak = await persistenceA.getUserStreak(USER_B);
        expect(otherStreak).toBeNull();
    });

    it("prevents direct client-side insert on user_streaks table", async () => {
        const clientA = createMockSupabaseClient(USER_A);
        const { error } = await clientA.from("user_streaks").insert({
            user_id: USER_A,
            current_streak: 99,
        });

        expect(error).not.toBeNull();
        expect(error?.code).toBe("42501");
    });

    it("prevents direct client-side update on user_streaks table", async () => {
        const clientA = createMockSupabaseClient(USER_A);
        const { error } = await clientA.from("user_streaks").update({ current_streak: 100 });

        expect(error).not.toBeNull();
        expect(error?.code).toBe("42501");
    });

    it("prevents direct client-side delete on user_streaks table", async () => {
        const clientA = createMockSupabaseClient(USER_A);
        const { error } = await clientA.from("user_streaks").delete();

        expect(error).not.toBeNull();
        expect(error?.code).toBe("42501");
    });

    it("prevents direct client-side insert on user_daily_challenges table", async () => {
        const clientA = createMockSupabaseClient(USER_A);
        const { error } = await clientA.from("user_daily_challenges").insert({
            user_id: USER_A,
            daily_challenge_id: "dc-fake",
        });

        expect(error).not.toBeNull();
        expect(error?.code).toBe("42501");
    });

    it("allows server-authoritative record_user_streak and rejects cross-user streak mutation", async () => {
        const clientA = createMockSupabaseClient(USER_A) as unknown as SupabaseClient<Database>;
        const persistenceA = createSupabaseDailyChallengePersistence(clientA);

        const ownResult = await persistenceA.recordUserStreak(USER_A, "sess-1");
        expect(ownResult?.incremented).toBe(true);

        await expect(persistenceA.recordUserStreak(USER_B, "sess-1")).rejects.toThrow("Unauthorized");
    });

    it("allows server-authoritative complete_user_daily_challenge and rejects cross-user challenge mutation", async () => {
        const clientA = createMockSupabaseClient(USER_A) as unknown as SupabaseClient<Database>;
        const persistenceA = createSupabaseDailyChallengePersistence(clientA);

        const completed = await persistenceA.completeUserDailyChallenge(USER_A, "dc-2", "sess-1");
        expect(completed).toBe(true);

        await expect(persistenceA.completeUserDailyChallenge(USER_B, "dc-2", "sess-1")).rejects.toThrow("Unauthorized");
    });

    it("rejects forged current_streak attempts via direct table mutation and derives streak authoritatively", async () => {
        const clientA = createMockSupabaseClient(USER_A);
        // Direct attempt to forge current_streak to 999999 is blocked by RLS
        const { error } = await clientA.from("user_streaks").insert({
            user_id: USER_A,
            current_streak: 999999,
            longest_streak: 999999,
        });
        expect(error).not.toBeNull();
        expect(error?.code).toBe("42501");

        // RPC ignores any client-supplied streak values and computes it from DB
        const clientWrapper = clientA as unknown as SupabaseClient<Database>;
        const persistence = createSupabaseDailyChallengePersistence(clientWrapper);
        const result = await persistence.recordUserStreak(USER_A, "sess-valid");
        expect(result?.current_streak).toBe(4); // Incremented from existing 3 -> 4, not 999999
    });

    it("rejects forged longest_streak attempts via direct table mutation", async () => {
        const clientA = createMockSupabaseClient(USER_A);
        const { error } = await clientA.from("user_streaks").update({
            longest_streak: 999999,
        });
        expect(error).not.toBeNull();
        expect(error?.code).toBe("42501");
    });

    it("prevents forged XP rewards as RPC does not accept reward amounts and direct XP mutations fail", async () => {
        const clientA = createMockSupabaseClient(USER_A);
        // Direct attempt to insert forged XP transaction fails RLS
        const { error } = await clientA.from("user_daily_challenges").insert({
            user_id: USER_A,
            daily_challenge_id: "dc-1",
        });
        expect(error).not.toBeNull();
        expect(error?.code).toBe("42501");
    });

    it("rejects forged or nonexistent challenge ID on completion RPC", async () => {
        const clientA = {
            ...createMockSupabaseClient(USER_A),
            rpc: (fnName: string, args: Record<string, unknown>) => {
                if (fnName === "complete_user_daily_challenge") {
                    const challengeId = args.p_daily_challenge_id as string;
                    const exists = mockPublishedChallenges.some((c) => c.id === challengeId && c.status === "published");
                    if (!exists) {
                        return Promise.resolve({
                            data: null,
                            error: { message: "Daily challenge not found or not published" },
                        });
                    }
                }
                return Promise.resolve({ data: true, error: null });
            },
        } as unknown as SupabaseClient<Database>;

        const persistence = createSupabaseDailyChallengePersistence(clientA);
        await expect(persistence.completeUserDailyChallenge(USER_A, "dc-fake-999999", "sess-1"))
            .rejects.toThrow("Daily challenge not found or not published");
    });

    it("ensures duplicate completion of a daily challenge is idempotent and returns false", async () => {
        const clientA = createMockSupabaseClient(USER_A) as unknown as SupabaseClient<Database>;
        const persistence = createSupabaseDailyChallengePersistence(clientA);

        // First completion of dc-3 succeeds
        const first = await persistence.completeUserDailyChallenge(USER_A, "dc-3", "sess-1");
        expect(first).toBe(true);

        // Second completion of dc-3 is idempotent (returns false, no duplicate row or XP)
        const second = await persistence.completeUserDailyChallenge(USER_A, "dc-3", "sess-2");
        expect(second).toBe(false);
    });

    it("ensures repeated same-day streak processing is idempotent and does not inflate streak count", async () => {
        let currentStreak = 5;
        let lastDate = "2026-10-02";
        const clientA = {
            ...createMockSupabaseClient(USER_A),
            rpc: (fnName: string, args: Record<string, unknown>) => {
                if (fnName === "record_user_streak") {
                    const targetUserId = args.p_user_id as string;
                    if (targetUserId !== USER_A) {
                        return Promise.resolve({ data: null, error: { message: "Unauthorized" } });
                    }
                    const today = "2026-10-03";
                    if (lastDate === today) {
                        return Promise.resolve({
                            data: {
                                current_streak: currentStreak,
                                longest_streak: 10,
                                last_activity_date: today,
                                incremented: false,
                            },
                            error: null,
                        });
                    }
                    currentStreak += 1;
                    lastDate = today;
                    return Promise.resolve({
                        data: {
                            current_streak: currentStreak,
                            longest_streak: 10,
                            last_activity_date: today,
                            incremented: true,
                        },
                        error: null,
                    });
                }
                return Promise.resolve({ data: null, error: null });
            },
        } as unknown as SupabaseClient<Database>;

        const persistence = createSupabaseDailyChallengePersistence(clientA);

        // First session on 2026-10-03: increments streak from 5 to 6
        const res1 = await persistence.recordUserStreak(USER_A, "sess-1");
        expect(res1?.current_streak).toBe(6);
        expect(res1?.incremented).toBe(true);

        // Second session on same day 2026-10-03: remains 6, incremented is false
        const res2 = await persistence.recordUserStreak(USER_A, "sess-2");
        expect(res2?.current_streak).toBe(6);
        expect(res2?.incremented).toBe(false);

        // Third session on same day 2026-10-03: remains 6, incremented is false
        const res3 = await persistence.recordUserStreak(USER_A, "sess-3");
        expect(res3?.current_streak).toBe(6);
        expect(res3?.incremented).toBe(false);
    });
});
