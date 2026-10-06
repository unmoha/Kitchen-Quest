import type {
    ContentStatus,
    DifficultyLevel,
    QuestionType,
    DailyChallengeType,
    LearningModuleCategory,
    AdminEntityType,
    Json,
} from "@/types/database";

export type {
    ContentStatus,
    DifficultyLevel,
    QuestionType,
    DailyChallengeType,
    LearningModuleCategory,
    AdminEntityType,
    Json,
};

export type { AdminPersistence } from "./service";

export interface AdminContentStats {
    total: number;
    draft: number;
    review: number;
    published: number;
    archived: number;
}

export interface AdminDashboardSummary {
    ingredients: AdminContentStats;
    recipes: AdminContentStats;
    learningModules: AdminContentStats;
    questions: AdminContentStats;
    achievements: AdminContentStats;
    dailyChallenges: AdminContentStats;
    recentAuditLogs: AdminAuditLogItem[];
}

export interface AdminAuditLogItem {
    id: string;
    adminUserId: string;
    adminDisplayName?: string;
    action: string;
    entityType: AdminEntityType;
    entityId: string | null;
    details: Json;
    createdAt: string;
}

// Ingredient types
export interface IngredientInput {
    name: string;
    slug: string;
    description: string;
    category: string;
    imageUrl?: string | null;
    storageInformation: string;
    safetyInformation: string;
    status?: ContentStatus;
}

export interface AdminIngredientItem {
    id: string;
    name: string;
    slug: string;
    description: string;
    category: string;
    imageUrl: string | null;
    storageInformation: string;
    safetyInformation: string;
    status: ContentStatus;
    createdAt: string;
    updatedAt: string;
}

// Recipe types
export interface RecipeIngredientInput {
    ingredientId: string;
    quantity: number;
    unit: string;
    isOptional?: boolean;
    preparationNote?: string | null;
}

export interface RecipeStepInput {
    stepNumber: number;
    instruction: string;
    timeMinutes?: number | null;
    educationalNote?: string | null;
}

export interface RecipeInput {
    title: string;
    slug: string;
    description: string;
    cuisine: string;
    category: string;
    difficulty: DifficultyLevel;
    prepTimeMinutes: number;
    cookTimeMinutes: number;
    servings: number;
    imageUrl?: string | null;
    educationalInfo: string;
    safetyNotes: string;
    nutritionInfo?: Json | null;
    status?: ContentStatus;
    ingredients?: RecipeIngredientInput[];
    steps?: RecipeStepInput[];
}

export interface AdminRecipeItem {
    id: string;
    title: string;
    slug: string;
    description: string;
    cuisine: string;
    category: string;
    difficulty: DifficultyLevel;
    prepTimeMinutes: number;
    cookTimeMinutes: number;
    servings: number;
    imageUrl: string | null;
    educationalInfo: string;
    safetyNotes: string;
    nutritionInfo: Json | null;
    status: ContentStatus;
    createdAt: string;
    updatedAt: string;
    ingredientCount?: number;
    stepCount?: number;
}

// Learning module types
export interface LearningModuleInput {
    title: string;
    slug: string;
    description: string;
    category: LearningModuleCategory;
    difficulty: DifficultyLevel;
    content: Json;
    status?: ContentStatus;
}

export interface AdminLearningModuleItem {
    id: string;
    title: string;
    slug: string;
    description: string;
    category: LearningModuleCategory;
    difficulty: DifficultyLevel;
    content: Json;
    status: ContentStatus;
    createdAt: string;
    updatedAt: string;
}

// Question types
export interface QuestionOptionInput {
    optionText: string;
    optionOrder: number;
    isCorrect: boolean;
}

export interface QuestionInput {
    slug: string;
    learningModuleId?: string | null;
    questionText: string;
    questionType: QuestionType;
    explanation: string;
    difficulty: DifficultyLevel;
    status?: ContentStatus;
    options?: QuestionOptionInput[];
}

export interface AdminQuestionItem {
    id: string;
    slug: string;
    learningModuleId: string | null;
    learningModuleTitle?: string | null;
    questionText: string;
    questionType: QuestionType;
    explanation: string;
    difficulty: DifficultyLevel;
    status: ContentStatus;
    createdAt: string;
    updatedAt: string;
    options?: Array<{
        id: string;
        optionText: string;
        optionOrder: number;
        isCorrect: boolean;
    }>;
}

// Achievement types
export interface AchievementInput {
    name: string;
    slug: string;
    description: string;
    icon: string;
    requirement: Json;
    status?: ContentStatus;
}

export interface AdminAchievementItem {
    id: string;
    name: string;
    slug: string;
    description: string;
    icon: string;
    requirement: Json;
    status: ContentStatus;
    createdAt: string;
}

// Daily Challenge types
export interface DailyChallengeInput {
    challengeDate: string; // YYYY-MM-DD
    title: string;
    slug: string;
    description: string;
    challengeType: DailyChallengeType;
    recipeId?: string | null;
    learningModuleId?: string | null;
    ingredientId?: string | null;
    status?: ContentStatus;
}

export interface AdminDailyChallengeItem {
    id: string;
    challengeDate: string;
    title: string;
    slug: string;
    description: string;
    challengeType: DailyChallengeType;
    recipeId: string | null;
    recipeTitle?: string | null;
    learningModuleId: string | null;
    learningModuleTitle?: string | null;
    ingredientId: string | null;
    ingredientName?: string | null;
    status: ContentStatus;
    createdAt: string;
}

// Standard Admin Action Response
export type AdminActionResponse<T = unknown> =
    | { success: true; data: T; message?: string }
    | { success: false; error: string; validationErrors?: Record<string, string> };
