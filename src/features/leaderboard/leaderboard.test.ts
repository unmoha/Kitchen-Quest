import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
    createSupabaseLeaderboardPersistence,
    DEFAULT_PAGE_SIZE,
    LeaderboardService,
    sanitizePagination,
    type LeaderboardPersistence,
} from "./service";
import type { RawLeaderboardRow, RawUserRankRow } from "./types";

const USER_ALICE = "11111111-1111-4111-8111-111111111111";
const USER_BOB = "22222222-2222-4222-8222-222222222222";
const USER_CHARLIE = "33333333-3333-4333-8333-333333333333";
const USER_DANA = "44444444-4444-4444-8444-444444444444";
const USER_ZERO_XP = "55555555-5555-4555-8555-555555555555";

interface UserRecord {
    id: string;
    display_name: string;
    avatar_url: string | null;
    email?: string;
}

interface XpRecord {
    user_id: string;
    amount: number;
    created_at: string;
}

function createMockLeaderboardEnvironment(options?: {
    users?: UserRecord[];
    xpTransactions?: XpRecord[];
}) {
    const users: UserRecord[] = options?.users ?? [
        { id: USER_ALICE, display_name: "Alice", avatar_url: null, email: "alice@example.com" },
        { id: USER_BOB, display_name: "Bob", avatar_url: null, email: "bob@example.com" },
        { id: USER_CHARLIE, display_name: "Charlie", avatar_url: null, email: "charlie@example.com" },
        { id: USER_DANA, display_name: "Dana", avatar_url: null, email: "dana@example.com" },
        { id: USER_ZERO_XP, display_name: "Newbie", avatar_url: null, email: "newbie@example.com" },
    ];

    const xpTransactions: XpRecord[] = options?.xpTransactions ?? [
        { user_id: USER_ALICE, amount: 500, created_at: "2026-10-01T10:00:00Z" },
        { user_id: USER_BOB, amount: 300, created_at: "2026-10-01T11:00:00Z" },
        { user_id: USER_BOB, amount: 200, created_at: "2026-10-02T11:00:00Z" }, // Bob total = 500 (tied with Alice)
        { user_id: USER_CHARLIE, amount: 450, created_at: "2026-10-01T12:00:00Z" },
        { user_id: USER_DANA, amount: 150, created_at: "2026-10-01T13:00:00Z" },
    ];

    // Compute standard rank() over (order by sum(amount) desc)
    function calculateStandings(): Array<{
        user_id: string;
        rank: number;
        display_name: string;
        avatar_url: string | null;
        total_xp: number;
        first_earned_at: string;
    }> {
        const userTotals = new Map<string, { total: number; firstEarned: string }>();
        for (const tx of xpTransactions) {
            const current = userTotals.get(tx.user_id) ?? { total: 0, firstEarned: tx.created_at };
            current.total += tx.amount;
            if (new Date(tx.created_at) < new Date(current.firstEarned)) {
                current.firstEarned = tx.created_at;
            }
            userTotals.set(tx.user_id, current);
        }

        const validEntries: Array<{
            user_id: string;
            total_xp: number;
            first_earned_at: string;
            display_name: string;
            avatar_url: string | null;
        }> = [];

        for (const [userId, data] of userTotals.entries()) {
            if (data.total > 0) {
                const user = users.find((u) => u.id === userId);
                if (user) {
                    validEntries.push({
                        user_id: userId,
                        total_xp: data.total,
                        first_earned_at: data.firstEarned,
                        display_name: user.display_name,
                        avatar_url: user.avatar_url,
                    });
                }
            }
        }

        // Sort primarily by total_xp DESC, secondary by first_earned_at ASC, tertiary by user_id ASC
        validEntries.sort((a, b) => {
            if (b.total_xp !== a.total_xp) {
                return b.total_xp - a.total_xp;
            }
            if (a.first_earned_at !== b.first_earned_at) {
                return a.first_earned_at.localeCompare(b.first_earned_at);
            }
            return a.user_id.localeCompare(b.user_id);
        });

        // Compute rank with standard competitive ranking (tied players share rank)
        const ranked: Array<{
            user_id: string;
            rank: number;
            display_name: string;
            avatar_url: string | null;
            total_xp: number;
            first_earned_at: string;
        }> = [];

        let currentRank = 1;
        for (let i = 0; i < validEntries.length; i++) {
            if (i > 0 && validEntries[i].total_xp < validEntries[i - 1].total_xp) {
                currentRank = i + 1;
            }
            ranked.push({
                ...validEntries[i],
                rank: currentRank,
            });
        }

        return ranked;
    }

    const mockPersistence: LeaderboardPersistence = {
        async getLeaderboardPage(page: number, pageSize: number): Promise<RawLeaderboardRow[]> {
            const standings = calculateStandings();
            const totalCount = standings.length;
            const offset = (page - 1) * pageSize;
            const paged = standings.slice(offset, offset + pageSize);

            return paged.map((entry) => ({
                user_id: entry.user_id,
                rank: entry.rank,
                display_name: entry.display_name,
                avatar_url: entry.avatar_url,
                total_xp: entry.total_xp,
                total_count: totalCount,
            }));
        },

        async getUserRank(userId: string): Promise<RawUserRankRow | null> {
            const standings = calculateStandings();
            const found = standings.find((s) => s.user_id === userId);
            if (!found) {
                return null;
            }
            return {
                rank: found.rank,
                total_xp: found.total_xp,
                total_players: standings.length,
            };
        },

        async getProfile(userId: string) {
            const found = users.find((u) => u.id === userId);
            if (!found) return null;
            return {
                display_name: found.display_name,
                avatar_url: found.avatar_url,
            };
        },
    };

    function createMockSupabaseClient(authUserId: string | null) {
        return {
            from: (tableName: string) => {
                if (tableName === "profiles") {
                    return {
                        select: (cols: string) => {
                            void cols;
                            return {
                                eq: (_col: string, val: string) => ({
                                    maybeSingle: () => {
                                        // RLS check: only owning user can query their profile directly
                                        if (!authUserId || authUserId !== val) {
                                            return Promise.resolve({ data: null, error: null });
                                        }
                                        const user = users.find((u) => u.id === val);
                                        return Promise.resolve({
                                            data: user ? { display_name: user.display_name, avatar_url: user.avatar_url } : null,
                                            error: null,
                                        });
                                    },
                                }),
                            };
                        },
                    };
                }

                if (tableName === "user_xp_transactions") {
                    return {
                        select: () => ({
                            eq: (_col: string, val: string) => {
                                if (!authUserId || authUserId !== val) {
                                    return Promise.resolve({ data: [], error: null });
                                }
                                const txs = xpTransactions.filter((t) => t.user_id === val);
                                return Promise.resolve({ data: txs, error: null });
                            },
                        }),
                        insert: (_row?: unknown) => {
                            void _row;
                            return Promise.resolve({
                                data: null,
                                error: { message: 'permission denied for table "user_xp_transactions"', code: "42501" },
                            });
                        },
                        update: (_row?: unknown) => {
                            void _row;
                            return Promise.resolve({
                                data: null,
                                error: { message: 'permission denied for table "user_xp_transactions"', code: "42501" },
                            });
                        },
                        delete: () => Promise.resolve({
                            data: null,
                            error: { message: 'permission denied for table "user_xp_transactions"', code: "42501" },
                        }),
                    };
                }

                throw new Error(`Unexpected table ${tableName}`);
            },
            rpc: (fnName: string, args: Record<string, unknown>) => {
                if (fnName === "get_leaderboard") {
                    const page = (args.p_page as number) ?? 1;
                    const pageSize = (args.p_page_size as number) ?? DEFAULT_PAGE_SIZE;
                    return mockPersistence.getLeaderboardPage(page, pageSize).then((data) => ({
                        data,
                        error: null,
                    }));
                }

                if (fnName === "get_user_leaderboard_rank") {
                    const targetUserId = args.p_user_id as string;
                    if (!authUserId || authUserId !== targetUserId) {
                        return Promise.resolve({
                            data: null,
                            error: { message: "Unauthorized: Caller cannot query rank for a different user", code: "P0001" },
                        });
                    }
                    return mockPersistence.getUserRank(targetUserId).then((data) => ({
                        data: data ? [data] : [],
                        error: null,
                    }));
                }

                return Promise.resolve({ data: null, error: { message: `Function ${fnName} not found` } });
            },
        };
    }

    return {
        mockPersistence,
        createMockSupabaseClient,
        users,
        xpTransactions,
    };
}

describe("Phase 4.4 — Leaderboard Service & Architecture", () => {
    it("1. aggregates XP correctly from user_xp_transactions", async () => {
        const { mockPersistence } = createMockLeaderboardEnvironment();
        const service = new LeaderboardService(mockPersistence);

        const data = await service.getLeaderboard({ page: 1, pageSize: 20 });
        expect(data.totalPlayers).toBe(4);

        // Bob has 300 + 200 = 500 XP
        const bob = data.entries.find((e) => e.displayName === "Bob");
        expect(bob?.totalXp).toBe(500);

        // Alice has 500 XP
        const alice = data.entries.find((e) => e.displayName === "Alice");
        expect(alice?.totalXp).toBe(500);

        // Charlie has 450 XP
        const charlie = data.entries.find((e) => e.displayName === "Charlie");
        expect(charlie?.totalXp).toBe(450);

        // Dana has 150 XP
        const dana = data.entries.find((e) => e.displayName === "Dana");
        expect(dana?.totalXp).toBe(150);
    });

    it("2. ranks higher XP users strictly above lower XP users", async () => {
        const { mockPersistence } = createMockLeaderboardEnvironment();
        const service = new LeaderboardService(mockPersistence);

        const data = await service.getLeaderboard({ page: 1, pageSize: 20 });
        expect(data.entries[0].totalXp).toBe(500);
        expect(data.entries[1].totalXp).toBe(500);
        expect(data.entries[2].totalXp).toBe(450);
        expect(data.entries[3].totalXp).toBe(150);

        expect(data.entries[2].rank).toBe(3);
        expect(data.entries[3].rank).toBe(4);
    });

    it("3. produces equal rank for users with tied XP", async () => {
        const { mockPersistence } = createMockLeaderboardEnvironment();
        const service = new LeaderboardService(mockPersistence);

        const data = await service.getLeaderboard({ page: 1, pageSize: 20 });
        // Alice (500 XP) and Bob (500 XP) both receive rank 1
        expect(data.entries[0].rank).toBe(1);
        expect(data.entries[1].rank).toBe(1);
        // Next player (Charlie, 450 XP) receives rank 3 (standard competitive ranking)
        expect(data.entries[2].rank).toBe(3);
    });

    it("4. calculates and returns current user rank correctly when user is on page", async () => {
        const { mockPersistence } = createMockLeaderboardEnvironment();
        const service = new LeaderboardService(mockPersistence, USER_CHARLIE);

        const data = await service.getLeaderboard({ page: 1, pageSize: 20, userId: USER_CHARLIE });
        expect(data.currentUser).not.toBeNull();
        expect(data.currentUser?.rank).toBe(3);
        expect(data.currentUser?.totalXp).toBe(450);
        expect(data.currentUser?.level).toBe(4); // 450 XP = Level 4
        expect(data.currentUser?.displayName).toBe("Charlie");

        const charlieEntry = data.entries.find((e) => e.userId === USER_CHARLIE);
        expect(charlieEntry?.isCurrentUser).toBe(true);
    });

    it("5. derives current user rank correctly even when user is outside visible page", async () => {
        const { mockPersistence } = createMockLeaderboardEnvironment();
        const service = new LeaderboardService(mockPersistence, USER_DANA);

        // Request page 1 with pageSize 2 (shows only top 2 users: Alice & Bob)
        const data = await service.getLeaderboard({ page: 1, pageSize: 2, userId: USER_DANA });
        expect(data.entries.length).toBe(2);
        expect(data.entries.some((e) => e.userId === USER_DANA)).toBe(false);

        // Current user summary still correctly reports Dana's rank 4 and 150 XP
        expect(data.currentUser).not.toBeNull();
        expect(data.currentUser?.rank).toBe(4);
        expect(data.currentUser?.totalXp).toBe(150);
        expect(data.currentUser?.level).toBe(2);
        expect(data.currentUser?.totalPlayers).toBe(4);
    });

    it("6. derives Chef Level authoritatively from total XP via existing level formula", async () => {
        const { mockPersistence } = createMockLeaderboardEnvironment();
        const service = new LeaderboardService(mockPersistence);

        const data = await service.getLeaderboard({ page: 1, pageSize: 20 });
        const alice = data.entries.find((e) => e.displayName === "Alice");
        const dana = data.entries.find((e) => e.displayName === "Dana");

        expect(alice?.level).toBe(4); // 500 XP = Level 4 (threshold 450 XP)
        expect(dana?.level).toBe(2); // 150 XP = Level 2 (threshold 100 XP)
    });

    it("7. handles a zero-XP user gracefully without assigning a fake rank", async () => {
        const { mockPersistence } = createMockLeaderboardEnvironment();
        const service = new LeaderboardService(mockPersistence, USER_ZERO_XP);

        const data = await service.getLeaderboard({ page: 1, pageSize: 20, userId: USER_ZERO_XP });
        // User with 0 XP is not in ranked entries list
        expect(data.entries.some((e) => e.userId === USER_ZERO_XP)).toBe(false);

        // User summary reports unranked gracefully
        expect(data.currentUser).not.toBeNull();
        expect(data.currentUser?.rank).toBeNull();
        expect(data.currentUser?.totalXp).toBe(0);
        expect(data.currentUser?.level).toBe(1);
        expect(data.currentUser?.displayName).toBe("Newbie");
    });

    it("8. handles an empty leaderboard gracefully", async () => {
        const { mockPersistence } = createMockLeaderboardEnvironment({ xpTransactions: [] });
        const service = new LeaderboardService(mockPersistence);

        const data = await service.getLeaderboard({ page: 1, pageSize: 20 });
        expect(data.entries).toEqual([]);
        expect(data.totalPlayers).toBe(0);
        expect(data.totalPages).toBe(1);
    });

    it("9. validates and sanitizes pagination parameters", () => {
        // Negative / zero / NaN page numbers become 1
        expect(sanitizePagination(-5, 20)).toEqual({ validPage: 1, validPageSize: 20 });
        expect(sanitizePagination(0, 20)).toEqual({ validPage: 1, validPageSize: 20 });
        expect(sanitizePagination(NaN, 20)).toEqual({ validPage: 1, validPageSize: 20 });

        // Page size bounds: minimum 1, maximum 100, default 20
        expect(sanitizePagination(1, 0)).toEqual({ validPage: 1, validPageSize: 1 });
        expect(sanitizePagination(1, 999999)).toEqual({ validPage: 1, validPageSize: 100 });
        expect(sanitizePagination(1, undefined)).toEqual({ validPage: 1, validPageSize: DEFAULT_PAGE_SIZE });
    });

    it("10. supports unauthenticated visitors without errors", async () => {
        const { mockPersistence } = createMockLeaderboardEnvironment();
        const service = new LeaderboardService(mockPersistence, undefined);

        const data = await service.getLeaderboard({ page: 1, pageSize: 20 });
        expect(data.entries.length).toBe(4);
        expect(data.currentUser).toBeNull();
    });
});

describe("Phase 4.4 — Database Security & RLS Integrity", () => {
    it("11. blocks direct client-side INSERT, UPDATE, DELETE on user_xp_transactions", async () => {
        const { createMockSupabaseClient } = createMockLeaderboardEnvironment();
        const client = createMockSupabaseClient(USER_ALICE);
        const xpBuilder = client.from("user_xp_transactions") as {
            insert: (_row?: unknown) => Promise<{ data: null; error: { message: string; code: string } | null }>;
            update: (_row?: unknown) => Promise<{ data: null; error: { message: string; code: string } | null }>;
            delete: () => Promise<{ data: null; error: { message: string; code: string } | null }>;
        };

        const insertRes = await xpBuilder.insert();
        expect(insertRes.error?.code).toBe("42501");

        const updateRes = await xpBuilder.update();
        expect(updateRes.error?.code).toBe("42501");

        const deleteRes = await xpBuilder.delete();
        expect(deleteRes.error?.code).toBe("42501");
    });

    it("12. does not expose sensitive/private fields (like email or password) through leaderboard", async () => {
        const { mockPersistence } = createMockLeaderboardEnvironment();
        const service = new LeaderboardService(mockPersistence);

        const data = await service.getLeaderboard({ page: 1, pageSize: 20 });
        for (const entry of data.entries) {
            expect(entry).toHaveProperty("rank");
            expect(entry).toHaveProperty("displayName");
            expect(entry).toHaveProperty("avatarUrl");
            expect(entry).toHaveProperty("totalXp");
            expect(entry).toHaveProperty("level");

            // Sensitive fields must NOT exist on LeaderboardEntry
            expect(entry).not.toHaveProperty("email");
            expect(entry).not.toHaveProperty("password");
            expect(entry).not.toHaveProperty("created_at");
        }
    });

    it("13. prevents direct client cross-user profile reading through RLS", async () => {
        const { createMockSupabaseClient } = createMockLeaderboardEnvironment();
        // Alice authenticated
        const clientAlice = createMockSupabaseClient(USER_ALICE);
        const profileBuilder = clientAlice.from("profiles") as {
            select: (cols: string) => {
                eq: (col: string, val: string) => {
                    maybeSingle: () => Promise<{ data: { display_name: string; avatar_url: string | null } | null; error: null }>;
                };
            };
        };

        // Direct select for Bob's profile returns null under RLS
        const bobProfile = await profileBuilder.select("display_name, avatar_url").eq("id", USER_BOB).maybeSingle();
        expect(bobProfile.data).toBeNull();

        // Direct select for Alice's own profile succeeds
        const ownProfile = await profileBuilder.select("display_name, avatar_url").eq("id", USER_ALICE).maybeSingle();
        expect(ownProfile.data?.display_name).toBe("Alice");
    });

    it("14. Supabase persistence RPCs map get_leaderboard and get_user_leaderboard_rank correctly", async () => {
        const { createMockSupabaseClient } = createMockLeaderboardEnvironment();
        const client = createMockSupabaseClient(USER_ALICE) as unknown as SupabaseClient<Database>;
        const persistence = createSupabaseLeaderboardPersistence(client);

        const rows = await persistence.getLeaderboardPage(1, 20);
        expect(rows.length).toBe(4);
        expect(rows[0].rank).toBe(1);

        const rankRow = await persistence.getUserRank(USER_ALICE);
        expect(rankRow).not.toBeNull();
        expect(rankRow?.rank).toBe(1);
        expect(rankRow?.total_xp).toBe(500);
    });

    it("15. rejects anonymous get_user_leaderboard_rank lookup", async () => {
        const { createMockSupabaseClient } = createMockLeaderboardEnvironment();
        const anonClient = createMockSupabaseClient(null) as unknown as SupabaseClient<Database>;
        const persistence = createSupabaseLeaderboardPersistence(anonClient);

        await expect(persistence.getUserRank(USER_ALICE)).rejects.toThrow("Unauthorized");
    });

    it("16. allows authenticated user to lookup their own rank and rejects cross-user rank lookup", async () => {
        const { createMockSupabaseClient } = createMockLeaderboardEnvironment();
        // Authenticated as Alice
        const clientAlice = createMockSupabaseClient(USER_ALICE) as unknown as SupabaseClient<Database>;
        const persistenceAlice = createSupabaseLeaderboardPersistence(clientAlice);

        // Own rank succeeds
        const ownRank = await persistenceAlice.getUserRank(USER_ALICE);
        expect(ownRank?.rank).toBe(1);

        // Cross-user rank lookup for Bob is rejected with Unauthorized
        await expect(persistenceAlice.getUserRank(USER_BOB)).rejects.toThrow("Unauthorized");
    });

    it("17. allows anonymous read on get_leaderboard returning only public fields", async () => {
        const { createMockSupabaseClient } = createMockLeaderboardEnvironment();
        const anonClient = createMockSupabaseClient(null) as unknown as SupabaseClient<Database>;
        const persistence = createSupabaseLeaderboardPersistence(anonClient);

        const pageRows = await persistence.getLeaderboardPage(1, 20);
        expect(pageRows.length).toBe(4);
        expect(pageRows[0]).toHaveProperty("display_name");
        expect(pageRows[0]).toHaveProperty("total_xp");
        expect(pageRows[0]).not.toHaveProperty("email");
    });
});
