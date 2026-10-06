"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/page-states";
import type { IngredientQuizQuestion } from "@/features/game-engine/ingredient-quiz";
import { completeIngredientQuizSession, startIngredientQuizSession, submitIngredientQuizAnswer } from "@/features/game-engine/ingredient-quiz-actions";
import { GameXpSummary } from "@/components/game/game-xp-summary";
import { GameAchievementsSummary } from "@/components/game/game-achievements-summary";
import { GameDailySummary } from "@/components/game/game-daily-summary";
import type { SessionXpSummary } from "@/features/xp-levels/types";
import type { AchievementItem } from "@/features/achievements/types";
import type { DailyChallengeSessionUpdate, StreakSessionUpdate } from "@/features/daily-challenges/types";

interface FeedbackState {
    isCorrect: boolean;
    message: string;
}

export function IngredientQuizGame() {
    const [questions, setQuestions] = useState<IngredientQuizQuestion[]>([]);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [progressUpdates, setProgressUpdates] = useState<import("@/features/learning-progress/types").SessionProgressUpdate[]>([]);
    const [xpSummary, setXpSummary] = useState<SessionXpSummary | null>(null);
    const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState<AchievementItem[]>([]);
    const [streakUpdate, setStreakUpdate] = useState<StreakSessionUpdate | null>(null);
    const [dailyChallengeUpdate, setDailyChallengeUpdate] = useState<DailyChallengeSessionUpdate | null>(null);
    const startedAtRef = useRef<number | null>(null);

    const currentQuestion = questions[currentIndex];
    const questionProgress = useMemo(() => {
        if (questions.length === 0) {
            return 0;
        }

        return ((currentIndex + 1) / questions.length) * 100;
    }, [currentIndex, questions.length]);

    async function handleStartGame() {
        setError(null);
        setIsStarting(true);
        setProgressUpdates([]);
        setXpSummary(null);
        setNewlyUnlockedAchievements([]);
        setStreakUpdate(null);
        setDailyChallengeUpdate(null);

        try {
            const result = await startIngredientQuizSession();
            setSessionId(result.sessionId);
            setQuestions(result.questions);
            setCurrentIndex(0);
            setScore(result.score);
            setSelectedOptionId(null);
            setFeedback(null);
            setIsComplete(false);
            startedAtRef.current = Date.now();
        } catch (err) {
            setError(err instanceof Error ? err.message : "We could not start a new ingredient quiz session.");
        } finally {
            setIsStarting(false);
        }
    }

    async function handleAnswerSubmit() {
        if (!sessionId || !currentQuestion || !selectedOptionId) {
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const responseTimeMs = startedAtRef.current ? Date.now() - startedAtRef.current : null;
            const result = await submitIngredientQuizAnswer({
                sessionId,
                questionId: currentQuestion.id,
                selectedOptionId,
                responseTimeMs,
            });

            setScore(result.score);
            const nextFeedback: FeedbackState = result.isCorrect
                ? { isCorrect: true, message: "Correct — that answer is right." }
                : { isCorrect: false, message: "Not quite — the server marks the answer as incorrect." };
            setFeedback(nextFeedback);

            if (currentIndex === questions.length - 1) {
                const completedSession = await completeIngredientQuizSession(sessionId);
                setScore(completedSession.score);
                setProgressUpdates(completedSession.progressUpdates ?? []);
                if (completedSession.xpSummary) {
                    setXpSummary(completedSession.xpSummary);
                }
                setNewlyUnlockedAchievements(completedSession.newlyUnlockedAchievements ?? []);
                setStreakUpdate(completedSession.streakUpdate ?? null);
                setDailyChallengeUpdate(completedSession.dailyChallengeUpdate ?? null);
                setIsComplete(true);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "We could not submit that answer.");
        } finally {
            setIsSubmitting(false);
            startedAtRef.current = Date.now();
        }
    }

    function handleNextQuestion() {
        if (currentIndex >= questions.length - 1) {
            setSelectedOptionId(null);
            setFeedback(null);
            return;
        }

        setCurrentIndex((previous) => previous + 1);
        setSelectedOptionId(null);
        setFeedback(null);
        startedAtRef.current = Date.now();
    }

    if (questions.length === 0 && !isStarting && !isComplete) {
        return (
            <div className="rounded-3xl border border-[#dfe7de] bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-6 flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5c6d62]">Ingredient Quiz</p>
                        <h1 className="display-font mt-2 text-3xl text-[#254235]">Play a quick ingredient round.</h1>
                    </div>
                    <span className="rounded-full bg-[#edf5eb] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#294b34]">5 questions</span>
                </div>
                <p className="max-w-2xl text-sm leading-7 text-[#59675c]">
                    This mode tests ingredient knowledge using published kitchen questions. The server validates every answer and tracks your score.
                </p>
                <div className="mt-7">
                    <Button onClick={handleStartGame} disabled={isStarting}>
                        {isStarting ? "Starting..." : "Start quiz"}
                    </Button>
                </div>
                {error ? <div className="mt-5"><ErrorState message={error} /></div> : null}
            </div>
        );
    }

    if (isStarting || (questions.length > 0 && !currentQuestion && !isComplete)) {
        return <LoadingState label="Preparing your quiz..." />;
    }

    if (isComplete) {
        return (
            <div className="rounded-3xl border border-[#dfe7de] bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5c6d62]">Session complete</p>
                    <span className="rounded-full bg-[#edf5eb] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#294b34]">Game Score: {score}</span>
                </div>
                <h2 className="display-font text-3xl text-[#254235]">Nice work.</h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[#59675c]">
                    You completed the Ingredient Quiz session. Your gameplay results have updated your educational progress.
                </p>

                <GameXpSummary xpSummary={xpSummary} />
                <div className="mt-4 space-y-3">
                    <GameDailySummary dailyChallengeUpdate={dailyChallengeUpdate} streakUpdate={streakUpdate} />
                    <GameAchievementsSummary newlyUnlockedAchievements={newlyUnlockedAchievements} />
                </div>

                {progressUpdates.length > 0 ? (
                    <div className="mt-6 rounded-xl border border-[#dfe7de] bg-[#fafbf9] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5c6d62]">Learning Progress Updates</p>
                        <ul className="mt-3 divide-y divide-[#e7e3d9]">
                            {progressUpdates.map((update) => (
                                <li key={update.targetId} className="flex items-center justify-between py-2 text-sm">
                                    <span className="font-medium text-[#254235]">{update.title}</span>
                                    <span className="text-xs font-semibold text-[#3d7b52]">
                                        {update.masteryScore}% Mastery {update.isCompleted ? "· Completed" : "· In progress"}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                <div className="mt-7 flex flex-wrap gap-3">
                    <Button onClick={handleStartGame} disabled={isStarting}>Play again</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-3xl border border-[#dfe7de] bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5c6d62]">Question {currentIndex + 1} of {questions.length}</p>
                    <h2 className="display-font mt-2 text-3xl text-[#254235]">Ingredient Quiz</h2>
                </div>
                <span className="rounded-full bg-[#edf5eb] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#294b34]">Score: {score}</span>
            </div>

            <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-[#edf0e9]">
                <div className="h-full rounded-full bg-[#3d7b52] transition-all duration-200" style={{ width: `${questionProgress}%` }} />
            </div>

            <p className="text-lg leading-8 text-[#254235] sm:text-xl">{currentQuestion.question_text}</p>

            <div className="mt-6 space-y-3">
                {currentQuestion.options.map((option) => {
                    const isSelected = selectedOptionId === option.id;
                    const showSelectedStyles = feedback ? isSelected : isSelected;

                    return (
                        <button
                            key={option.id}
                            type="button"
                            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-all ${showSelectedStyles
                                    ? "border-[#3d7b52] bg-[#edf5eb] text-[#254235]"
                                    : "border-[#dfe7de] bg-[#f9faf8] text-[#2d3c35] hover:border-[#c9d8c8] hover:bg-white"
                                }`}
                            onClick={() => setSelectedOptionId(option.id)}
                            disabled={Boolean(feedback) || isSubmitting}
                        >
                            <span>{option.option_text}</span>
                            <span className="ml-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#5c6d62]">
                                {isSelected ? "Selected" : "Option"}
                            </span>
                        </button>
                    );
                })}
            </div>

            {feedback ? (
                <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${feedback.isCorrect
                        ? "border-[#cbdcc9] bg-[#edf5eb] text-[#294b34]"
                        : "border-[#e6c8bd] bg-[#fcf1ed] text-[#793d2b]"
                    }`}>
                    {feedback.message}
                </div>
            ) : null}

            {error ? (
                <div className="mt-5">
                    <ErrorState message={error} />
                </div>
            ) : null}

            <div className="mt-7 flex flex-wrap gap-3">
                {!feedback ? (
                    <Button onClick={handleAnswerSubmit} disabled={!selectedOptionId || isSubmitting}>
                        {isSubmitting ? "Checking answer..." : "Submit answer"}
                    </Button>
                ) : null}

                {feedback && currentIndex < questions.length - 1 ? (
                    <Button variant="secondary" onClick={handleNextQuestion}>
                        Next question
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
