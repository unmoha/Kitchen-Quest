import type { LearningCategoryId } from "@/types/content";
import type { Database, DifficultyLevel, Json, LearningModuleCategory } from "@/types/database";
import type { LearningModule, LearningSection } from "@/types/learning";

type LearningModuleRow = Database["public"]["Tables"]["learning_modules"]["Row"];

const categoryIds: Record<LearningModuleCategory, LearningCategoryId> = {
    ingredients: "ingredients",
    techniques: "techniques",
    tools: "tools",
    food_safety: "safety",
    nutrition: "nutrition",
    world_cuisine: "cuisines",
};

function toDisplayDifficulty(difficulty: DifficultyLevel): LearningModule["difficulty"] {
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1) as LearningModule["difficulty"];
}

function isJsonObject(value: Json | undefined): value is { [key: string]: Json | undefined } {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseLearningSections(content: Json): LearningSection[] {
    if (!isJsonObject(content)) {
        return [];
    }

    const sections = content.sections;
    if (!Array.isArray(sections)) {
        return [];
    }

    return sections.flatMap((section) => {
        if (!isJsonObject(section) || typeof section.heading !== "string" || typeof section.body !== "string") {
            return [];
        }
        return [{ heading: section.heading, body: section.body }];
    });
}

export function toLearningModule(row: LearningModuleRow): LearningModule {
    return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        description: row.description,
        category: categoryIds[row.category],
        difficulty: toDisplayDifficulty(row.difficulty),
        sections: parseLearningSections(row.content),
    };
}