import { describe, expect, it } from "vitest";
import {
    buildAchievementsWithProgress,
    evaluateRequirement,
} from "./evaluator";
import type {
    AchievementEvaluationContext,
    AchievementItem,
    UserAchievementItem,
} from "./types";

describe("Achievement Evaluator - Pure Requirement Evaluation", () => {
    const defaultContext: AchievementEvaluationContext = {
        completedSessionCount: 0,
        completedGameModes: [],
        userLevel: 1,
        totalXp: 0,
        completedModuleIds: [],
        completedModuleSlugs: [],
        completedRecipeIds: [],
        completedRecipeSlugs: [],
        highestMasteryScore: 0,
        distinctLearningDaysCount: 0,
        distinctCuisineCount: 0,
    };

    it("evaluates game_sessions_completed requirement correctly", () => {
        const req = { kind: "game_sessions_completed" as const, count: 1 };

        const locked = evaluateRequirement(req, defaultContext);
        expect(locked.isSatisfied).toBe(false);
        expect(locked.currentProgress).toBe(0);
        expect(locked.maxProgress).toBe(1);
        expect(locked.progressPercent).toBe(0);

        const unlocked = evaluateRequirement(req, { ...defaultContext, completedSessionCount: 1 });
        expect(unlocked.isSatisfied).toBe(true);
        expect(unlocked.currentProgress).toBe(1);
        expect(unlocked.maxProgress).toBe(1);
        expect(unlocked.progressPercent).toBe(100);
    });

    it("evaluates distinct_game_modes requirement correctly", () => {
        const req = { kind: "distinct_game_modes" as const, count: 3 };

        const locked = evaluateRequirement(req, {
            ...defaultContext,
            completedGameModes: ["ingredient_quiz"],
        });
        expect(locked.isSatisfied).toBe(false);
        expect(locked.currentProgress).toBe(1);
        expect(locked.maxProgress).toBe(3);
        expect(locked.progressPercent).toBe(33);

        const unlocked = evaluateRequirement(req, {
            ...defaultContext,
            completedGameModes: ["ingredient_quiz", "recipe_builder", "cooking_order"],
        });
        expect(unlocked.isSatisfied).toBe(true);
        expect(unlocked.currentProgress).toBe(3);
        expect(unlocked.maxProgress).toBe(3);
        expect(unlocked.progressPercent).toBe(100);
    });

    it("evaluates min_level requirement correctly", () => {
        const req = { kind: "min_level" as const, level: 2 };

        const level1 = evaluateRequirement(req, { ...defaultContext, userLevel: 1 });
        expect(level1.isSatisfied).toBe(false);
        expect(level1.currentProgress).toBe(1);
        expect(level1.maxProgress).toBe(2);
        expect(level1.progressPercent).toBe(50);

        const level2 = evaluateRequirement(req, { ...defaultContext, userLevel: 2 });
        expect(level2.isSatisfied).toBe(true);
        expect(level2.currentProgress).toBe(2);
        expect(level2.maxProgress).toBe(2);
        expect(level2.progressPercent).toBe(100);
    });

    it("evaluates mastery_score requirement correctly", () => {
        const req = { kind: "mastery_score" as const, min_score: 100 };

        const partial = evaluateRequirement(req, { ...defaultContext, highestMasteryScore: 80 });
        expect(partial.isSatisfied).toBe(false);
        expect(partial.currentProgress).toBe(80);
        expect(partial.maxProgress).toBe(100);
        expect(partial.progressPercent).toBe(80);

        const mastered = evaluateRequirement(req, { ...defaultContext, highestMasteryScore: 100 });
        expect(mastered.isSatisfied).toBe(true);
        expect(mastered.currentProgress).toBe(100);
        expect(mastered.maxProgress).toBe(100);
        expect(mastered.progressPercent).toBe(100);
    });

    it("evaluates module_completions requirement correctly", () => {
        const req = { kind: "module_completions" as const, count: 1 };

        const zero = evaluateRequirement(req, defaultContext);
        expect(zero.isSatisfied).toBe(false);
        expect(zero.currentProgress).toBe(0);

        const one = evaluateRequirement(req, { ...defaultContext, completedModuleIds: ["mod-1"] });
        expect(one.isSatisfied).toBe(true);
        expect(one.currentProgress).toBe(1);
        expect(one.progressPercent).toBe(100);
    });

    it("evaluates ingredient_lessons requirement correctly", () => {
        const req = { kind: "ingredient_lessons" as const, count: 5 };

        const two = evaluateRequirement(req, {
            ...defaultContext,
            completedModuleIds: ["mod-1"],
            completedRecipeIds: ["rec-1"],
        });
        expect(two.isSatisfied).toBe(false);
        expect(two.currentProgress).toBe(2);
        expect(two.maxProgress).toBe(5);
        expect(two.progressPercent).toBe(40);

        const five = evaluateRequirement(req, {
            ...defaultContext,
            completedModuleIds: ["mod-1", "mod-2", "mod-3"],
            completedRecipeIds: ["rec-1", "rec-2"],
        });
        expect(five.isSatisfied).toBe(true);
        expect(five.currentProgress).toBe(5);
        expect(five.progressPercent).toBe(100);
    });

    it("evaluates module_slug requirement correctly", () => {
        const req = { kind: "module_slug" as const, slug: "choose-and-use-a-chef-knife" };

        const notCompleted = evaluateRequirement(req, {
            ...defaultContext,
            completedModuleSlugs: ["season-aromatics-in-a-pan"],
        });
        expect(notCompleted.isSatisfied).toBe(false);
        expect(notCompleted.currentProgress).toBe(0);
        expect(notCompleted.maxProgress).toBe(1);

        const completed = evaluateRequirement(req, {
            ...defaultContext,
            completedModuleSlugs: ["choose-and-use-a-chef-knife"],
        });
        expect(completed.isSatisfied).toBe(true);
        expect(completed.currentProgress).toBe(1);
        expect(completed.progressPercent).toBe(100);
    });

    it("evaluates recipe_views / recipe_completions requirement correctly", () => {
        const req = { kind: "recipe_views" as const, count: 3 };

        const one = evaluateRequirement(req, { ...defaultContext, completedRecipeIds: ["rec-1"] });
        expect(one.isSatisfied).toBe(false);
        expect(one.currentProgress).toBe(1);
        expect(one.maxProgress).toBe(3);
        expect(one.progressPercent).toBe(33);

        const three = evaluateRequirement(req, {
            ...defaultContext,
            completedRecipeIds: ["rec-1", "rec-2", "rec-3"],
        });
        expect(three.isSatisfied).toBe(true);
        expect(three.currentProgress).toBe(3);
        expect(three.progressPercent).toBe(100);
    });

    it("evaluates cuisine_modules requirement correctly", () => {
        const req = { kind: "cuisine_modules" as const, count: 3 };

        const two = evaluateRequirement(req, { ...defaultContext, distinctCuisineCount: 2 });
        expect(two.isSatisfied).toBe(false);
        expect(two.currentProgress).toBe(2);
        expect(two.maxProgress).toBe(3);
        expect(two.progressPercent).toBe(67);

        const three = evaluateRequirement(req, { ...defaultContext, distinctCuisineCount: 3 });
        expect(three.isSatisfied).toBe(true);
        expect(three.currentProgress).toBe(3);
        expect(three.progressPercent).toBe(100);
    });

    it("evaluates learning_days requirement correctly", () => {
        const req = { kind: "learning_days" as const, count: 5 };

        const twoDays = evaluateRequirement(req, { ...defaultContext, distinctLearningDaysCount: 2 });
        expect(twoDays.isSatisfied).toBe(false);
        expect(twoDays.currentProgress).toBe(2);
        expect(twoDays.maxProgress).toBe(5);
        expect(twoDays.progressPercent).toBe(40);

        const fiveDays = evaluateRequirement(req, { ...defaultContext, distinctLearningDaysCount: 5 });
        expect(fiveDays.isSatisfied).toBe(true);
        expect(fiveDays.currentProgress).toBe(5);
        expect(fiveDays.progressPercent).toBe(100);
    });

    it("handles unrecognized requirement kinds gracefully", () => {
        const req = { kind: "unknown_future_kind" };
        const result = evaluateRequirement(req, defaultContext);
        expect(result.isSatisfied).toBe(false);
        expect(result.currentProgress).toBe(0);
        expect(result.maxProgress).toBe(1);
        expect(result.progressPercent).toBe(0);
    });

    it("builds achievements with progress and preserves existing unlock timestamps", () => {
        const achievements: AchievementItem[] = [
            {
                id: "ach-1",
                name: "First Quest",
                slug: "first-quest",
                description: "Complete your first game session.",
                icon: "award",
                requirement: { kind: "game_sessions_completed", count: 1 },
                status: "published",
                createdAt: "2026-01-01T00:00:00.000Z",
            },
            {
                id: "ach-2",
                name: "Recipe Reader",
                slug: "recipe-reader",
                description: "Complete 3 recipes.",
                icon: "book-open",
                requirement: { kind: "recipe_views", count: 3 },
                status: "published",
                createdAt: "2026-01-01T00:00:00.000Z",
            },
        ];

        const userUnlocks: UserAchievementItem[] = [
            {
                id: "unlock-1",
                userId: "user-1",
                achievementId: "ach-1",
                unlockedAt: "2026-02-01T12:00:00.000Z",
                createdAt: "2026-02-01T12:00:00.000Z",
            },
        ];

        const context: AchievementEvaluationContext = {
            ...defaultContext,
            completedSessionCount: 1,
            completedRecipeIds: ["rec-1", "rec-2"],
        };

        const list = buildAchievementsWithProgress(achievements, userUnlocks, context);
        expect(list).toHaveLength(2);

        // First Quest is unlocked with original unlockedAt timestamp
        expect(list[0].id).toBe("ach-1");
        expect(list[0].isUnlocked).toBe(true);
        expect(list[0].unlockedAt).toBe("2026-02-01T12:00:00.000Z");
        expect(list[0].progressPercent).toBe(100);

        // Recipe Reader is in progress (2 / 3 -> 67%)
        expect(list[1].id).toBe("ach-2");
        expect(list[1].isUnlocked).toBe(false);
        expect(list[1].unlockedAt).toBeNull();
        expect(list[1].currentProgress).toBe(2);
        expect(list[1].maxProgress).toBe(3);
        expect(list[1].progressPercent).toBe(67);
    });
});
