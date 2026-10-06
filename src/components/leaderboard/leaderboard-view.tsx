import { PageIntro } from "@/components/layout/page-intro";
import { CurrentUserSummary } from "./current-user-summary";
import { LeaderboardTable } from "./leaderboard-table";
import type { LeaderboardPageData } from "@/features/leaderboard/types";

interface LeaderboardViewProps {
    data: LeaderboardPageData;
    isAuthenticated: boolean;
}

export function LeaderboardView({ data, isAuthenticated }: LeaderboardViewProps) {
    return (
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
            <PageIntro
                eyebrow="Community Rankings"
                title="Leaderboard"
                description="See how your XP compares with other Kitchen Quest players."
            />

            <div className="mt-8 space-y-8">
                {/* Current User Standing Card */}
                <CurrentUserSummary
                    currentUser={data.currentUser}
                    isAuthenticated={isAuthenticated}
                />

                {/* Leaderboard Standings Table */}
                <LeaderboardTable
                    entries={data.entries}
                    currentPage={data.currentPage}
                    totalPages={data.totalPages}
                    totalPlayers={data.totalPlayers}
                />
            </div>
        </main>
    );
}
