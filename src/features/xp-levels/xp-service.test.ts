import { describe, expect, it } from "vitest";
import { XpService, createSupabaseXpPersistence, type XpPersistence } from "./service";
import type { Database, XpSourceType } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type UserXpTransactionRow = Database["public"]["Tables"]["user_xp_transactions"]["Row"];

function createMockXpPersistence(initialRows: UserXpTransactionRow[] = []): XpPersistence & { rows: UserXpTransactionRow[] } {
    const rows = [...initialRows];

    return {
        rows,
        async getUserXpTransactions(userId: string, limit = 20) {
            return rows
                .filter((r) => r.user_id === userId)
                .sort((a, b) => b.created_at.localeCompare(a.created_at))
                .slice(0, limit);
        },
        async getUserTotalXp(userId: string) {
            return rows
                .filter((r) => r.user_id === userId)
                .reduce((sum, r) => sum + r.amount, 0);
        },
        async insertXpTransaction(input) {
            // Check unique constraint: (user_id, source_type, source_id)
            const exists = rows.some(
                (r) => r.user_id === input.userId
                    && r.source_type === input.sourceType
                    && r.source_id === input.sourceId,
            );
            if (exists) {
                return false;
            }

            rows.push({
                id: `xp-tx-${rows.length + 1}`,
                user_id: input.userId,
                amount: input.amount,
                source_type: input.sourceType,
                source_id: input.sourceId,
                description: input.description,
                created_at: new Date().toISOString(),
            });
            return true;
        },
    };
}

describe("XpService - Server Authoritative Progression & Idempotency", () => {
    const USER_A = "user-a-uuid";
    const USER_B = "user-b-uuid";

    it("requires authenticated user to access or update XP", async () => {
        const persistence = createMockXpPersistence();
        const service = new XpService(persistence);

        await expect(service.getUserLevelInfo()).rejects.toThrow("You must be authenticated to access or update XP.");
        await expect(service.awardAnswerXp({ attemptId: "att-1", isCorrect: true })).rejects.toThrow("You must be authenticated");
    });

    it("calculates initial user level info (0 XP -> Level 1)", async () => {
        const persistence = createMockXpPersistence();
        const service = new XpService(persistence, USER_A);

        const levelInfo = await service.getUserLevelInfo();
        expect(levelInfo.level).toBe(1);
        expect(levelInfo.totalXp).toBe(0);
        expect(levelInfo.progressPercent).toBe(0);
    });

    it("awards 10 XP for correct answers and 0 XP for incorrect answers", async () => {
        const persistence = createMockXpPersistence();
        const service = new XpService(persistence, USER_A);

        // Incorrect answer -> 0 XP
        const incorrectResult = await service.awardAnswerXp({
            attemptId: "att-incorrect-1",
            isCorrect: false,
        });
        expect(incorrectResult.awarded).toBe(false);
        expect(incorrectResult.amount).toBe(0);

        // Correct answer -> +10 XP
        const correctResult = await service.awardAnswerXp({
            attemptId: "att-correct-1",
            isCorrect: true,
        });
        expect(correctResult.awarded).toBe(true);
        expect(correctResult.amount).toBe(10);

        const levelInfo = await service.getUserLevelInfo();
        expect(levelInfo.totalXp).toBe(10);
    });

    it("protects answer XP against duplicate submissions (idempotency)", async () => {
        const persistence = createMockXpPersistence();
        const service = new XpService(persistence, USER_A);

        const first = await service.awardAnswerXp({ attemptId: "att-1", isCorrect: true });
        expect(first.awarded).toBe(true);
        expect(first.amount).toBe(10);

        // Duplicate call with same attemptId
        const second = await service.awardAnswerXp({ attemptId: "att-1", isCorrect: true });
        expect(second.awarded).toBe(false);
        expect(second.amount).toBe(0);

        const total = await persistence.getUserTotalXp(USER_A);
        expect(total).toBe(10);
    });

    it("awards 25 XP for session completion exactly once per session", async () => {
        const persistence = createMockXpPersistence();
        const service = new XpService(persistence, USER_A);

        const first = await service.awardSessionCompletionXp({ sessionId: "session-1" });
        expect(first.awarded).toBe(true);
        expect(first.amount).toBe(25);

        // Replaying/refreshing the same session completion
        const duplicate = await service.awardSessionCompletionXp({ sessionId: "session-1" });
        expect(duplicate.awarded).toBe(false);
        expect(duplicate.amount).toBe(0);

        const total = await persistence.getUserTotalXp(USER_A);
        expect(total).toBe(25);
    });

    it("awards 25 XP for first-time learning completion, but 0 XP for replays", async () => {
        const persistence = createMockXpPersistence();
        const service = new XpService(persistence, USER_A);

        // First completion of module
        const first = await service.awardLearningCompletionXp({
            targetType: "learning_module",
            targetId: "module-knife-skills",
            isFirstCompletion: true,
            title: "Knife Skills",
        });
        expect(first.awarded).toBe(true);
        expect(first.amount).toBe(25);

        // Replaying previously completed module
        const replay = await service.awardLearningCompletionXp({
            targetType: "learning_module",
            targetId: "module-knife-skills",
            isFirstCompletion: false,
            title: "Knife Skills",
        });
        expect(replay.awarded).toBe(false);
        expect(replay.amount).toBe(0);

        // Attempting to re-award first completion for the same module target ID (ledger uniqueness)
        const duplicateFirst = await service.awardLearningCompletionXp({
            targetType: "learning_module",
            targetId: "module-knife-skills",
            isFirstCompletion: true,
            title: "Knife Skills",
        });
        expect(duplicateFirst.awarded).toBe(false);
        expect(duplicateFirst.amount).toBe(0);

        const total = await persistence.getUserTotalXp(USER_A);
        expect(total).toBe(25);
    });

    it("processes complete session XP calculation (3 correct + completion + newly completed target = 80 XP)", async () => {
        const persistence = createMockXpPersistence();
        const service = new XpService(persistence, USER_A);

        const summary = await service.processSessionXp({
            sessionId: "session-full-1",
            correctAttemptIds: ["att-1", "att-2", "att-3"],
            newlyCompletedTargets: [
                { targetId: "module-food-safety", targetType: "learning_module", title: "Food Safety" },
            ],
            sessionDescription: "Completed Kitchen Challenge",
        });

        // 3 correct (30 XP) + completion (25 XP) + learning completion (25 XP) = 80 XP
        expect(summary.totalXpEarned).toBe(80);
        expect(summary.breakdown).toHaveLength(5);
        expect(summary.levelInfo.totalXp).toBe(80);
        expect(summary.levelInfo.level).toBe(1);
        expect(summary.leveledUp).toBe(false);
    });

    it("correctly detects level up when crossing boundary (e.g. from 80 XP to 135 XP -> Level 2)", async () => {
        const persistence = createMockXpPersistence();
        const service = new XpService(persistence, USER_A);

        // Initial session brings user to 80 XP (Level 1)
        await service.processSessionXp({
            sessionId: "session-1",
            correctAttemptIds: ["att-1", "att-2", "att-3"],
            newlyCompletedTargets: [{ targetId: "target-1", targetType: "recipe", title: "Tomato Pasta" }],
        });

        // Second session awards 3 correct (30 XP) + completion (25 XP) = 55 XP -> Total 135 XP (Level 2)
        const summary2 = await service.processSessionXp({
            sessionId: "session-2",
            correctAttemptIds: ["att-4", "att-5", "att-6"],
            newlyCompletedTargets: [], // target already completed
        });

        expect(summary2.totalXpEarned).toBe(55);
        expect(summary2.levelInfo.totalXp).toBe(135);
        expect(summary2.levelInfo.level).toBe(2);
        expect(summary2.leveledUp).toBe(true);
        expect(summary2.previousLevel).toBe(1);
        expect(summary2.currentLevel).toBe(2);
    });

    it("isolates XP data completely between different users", async () => {
        const persistence = createMockXpPersistence();
        const serviceA = new XpService(persistence, USER_A);
        const serviceB = new XpService(persistence, USER_B);

        await serviceA.awardAnswerXp({ attemptId: "att-a-1", isCorrect: true });
        await serviceA.awardSessionCompletionXp({ sessionId: "session-a-1" });

        const infoA = await serviceA.getUserLevelInfo();
        const infoB = await serviceB.getUserLevelInfo();

        expect(infoA.totalXp).toBe(35);
        expect(infoB.totalXp).toBe(0);
    });
});

describe("Database RLS & Server Authoritative XP Persistence Security", () => {
    const USER_A = "11111111-1111-4111-8111-111111111111";
    const USER_B = "22222222-2222-4222-8222-222222222222";

    // Simulates Postgres RLS policy behavior:
    // SELECT: allowed if auth.uid() = user_id
    // INSERT: denied for all client calls (no INSERT policy)
    // UPDATE: denied for all client calls (no UPDATE policy)
    // DELETE: denied for all client calls (no DELETE policy)
    // RPC 'award_user_xp': SECURITY DEFINER server-authoritative function
    function createMockSupabaseClient(activeAuthUserId: string | null) {
        const dbTableRows: UserXpTransactionRow[] = [
            {
                id: "tx-a-1",
                user_id: USER_A,
                amount: 10,
                source_type: "game_answer",
                source_id: "att-1",
                description: "Correct answer",
                created_at: new Date(Date.now() - 10000).toISOString(),
            },
            {
                id: "tx-b-1",
                user_id: USER_B,
                amount: 25,
                source_type: "game_session_completion",
                source_id: "session-b-1",
                description: "Completed game session",
                created_at: new Date(Date.now() - 5000).toISOString(),
            },
        ];

        return {
            from: (tableName: string) => {
                if (tableName !== "user_xp_transactions") {
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
                    order: () => queryBuilder,
                    limit: (count: number) => {
                        // RLS enforcement for SELECT: auth.uid() = user_id
                        if (!activeAuthUserId || filterUserId !== activeAuthUserId) {
                            return Promise.resolve({ data: [], error: null });
                        }
                        const filtered = dbTableRows.filter(r => r.user_id === activeAuthUserId).slice(0, count);
                        return Promise.resolve({ data: filtered, error: null });
                    },
                    then: (resolve: (res: { data: Array<{ amount: number }> | null; error: null }) => void) => {
                        // For .select("amount").eq("user_id", userId)
                        if (!activeAuthUserId || filterUserId !== activeAuthUserId) {
                            resolve({ data: [], error: null });
                            return;
                        }
                        const filtered = dbTableRows.filter(r => r.user_id === activeAuthUserId);
                        resolve({ data: filtered.map(r => ({ amount: r.amount })), error: null });
                    },
                    // Direct table modifications should fail due to lack of RLS policies / grants:
                    insert: (_row?: unknown) => {
                        void _row;
                        return Promise.resolve({
                            data: null,
                            error: {
                                message: 'new row violates row-level security policy for table "user_xp_transactions"',
                                code: "42501",
                            },
                        });
                    },
                    update: (_updates?: unknown) => {
                        void _updates;
                        return Promise.resolve({
                            data: null,
                            error: {
                                message: 'permission denied for table "user_xp_transactions"',
                                code: "42501",
                            },
                        });
                    },
                    delete: () => {
                        return Promise.resolve({
                            data: null,
                            error: {
                                message: 'permission denied for table "user_xp_transactions"',
                                code: "42501",
                            },
                        });
                    },
                };

                return queryBuilder;
            },
            rpc: (fnName: string, args: Record<string, unknown>) => {
                if (fnName !== "award_user_xp") {
                    return Promise.resolve({ data: null, error: { message: `Function ${fnName} not found` } });
                }

                // Verify SECURITY DEFINER checks
                const targetUserId = args.p_user_id as string;
                const amount = args.p_amount as number;
                const sourceType = args.p_source_type as XpSourceType;
                const sourceId = args.p_source_id as string;
                const description = (args.p_description as string) || "XP Award";

                if (!activeAuthUserId || activeAuthUserId !== targetUserId) {
                    return Promise.resolve({
                        data: null,
                        error: { message: "Unauthorized: Caller cannot award XP for a different user" },
                    });
                }

                if (amount <= 0) {
                    return Promise.resolve({
                        data: null,
                        error: { message: `Invalid XP amount: ${amount}` },
                    });
                }

                // Check unique constraint idempotency
                const duplicate = dbTableRows.some(
                    r => r.user_id === targetUserId && r.source_type === sourceType && r.source_id === sourceId,
                );
                if (duplicate) {
                    // ON CONFLICT DO NOTHING returns NULL id
                    return Promise.resolve({ data: null, error: null });
                }

                const newId = `rpc-tx-${dbTableRows.length + 1}`;
                dbTableRows.push({
                    id: newId,
                    user_id: targetUserId,
                    amount,
                    source_type: sourceType,
                    source_id: sourceId,
                    description,
                    created_at: new Date().toISOString(),
                });

                return Promise.resolve({ data: newId, error: null });
            },
        };
    }

    it("allows a user to read their own XP transactions", async () => {
        const client = createMockSupabaseClient(USER_A) as unknown as SupabaseClient<Database>;
        const persistence = createSupabaseXpPersistence(client);

        const txs = await persistence.getUserXpTransactions(USER_A);
        expect(txs).toHaveLength(1);
        expect(txs[0].user_id).toBe(USER_A);
        expect(txs[0].amount).toBe(10);

        const total = await persistence.getUserTotalXp(USER_A);
        expect(total).toBe(10);
    });

    it("prevents a user from reading another user's XP transactions", async () => {
        const client = createMockSupabaseClient(USER_A) as unknown as SupabaseClient<Database>;
        const persistence = createSupabaseXpPersistence(client);

        // User A trying to query User B's transactions yields empty results
        const txs = await persistence.getUserXpTransactions(USER_B);
        expect(txs).toHaveLength(0);

        const total = await persistence.getUserTotalXp(USER_B);
        expect(total).toBe(0);
    });

    it("prevents direct client-side insert on user_xp_transactions table", async () => {
        const client = createMockSupabaseClient(USER_A);
        const { error } = await client.from("user_xp_transactions").insert({
            user_id: USER_A,
            amount: 9999,
            source_type: "game_answer",
            source_id: "fake-attempt",
            description: "Hacked XP",
        });

        expect(error).not.toBeNull();
        expect(error?.code).toBe("42501");
    });

    it("prevents direct client-side update on user_xp_transactions table", async () => {
        const client = createMockSupabaseClient(USER_A);
        const { error } = await client.from("user_xp_transactions").update({ amount: 9999 });

        expect(error).not.toBeNull();
        expect(error?.code).toBe("42501");
    });

    it("prevents direct client-side delete on user_xp_transactions table", async () => {
        const client = createMockSupabaseClient(USER_A);
        const { error } = await client.from("user_xp_transactions").delete();

        expect(error).not.toBeNull();
        expect(error?.code).toBe("42501");
    });

    it("allows server-side legitimate XP awarding via award_user_xp RPC", async () => {
        const client = createMockSupabaseClient(USER_A) as unknown as SupabaseClient<Database>;
        const persistence = createSupabaseXpPersistence(client);

        const inserted = await persistence.insertXpTransaction({
            userId: USER_A,
            amount: 25,
            sourceType: "game_session_completion",
            sourceId: "session-a-new",
            description: "Completed game session",
        });

        expect(inserted).toBe(true);

        const total = await persistence.getUserTotalXp(USER_A);
        expect(total).toBe(35); // 10 initial + 25 newly awarded
    });

    it("blocks duplicate rewards when calling award_user_xp RPC multiple times", async () => {
        const client = createMockSupabaseClient(USER_A) as unknown as SupabaseClient<Database>;
        const persistence = createSupabaseXpPersistence(client);

        const first = await persistence.insertXpTransaction({
            userId: USER_A,
            amount: 25,
            sourceType: "game_session_completion",
            sourceId: "session-a-repeat",
            description: "Completed game session",
        });
        expect(first).toBe(true);

        const second = await persistence.insertXpTransaction({
            userId: USER_A,
            amount: 25,
            sourceType: "game_session_completion",
            sourceId: "session-a-repeat",
            description: "Completed game session",
        });
        expect(second).toBe(false);

        const total = await persistence.getUserTotalXp(USER_A);
        expect(total).toBe(35); // only awarded once
    });

    it("rejects awarding XP to a different user via award_user_xp RPC", async () => {
        const client = createMockSupabaseClient(USER_A) as unknown as SupabaseClient<Database>;
        const persistence = createSupabaseXpPersistence(client);

        // User A trying to award XP to User B
        await expect(
            persistence.insertXpTransaction({
                userId: USER_B,
                amount: 25,
                sourceType: "game_session_completion",
                sourceId: "session-spoofed",
                description: "Unauthorized award",
            }),
        ).rejects.toThrow("Unauthorized: Caller cannot award XP for a different user");
    });
});
