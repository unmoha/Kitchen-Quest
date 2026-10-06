import { describe, expect, it } from "vitest";
import type { Recipe } from "@/types/content";
import { filterRecipes } from "./recipe-search";

const sampleRecipes: Recipe[] = [
    {
        id: "ginger-chicken",
        slug: "ginger-chicken-stir-fry",
        name: "Ginger Chicken Stir-fry",
        description: "Tender chicken with crisp vegetables and fresh ginger.",
        cuisine: "East Asian-inspired",
        difficulty: "Beginner",
        prepMinutes: 15,
        cookMinutes: 12,
        image: "/images/chicken-stir-fry.jpg",
        imageAlt: "Chicken and vegetables in a bowl",
        category: "Quick meals",
    },
    {
        id: "misir-wat",
        slug: "ethiopian-misir-wat",
        name: "Ethiopian Misir Wat",
        description: "Red lentils simmered with berbere and warming spices.",
        cuisine: "Ethiopian",
        difficulty: "Intermediate",
        prepMinutes: 15,
        cookMinutes: 45,
        image: "/images/misir-wat.jpg",
        imageAlt: "A bowl of red lentil stew",
        category: "Plant-based",
    },
];

describe("filterRecipes", () => {
    it("matches recipe text without case sensitivity or surrounding spaces", () => {
        const result = filterRecipes(sampleRecipes, {
            query: "  GINGER ",
            category: "All recipes",
            difficulty: "Any difficulty",
        });

        expect(result.map((recipe) => recipe.id)).toEqual(["ginger-chicken"]);
    });

    it("combines category and difficulty filters", () => {
        const result = filterRecipes(sampleRecipes, {
            query: "",
            category: "Plant-based",
            difficulty: "Intermediate",
        });

        expect(result.map((recipe) => recipe.id)).toEqual(["misir-wat"]);
    });

    it("returns an empty result when no recipe matches", () => {
        const result = filterRecipes(sampleRecipes, {
            query: "cinnamon rolls",
            category: "All recipes",
            difficulty: "Any difficulty",
        });

        expect(result).toEqual([]);
    });
});