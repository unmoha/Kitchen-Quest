import type { GameModeDefinition, GameModeName, QuestionRecord } from "./types";
import { getRecipeBuilderRequiredIngredientIds } from "./recipe-builder";

export const gameModeDefinitions: Record<GameModeName, GameModeDefinition> = {
    ingredient_quiz: {
        modeId: "ingredient_quiz",
        baseScore: 10,
        allowDuplicateQuestionAttempts: false,
        allowQuestionSelection: (question: QuestionRecord) =>
            question.status === "published"
            && question.learning_module_status === "published"
            && question.learning_module_category === "ingredients",
        evaluateCorrectness: (question, selectedOptionId) => {
            const selected = question.options.find((option) => option.id === selectedOptionId);
            return selected !== undefined && selected.is_correct;
        },
        calculateScore: (isCorrect) => (isCorrect ? 10 : 0),
    },
    recipe_builder: {
        modeId: "recipe_builder",
        baseScore: 10,
        allowDuplicateQuestionAttempts: false,
        allowQuestionSelection: () => false,
        allowRecipeSelection: (recipe) =>
            recipe.status === "published"
            && recipe.ingredients.length >= 3
            && recipe.ingredients.every((ingredient) => ingredient.status === "published"),
        evaluateCorrectness: (question, selectedOptionId) => {
            const selected = question.options.find((option) => option.id === selectedOptionId);
            return selected !== undefined && selected.is_correct;
        },
        evaluateRecipeBuilderAnswer: (recipe, selectedIngredientIds, sessionId) => {
            const requiredIds = new Set(getRecipeBuilderRequiredIngredientIds(recipe, sessionId));
            const selectedIds = new Set(selectedIngredientIds);
            return requiredIds.size === selectedIds.size && [...requiredIds].every((id) => selectedIds.has(id));
        },
        calculateScore: (isCorrect) => (isCorrect ? 10 : 0),
    },
    cooking_order: {
        modeId: "cooking_order",
        baseScore: 10,
        allowDuplicateQuestionAttempts: false,
        allowQuestionSelection: () => false,
        allowCookingOrderSelection: (recipe) =>
            recipe.status === "published"
            && recipe.steps.length >= 2
            && recipe.steps.every((step, index) => step.recipe_id === recipe.id && step.step_number === index + 1),
        evaluateCorrectness: (question, selectedOptionId) => {
            const selected = question.options.find((option) => option.id === selectedOptionId);
            return selected !== undefined && selected.is_correct;
        },
        evaluateCookingOrderAnswer: (recipe, orderedStepIds) => {
            const expectedIds = [...recipe.steps]
                .sort((left, right) => left.step_number - right.step_number)
                .map((step) => step.id);
            return expectedIds.length === orderedStepIds.length
                && expectedIds.every((id, index) => orderedStepIds[index] === id);
        },
        calculateScore: (isCorrect) => (isCorrect ? 10 : 0),
    },
    kitchen_challenge: {
        modeId: "kitchen_challenge",
        baseScore: 10,
        allowDuplicateQuestionAttempts: false,
        allowQuestionSelection: (question: QuestionRecord) =>
            question.status === "published"
            && question.learning_module_status === "published"
            && question.learning_module_category === "food_safety",
        evaluateCorrectness: (question, selectedOptionId) => {
            const selected = question.options.find((option) => option.id === selectedOptionId);
            return selected !== undefined && selected.is_correct;
        },
        calculateScore: (isCorrect) => (isCorrect ? 10 : 0),
    },
    food_detective: {
        modeId: "food_detective",
        baseScore: 10,
        allowDuplicateQuestionAttempts: false,
        allowQuestionSelection: (question: QuestionRecord) =>
            question.status === "published"
            && question.learning_module_status === "published"
            && question.learning_module_category === "techniques",
        evaluateCorrectness: (question, selectedOptionId) => {
            const selected = question.options.find((option) => option.id === selectedOptionId);
            return selected !== undefined && selected.is_correct;
        },
        calculateScore: (isCorrect) => (isCorrect ? 10 : 0),
    },
};

export const gameModeList: GameModeName[] = Object.keys(gameModeDefinitions) as GameModeName[];

export function getGameModeDefinition(mode: GameModeName): GameModeDefinition {
    return gameModeDefinitions[mode];
}
