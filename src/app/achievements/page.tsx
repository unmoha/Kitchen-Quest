import type { Metadata } from "next";
import Link from "next/link";
import { Award, Trophy } from "lucide-react";
import { PageIntro } from "@/components/layout/page-intro";
import { AchievementList } from "@/components/achievements/achievement-list";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAchievementPersistence } from "@/features/achievements/service";
import { getUserAchievementsWithProgressQuery } from "@/features/achievements/queries";
import type { AchievementRequirement, AchievementWithProgress } from "@/features/achievements/types";

export const metadata: Metadata = { title: "Achievements" };

export default async function AchievementsPage() {
    const client = await createSupabaseServerClient();
    let achievements: AchievementWithProgress[] = [];
    let isAuthenticated = false;

    if (client) {
        const { data: { user } } = await client.auth.getUser();
        if (user) {
            isAuthenticated = true;
            achievements = await getUserAchievementsWithProgressQuery(user.id);
        } else {
            // Guest mode: fetch published achievements with 0 progress
            const persistence = createSupabaseAchievementPersistence(client);
            const publishedRows = await persistence.getPublishedAchievements();
            achievements = publishedRows.map((row) => ({
                id: row.id,
                name: row.name,
                slug: row.slug,
                description: row.description,
                icon: row.icon,
                requirement: row.requirement as unknown as AchievementRequirement,
                status: row.status,
                createdAt: row.created_at,
                isUnlocked: false,
                unlockedAt: null,
                currentProgress: 0,
                maxProgress: 1,
                progressPercent: 0,
            }));
        }
    }

    const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
    const totalCount = achievements.length;
    const percentComplete = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

    return (
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
            <PageIntro
                description="Celebrate your milestones as you learn culinary techniques, explore recipes, and master kitchen quests."
                eyebrow="Your Milestones"
                title="Achievements"
            />

            {!isAuthenticated && (
                <div className="mt-6 rounded-2xl border border-[#e5ded0] bg-[#fbf8f2] p-4 text-sm text-[#5f6979] flex items-center justify-between gap-4">
                    <span>Sign in to track and unlock your culinary achievements as you play!</span>
                    <Link
                        href="/auth/login"
                        className="shrink-0 rounded-full bg-[#2d3748] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#1a202c]"
                    >
                        Sign In
                    </Link>
                </div>
            )}

            {/* Overview Banner */}
            <div className="mt-8 rounded-3xl border border-[#d8be8a]/40 bg-gradient-to-r from-[#faf6ed] via-[#f7f0e1] to-[#fbf8f2] p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[#f8de9d] to-[#d8be8a] text-[#543b0c] shadow-sm">
                            <Trophy size={28} aria-hidden="true" />
                        </div>
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-[#8a6c25]">
                                Culinary Collection
                            </div>
                            <div className="text-2xl font-black text-[#1f2937]">
                                {unlockedCount} of {totalCount} Unlocked
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:w-64 sm:items-end">
                        <div className="flex items-center gap-2 text-sm font-bold text-[#1f2937]">
                            <Award size={16} className="text-[#b39556]" />
                            <span>{percentComplete}% Complete</span>
                        </div>
                        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#e8dfcf]">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-[#d8be8a] to-[#b39556] transition-all duration-500"
                                style={{ width: `${percentComplete}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Achievement Collection List */}
            <div className="mt-8">
                <AchievementList achievements={achievements} />
            </div>
        </main>
    );
}