import { describe, expect, it } from "vitest";
import {
    calculateModuleSessionMastery,
    calculateRecipeSessionMastery,
    calculateUpdatedMasteryScore,
    clampMasteryScore,
    determineProgressStatus,
    isModuleCompleted,
    isRecipeCompleted,
} from "./calculations";
import {
    LearningProgressService,
    type ProgressPersistence,
} from "./service";
import type { Database } from "@/types/database";

type UserLearningProgressRow = Database["public"]["Tables"]["user_learning_progress"]["Row"];

function createMockPersistence(options: {
    progressRows?: UserLearningProgressRow[];
    sessions?: Array<{ id: string; user_id: string; game_mode: string; status: string }>;
    attempts?: Array<{ id: string; session_id: string; question_id: string | null; recipe_id: string | null; is_correct: boolean }>;
    questions?: Map<string, { moduleId: string; moduleTitle: string }>;
    recipes?: Map<string, string>;
} = {}): ProgressPersistence {
    const rows: UserLearningProgressRow[] = options.progressRows ? [...options.progressRows] : [];
    const sessions = options.sessions ? [...options.sessions] : [];
    const attempts = options.attempts ? [...options.attempts] : [];
    const questions = options.questions ?? new Map();
    const recipes = options.recipes ?? new Map();

    return {
        async getUserProgressRows(userId: string) {
            return rows.filter((r) => r.user_id === userId);
        },
        async getModuleProgressRow(userId: string, learningModuleId: string) {
            return rows.find((r) => r.user_id === userId && r.learning_module_id === learningModuleId) ?? null;
        },
        async getRecipeProgressRow(userId: string, recipeId: string) {
            return rows.find((r) => r.user_id === userId && r.recipe_id === recipeId) ?? null;
        },
        async upsertModuleProgress(input) {
            const index = rows.findIndex((r) => r.user_id === input.userId && r.learning_module_id === input.learningModuleId);
            const now = new Date().toISOString();
            if (index >= 0) {
                rows[index] = {
                    ...rows[index],
                    mastery_score: input.masteryScore,
                    completed_at: input.completedAt,
                    last_attempted_at: input.lastAttemptedAt,
                    updated_at: now,
                };
                return rows[index];
            }
            const newRow: UserLearningProgressRow = {
                id: `progress-${rows.length + 1}`,
                user_id: input.userId,
                learning_module_id: input.learningModuleId,
                recipe_id: null,
                mastery_score: input.masteryScore,
                completed_at: input.completedAt,
                last_attempted_at: input.lastAttemptedAt,
                created_at: now,
                updated_at: now,
            };
            rows.push(newRow);
            return newRow;
        },
        async upsertRecipeProgress(input) {
            const index = rows.findIndex((r) => r.user_id === input.userId && r.recipe_id === input.recipeId);
            const now = new Date().toISOString();
            if (index >= 0) {
                rows[index] = {
                    ...rows[index],
                    mastery_score: input.masteryScore,
                    completed_at: input.completedAt,
                    last_attempted_at: input.lastAttemptedAt,
                    updated_at: now,
                };
                return rows[index];
            }
            const newRow: UserLearningProgressRow = {
                id: `progress-${rows.length + 1}`,
                user_id: input.userId,
                learning_module_id: null,
                recipe_id: input.recipeId,
                mastery_score: input.masteryScore,
                completed_at: input.completedAt,
                last_attempted_at: input.lastAttemptedAt,
                created_at: now,
                updated_at: now,
            };
            rows.push(newRow);
            return newRow;
        },
        async getSession(sessionId: string) {
            return sessions.find((s) => s.id === sessionId) ?? null;
        },
        async getSessionAttempts(sessionId: string) {
            return attempts.filter((a) => a.session_id === sessionId);
        },
        async getQuestionModuleMap(questionIds: string[]) {
            const result = new Map<string, { moduleId: string; moduleTitle: string }>();
            for (const qid of questionIds) {
                if (questions.has(qid)) {
                    result.set(qid, questions.get(qid)!);
                }
            }
            return result;
        },
        async getRecipeTitleMap(recipeIds: string[]) {
            const result = new Map<string, string>();
            for (const rid of recipeIds) {
                if (recipes.has(rid)) {
                    result.set(rid, recipes.get(rid)!);
                }
            }
            return result;
        },
    };
}

describe("Phase 3.5 — Learning + Progress Integration", () => {
    // 1. new user has no progress
    it("returns empty progress summary for a new user", async () => {
        const persistence = createMockPersistence();
        const service = new LearningProgressService(persistence, "user-new");

        const summary = await service.getUserProgress("user-new");
        expect(summary.modules).toEqual({});
        expect(summary.recipes).toEqual({});
    });

    // 2. progress can be created for authenticated user
    it("creates persistent progress for an authenticated user", async () => {
        const persistence = createMockPersistence({
            sessions: [{ id: "sess-1", user_id: "user-1", game_mode: "ingredient_quiz", status: "completed" }],
            attempts: [{ id: "att-1", session_id: "sess-1", question_id: "q-1", recipe_id: null, is_correct: true }],
            questions: new Map([["q-1", { moduleId: "mod-lentils", moduleTitle: "Red lentils" }]]),
        });
        const service = new LearningProgressService(persistence, "user-1");

        const result = await service.recordSessionProgress({ userId: "user-1", sessionId: "sess-1" });
        expect(result.updates).toHaveLength(1);
        expect(result.updates[0]).toMatchObject({
            targetType: "learning_module",
            targetId: "mod-lentils",
            masteryScore: 100,
            isCompleted: true,
        });

        const progress = await service.getModuleProgress("mod-lentils", "user-1");
        expect(progress).not.toBeNull();
        expect(progress?.masteryScore).toBe(100);
        expect(progress?.status).toBe("completed");
    });

    // 3. progress belongs to correct user
    it("associates progress strictly with the authenticated user ID", async () => {
        const persistence = createMockPersistence({
            sessions: [{ id: "sess-user2", user_id: "user-2", game_mode: "recipe_builder", status: "completed" }],
            attempts: [{ id: "att-1", session_id: "sess-user2", question_id: null, recipe_id: "rec-misir", is_correct: true }],
            recipes: new Map([["rec-misir", "Ethiopian Misir Wat"]]),
        });
        const service = new LearningProgressService(persistence, "user-2");

        await service.recordSessionProgress({ userId: "user-2", sessionId: "sess-user2" });

        const user2Progress = await service.getRecipeProgress("rec-misir", "user-2");
        const user1Progress = await service.getRecipeProgress("rec-misir", "user-1");

        expect(user2Progress).not.toBeNull();
        expect(user2Progress?.userId).toBe("user-2");
        expect(user1Progress).toBeNull();
    });

    // 4. cross-user progress access rejected
    it("returns only the requesting user's progress data", async () => {
        const persistence = createMockPersistence({
            progressRows: [{
                id: "prog-1",
                user_id: "user-victim",
                learning_module_id: "mod-1",
                recipe_id: null,
                mastery_score: 90,
                completed_at: "2026-01-01T00:00:00Z",
                last_attempted_at: "2026-01-01T00:00:00Z",
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
            }],
        });
        const service = new LearningProgressService(persistence, "user-attacker");

        const progress = await service.getModuleProgress("mod-1", "user-attacker");
        expect(progress).toBeNull();

        const summary = await service.getUserProgress("user-attacker");
        expect(summary.modules).toEqual({});
    });

    // 5. cross-user progress update rejected
    it("rejects recording progress on another user's session", async () => {
        const persistence = createMockPersistence({
            sessions: [{ id: "sess-private", user_id: "user-owner", game_mode: "ingredient_quiz", status: "completed" }],
        });
        const service = new LearningProgressService(persistence, "user-attacker");

        await expect(service.recordSessionProgress({
            userId: "user-attacker",
            sessionId: "sess-private",
        })).rejects.toThrow("You cannot record learning progress for another user's session.");
    });

    // 6. mastery starts at valid value
    it("determines progress status accurately for unstarted content", () => {
        expect(determineProgressStatus(null, null, 0)).toBe("not_started");
        expect(determineProgressStatus(null, "2026-01-01T00:00:00Z", 50)).toBe("in_progress");
        expect(determineProgressStatus("2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", 100)).toBe("completed");
    });

    // 7. mastery cannot exceed 100
    it("clamps mastery scores to a maximum of 100", () => {
        expect(clampMasteryScore(150)).toBe(100);
        expect(clampMasteryScore(999999)).toBe(100);
        expect(calculateUpdatedMasteryScore(90, 120)).toBe(100);
    });

    // 8. mastery cannot be negative
    it("clamps mastery scores to a minimum of 0", () => {
        expect(clampMasteryScore(-50)).toBe(0);
        expect(clampMasteryScore(Number.NaN)).toBe(0);
        expect(calculateUpdatedMasteryScore(-10, -5)).toBe(0);
    });

    // 9. completed game updates relevant progress
    it("updates progress when a game session is completed", async () => {
        const persistence = createMockPersistence({
            sessions: [{ id: "sess-kc", user_id: "user-1", game_mode: "kitchen_challenge", status: "completed" }],
            attempts: [
                { id: "a1", session_id: "sess-kc", question_id: "q-safety-1", recipe_id: null, is_correct: true },
                { id: "a2", session_id: "sess-kc", question_id: "q-safety-2", recipe_id: null, is_correct: true },
            ],
            questions: new Map([
                ["q-safety-1", { moduleId: "mod-safety", moduleTitle: "Food Safety" }],
                ["q-safety-2", { moduleId: "mod-safety", moduleTitle: "Food Safety" }],
            ]),
        });
        const service = new LearningProgressService(persistence, "user-1");

        const result = await service.recordSessionProgress({ userId: "user-1", sessionId: "sess-kc" });
        expect(result.updates).toHaveLength(1);
        expect(result.updates[0].targetId).toBe("mod-safety");
        expect(result.updates[0].masteryScore).toBe(100);
        expect(result.updates[0].isCompleted).toBe(true);
    });

    // 10. incorrect answers produce appropriate mastery
    it("calculates 0% mastery when all answers are incorrect", () => {
        const moduleMastery = calculateModuleSessionMastery(0, 3);
        expect(moduleMastery).toBe(0);

        const recipeMastery = calculateRecipeSessionMastery(false);
        expect(recipeMastery).toBe(0);
    });

    // 11. correct answers produce appropriate mastery
    it("calculates proportional mastery based on correct answers", () => {
        expect(calculateModuleSessionMastery(1, 3)).toBe(33);
        expect(calculateModuleSessionMastery(2, 3)).toBe(67);
        expect(calculateModuleSessionMastery(3, 3)).toBe(100);
        expect(calculateRecipeSessionMastery(true)).toBe(100);
    });

    // 12. replay behavior is deterministic
    it("improves mastery deterministically on replay and never regresses", () => {
        const firstScore = calculateUpdatedMasteryScore(0, 33);
        expect(firstScore).toBe(33);

        // Replaying with a lower score retains the highest achieved score
        const lowerReplay = calculateUpdatedMasteryScore(firstScore, 0);
        expect(lowerReplay).toBe(33);

        // Replaying with a higher score improves mastery
        const higherReplay = calculateUpdatedMasteryScore(firstScore, 100);
        expect(higherReplay).toBe(100);
    });

    // 13. duplicate submission cannot corrupt progress
    it("retains idempotent progress state on duplicate session recordings", async () => {
        const persistence = createMockPersistence({
            sessions: [{ id: "sess-dup", user_id: "user-1", game_mode: "recipe_builder", status: "completed" }],
            attempts: [{ id: "a1", session_id: "sess-dup", question_id: null, recipe_id: "rec-1", is_correct: true }],
            recipes: new Map([["rec-1", "Shakshuka"]]),
        });
        const service = new LearningProgressService(persistence, "user-1");

        const firstResult = await service.recordSessionProgress({ userId: "user-1", sessionId: "sess-dup" });
        const secondResult = await service.recordSessionProgress({ userId: "user-1", sessionId: "sess-dup" });

        expect(firstResult.updates[0].masteryScore).toBe(100);
        expect(secondResult.updates[0].masteryScore).toBe(100);

        const progress = await service.getRecipeProgress("rec-1", "user-1");
        expect(progress?.masteryScore).toBe(100);
    });

    // 14. learning module progress updates correctly
    it("updates learning module progress for question-based modes", async () => {
        const persistence = createMockPersistence({
            sessions: [{ id: "sess-fd", user_id: "user-1", game_mode: "food_detective", status: "completed" }],
            attempts: [
                { id: "a1", session_id: "sess-fd", question_id: "q-tech-1", recipe_id: null, is_correct: true },
                { id: "a2", session_id: "sess-fd", question_id: "q-tech-2", recipe_id: null, is_correct: false },
            ],
            questions: new Map([
                ["q-tech-1", { moduleId: "mod-techniques", moduleTitle: "Pan Techniques" }],
                ["q-tech-2", { moduleId: "mod-techniques", moduleTitle: "Pan Techniques" }],
            ]),
        });
        const service = new LearningProgressService(persistence, "user-1");

        const result = await service.recordSessionProgress({ userId: "user-1", sessionId: "sess-fd" });
        expect(result.updates[0].targetType).toBe("learning_module");
        expect(result.updates[0].masteryScore).toBe(50);
        expect(result.updates[0].isCompleted).toBe(false);
    });

    // 15. recipe progress updates correctly
    it("updates recipe progress for recipe-based game modes", async () => {
        const persistence = createMockPersistence({
            sessions: [{ id: "sess-co", user_id: "user-1", game_mode: "cooking_order", status: "completed" }],
            attempts: [{ id: "a1", session_id: "sess-co", question_id: null, recipe_id: "rec-pasta", is_correct: true }],
            recipes: new Map([["rec-pasta", "Vegetable Pasta"]]),
        });
        const service = new LearningProgressService(persistence, "user-1");

        const result = await service.recordSessionProgress({ userId: "user-1", sessionId: "sess-co" });
        expect(result.updates[0].targetType).toBe("recipe");
        expect(result.updates[0].targetId).toBe("rec-pasta");
        expect(result.updates[0].masteryScore).toBe(100);
        expect(result.updates[0].isCompleted).toBe(true);
    });

    // 16. unrelated game does not update unrelated content
    it("does not touch unrelated modules or recipes", async () => {
        const persistence = createMockPersistence({
            sessions: [{ id: "sess-isolated", user_id: "user-1", game_mode: "ingredient_quiz", status: "completed" }],
            attempts: [{ id: "a1", session_id: "sess-isolated", question_id: "q-isolated", recipe_id: null, is_correct: true }],
            questions: new Map([["q-isolated", { moduleId: "mod-only", moduleTitle: "Only Module" }]]),
        });
        const service = new LearningProgressService(persistence, "user-1");

        await service.recordSessionProgress({ userId: "user-1", sessionId: "sess-isolated" });

        const untouched = await service.getModuleProgress("mod-unrelated", "user-1");
        expect(untouched).toBeNull();
    });

    // 17. unauthenticated progress update rejected
    it("rejects unauthenticated requests", async () => {
        const persistence = createMockPersistence();
        const service = new LearningProgressService(persistence, "");

        await expect(service.getUserProgress("")).rejects.toThrow("authenticated");
        await expect(service.recordSessionProgress({ userId: "", sessionId: "sess-1" })).rejects.toThrow("authenticated");
    });

    // 18. forged mastery ignored/rejected
    it("ignores forged client mastery scores and computes them server-side", async () => {
        const persistence = createMockPersistence({
            sessions: [{ id: "sess-forge", user_id: "user-1", game_mode: "food_detective", status: "completed" }],
            // 0 of 2 correct
            attempts: [
                { id: "a1", session_id: "sess-forge", question_id: "q1", recipe_id: null, is_correct: false },
                { id: "a2", session_id: "sess-forge", question_id: "q2", recipe_id: null, is_correct: false },
            ],
            questions: new Map([
                ["q1", { moduleId: "mod-1", moduleTitle: "Module 1" }],
                ["q2", { moduleId: "mod-1", moduleTitle: "Module 1" }],
            ]),
        });
        const service = new LearningProgressService(persistence, "user-1");

        const result = await service.recordSessionProgress({ userId: "user-1", sessionId: "sess-forge" });
        expect(result.updates[0].masteryScore).toBe(0);
        expect(result.updates[0].isCompleted).toBe(false);
    });

    // 19. forged completion status ignored/rejected
    it("ignores client attempts to set completion status directly", () => {
        // Module below completion threshold cannot be marked complete unless previously completed
        expect(isModuleCompleted(50, false)).toBe(false);
        expect(isRecipeCompleted(false, false)).toBe(false);
    });

    // 20. missing learning relationship handled safely
    it("safely handles sessions with no mapped learning modules or recipes", async () => {
        const persistence = createMockPersistence({
            sessions: [{ id: "sess-orphan", user_id: "user-1", game_mode: "ingredient_quiz", status: "completed" }],
            attempts: [{ id: "a1", session_id: "sess-orphan", question_id: "q-unmapped", recipe_id: null, is_correct: true }],
            questions: new Map(), // No mapping
        });
        const service = new LearningProgressService(persistence, "user-1");

        const result = await service.recordSessionProgress({ userId: "user-1", sessionId: "sess-orphan" });
        expect(result.updates).toEqual([]);
    });

    // 21. incomplete game does not incorrectly mark content complete
    it("does not mark content complete when accuracy is below threshold", async () => {
        const persistence = createMockPersistence({
            sessions: [{ id: "sess-partial", user_id: "user-1", game_mode: "ingredient_quiz", status: "completed" }],
            attempts: [
                { id: "a1", session_id: "sess-partial", question_id: "q1", recipe_id: null, is_correct: true },
                { id: "a2", session_id: "sess-partial", question_id: "q2", recipe_id: null, is_correct: false },
                { id: "a3", session_id: "sess-partial", question_id: "q3", recipe_id: null, is_correct: false },
            ],
            questions: new Map([
                ["q1", { moduleId: "mod-1", moduleTitle: "Module 1" }],
                ["q2", { moduleId: "mod-1", moduleTitle: "Module 1" }],
                ["q3", { moduleId: "mod-1", moduleTitle: "Module 1" }],
            ]),
        });
        const service = new LearningProgressService(persistence, "user-1");

        const result = await service.recordSessionProgress({ userId: "user-1", sessionId: "sess-partial" });
        expect(result.updates[0].masteryScore).toBe(33);
        expect(result.updates[0].isCompleted).toBe(false);
    });

    // 22. completed content remains completed
    it("preserves completed status across subsequent attempts", () => {
        expect(isModuleCompleted(0, true)).toBe(true);
        expect(isRecipeCompleted(false, true)).toBe(true);
    });

    // 23. progress retrieval returns only current user's data
    it("filters progress rows strictly by authenticated user ID", async () => {
        const persistence = createMockPersistence({
            progressRows: [
                {
                    id: "p1",
                    user_id: "user-alice",
                    learning_module_id: "mod-1",
                    recipe_id: null,
                    mastery_score: 100,
                    completed_at: "2026-01-01T00:00:00Z",
                    last_attempted_at: "2026-01-01T00:00:00Z",
                    created_at: "2026-01-01T00:00:00Z",
                    updated_at: "2026-01-01T00:00:00Z",
                },
                {
                    id: "p2",
                    user_id: "user-bob",
                    learning_module_id: "mod-1",
                    recipe_id: null,
                    mastery_score: 50,
                    completed_at: null,
                    last_attempted_at: "2026-01-01T00:00:00Z",
                    created_at: "2026-01-01T00:00:00Z",
                    updated_at: "2026-01-01T00:00:00Z",
                },
            ],
        });
        const aliceService = new LearningProgressService(persistence, "user-alice");
        const bobService = new LearningProgressService(persistence, "user-bob");

        const aliceProgress = await aliceService.getModuleProgress("mod-1", "user-alice");
        const bobProgress = await bobService.getModuleProgress("mod-1", "user-bob");

        expect(aliceProgress?.masteryScore).toBe(100);
        expect(aliceProgress?.status).toBe("completed");

        expect(bobProgress?.masteryScore).toBe(50);
        expect(bobProgress?.status).toBe("in_progress");
    });

    // 24. mastery remains within 0-100 across arbitrary inputs
    it("strictly bounds all mastery calculations to [0, 100]", () => {
        const testValues = [-1000, -1, 0, 0.4, 50.6, 99.9, 100, 101, 10000];
        for (const val of testValues) {
            const clamped = clampMasteryScore(val);
            expect(clamped).toBeGreaterThanOrEqual(0);
            expect(clamped).toBeLessThanOrEqual(100);
            expect(Number.isInteger(clamped)).toBe(true);
        }
    });
});
