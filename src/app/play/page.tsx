import type { Metadata } from "next";
import { gameModes } from "@/data/game-modes";
import { GameModeCard } from "@/components/game/game-mode-card";
import { PageIntro } from "@/components/layout/page-intro";
import { DailyChallengeCard } from "@/components/daily-challenges/daily-challenge-card";
import { getTodaysChallengeQuery, getUserStreakQuery } from "@/features/daily-challenges/queries";
import { getAuthenticatedUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Play" };
export const dynamic = "force-dynamic";

export default async function PlayPage() {
  const user = await getAuthenticatedUser();
  const userId = user?.id;

  const [todaysChallenge, userStreak] = await Promise.all([
    getTodaysChallengeQuery(userId),
    getUserStreakQuery(userId),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
      <PageIntro
        description="Build kitchen intuition and culinary know-how through five unique game formats with instant server-validated scoring and XP rewards."
        eyebrow="Play · Challenge Hub"
        title="Sharpen your kitchen skills."
      />

      {todaysChallenge && (
        <div className="mt-7">
          <DailyChallengeCard
            challenge={todaysChallenge}
            streak={userStreak}
            isAuthenticated={Boolean(user)}
          />
        </div>
      )}

      <div className="mt-9 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {gameModes.map((mode, index) => (
          <GameModeCard
            ctaLabel={
              mode.id === "ingredient-quiz"
                || mode.id === "recipe-builder"
                || mode.id === "cooking-order"
                || mode.id === "kitchen-challenge"
                || mode.id === "food-detective"
                ? "Play now"
                : undefined
            }
            href={
              mode.id === "ingredient-quiz"
                ? "/play/ingredient-quiz"
                : mode.id === "recipe-builder"
                  ? "/play/recipe-builder"
                  : mode.id === "cooking-order"
                    ? "/play/cooking-order"
                    : mode.id === "kitchen-challenge"
                      ? "/play/kitchen-challenge"
                      : mode.id === "food-detective"
                        ? "/play/food-detective"
                        : undefined
            }
            index={index}
            key={mode.id}
            mode={mode}
          />
        ))}
      </div>
    </main>
  );
}