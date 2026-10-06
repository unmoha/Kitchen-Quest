import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SupabaseSetupNotice } from "@/components/auth/supabase-setup-notice";
import { PageIntro } from "@/components/layout/page-intro";
import { ErrorState, EmptyState } from "@/components/ui/page-states";
import { getPublishedRecipeBySlug } from "@/features/recipes/queries";
import { getUserRecipeProgress } from "@/features/learning-progress/queries";

interface RecipeDetailPageProps {
    params: Promise<{ slug: string }>;
}

export const metadata: Metadata = { title: "Recipe" };
export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
    const { slug } = await params;
    const result = await getPublishedRecipeBySlug(slug);

    if (result.status === "not-found") {
        notFound();
    }

    if (result.status === "unconfigured") {
        return <AuthPageShell><SupabaseSetupNotice /></AuthPageShell>;
    }

    if (result.status === "error") {
        return <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-12 sm:px-6 lg:px-10"><ErrorState message="This recipe couldn't be loaded. Please try again shortly." /></main>;
    }

    const { recipe, servings, educationalInfo, safetyNotes, ingredients, steps } = result.detail;
    const progress = await getUserRecipeProgress(recipe.id);

    return (
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
            <Link className="mb-6 inline-flex min-h-11 items-center text-sm font-semibold text-[#a8442d] hover:underline" href="/recipes">Back to recipes</Link>
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                <div className="relative aspect-[1.35] overflow-hidden rounded-lg bg-[#e8e8dc]">
                    <Image alt={recipe.imageAlt} className="object-cover" fill priority sizes="(max-width: 1024px) 100vw, 45vw" src={recipe.image} />
                </div>
                <div>
                    <PageIntro description={recipe.description} eyebrow={`${recipe.cuisine} · ${recipe.category}`} title={recipe.name} />
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                        <Badge tone={recipe.difficulty === "Beginner" ? "green" : recipe.difficulty === "Intermediate" ? "yellow" : "coral"}>{recipe.difficulty}</Badge>
                        <Badge tone="neutral">{recipe.prepMinutes} min prep</Badge>
                        <Badge tone="neutral">{recipe.cookMinutes} min cook</Badge>
                        <Badge tone="neutral">Serves {servings}</Badge>
                        {progress?.status === "completed" ? (
                            <Badge tone="green">
                                <CheckCircle2 aria-hidden="true" className="mr-1 inline" size={12} />
                                Mastered · {progress.masteryScore}%
                            </Badge>
                        ) : progress?.status === "in_progress" ? (
                            <Badge tone="yellow">
                                Practiced · {progress.masteryScore}%
                            </Badge>
                        ) : null}
                    </div>
                    <p className="mt-5 text-sm leading-6 text-[#59675c]">{educationalInfo}</p>
                </div>
            </div>

            {/* Persistent Recipe Progress & Practice Card */}
            <div className="mt-8 rounded-xl border border-[#dfe7de] bg-[#fafbf9] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5c6d62]">Your Recipe Learning Progress</p>
                        <h3 className="display-font mt-1 text-2xl text-[#254235]">
                            {progress?.status === "completed"
                                ? "Recipe Mastered"
                                : progress?.status === "in_progress"
                                    ? "Recipe In Progress"
                                    : "Not Practiced Yet"}
                        </h3>
                        <p className="mt-1 text-sm text-[#59675c]">
                            {progress
                                ? `Current recipe mastery: ${progress.masteryScore}% based on authoritative gameplay practice.`
                                : "Practice this recipe in Recipe Builder or Cooking Order to build persistent mastery."}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <ButtonLink href="/play/recipe-builder" variant="secondary">
                            <PlayCircle aria-hidden="true" className="mr-2" size={17} />
                            Practice ingredients in Recipe Builder
                        </ButtonLink>
                        <ButtonLink href="/play/cooking-order" variant="secondary">
                            <PlayCircle aria-hidden="true" className="mr-2" size={17} />
                            Practice steps in Cooking Order
                        </ButtonLink>
                    </div>
                </div>
            </div>

            <div className="mt-12 grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                <section aria-labelledby="ingredients-heading">
                    <h2 className="display-font text-3xl text-[#254235]" id="ingredients-heading">Ingredients</h2>
                    {ingredients.length ? (
                        <ul className="mt-5 divide-y divide-[#e7e3d9] rounded-lg border border-[#e7e3d9] bg-white px-5">
                            {ingredients.map((ingredient) => (
                                <li className="flex items-baseline justify-between gap-4 py-3 text-sm" key={ingredient.name}>
                                    <span className="text-[#254235]">{ingredient.name}{ingredient.preparationNote ? <span className="block text-xs leading-5 text-[#59675c]">{ingredient.preparationNote}</span> : null}</span>
                                    <span className="shrink-0 text-right text-[#59675c]">{ingredient.quantity} {ingredient.unit}{ingredient.isOptional ? " · optional" : ""}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <div className="mt-5"><EmptyState title="Ingredients are being prepared">The published ingredient list for this recipe is not available yet.</EmptyState></div>}
                    <div className="mt-6 rounded-lg border border-[#e7e3d9] bg-[#f3f1e9] p-5">
                        <h3 className="font-semibold text-[#254235]">Food safety note</h3>
                        <p className="mt-2 text-sm leading-6 text-[#59675c]">{safetyNotes}</p>
                    </div>
                </section>

                <section aria-labelledby="steps-heading">
                    <h2 className="display-font text-3xl text-[#254235]" id="steps-heading">Method</h2>
                    {steps.length ? (
                        <ol className="mt-5 space-y-4">
                            {steps.map((step) => (
                                <li className="flex gap-4 rounded-lg border border-[#e7e3d9] bg-white p-5" key={step.id}>
                                    <span className="display-font grid size-9 shrink-0 place-items-center rounded-full bg-[#e5eee2] text-lg text-[#254235]">{step.step_number}</span>
                                    <div>
                                        <p className="text-sm leading-6 text-[#254235]">{step.instruction}</p>
                                        {step.time_minutes !== null ? <p className="mt-2 text-xs font-semibold text-[#59675c]">About {step.time_minutes} min</p> : null}
                                        {step.educational_note ? <p className="mt-2 text-sm leading-6 text-[#59675c]">{step.educational_note}</p> : null}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    ) : <EmptyState title="Method coming soon">This published recipe does not have steps available yet.</EmptyState>}
                </section>
            </div>
            <div className="mt-10"><ButtonLink href="/recipes" variant="secondary">Back to recipe collection</ButtonLink></div>
        </main>
    );
}
