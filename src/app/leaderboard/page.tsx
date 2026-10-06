import type { Metadata } from "next";
import { getAuthenticatedUser } from "@/lib/auth/current-user";
import { getLeaderboardQuery } from "@/features/leaderboard/queries";
import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";

export const metadata: Metadata = {
    title: "Leaderboard",
    description: "See how your XP compares with other Kitchen Quest players.",
};

interface LeaderboardPageProps {
    searchParams: Promise<{
        page?: string;
    }>;
}

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
    const params = await searchParams;
    const pageNumber = params.page ? parseInt(params.page, 10) : 1;
    const user = await getAuthenticatedUser();

    const leaderboardData = await getLeaderboardQuery({
        page: Number.isNaN(pageNumber) ? 1 : pageNumber,
    });

    return (
        <LeaderboardView
            data={leaderboardData}
            isAuthenticated={Boolean(user)}
        />
    );
}