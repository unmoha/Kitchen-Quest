import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SupabaseSetupNotice } from "@/components/auth/supabase-setup-notice";
import { getAuthenticatedUser } from "@/lib/auth/current-user";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Choose a new password" };
export const dynamic = "force-dynamic";

export default async function UpdatePasswordPage() {
    if (!getSupabasePublicConfig()) {
        return <AuthPageShell><SupabaseSetupNotice /></AuthPageShell>;
    }

    const user = await getAuthenticatedUser();
    if (!user) {
        redirect("/auth/login?next=%2Fauth%2Fupdate-password");
    }

    return <AuthPageShell><AuthForm mode="update-password" nextPath="/profile" /></AuthPageShell>;
}