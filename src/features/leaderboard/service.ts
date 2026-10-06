import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { calculateLevel } from "../xp-levels/levels";
import type {
    CurrentUserRankSummary,
    LeaderboardEntry,
    LeaderboardPageData,
    RawLeaderboardRow,
    RawUserRankRow,
} from "./types";

export interface LeaderboardPersistence {
    getLeaderboardPage(page: number, pageSize: number): Promise<RawLeaderboardRow[]>;
    getUserRank(userId: string): Promise<RawUserRankRow | null>;
    getProfile(userId: string): Promise<{ display_name: string; avatar_url: string | null } | null>;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function sanitizePagination(page?: number, pageSize?: number): { validPage: number; validPageSize: number } {
    const rawPage = typeof page === "number" && !Number.isNaN(page) ? Math.floor(page) : 1;
    const rawPageSize = typeof pageSize === "number" && !Number.isNaN(pageSize) ? Math.floor(pageSize) : DEFAULT_PAGE_SIZE;

    const validPage = Math.max(1, rawPage);
    const validPageSize = Math.max(1, Math.min(MAX_PAGE_SIZE, rawPageSize));

    return { validPage, validPageSize };
}

export class LeaderboardService {
    constructor(
        private readonly persistence: LeaderboardPersistence,
        private readonly currentUserId?: string,
    ) {}

    async getLeaderboard(options?: {
        page?: number;
        pageSize?: number;
        userId?: string;
    }): Promise<LeaderboardPageData> {
        const { validPage, validPageSize } = sanitizePagination(options?.page, options?.pageSize);
        const effectiveUserId = options?.userId ?? this.currentUserId;

        // 1. Fetch leaderboard rows from persistence
        const rawRows = await this.persistence.getLeaderboardPage(validPage, validPageSize);
        const totalPlayers = rawRows.length > 0 ? Number(rawRows[0].total_count) : 0;
        const totalPages = totalPlayers > 0 ? Math.ceil(totalPlayers / validPageSize) : 1;

        // 2. Map entries with derived levels and current user flag
        const entries: LeaderboardEntry[] = rawRows.map((row) => ({
            rank: Number(row.rank),
            userId: row.user_id,
            displayName: row.display_name,
            avatarUrl: row.avatar_url,
            totalXp: Number(row.total_xp),
            level: calculateLevel(Number(row.total_xp)),
            isCurrentUser: Boolean(effectiveUserId && row.user_id === effectiveUserId),
        }));

        // 3. Fetch current user rank summary if authenticated
        let currentUser: CurrentUserRankSummary | null = null;
        if (effectiveUserId) {
            const userRankData = await this.persistence.getUserRank(effectiveUserId);
            const userProfile = await this.persistence.getProfile(effectiveUserId);
            const displayName = userProfile?.display_name ?? "You";
            const avatarUrl = userProfile?.avatar_url ?? null;

            if (userRankData && Number(userRankData.total_xp) > 0) {
                const totalXp = Number(userRankData.total_xp);
                currentUser = {
                    rank: Number(userRankData.rank),
                    totalXp,
                    level: calculateLevel(totalXp),
                    displayName,
                    avatarUrl,
                    totalPlayers: Number(userRankData.total_players),
                };
            } else {
                // User has no XP transactions yet -> unranked (rank: null), 0 XP, Level 1
                currentUser = {
                    rank: null,
                    totalXp: 0,
                    level: 1,
                    displayName,
                    avatarUrl,
                    totalPlayers,
                };
            }
        }

        return {
            entries,
            currentUser,
            currentPage: validPage,
            pageSize: validPageSize,
            totalPlayers,
            totalPages,
        };
    }
}

export function createSupabaseLeaderboardPersistence(client: SupabaseClient<Database>): LeaderboardPersistence {
    return {
        async getLeaderboardPage(page: number, pageSize: number) {
            const { data, error } = await client.rpc("get_leaderboard", {
                p_page: page,
                p_page_size: pageSize,
            });

            if (error) {
                throw new Error(`Failed to load leaderboard: ${error.message}`);
            }

            return (data ?? []) as RawLeaderboardRow[];
        },

        async getUserRank(userId: string) {
            const { data, error } = await client.rpc("get_user_leaderboard_rank", {
                p_user_id: userId,
            });

            if (error) {
                throw new Error(`Failed to load user leaderboard rank: ${error.message}`);
            }

            if (!data || data.length === 0) {
                return null;
            }

            return data[0] as RawUserRankRow;
        },

        async getProfile(userId: string) {
            const { data, error } = await client
                .from("profiles")
                .select("display_name, avatar_url")
                .eq("id", userId)
                .maybeSingle();

            if (error) {
                return null;
            }

            return data;
        },
    };
}
