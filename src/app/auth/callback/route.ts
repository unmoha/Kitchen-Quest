import { NextResponse, type NextRequest } from "next/server";
import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const nextPath = getSafeRedirectPath(request.nextUrl.searchParams.get("next"));
    const code = request.nextUrl.searchParams.get("code");
    const loginUrl = new URL("/auth/login?error=confirmation", request.url);

    if (!getSupabasePublicConfig() || !code) {
        return NextResponse.redirect(loginUrl);
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        return NextResponse.redirect(loginUrl);
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.redirect(new URL(nextPath, request.url));
}