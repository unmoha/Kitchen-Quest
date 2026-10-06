import { CheckCircle2, Lock } from "lucide-react";
import type { AchievementWithProgress } from "@/features/achievements/types";
import { AchievementIcon } from "./achievement-icon";

interface AchievementCardProps {
    achievement: AchievementWithProgress;
}

export function AchievementCard({ achievement }: AchievementCardProps) {
    const formattedDate = achievement.unlockedAt
        ? new Date(achievement.unlockedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
        : null;

    return (
        <div
            className={`flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 ${achievement.isUnlocked
                ? "border-[#d8be8a]/60 bg-gradient-to-br from-white via-[#fefbf6] to-[#faf3e3] shadow-sm"
                : "border-[#ece5d8] bg-white/70 opacity-80"
                }`}
        >
            <div>
                <div className="flex items-start justify-between gap-3">
                    <div
                        className={`grid size-12 place-items-center rounded-2xl ${achievement.isUnlocked
                            ? "bg-gradient-to-br from-[#f8de9d] to-[#d8be8a] text-[#543b0c] shadow-sm"
                            : "bg-[#f2ece2] text-[#8c8273]"
                            }`}
                    >
                        <AchievementIcon name={achievement.icon} size={24} />
                    </div>
                    {achievement.isUnlocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f5e9] px-2.5 py-0.5 text-xs font-semibold text-[#2e7d32]">
                            <CheckCircle2 size={13} className="shrink-0" />
                            Unlocked
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#f2ece2] px-2.5 py-0.5 text-xs font-semibold text-[#7d7363]">
                            <Lock size={12} className="shrink-0" />
                            Locked
                        </span>
                    )}
                </div>

                <h3 className="mt-3.5 text-base font-bold text-[#1f2937]">
                    {achievement.name}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-[#4b5563]">
                    {achievement.description}
                </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#f0eae0]/80">
                {achievement.isUnlocked ? (
                    <div className="text-xs font-medium text-[#7d7363]">
                        {formattedDate ? `Unlocked on ${formattedDate}` : "Unlocked"}
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center justify-between text-xs font-medium text-[#6b7280]">
                            <span>Progress</span>
                            <span>
                                {achievement.currentProgress} / {achievement.maxProgress}
                            </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#ebe3d5]">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-[#d8be8a] to-[#b39556] transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.max(0, achievement.progressPercent))}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
