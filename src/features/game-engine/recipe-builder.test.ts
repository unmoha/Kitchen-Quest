import { describe, expect, it } from "vitest";
import { GameSessionService } from "./service";
import type {
    GameAttemptRecord,
    GameModeName,
    GameSessionRecord,
    RecipeBuilderIngredientChoice,
    RecipeBuilderRecipeRecord,
} from "./types";
import {
    getRecipeBuilderRequiredIngredientIds,
    parseRecipeBuilderSubmission,
    toRecipeBuilderChallenge,
} from "./recipe-builder";

const makeRecipe = (id: string, overrides: Partial<RecipeBuilderRecipeRecord> = {}): RecipeBuilderRecipeRecord => ({
    id,
    title: `Recipe ${id}`,
    description: "A published recipe challenge.",
    status: "published",
    ingredients: [
        { id: "ingredient-a", name: "Ingredient A", status: "published" },
        { id: "ingredient-b", name: "Ingredient B", status: "published" },
        { id: "ingredient-c", name: "Ingredient C", status: "published" },
        { id: "ingredient-d", name: "Ingredient D", status: "published" },
        { id: "ingredient-e", name: "Ingredient E", status: "published" },
    ],
    ...overrides,
});

const makeSession = (
    id: string,
    userId: string,
    challengeRecipeIds: string[],
    overrides: Partial<GameSessionRecord> = {},
): GameSessionRecord => ({
    id,
    user_id: userId,
    game_mode: "recipe_builder",
    status: "active",
    started_at: "2026-01-01T00:00:00.000Z",
    completed_at: null,
    score: 0,
    challenge_recipe_ids: challengeRecipeIds,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
});

function createRecipeBuilderService(options: {
    recipes?: RecipeBuilderRecipeRecord[];
    sessions?: GameSessionRecord[];
    attempts?: GameAttemptRecord[];
    ingredients?: RecipeBuilderIngredientChoice[];
    userId?: string;
} = {}) {
    const recipes = options.recipes ?? [makeRecipe("recipe-1"), makeRecipe("recipe-2"), makeRecipe("recipe-3"), makeRecipe("recipe-4")];
    const sessions = options.sessions ?? [];
    const attempts = options.attempts ?? [];
    const ingredients = options.ingredients ?? [
        { id: "ingredient-a", name: "Ingredient A" },
        { id: "ingredient-b", name: "Ingredient B" },
        { id: "ingredient-c", name: "Ingredient C" },
        { id: "ingredient-d", name: "Ingredient D" },
        { id: "ingredient-e", name: "Ingredient E" },
        { id: "ingredient-f", name: "Ingredient F" },
        { id: "ingredient-g", name: "Ingredient G" },
        { id: "ingredient-h", name: "Ingredient H" },
        { id: "ingredient-i", name: "Ingredient I" },
    ];
    const userId = options.userId ?? "user-1";

    const persistence = {
        async createSession(input: { userId: string; gameMode: GameModeName; challengeRecipeIds?: string[] }) {
            const session = makeSession(`session-${sessions.length + 1}`, input.userId, input.challengeRecipeIds ?? [], {
                game_mode: input.gameMode,
            });
            sessions.push(session);
            return session;
        },
        async getSessionById(sessionId: string) {
            return sessions.find((session) => session.id === sessionId) ?? null;
        },
        async updateSession(sessionId: string, updates: Partial<GameSessionRecord>) {
            const index = sessions.findIndex((session) => session.id === sessionId);
            if (index < 0) {
                return null;
            }
            sessions[index] = { ...sessions[index], ...updates };
            return sessions[index];
        },
        async getQuestionById() {
            return null;
        },
        async getQuestionOptions() {
            return [];
        },
        async listQuestionsForMode() {
            return [];
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
        }) {
            const attempt: GameAttemptRecord = {
                id: `attempt-${attempts.length + 1}`,
                ...input,
                created_at: "2026-01-01T00:00:00.000Z",
            };
            attempts.push(attempt);
            return attempt;
        },
        async getAttemptsForSession(sessionId: string) {
            return attempts.filter((attempt) => attempt.session_id === sessionId);
        },
        async countAttemptsForQuestion() {
            return 0;
        },
        async listRecipeBuilderCatalog() {
            return { recipes, ingredients };
        },
        async getRecipeBuilderRecipeById(recipeId: string) {
            return recipes.find((recipe) => recipe.id === recipeId) ?? null;
        },
        async listPublishedIngredientsByIds(ingredientIds: string[]) {
            return ingredients.filter((ingredient) => ingredientIds.includes(ingredient.id));
        },
        async countAttemptsForRecipe(sessionId: string, recipeId: string) {
            return attempts.filter((attempt) => attempt.session_id === sessionId && attempt.recipe_id === recipeId).length;
        },
        async listCookingOrderCatalog() {
            return [];
        },
        async getCookingOrderRecipeById() {
            return null;
        },
    };

    return { service: new GameSessionService(persistence, userId), sessions, attempts };
}

const submission = (sessionId: string, recipeId = "recipe-1", selectedIngredientIds = getRecipeBuilderRequiredIngredientIds(makeRecipe(recipeId), sessionId)) => ({
    sessionId,
    recipeId,
    selectedIngredientIds,
});

describe("Recipe Builder", () => {
    it("creates a Recipe Builder session assigned to valid published recipes", async () => {
        const { service } = createRecipeBuilderService();

        const result = await service.createRecipeBuilderSession({ userId: "user-1" });

        expect(result.session.game_mode).toBe("recipe_builder");
        expect(result.session.challenge_recipe_ids).toHaveLength(3);
        expect(result.recipes.map((recipe) => recipe.id)).toEqual(result.session.challenge_recipe_ids);
    });

    it("selects a valid published recipe challenge", async () => {
        const { service } = createRecipeBuilderService({ recipes: [makeRecipe("only-recipe")] });

        const result = await service.createRecipeBuilderSession({ userId: "user-1" });

        expect(result.recipes).toEqual([makeRecipe("only-recipe")]);
        expect(result.session.challenge_recipe_ids).toEqual(["only-recipe"]);
    });

    it("rejects an unpublished recipe", async () => {
        const recipe = makeRecipe("recipe-1", { status: "draft" });
        const session = makeSession("session-1", "user-1", [recipe.id]);
        const { service } = createRecipeBuilderService({ recipes: [recipe], sessions: [session] });

        await expect(service.submitRecipeBuilderAnswer({ userId: "user-1", submission: submission(session.id) }))
            .rejects.toMatchObject({ code: "INVALID_QUESTION" });
    });

    it("rejects an invalid recipe ID", async () => {
        const session = makeSession("session-1", "user-1", ["missing-recipe"]);
        const { service } = createRecipeBuilderService({ sessions: [session] });

        await expect(service.submitRecipeBuilderAnswer({
            userId: "user-1",
            submission: submission(session.id, "missing-recipe"),
        })).rejects.toMatchObject({ code: "INVALID_QUESTION" });
    });

    it("rejects a published recipe not assigned to the session", async () => {
        const session = makeSession("session-1", "user-1", ["recipe-1"]);
        const { service } = createRecipeBuilderService({ sessions: [session] });

        await expect(service.submitRecipeBuilderAnswer({
            userId: "user-1",
            submission: submission(session.id, "recipe-2"),
        })).rejects.toMatchObject({ code: "INVALID_QUESTION" });
    });

    it("accepts the exact authoritative ingredient set", async () => {
        const session = makeSession("session-1", "user-1", ["recipe-1"]);
        const { service } = createRecipeBuilderService({ sessions: [session] });

        const result = await service.submitRecipeBuilderAnswer({ userId: "user-1", submission: submission(session.id) });

        expect(result.isCorrect).toBe(true);
        expect(result.session.score).toBe(10);
        expect(result.attempt.selected_ingredient_ids).toEqual(submission(session.id).selectedIngredientIds);
    });

    it("rejects an incorrect ingredient set without awarding points", async () => {
        const session = makeSession("session-1", "user-1", ["recipe-1"]);
        const { service } = createRecipeBuilderService({ sessions: [session] });

        const result = await service.submitRecipeBuilderAnswer({
            userId: "user-1",
            submission: submission(session.id, "recipe-1", ["ingredient-a", "ingredient-i"]),
        });

        expect(result.isCorrect).toBe(false);
        expect(result.session.score).toBe(0);
    });

    it("does not accept the full recipe set as the smaller challenge target", async () => {
        const recipe = makeRecipe("recipe-1");
        const session = makeSession("session-1", "user-1", [recipe.id]);
        const { service } = createRecipeBuilderService({ recipes: [recipe], sessions: [session] });

        const result = await service.submitRecipeBuilderAnswer({
            userId: "user-1",
            submission: submission(session.id, recipe.id, recipe.ingredients.map((ingredient) => ingredient.id)),
        });

        expect(result.isCorrect).toBe(false);
        expect(result.session.score).toBe(0);
    });

    it("does not allow a client score to influence the result", async () => {
        const session = makeSession("session-1", "user-1", ["recipe-1"]);
        const { service } = createRecipeBuilderService({ sessions: [session] });
        const untrustedSubmission = { ...submission(session.id), clientScore: 9999 };

        const result = await service.submitRecipeBuilderAnswer({ userId: "user-1", submission: untrustedSubmission });

        expect(result.session.score).toBe(10);
    });

    it("does not allow client correctness to influence the result", async () => {
        const session = makeSession("session-1", "user-1", ["recipe-1"]);
        const { service } = createRecipeBuilderService({ sessions: [session] });
        const untrustedSubmission = {
            ...submission(session.id, "recipe-1", ["ingredient-a", "ingredient-i"]),
            isCorrect: true,
        };

        const result = await service.submitRecipeBuilderAnswer({ userId: "user-1", submission: untrustedSubmission });

        expect(result.isCorrect).toBe(false);
        expect(result.session.score).toBe(0);
    });

    it("rejects malformed ingredient submissions", async () => {
        const session = makeSession("session-1", "user-1", ["recipe-1"]);
        const { service } = createRecipeBuilderService({ sessions: [session] });

        await expect(service.submitRecipeBuilderAnswer({
            userId: "user-1",
            submission: { ...submission(session.id), selectedIngredientIds: [] },
        })).rejects.toMatchObject({ code: "INVALID_SUBMISSION" });
        expect(parseRecipeBuilderSubmission({ ...submission(session.id), selectedIngredientIds: ["ingredient-a", "ingredient-a"] })).toBeNull();
        expect(parseRecipeBuilderSubmission({ ...submission(session.id), selectedIngredientIds: [4] })).toBeNull();
    });

    it("rejects duplicate submissions for a recipe", async () => {
        const session = makeSession("session-1", "user-1", ["recipe-1", "recipe-2"]);
        const { service } = createRecipeBuilderService({ sessions: [session] });
        await service.submitRecipeBuilderAnswer({ userId: "user-1", submission: submission(session.id) });

        await expect(service.submitRecipeBuilderAnswer({ userId: "user-1", submission: submission(session.id) }))
            .rejects.toMatchObject({ code: "DUPLICATE_ATTEMPT" });
    });

    it("rejects submissions for completed sessions", async () => {
        const session = makeSession("session-1", "user-1", ["recipe-1"], { status: "completed" });
        const { service } = createRecipeBuilderService({ sessions: [session] });

        await expect(service.submitRecipeBuilderAnswer({ userId: "user-1", submission: submission(session.id) }))
            .rejects.toMatchObject({ code: "SESSION_COMPLETED" });
    });

    it("rejects another user's session", async () => {
        const session = makeSession("session-1", "user-2", ["recipe-1"]);
        const { service } = createRecipeBuilderService({ sessions: [session] });

        await expect(service.submitRecipeBuilderAnswer({ userId: "user-1", submission: submission(session.id) }))
            .rejects.toMatchObject({ code: "SESSION_NOT_OWNED_BY_USER" });
    });

    it("rejects unauthenticated session creation", async () => {
        const { service } = createRecipeBuilderService();

        await expect(service.createRecipeBuilderSession({ userId: "" }))
            .rejects.toMatchObject({ code: "UNAUTHENTICATED_USER" });
    });

    it("returns a mixed candidate DTO without answer metadata or the full recipe set", () => {
        const recipe = makeRecipe("recipe-1");
        const challenge = toRecipeBuilderChallenge(recipe, [
            { id: "ingredient-a", name: "Ingredient A" },
            { id: "ingredient-b", name: "Ingredient B" },
            { id: "ingredient-c", name: "Ingredient C" },
            { id: "ingredient-d", name: "Ingredient D" },
            { id: "ingredient-e", name: "Ingredient E" },
            { id: "ingredient-f", name: "Ingredient F" },
            { id: "ingredient-g", name: "Ingredient G" },
            { id: "ingredient-h", name: "Ingredient H" },
            { id: "ingredient-i", name: "Ingredient I" },
        ], "session-1");

        expect(challenge).not.toHaveProperty("ingredients");
        expect(challenge).not.toHaveProperty("requiredChoices");
        expect(challenge).not.toHaveProperty("answerSet");
        expect(challenge.options).toHaveLength(7);
        expect(challenge.options.every((option) => !("is_correct" in option) && !("isRequired" in option))).toBe(true);
        expect(challenge.options.filter((option) => recipe.ingredients.some((ingredient) => ingredient.id === option.id))).toHaveLength(3);
        expect(challenge.options.map((option) => option.id)).not.toEqual(recipe.ingredients.map((ingredient) => ingredient.id));
        expect(new Set(challenge.options.filter((option) => recipe.ingredients.some((ingredient) => ingredient.id === option.id)).map((option) => option.id)))
            .toEqual(new Set(getRecipeBuilderRequiredIngredientIds(recipe, "session-1")));
    });
});
