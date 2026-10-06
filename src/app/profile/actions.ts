"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ProfileActionState } from "@/types/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateProfile(
    _previousState: ProfileActionState,
    formData: FormData,
): Promise<ProfileActionState> {
    const rawDisplayName = formData.get("display_name");
    if (typeof rawDisplayName !== "string") {
        return { kind: "error", message: "Enter a display name between 1 and 40 characters." };
    }

    const displayName = rawDisplayName.trim().replace(/\s+/g, " ");
    if (displayName.length < 1 || displayName.length > 40) {
        return { kind: "error", message: "Enter a display name between 1 and 40 characters." };
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        return { kind: "error", message: "Profile updates are temporarily unavailable." };
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
        return { kind: "error", message: "Your session has expired. Sign in again to update your profile." };
    }

    const { data, error } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("id", authData.user.id)
        .select("display_name")
        .maybeSingle();

    if (error || !data) {
        return { kind: "error", message: "We couldn't save your profile. Please try again." };
    }

    revalidatePath("/profile");
    return { kind: "success", message: "Your display name has been updated." };
}

export async function signOut() {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        redirect("/auth/login");
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
        redirect("/profile?error=sign-out");
    }

    redirect("/auth/login");
}