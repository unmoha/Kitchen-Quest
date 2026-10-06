import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import type { AchievementsSummary } from "@/features/achievements/types";
import { AchievementIcon } from "@/components/achievements/achievement-icon";

interface ProfileAchievementsCardProps {
    summary: AchievementsSummary;
}

export function ProfileAchievementsCard({ summary }: ProfileAchievementsCardProps) {
    return (
        <section className="rounded-3xl border border-[#d8be8a]/40 bg-gradient-to-br from-[#faf6ed] via-white to-[#fbf8f2] p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#f8de9d] to-[#d8be8a] text-[#543b0c] shadow-sm">
                        <Trophy size={24} aria-hidden="true" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-[#1f2937]">Achievements</h2>
                        <p className="text-xs font-medium text-[#7d7363]">
                            {summary.unlockedCount} of {summary.totalAchievements} unlocked ({summary.percentComplete}%)
                        </p>
                    </div>
                </div>

                <Link
                    href="/achievements"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#f4ece0] px-3.5 py-1.5 text-xs font-semibold text-[#543b0c] hover:bg-[#ebdcc8] transition-colors"
                >
                    <span>View All</span>
                    <ArrowRight size={13} />
                </Link>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#ebe3d5]">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-[#d8be8a] to-[#b39556] transition-all duration-300"
                        style={{ width: `${summary.percentComplete}%` }}
                    />
                </div>
            </div>

            {/* Recent Unlocks */}
            {summary.recentUnlocks.length > 0 ? (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {summary.recentUnlocks.map((item) => (
                        <div
                            key={item.id}
                            className="flex flex-col items-center rounded-2xl border border-[#e8dfcf] bg-white/80 p-3 text-center"
                        >
                            <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#f8de9d] to-[#d8be8a] text-[#543b0c]">
                                <AchievementIcon name={item.icon} size={18} />
                            </div>
                            <span className="mt-2 text-xs font-bold text-[#1f2937] line-clamp-1">
                                {item.name}
                            </span>
                            <span className="text-[10px] text-[#2e7d32] font-semibold mt-0.5">
                                Unlocked
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="mt-4 text-center rounded-2xl border border-dashed border-[#d8be8a]/60 bg-white/50 py-4 px-3 text-xs text-[#7d7363]">
                    Play game quests and study recipe lessons to earn your first achievement badge!
                </div>
            )}
        </section>
    );
}
