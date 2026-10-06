import type {
    RecipeBuilderChallenge,
    RecipeBuilderIngredientChoice,
    RecipeBuilderRecipeRecord,
    RecipeBuilderSubmission,
} from "./types";

const RECIPE_BUILDER_DISTRACTOR_COUNT = 4;
const RECIPE_BUILDER_REQUIRED_INGREDIENT_COUNT = 3;
const RECIPE_BUILDER_MAX_SELECTIONS = 40;

function shuffled<T>(values: readonly T[]): T[] {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
}

export function toRecipeBuilderChallenge(
    recipe: RecipeBuilderRecipeRecord,
    ingredientChoices: readonly RecipeBuilderIngredientChoice[],
    sessionId: string,
): RecipeBuilderChallenge {
    const requiredIds = new Set(getRecipeBuilderRequiredIngredientIds(recipe, sessionId));
    const recipeIngredientIds = new Set(recipe.ingredients.map((ingredient) => ingredient.id));
    const requiredChoices = recipe.ingredients
        .filter((ingredient) => requiredIds.has(ingredient.id))
        .map(({ id, name }) => ({ id, name }));
    const distractors = shuffled(ingredientChoices.filter((ingredient) => !recipeIngredientIds.has(ingredient.id)))
        .slice(0, RECIPE_BUILDER_DISTRACTOR_COUNT);

    return {
        recipeId: recipe.id,
        title: recipe.title,
        description: recipe.description,
        options: shuffled([...requiredChoices, ...distractors]),
    };
}

export function getRecipeBuilderRequiredIngredientIds(recipe: RecipeBuilderRecipeRecord, sessionId: string): string[] {
    return [...recipe.ingredients]
        .sort((left, right) => {
            const leftKey = `${sessionId}:${recipe.id}:${left.id}`;
            const rightKey = `${sessionId}:${recipe.id}:${right.id}`;
            return stableHash(leftKey) - stableHash(rightKey) || left.id.localeCompare(right.id);
        })
        .slice(0, RECIPE_BUILDER_REQUIRED_INGREDIENT_COUNT)
        .map((ingredient) => ingredient.id);
}

function stableHash(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function chooseRecipeBuilderChallenges(
    recipes: readonly RecipeBuilderRecipeRecord[],
    count = 3,
): RecipeBuilderRecipeRecord[] {
    return shuffled(recipes).slice(0, Math.min(count, recipes.length));
}

export function parseRecipeBuilderSubmission(value: unknown): RecipeBuilderSubmission | null {
    if (typeof value !== "object" || value === null) {
        return null;
    }

    const input = value as Record<string, unknown>;
    if (typeof input.sessionId !== "string" || input.sessionId.length === 0) {
        return null;
    }
    if (typeof input.recipeId !== "string" || input.recipeId.length === 0) {
        return null;
    }
    if (!Array.isArray(input.selectedIngredientIds)
        || input.selectedIngredientIds.length === 0
        || input.selectedIngredientIds.length > RECIPE_BUILDER_MAX_SELECTIONS
        || input.selectedIngredientIds.some((id) => typeof id !== "string" || id.length === 0)) {
        return null;
    }

    const selectedIngredientIds = input.selectedIngredientIds as string[];
    if (new Set(selectedIngredientIds).size !== selectedIngredientIds.length) {
        return null;
    }

    if (input.responseTimeMs !== undefined
        && input.responseTimeMs !== null
        && (typeof input.responseTimeMs !== "number" || !Number.isFinite(input.responseTimeMs) || input.responseTimeMs < 0)) {
        return null;
    }

    return {
        sessionId: input.sessionId,
        recipeId: input.recipeId,
        selectedIngredientIds,
        responseTimeMs: input.responseTimeMs as number | null | undefined,
    };
}
