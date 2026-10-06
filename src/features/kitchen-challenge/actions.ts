"use server";

import { getAuthenticatedUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GameSessionService, createSupabaseGamePersistence } from "@/features/game-engine/service";
import {
    parseKitchenChallengeSubmission,
    sanitizeKitchenChallengeScenario,
    type KitchenChallengeScenario,
} from "./scenarios";

export interface KitchenChallengeStartResult {
    sessionId: string;
    scenarios: KitchenChallengeScenario[];
}

import {
    createSupabaseProgressPersistence,
    LearningProgressService,
} from "@/features/learning-progress/service";
import type { SessionProgressUpdate } from "@/features/learning-progress/types";
import {
    createSupabaseXpPersistence,
    XpService,
} from "@/features/xp-levels/service";
import type { SessionXpSummary } from "@/features/xp-levels/types";

import {
    createSupabaseAchievementPersistence,
    AchievementService,
} from "@/features/achievements/service";
import type { AchievementItem } from "@/features/achievements/types";

import {
    createSupabaseDailyChallengePersistence,
    DailyChallengeService,
} from "@/features/daily-challenges/service";
import type {
    DailyChallengeSessionUpdate,
    StreakSessionUpdate,
} from "@/features/daily-challenges/types";

export interface KitchenChallengeAnswerResult {
    isCorrect: boolean;
    score: number;
    explanation: string;
    completedCount: number;
    isComplete: boolean;
    progressUpdates?: SessionProgressUpdate[];
    xpSummary?: SessionXpSummary;
    newlyUnlockedAchievements?: AchievementItem[];
    streakUpdate?: StreakSessionUpdate;
    dailyChallengeUpdate?: DailyChallengeSessionUpdate;
}

export async function startKitchenChallengeSession(): Promise<KitchenChallengeStartResult> {
    const user = await getAuthenticatedUser();
    if (!user) {
        throw new Error("You must be signed in to play Kitchen Challenge.");
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        throw new Error("Kitchen Challenge is unavailable right now.");
    }

    const service = new GameSessionService(createSupabaseGamePersistence(supabase), user.id);
    const { session, questions } = await service.createKitchenChallengeSession({ userId: user.id });

    return {
        sessionId: session.id,
        scenarios: questions.map((question) => sanitizeKitchenChallengeScenario(question)),
    };
}

export async function submitKitchenChallengeAnswer(input: unknown): Promise<KitchenChallengeAnswerResult> {
    const user = await getAuthenticatedUser();
    if (!user) {
        throw new Error("You must be signed in to play Kitchen Challenge.");
    }

    const submission = parseKitchenChallengeSubmission(input);
    if (!submission) {
        throw new Error("Submit a valid answer choice.");
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        throw new Error("Kitchen Challenge is unavailable right now.");
    }

    const persistence = createSupabaseGamePersistence(supabase);
    const service = new GameSessionService(persistence, user.id);
    const result = await service.submitAnswer({
        userId: user.id,
        sessionId: submission.sessionId,
        questionId: submission.questionId,
        selectedOptionId: submission.selectedOptionId,
        responseTimeMs: submission.responseTimeMs,
    });

    const attempts = await persistence.getAttemptsForSession(submission.sessionId);
    const completedCount = attempts.filter((attempt) => attempt.question_id !== null).length;
    const isComplete = completedCount >= 3;

    let progressUpdates: SessionProgressUpdate[] | undefined;
    let xpSummary: SessionXpSummary | undefined;
    let newlyUnlockedAchievements: AchievementItem[] | undefined;

    if (isComplete) {
        await service.completeSession({ userId: user.id, sessionId: submission.sessionId });
        const progressPersistence = createSupabaseProgressPersistence(supabase);
        const progressService = new LearningProgressService(progressPersistence, user.id);
        const progressResult = await progressService.recordSessionProgress({
            userId: user.id,
            sessionId: submission.sessionId,
        });
        progressUpdates = progressResult.updates;

        const correctAttemptIds = attempts.filter((a) => a.is_correct).map((a) => a.id);
        const newlyCompletedTargets = progressResult.updates
            .filter((u) => u.isCompleted && !u.wasPreviouslyCompleted)
            .map((u) => ({
                targetId: u.targetId,
                targetType: u.targetType,
                title: u.title,
            }));

        const xpPersistence = createSupabaseXpPersistence(supabase);
        const xpService = new XpService(xpPersistence, user.id);
        xpSummary = await xpService.processSessionXp({
            userId: user.id,
            sessionId: submission.sessionId,
            correctAttemptIds,
            newlyCompletedTargets,
            sessionDescription: "Completed Kitchen Challenge",
        });

        try {
            const achievementPersistence = createSupabaseAchievementPersistence(supabase);
            const achievementService = new AchievementService(achievementPersistence, user.id);
            newlyUnlockedAchievements = await achievementService.evaluateAndUnlockAchievements(user.id);
        } catch {
            // Non-blocking
        }

        let streakUpdate: StreakSessionUpdate | undefined;
        let dailyChallengeUpdate: DailyChallengeSessionUpdate | undefined;
        try {
            const dailyPersistence = createSupabaseDailyChallengePersistence(supabase);
            const dailyService = new DailyChallengeService(dailyPersistence, user.id);
            const dailyRes = await dailyService.processSessionDailyChallengeAndStreak({
                userId: user.id,
                sessionId: submission.sessionId,
            });
            if (dailyRes.streakUpdate) {
                streakUpdate = dailyRes.streakUpdate;
            }
            if (dailyRes.dailyChallengeUpdate) {
                dailyChallengeUpdate = dailyRes.dailyChallengeUpdate;
            }
        } catch {
            // Non-blocking
        }

        const question = await persistence.getQuestionById(submission.questionId);

        return {
            isCorrect: result.isCorrect,
            score: result.session.score,
            explanation: question?.explanation ?? "",
            completedCount,
            isComplete,
            progressUpdates,
            xpSummary,
            newlyUnlockedAchievements,
            streakUpdate,
            dailyChallengeUpdate,
        };
    }

    const question = await persistence.getQuestionById(submission.questionId);

    return {
        isCorrect: result.isCorrect,
        score: result.session.score,
        explanation: question?.explanation ?? "",
        completedCount,
        isComplete,
        progressUpdates,
        xpSummary,
        newlyUnlockedAchievements,
    };
}
