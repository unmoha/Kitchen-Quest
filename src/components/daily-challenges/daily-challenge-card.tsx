import Link from "next/link";
import { Flame, CheckCircle2, Sparkles, Utensils, BookOpen, Apple, ArrowRight } from "lucide-react";
import type { DailyChallengeWithStatus, UserStreakInfo } from "@/features/daily-challenges/types";

interface DailyChallengeCardProps {
    challenge: DailyChallengeWithStatus | null;
    streak: UserStreakInfo | null;
    isAuthenticated?: boolean;
}

function getChallengeIcon(type: string) {
    switch (type) {
        case "recipe":
            return <Utensils className="size-5" aria-hidden="true" />;
        case "learning_module":
            return <BookOpen className="size-5" aria-hidden="true" />;
        case "ingredient":
            return <Apple className="size-5" aria-hidden="true" />;
        default:
            return <Sparkles className="size-5" aria-hidden="true" />;
    }
}

export function DailyChallengeCard({ challenge, streak, isAuthenticated = false }: DailyChallengeCardProps) {
    if (!challenge) {
        return null;
    }

    const currentStreak = streak?.currentStreak ?? 0;
    const isCompleted = challenge.isCompleted;

    return (
        <section
            aria-labelledby="daily-challenge-title"
            className="relative overflow-hidden rounded-3xl border border-[#e5ded0] bg-gradient-to-br from-[#faf7f2] via-[#ffffff] to-[#f5efe4] p-6 shadow-sm sm:p-7"
        >
            {/* Header: Badge & Streak */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fbeada] px-3 py-1 text-xs font-bold text-[#b45309]">
                        <Sparkles className="size-3.5" aria-hidden="true" />
                        Today&apos;s Quest
                    </span>
                    <span className="text-xs text-[#7d7363]">
                        {challenge.challengeDate}
                    </span>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-[#f3dfc6] bg-gradient-to-r from-[#fff7ed] to-[#fef3c7] px-3.5 py-1 text-xs font-bold text-[#b45309] shadow-xs">
                    <Flame className={`size-4 ${currentStreak > 0 ? "text-[#f97316] animate-pulse" : "text-[#9ca3af]"}`} aria-hidden="true" />
                    <span>{currentStreak} {currentStreak === 1 ? "day" : "days"} streak</span>
                </div>
            </div>

            {/* Main content: Icon & Challenge Details */}
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#f8de9d] to-[#d8be8a] text-[#543b0c] shadow-xs">
                        {getChallengeIcon(challenge.challengeType)}
                    </div>
                    <div>
                        <h2 id="daily-challenge-title" className="text-lg font-bold text-[#1f2937] sm:text-xl">
                            {challenge.title}
                        </h2>
                        <p className="mt-1 text-sm text-[#5f6979] leading-relaxed max-w-xl">
                            {challenge.description}
                        </p>
                    </div>
                </div>

                <div className="shrink-0 pt-1">
                    {isCompleted ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f5e9] border border-[#c8e6c9] px-4 py-2 text-xs font-bold text-[#2e7d32]">
                            <CheckCircle2 className="size-4" aria-hidden="true" />
                            <span>Completed Today</span>
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#eef4ee] border border-[#d6e4d6] px-4 py-2 text-xs font-semibold text-[#254235]">
                            <span>Active · Play a game to complete</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Guest reminder if not authenticated */}
            {!isAuthenticated && (
                <div className="mt-5 rounded-2xl border border-[#ebe5d8] bg-white/70 p-3.5 text-xs text-[#5f6979] flex items-center justify-between gap-4">
                    <span>Sign in to save your daily streak and record completions!</span>
                    <Link
                        href="/auth/login?next=%2Fplay"
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#254235] hover:underline shrink-0"
                    >
                        <span>Sign in</span>
                        <ArrowRight className="size-3" />
                    </Link>
                </div>
            )}
        </section>
    );
}
