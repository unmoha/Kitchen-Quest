"use client";

import { useState } from "react";
import type { AchievementWithProgress } from "@/features/achievements/types";
import { AchievementCard } from "./achievement-card";

interface AchievementListProps {
    achievements: AchievementWithProgress[];
}

type FilterTab = "all" | "unlocked" | "locked";

export function AchievementList({ achievements }: AchievementListProps) {
    const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

    const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
    const lockedCount = achievements.length - unlockedCount;

    const filteredAchievements = achievements.filter((a) => {
        if (activeFilter === "unlocked") return a.isUnlocked;
        if (activeFilter === "locked") return !a.isUnlocked;
        return true;
    });

    return (
        <div>
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-[#e5ded0] pb-4">
                <button
                    type="button"
                    onClick={() => setActiveFilter("all")}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${activeFilter === "all"
                        ? "bg-[#2d3748] text-white shadow-sm"
                        : "bg-white/80 text-[#5f6979] hover:bg-[#eae3d5] hover:text-[#1f2937]"
                        }`}
                >
                    All ({achievements.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveFilter("unlocked")}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${activeFilter === "unlocked"
                        ? "bg-[#2d3748] text-white shadow-sm"
                        : "bg-white/80 text-[#5f6979] hover:bg-[#eae3d5] hover:text-[#1f2937]"
                        }`}
                >
                    Unlocked ({unlockedCount})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveFilter("locked")}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${activeFilter === "locked"
                        ? "bg-[#2d3748] text-white shadow-sm"
                        : "bg-white/80 text-[#5f6979] hover:bg-[#eae3d5] hover:text-[#1f2937]"
                        }`}
                >
                    Locked ({lockedCount})
                </button>
            </div>

            {/* Grid */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredAchievements.map((achievement) => (
                    <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
            </div>

            {filteredAchievements.length === 0 && (
                <div className="mt-12 text-center text-sm text-[#7d7363]">
                    No achievements match this filter.
                </div>
            )}
        </div>
    );
}
