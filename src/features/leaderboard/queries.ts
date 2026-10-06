import "server-only";

import { getAuthenticatedUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
    createSupabaseLeaderboardPersistence,
    LeaderboardService,
} from "./service";
import type { LeaderboardPageData } from "./types";

export async function getLeaderboardQuery(options?: {
    page?: number;
    pageSize?: number;
}): Promise<LeaderboardPageData> {
    const user = await getAuthenticatedUser();
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
        return {
            entries: [],
            currentUser: null,
            currentPage: 1,
            pageSize: 20,
            totalPlayers: 0,
            totalPages: 1,
        };
    }

    const persistence = createSupabaseLeaderboardPersistence(supabase);
    const service = new LeaderboardService(persistence, user?.id);

    return service.getLeaderboard({
        page: options?.page,
        pageSize: options?.pageSize,
        userId: user?.id,
    });
}
