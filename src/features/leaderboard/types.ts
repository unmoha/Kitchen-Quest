export interface RawLeaderboardRow {
    user_id: string;
    rank: number;
    display_name: string;
    avatar_url: string | null;
    total_xp: number;
    total_count: number;
}

export interface RawUserRankRow {
    rank: number;
    total_xp: number;
    total_players: number;
}

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    totalXp: number;
    level: number;
    isCurrentUser: boolean;
}

export interface CurrentUserRankSummary {
    rank: number | null;
    totalXp: number;
    level: number;
    displayName: string;
    avatarUrl: string | null;
    totalPlayers: number;
}

export interface LeaderboardPageData {
    entries: LeaderboardEntry[];
    currentUser: CurrentUserRankSummary | null;
    currentPage: number;
    pageSize: number;
    totalPlayers: number;
    totalPages: number;
}
