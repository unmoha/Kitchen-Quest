import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SupabaseSetupNotice } from "@/components/auth/supabase-setup-notice";
import { getAuthenticatedUser } from "@/lib/auth/current-user";
import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Create an account" };
export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: PageProps<"/auth/register">) {
    const [params] = await Promise.all([searchParams]);
    const nextPath = getSafeRedirectPath(typeof params.next === "string" ? params.next : null);
    const isConfigured = Boolean(getSupabasePublicConfig());

    if (isConfigured && await getAuthenticatedUser()) {
        redirect(nextPath);
    }

    return (
        <AuthPageShell>
            {!isConfigured ? <SupabaseSetupNotice /> : <AuthForm mode="register" nextPath={nextPath} />}
        </AuthPageShell>
    );
}