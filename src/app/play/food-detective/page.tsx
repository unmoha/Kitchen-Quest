import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FoodDetectiveGame } from "@/features/food-detective/game";
import { getAuthenticatedUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Food Detective" };

export default async function FoodDetectivePage() {
    const user = await getAuthenticatedUser();
    if (!user) {
        redirect("/auth/login?next=/play/food-detective");
    }

    return (
        <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
            <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5c6d62]">Play · Food Detective</p>
                <h1 className="display-font mt-2 text-4xl text-[#254235] sm:text-5xl">Food Detective</h1>
            </div>
            <FoodDetectiveGame />
        </main>
    );
}
