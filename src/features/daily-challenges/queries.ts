import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
    createSupabaseDailyChallengePersistence,
    DailyChallengeService,
} from "./service";
import type { DailyChallengeWithStatus, UserStreakInfo } from "./types";

export async function getTodaysChallengeQuery(userId?: string): Promise<DailyChallengeWithStatus | null> {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        return null;
    }

    const persistence = createSupabaseDailyChallengePersistence(supabase);
    const service = new DailyChallengeService(persistence, userId);
    return service.getTodaysChallenge(userId);
}

export async function getUserStreakQuery(userId?: string): Promise<UserStreakInfo> {
    const supabase = await createSupabaseServerClient();
    if (!supabase || !userId) {
        return {
            currentStreak: 0,
            longestStreak: 0,
            lastActivityDate: null,
            hasActiveStreakToday: false,
        };
    }

    const persistence = createSupabaseDailyChallengePersistence(supabase);
    const service = new DailyChallengeService(persistence, userId);
    return service.getUserStreak(userId);
}
