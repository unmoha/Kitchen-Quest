import { describe, expect, it } from "vitest";
import type { Database } from "@/types/database";
import { toRecipePreview } from "../../lib/recipe-mapping";

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

const recipeRow: RecipeRow = {
    id: "recipe-id",
    title: "Ethiopian Misir Wat",
    slug: "ethiopian-misir-wat",
    description: "Red lentils cooked with berbere and aromatics.",
    cuisine: "Ethiopian",
    category: "Plant-based",
    difficulty: "intermediate",
    prep_time_minutes: 15,
    cook_time_minutes: 45,
    servings: 4,
    image_url: null,
    educational_info: "Blooming spices in oil helps release fat-soluble aromas.",
    safety_notes: "Keep raw ingredients separate from cooked food.",
    nutrition_info: null,
    status: "published",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
};

describe("toRecipePreview", () => {
    it("maps database fields for the existing recipe card and uses a local image fallback", () => {
        expect(toRecipePreview(recipeRow)).toEqual({
            id: "recipe-id",
            slug: "ethiopian-misir-wat",
            name: "Ethiopian Misir Wat",
            description: "Red lentils cooked with berbere and aromatics.",
            cuisine: "Ethiopian",
            difficulty: "Intermediate",
            prepMinutes: 15,
            cookMinutes: 45,
            image: "/images/hero-table.jpg",
            imageAlt: "Ethiopian Misir Wat",
            category: "Plant-based",
        });
    });
});