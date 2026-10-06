"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

let browserClient: SupabaseClient<Database> | undefined;

export function createSupabaseBrowserClient(): SupabaseClient<Database> {
    if (browserClient) {
        return browserClient;
    }

    const config = getSupabasePublicConfig();
    if (!config) {
        throw new Error("Supabase public configuration is missing or invalid.");
    }

    browserClient = createBrowserClient<Database>(config.url, config.publishableKey);
    return browserClient;
}