import "server-only";

import { getAuthenticatedUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
    createSupabaseProgressPersistence,
    LearningProgressService,
} from "./service";
import type { ProgressSummary, UserLearningProgress } from "./types";

export async function getUserLearningProgressSummary(): Promise<ProgressSummary | null> {
    const user = await getAuthenticatedUser();
    if (!user) {
        return null;
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        return null;
    }

    const persistence = createSupabaseProgressPersistence(supabase);
    const service = new LearningProgressService(persistence, user.id);
    return service.getUserProgress(user.id);
}

export async function getUserModuleProgress(moduleId: string): Promise<UserLearningProgress | null> {
    const user = await getAuthenticatedUser();
    if (!user) {
        return null;
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        return null;
    }

    const persistence = createSupabaseProgressPersistence(supabase);
    const service = new LearningProgressService(persistence, user.id);
    return service.getModuleProgress(moduleId, user.id);
}

export async function getUserRecipeProgress(recipeId: string): Promise<UserLearningProgress | null> {
    const user = await getAuthenticatedUser();
    if (!user) {
        return null;
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        return null;
    }

    const persistence = createSupabaseProgressPersistence(supabase);
    const service = new LearningProgressService(persistence, user.id);
    return service.getRecipeProgress(recipeId, user.id);
}
