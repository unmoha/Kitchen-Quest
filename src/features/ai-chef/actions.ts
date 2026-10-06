"use server";

import { getAuthenticatedUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
    AiChefService,
    createSupabaseAiChefPersistence,
} from "./service";
import type { AiChefRequest, AiChefResponse } from "./types";

export async function askAiChefAction(request: AiChefRequest): Promise<AiChefResponse> {
    const user = await getAuthenticatedUser();
    if (!user) {
        return {
            success: false,
            error: "You must be signed in to ask AI Chef.",
        };
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        return {
            success: false,
            error: "Database configuration unavailable. Please try again later.",
        };
    }

    const persistence = createSupabaseAiChefPersistence(supabase);
    const service = new AiChefService(persistence);

    return service.askChef({
        userId: user.id,
        message: request.message,
        history: request.history,
    });
}
