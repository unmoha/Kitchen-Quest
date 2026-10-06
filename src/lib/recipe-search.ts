import type { Recipe } from "@/types/content";

export interface RecipeFilters {
    query: string;
    category: string;
    difficulty: string;
}

export function filterRecipes(recipes: Recipe[], filters: RecipeFilters): Recipe[] {
    const normalizedQuery = filters.query.trim().toLocaleLowerCase();

    return recipes.filter((recipe) => {
        const matchesQuery =
            normalizedQuery.length === 0 ||
            [recipe.name, recipe.description, recipe.cuisine, recipe.category]
                .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
        const matchesCategory = filters.category === "All recipes" || recipe.category === filters.category;
        const matchesDifficulty = filters.difficulty === "Any difficulty" || recipe.difficulty === filters.difficulty;

        return matchesQuery && matchesCategory && matchesDifficulty;
    });
}