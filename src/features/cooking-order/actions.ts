"use server";

import { getAuthenticatedUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GameSessionService, createSupabaseGamePersistence } from "@/features/game-engine/service";
import type { CookingOrderChallenge } from "@/features/game-engine/types";
import { parseCookingOrderSubmission, toCookingOrderChallenge } from "./challenges";

export interface CookingOrderStartResult {
    sessionId: string;
    challenges: CookingOrderChallenge[];
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

export interface CookingOrderAnswerResult {
    isCorrect: boolean;
    score: number;
    completedCount: number;
    correctCount: number;
    challengeCount: number;
    isComplete: boolean;
    progressUpdates?: SessionProgressUpdate[];
    xpSummary?: SessionXpSummary;
    newlyUnlockedAchievements?: AchievementItem[];
    streakUpdate?: StreakSessionUpdate;
    dailyChallengeUpdate?: DailyChallengeSessionUpdate;
}

export async function startCookingOrderSession(): Promise<CookingOrderStartResult> {
    const user = await getAuthenticatedUser();
    if (!user) {
        throw new Error("You must be signed in to play Cooking Order.");
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        throw new Error("Cooking Order is unavailable right now.");
    }

    const service = new GameSessionService(createSupabaseGamePersistence(supabase), user.id);
    const { session, recipes } = await service.createCookingOrderSession({ userId: user.id });

    return {
        sessionId: session.id,
        challenges: recipes.map((recipe) => toCookingOrderChallenge(recipe)),
    };
}

export async function submitCookingOrderAnswer(input: unknown): Promise<CookingOrderAnswerResult> {
    const user = await getAuthenticatedUser();
    if (!user) {
        throw new Error("You must be signed in to play Cooking Order.");
    }

    const submission = parseCookingOrderSubmission(input);
    if (!submission) {
        throw new Error("Submit every recipe step in a valid order.");
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        throw new Error("Cooking Order is unavailable right now.");
    }

    const gamePersistence = createSupabaseGamePersistence(supabase);
    const service = new GameSessionService(gamePersistence, user.id);
    const result = await service.submitCookingOrderAnswer({ userId: user.id, submission });

    let progressUpdates: SessionProgressUpdate[] | undefined;
    let xpSummary: SessionXpSummary | undefined;
    let newlyUnlockedAchievements: AchievementItem[] | undefined;

    if (result.isComplete) {
        const progressPersistence = createSupabaseProgressPersistence(supabase);
        const progressService = new LearningProgressService(progressPersistence, user.id);
        const progressResult = await progressService.recordSessionProgress({
            userId: user.id,
            sessionId: submission.sessionId,
        });
        progressUpdates = progressResult.updates;

        const attempts = await gamePersistence.getAttemptsForSession(submission.sessionId);
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
            sessionDescription: "Completed Cooking Order",
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

        return {
            isCorrect: result.isCorrect,
            score: result.session.score,
            completedCount: result.completedCount,
            correctCount: result.correctCount,
            challengeCount: result.challengeCount,
            isComplete: result.isComplete,
            progressUpdates,
            xpSummary,
            newlyUnlockedAchievements,
            streakUpdate,
            dailyChallengeUpdate,
        };
    }

    return {
        isCorrect: result.isCorrect,
        score: result.session.score,
        completedCount: result.completedCount,
        correctCount: result.correctCount,
        challengeCount: result.challengeCount,
        isComplete: result.isComplete,
        progressUpdates,
        xpSummary,
        newlyUnlockedAchievements,
    };
}
