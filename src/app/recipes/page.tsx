import type { Metadata } from "next";
import { SupabaseSetupNotice } from "@/components/auth/supabase-setup-notice";
import { PageIntro } from "@/components/layout/page-intro";
import { RecipeExplorer } from "@/components/recipes/recipe-explorer";
import { EmptyState, ErrorState } from "@/components/ui/page-states";
import { getPublishedRecipes } from "@/features/recipes/queries";
import { getUserLearningProgressSummary } from "@/features/learning-progress/queries";

export const metadata: Metadata = { title: "Recipes" };
export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const [result, progressSummary] = await Promise.all([
    getPublishedRecipes(),
    getUserLearningProgressSummary(),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
      <PageIntro
        description="Browse a small collection of approachable dishes from different food traditions. Search by recipe, ingredient, or cuisine, then narrow by category or difficulty."
        eyebrow="Recipes · kitchen inspiration"
        title="Find something good to make."
      />
      <section aria-label="Search and filter recipes" className="mt-8">
        {result.status === "unconfigured" ? <SupabaseSetupNotice /> : null}
        {result.status === "error" ? <ErrorState message="Recipe content is unavailable. Please try again shortly." /> : null}
        {result.status === "empty" ? <EmptyState title="No published recipes yet">Published recipe content will appear here when it is available.</EmptyState> : null}
        {result.status === "ready" ? (
          <RecipeExplorer
            progressMap={progressSummary?.recipes}
            recipes={result.recipes}
          />
        ) : null}
      </section>
      <p className="mt-8 max-w-3xl text-xs leading-5 text-[#59675c]">
        Recipe guides are for learning and inspiration. Preparation times are estimates; use safe food handling and check ingredients for your needs.
      </p>
    </main>
  );
}
