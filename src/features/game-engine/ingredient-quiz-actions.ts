"use server";

import { getAuthenticatedUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GameSessionService, createSupabaseGamePersistence } from "@/features/game-engine/service";
import { pickIngredientQuizQuestions, sanitizeIngredientQuizQuestion } from "@/features/game-engine/ingredient-quiz";

const INGREDIENT_QUIZ_LIMIT = 5;

export interface IngredientQuizStartResult {
    sessionId: string;
    score: number;
    questions: Array<{
        id: string;
        slug: string;
        learning_module_id: string | null;
        question_text: string;
        question_type: string;
        explanation: string;
        difficulty: string;
        status: string;
        created_at: string;
        updated_at: string;
        learning_category: string;
        options: Array<{ id: string; option_text: string; option_order: number }>;
    }>;
}

async function fetchIngredientQuizQuestions(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>): Promise<ReturnType<typeof pickIngredientQuizQuestions>> {
    if (!supabase) {
        throw new Error("The ingredient quiz is unavailable right now.");
    }

    const { data: moduleRows, error: moduleError } = await supabase
        .from("learning_modules")
        .select("id")
        .eq("status", "published")
        .eq("category", "ingredients");

    if (moduleError) {
        throw new Error(moduleError.message);
    }

    const moduleIds = (moduleRows ?? []).map((module) => module.id);
    if (moduleIds.length === 0) {
        return [];
    }

    const { data: questionRows, error: questionError } = await supabase
        .from("questions")
        .select("id, slug, learning_module_id, question_text, question_type, explanation, difficulty, status, created_at, updated_at")
        .in("learning_module_id", moduleIds)
        .eq("status", "published")
        .order("created_at", { ascending: true });

    if (questionError) {
        throw new Error(questionError.message);
    }

    if (!questionRows || questionRows.length === 0) {
        return [];
    }

    const questionIds = questionRows.map((question) => question.id);
    const { data: optionRows, error: optionError } = await supabase
        .from("question_options")
        .select("id, question_id, option_text, option_order")
        .in("question_id", questionIds)
        .order("option_order");

    if (optionError) {
        throw new Error(optionError.message);
    }

    const questionsWithOptions = (questionRows ?? []).map((question) => ({
        ...question,
        learning_category: "ingredients",
        options: (optionRows ?? []).filter((option) => option.question_id === question.id).map((option) => ({
            ...option,
            is_correct: undefined,
        })),
    }));

    return pickIngredientQuizQuestions(questionsWithOptions, INGREDIENT_QUIZ_LIMIT).map((question) => sanitizeIngredientQuizQuestion({
        ...question,
        learning_category: "ingredients",
        options: question.options,
    }));
}

export async function startIngredientQuizSession(): Promise<IngredientQuizStartResult> {
    const user = await getAuthenticatedUser();
    if (!user) {
        throw new Error("You must be signed in to play Ingredient Quiz.");
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        throw new Error("Ingredient Quiz is unavailable right now.");
    }

    const service = new GameSessionService(createSupabaseGamePersistence(supabase), user.id);
    const session = await service.createSession({ userId: user.id, gameMode: "ingredient_quiz" });
    const questions = await fetchIngredientQuizQuestions(supabase);

    return {
        sessionId: session.id,
        score: session.score,
        questions,
    };
}

export async function submitIngredientQuizAnswer(input: {
    sessionId: string;
    questionId: string;
    selectedOptionId: string;
    responseTimeMs?: number | null;
}): Promise<{ sessionId: string; score: number; isCorrect: boolean }> {
    const user = await getAuthenticatedUser();
    if (!user) {
        throw new Error("You must be signed in to play Ingredient Quiz.");
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        throw new Error("Ingredient Quiz is unavailable right now.");
    }

    const service = new GameSessionService(createSupabaseGamePersistence(supabase), user.id);
    const result = await service.submitAnswer({
        userId: user.id,
        sessionId: input.sessionId,
        questionId: input.questionId,
        selectedOptionId: input.selectedOptionId,
        responseTimeMs: input.responseTimeMs ?? null,
    });

    return {
        sessionId: result.session.id,
        score: result.session.score,
        isCorrect: result.isCorrect,
    };
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

export interface IngredientQuizCompleteResult {
    sessionId: string;
    score: number;
    status: "completed";
    progressUpdates: SessionProgressUpdate[];
    xpSummary?: SessionXpSummary;
    newlyUnlockedAchievements?: AchievementItem[];
    streakUpdate?: StreakSessionUpdate;
    dailyChallengeUpdate?: DailyChallengeSessionUpdate;
}

export async function completeIngredientQuizSession(sessionId: string): Promise<IngredientQuizCompleteResult> {
    const user = await getAuthenticatedUser();
    if (!user) {
        throw new Error("You must be signed in to play Ingredient Quiz.");
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        throw new Error("Ingredient Quiz is unavailable right now.");
    }

    const gamePersistence = createSupabaseGamePersistence(supabase);
    const service = new GameSessionService(gamePersistence, user.id);
    const session = await service.completeSession({ userId: user.id, sessionId });

    const progressPersistence = createSupabaseProgressPersistence(supabase);
    const progressService = new LearningProgressService(progressPersistence, user.id);
    const progressResult = await progressService.recordSessionProgress({ userId: user.id, sessionId });

    // Process server-authoritative XP for correct answers, session completion, and first-time learning completions
    const attempts = await gamePersistence.getAttemptsForSession(sessionId);
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
    const xpSummary = await xpService.processSessionXp({
        userId: user.id,
        sessionId,
        correctAttemptIds,
        newlyCompletedTargets,
        sessionDescription: "Completed Ingredient Quiz",
    });

    // Evaluate server-authoritative achievements
    let newlyUnlockedAchievements: AchievementItem[] = [];
    try {
        const achievementPersistence = createSupabaseAchievementPersistence(supabase);
        const achievementService = new AchievementService(achievementPersistence, user.id);
        newlyUnlockedAchievements = await achievementService.evaluateAndUnlockAchievements(user.id);
    } catch {
        // Achievement evaluation error is non-blocking to game completion
    }

    // Process server-authoritative Daily Challenge & Streak
    let streakUpdate: StreakSessionUpdate | undefined;
    let dailyChallengeUpdate: DailyChallengeSessionUpdate | undefined;
    try {
        const dailyPersistence = createSupabaseDailyChallengePersistence(supabase);
        const dailyService = new DailyChallengeService(dailyPersistence, user.id);
        const dailyRes = await dailyService.processSessionDailyChallengeAndStreak({
            userId: user.id,
            sessionId,
        });
        if (dailyRes.streakUpdate) {
            streakUpdate = dailyRes.streakUpdate;
        }
        if (dailyRes.dailyChallengeUpdate) {
            dailyChallengeUpdate = dailyRes.dailyChallengeUpdate;
        }
    } catch {
        // Daily challenge & streak evaluation is non-blocking
    }

    return {
        sessionId: session.id,
        score: session.score,
        status: "completed",
        progressUpdates: progressResult.updates,
        xpSummary,
        newlyUnlockedAchievements,
        streakUpdate,
        dailyChallengeUpdate,
    };
}
