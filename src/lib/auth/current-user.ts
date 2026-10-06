import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export interface AuthenticatedUser {
    id: string;
    email: string | null;
}

export interface AuthenticatedUserProfile extends AuthenticatedUser {
    displayName: string;
    avatarUrl: string | null;
    role: UserRole;
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        return null;
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
        return null;
    }

    return { id: data.user.id, email: data.user.email ?? null };
}

export async function getAuthenticatedUserProfile(): Promise<AuthenticatedUserProfile | null> {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        return null;
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
        return null;
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, role")
        .eq("id", data.user.id)
        .maybeSingle();

    if (profileError || !profile) {
        return null;
    }

    return {
        id: data.user.id,
        email: data.user.email ?? null,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        role: (profile.role as UserRole) ?? "user",
    };
}

export async function requireAdminUser(): Promise<
    | { success: true; user: AuthenticatedUserProfile; supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>> }
    | { success: false; error: string; statusCode: 401 | 403 }
> {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        return { success: false, error: "Database configuration unavailable.", statusCode: 401 };
    }

    const profile = await getAuthenticatedUserProfile();
    if (!profile) {
        return { success: false, error: "You must be signed in to perform this action.", statusCode: 401 };
    }

    if (profile.role !== "admin") {
        return { success: false, error: "Forbidden: Administrator privileges required.", statusCode: 403 };
    }

    return { success: true, user: profile, supabase };
}