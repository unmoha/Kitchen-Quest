import { describe, expect, it } from "vitest";
import {
    AchievementService,
    createSupabaseAchievementPersistence,
    type AchievementPersistence,
} from "./service";
import type { Database } from "@/types/database";
import type {
    AchievementEvaluationContext,
    AchievementRow,
    UserAchievementRow,
} from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

function createMockAchievementPersistence(options?: {
    achievements?: AchievementRow[];
    userUnlocks?: UserAchievementRow[];
    context?: Partial<AchievementEvaluationContext>;
}): AchievementPersistence & { userUnlocks: UserAchievementRow[] } {
    const achievements: AchievementRow[] = options?.achievements ?? [
        {
            id: "ach-first-quest",
            name: "First Quest",
            slug: "first-quest",
            description: "Complete your first game session.",
            icon: "award",
            requirement: { kind: "game_sessions_completed", count: 1 },
            status: "published",
            created_at: "2026-01-01T00:00:00.000Z",
        },
        {
            id: "ach-game-explorer",
            name: "Game Explorer",
            slug: "game-explorer",
            description: "Play 3 distinct game modes.",
            icon: "compass",
            requirement: { kind: "distinct_game_modes", count: 3 },
            status: "published",
            created_at: "2026-01-01T00:00:00.000Z",
        },
        {
            id: "ach-prep-cook",
            name: "Prep Cook Rank",
            slug: "prep-cook-rank",
            description: "Reach Chef Level 2.",
            icon: "chef-hat",
            requirement: { kind: "min_level", level: 2 },
            status: "published",
            created_at: "2026-01-01T00:00:00.000Z",
        },
    ];

    const userUnlocks: UserAchievementRow[] = [...(options?.userUnlocks ?? [])];

    const defaultContext: AchievementEvaluationContext = {
        completedSessionCount: 0,
        completedGameModes: [],
        userLevel: 1,
        totalXp: 0,
        completedModuleIds: [],
        completedModuleSlugs: [],
        completedRecipeIds: [],
        completedRecipeSlugs: [],
        highestMasteryScore: 0,
        distinctLearningDaysCount: 0,
        distinctCuisineCount: 0,
        ...options?.context,
    };

    return {
        userUnlocks,
        async getPublishedAchievements() {
            return achievements.filter((a) => a.status === "published");
        },
        async getUserAchievements(userId: string) {
            return userUnlocks.filter((u) => u.user_id === userId);
        },
        async getUserEvaluationContext() {
            return defaultContext;
        },
        async unlockAchievement(userId: string, achievementId: string) {
            const exists = userUnlocks.some(
                (u) => u.user_id === userId && u.achievement_id === achievementId,
            );
            if (exists) {
                return false;
            }
            userUnlocks.push({
                id: `unlock-${userUnlocks.length + 1}`,
                user_id: userId,
                achievement_id: achievementId,
                unlocked_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
            });
            return true;
        },
    };
}

describe("AchievementService - Server-Authoritative Evaluation & Summary", () => {
    const USER_A = "user-a-uuid";
    const USER_B = "user-b-uuid";

    it("requires authenticated user for queries and evaluation", async () => {
        const persistence = createMockAchievementPersistence();
        const service = new AchievementService(persistence);

        await expect(service.getAchievementsWithProgress()).rejects.toThrow("You must be authenticated");
        await expect(service.getAchievementsSummary()).rejects.toThrow("You must be authenticated");
        await expect(service.evaluateAndUnlockAchievements()).rejects.toThrow("You must be authenticated");
    });

    it("returns locked state with 0 progress when no conditions are satisfied", async () => {
        const persistence = createMockAchievementPersistence({
            context: { completedSessionCount: 0, completedGameModes: [], userLevel: 1 },
        });
        const service = new AchievementService(persistence, USER_A);

        const items = await service.getAchievementsWithProgress();
        expect(items).toHaveLength(3);
        expect(items.every((i) => !i.isUnlocked)).toBe(true);

        const summary = await service.getAchievementsSummary();
        expect(summary.totalAchievements).toBe(3);
        expect(summary.unlockedCount).toBe(0);
        expect(summary.percentComplete).toBe(0);
        expect(summary.recentUnlocks).toHaveLength(0);
    });

    it("evaluates and unlocks achievements when requirements are satisfied", async () => {
        const persistence = createMockAchievementPersistence({
            context: {
                completedSessionCount: 1,
                completedGameModes: ["ingredient_quiz"],
                userLevel: 1,
            },
        });
        const service = new AchievementService(persistence, USER_A);

        // First evaluation: 'First Quest' should unlock
        const newlyUnlocked = await service.evaluateAndUnlockAchievements();
        expect(newlyUnlocked).toHaveLength(1);
        expect(newlyUnlocked[0].slug).toBe("first-quest");

        // Verify persisted state
        expect(persistence.userUnlocks).toHaveLength(1);
        expect(persistence.userUnlocks[0].achievement_id).toBe("ach-first-quest");

        // Re-evaluating immediately returns no newly unlocked achievements (idempotency)
        const reEval = await service.evaluateAndUnlockAchievements();
        expect(reEval).toHaveLength(0);
        expect(persistence.userUnlocks).toHaveLength(1);
    });

    it("calculates summary statistics and lists recently unlocked items", async () => {
        const persistence = createMockAchievementPersistence({
            userUnlocks: [
                {
                    id: "u-1",
                    user_id: USER_A,
                    achievement_id: "ach-first-quest",
                    unlocked_at: "2026-03-01T10:00:00.000Z",
                    created_at: "2026-03-01T10:00:00.000Z",
                },
            ],
            context: {
                completedSessionCount: 1,
                completedGameModes: ["ingredient_quiz", "recipe_builder"],
                userLevel: 1,
            },
        });
        const service = new AchievementService(persistence, USER_A);

        const summary = await service.getAchievementsSummary();
        expect(summary.totalAchievements).toBe(3);
        expect(summary.unlockedCount).toBe(1);
        expect(summary.percentComplete).toBe(33);
        expect(summary.recentUnlocks).toHaveLength(1);
        expect(summary.recentUnlocks[0].slug).toBe("first-quest");
    });

    it("isolates achievements between distinct users", async () => {
        const persistence = createMockAchievementPersistence({
            userUnlocks: [
                {
                    id: "u-a-1",
                    user_id: USER_A,
                    achievement_id: "ach-first-quest",
                    unlocked_at: "2026-03-01T10:00:00.000Z",
                    created_at: "2026-03-01T10:00:00.000Z",
                },
            ],
        });
        const serviceA = new AchievementService(persistence, USER_A);
        const serviceB = new AchievementService(persistence, USER_B);

        const summaryA = await serviceA.getAchievementsSummary();
        const summaryB = await serviceB.getAchievementsSummary();

        expect(summaryA.unlockedCount).toBe(1);
        expect(summaryB.unlockedCount).toBe(0);
    });
});

describe("Database RLS & Server Authoritative Achievement Unlock Security", () => {
    const USER_A = "11111111-1111-4111-8111-111111111111";
    const USER_B = "22222222-2222-4222-8222-222222222222";

    function createMockSupabaseClient(activeAuthUserId: string | null) {
        const dbTableRows: UserAchievementRow[] = [
            {
                id: "ua-1",
                user_id: USER_A,
                achievement_id: "ach-1",
                unlocked_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
            },
        ];

        return {
            from: (tableName: string) => {
                if (tableName === "achievements") {
                    const queryBuilder = {
                        select: () => queryBuilder,
                        eq: () => queryBuilder,
                        order: () => Promise.resolve({
                            data: [
                                {
                                    id: "ach-1",
                                    name: "First Quest",
                                    slug: "first-quest",
                                    description: "Complete your first game session.",
                                    icon: "award",
                                    requirement: { kind: "game_sessions_completed", count: 1 },
                                    status: "published",
                                    created_at: new Date().toISOString(),
                                },
                            ],
                            error: null,
                        }),
                        insert: (_row?: unknown) => {
                            void _row;
                            return Promise.resolve({
                                data: null,
                                error: {
                                    message: 'permission denied for table "achievements"',
                                    code: "42501",
                                },
                            });
                        },
                        update: (_updates?: unknown) => {
                            void _updates;
                            return Promise.resolve({
                                data: null,
                                error: {
                                    message: 'permission denied for table "achievements"',
                                    code: "42501",
                                },
                            });
                        },
                        delete: () => {
                            return Promise.resolve({
                                data: null,
                                error: {
                                    message: 'permission denied for table "achievements"',
                                    code: "42501",
                                },
                            });
                        },
                    };
                    return queryBuilder;
                }

                if (tableName !== "user_achievements") {
                    throw new Error(`Unexpected table ${tableName}`);
                }

                let filterUserId: string | null = null;

                const queryBuilder = {
                    select: () => queryBuilder,
                    eq: (col: string, val: string) => {
                        if (col === "user_id") {
                            filterUserId = val;
                        }
                        return queryBuilder;
                    },
                    order: () => {
                        // RLS SELECT enforcement: auth.uid() = user_id
                        if (!activeAuthUserId || filterUserId !== activeAuthUserId) {
                            return Promise.resolve({ data: [], error: null });
                        }
                        const filtered = dbTableRows.filter((r) => r.user_id === activeAuthUserId);
                        return Promise.resolve({ data: filtered, error: null });
                    },
                    // Direct table modifications should fail due to lack of RLS policies / grants:
                    insert: (_row?: unknown) => {
                        void _row;
                        return Promise.resolve({
                            data: null,
                            error: {
                                message: 'new row violates row-level security policy for table "user_achievements"',
                                code: "42501",
                            },
                        });
                    },
                    update: (_updates?: unknown) => {
                        void _updates;
                        return Promise.resolve({
                            data: null,
                            error: {
                                message: 'permission denied for table "user_achievements"',
                                code: "42501",
                            },
                        });
                    },
                    delete: () => {
                        return Promise.resolve({
                            data: null,
                            error: {
                                message: 'permission denied for table "user_achievements"',
                                code: "42501",
                            },
                        });
                    },
                };

                return queryBuilder;
            },
            rpc: (fnName: string, args: Record<string, unknown>) => {
                if (fnName !== "unlock_user_achievement") {
                    return Promise.resolve({ data: null, error: { message: `Function ${fnName} not found` } });
                }

                const targetUserId = args.p_user_id as string;
                const achievementId = args.p_achievement_id as string;

                if (!activeAuthUserId || activeAuthUserId !== targetUserId) {
                    return Promise.resolve({
                        data: null,
                        error: { message: "Unauthorized: Caller cannot unlock achievements for a different user" },
                    });
                }

                const duplicate = dbTableRows.some(
                    (r) => r.user_id === targetUserId && r.achievement_id === achievementId,
                );
                if (duplicate) {
                    return Promise.resolve({ data: null, error: null });
                }

                const newId = `rpc-ua-${dbTableRows.length + 1}`;
                dbTableRows.push({
                    id: newId,
                    user_id: targetUserId,
                    achievement_id: achievementId,
                    unlocked_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                });

                return Promise.resolve({ data: newId, error: null });
            },
        };
    }

    it("allows a user to read their own unlocked achievements", async () => {
        const client = createMockSupabaseClient(USER_A) as unknown as SupabaseClient<Database>;
        const persistence = createSupabaseAchievementPersistence(client);

        const items = await persistence.getUserAchievements(USER_A);
        expect(items).toHaveLength(1);
        expect(items[0].achievement_id).toBe("ach-1");
    });

    it("prevents a user from reading another user's unlocked achievements", async () => {
        const client = createMockSupabaseClient(USER_A) as unknown as SupabaseClient<Database>;
        const persistence = createSupabaseAchievementPersistence(client);

        const items = await persistence.getUserAchievements(USER_B);
        expect(items).toHaveLength(0);
    });

    it("prevents direct client-side insert on user_achievements table", async () => {
        const client = createMockSupabaseClient(USER_A);
        const { error } = await client.from("user_achievements").insert({
            user_id: USER_A,
            achievement_id: "ach-fake",
        });

        expect(error).not.toBeNull();
        expect(error?.code).toBe("42501");
    });

    it("prevents direct client-side update on user_achievements table", async () => {
        const client = createMockSupabaseClient(USER_A);
        const { error } = await client.from("user_achievements").update({ achievement_id: "ach-hacked" });

        expect(error).not.toBeNull();
        expect(error?.code).toBe("42501");
    });

    it("prevents direct client-side delete on user_achievements table", async () => {
        const client = createMockSupabaseClient(USER_A);
        const { error } = await client.from("user_achievements").delete();

        expect(error).not.toBeNull();
        expect(error?.code).toBe("42501");
    });

    it("allows server-side legitimate unlock via unlock_user_achievement RPC", async () => {
        const client = createMockSupabaseClient(USER_A) as unknown as SupabaseClient<Database>;
        const persistence = createSupabaseAchievementPersistence(client);

        const unlocked = await persistence.unlockAchievement(USER_A, "ach-2");
        expect(unlocked).toBe(true);

        const userItems = await persistence.getUserAchievements(USER_A);
        expect(userItems).toHaveLength(2);
    });

    it("blocks duplicate unlocks via unlock_user_achievement RPC (idempotency)", async () => {
        const client = createMockSupabaseClient(USER_A) as unknown as SupabaseClient<Database>;
        const persistence = createSupabaseAchievementPersistence(client);

        const first = await persistence.unlockAchievement(USER_A, "ach-repeat");
        expect(first).toBe(true);

        const second = await persistence.unlockAchievement(USER_A, "ach-repeat");
        expect(second).toBe(false);

        const userItems = await persistence.getUserAchievements(USER_A);
        expect(userItems.filter((i) => i.achievement_id === "ach-repeat")).toHaveLength(1);
    });

    it("rejects unlocking achievements for a different user via RPC", async () => {
        const client = createMockSupabaseClient(USER_A) as unknown as SupabaseClient<Database>;
        const persistence = createSupabaseAchievementPersistence(client);

        await expect(
            persistence.unlockAchievement(USER_B, "ach-spoofed"),
        ).rejects.toThrow("Unauthorized: Caller cannot unlock achievements for a different user");
    });
});
