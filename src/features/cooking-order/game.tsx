"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/page-states";
import type { CookingOrderChallenge } from "@/features/game-engine/types";
import { startCookingOrderSession, submitCookingOrderAnswer } from "./actions";
import { GameXpSummary } from "@/components/game/game-xp-summary";
import { GameAchievementsSummary } from "@/components/game/game-achievements-summary";
import { GameDailySummary } from "@/components/game/game-daily-summary";
import type { SessionXpSummary } from "@/features/xp-levels/types";
import type { AchievementItem } from "@/features/achievements/types";
import type { DailyChallengeSessionUpdate, StreakSessionUpdate } from "@/features/daily-challenges/types";

interface AnswerFeedback {
    isCorrect: boolean;
    message: string;
}

export function CookingOrderGame() {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [challenges, setChallenges] = useState<CookingOrderChallenge[]>([]);
    const [challengeIndex, setChallengeIndex] = useState(0);
    const [orderedStepIds, setOrderedStepIds] = useState<string[]>([]);
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
    const stepsById = new Map(challenge?.steps.map((step) => [step.id, step]) ?? []);
    const orderedSteps = orderedStepIds.flatMap((stepId) => {
        const step = stepsById.get(stepId);
        return step ? [step] : [];
    });

    async function handleStart() {
        setError(null);
        setIsStarting(true);
        setProgressUpdates([]);
        setXpSummary(null);
        setNewlyUnlockedAchievements([]);
        setStreakUpdate(null);
        setDailyChallengeUpdate(null);
        try {
            const result = await startCookingOrderSession();
            if (result.challenges.length === 0) {
                setChallenges([]);
                setError("No published recipes with cooking steps are available yet.");
                return;
            }

            setSessionId(result.sessionId);
            setChallenges(result.challenges);
            setChallengeIndex(0);
            setOrderedStepIds(result.challenges[0].steps.map((step) => step.id));
            setScore(0);
            setCorrectCount(0);
            setCompletedCount(0);
            setFeedback(null);
            setIsComplete(false);
            startedAtRef.current = Date.now();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "We could not start Cooking Order.");
        } finally {
            setIsStarting(false);
        }
    }

    function moveStep(stepIndex: number, offset: -1 | 1) {
        setOrderedStepIds((current) => {
            const targetIndex = stepIndex + offset;
            if (targetIndex < 0 || targetIndex >= current.length) {
                return current;
            }

            const next = [...current];
            [next[stepIndex], next[targetIndex]] = [next[targetIndex], next[stepIndex]];
            return next;
        });
    }

    async function handleSubmit() {
        if (!sessionId || !challenge || isSubmitting || feedback || orderedStepIds.length !== challenge.steps.length) {
            return;
        }

        setError(null);
        setIsSubmitting(true);
        try {
            const result = await submitCookingOrderAnswer({
                sessionId,
                recipeId: challenge.recipeId,
                orderedStepIds,
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
                    ? "Correct order. These steps make a sensible cooking sequence."
                    : "Not quite. The server checked your sequence against the recipe steps.",
            });
            setIsComplete(result.isComplete);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "We could not submit this sequence.");
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleNext() {
        const nextIndex = challengeIndex + 1;
        setChallengeIndex(nextIndex);
        setOrderedStepIds(challenges[nextIndex]?.steps.map((step) => step.id) ?? []);
        setFeedback(null);
        setError(null);
        startedAtRef.current = Date.now();
    }

    if (isStarting) {
        return <LoadingState label="Preparing cooking steps..." />;
    }

    if (isComplete) {
        return (
            <section className="rounded-xl border border-[#dfe7de] bg-white p-6 sm:p-8" aria-labelledby="cooking-order-results">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5c6d62]">Session complete</p>
                        <h2 className="display-font mt-2 text-3xl text-[#254235]" id="cooking-order-results">Your results</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#59675c]">Game score</p>
                        <p className="display-font text-3xl text-[#254235]">{score}</p>
                    </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#59675c]">
                    Correct sequences: {correctCount} of {challenges.length}. Completed rounds: {completedCount} of {challenges.length}.
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

                <div className="mt-7">
                    <Button onClick={handleStart} disabled={isStarting}>Play again</Button>
                </div>
            </section>
        );
    }

    if (challenges.length === 0) {
        return (
            <div>
                <EmptyState title="Put the cooking steps in order">
                    Arrange each recipe’s steps into the sequence that makes sense. The server checks your order against the published recipe.
                </EmptyState>
                {error ? <div className="mt-5"><ErrorState message={error} /></div> : null}
                <div className="mt-6">
                    <Button onClick={handleStart} disabled={isStarting}>
                        {isStarting ? <><LoaderCircle aria-hidden="true" className="animate-spin" size={17} />Starting...</> : "Start Cooking Order"}
                    </Button>
                </div>
            </div>
        );
    }

    if (!challenge) {
        return <LoadingState label="Loading the next recipe..." />;
    }

    return (
        <section className="rounded-xl border border-[#dfe7de] bg-white p-5 sm:p-8" aria-labelledby="cooking-order-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5c6d62]">
                        Recipe {challengeIndex + 1} of {challenges.length}
                    </p>
                    <h2 className="display-font mt-2 text-3xl text-[#254235]" id="cooking-order-title">{challenge.title}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#59675c]">{challenge.description}</p>
                </div>
                <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#59675c]">Server score</p>
                    <p className="display-font text-2xl text-[#254235]">{score}</p>
                </div>
            </div>

            <p className="mt-6 text-sm leading-6 text-[#59675c]">Arrange the steps from first to last.</p>
            <ol className="mt-4 space-y-3" aria-label="Cooking steps in your proposed order">
                {orderedSteps.map((step, index) => (
                    <li className="flex items-stretch gap-3 rounded-lg border border-[#dfe7de] bg-[#fafbf9] p-3 sm:p-4" key={step.id}>
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#edf5eb] text-sm font-semibold text-[#294b34]" aria-hidden="true">
                            {index + 1}
                        </span>
                        <p className="flex-1 self-center text-sm leading-6 text-[#35473c]">{step.instruction}</p>
                        <div className="flex shrink-0 flex-col gap-1">
                            <button
                                type="button"
                                className="grid size-9 place-items-center rounded-md text-[#254235] hover:bg-[#edf0e9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c55a3d] disabled:opacity-40"
                                aria-label={`Move step ${index + 1} earlier`}
                                title="Move earlier"
                                disabled={index === 0 || Boolean(feedback) || isSubmitting}
                                onClick={() => moveStep(index, -1)}
                            >
                                <ArrowUp aria-hidden="true" size={17} />
                            </button>
                            <button
                                type="button"
                                className="grid size-9 place-items-center rounded-md text-[#254235] hover:bg-[#edf0e9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c55a3d] disabled:opacity-40"
                                aria-label={`Move step ${index + 1} later`}
                                title="Move later"
                                disabled={index === orderedSteps.length - 1 || Boolean(feedback) || isSubmitting}
                                onClick={() => moveStep(index, 1)}
                            >
                                <ArrowDown aria-hidden="true" size={17} />
                            </button>
                        </div>
                    </li>
                ))}
            </ol>

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
                    <Button onClick={handleSubmit} disabled={isSubmitting || orderedStepIds.length !== challenge.steps.length}>
                        {isSubmitting ? <><LoaderCircle aria-hidden="true" className="animate-spin" size={17} />Checking order...</> : "Submit order"}
                    </Button>
                ) : null}
                {feedback && !isComplete ? <Button variant="secondary" onClick={handleNext}>Next recipe</Button> : null}
            </div>
        </section>
    );
}
