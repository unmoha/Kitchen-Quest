import { describe, expect, it } from "vitest";
import { getGameModeDefinition } from "../game-engine/modes";
import { GameSessionService } from "../game-engine/service";
import type {
    CookingOrderRecipeRecord,
    GameAttemptRecord,
    GameModeName,
    GameSessionRecord,
    RecipeBuilderIngredientChoice,
} from "../game-engine/types";
import { parseCookingOrderSubmission, toCookingOrderChallenge } from "./challenges";

const makeRecipe = (id: string, overrides: Partial<CookingOrderRecipeRecord> = {}): CookingOrderRecipeRecord => ({
    id,
    title: `Recipe ${id}`,
    description: "A recipe with ordered cooking steps.",
    status: "published",
    steps: [
        { id: `${id}-step-1`, recipe_id: id, step_number: 1, instruction: "Prepare the first ingredient.", time_minutes: 2, educational_note: "Note one." },
        { id: `${id}-step-2`, recipe_id: id, step_number: 2, instruction: "Cook the prepared ingredients.", time_minutes: 5, educational_note: "Note two." },
        { id: `${id}-step-3`, recipe_id: id, step_number: 3, instruction: "Add the remaining ingredients.", time_minutes: 3, educational_note: "Note three." },
        { id: `${id}-step-4`, recipe_id: id, step_number: 4, instruction: "Finish and serve the dish.", time_minutes: 1, educational_note: "Note four." },
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
    game_mode: "cooking_order",
    status: "active",
    started_at: "2026-01-01T00:00:00.000Z",
    completed_at: null,
    score: 0,
    challenge_recipe_ids: challengeRecipeIds,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
});

function createCookingOrderService(options: {
    recipes?: CookingOrderRecipeRecord[];
    sessions?: GameSessionRecord[];
    attempts?: GameAttemptRecord[];
    userId?: string;
} = {}) {
    const recipes = options.recipes ?? [makeRecipe("recipe-1"), makeRecipe("recipe-2"), makeRecipe("recipe-3"), makeRecipe("recipe-4")];
    const sessions = options.sessions ?? [];
    const attempts = options.attempts ?? [];
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
            return { recipes: [], ingredients: [] as RecipeBuilderIngredientChoice[] };
        },
        async getRecipeBuilderRecipeById() {
            return null;
        },
        async listPublishedIngredientsByIds() {
            return [];
        },
        async countAttemptsForRecipe(sessionId: string, recipeId: string) {
            return attempts.filter((attempt) => attempt.session_id === sessionId && attempt.recipe_id === recipeId).length;
        },
        async listCookingOrderCatalog() {
            return recipes;
        },
        async getCookingOrderRecipeById(recipeId: string) {
            return recipes.find((recipe) => recipe.id === recipeId) ?? null;
        },
    };

    return { service: new GameSessionService(persistence, userId), sessions, attempts };
}

const orderedSubmission = (sessionId: string, recipeId = "recipe-1", orderedStepIds = [1, 2, 3, 4].map((number) => `${recipeId}-step-${number}`)) => ({
    sessionId,
    recipeId,
    orderedStepIds,
});

describe("Cooking Order", () => {
    it("creates an assigned three-recipe Cooking Order session", async () => {
        const { service } = createCookingOrderService();

        const result = await service.createCookingOrderSession({ userId: "user-1" });

        expect(result.session.game_mode).toBe("cooking_order");
        expect(result.session.challenge_recipe_ids).toHaveLength(3);
        expect(result.recipes.map((recipe) => recipe.id)).toEqual(result.session.challenge_recipe_ids);
    });

    it("accepts an order matching the authoritative step numbers", async () => {
        const recipe = makeRecipe("recipe-1");
        const session = makeSession("session-1", "user-1", [recipe.id]);
        const { service } = createCookingOrderService({ recipes: [recipe], sessions: [session] });

        const result = await service.submitCookingOrderAnswer({ userId: "user-1", submission: orderedSubmission(session.id) });

        expect(result.isCorrect).toBe(true);
        expect(result.session.score).toBe(10);
        expect(result.attempt.selected_recipe_step_ids).toEqual(orderedSubmission(session.id).orderedStepIds);
    });

    it("marks a complete but incorrectly ordered set incorrect", async () => {
        const session = makeSession("session-1", "user-1", ["recipe-1"]);
        const { service } = createCookingOrderService({ sessions: [session] });
        const incorrectOrder = ["recipe-1-step-2", "recipe-1-step-1", "recipe-1-step-3", "recipe-1-step-4"];

        const result = await service.submitCookingOrderAnswer({
            userId: "user-1",
            submission: orderedSubmission(session.id, "recipe-1", incorrectOrder),
        });

        expect(result.isCorrect).toBe(false);
        expect(result.session.score).toBe(0);
    });

    it("rejects unknown step IDs", async () => {
        const session = makeSession("session-1", "user-1", ["recipe-1"]);
        const { service } = createCookingOrderService({ sessions: [session] });

        await expect(service.submitCookingOrderAnswer({
            userId: "user-1",
            submission: orderedSubmission(session.id, "recipe-1", ["missing-step", "recipe-1-step-2", "recipe-1-step-3", "recipe-1-step-4"]),
        })).rejects.toMatchObject({ code: "INVALID_STEP" });
    });

    it("rejects a step belonging to another recipe", async () => {
        const session = makeSession("session-1", "user-1", ["recipe-1", "recipe-2"]);
        const { service } = createCookingOrderService({ sessions: [session] });

        await expect(service.submitCookingOrderAnswer({
            userId: "user-1",
            submission: orderedSubmission(session.id, "recipe-1", ["recipe-2-step-1", "recipe-1-step-2", "recipe-1-step-3", "recipe-1-step-4"]),
        })).rejects.toMatchObject({ code: "INVALID_STEP" });
    });

    it("rejects duplicate step IDs", async () => {
        const session = makeSession("session-1", "user-1", ["recipe-1"]);
        const { service } = createCookingOrderService({ sessions: [session] });

        await expect(service.submitCookingOrderAnswer({
            userId: "user-1",
            submission: orderedSubmission(session.id, "recipe-1", ["recipe-1-step-1", "recipe-1-step-1", "recipe-1-step-3", "recipe-1-step-4"]),
        })).rejects.toMatchObject({ code: "INVALID_SUBMISSION" });
    });

    it("rejects a submission missing a required step", async () => {
        const session = makeSession("session-1", "user-1", ["recipe-1"]);
        const { service } = createCookingOrderService({ sessions: [session] });

        await expect(service.submitCookingOrderAnswer({
            userId: "user-1",
            submission: orderedSubmission(session.id, "recipe-1", ["recipe-1-step-1", "recipe-1-step-2", "recipe-1-step-3"]),
        })).rejects.toMatchObject({ code: "INVALID_SUBMISSION" });
    });

    it("rejects a recipe not assigned to the session", async () => {
        const session = makeSession("session-1", "user-1", ["recipe-1"]);
        const { service } = createCookingOrderService({ sessions: [session] });

        await expect(service.submitCookingOrderAnswer({
            userId: "user-1",
            submission: orderedSubmission(session.id, "recipe-2"),
        })).rejects.toMatchObject({ code: "INVALID_QUESTION" });
    });

    it("rejects an unpublished recipe", async () => {
        const recipe = makeRecipe("recipe-1", { status: "draft" });
        const session = makeSession("session-1", "user-1", [recipe.id]);
        const { service } = createCookingOrderService({ recipes: [recipe], sessions: [session] });

        await expect(service.submitCookingOrderAnswer({ userId: "user-1", submission: orderedSubmission(session.id) }))
            .rejects.toMatchObject({ code: "INVALID_QUESTION" });
    });

    it("rejects duplicate submission of a recipe round", async () => {
        const session = makeSession("session-1", "user-1", ["recipe-1", "recipe-2"]);
        const { service } = createCookingOrderService({ sessions: [session] });
        await service.submitCookingOrderAnswer({ userId: "user-1", submission: orderedSubmission(session.id) });

        await expect(service.submitCookingOrderAnswer({ userId: "user-1", submission: orderedSubmission(session.id) }))
            .rejects.toMatchObject({ code: "DUPLICATE_ATTEMPT" });
    });

    it("ignores forged client score and correctness", async () => {
        const session = makeSession("session-1", "user-1", ["recipe-1"]);
        const { service } = createCookingOrderService({ sessions: [session] });
        const forgedSubmission = { ...orderedSubmission(session.id), clientScore: 9999, isCorrect: false };

        const result = await service.submitCookingOrderAnswer({ userId: "user-1", submission: forgedSubmission });

        expect(result.isCorrect).toBe(true);
        expect(result.session.score).toBe(10);
    });

    it("rejects another user's session", async () => {
        const session = makeSession("session-1", "user-2", ["recipe-1"]);
        const { service } = createCookingOrderService({ sessions: [session] });

        await expect(service.submitCookingOrderAnswer({ userId: "user-1", submission: orderedSubmission(session.id) }))
            .rejects.toMatchObject({ code: "SESSION_NOT_OWNED_BY_USER" });
    });

    it.each(["completed", "abandoned"] as const)("rejects a %s session", async (status) => {
        const session = makeSession("session-1", "user-1", ["recipe-1"], { status });
        const { service } = createCookingOrderService({ sessions: [session] });

        await expect(service.submitCookingOrderAnswer({ userId: "user-1", submission: orderedSubmission(session.id) }))
            .rejects.toMatchObject({ code: status === "completed" ? "SESSION_COMPLETED" : "SESSION_ABANDONED" });
    });

    it("returns scrambled step choices without authoritative order metadata", () => {
        const recipe = makeRecipe("recipe-1");
        const challenge = toCookingOrderChallenge(recipe, () => 0);

        expect(challenge).not.toHaveProperty("correctOrder");
        expect(challenge).not.toHaveProperty("orderedStepIds");
        expect(challenge.steps).toHaveLength(recipe.steps.length);
        expect(challenge.steps.every((step) => !("step_number" in step) && !("time_minutes" in step) && !("educational_note" in step))).toBe(true);
        expect(challenge.steps.map((step) => step.id)).not.toEqual(recipe.steps.map((step) => step.id));
    });

    it("strips forged result metadata while parsing client submissions", () => {
        const parsed = parseCookingOrderSubmission({ ...orderedSubmission("session-1"), score: 500, is_correct: true });

        expect(parsed).toEqual(orderedSubmission("session-1"));
    });

    it("performs authoritative server-side order comparison", () => {
        const recipe = makeRecipe("recipe-1");
        const definition = getGameModeDefinition("cooking_order");

        const correctIds = ["recipe-1-step-1", "recipe-1-step-2", "recipe-1-step-3", "recipe-1-step-4"];
        const invertedIds = ["recipe-1-step-4", "recipe-1-step-3", "recipe-1-step-2", "recipe-1-step-1"];

        expect(definition.evaluateCookingOrderAnswer?.(recipe, correctIds)).toBe(true);
        expect(definition.evaluateCookingOrderAnswer?.(recipe, invertedIds)).toBe(false);
    });
});
