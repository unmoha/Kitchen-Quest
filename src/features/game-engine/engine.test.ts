import { describe, expect, it } from "vitest";

import {
    GameSessionService,
    type GameAttemptRecord,
    type GameModeName,
    type GameSessionRecord,
    type QuestionRecord,
} from "./service";

const makeQuestion = (questionId: string, correctOptionId: string, overrides: Partial<QuestionRecord> = {}): QuestionRecord => ({
    id: questionId,
    slug: `question-${questionId}`,
    learning_module_id: `module-${questionId}`,
    learning_module_category: "ingredients",
    learning_module_status: "published",
    question_text: "What is the correct answer?",
    question_type: "multiple_choice",
    explanation: "Reason",
    difficulty: "beginner",
    status: "published",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    options: [
        { id: "opt-1", question_id: questionId, option_text: "Wrong", option_order: 1, is_correct: false },
        { id: correctOptionId, question_id: questionId, option_text: "Right", option_order: 2, is_correct: true },
    ],
    ...overrides,
});

const makeSession = (id: string, userId: string, overrides: Partial<GameSessionRecord> = {}): GameSessionRecord => ({
    id,
    user_id: userId,
    game_mode: "ingredient_quiz",
    status: "active",
    started_at: "2026-01-01T00:00:00.000Z",
    completed_at: null,
    score: 0,
    challenge_recipe_ids: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
});

const createServiceWithData = (options: {
    sessions?: GameSessionRecord[];
    questions?: QuestionRecord[];
    attempts?: GameAttemptRecord[];
    userId?: string;
}) => {
    const sessions = options.sessions ?? [];
    const questions = options.questions ?? [];
    const attempts = options.attempts ?? [];
    const userId = options.userId ?? "user-1";

    const persistence = {
        async createSession(input: { userId: string; gameMode: GameModeName }) {
            const session = makeSession(`session-${sessions.length + 1}`, input.userId, { game_mode: input.gameMode });
            sessions.push(session);
            return session;
        },
        async getSessionById(sessionId: string) {
            return sessions.find((session) => session.id === sessionId) ?? null;
        },
        async updateSession(sessionId: string, nextSession: Partial<GameSessionRecord>) {
            const index = sessions.findIndex((session) => session.id === sessionId);
            if (index === -1) {
                return null;
            }
            sessions[index] = { ...sessions[index], ...nextSession };
            return sessions[index];
        },
        async getQuestionById(questionId: string) {
            return questions.find((question) => question.id === questionId) ?? null;
        },
        async getQuestionOptions(questionId: string) {
            return questions.find((question) => question.id === questionId)?.options ?? [];
        },
        async listQuestionsForMode() {
            return questions;
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
            const record: GameAttemptRecord = {
                id: `attempt-${attempts.length + 1}`,
                session_id: input.session_id,
                question_id: input.question_id,
                selected_option_id: input.selected_option_id,
                recipe_id: input.recipe_id,
                selected_ingredient_ids: input.selected_ingredient_ids,
                selected_recipe_step_ids: input.selected_recipe_step_ids,
                is_correct: input.is_correct,
                response_time_ms: input.response_time_ms,
                created_at: "2026-01-01T00:00:00.000Z",
            };
            attempts.push(record);
            return record;
        },
        async getAttemptsForSession(sessionId: string) {
            return attempts.filter((attempt) => attempt.session_id === sessionId);
        },
        async countAttemptsForQuestion(sessionId: string, questionId: string) {
            return attempts.filter((attempt) => attempt.session_id === sessionId && attempt.question_id === questionId).length;
        },
        async listRecipeBuilderCatalog() {
            return { recipes: [], ingredients: [] };
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
            return [];
        },
        async getCookingOrderRecipeById() {
            return null;
        },
    };

    return { service: new GameSessionService(persistence, userId), persistence };
};

describe("GameSessionService", () => {
    it("creates a valid session", async () => {
        const { service } = createServiceWithData({ userId: "user-1" });

        const session = await service.createSession({ userId: "user-1", gameMode: "ingredient_quiz" });

        expect(session.status).toBe("active");
        expect(session.user_id).toBe("user-1");
        expect(session.game_mode).toBe("ingredient_quiz");
    });

    it("rejects unauthenticated session creation", async () => {
        const { service } = createServiceWithData({ userId: "user-1" });

        await expect(service.createSession({ userId: "", gameMode: "ingredient_quiz" })).rejects.toMatchObject({
            code: "UNAUTHENTICATED_USER",
        });
    });

    it("accepts a published ingredient question with its own valid option", async () => {
        const question = makeQuestion("q-1", "opt-2");
        const session = makeSession("session-1", "user-1");
        const { service } = createServiceWithData({ userId: "user-1", sessions: [session], questions: [question] });

        const result = await service.submitAnswer({
            userId: "user-1",
            sessionId: "session-1",
            questionId: "q-1",
            selectedOptionId: "opt-2",
        });

        expect(result.isCorrect).toBe(true);
        expect(result.session.score).toBe(10);
    });

    it("rejects a published question outside the ingredients category", async () => {
        const question = makeQuestion("q-non-ingredient", "opt-correct", { learning_module_category: "techniques" });
        const session = makeSession("session-non-ingredient", "user-1");
        const { service } = createServiceWithData({ sessions: [session], questions: [question] });

        await expect(service.submitAnswer({
            userId: "user-1",
            sessionId: session.id,
            questionId: question.id,
            selectedOptionId: "opt-correct",
        })).rejects.toMatchObject({ code: "INVALID_QUESTION" });
    });

    it("rejects an unpublished ingredient question", async () => {
        const question = makeQuestion("q-unpublished", "opt-correct", { status: "draft" });
        const session = makeSession("session-unpublished", "user-1");
        const { service } = createServiceWithData({ sessions: [session], questions: [question] });

        await expect(service.submitAnswer({
            userId: "user-1",
            sessionId: session.id,
            questionId: question.id,
            selectedOptionId: "opt-correct",
        })).rejects.toMatchObject({ code: "INVALID_QUESTION" });
    });

    it("rejects a question linked to an unpublished ingredient module", async () => {
        const question = makeQuestion("q-unpublished-module", "opt-correct", { learning_module_status: "draft" });
        const session = makeSession("session-unpublished-module", "user-1");
        const { service } = createServiceWithData({ sessions: [session], questions: [question] });

        await expect(service.submitAnswer({
            userId: "user-1",
            sessionId: session.id,
            questionId: question.id,
            selectedOptionId: "opt-correct",
        })).rejects.toMatchObject({ code: "INVALID_QUESTION" });
    });

    it("rejects an unknown question", async () => {
        const session = makeSession("session-invalid-question", "user-1");
        const { service } = createServiceWithData({ sessions: [session] });

        await expect(service.submitAnswer({
            userId: "user-1",
            sessionId: session.id,
            questionId: "missing-question",
            selectedOptionId: "missing-option",
        })).rejects.toMatchObject({ code: "INVALID_QUESTION" });
    });

    it("rejects an option that belongs to a different question", async () => {
        const question = makeQuestion("q-option-owner", "opt-owner-correct");
        const otherQuestion = makeQuestion("q-other-owner", "opt-other-correct");
        const session = makeSession("session-option-owner", "user-1");
        const { service } = createServiceWithData({ sessions: [session], questions: [question, otherQuestion] });

        await expect(service.submitAnswer({
            userId: "user-1",
            sessionId: session.id,
            questionId: question.id,
            selectedOptionId: "opt-other-correct",
        })).rejects.toMatchObject({ code: "INVALID_OPTION" });
    });

    it("scores a correct answer correctly", async () => {
        const question = makeQuestion("q-2", "opt-5");
        const session = makeSession("session-2", "user-1");
        const { service } = createServiceWithData({ userId: "user-1", sessions: [session], questions: [question] });

        const result = await service.submitAnswer({
            userId: "user-1",
            sessionId: "session-2",
            questionId: "q-2",
            selectedOptionId: "opt-5",
        });

        expect(result.scoreDelta).toBe(10);
        expect(result.session.score).toBe(10);
    });

    it("scores an incorrect answer correctly", async () => {
        const question = makeQuestion("q-3", "opt-4");
        const session = makeSession("session-3", "user-1");
        const { service } = createServiceWithData({ userId: "user-1", sessions: [session], questions: [question] });

        const result = await service.submitAnswer({
            userId: "user-1",
            sessionId: "session-3",
            questionId: "q-3",
            selectedOptionId: "opt-1",
        });

        expect(result.isCorrect).toBe(false);
        expect(result.scoreDelta).toBe(0);
        expect(result.session.score).toBe(0);
    });

    it("ignores client-supplied score", async () => {
        const question = makeQuestion("q-4", "opt-2");
        const session = makeSession("session-4", "user-1");
        const { service } = createServiceWithData({ userId: "user-1", sessions: [session], questions: [question] });

        const result = await service.submitAnswer({
            userId: "user-1",
            sessionId: "session-4",
            questionId: "q-4",
            selectedOptionId: "opt-2",
            clientScore: 9999,
        });

        expect(result.session.score).toBe(10);
    });

    it("ignores client-supplied is_correct", async () => {
        const question = makeQuestion("q-5", "opt-2");
        const session = makeSession("session-5", "user-1");
        const { service } = createServiceWithData({ userId: "user-1", sessions: [session], questions: [question] });

        const result = await service.submitAnswer({
            userId: "user-1",
            sessionId: "session-5",
            questionId: "q-5",
            selectedOptionId: "opt-1",
            clientIsCorrect: true,
        });

        expect(result.isCorrect).toBe(false);
    });

    it("rejects another user's session", async () => {
        const question = makeQuestion("q-6", "opt-2");
        const session = makeSession("session-6", "user-2");
        const { service } = createServiceWithData({ userId: "user-1", sessions: [session], questions: [question] });

        await expect(service.submitAnswer({
            userId: "user-1",
            sessionId: "session-6",
            questionId: "q-6",
            selectedOptionId: "opt-2",
        })).rejects.toMatchObject({ code: "SESSION_NOT_OWNED_BY_USER" });
    });

    it("rejects invalid option/question combination", async () => {
        const question = makeQuestion("q-7", "opt-2");
        const session = makeSession("session-7", "user-1");
        const { service } = createServiceWithData({ userId: "user-1", sessions: [session], questions: [question] });

        await expect(service.submitAnswer({
            userId: "user-1",
            sessionId: "session-7",
            questionId: "q-7",
            selectedOptionId: "opt-999",
        })).rejects.toMatchObject({ code: "INVALID_OPTION" });
    });

    it("rejects duplicate question submission", async () => {
        const question = makeQuestion("q-8", "opt-2");
        const session = makeSession("session-8", "user-1");
        const { service } = createServiceWithData({ userId: "user-1", sessions: [session], questions: [question] });

        await service.submitAnswer({
            userId: "user-1",
            sessionId: "session-8",
            questionId: "q-8",
            selectedOptionId: "opt-2",
        });

        await expect(service.submitAnswer({
            userId: "user-1",
            sessionId: "session-8",
            questionId: "q-8",
            selectedOptionId: "opt-2",
        })).rejects.toMatchObject({ code: "DUPLICATE_ATTEMPT" });
    });

    it("rejects answers submitted to completed sessions", async () => {
        const question = makeQuestion("q-9", "opt-2");
        const session = makeSession("session-9", "user-1", { status: "completed", completed_at: "2026-01-02T00:00:00.000Z" });
        const { service } = createServiceWithData({ userId: "user-1", sessions: [session], questions: [question] });

        await expect(service.submitAnswer({
            userId: "user-1",
            sessionId: "session-9",
            questionId: "q-9",
            selectedOptionId: "opt-2",
        })).rejects.toMatchObject({ code: "SESSION_COMPLETED" });
    });

    it("rejects answers submitted to abandoned sessions", async () => {
        const question = makeQuestion("q-10", "opt-2");
        const session = makeSession("session-10", "user-1", { status: "abandoned" });
        const { service } = createServiceWithData({ userId: "user-1", sessions: [session], questions: [question] });

        await expect(service.submitAnswer({
            userId: "user-1",
            sessionId: "session-10",
            questionId: "q-10",
            selectedOptionId: "opt-2",
        })).rejects.toMatchObject({ code: "SESSION_ABANDONED" });
    });

    it("completes a valid session", async () => {
        const session = makeSession("session-11", "user-1");
        const { service } = createServiceWithData({ userId: "user-1", sessions: [session] });

        const result = await service.completeSession({
            userId: "user-1",
            sessionId: "session-11",
        });

        expect(result.status).toBe("completed");
        expect(result.completed_at).not.toBeNull();
    });

    it("rejects invalid session transition", async () => {
        const session = makeSession("session-12", "user-1", { status: "completed" });
        const { service } = createServiceWithData({ userId: "user-1", sessions: [session] });

        await expect(service.completeSession({
            userId: "user-1",
            sessionId: "session-12",
        })).rejects.toMatchObject({ code: "INVALID_SESSION_TRANSITION" });
    });
});
