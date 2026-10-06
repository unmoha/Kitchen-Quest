import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
    AchievementService,
    createSupabaseAchievementPersistence,
} from "./service";
import type { AchievementsSummary, AchievementWithProgress } from "./types";

export async function getUserAchievementsWithProgressQuery(userId: string): Promise<AchievementWithProgress[]> {
    const client = await createSupabaseServerClient();
    if (!client) {
        return [];
    }

    const persistence = createSupabaseAchievementPersistence(client);
    const service = new AchievementService(persistence, userId);
    return service.getAchievementsWithProgress(userId);
}

export async function getUserAchievementsSummaryQuery(userId: string): Promise<AchievementsSummary | null> {
    const client = await createSupabaseServerClient();
    if (!client) {
        return null;
    }

    const persistence = createSupabaseAchievementPersistence(client);
    const service = new AchievementService(persistence, userId);
    return service.getAchievementsSummary(userId);
}
