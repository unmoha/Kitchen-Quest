"use client";

import { useMemo, useRef, useState } from "react";
import { LoaderCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/page-states";
import {
    startKitchenChallengeSession,
    submitKitchenChallengeAnswer,
    type KitchenChallengeAnswerResult,
} from "./actions";
import type { KitchenChallengeScenario } from "./scenarios";
import { GameXpSummary } from "@/components/game/game-xp-summary";
import { GameAchievementsSummary } from "@/components/game/game-achievements-summary";
import { GameDailySummary } from "@/components/game/game-daily-summary";
import type { SessionXpSummary } from "@/features/xp-levels/types";
import type { AchievementItem } from "@/features/achievements/types";
import type { SessionProgressUpdate } from "@/features/learning-progress/types";
import type { DailyChallengeSessionUpdate, StreakSessionUpdate } from "@/features/daily-challenges/types";

interface FeedbackState {
    isCorrect: boolean;
    explanation: string;
}

export function KitchenChallengeGame() {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [scenarios, setScenarios] = useState<KitchenChallengeScenario[]>([]);
    const [scenarioIndex, setScenarioIndex] = useState(0);
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [completedCount, setCompletedCount] = useState(0);
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [progressUpdates, setProgressUpdates] = useState<SessionProgressUpdate[]>([]);
    const [xpSummary, setXpSummary] = useState<SessionXpSummary | null>(null);
    const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState<AchievementItem[]>([]);
    const [streakUpdate, setStreakUpdate] = useState<StreakSessionUpdate | null>(null);
    const [dailyChallengeUpdate, setDailyChallengeUpdate] = useState<DailyChallengeSessionUpdate | null>(null);
    const startedAtRef = useRef<number | null>(null);

    const scenario = scenarios[scenarioIndex];

    const progressPercent = useMemo(() => {
        if (scenarios.length === 0) {
            return 0;
        }
        return ((scenarioIndex + 1) / scenarios.length) * 100;
    }, [scenarioIndex, scenarios.length]);

    async function handleStart() {
        setError(null);
        setIsStarting(true);
        setProgressUpdates([]);
        setXpSummary(null);
        setNewlyUnlockedAchievements([]);
        setStreakUpdate(null);
        setDailyChallengeUpdate(null);
        try {
            const result = await startKitchenChallengeSession();
            if (result.scenarios.length === 0) {
                setScenarios([]);
                setError("No published food safety scenarios are available right now.");
                return;
            }

            setSessionId(result.sessionId);
            setScenarios(result.scenarios);
            setScenarioIndex(0);
            setSelectedOptionId(null);
            setScore(0);
            setCorrectCount(0);
            setCompletedCount(0);
            setFeedback(null);
            setIsComplete(false);
            startedAtRef.current = Date.now();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "We could not start Kitchen Challenge.");
        } finally {
            setIsStarting(false);
        }
    }

    async function handleSubmit() {
        if (!sessionId || !scenario || !selectedOptionId || isSubmitting || feedback) {
            return;
        }

        setError(null);
        setIsSubmitting(true);
        try {
            const responseTimeMs = startedAtRef.current ? Date.now() - startedAtRef.current : null;
            const result: KitchenChallengeAnswerResult = await submitKitchenChallengeAnswer({
                sessionId,
                questionId: scenario.id,
                selectedOptionId,
                responseTimeMs,
            });

            setScore(result.score);
            if (result.isCorrect) {
                setCorrectCount((count) => count + 1);
            }
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
                explanation: result.explanation,
            });
            setIsComplete(result.isComplete);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "We could not submit your decision.");
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleNext() {
        const nextIndex = scenarioIndex + 1;
        setScenarioIndex(nextIndex);
        setSelectedOptionId(null);
        setFeedback(null);
        setError(null);
        startedAtRef.current = Date.now();
    }

    if (isStarting) {
        return <LoadingState label="Preparing food safety scenarios..." />;
    }

    if (isComplete) {
        return (
            <section className="rounded-xl border border-[#dfe7de] bg-white p-6 sm:p-8" aria-labelledby="kitchen-challenge-results">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5c6d62]">Session complete</p>
                        <h2 className="display-font mt-2 text-3xl text-[#254235]" id="kitchen-challenge-results">Your results</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#59675c]">Server score</p>
                        <p className="display-font text-3xl text-[#254235]">{score}</p>
                    </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#59675c]">
                    Correct decisions: {correctCount} of {scenarios.length}. Completed scenarios: {completedCount} of {scenarios.length}.
                </p>

                <GameXpSummary xpSummary={xpSummary} />
                <div className="mt-4 space-y-3">
                    <GameDailySummary dailyChallengeUpdate={dailyChallengeUpdate} streakUpdate={streakUpdate} />
                    <GameAchievementsSummary newlyUnlockedAchievements={newlyUnlockedAchievements} />
                </div>

                {progressUpdates.length > 0 ? (
                    <div className="mt-6 rounded-xl border border-[#dfe7de] bg-[#fafbf9] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5c6d62]">Food Safety Mastery</p>
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

    if (scenarios.length === 0) {
        return (
            <div>
                <EmptyState title="Real kitchen decisions and safety scenarios">
                    Face practical kitchen situations covering food safety, cross-contamination prevention, safe temperatures, and handling techniques. The server validates every decision.
                </EmptyState>
                {error ? <div className="mt-5"><ErrorState message={error} /></div> : null}
                <div className="mt-6">
                    <Button onClick={handleStart} disabled={isStarting}>
                        {isStarting ? (
                            <>
                                <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
                                Starting...
                            </>
                        ) : (
                            "Start Kitchen Challenge"
                        )}
                    </Button>
                </div>
            </div>
        );
    }

    if (!scenario) {
        return <LoadingState label="Loading the next scenario..." />;
    }

    return (
        <section className="rounded-xl border border-[#dfe7de] bg-white p-5 sm:p-8" aria-labelledby="kitchen-challenge-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5c6d62]">
                        Scenario {scenarioIndex + 1} of {scenarios.length}
                    </p>
                    <h2 className="display-font mt-2 text-2xl text-[#254235] sm:text-3xl" id="kitchen-challenge-title">
                        Food Safety Decision
                    </h2>
                </div>
                <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#59675c]">Server score</p>
                    <p className="display-font text-2xl text-[#254235]">{score}</p>
                </div>
            </div>

            <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-[#edf0e9]">
                <div
                    className="h-full rounded-full bg-[#3d7b52] transition-all duration-200"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            <div className="mt-6 rounded-lg border border-[#dfe7de] bg-[#fafbf9] p-4 sm:p-5">
                <p className="text-base font-medium leading-7 text-[#254235] sm:text-lg">
                    {scenario.questionText}
                </p>
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.08em] text-[#59675c]">
                Choose the best action:
            </p>

            <div className="mt-3 space-y-3" role="radiogroup" aria-label="Action choices">
                {scenario.options.map((option) => {
                    const isSelected = selectedOptionId === option.id;

                    return (
                        <button
                            key={option.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            className={`flex w-full items-center justify-between rounded-lg border p-4 text-left text-sm transition-all ${isSelected
                                ? "border-[#3d7b52] bg-[#edf5eb] text-[#254235] font-medium"
                                : "border-[#dfe7de] bg-[#fafbf9] text-[#2d3c35] hover:border-[#c9d8c8] hover:bg-white"
                                } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c55a3d] disabled:opacity-70`}
                            onClick={() => setSelectedOptionId(option.id)}
                            disabled={Boolean(feedback) || isSubmitting}
                        >
                            <span className="leading-6">{option.optionText}</span>
                            <span className="ml-3 shrink-0 text-xs font-semibold uppercase tracking-[0.08em] text-[#5c6d62]">
                                {isSelected ? "Selected" : "Select"}
                            </span>
                        </button>
                    );
                })}
            </div>

            {feedback ? (
                <div
                    className={`mt-6 rounded-lg border p-4 text-sm leading-6 ${feedback.isCorrect
                        ? "border-[#cbdcc9] bg-[#edf5eb] text-[#294b34]"
                        : "border-[#e6c8bd] bg-[#fcf1ed] text-[#793d2b]"
                        }`}
                    role="status"
                    aria-live="polite"
                >
                    <div className="flex items-start gap-2">
                        {feedback.isCorrect ? (
                            <ShieldCheck aria-hidden="true" className="shrink-0 mt-0.5" size={18} />
                        ) : (
                            <ShieldAlert aria-hidden="true" className="shrink-0 mt-0.5" size={18} />
                        )}
                        <div>
                            <p className="font-semibold">
                                {feedback.isCorrect ? "Correct decision." : "Incorrect decision."}
                            </p>
                            {feedback.explanation ? (
                                <p className="mt-1">{feedback.explanation}</p>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}

            {error ? <div className="mt-5"><ErrorState message={error} /></div> : null}

            <div className="mt-6 flex flex-wrap gap-3">
                {!feedback ? (
                    <Button onClick={handleSubmit} disabled={!selectedOptionId || isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
                                Checking decision...
                            </>
                        ) : (
                            "Submit decision"
                        )}
                    </Button>
                ) : null}

                {feedback && !isComplete ? (
                    <Button variant="secondary" onClick={handleNext}>
                        Next scenario
                    </Button>
                ) : null}
            </div>
        </section>
    );
}
