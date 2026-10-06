import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SupabaseSetupNotice } from "@/components/auth/supabase-setup-notice";
import { ErrorState, SuccessState } from "@/components/ui/page-states";
import { getAuthenticatedUser } from "@/lib/auth/current-user";
import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: PageProps<"/auth/login">) {
    const [params] = await Promise.all([searchParams]);
    const nextPath = getSafeRedirectPath(typeof params.next === "string" ? params.next : null);
    const isConfigured = Boolean(getSupabasePublicConfig());

    if (isConfigured && await getAuthenticatedUser()) {
        redirect(nextPath);
    }

    return (
        <AuthPageShell>
            {!isConfigured ? <SupabaseSetupNotice /> : (
                <>
                    {params.error === "confirmation" ? <div className="mb-4"><ErrorState message="That confirmation link is invalid or expired. Request a new link and try again." /></div> : null}
                    {params.message === "password-updated" ? <div className="mb-4"><SuccessState>Your password has been updated. Sign in with your new password.</SuccessState></div> : null}
                    <AuthForm mode="login" nextPath={nextPath} />
                </>
            )}
        </AuthPageShell>
    );
}