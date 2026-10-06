import type { Metadata } from "next";
import { LearningModuleCard } from "@/components/learning/learning-module-card";
import { SupabaseSetupNotice } from "@/components/auth/supabase-setup-notice";
import { PageIntro } from "@/components/layout/page-intro";
import { EmptyState, ErrorState } from "@/components/ui/page-states";
import { getPublishedLearningModules } from "@/features/learning/queries";
import { getUserLearningProgressSummary } from "@/features/learning-progress/queries";

export const metadata: Metadata = { title: "Learn" };
export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const [result, progressSummary] = await Promise.all([
    getPublishedLearningModules(),
    getUserLearningProgressSummary(),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
      <PageIntro
        description="Explore published lessons about ingredients, skills, tools, nutrition, food safety, and culinary traditions."
        eyebrow="Learn · kitchen library"
        title="Understand the why behind good food."
      />
      <section aria-label="Published learning modules" className="mt-9">
        {result.status === "unconfigured" ? <SupabaseSetupNotice /> : null}
        {result.status === "error" ? <ErrorState message="Learning content couldn't be loaded. Please try again shortly." /> : null}
        {result.status === "empty" ? <EmptyState title="No published lessons yet">Approved learning modules will appear here when they are ready.</EmptyState> : null}
        {result.status === "ready" ? (
          <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.modules.map((module) => (
              <LearningModuleCard
                key={module.id}
                module={module}
                progress={progressSummary?.modules[module.id] ?? null}
              />
            ))}
          </div>
        ) : null}
      </section>
      <section className="mt-14 border-t border-[#e7e3d9] pt-10" aria-labelledby="safety-heading">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#a8442d]">A careful kitchen</p>
        <h2 className="display-font text-3xl text-[#254235]" id="safety-heading">Food safety starts with good habits.</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-lg border border-[#e7e3d9] bg-white p-5">
            <h3 className="font-semibold text-[#254235]">Keep foods separate</h3>
            <p className="mt-2 text-sm leading-6 text-[#59675c]">Keep raw meat, poultry, seafood, and their juices apart from ready-to-eat foods during storage and preparation.</p>
          </article>
          <article className="rounded-lg border border-[#e7e3d9] bg-white p-5">
            <h3 className="font-semibold text-[#254235]">Check, do not guess</h3>
            <p className="mt-2 text-sm leading-6 text-[#59675c]">Use a food thermometer and current local guidance to check safe doneness; color alone is not a reliable measure.</p>
          </article>
          <article className="rounded-lg border border-[#e7e3d9] bg-white p-5">
            <h3 className="font-semibold text-[#254235]">Clean as you go</h3>
            <p className="mt-2 text-sm leading-6 text-[#59675c]">Wash hands, utensils, and work surfaces with soap and water after handling raw animal products.</p>
          </article>
        </div>
        <p className="mt-4 text-xs leading-5 text-[#59675c]">Food safety guidelines are general education, not a substitute for current local public-health guidance.</p>
      </section>
    </main>
  );
}
