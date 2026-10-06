import "server-only";

import type { Database } from "@/types/database";
import type { Recipe } from "@/types/content";
import { toRecipePreview } from "@/lib/recipe-mapping";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type IngredientLinkRow = Database["public"]["Tables"]["recipe_ingredients"]["Row"];
type IngredientRow = Database["public"]["Tables"]["ingredients"]["Row"];
type RecipeStepRow = Database["public"]["Tables"]["recipe_steps"]["Row"];

export interface PublishedRecipeDetail {
    recipe: Recipe;
    servings: number;
    educationalInfo: string;
    safetyNotes: string;
    ingredients: Array<{
        name: string;
        quantity: number;
        unit: string;
        isOptional: boolean;
        preparationNote: string | null;
    }>;
    steps: RecipeStepRow[];
}

export type RecipeListResult =
    | { status: "unconfigured" }
    | { status: "error" }
    | { status: "empty" }
    | { status: "ready"; recipes: Recipe[] };

export type RecipeDetailResult =
    | { status: "unconfigured" }
    | { status: "error" }
    | { status: "not-found" }
    | { status: "ready"; detail: PublishedRecipeDetail };

export async function getPublishedRecipes(): Promise<RecipeListResult> {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        return { status: "unconfigured" };
    }

    const { data, error } = await supabase
        .from("recipes")
        .select("id, title, slug, description, cuisine, category, difficulty, prep_time_minutes, cook_time_minutes, image_url, status, servings, educational_info, safety_notes, nutrition_info, created_at, updated_at")
        .eq("status", "published")
        .order("title");

    if (error) {
        console.error("Published recipe query failed", error.code);
        return { status: "error" };
    }

    if (!data?.length) {
        return { status: "empty" };
    }

    return { status: "ready", recipes: data.map(toRecipePreview) };
}

export async function getPublishedRecipeBySlug(slug: string): Promise<RecipeDetailResult> {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        return { status: "unconfigured" };
    }

    const { data: recipe, error: recipeError } = await supabase
        .from("recipes")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

    if (recipeError) {
        console.error("Published recipe detail query failed", recipeError.code);
        return { status: "error" };
    }
    if (!recipe) {
        return { status: "not-found" };
    }

    const [ingredientLinks, steps] = await Promise.all([
        supabase.from("recipe_ingredients").select("*").eq("recipe_id", recipe.id),
        supabase.from("recipe_steps").select("*").eq("recipe_id", recipe.id).order("step_number"),
    ]);

    if (ingredientLinks.error || steps.error) {
        console.error("Published recipe relations query failed", ingredientLinks.error?.code ?? steps.error?.code);
        return { status: "error" };
    }

    const ingredientIds = ingredientLinks.data.map((link) => link.ingredient_id);
    let publishedIngredients: Pick<IngredientRow, "id" | "name">[] = [];
    if (ingredientIds.length) {
        const ingredientResult = await supabase
            .from("ingredients")
            .select("id, name")
            .in("id", ingredientIds)
            .eq("status", "published");

        if (ingredientResult.error) {
            console.error("Published recipe ingredients query failed", ingredientResult.error.code);
            return { status: "error" };
        }
        publishedIngredients = ingredientResult.data;
    }

    const namesById = new Map(publishedIngredients.map((ingredient) => [ingredient.id, ingredient.name]));
    const visibleLinks: IngredientLinkRow[] = ingredientLinks.data.filter((link) => namesById.has(link.ingredient_id));

    return {
        status: "ready",
        detail: {
            recipe: toRecipePreview(recipe),
            servings: recipe.servings,
            educationalInfo: recipe.educational_info,
            safetyNotes: recipe.safety_notes,
            ingredients: visibleLinks.map((link) => ({
                name: namesById.get(link.ingredient_id) ?? "",
                quantity: link.quantity,
                unit: link.unit,
                isOptional: link.is_optional,
                preparationNote: link.preparation_note,
            })),
            steps: steps.data,
        },
    };
}