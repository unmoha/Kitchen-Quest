import { Trophy } from "lucide-react";
import type { AchievementItem } from "@/features/achievements/types";
import { AchievementIcon } from "@/components/achievements/achievement-icon";

interface GameAchievementsSummaryProps {
    newlyUnlockedAchievements?: AchievementItem[];
}

export function GameAchievementsSummary({ newlyUnlockedAchievements }: GameAchievementsSummaryProps) {
    if (!newlyUnlockedAchievements || newlyUnlockedAchievements.length === 0) {
        return null;
    }

    return (
        <div className="rounded-2xl border-2 border-[#d8be8a] bg-gradient-to-br from-[#fefbf6] via-[#faf3e3] to-[#f5ebd2] p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 text-[#543b0c]">
                <div className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-[#f8de9d] to-[#d8be8a] text-[#543b0c] shadow-sm">
                    <Trophy size={18} aria-hidden="true" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider">
                    {newlyUnlockedAchievements.length === 1
                        ? "Achievement Unlocked!"
                        : `${newlyUnlockedAchievements.length} Achievements Unlocked!`}
                </h3>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
                {newlyUnlockedAchievements.map((achievement) => (
                    <div
                        key={achievement.id}
                        className="flex items-center gap-3 rounded-xl border border-[#d8be8a]/60 bg-white/90 p-3 shadow-xs"
                    >
                        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#f8de9d] to-[#d8be8a] text-[#543b0c]">
                            <AchievementIcon name={achievement.icon} size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-[#1f2937] truncate">
                                {achievement.name}
                            </h4>
                            <p className="text-xs text-[#5f6979] line-clamp-1">
                                {achievement.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
