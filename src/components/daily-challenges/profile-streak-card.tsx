import { Flame } from "lucide-react";
import type { UserStreakInfo } from "@/features/daily-challenges/types";

interface ProfileStreakCardProps {
    streak: UserStreakInfo;
}

export function ProfileStreakCard({ streak }: ProfileStreakCardProps) {
    const { currentStreak, longestStreak, hasActiveStreakToday } = streak;

    return (
        <section
            aria-labelledby="profile-streak-heading"
            className="rounded-3xl border border-[#f3dfc6] bg-gradient-to-br from-[#fffdfa] via-white to-[#fff7ed] p-6 shadow-xs"
        >
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#fed7aa] to-[#f97316] text-white shadow-xs">
                        <Flame size={24} aria-hidden="true" />
                    </div>
                    <div>
                        <h2 id="profile-streak-heading" className="text-lg font-bold text-[#1f2937]">
                            Daily Cooking Streak
                        </h2>
                        <p className="text-xs font-medium text-[#7d7363]">
                            {hasActiveStreakToday
                                ? "You've cooked today! Streak extended. 🔥"
                                : "Play a session today to keep your streak going."}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-[#fbd38d] bg-[#fffaf0] px-4 py-2 text-center">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#b45309]">
                            Current
                        </span>
                        <span className="text-xl font-extrabold text-[#9a3412]">
                            {currentStreak} {currentStreak === 1 ? "day" : "days"}
                        </span>
                    </div>

                    <div className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-2 text-center">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
                            Best Record
                        </span>
                        <span className="text-xl font-extrabold text-[#374151]">
                            {longestStreak} {longestStreak === 1 ? "day" : "days"}
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
}
