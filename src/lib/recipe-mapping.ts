import type { Recipe } from "@/types/content";
import type { Database, DifficultyLevel } from "@/types/database";

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

function toDisplayDifficulty(difficulty: DifficultyLevel): Recipe["difficulty"] {
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1) as Recipe["difficulty"];
}

export function toRecipePreview(row: RecipeRow): Recipe {
    return {
        id: row.id,
        slug: row.slug,
        name: row.title,
        description: row.description,
        cuisine: row.cuisine,
        difficulty: toDisplayDifficulty(row.difficulty),
        prepMinutes: row.prep_time_minutes,
        cookMinutes: row.cook_time_minutes,
        image: row.image_url ?? "/images/hero-table.jpg",
        imageAlt: row.title,
        category: row.category,
    };
}