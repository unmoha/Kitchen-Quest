import { Flame, CheckCircle2 } from "lucide-react";
import type { DailyChallengeSessionUpdate, StreakSessionUpdate } from "@/features/daily-challenges/types";

interface GameDailySummaryProps {
    dailyChallengeUpdate?: DailyChallengeSessionUpdate | null;
    streakUpdate?: StreakSessionUpdate | null;
}

export function GameDailySummary({ dailyChallengeUpdate, streakUpdate }: GameDailySummaryProps) {
    if (!dailyChallengeUpdate?.isNewlyCompleted && !streakUpdate?.isIncremented) {
        return null;
    }

    return (
        <div className="space-y-3">
            {streakUpdate?.isIncremented && (
                <div
                    role="status"
                    aria-live="polite"
                    className="flex items-center justify-between rounded-2xl border border-[#fed7aa] bg-gradient-to-r from-[#fff7ed] via-[#fffaf0] to-[#fef3c7] p-4 text-[#9a3412] shadow-xs"
                >
                    <div className="flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white shadow-xs">
                            <Flame size={20} className="animate-bounce" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
                                Streak Extended! 🔥
                            </p>
                            <p className="text-sm font-semibold text-[#7c2d12]">
                                {streakUpdate.currentStreak} day cooking streak
                            </p>
                        </div>
                    </div>
                    {streakUpdate.currentStreak >= streakUpdate.longestStreak && streakUpdate.currentStreak > 1 && (
                        <span className="rounded-full bg-[#fed7aa] px-2.5 py-1 text-[11px] font-extrabold text-[#9a3412]">
                            New Personal Best!
                        </span>
                    )}
                </div>
            )}

            {dailyChallengeUpdate?.isNewlyCompleted && (
                <div
                    role="status"
                    aria-live="polite"
                    className="flex items-center justify-between rounded-2xl border border-[#bbf7d0] bg-gradient-to-r from-[#f0fdf4] via-white to-[#ecfdf5] p-4 text-[#166534] shadow-xs"
                >
                    <div className="flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-white shadow-xs">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#16a34a]">
                                Daily Quest Completed! 🎉
                            </p>
                            <p className="text-sm font-semibold text-[#14532d]">
                                {dailyChallengeUpdate.title}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
