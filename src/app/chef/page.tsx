import type { Metadata } from "next";
import { getAuthenticatedUser } from "@/lib/auth/current-user";
import { PageIntro } from "@/components/layout/page-intro";
import { ChefChat } from "@/components/ai-chef/chef-chat";

export const metadata: Metadata = {
    title: "AI Chef",
    description: "Your cooking learning assistant for culinary techniques, ingredients, and recipe science.",
};

export default async function ChefPage() {
    const user = await getAuthenticatedUser();

    return (
        <main className="mx-auto w-full max-w-[1000px] flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
            <PageIntro
                eyebrow="Culinary Assistant"
                title="AI Chef"
                description="Your cooking learning assistant for culinary techniques, ingredients, and recipe science."
            />

            <div className="mt-8">
                <ChefChat isAuthenticated={Boolean(user)} />
            </div>
        </main>
    );
}
