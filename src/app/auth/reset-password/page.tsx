import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SupabaseSetupNotice } from "@/components/auth/supabase-setup-notice";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Reset password" };
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
    return (
        <AuthPageShell>
            {!getSupabasePublicConfig() ? <SupabaseSetupNotice /> : <AuthForm mode="reset-password" nextPath="/profile" />}
        </AuthPageShell>
    );
}