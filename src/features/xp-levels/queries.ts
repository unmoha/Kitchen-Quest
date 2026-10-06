import "server-only";

import { getAuthenticatedUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
    createSupabaseXpPersistence,
    XpService,
} from "./service";
import type { UserLevelInfo, UserXpTransaction } from "./types";

export async function getUserLevelInfoQuery(userId?: string): Promise<UserLevelInfo | null> {
    const user = await getAuthenticatedUser();
    const targetUserId = userId ?? user?.id;

    if (!targetUserId) {
        return null;
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        return null;
    }

    const service = new XpService(createSupabaseXpPersistence(supabase), targetUserId);
    return service.getUserLevelInfo(targetUserId);
}

export async function getUserXpTransactionsQuery(limit = 10, userId?: string): Promise<UserXpTransaction[]> {
    const user = await getAuthenticatedUser();
    const targetUserId = userId ?? user?.id;

    if (!targetUserId) {
        return [];
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        return [];
    }

    const service = new XpService(createSupabaseXpPersistence(supabase), targetUserId);
    return service.getUserTransactions(limit, targetUserId);
}
