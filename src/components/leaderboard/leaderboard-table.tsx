import Link from "next/link";
import { ChevronLeft, ChevronRight, Crown, Medal, Trophy, User } from "lucide-react";
import type { LeaderboardEntry } from "@/features/leaderboard/types";

interface LeaderboardTableProps {
    entries: LeaderboardEntry[];
    currentPage: number;
    totalPages: number;
    totalPlayers: number;
}

function getRankBadge(rank: number) {
    if (rank === 1) {
        return (
            <span
                aria-label="1st place"
                className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-[#f8d469] to-[#dca11c] text-[#4a3504] shadow-xs font-black text-sm"
            >
                <Crown size={18} aria-hidden="true" />
            </span>
        );
    }
    if (rank === 2) {
        return (
            <span
                aria-label="2nd place"
                className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-[#e4e7eb] to-[#bcc2cc] text-[#2c3440] shadow-xs font-black text-sm"
            >
                <Medal size={18} aria-hidden="true" />
            </span>
        );
    }
    if (rank === 3) {
        return (
            <span
                aria-label="3rd place"
                className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-[#e8be99] to-[#bf7e4f] text-[#422008] shadow-xs font-black text-sm"
            >
                <Medal size={18} aria-hidden="true" />
            </span>
        );
    }
    return (
        <span className="grid size-8 place-items-center rounded-full bg-[#edf1ed] text-xs font-bold text-[#445347]">
            #{rank}
        </span>
    );
}

function getInitials(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return "C";
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
}

export function LeaderboardTable({
    entries,
    currentPage,
    totalPages,
    totalPlayers,
}: LeaderboardTableProps) {
    if (entries.length === 0) {
        return (
            <section
                aria-label="Leaderboard standings"
                className="mt-6 rounded-2xl border border-[#e5ece6] bg-white p-12 text-center shadow-xs"
            >
                <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#f0f5f1] text-[#3d7b52]">
                    <Trophy size={32} aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#1f3328]">No ranked players yet</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-[#59675c]">
                    Complete learning modules, recipes, and game sessions to earn XP and claim the top spot on the leaderboard!
                </p>
                <div className="mt-6">
                    <Link
                        href="/play"
                        className="inline-flex items-center gap-2 rounded-xl bg-[#254235] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b3127]"
                    >
                        <span>Start Playing</span>
                    </Link>
                </div>
            </section>
        );
    }

    const hasPrev = currentPage > 1;
    const hasNext = currentPage < totalPages;

    return (
        <section aria-label="Leaderboard standings" className="mt-6">
            <div className="overflow-hidden rounded-2xl border border-[#e2ece4] bg-white shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm" aria-describedby="leaderboard-caption">
                        <caption id="leaderboard-caption" className="sr-only">
                            Kitchen Quest cumulative XP leaderboard ranking showing {totalPlayers} total players
                        </caption>
                        <thead className="border-b border-[#e5eee7] bg-[#f8faf8] text-xs font-bold uppercase tracking-wider text-[#59675c]">
                            <tr>
                                <th scope="col" className="py-3.5 pl-4 pr-3 text-center sm:pl-6 w-16">
                                    Rank
                                </th>
                                <th scope="col" className="px-3 py-3.5">
                                    Cook
                                </th>
                                <th scope="col" className="px-3 py-3.5 text-center">
                                    Level
                                </th>
                                <th scope="col" className="py-3.5 pl-3 pr-4 text-right sm:pr-6">
                                    Total XP
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#edf3ee]">
                            {entries.map((entry) => {
                                const isCurrent = entry.isCurrentUser;
                                return (
                                    <tr
                                        key={entry.userId}
                                        className={`transition-colors ${
                                            isCurrent
                                                ? "bg-[#eaf4ec]/70 font-semibold"
                                                : "hover:bg-[#fafbfa]"
                                        }`}
                                    >
                                        {/* Rank Column */}
                                        <td className="py-3.5 pl-4 pr-3 text-center sm:pl-6">
                                            <div className="flex justify-center">
                                                {getRankBadge(entry.rank)}
                                            </div>
                                        </td>

                                        {/* Cook Profile Column */}
                                        <td className="px-3 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    aria-hidden="true"
                                                    className="grid size-9 shrink-0 place-items-center rounded-full bg-[#dbe8dd] text-xs font-bold text-[#234233]"
                                                >
                                                    {entry.avatarUrl ? (
                                                        <User size={16} />
                                                    ) : (
                                                        <span>{getInitials(entry.displayName)}</span>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="truncate font-bold text-[#1f3328]">
                                                            {entry.displayName}
                                                        </span>
                                                        {isCurrent && (
                                                            <span
                                                                className="rounded-md bg-[#254235] px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white"
                                                                aria-label="You (current user)"
                                                            >
                                                                You
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Level Column */}
                                        <td className="px-3 py-3.5 text-center">
                                            <span className="inline-flex items-center rounded-lg border border-[#d6e4d9] bg-[#f2f8f4] px-2.5 py-1 text-xs font-bold text-[#254235]">
                                                Lvl {entry.level}
                                            </span>
                                        </td>

                                        {/* Total XP Column */}
                                        <td className="py-3.5 pl-3 pr-4 text-right sm:pr-6">
                                            <span className="font-extrabold text-[#915809]">
                                                {entry.totalXp.toLocaleString()} <span className="text-xs font-semibold text-[#8b7762]">XP</span>
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <nav
                        aria-label="Leaderboard pagination"
                        className="flex items-center justify-between border-t border-[#e5eee7] bg-[#f8faf8] px-4 py-3 sm:px-6"
                    >
                        <div>
                            <p className="text-xs text-[#59675c]">
                                Page <span className="font-bold text-[#1f3328]">{currentPage}</span> of{" "}
                                <span className="font-bold text-[#1f3328]">{totalPages}</span> ({totalPlayers} players)
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {hasPrev ? (
                                <Link
                                    href={`/leaderboard?page=${currentPage - 1}`}
                                    className="inline-flex items-center gap-1 rounded-lg border border-[#d4e1d7] bg-white px-3 py-1.5 text-xs font-semibold text-[#254235] shadow-2xs hover:bg-[#edf4ef]"
                                    aria-label="Go to previous page"
                                >
                                    <ChevronLeft size={16} aria-hidden="true" />
                                    <span>Previous</span>
                                </Link>
                            ) : (
                                <button
                                    disabled
                                    className="inline-flex items-center gap-1 rounded-lg border border-[#e4ede6] bg-[#f4f7f4] px-3 py-1.5 text-xs font-semibold text-[#a0ada3] cursor-not-allowed"
                                    aria-label="Previous page disabled"
                                >
                                    <ChevronLeft size={16} aria-hidden="true" />
                                    <span>Previous</span>
                                </button>
                            )}

                            {hasNext ? (
                                <Link
                                    href={`/leaderboard?page=${currentPage + 1}`}
                                    className="inline-flex items-center gap-1 rounded-lg border border-[#d4e1d7] bg-white px-3 py-1.5 text-xs font-semibold text-[#254235] shadow-2xs hover:bg-[#edf4ef]"
                                    aria-label="Go to next page"
                                >
                                    <span>Next</span>
                                    <ChevronRight size={16} aria-hidden="true" />
                                </Link>
                            ) : (
                                <button
                                    disabled
                                    className="inline-flex items-center gap-1 rounded-lg border border-[#e4ede6] bg-[#f4f7f4] px-3 py-1.5 text-xs font-semibold text-[#a0ada3] cursor-not-allowed"
                                    aria-label="Next page disabled"
                                >
                                    <span>Next</span>
                                    <ChevronRight size={16} aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    </nav>
                )}
            </div>
        </section>
    );
}
