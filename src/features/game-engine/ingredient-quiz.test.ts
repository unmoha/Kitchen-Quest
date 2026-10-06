import { describe, expect, it } from "vitest";

import { pickIngredientQuizQuestions, sanitizeIngredientQuizQuestion } from "./ingredient-quiz";

describe("ingredient quiz helpers", () => {
    it("keeps only ingredient module questions and strips answer metadata", () => {
        const payload = [
            {
                id: "q-1",
                slug: "lentils",
                learning_module_id: "mod-ingredients",
                question_text: "Why soak lentils?",
                question_type: "multiple_choice",
                explanation: "Reason text",
                difficulty: "beginner",
                status: "published",
                created_at: "2026-01-01T00:00:00.000Z",
                updated_at: "2026-01-01T00:00:00.000Z",
                learning_category: "ingredients",
                options: [
                    { id: "opt-1", question_id: "q-1", option_text: "Because they like it", option_order: 1, is_correct: true },
                    { id: "opt-2", question_id: "q-1", option_text: "Because they are made of stone", option_order: 2, is_correct: false },
                ],
            },
            {
                id: "q-2",
                slug: "poultry",
                learning_module_id: "mod-safety",
                question_text: "What about raw chicken?",
                question_type: "multiple_choice",
                explanation: "Reason text",
                difficulty: "beginner",
                status: "published",
                created_at: "2026-01-02T00:00:00.000Z",
                updated_at: "2026-01-02T00:00:00.000Z",
                learning_category: "food_safety",
                options: [
                    { id: "opt-3", question_id: "q-2", option_text: "Keep it separate", option_order: 1, is_correct: true },
                    { id: "opt-4", question_id: "q-2", option_text: "Pour it over salad", option_order: 2, is_correct: false },
                ],
            },
        ] as const;

        const selected = pickIngredientQuizQuestions(payload, 5);

        expect(selected).toHaveLength(1);
        expect(selected[0].id).toBe("q-1");
        expect(selected[0].options.every((option) => !("is_correct" in option))).toBe(true);
        expect(selected[0].options[0]).toEqual({
            id: "opt-1",
            option_text: "Because they like it",
            option_order: 1,
        });
    });

    it("sanitizes a single question payload without exposing its correctness data", () => {
        const question = {
            id: "q-3",
            slug: "garlic",
            learning_module_id: "mod-ingredients",
            question_text: "When should garlic go in?",
            question_type: "multiple_choice",
            explanation: "Garlic blooms with heat",
            difficulty: "beginner",
            status: "published",
            created_at: "2026-01-03T00:00:00.000Z",
            updated_at: "2026-01-03T00:00:00.000Z",
            learning_category: "ingredients",
            options: [
                { id: "opt-5", question_id: "q-3", option_text: "After the onions soften", option_order: 1, is_correct: true },
                { id: "opt-6", question_id: "q-3", option_text: "At the very end", option_order: 2, is_correct: false },
            ],
        } as const;

        const sanitized = sanitizeIngredientQuizQuestion(question);

        expect(sanitized).not.toHaveProperty("options.0.is_correct");
        expect(sanitized.options).toEqual([
            { id: "opt-5", option_text: "After the onions soften", option_order: 1 },
            { id: "opt-6", option_text: "At the very end", option_order: 2 },
        ]);
    });
});
