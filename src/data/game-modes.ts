import type { GameMode } from "@/types/content";

export const gameModes: GameMode[] = [
    {
        id: "ingredient-quiz",
        name: "Ingredient Quiz",
        description: "Spot ingredients by flavor, season, and the job they do in a dish.",
        learningFocus: "Ingredient knowledge",
        status: "preview",
    },
    {
        id: "recipe-builder",
        name: "Recipe Builder",
        description: "Explore how ingredients come together to make a balanced recipe.",
        learningFocus: "Recipe structure",
        status: "preview",
    },
    {
        id: "cooking-order",
        name: "Cooking Order",
        description: "Put preparation steps in a sensible, safe, and delicious order.",
        learningFocus: "Technique and timing",
        status: "preview",
    },
    {
        id: "kitchen-challenge",
        name: "Kitchen Challenge",
        description: "Work through a practical kitchen scenario one decision at a time.",
        learningFocus: "Practical cooking",
        status: "preview",
    },
    {
        id: "food-detective",
        name: "Food Detective",
        description: "Use clues about texture, aroma, and method to solve a food mystery.",
        learningFocus: "Observation and food science",
        status: "preview",
    },
];