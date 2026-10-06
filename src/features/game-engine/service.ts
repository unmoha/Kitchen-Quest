import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../types/database";
import { getGameModeDefinition } from "./modes";
import type {
    CompleteSessionInput,
    CookingOrderRecipeRecord,
    CookingOrderSubmission,
    CookingOrderSubmissionResult,
    CreateSessionInput,
    GameAttemptRecord,
    GameEngineError,
    GameEngineErrorCode,
    GameModeName,
    GamePersistence,
    GameSessionRecord,
    LoadModeQuestionSet,
    QuestionRecord,
    RecipeBuilderRecipeRecord,
    RecipeBuilderSubmission,
    RecipeBuilderSubmissionResult,
    SessionSubmissionResult,
    SubmitAnswerInput,
} from "./types";
import { chooseRecipeBuilderChallenges } from "./recipe-builder";
import { chooseCookingOrderChallenges } from "../cooking-order/challenges";
import { chooseKitchenChallengeScenarios } from "../kitchen-challenge/scenarios";
import { chooseFoodDetectiveClues } from "../food-detective/clues";

export type {
    GameAttemptRecord,
    GameModeName,
    GameSessionRecord,
    QuestionOptionRecord,
    QuestionRecord,
    RecipeBuilderChallenge,
    RecipeBuilderIngredientChoice,
    RecipeBuilderRecipeRecord,
    RecipeBuilderSubmission,
    RecipeBuilderSubmissionResult,
    CookingOrderChallenge,
    CookingOrderRecipeRecord,
    CookingOrderStepChoice,
    CookingOrderSubmission,
    CookingOrderSubmissionResult,
} from "./types";

// Deterministic scoring rule for Phase 3.2: correct answers earn 10 points, incorrect answers earn 0.
// The browser never controls the score; the server calculates it after validating the request.
const GAME_ENGINE_BASE_SCORE = 10;

function resolveUserId(explicitUserId: string | undefined, fallbackUserId: string | undefined): string {
    if (explicitUserId !== undefined) {
        return explicitUserId;
    }
    if (fallbackUserId !== undefined && fallbackUserId !== "") {
        return fallbackUserId;
    }
    return "";
}

function toGameEngineError(code: GameEngineErrorCode, message: string): GameEngineError {
    const error = new Error(message) as GameEngineError;
    error.name = "GameEngineError";
    error.code = code;
    return error;
}

function toIsoString(value: Date): string {
    return value.toISOString();
}

export class GameSessionService {
    constructor(
        private readonly persistence: GamePersistence,
        private readonly defaultUserId?: string,
    ) { }

    async createSession(input: CreateSessionInput): Promise<GameSessionRecord> {
        const userId = resolveUserId(input.userId, this.defaultUserId);
        if (!userId) {
            throw toGameEngineError("UNAUTHENTICATED_USER", "You must be authenticated to create a session.");
        }

        const normalizedMode = this.validateGameMode(input.gameMode);
        const supportsRecipeChallenges = normalizedMode === "recipe_builder" || normalizedMode === "cooking_order";
        if (supportsRecipeChallenges
            && (!input.challengeRecipeIds?.length || input.challengeRecipeIds.length > 3)) {
            throw toGameEngineError("NO_RECIPE_CHALLENGES", "Choose valid recipe challenges before creating the session.");
        }
        if (!supportsRecipeChallenges && input.challengeRecipeIds?.length) {
            throw toGameEngineError("INVALID_GAME_MODE", "Recipe challenges are not valid for this game mode.");
        }

        return this.persistence.createSession({ ...input, userId, gameMode: normalizedMode });
    }

    async createRecipeBuilderSession(input: { userId: string }): Promise<{
        session: GameSessionRecord;
        recipes: RecipeBuilderRecipeRecord[];
        ingredients: import("./types").RecipeBuilderIngredientChoice[];
    }> {
        const userId = resolveUserId(input.userId, this.defaultUserId);
        if (!userId) {
            throw toGameEngineError("UNAUTHENTICATED_USER", "You must be authenticated to create a session.");
        }

        const definition = getGameModeDefinition("recipe_builder");
        const catalog = await this.persistence.listRecipeBuilderCatalog();
        const eligibleRecipes = catalog.recipes.filter(
            (recipe) => definition.allowRecipeSelection?.(recipe) === true,
        );
        const recipes = chooseRecipeBuilderChallenges(eligibleRecipes, 3);
        if (recipes.length === 0) {
            throw toGameEngineError("NO_RECIPE_CHALLENGES", "No published recipes are available for Recipe Builder.");
        }

        const session = await this.persistence.createSession({
            userId,
            gameMode: "recipe_builder",
            challengeRecipeIds: recipes.map((recipe) => recipe.id),
        });

        return { session, recipes, ingredients: catalog.ingredients };
    }

    async createCookingOrderSession(input: { userId: string }): Promise<{
        session: GameSessionRecord;
        recipes: CookingOrderRecipeRecord[];
    }> {
        const userId = resolveUserId(input.userId, this.defaultUserId);
        if (!userId) {
            throw toGameEngineError("UNAUTHENTICATED_USER", "You must be authenticated to create a session.");
        }

        const definition = getGameModeDefinition("cooking_order");
        const catalog = await this.persistence.listCookingOrderCatalog();
        const eligibleRecipes = catalog.filter(
            (recipe) => definition.allowCookingOrderSelection?.(recipe) === true,
        );
        const recipes = chooseCookingOrderChallenges(eligibleRecipes);
        if (recipes.length === 0) {
            throw toGameEngineError("NO_RECIPE_CHALLENGES", "No published recipes with ordered steps are available for Cooking Order.");
        }

        const session = await this.persistence.createSession({
            userId,
            gameMode: "cooking_order",
            challengeRecipeIds: recipes.map((recipe) => recipe.id),
        });

        return { session, recipes };
    }

    async createKitchenChallengeSession(input: { userId: string }): Promise<{
        session: GameSessionRecord;
        questions: QuestionRecord[];
    }> {
        const userId = resolveUserId(input.userId, this.defaultUserId);
        if (!userId) {
            throw toGameEngineError("UNAUTHENTICATED_USER", "You must be authenticated to create a session.");
        }

        const definition = getGameModeDefinition("kitchen_challenge");
        const pool = await this.persistence.listQuestionsForMode("kitchen_challenge");
        const eligibleQuestions = pool.filter((question) => definition.allowQuestionSelection(question));
        if (eligibleQuestions.length === 0) {
            throw toGameEngineError("INVALID_QUESTION", "No published food safety scenarios are available for Kitchen Challenge.");
        }

        const questions = chooseKitchenChallengeScenarios(eligibleQuestions, 3);
        const session = await this.persistence.createSession({
            userId,
            gameMode: "kitchen_challenge",
        });

        return { session, questions };
    }

    async createFoodDetectiveSession(input: { userId: string }): Promise<{
        session: GameSessionRecord;
        questions: QuestionRecord[];
    }> {
        const userId = resolveUserId(input.userId, this.defaultUserId);
        if (!userId) {
            throw toGameEngineError("UNAUTHENTICATED_USER", "You must be authenticated to create a session.");
        }

        const definition = getGameModeDefinition("food_detective");
        const pool = await this.persistence.listQuestionsForMode("food_detective");
        const eligibleQuestions = pool.filter((question) => definition.allowQuestionSelection(question));
        if (eligibleQuestions.length === 0) {
            throw toGameEngineError("INVALID_QUESTION", "No published food observation clues are available for Food Detective.");
        }

        const questions = chooseFoodDetectiveClues(eligibleQuestions, 3);
        const session = await this.persistence.createSession({
            userId,
            gameMode: "food_detective",
        });

        return { session, questions };
    }

    async loadQuestionSetForMode(input: { userId: string; gameMode: GameModeName }): Promise<LoadModeQuestionSet> {
        const userId = resolveUserId(input.userId, this.defaultUserId);
        if (!userId) {
            throw toGameEngineError("UNAUTHENTICATED_USER", "You must be authenticated to load a challenge.");
        }

        const mode = this.validateGameMode(input.gameMode);
        const questionPool = await this.persistence.listQuestionsForMode(mode);
        const modeDefinition = getGameModeDefinition(mode);
        const selectedQuestion = questionPool.find((question) => modeDefinition.allowQuestionSelection(question)) ?? null;

        return {
            mode,
            question: selectedQuestion,
            questionCount: questionPool.length,
        };
    }

    async getSessionForUser(input: { userId: string; sessionId: string }): Promise<GameSessionRecord> {
        const userId = resolveUserId(input.userId, this.defaultUserId);
        if (!userId) {
            throw toGameEngineError("UNAUTHENTICATED_USER", "You must be authenticated to view a session.");
        }

        const session = await this.persistence.getSessionById(input.sessionId);
        if (!session) {
            throw toGameEngineError("SESSION_NOT_FOUND", "Session was not found.");
        }
        if (session.user_id !== userId) {
            throw toGameEngineError("SESSION_NOT_OWNED_BY_USER", "This session does not belong to the authenticated user.");
        }

        return session;
    }

    async getSessionResult(input: { userId: string; sessionId: string }): Promise<{ session: GameSessionRecord; attempts: GameAttemptRecord[] }> {
        const session = await this.getSessionForUser(input);
        const attempts = await this.persistence.getAttemptsForSession(input.sessionId);

        return {
            session,
            attempts,
        };
    }

    async submitAnswer(input: SubmitAnswerInput): Promise<SessionSubmissionResult> {
        const userId = resolveUserId(input.userId, this.defaultUserId);
        const session = await this.getActiveSessionForSubmission(userId, input.sessionId);

        const question = await this.persistence.getQuestionById(input.questionId);
        if (!question) {
            throw toGameEngineError("INVALID_QUESTION", "The submitted question could not be found.");
        }

        const options = await this.persistence.getQuestionOptions(input.questionId);
        const selectedOption = options.find((option) => option.id === input.selectedOptionId);
        if (!selectedOption) {
            throw toGameEngineError("INVALID_OPTION", "The selected option is not valid for the submitted question.");
        }
        if (selectedOption.question_id !== input.questionId) {
            throw toGameEngineError("OPTION_QUESTION_MISMATCH", "The selected option does not belong to the submitted question.");
        }

        const modeDefinition = getGameModeDefinition(session.game_mode);
        if (!modeDefinition.allowQuestionSelection(question)) {
            throw toGameEngineError("INVALID_QUESTION", "This question is not valid for the session mode.");
        }

        if (!modeDefinition.allowDuplicateQuestionAttempts) {
            const attemptsForQuestion = typeof this.persistence.countAttemptsForQuestion === "function"
                ? await this.persistence.countAttemptsForQuestion(input.sessionId, input.questionId)
                : (await this.persistence.getAttemptsForSession(input.sessionId)).filter(
                    (attempt) => attempt.question_id === input.questionId,
                ).length;

            if (attemptsForQuestion > 0) {
                throw toGameEngineError("DUPLICATE_ATTEMPT", "This question has already been attempted in this session.");
            }
        }

        const isCorrect = modeDefinition.evaluateCorrectness(question, input.selectedOptionId);

        if (input.clientScore !== undefined) {
            // Ignore any client-supplied score values; scoring is server-authoritative.
        }
        if (input.clientIsCorrect !== undefined) {
            // Ignore any client-supplied correctness; the server determines the result.
        }

        const result = await this.persistValidatedAttempt(session, {
            session_id: input.sessionId,
            question_id: input.questionId,
            selected_option_id: input.selectedOptionId,
            recipe_id: null,
            selected_ingredient_ids: null,
            selected_recipe_step_ids: null,
            response_time_ms: input.responseTimeMs ?? null,
        }, isCorrect);

        return {
            ...result,
            isCorrect,
        };
    }

    async submitRecipeBuilderAnswer(input: { userId: string; submission: RecipeBuilderSubmission }): Promise<RecipeBuilderSubmissionResult> {
        const userId = resolveUserId(input.userId, this.defaultUserId);
        const session = await this.getActiveSessionForSubmission(userId, input.submission.sessionId);
        if (session.game_mode !== "recipe_builder") {
            throw toGameEngineError("INVALID_GAME_MODE", "This session is not a Recipe Builder session.");
        }

        const { recipeId, selectedIngredientIds } = input.submission;
        if (!Array.isArray(selectedIngredientIds)
            || selectedIngredientIds.length === 0
            || selectedIngredientIds.length > 40
            || selectedIngredientIds.some((id) => typeof id !== "string" || id.length === 0)
            || new Set(selectedIngredientIds).size !== selectedIngredientIds.length) {
            throw toGameEngineError("INVALID_SUBMISSION", "Select a valid set of recipe ingredients.");
        }
        if (!session.challenge_recipe_ids.includes(recipeId)) {
            throw toGameEngineError("INVALID_QUESTION", "This recipe is not part of the active session.");
        }

        const recipe = await this.persistence.getRecipeBuilderRecipeById(recipeId);
        const definition = getGameModeDefinition("recipe_builder");
        if (!recipe || definition.allowRecipeSelection?.(recipe) !== true) {
            throw toGameEngineError("INVALID_QUESTION", "This recipe is not available for Recipe Builder.");
        }

        const publishedSelections = await this.persistence.listPublishedIngredientsByIds(selectedIngredientIds);
        if (publishedSelections.length !== selectedIngredientIds.length) {
            throw toGameEngineError("INVALID_SUBMISSION", "The selection contains an unavailable ingredient.");
        }

        if (await this.persistence.countAttemptsForRecipe(input.submission.sessionId, recipeId) > 0) {
            throw toGameEngineError("DUPLICATE_ATTEMPT", "This recipe has already been submitted in this session.");
        }

        const isCorrect = definition.evaluateRecipeBuilderAnswer?.(recipe, selectedIngredientIds, session.id) === true;
        const result = await this.persistValidatedAttempt(session, {
            session_id: session.id,
            question_id: null,
            selected_option_id: null,
            recipe_id: recipe.id,
            selected_ingredient_ids: selectedIngredientIds,
            selected_recipe_step_ids: null,
            response_time_ms: input.submission.responseTimeMs ?? null,
        }, isCorrect);

        const attempts = await this.persistence.getAttemptsForSession(session.id);
        const completedCount = session.challenge_recipe_ids.filter((id) =>
            attempts.some((attempt) => attempt.recipe_id === id),
        ).length;
        const correctCount = attempts.filter((attempt) => attempt.recipe_id !== null && attempt.is_correct).length;
        const isComplete = completedCount === session.challenge_recipe_ids.length;
        const completedSession = isComplete
            ? await this.completeSession({ userId, sessionId: session.id })
            : result.session;

        return {
            session: completedSession,
            attempt: result.attempt,
            isCorrect,
            scoreDelta: result.scoreDelta,
            completedCount,
            correctCount,
            challengeCount: session.challenge_recipe_ids.length,
            isComplete,
        };
    }

    async submitCookingOrderAnswer(input: { userId: string; submission: CookingOrderSubmission }): Promise<CookingOrderSubmissionResult> {
        const userId = resolveUserId(input.userId, this.defaultUserId);
        const session = await this.getActiveSessionForSubmission(userId, input.submission.sessionId);
        if (session.game_mode !== "cooking_order") {
            throw toGameEngineError("INVALID_GAME_MODE", "This session is not a Cooking Order session.");
        }

        const { recipeId, orderedStepIds } = input.submission;
        if (!Array.isArray(orderedStepIds)
            || orderedStepIds.length < 2
            || orderedStepIds.length > 40
            || orderedStepIds.some((id) => typeof id !== "string" || id.length === 0)
            || new Set(orderedStepIds).size !== orderedStepIds.length) {
            throw toGameEngineError("INVALID_SUBMISSION", "Submit each required recipe step exactly once.");
        }
        if (!session.challenge_recipe_ids.includes(recipeId)) {
            throw toGameEngineError("INVALID_QUESTION", "This recipe is not part of the active Cooking Order session.");
        }

        const recipe = await this.persistence.getCookingOrderRecipeById(recipeId);
        const definition = getGameModeDefinition("cooking_order");
        if (!recipe || definition.allowCookingOrderSelection?.(recipe) !== true) {
            throw toGameEngineError("INVALID_QUESTION", "This recipe does not have valid published Cooking Order steps.");
        }

        const authoritativeStepIds = new Set(recipe.steps.map((step) => step.id));
        if (orderedStepIds.some((stepId) => !authoritativeStepIds.has(stepId))) {
            throw toGameEngineError("INVALID_STEP", "The submission contains a step not belonging to this recipe.");
        }
        if (orderedStepIds.length !== authoritativeStepIds.size
            || recipe.steps.some((step) => !orderedStepIds.includes(step.id))) {
            throw toGameEngineError("INVALID_SUBMISSION", "Include every required step exactly once.");
        }

        if (await this.persistence.countAttemptsForRecipe(input.submission.sessionId, recipeId) > 0) {
            throw toGameEngineError("DUPLICATE_ATTEMPT", "This Cooking Order round has already been submitted.");
        }

        const isCorrect = definition.evaluateCookingOrderAnswer?.(recipe, orderedStepIds) === true;
        const result = await this.persistValidatedAttempt(session, {
            session_id: session.id,
            question_id: null,
            selected_option_id: null,
            recipe_id: recipe.id,
            selected_ingredient_ids: null,
            selected_recipe_step_ids: orderedStepIds,
            response_time_ms: input.submission.responseTimeMs ?? null,
        }, isCorrect);

        const attempts = await this.persistence.getAttemptsForSession(session.id);
        const completedCount = session.challenge_recipe_ids.filter((id) =>
            attempts.some((attempt) => attempt.recipe_id === id),
        ).length;
        const correctCount = attempts.filter((attempt) => attempt.recipe_id !== null && attempt.is_correct).length;
        const isComplete = completedCount === session.challenge_recipe_ids.length;
        const completedSession = isComplete
            ? await this.completeSession({ userId, sessionId: session.id })
            : result.session;

        return {
            session: completedSession,
            attempt: result.attempt,
            isCorrect,
            scoreDelta: result.scoreDelta,
            completedCount,
            correctCount,
            challengeCount: session.challenge_recipe_ids.length,
            isComplete,
        };
    }

    private async getActiveSessionForSubmission(userId: string, sessionId: string): Promise<GameSessionRecord> {
        if (!userId) {
            throw toGameEngineError("UNAUTHENTICATED_USER", "You must be authenticated to submit an answer.");
        }

        const session = await this.persistence.getSessionById(sessionId);
        if (!session) {
            throw toGameEngineError("SESSION_NOT_FOUND", "Session was not found.");
        }
        if (session.user_id !== userId) {
            throw toGameEngineError("SESSION_NOT_OWNED_BY_USER", "This session does not belong to the authenticated user.");
        }
        if (session.status === "completed") {
            throw toGameEngineError("SESSION_COMPLETED", "This session has already been completed.");
        }
        if (session.status === "abandoned") {
            throw toGameEngineError("SESSION_ABANDONED", "This session has been abandoned and cannot receive new answers.");
        }
        return session;
    }

    private async persistValidatedAttempt(
        session: GameSessionRecord,
        input: {
            session_id: string;
            question_id: string | null;
            selected_option_id: string | null;
            recipe_id: string | null;
            selected_ingredient_ids: string[] | null;
            selected_recipe_step_ids: string[] | null;
            response_time_ms: number | null;
        },
        isCorrect: boolean,
    ): Promise<{ session: GameSessionRecord; attempt: GameAttemptRecord; scoreDelta: number }> {
        const modeDefinition = getGameModeDefinition(session.game_mode);
        const scoreDelta = isCorrect ? modeDefinition.calculateScore(isCorrect) : 0;
        const attempt = await this.persistence.insertAttempt({ ...input, is_correct: isCorrect });
        const updatedSession = await this.persistence.updateSession(session.id, {
            score: session.score + scoreDelta,
            updated_at: toIsoString(new Date()),
        });

        if (!updatedSession) {
            throw toGameEngineError("DATABASE_FAILURE", "The session could not be updated after the attempt was recorded.");
        }

        return { session: updatedSession, attempt, scoreDelta };
    }

    async completeSession(input: CompleteSessionInput): Promise<GameSessionRecord> {
        const userId = resolveUserId(input.userId, this.defaultUserId);
        if (!userId) {
            throw toGameEngineError("UNAUTHENTICATED_USER", "You must be authenticated to complete a session.");
        }

        const session = await this.persistence.getSessionById(input.sessionId);
        if (!session) {
            throw toGameEngineError("SESSION_NOT_FOUND", "Session was not found.");
        }
        if (session.user_id !== userId) {
            throw toGameEngineError("SESSION_NOT_OWNED_BY_USER", "This session does not belong to the authenticated user.");
        }
        if (session.status === "completed") {
            throw toGameEngineError("INVALID_SESSION_TRANSITION", "A completed session cannot be marked complete again.");
        }
        if (session.status === "abandoned") {
            throw toGameEngineError("INVALID_SESSION_TRANSITION", "An abandoned session cannot be marked complete.");
        }

        const nextCompletedAt = toIsoString(new Date());
        const completedSession = await this.persistence.updateSession(input.sessionId, {
            status: "completed",
            completed_at: nextCompletedAt,
            updated_at: nextCompletedAt,
        });

        if (!completedSession) {
            throw toGameEngineError("DATABASE_FAILURE", "The session could not be marked complete.");
        }

        return completedSession;
    }

    async abandonSession(input: CompleteSessionInput): Promise<GameSessionRecord> {
        const userId = resolveUserId(input.userId, this.defaultUserId);
        if (!userId) {
            throw toGameEngineError("UNAUTHENTICATED_USER", "You must be authenticated to abandon a session.");
        }

        const session = await this.persistence.getSessionById(input.sessionId);
        if (!session) {
            throw toGameEngineError("SESSION_NOT_FOUND", "Session was not found.");
        }
        if (session.user_id !== userId) {
            throw toGameEngineError("SESSION_NOT_OWNED_BY_USER", "This session does not belong to the authenticated user.");
        }
        if (session.status === "completed") {
            throw toGameEngineError("INVALID_SESSION_TRANSITION", "A completed session cannot be abandoned.");
        }
        if (session.status === "abandoned") {
            throw toGameEngineError("INVALID_SESSION_TRANSITION", "This session is already abandoned.");
        }

        const nextUpdatedAt = toIsoString(new Date());
        const abandonedSession = await this.persistence.updateSession(input.sessionId, {
            status: "abandoned",
            completed_at: nextUpdatedAt,
            updated_at: nextUpdatedAt,
        });

        if (!abandonedSession) {
            throw toGameEngineError("DATABASE_FAILURE", "The session could not be marked abandoned.");
        }

        return abandonedSession;
    }

    validateGameMode(mode: GameModeName): GameModeName {
        const definition = getGameModeDefinition(mode as GameModeName);
        if (!definition) {
            throw toGameEngineError("INVALID_GAME_MODE", "The requested game mode is not supported.");
        }
        return definition.modeId;
    }
}

export async function createGameSessionService(): Promise<GameSessionService> {
    const { createSupabaseServerClient } = await import("../../lib/supabase/server");
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        throw toGameEngineError("DATABASE_FAILURE", "Supabase is not configured for the game engine.");
    }

    return new GameSessionService(createSupabaseGamePersistence(supabase));
}

export function createSupabaseGamePersistence(client: SupabaseClient<Database>): GamePersistence {
    async function getQuestionModuleDetails(learningModuleId: string | null) {
        if (!learningModuleId) {
            return null;
        }

        const { data, error } = await client
            .from("learning_modules")
            .select("category, status")
            .eq("id", learningModuleId)
            .eq("status", "published")
            .maybeSingle();

        if (error) {
            throw toGameEngineError("DATABASE_FAILURE", error.message);
        }

        return data;
    }

    async function loadRecipeBuilderCatalog(): Promise<{
        recipes: RecipeBuilderRecipeRecord[];
        ingredients: import("./types").RecipeBuilderIngredientChoice[];
    }> {
        const { data: recipeRows, error: recipeError } = await client
            .from("recipes")
            .select("id, title, description, status")
            .eq("status", "published")
            .order("title");

        if (recipeError) {
            throw toGameEngineError("DATABASE_FAILURE", recipeError.message);
        }

        const recipes = recipeRows ?? [];
        const recipeIds = recipes.map((recipe) => recipe.id);
        const { data: ingredientLinks, error: linkError } = recipeIds.length
            ? await client.from("recipe_ingredients").select("recipe_id, ingredient_id").in("recipe_id", recipeIds)
            : { data: [], error: null };

        if (linkError) {
            throw toGameEngineError("DATABASE_FAILURE", linkError.message);
        }

        const linkedIngredientIds = [...new Set((ingredientLinks ?? []).map((link) => link.ingredient_id))];
        const { data: ingredientRows, error: ingredientError } = linkedIngredientIds.length
            ? await client.from("ingredients").select("id, name, status").in("id", linkedIngredientIds)
            : { data: [], error: null };

        if (ingredientError) {
            throw toGameEngineError("DATABASE_FAILURE", ingredientError.message);
        }

        const { data: publishedIngredientRows, error: publishedIngredientError } = await client
            .from("ingredients")
            .select("id, name")
            .eq("status", "published")
            .order("name");

        if (publishedIngredientError) {
            throw toGameEngineError("DATABASE_FAILURE", publishedIngredientError.message);
        }

        const ingredientById = new Map((ingredientRows ?? []).map((ingredient) => [ingredient.id, ingredient]));
        return {
            recipes: recipes.map((recipe) => ({
                id: recipe.id,
                title: recipe.title,
                description: recipe.description,
                status: recipe.status,
                ingredients: (ingredientLinks ?? [])
                    .filter((link) => link.recipe_id === recipe.id)
                    .flatMap((link) => {
                        const ingredient = ingredientById.get(link.ingredient_id);
                        return ingredient ? [{ id: ingredient.id, name: ingredient.name, status: ingredient.status }] : [];
                    }),
            })),
            ingredients: (publishedIngredientRows ?? []).map(({ id, name }) => ({ id, name })),
        };
    }

    async function listCookingOrderRecipes(): Promise<CookingOrderRecipeRecord[]> {
        const { data: recipeRows, error: recipeError } = await client
            .from("recipes")
            .select("id, title, description, status")
            .eq("status", "published")
            .order("title");

        if (recipeError) {
            throw toGameEngineError("DATABASE_FAILURE", recipeError.message);
        }

        const recipes = recipeRows ?? [];
        const recipeIds = recipes.map((recipe) => recipe.id);
        const { data: stepRows, error: stepError } = recipeIds.length
            ? await client
                .from("recipe_steps")
                .select("id, recipe_id, step_number, instruction, time_minutes, educational_note")
                .in("recipe_id", recipeIds)
                .order("step_number")
            : { data: [], error: null };

        if (stepError) {
            throw toGameEngineError("DATABASE_FAILURE", stepError.message);
        }

        return recipes.map((recipe) => ({
            id: recipe.id,
            title: recipe.title,
            description: recipe.description,
            status: recipe.status,
            steps: (stepRows ?? []).filter((step) => step.recipe_id === recipe.id),
        }));
    }

    return {
        async createSession(input: CreateSessionInput): Promise<GameSessionRecord> {
            const { data, error } = await client
                .from("game_sessions")
                .insert({
                    user_id: input.userId,
                    game_mode: input.gameMode,
                    status: "active",
                    score: 0,
                    challenge_recipe_ids: input.challengeRecipeIds ?? [],
                })
                .select()
                .single();

            if (error || !data) {
                throw toGameEngineError("DATABASE_FAILURE", error?.message ?? "Failed to create a game session.");
            }

            return {
                id: data.id,
                user_id: data.user_id,
                game_mode: data.game_mode,
                status: data.status,
                started_at: data.started_at,
                completed_at: data.completed_at,
                score: data.score,
                challenge_recipe_ids: data.challenge_recipe_ids ?? [],
                created_at: data.created_at,
                updated_at: data.updated_at,
            };
        },
        async getSessionById(sessionId: string): Promise<GameSessionRecord | null> {
            const { data, error } = await client
                .from("game_sessions")
                .select("*")
                .eq("id", sessionId)
                .maybeSingle();

            if (error) {
                throw toGameEngineError("DATABASE_FAILURE", error.message);
            }
            if (!data) {
                return null;
            }

            return {
                id: data.id,
                user_id: data.user_id,
                game_mode: data.game_mode,
                status: data.status,
                started_at: data.started_at,
                completed_at: data.completed_at,
                score: data.score,
                challenge_recipe_ids: data.challenge_recipe_ids ?? [],
                created_at: data.created_at,
                updated_at: data.updated_at,
            };
        },
        async updateSession(sessionId: string, updates: Partial<GameSessionRecord>): Promise<GameSessionRecord | null> {
            const { data, error } = await client
                .from("game_sessions")
                .update(updates)
                .eq("id", sessionId)
                .select()
                .single();

            if (error) {
                throw toGameEngineError("DATABASE_FAILURE", error.message);
            }
            if (!data) {
                return null;
            }

            return {
                id: data.id,
                user_id: data.user_id,
                game_mode: data.game_mode,
                status: data.status,
                started_at: data.started_at,
                completed_at: data.completed_at,
                score: data.score,
                challenge_recipe_ids: data.challenge_recipe_ids ?? [],
                created_at: data.created_at,
                updated_at: data.updated_at,
            };
        },
        async getQuestionById(questionId: string): Promise<QuestionRecord | null> {
            const { data, error } = await client
                .from("questions")
                .select("*")
                .eq("id", questionId)
                .maybeSingle();

            if (error) {
                throw toGameEngineError("DATABASE_FAILURE", error.message);
            }
            if (!data) {
                return null;
            }

            const options = await this.getQuestionOptions(questionId);
            const moduleDetails = await getQuestionModuleDetails(data.learning_module_id);
            return {
                id: data.id,
                slug: data.slug,
                learning_module_id: data.learning_module_id,
                learning_module_category: moduleDetails?.category ?? null,
                learning_module_status: moduleDetails?.status ?? null,
                question_text: data.question_text,
                question_type: data.question_type,
                explanation: data.explanation,
                difficulty: data.difficulty,
                status: data.status,
                created_at: data.created_at,
                updated_at: data.updated_at,
                options,
            };
        },
        async getQuestionOptions(questionId: string): Promise<import("./types").QuestionOptionRecord[]> {
            const { data, error } = await client
                .from("question_options")
                .select("*")
                .eq("question_id", questionId)
                .order("option_order");

            if (error) {
                throw toGameEngineError("DATABASE_FAILURE", error.message);
            }

            return (data ?? []).map((option) => ({
                id: option.id,
                question_id: option.question_id,
                option_text: option.option_text,
                option_order: option.option_order,
                is_correct: option.is_correct,
            }));
        },
        async listQuestionsForMode(gameMode: GameModeName): Promise<QuestionRecord[]> {
            const { data, error } = await client
                .from("questions")
                .select("*")
                .eq("status", "published")
                .order("created_at", { ascending: false });

            if (error) {
                throw toGameEngineError("DATABASE_FAILURE", error.message);
            }

            const rawQuestions = data ?? [];
            const results: QuestionRecord[] = [];
            for (const question of rawQuestions) {
                const options = await this.getQuestionOptions(question.id);
                const moduleDetails = await getQuestionModuleDetails(question.learning_module_id);
                results.push({
                    id: question.id,
                    slug: question.slug,
                    learning_module_id: question.learning_module_id,
                    learning_module_category: moduleDetails?.category ?? null,
                    learning_module_status: moduleDetails?.status ?? null,
                    question_text: question.question_text,
                    question_type: question.question_type,
                    explanation: question.explanation,
                    difficulty: question.difficulty,
                    status: question.status,
                    created_at: question.created_at,
                    updated_at: question.updated_at,
                    options,
                });
            }

            const modeDefinition = getGameModeDefinition(gameMode);
            return results.filter((question) => modeDefinition.allowQuestionSelection(question));
        },
        async insertAttempt(input: {
            session_id: string;
            question_id: string | null;
            selected_option_id: string | null;
            recipe_id: string | null;
            selected_ingredient_ids: string[] | null;
            selected_recipe_step_ids: string[] | null;
            is_correct: boolean;
            response_time_ms: number | null;
        }): Promise<GameAttemptRecord> {
            const { data, error } = await client
                .from("game_attempts")
                .insert({
                    session_id: input.session_id,
                    question_id: input.question_id,
                    selected_option_id: input.selected_option_id,
                    recipe_id: input.recipe_id,
                    selected_ingredient_ids: input.selected_ingredient_ids,
                    selected_recipe_step_ids: input.selected_recipe_step_ids,
                    is_correct: input.is_correct,
                    response_time_ms: input.response_time_ms,
                })
                .select()
                .single();

            if (error || !data) {
                if (error?.code === "23505" && input.recipe_id) {
                    throw toGameEngineError("DUPLICATE_ATTEMPT", "This recipe has already been submitted in this session.");
                }
                throw toGameEngineError("DATABASE_FAILURE", error?.message ?? "Failed to insert a game attempt.");
            }

            return {
                id: data.id,
                session_id: data.session_id,
                question_id: data.question_id,
                selected_option_id: data.selected_option_id,
                recipe_id: data.recipe_id,
                selected_ingredient_ids: data.selected_ingredient_ids,
                selected_recipe_step_ids: data.selected_recipe_step_ids,
                is_correct: data.is_correct,
                response_time_ms: data.response_time_ms,
                created_at: data.created_at,
            };
        },
        async getAttemptsForSession(sessionId: string): Promise<GameAttemptRecord[]> {
            const { data, error } = await client
                .from("game_attempts")
                .select("*")
                .eq("session_id", sessionId);

            if (error) {
                throw toGameEngineError("DATABASE_FAILURE", error.message);
            }

            return (data ?? []).map((attempt) => ({
                id: attempt.id,
                session_id: attempt.session_id,
                question_id: attempt.question_id,
                selected_option_id: attempt.selected_option_id,
                recipe_id: attempt.recipe_id,
                selected_ingredient_ids: attempt.selected_ingredient_ids,
                selected_recipe_step_ids: attempt.selected_recipe_step_ids,
                is_correct: attempt.is_correct,
                response_time_ms: attempt.response_time_ms,
                created_at: attempt.created_at,
            }));
        },
        async countAttemptsForQuestion(sessionId: string, questionId: string): Promise<number> {
            const { count, error } = await client
                .from("game_attempts")
                .select("id", { count: "exact", head: true })
                .eq("session_id", sessionId)
                .eq("question_id", questionId);

            if (error) {
                throw toGameEngineError("DATABASE_FAILURE", error.message);
            }

            return count ?? 0;
        },
        async listRecipeBuilderCatalog() {
            return loadRecipeBuilderCatalog();
        },
        async getRecipeBuilderRecipeById(recipeId: string): Promise<RecipeBuilderRecipeRecord | null> {
            const { data: recipe, error: recipeError } = await client
                .from("recipes")
                .select("id, title, description, status")
                .eq("id", recipeId)
                .maybeSingle();

            if (recipeError) {
                throw toGameEngineError("DATABASE_FAILURE", recipeError.message);
            }
            if (!recipe) {
                return null;
            }

            const { data: links, error: linkError } = await client
                .from("recipe_ingredients")
                .select("ingredient_id")
                .eq("recipe_id", recipeId);

            if (linkError) {
                throw toGameEngineError("DATABASE_FAILURE", linkError.message);
            }

            const ingredientIds = [...new Set((links ?? []).map((link) => link.ingredient_id))];
            const { data: ingredientRows, error: ingredientError } = ingredientIds.length
                ? await client.from("ingredients").select("id, name, status").in("id", ingredientIds)
                : { data: [], error: null };

            if (ingredientError) {
                throw toGameEngineError("DATABASE_FAILURE", ingredientError.message);
            }

            const ingredientById = new Map((ingredientRows ?? []).map((ingredient) => [ingredient.id, ingredient]));
            return {
                id: recipe.id,
                title: recipe.title,
                description: recipe.description,
                status: recipe.status,
                ingredients: (links ?? []).flatMap((link) => {
                    const ingredient = ingredientById.get(link.ingredient_id);
                    return ingredient ? [{ id: ingredient.id, name: ingredient.name, status: ingredient.status }] : [];
                }),
            };
        },
        async listPublishedIngredientsByIds(ingredientIds: string[]) {
            if (ingredientIds.length === 0) {
                return [];
            }

            const { data, error } = await client
                .from("ingredients")
                .select("id, name")
                .in("id", ingredientIds)
                .eq("status", "published");

            if (error) {
                throw toGameEngineError("DATABASE_FAILURE", error.message);
            }

            return (data ?? []).map(({ id, name }) => ({ id, name }));
        },
        async countAttemptsForRecipe(sessionId: string, recipeId: string): Promise<number> {
            const { count, error } = await client
                .from("game_attempts")
                .select("id", { count: "exact", head: true })
                .eq("session_id", sessionId)
                .eq("recipe_id", recipeId);

            if (error) {
                throw toGameEngineError("DATABASE_FAILURE", error.message);
            }

            return count ?? 0;
        },
        async listCookingOrderCatalog() {
            return listCookingOrderRecipes();
        },
        async getCookingOrderRecipeById(recipeId: string): Promise<CookingOrderRecipeRecord | null> {
            const { data: recipe, error: recipeError } = await client
                .from("recipes")
                .select("id, title, description, status")
                .eq("id", recipeId)
                .maybeSingle();

            if (recipeError) {
                throw toGameEngineError("DATABASE_FAILURE", recipeError.message);
            }
            if (!recipe) {
                return null;
            }

            const { data: steps, error: stepError } = await client
                .from("recipe_steps")
                .select("id, recipe_id, step_number, instruction, time_minutes, educational_note")
                .eq("recipe_id", recipeId)
                .order("step_number");

            if (stepError) {
                throw toGameEngineError("DATABASE_FAILURE", stepError.message);
            }

            return {
                id: recipe.id,
                title: recipe.title,
                description: recipe.description,
                status: recipe.status,
                steps: steps ?? [],
            };
        },
    };
}

export const BASE_GAME_SCORE = GAME_ENGINE_BASE_SCORE;
