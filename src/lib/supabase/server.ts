import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export async function createSupabaseServerClient(): Promise<SupabaseClient<Database> | null> {
    const config = getSupabasePublicConfig();
    if (!config) {
        return null;
    }

    const cookieStore = await cookies();

    return createServerClient<Database>(config.url, config.publishableKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                } catch {
                    // Server Components cannot write cookies; proxy.ts performs session refresh.
                }
            },
        },
    });
}