import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export async function proxy(request: NextRequest) {
    const config = getSupabasePublicConfig();
    if (!config) {
        return NextResponse.next({ request });
    }

    let response = NextResponse.next({ request });
    const supabase = createServerClient<Database>(config.url, config.publishableKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet, cacheHeaders) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                response = NextResponse.next({ request });
                cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
                Object.entries(cacheHeaders).forEach(([name, value]) => response.headers.set(name, value));
            },
        },
    });

    await supabase.auth.getClaims();
    return response;
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};