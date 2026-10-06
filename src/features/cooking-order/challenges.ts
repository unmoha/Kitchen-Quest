import type {
    CookingOrderChallenge,
    CookingOrderRecipeRecord,
    CookingOrderSubmission,
} from "../game-engine/types";

const COOKING_ORDER_CHALLENGE_COUNT = 3;
const MAX_COOKING_ORDER_STEPS = 40;

function shuffled<T>(values: readonly T[], random: () => number = Math.random): T[] {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
}

export function chooseCookingOrderChallenges(recipes: readonly CookingOrderRecipeRecord[]): CookingOrderRecipeRecord[] {
    return shuffled(recipes).slice(0, Math.min(COOKING_ORDER_CHALLENGE_COUNT, recipes.length));
}

export function toCookingOrderChallenge(recipe: CookingOrderRecipeRecord, random: () => number = Math.random): CookingOrderChallenge {
    return {
        recipeId: recipe.id,
        title: recipe.title,
        description: recipe.description,
        steps: shuffled(recipe.steps, random).map(({ id, instruction }) => ({ id, instruction })),
    };
}

export function parseCookingOrderSubmission(value: unknown): CookingOrderSubmission | null {
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
    if (!Array.isArray(input.orderedStepIds)
        || input.orderedStepIds.length < 2
        || input.orderedStepIds.length > MAX_COOKING_ORDER_STEPS
        || input.orderedStepIds.some((id) => typeof id !== "string" || id.length === 0)) {
        return null;
    }

    const orderedStepIds = input.orderedStepIds as string[];
    if (new Set(orderedStepIds).size !== orderedStepIds.length) {
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
        orderedStepIds,
        responseTimeMs: input.responseTimeMs as number | null | undefined,
    };
}
