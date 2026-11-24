import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SupabaseSetupNotice } from "@/components/auth/supabase-setup-notice";
import { ErrorState, EmptyState } from "@/components/ui/page-states";
import { CookMode } from "@/features/cook-mode/cook-mode";
import { getPublishedRecipeBySlug } from "@/features/recipes/queries";

interface CookModePageProps {
    params: Promise<{ slug: string }>;
}

export const metadata: Metadata = { title: "Cook mode" };
export const dynamic = "force-dynamic";

export default async function CookModePage({ params }: CookModePageProps) {
    const { slug } = await params;
    const result = await getPublishedRecipeBySlug(slug);

    if (result.status === "not-found") notFound();
    if (result.status === "unconfigured") return <AuthPageShell><SupabaseSetupNotice /></AuthPageShell>;
    if (result.status === "error") {
        return <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-12 sm:px-6 lg:px-10"><ErrorState message="This recipe couldn't be loaded. Please try again shortly." /></main>;
    }

    const { recipe, servings, safetyNotes, ingredients, steps } = result.detail;

    if (!steps.length) {
        return <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-12 sm:px-6 lg:px-10"><EmptyState title="Method coming soon">Cook mode needs published steps, and this recipe does not have any yet.</EmptyState></main>;
    }

    return (
        <CookMode
            ingredients={ingredients}
            recipeName={recipe.name}
            safetyNotes={safetyNotes}
            servings={servings}
            slug={slug}
            steps={steps.map((step) => ({
                id: step.id,
                number: step.step_number,
                instruction: step.instruction,
                minutes: step.time_minutes,
                note: step.educational_note,
            }))}
        />
    );
}
