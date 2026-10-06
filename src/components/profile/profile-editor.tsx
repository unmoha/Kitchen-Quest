"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile } from "@/app/profile/actions";
import { initialProfileActionState } from "@/types/profile";

export function ProfileEditor({ displayName }: { displayName: string }) {
    const [state, action, isPending] = useActionState(updateProfile, initialProfileActionState);

    return (
        <form action={action} className="mt-6 max-w-md space-y-4">
            <Input
                autoComplete="nickname"
                defaultValue={displayName}
                id="profile-display-name"
                label="Display name"
                maxLength={40}
                name="display_name"
                required
            />
            {state.kind !== "idle" ? (
                <p className={state.kind === "error" ? "text-sm leading-6 text-[#a33f2a]" : "text-sm leading-6 text-[#315b3d]"} role={state.kind === "error" ? "alert" : "status"}>
                    {state.message}
                </p>
            ) : null}
            <Button disabled={isPending} type="submit">{isPending ? "Saving…" : "Save profile"}</Button>
        </form>
    );
}