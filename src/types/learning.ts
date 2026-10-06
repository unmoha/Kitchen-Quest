import type { Difficulty, LearningCategoryId } from "@/types/content";

export const learningCategoryLabels: Record<LearningCategoryId, string> = {
    ingredients: "Ingredients",
    techniques: "Cooking techniques",
    tools: "Kitchen tools",
    safety: "Food safety",
    nutrition: "Nutrition fundamentals",
    cuisines: "World cuisine",
};

export interface LearningSection {
    heading: string;
    body: string;
}

export interface LearningModule {
    id: string;
    title: string;
    slug: string;
    description: string;
    category: LearningCategoryId;
    difficulty: Difficulty;
    sections: LearningSection[];
}