export type Difficulty = "Beginner" | "Intermediate" | "Advanced";
export type LearningCategoryId = "ingredients" | "techniques" | "tools" | "safety" | "nutrition" | "cuisines";
export type GameModeId = "ingredient-quiz" | "recipe-builder" | "cooking-order" | "kitchen-challenge" | "food-detective";

export interface Recipe {
    id: string;
    slug: string;
    name: string;
    description: string;
    cuisine: string;
    difficulty: Difficulty;
    prepMinutes: number;
    cookMinutes: number;
    image: string;
    imageAlt: string;
    category: string;
}

export interface LearningCategory {
    id: LearningCategoryId;
    name: string;
    description: string;
    exampleTopics: string[];
    color: "green" | "yellow" | "coral" | "blue";
}

export interface GameMode {
    id: GameModeId;
    name: string;
    description: string;
    learningFocus: string;
    status: "preview";
}

export interface FeaturedContent {
    id: string;
    type: "Recipe" | "Learn" | "Challenge";
    title: string;
    description: string;
    href: string;
    image: string;
    imageAlt: string;
    accent: "green" | "yellow" | "coral";
}