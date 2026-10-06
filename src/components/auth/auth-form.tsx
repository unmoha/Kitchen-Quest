"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type AuthFormMode = "login" | "register" | "reset-password" | "update-password";

interface AuthFormProps {
    mode: AuthFormMode;
    nextPath: string;
}

const copy: Record<AuthFormMode, { title: string; submit: string }> = {
    login: { title: "Welcome back, cook.", submit: "Sign in" },
    register: { title: "Make room at the counter.", submit: "Create account" },
    "reset-password": { title: "Reset your password.", submit: "Send reset link" },
    "update-password": { title: "Choose a new password.", submit: "Update password" },
};

function friendlyAuthError(): string {
    return "We couldn't complete that request. Check your details and try again.";
}

export function AuthForm({ mode, nextPath }: AuthFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage(null);
        setSuccessMessage(null);

        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("email") ?? "").trim().toLowerCase();
        const password = String(formData.get("password") ?? "");
        const passwordConfirmation = String(formData.get("password_confirmation") ?? "");
        const displayName = String(formData.get("display_name") ?? "").trim().replace(/\s+/g, " ");

        if ((mode === "register" || mode === "update-password") && password.length < 12) {
            setErrorMessage("Use a password with at least 12 characters.");
            return;
        }
        if ((mode === "register" || mode === "update-password") && password !== passwordConfirmation) {
            setErrorMessage("Those passwords don't match.");
            return;
        }
        if (mode === "register" && (displayName.length < 1 || displayName.length > 40)) {
            setErrorMessage("Choose a display name between 1 and 40 characters.");
            return;
        }

        setIsSubmitting(true);
        try {
            const supabase = createSupabaseBrowserClient();

            if (mode === "login") {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                    setErrorMessage(friendlyAuthError());
                    return;
                }
                router.replace(nextPath);
                router.refresh();
                return;
            }

            if (mode === "register") {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { display_name: displayName },
                        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
                    },
                });
                if (error) {
                    setErrorMessage(friendlyAuthError());
                    return;
                }
                if (data.session) {
                    router.replace(nextPath);
                    router.refresh();
                    return;
                }
                setSuccessMessage("Check your inbox for a confirmation link. Your account will be ready after you confirm your email.");
                return;
            }

            if (mode === "reset-password") {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/auth/callback?next=%2Fauth%2Fupdate-password`,
                });
                if (error) {
                    setErrorMessage(friendlyAuthError());
                    return;
                }
                setSuccessMessage("If an account uses that address, a password reset link is on its way.");
                return;
            }

            const { error } = await supabase.auth.updateUser({ password });
            if (error) {
                setErrorMessage(friendlyAuthError());
                return;
            }
            router.replace("/profile");
            router.refresh();
        } catch {
            setErrorMessage("Kitchen Quest couldn't reach the authentication service. Please try again shortly.");
        } finally {
            setIsSubmitting(false);
        }
    }

    const needsEmail = mode !== "update-password";
    const needsPassword = mode === "login" || mode === "register" || mode === "update-password";
    const needsConfirmation = mode === "register" || mode === "update-password";

    return (
        <section className="w-full max-w-md rounded-lg border border-[#e7e3d9] bg-white p-5 sm:p-8">
            <h1 className="display-font text-3xl leading-tight text-[#254235]">{copy[mode].title}</h1>
            <p className="mt-2 text-sm leading-6 text-[#59675c]">
                {mode === "register" ? "Create an account to keep your Kitchen Quest profile." : null}
                {mode === "login" ? "Sign in to see your profile and keep your account details up to date." : null}
                {mode === "reset-password" ? "We'll send a reset link if an account is registered with that address." : null}
                {mode === "update-password" ? "Use at least 12 characters for your new password." : null}
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                {mode === "register" ? (
                    <Input autoComplete="name" id="display-name" label="Display name" maxLength={40} name="display_name" placeholder="Display name" required />
                ) : null}
                {needsEmail ? (
                    <Input autoComplete="email" id="email" label="Email address" name="email" placeholder="Email address" required type="email" />
                ) : null}
                {needsPassword ? (
                    <Input
                        autoComplete={mode === "update-password" ? "new-password" : "current-password"}
                        id="password"
                        label={mode === "update-password" ? "New password" : "Password"}
                        minLength={mode === "login" ? undefined : 12}
                        name="password"
                        placeholder={mode === "update-password" ? "New password" : "Password"}
                        required
                        type="password"
                    />
                ) : null}
                {needsConfirmation ? (
                    <Input
                        autoComplete="new-password"
                        id="password-confirmation"
                        label="Confirm password"
                        minLength={12}
                        name="password_confirmation"
                        placeholder="Confirm password"
                        required
                        type="password"
                    />
                ) : null}
                {errorMessage ? <p className="text-sm leading-6 text-[#a33f2a]" role="alert">{errorMessage}</p> : null}
                {successMessage ? <p className="text-sm leading-6 text-[#315b3d]" role="status">{successMessage}</p> : null}
                <Button className="w-full" disabled={isSubmitting} type="submit">
                    {isSubmitting ? "Please wait…" : copy[mode].submit}
                </Button>
            </form>

            <nav aria-label="Authentication links" className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-[#a8442d]">
                {mode === "login" ? <Link href={`/auth/register?next=${encodeURIComponent(nextPath)}`}>Create an account</Link> : null}
                {mode === "login" ? <Link href="/auth/reset-password">Forgot password?</Link> : null}
                {mode === "register" ? <Link href={`/auth/login?next=${encodeURIComponent(nextPath)}`}>Already have an account? Sign in</Link> : null}
                {mode === "reset-password" ? <Link href="/auth/login">Return to sign in</Link> : null}
                {mode === "update-password" ? <Link href="/auth/login">Return to sign in</Link> : null}
            </nav>
        </section>
    );
}