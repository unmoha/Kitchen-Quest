import { describe, expect, it } from "vitest";
import { getGameModeDefinition } from "../game-engine/modes";
import { GameSessionService } from "../game-engine/service";
import type {
    CookingOrderRecipeRecord,
    GameAttemptRecord,
    GameModeName,
    GameSessionRecord,
    QuestionRecord,
    RecipeBuilderIngredientChoice,
    RecipeBuilderRecipeRecord,
} from "../game-engine/types";
import {
    chooseFoodDetectiveClues,
    parseFoodDetectiveSubmission,
    sanitizeFoodDetectiveClue,
} from "./clues";

const makeQuestion = (
    id: string,
    correctOptionId: string,
    overrides: Partial<QuestionRecord> = {},
): QuestionRecord => ({
    id,
    slug: `question-${id}`,
    learning_module_id: `module-${id}`,
    learning_module_category: "techniques",
    learning_module_status: "published",
    question_text: "What culinary reaction or technique explains this kitchen observation?",
    question_type: "multiple_choice",
    explanation: "This is the culinary science technique explanation.",
    difficulty: "intermediate",
    status: "published",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    options: [
        { id: "opt-wrong", question_id: id, option_text: "Incorrect culinary deduction", option_order: 1, is_correct: false },
        { id: correctOptionId, question_id: id, option_text: "Correct culinary deduction", option_order: 2, is_correct: true },
    ],
    ...overrides,
});

const makeSession = (
    id: string,
    userId: string,
    overrides: Partial<GameSessionRecord> = {},
): GameSessionRecord => ({
    id,
    user_id: userId,
    game_mode: "food_detective",
    status: "active",
    started_at: "2026-01-01T00:00:00.000Z",
    completed_at: null,
    score: 0,
    challenge_recipe_ids: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
});

function createFoodDetectiveService(options: {
    sessions?: GameSessionRecord[];
    questions?: QuestionRecord[];
    attempts?: GameAttemptRecord[];
    userId?: string;
} = {}) {
    const sessions = options.sessions ?? [];
    const questions = options.questions ?? [
        makeQuestion("fd-q1", "opt-fd1-correct"),
        makeQuestion("fd-q2", "opt-fd2-correct"),
        makeQuestion("fd-q3", "opt-fd3-correct"),
        makeQuestion("fd-q4", "opt-fd4-correct"),
    ];
    const attempts = options.attempts ?? [];
    const userId = options.userId ?? "user-1";

    const persistence = {
        async createSession(input: { userId: string; gameMode: GameModeName; challengeRecipeIds?: string[] }) {
            const session = makeSession(`session-${sessions.length + 1}`, input.userId, {
                game_mode: input.gameMode,
                challenge_recipe_ids: input.challengeRecipeIds ?? [],
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
        async getQuestionById(questionId: string) {
            return questions.find((question) => question.id === questionId) ?? null;
        },
        async getQuestionOptions(questionId: string) {
            return questions.find((question) => question.id === questionId)?.options ?? [];
        },
        async listQuestionsForMode(gameMode: GameModeName) {
            const definition = getGameModeDefinition(gameMode);
            return questions.filter((question) => definition.allowQuestionSelection(question));
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
        async countAttemptsForQuestion(sessionId: string, questionId: string) {
            return attempts.filter((attempt) => attempt.session_id === sessionId && attempt.question_id === questionId).length;
        },
        async listRecipeBuilderCatalog() {
            return { recipes: [] as RecipeBuilderRecipeRecord[], ingredients: [] as RecipeBuilderIngredientChoice[] };
        },
        async getRecipeBuilderRecipeById() {
            return null;
        },
        async listPublishedIngredientsByIds() {
            return [];
        },
        async countAttemptsForRecipe() {
            return 0;
        },
        async listCookingOrderCatalog() {
            return [] as CookingOrderRecipeRecord[];
        },
        async getCookingOrderRecipeById() {
            return null;
        },
    };

    return { service: new GameSessionService(persistence, userId), sessions, attempts, questions };
}

describe("Food Detective", () => {
    // 1. valid correct answer
    it("accepts a valid correct deduction and updates server score", async () => {
        const question = makeQuestion("q-tech-1", "opt-tech-1");
        const session = makeSession("session-1", "user-1");
        const { service } = createFoodDetectiveService({ sessions: [session], questions: [question] });

        const result = await service.submitAnswer({
            userId: "user-1",
            sessionId: "session-1",
            questionId: "q-tech-1",
            selectedOptionId: "opt-tech-1",
        });

        expect(result.isCorrect).toBe(true);
        expect(result.scoreDelta).toBe(10);
        expect(result.session.score).toBe(10);
        expect(result.attempt.is_correct).toBe(true);
        expect(result.attempt.selected_option_id).toBe("opt-tech-1");
    });

    // 2. valid incorrect answer
    it("evaluates a valid incorrect deduction with 0 score delta", async () => {
        const question = makeQuestion("q-tech-2", "opt-tech-2");
        const session = makeSession("session-2", "user-1");
        const { service } = createFoodDetectiveService({ sessions: [session], questions: [question] });

        const result = await service.submitAnswer({
            userId: "user-1",
            sessionId: "session-2",
            questionId: "q-tech-2",
            selectedOptionId: "opt-wrong",
        });

        expect(result.isCorrect).toBe(false);
        expect(result.scoreDelta).toBe(0);
        expect(result.session.score).toBe(0);
        expect(result.attempt.is_correct).toBe(false);
    });

    // 3. unknown question
    it("rejects an unknown question ID", async () => {
        const session = makeSession("session-3", "user-1");
        const { service } = createFoodDetectiveService({ sessions: [session] });

        await expect(service.submitAnswer({
            userId: "user-1",
            sessionId: "session-3",
            questionId: "missing-question-id",
            selectedOptionId: "opt-1",
        })).rejects.toMatchObject({ code: "INVALID_QUESTION" });
    });

    // 4. unpublished question
    it("rejects an unpublished clue question", async () => {
        const question = makeQuestion("q-draft", "opt-draft-tech", { status: "draft" });
        const session = makeSession("session-4", "user-1");
        const { service } = createFoodDetectiveService({ sessions: [session], questions: [question] });

        await expect(service.submitAnswer({
            userId: "user-1",
            sessionId: "session-4",
            questionId: "q-draft",
            selectedOptionId: "opt-draft-tech",
        })).rejects.toMatchObject({ code: "INVALID_QUESTION" });
    });

    // 5. question not eligible for Food Detective
    it("rejects questions not eligible for Food Detective", async () => {
        const nonTechniquesQuestion = makeQuestion("q-non-techniques", "opt-tech", {
            learning_module_category: "ingredients",
        });
        const unpublishedModuleQuestion = makeQuestion("q-draft-module", "opt-tech", {
            learning_module_status: "draft",
        });
        const session = makeSession("session-5", "user-1");
        const { service } = createFoodDetectiveService({
            sessions: [session],
            questions: [nonTechniquesQuestion, unpublishedModuleQuestion],
        });

        await expect(service.submitAnswer({
            userId: "user-1",
            sessionId: "session-5",
            questionId: "q-non-techniques",
            selectedOptionId: "opt-tech",
        })).rejects.toMatchObject({ code: "INVALID_QUESTION" });

        await expect(service.submitAnswer({
            userId: "user-1",
            sessionId: "session-5",
            questionId: "q-draft-module",
            selectedOptionId: "opt-tech",
        })).rejects.toMatchObject({ code: "INVALID_QUESTION" });
    });

    // 6. unknown option
    it("rejects an unknown option ID", async () => {
        const question = makeQuestion("q-option-test", "opt-tech");
        const session = makeSession("session-6", "user-1");
        const { service } = createFoodDetectiveService({ sessions: [session], questions: [question] });

        await expect(service.submitAnswer({
            userId: "user-1",
            sessionId: "session-6",
            questionId: "q-option-test",
            selectedOptionId: "totally-unknown-option",
        })).rejects.toMatchObject({ code: "INVALID_OPTION" });
    });

    // 7. option belonging to another question
    it("rejects an option belonging to another question", async () => {
        const questionA = makeQuestion("q-a", "opt-a-tech");
        const questionB = makeQuestion("q-b", "opt-b-tech");
        const session = makeSession("session-7", "user-1");
        const { service } = createFoodDetectiveService({
            sessions: [session],
            questions: [questionA, questionB],
        });

        await expect(service.submitAnswer({
            userId: "user-1",
            sessionId: "session-7",
            questionId: "q-a",
            selectedOptionId: "opt-b-tech",
        })).rejects.toMatchObject({ code: "INVALID_OPTION" });
    });

    // 8. option question mismatch
    it("rejects an option when option metadata mismatches the question ID", async () => {
        const questionWithMismatchedOption = makeQuestion("q-mismatch", "opt-tech", {
            options: [
                { id: "opt-wrong-owner", question_id: "other-question-id", option_text: "Wrong owner", option_order: 1, is_correct: true },
            ],
        });
        const session = makeSession("session-mismatch", "user-1");
        const { service } = createFoodDetectiveService({
            sessions: [session],
            questions: [questionWithMismatchedOption],
        });

        await expect(service.submitAnswer({
            userId: "user-1",
            sessionId: "session-mismatch",
            questionId: "q-mismatch",
            selectedOptionId: "opt-wrong-owner",
        })).rejects.toMatchObject({ code: "OPTION_QUESTION_MISMATCH" });
    });

    // 9. duplicate submission
    it("rejects duplicate submission for the same clue in a session", async () => {
        const question = makeQuestion("q-dup", "opt-dup-tech");
        const session = makeSession("session-8", "user-1");
        const { service } = createFoodDetectiveService({ sessions: [session], questions: [question] });

        await service.submitAnswer({
            userId: "user-1",
            sessionId: "session-8",
            questionId: "q-dup",
            selectedOptionId: "opt-dup-tech",
        });

        await expect(service.submitAnswer({
            userId: "user-1",
            sessionId: "session-8",
            questionId: "q-dup",
            selectedOptionId: "opt-dup-tech",
        })).rejects.toMatchObject({ code: "DUPLICATE_ATTEMPT" });
    });

    // 10. cross-user session
    it("rejects deduction submission to a session owned by another user", async () => {
        const question = makeQuestion("q-cross", "opt-cross-tech");
        const session = makeSession("session-9", "user-owner");
        const { service } = createFoodDetectiveService({ sessions: [session], questions: [question] });

        await expect(service.submitAnswer({
            userId: "user-attacker",
            sessionId: "session-9",
            questionId: "q-cross",
            selectedOptionId: "opt-cross-tech",
        })).rejects.toMatchObject({ code: "SESSION_NOT_OWNED_BY_USER" });
    });

    // 11. completed session
    it("rejects deductions submitted to completed sessions", async () => {
        const question = makeQuestion("q-done", "opt-done-tech");
        const session = makeSession("session-10", "user-1", { status: "completed" });
        const { service } = createFoodDetectiveService({ sessions: [session], questions: [question] });

        await expect(service.submitAnswer({
            userId: "user-1",
            sessionId: "session-10",
            questionId: "q-done",
            selectedOptionId: "opt-done-tech",
        })).rejects.toMatchObject({ code: "SESSION_COMPLETED" });
    });

    // 12. abandoned session
    it("rejects deductions submitted to abandoned sessions", async () => {
        const question = makeQuestion("q-abandon", "opt-abandon-tech");
        const session = makeSession("session-11", "user-1", { status: "abandoned" });
        const { service } = createFoodDetectiveService({ sessions: [session], questions: [question] });

        await expect(service.submitAnswer({
            userId: "user-1",
            sessionId: "session-11",
            questionId: "q-abandon",
            selectedOptionId: "opt-abandon-tech",
        })).rejects.toMatchObject({ code: "SESSION_ABANDONED" });
    });

    // 13. unauthenticated request
    it("rejects unauthenticated requests", async () => {
        const question = makeQuestion("q-unauth", "opt-unauth-tech");
        const session = makeSession("session-12", "user-1");
        const { service } = createFoodDetectiveService({ sessions: [session], questions: [question] });

        await expect(service.submitAnswer({
            userId: "",
            sessionId: "session-12",
            questionId: "q-unauth",
            selectedOptionId: "opt-unauth-tech",
        })).rejects.toMatchObject({ code: "UNAUTHENTICATED_USER" });

        await expect(service.createFoodDetectiveSession({ userId: "" }))
            .rejects.toMatchObject({ code: "UNAUTHENTICATED_USER" });
    });

    // 14. forged client score ignored
    it("ignores forged client score values", async () => {
        const question = makeQuestion("q-forge-score", "opt-forge-tech");
        const session = makeSession("session-13", "user-1");
        const { service } = createFoodDetectiveService({ sessions: [session], questions: [question] });

        const result = await service.submitAnswer({
            userId: "user-1",
            sessionId: "session-13",
            questionId: "q-forge-score",
            selectedOptionId: "opt-forge-tech",
            clientScore: 999999,
        });

        expect(result.session.score).toBe(10);
    });

    // 15. forged client correctness ignored
    it("ignores forged client correctness flags", async () => {
        const question = makeQuestion("q-forge-corr", "opt-forge-tech");
        const session = makeSession("session-14", "user-1");
        const { service } = createFoodDetectiveService({ sessions: [session], questions: [question] });

        const wrongResult = await service.submitAnswer({
            userId: "user-1",
            sessionId: "session-14",
            questionId: "q-forge-corr",
            selectedOptionId: "opt-wrong",
            clientIsCorrect: true,
        });

        expect(wrongResult.isCorrect).toBe(false);
        expect(wrongResult.session.score).toBe(0);
    });

    // 16. DTO does not expose answer key or explanation
    it("sanitizes clue DTO without exposing answer key, correctness, or explanation", () => {
        const question = makeQuestion("q-dto", "opt-tech");
        const clue = sanitizeFoodDetectiveClue(question, () => 0);

        expect(clue).not.toHaveProperty("explanation");
        expect(clue).not.toHaveProperty("correctOptionId");
        expect(clue).not.toHaveProperty("is_correct");
        expect(clue.options).toHaveLength(2);
        for (const option of clue.options) {
            expect(option).not.toHaveProperty("is_correct");
            expect(option).not.toHaveProperty("isCorrect");
        }
    });

    // 17. server determines correctness independently
    it("evaluates correctness strictly from authoritative database data", () => {
        const definition = getGameModeDefinition("food_detective");
        const question = makeQuestion("q-auth", "opt-tech");

        expect(definition.evaluateCorrectness(question, "opt-tech")).toBe(true);
        expect(definition.evaluateCorrectness(question, "opt-wrong")).toBe(false);
        expect(definition.evaluateCorrectness(question, "opt-nonexistent")).toBe(false);
    });

    // 18. malformed submission rejected
    it("rejects malformed submission payloads during parsing", () => {
        expect(parseFoodDetectiveSubmission(null)).toBeNull();
        expect(parseFoodDetectiveSubmission(undefined)).toBeNull();
        expect(parseFoodDetectiveSubmission("not-an-object")).toBeNull();
        expect(parseFoodDetectiveSubmission({})).toBeNull();
        expect(parseFoodDetectiveSubmission({ sessionId: "s1" })).toBeNull();
        expect(parseFoodDetectiveSubmission({ sessionId: "s1", questionId: "q1" })).toBeNull();
        expect(parseFoodDetectiveSubmission({ sessionId: "", questionId: "q1", selectedOptionId: "o1" })).toBeNull();
        expect(parseFoodDetectiveSubmission({ sessionId: "s1", questionId: "", selectedOptionId: "o1" })).toBeNull();
        expect(parseFoodDetectiveSubmission({ sessionId: "s1", questionId: "q1", selectedOptionId: "" })).toBeNull();
        expect(parseFoodDetectiveSubmission({
            sessionId: "s1",
            questionId: "q1",
            selectedOptionId: "o1",
            responseTimeMs: -100,
        })).toBeNull();
        expect(parseFoodDetectiveSubmission({
            sessionId: "s1",
            questionId: "q1",
            selectedOptionId: "o1",
            responseTimeMs: Number.NaN,
        })).toBeNull();

        // Valid payload strips any extra client fields
        const valid = parseFoodDetectiveSubmission({
            sessionId: "s1",
            questionId: "q1",
            selectedOptionId: "o1",
            responseTimeMs: 1500,
            clientScore: 100,
            isCorrect: true,
        });

        expect(valid).toEqual({
            sessionId: "s1",
            questionId: "q1",
            selectedOptionId: "o1",
            responseTimeMs: 1500,
        });
    });

    // 19. mode-specific eligibility rule
    it("enforces that only published questions with published techniques modules are eligible", () => {
        const definition = getGameModeDefinition("food_detective");

        // Eligible
        expect(definition.allowQuestionSelection(makeQuestion("q1", "opt-1", {
            status: "published",
            learning_module_status: "published",
            learning_module_category: "techniques",
        }))).toBe(true);

        // Ineligible: status draft
        expect(definition.allowQuestionSelection(makeQuestion("q2", "opt-2", {
            status: "draft",
            learning_module_status: "published",
            learning_module_category: "techniques",
        }))).toBe(false);

        // Ineligible: module status draft
        expect(definition.allowQuestionSelection(makeQuestion("q3", "opt-3", {
            status: "published",
            learning_module_status: "draft",
            learning_module_category: "techniques",
        }))).toBe(false);

        // Ineligible categories
        const otherCategories = ["ingredients", "food_safety", "tools", "nutrition", "world_cuisine"] as const;
        for (const category of otherCategories) {
            expect(definition.allowQuestionSelection(makeQuestion(`q-${category}`, "opt", {
                status: "published",
                learning_module_status: "published",
                learning_module_category: category,
            }))).toBe(false);
        }
    });

    // 20. session creation and clue selection
    it("creates a Food Detective session with up to 3 culinary clues", async () => {
        const { service } = createFoodDetectiveService();

        const result = await service.createFoodDetectiveSession({ userId: "user-1" });

        expect(result.session.game_mode).toBe("food_detective");
        expect(result.session.status).toBe("active");
        expect(result.questions).toHaveLength(3);
        expect(result.questions.every((q) => q.learning_module_category === "techniques")).toBe(true);
    });

    it("throws an error when creating a session if no techniques questions are available", async () => {
        const nonTechniques = makeQuestion("q-other", "opt", { learning_module_category: "nutrition" });
        const { service } = createFoodDetectiveService({ questions: [nonTechniques] });

        await expect(service.createFoodDetectiveSession({ userId: "user-1" }))
            .rejects.toMatchObject({ code: "INVALID_QUESTION" });
    });

    it("selects clues cleanly using chooseFoodDetectiveClues", () => {
        const questions = [
            makeQuestion("q1", "opt1"),
            makeQuestion("q2", "opt2"),
            makeQuestion("q3", "opt3"),
            makeQuestion("q4", "opt4"),
        ];

        const selected = chooseFoodDetectiveClues(questions, 3);
        expect(selected).toHaveLength(3);
    });
});
