import type { UserLevelInfo } from "@/features/xp-levels/types";
import { Zap } from "lucide-react";

interface ProfileXpCardProps {
    levelInfo: UserLevelInfo | null;
}

export function ProfileXpCard({ levelInfo }: ProfileXpCardProps) {
    if (!levelInfo) {
        return (
            <div className="rounded-lg border border-[#e7e3d9] bg-[#fafbf9] p-5 sm:p-6">
                <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-full bg-[#e5eee2] text-[#254235]">
                        <Zap aria-hidden="true" size={18} />
                    </span>
                    <div>
                        <h3 className="text-base font-semibold text-[#254235]">Cooking Progress & Level</h3>
                        <p className="text-xs text-[#59675c]">Level 1 · 0 XP</p>
                    </div>
                </div>
            </div>
        );
    }

    const {
        level,
        totalXp,
        xpIntoLevel,
        xpNeededForNextLevel,
        progressPercent,
    } = levelInfo;

    return (
        <div className="mt-6 rounded-lg border border-[#e7e3d9] bg-[#fafbf9] p-5 sm:p-6" aria-labelledby="profile-level-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full bg-[#e5eee2] text-[#254235]">
                        <Zap aria-hidden="true" size={20} />
                    </span>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#59675c]" id="profile-level-heading">
                            Chef Level
                        </p>
                        <p className="display-font text-2xl font-bold text-[#254235]">
                            Level {level}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#59675c]">Total XP</p>
                    <p className="display-font text-2xl font-bold text-[#3d7b52]">{totalXp} XP</p>
                </div>
            </div>

            <div className="mt-5">
                <div className="flex items-center justify-between text-xs font-medium text-[#59675c]">
                    <span>{xpIntoLevel} / {xpNeededForNextLevel} XP to Level {level + 1}</span>
                    <span>{progressPercent}%</span>
                </div>
                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[#edf0e9]">
                    <div
                        className="h-full rounded-full bg-[#3d7b52] transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                        role="progressbar"
                        aria-valuenow={progressPercent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Progress to Level ${level + 1}`}
                    />
                </div>
            </div>
        </div>
    );
}
