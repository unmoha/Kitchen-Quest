import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SupabaseSetupNotice } from "@/components/auth/supabase-setup-notice";
import { PageIntro } from "@/components/layout/page-intro";
import { EmptyState, ErrorState } from "@/components/ui/page-states";
import { getPublishedLearningModuleBySlug } from "@/features/learning/queries";
import { getUserModuleProgress } from "@/features/learning-progress/queries";
import { learningCategoryLabels } from "@/types/learning";

interface LearningModulePageProps {
    params: Promise<{ slug: string }>;
}

export const metadata: Metadata = { title: "Learning module" };
export const dynamic = "force-dynamic";

function getRecommendedGame(category: string): { label: string; href: string } | null {
    if (category === "ingredients") {
        return { label: "Practice in Ingredient Quiz", href: "/play/ingredient-quiz" };
    }
    if (category === "safety") {
        return { label: "Practice in Kitchen Challenge", href: "/play/kitchen-challenge" };
    }
    if (category === "techniques") {
        return { label: "Practice in Food Detective", href: "/play/food-detective" };
    }
    return null;
}

export default async function LearningModulePage({ params }: LearningModulePageProps) {
    const { slug } = await params;
    const result = await getPublishedLearningModuleBySlug(slug);

    if (result.status === "not-found") {
        notFound();
    }
    if (result.status === "unconfigured") {
        return <AuthPageShell><SupabaseSetupNotice /></AuthPageShell>;
    }
    if (result.status === "error") {
        return <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-12 sm:px-6 lg:px-10"><ErrorState message="This learning module couldn't be loaded. Please try again shortly." /></main>;
    }

    const { module } = result;
    const progress = await getUserModuleProgress(module.id);
    const recommendedGame = getRecommendedGame(module.category);

    return (
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
            <Link className="mb-6 inline-flex min-h-11 items-center text-sm font-semibold text-[#a8442d] hover:underline" href="/learn">Back to learning library</Link>
            <PageIntro description={module.description} eyebrow="Published learning module" title={module.title} />
            <div className="mt-5 flex flex-wrap gap-2">
                <Badge tone="neutral">{learningCategoryLabels[module.category]}</Badge>
                <Badge tone={module.difficulty === "Beginner" ? "green" : module.difficulty === "Intermediate" ? "yellow" : "coral"}>{module.difficulty}</Badge>
                {progress?.status === "completed" ? (
                    <Badge tone="green">
                        <CheckCircle2 aria-hidden="true" className="mr-1 inline" size={12} />
                        Completed · {progress.masteryScore}% Mastery
                    </Badge>
                ) : progress?.status === "in_progress" ? (
                    <Badge tone="yellow">
                        In progress · {progress.masteryScore}% Mastery
                    </Badge>
                ) : null}
            </div>

            {/* Persistent Learning Progress Card */}
            <div className="mt-8 rounded-xl border border-[#dfe7de] bg-[#fafbf9] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5c6d62]">Your Learning Progress</p>
                        <h3 className="display-font mt-1 text-2xl text-[#254235]">
                            {progress?.status === "completed"
                                ? "Module Completed"
                                : progress?.status === "in_progress"
                                    ? "In Progress"
                                    : "Not Started Yet"}
                        </h3>
                        <p className="mt-1 text-sm text-[#59675c]">
                            {progress
                                ? `Current educational mastery: ${progress.masteryScore}% based on authoritative gameplay practice.`
                                : "Play connected games to practice this topic and build persistent mastery."}
                        </p>
                    </div>
                    {recommendedGame ? (
                        <ButtonLink href={recommendedGame.href} variant="primary">
                            <PlayCircle aria-hidden="true" className="mr-2" size={17} />
                            {recommendedGame.label}
                        </ButtonLink>
                    ) : null}
                </div>
            </div>

            {module.sections.length ? (
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                    {module.sections.map((section, index) => (
                        <article className="rounded-lg border border-[#e7e3d9] bg-white p-5 sm:p-6" key={`${section.heading}-${index}`}>
                            <h2 className="display-font text-2xl text-[#254235]">{section.heading}</h2>
                            <p className="mt-3 text-sm leading-7 text-[#59675c]">{section.body}</p>
                        </article>
                    ))}
                </div>
            ) : (
                <div className="mt-8"><EmptyState title="Lesson content is being prepared">This published module does not have lesson sections available yet.</EmptyState></div>
            )}
            {module.category === "nutrition" ? <p className="mt-6 text-xs leading-5 text-[#59675c]">Nutrition content is for general education and is not medical advice.</p> : null}
        </main>
    );
}
