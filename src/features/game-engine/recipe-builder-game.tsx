"use client";

import { useRef, useState } from "react";
import { Check, Circle, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/page-states";
import { startRecipeBuilderSession, submitRecipeBuilderAnswer } from "@/features/game-engine/recipe-builder-actions";
import { GameXpSummary } from "@/components/game/game-xp-summary";
import { GameAchievementsSummary } from "@/components/game/game-achievements-summary";
import { GameDailySummary } from "@/components/game/game-daily-summary";
import type { SessionXpSummary } from "@/features/xp-levels/types";
import type { AchievementItem } from "@/features/achievements/types";
import type { RecipeBuilderChallenge } from "@/features/game-engine/types";
import type { DailyChallengeSessionUpdate, StreakSessionUpdate } from "@/features/daily-challenges/types";

interface AnswerFeedback {
    isCorrect: boolean;
    message: string;
}

export function RecipeBuilderGame() {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [challenges, setChallenges] = useState<RecipeBuilderChallenge[]>([]);
    const [challengeIndex, setChallengeIndex] = useState(0);
    const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>([]);
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [completedCount, setCompletedCount] = useState(0);
    const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [progressUpdates, setProgressUpdates] = useState<import("@/features/learning-progress/types").SessionProgressUpdate[]>([]);
    const [xpSummary, setXpSummary] = useState<SessionXpSummary | null>(null);
    const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState<AchievementItem[]>([]);
    const [streakUpdate, setStreakUpdate] = useState<StreakSessionUpdate | null>(null);
    const [dailyChallengeUpdate, setDailyChallengeUpdate] = useState<DailyChallengeSessionUpdate | null>(null);
    const startedAtRef = useRef<number | null>(null);

    const challenge = challenges[challengeIndex];

    async function handleStart() {
        setError(null);
        setIsStarting(true);
        setProgressUpdates([]);
        setXpSummary(null);
        setNewlyUnlockedAchievements([]);
        setStreakUpdate(null);
        setDailyChallengeUpdate(null);
        try {
            const result = await startRecipeBuilderSession();
            if (result.challenges.length === 0) {
                setChallenges([]);
                setError("No published recipe challenges are available yet.");
                return;
            }

            setSessionId(result.sessionId);
            setChallenges(result.challenges);
            setChallengeIndex(0);
            setSelectedIngredientIds([]);
            setScore(result.score);
            setCorrectCount(0);
            setCompletedCount(0);
            setFeedback(null);
            setIsComplete(false);
            startedAtRef.current = Date.now();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "We could not start Recipe Builder.");
        } finally {
            setIsStarting(false);
        }
    }

    function toggleIngredient(ingredientId: string) {
        setSelectedIngredientIds((current) => current.includes(ingredientId)
            ? current.filter((id) => id !== ingredientId)
            : [...current, ingredientId]);
    }

    async function handleSubmit() {
        if (!sessionId || !challenge || selectedIngredientIds.length === 0 || isSubmitting || feedback) {
            return;
        }

        setError(null);
        setIsSubmitting(true);
        try {
            const result = await submitRecipeBuilderAnswer({
                sessionId,
                recipeId: challenge.recipeId,
                selectedIngredientIds,
                responseTimeMs: startedAtRef.current === null ? null : Date.now() - startedAtRef.current,
            });
            setScore(result.score);
            setCorrectCount(result.correctCount);
            setCompletedCount(result.completedCount);
            if (result.progressUpdates) {
                setProgressUpdates(result.progressUpdates);
            }
            if (result.xpSummary) {
                setXpSummary(result.xpSummary);
            }
            if (result.newlyUnlockedAchievements) {
                setNewlyUnlockedAchievements(result.newlyUnlockedAchievements);
            }
            if (result.streakUpdate) {
                setStreakUpdate(result.streakUpdate);
            }
            if (result.dailyChallengeUpdate) {
                setDailyChallengeUpdate(result.dailyChallengeUpdate);
            }
            setFeedback({
                isCorrect: result.isCorrect,
                message: result.isCorrect
                    ? "That ingredient set matches the recipe."
                    : "That set does not match the recipe. No points were awarded for this round.",
            });
            setIsComplete(result.isComplete);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "We could not submit this recipe build.");
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleNext() {
        setChallengeIndex((current) => current + 1);
        setSelectedIngredientIds([]);
        setFeedback(null);
        setError(null);
        startedAtRef.current = Date.now();
    }

    if (isStarting) {
        return <LoadingState label="Preparing recipe challenges..." />;
    }

    if (isComplete) {
        return (
            <section className="rounded-xl border border-[#dfe7de] bg-white p-6 sm:p-8" aria-labelledby="recipe-builder-results">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5c6d62]">Session complete</p>
                        <h2 className="display-font mt-2 text-3xl text-[#254235]" id="recipe-builder-results">Your recipe results</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#59675c]">Game score</p>
                        <p className="display-font text-3xl text-[#254235]">{score}</p>
                    </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#59675c]">
                    Correct builds: {correctCount} of {challenges.length}. Completed rounds: {completedCount} of {challenges.length}.
                </p>

                <GameXpSummary xpSummary={xpSummary} />
                <div className="mt-4 space-y-3">
                    <GameDailySummary dailyChallengeUpdate={dailyChallengeUpdate} streakUpdate={streakUpdate} />
                    <GameAchievementsSummary newlyUnlockedAchievements={newlyUnlockedAchievements} />
                </div>

                {progressUpdates.length > 0 ? (
                    <div className="mt-6 rounded-xl border border-[#dfe7de] bg-[#fafbf9] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5c6d62]">Recipe Learning Mastery</p>
                        <ul className="mt-3 divide-y divide-[#e7e3d9]">
                            {progressUpdates.map((update) => (
                                <li key={update.targetId} className="flex items-center justify-between py-2 text-sm">
                                    <span className="font-medium text-[#254235]">{update.title}</span>
                                    <span className="text-xs font-semibold text-[#3d7b52]">
                                        {update.masteryScore}% Mastery {update.isCompleted ? "· Mastered" : "· In progress"}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                <div className="mt-7 flex flex-wrap gap-3">
                    <Button onClick={handleStart} disabled={isStarting}>Play again</Button>
                </div>
            </section>
        );
    }

    if (!challenge && challenges.length === 0) {
        return (
            <div>
                <EmptyState title="Build a recipe from its ingredients">
                    Choose the ingredients that belong to each recipe. The server checks every selection against the published recipe data.
                </EmptyState>
                {error ? <div className="mt-5"><ErrorState message={error} /></div> : null}
                <div className="mt-6">
                    <Button onClick={handleStart} disabled={isStarting}>
                        {isStarting ? <><LoaderCircle aria-hidden="true" className="animate-spin" size={17} />Starting...</> : "Start Recipe Builder"}
                    </Button>
                </div>
            </div>
        );
    }

    if (!challenge) {
        return <LoadingState label="Loading the next recipe..." />;
    }

    return (
        <section className="rounded-xl border border-[#dfe7de] bg-white p-5 sm:p-8" aria-labelledby="recipe-challenge-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5c6d62]">
                        Recipe {challengeIndex + 1} of {challenges.length}
                    </p>
                    <h2 className="display-font mt-2 text-3xl text-[#254235]" id="recipe-challenge-title">{challenge.title}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#59675c]">{challenge.description}</p>
                </div>
                <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#59675c]">Server score</p>
                    <p className="display-font text-2xl text-[#254235]">{score}</p>
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 text-sm text-[#59675c]">
                <p>Select all ingredients that belong in this recipe.</p>
                <p className="shrink-0">{selectedIngredientIds.length} selected</p>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2" role="group" aria-label="Recipe ingredient choices">
                {challenge.options.map((ingredient) => {
                    const isSelected = selectedIngredientIds.includes(ingredient.id);
                    return (
                        <button
                            key={ingredient.id}
                            type="button"
                            aria-pressed={isSelected}
                            disabled={Boolean(feedback) || isSubmitting}
                            onClick={() => toggleIngredient(ingredient.id)}
                            className={`flex min-h-12 items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c55a3d] disabled:cursor-not-allowed ${isSelected
                                ? "border-[#3d7b52] bg-[#edf5eb] text-[#254235]"
                                : "border-[#dfe7de] bg-[#fafbf9] text-[#35473c] hover:bg-white"
                                }`}
                        >
                            {isSelected ? <Check aria-hidden="true" className="shrink-0 text-[#3d7b52]" size={18} /> : <Circle aria-hidden="true" className="shrink-0 text-[#8c998f]" size={18} />}
                            <span>{ingredient.name}</span>
                        </button>
                    );
                })}
            </div>

            {feedback ? (
                <div className={`mt-5 rounded-lg border px-4 py-3 text-sm ${feedback.isCorrect
                    ? "border-[#cbdcc9] bg-[#edf5eb] text-[#294b34]"
                    : "border-[#e6c8bd] bg-[#fcf1ed] text-[#793d2b]"
                    }`} role="status" aria-live="polite">
                    {feedback.message}
                </div>
            ) : null}
            {error ? <div className="mt-5"><ErrorState message={error} /></div> : null}

            <div className="mt-6 flex flex-wrap gap-3">
                {!feedback ? (
                    <Button onClick={handleSubmit} disabled={selectedIngredientIds.length === 0 || isSubmitting}>
                        {isSubmitting ? <><LoaderCircle aria-hidden="true" className="animate-spin" size={17} />Checking build...</> : "Submit recipe"}
                    </Button>
                ) : null}
                {feedback && !isComplete ? (
                    <Button variant="secondary" onClick={handleNext}>Next recipe</Button>
                ) : null}
            </div>
        </section>
    );
}
