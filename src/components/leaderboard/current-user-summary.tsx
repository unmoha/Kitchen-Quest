import Link from "next/link";
import { Trophy, Zap, Shield, LogIn } from "lucide-react";
import type { CurrentUserRankSummary } from "@/features/leaderboard/types";

interface CurrentUserSummaryProps {
    currentUser: CurrentUserRankSummary | null;
    isAuthenticated: boolean;
}

export function CurrentUserSummary({ currentUser, isAuthenticated }: CurrentUserSummaryProps) {
    if (!isAuthenticated) {
        return (
            <section
                aria-label="Your ranking summary"
                className="rounded-2xl border border-[#d9e5db] bg-gradient-to-br from-[#f2f7f3] to-[#e8f1eb] p-6 shadow-sm"
            >
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                        <span className="grid size-12 place-items-center rounded-xl bg-[#254235] text-[#e8f4ec]">
                            <Trophy aria-hidden="true" size={24} />
                        </span>
                        <div>
                            <h2 className="text-base font-bold text-[#1f3328]">Want to join the leaderboard?</h2>
                            <p className="text-xs text-[#59675c]">Sign in to earn XP, increase your level, and claim your place among Kitchen Quest cooks.</p>
                        </div>
                    </div>
                    <Link
                        href="/auth/login?redirect=/leaderboard"
                        className="inline-flex items-center gap-2 rounded-xl bg-[#254235] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a2f25] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#254235]"
                    >
                        <LogIn size={16} aria-hidden="true" />
                        <span>Sign In</span>
                    </Link>
                </div>
            </section>
        );
    }

    if (!currentUser) {
        return null;
    }

    const { rank, totalXp, level, displayName } = currentUser;

    return (
        <section
            aria-label="Your ranking summary"
            className="rounded-2xl border border-[#d9e5db] bg-gradient-to-br from-[#f6faf7] to-[#eaf3ec] p-6 shadow-sm"
        >
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#59675c]">
                        Your Standing
                    </p>
                    <h2 className="display-font text-xl font-bold text-[#1f3328]">
                        {displayName}
                    </h2>
                </div>

                <div className="grid grid-cols-3 gap-3 sm:gap-6">
                    {/* Rank */}
                    <div className="flex items-center gap-2.5 rounded-xl border border-[#dce8df] bg-white/80 px-3.5 py-2.5 shadow-2xs">
                        <span className="grid size-9 place-items-center rounded-lg bg-[#e5eee2] text-[#254235]">
                            <Trophy aria-hidden="true" size={18} />
                        </span>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b7b6e]">Rank</p>
                            <p className="text-base font-extrabold text-[#1f3328]">
                                {rank !== null ? `#${rank}` : "Unranked"}
                            </p>
                        </div>
                    </div>

                    {/* Total XP */}
                    <div className="flex items-center gap-2.5 rounded-xl border border-[#dce8df] bg-white/80 px-3.5 py-2.5 shadow-2xs">
                        <span className="grid size-9 place-items-center rounded-lg bg-[#fff1d6] text-[#915809]">
                            <Zap aria-hidden="true" size={18} />
                        </span>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b7b6e]">Total XP</p>
                            <p className="text-base font-extrabold text-[#915809]">
                                {totalXp}
                            </p>
                        </div>
                    </div>

                    {/* Chef Level */}
                    <div className="flex items-center gap-2.5 rounded-xl border border-[#dce8df] bg-white/80 px-3.5 py-2.5 shadow-2xs">
                        <span className="grid size-9 place-items-center rounded-lg bg-[#e1edf4] text-[#1c5d79]">
                            <Shield aria-hidden="true" size={18} />
                        </span>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b7b6e]">Level</p>
                            <p className="text-base font-extrabold text-[#1c5d79]">
                                Lvl {level}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
