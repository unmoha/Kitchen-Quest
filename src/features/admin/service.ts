import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type {
    AdminActionResponse,
    AdminAuditLogItem,
    AdminContentStats,
    AdminDashboardSummary,
    AdminIngredientItem,
    AdminRecipeItem,
    AdminLearningModuleItem,
    AdminQuestionItem,
    AdminAchievementItem,
    AdminDailyChallengeItem,
    ContentStatus,
    AdminEntityType,
} from "./types";
import {
    validateIngredientInput,
    validateRecipeInput,
    validateLearningModuleInput,
    validateQuestionInput,
    validateAchievementInput,
    validateDailyChallengeInput,
    isValidUuid,
} from "./validation";

type IngredientUpdate = Database["public"]["Tables"]["ingredients"]["Update"];
type RecipeUpdate = Database["public"]["Tables"]["recipes"]["Update"];
type LearningModuleUpdate = Database["public"]["Tables"]["learning_modules"]["Update"];
type QuestionUpdate = Database["public"]["Tables"]["questions"]["Update"];
type AchievementUpdate = Database["public"]["Tables"]["achievements"]["Update"];
type DailyChallengeUpdate = Database["public"]["Tables"]["daily_challenges"]["Update"];

export interface AdminPersistence {
    getDashboardSummary(): Promise<AdminDashboardSummary>;
    logAudit(entry: {
        adminUserId: string;
        action: string;
        entityType: AdminEntityType;
        entityId: string | null;
        details?: Json;
    }): Promise<void>;

    // Ingredients
    listIngredients(filters?: { status?: ContentStatus; search?: string }): Promise<AdminIngredientItem[]>;
    getIngredientById(id: string): Promise<AdminIngredientItem | null>;
    createIngredient(item: Omit<AdminIngredientItem, "id" | "createdAt" | "updatedAt">): Promise<AdminIngredientItem>;
    updateIngredient(id: string, item: Partial<Omit<AdminIngredientItem, "id" | "createdAt" | "updatedAt">>): Promise<AdminIngredientItem>;

    // Recipes
    listRecipes(filters?: { status?: ContentStatus; search?: string }): Promise<AdminRecipeItem[]>;
    getRecipeById(id: string): Promise<(AdminRecipeItem & {
        ingredients: Array<{ ingredientId: string; name: string; quantity: number; unit: string; isOptional: boolean; preparationNote: string | null }>;
        steps: Array<{ id: string; stepNumber: number; instruction: string; timeMinutes: number | null; educationalNote: string | null }>;
    }) | null>;
    createRecipe(
        recipe: Omit<AdminRecipeItem, "id" | "createdAt" | "updatedAt">,
        ingredients: Array<{ ingredientId: string; quantity: number; unit: string; isOptional: boolean; preparationNote: string | null }>,
        steps: Array<{ stepNumber: number; instruction: string; timeMinutes: number | null; educationalNote: string | null }>,
    ): Promise<AdminRecipeItem>;
    updateRecipe(
        id: string,
        recipe: Partial<Omit<AdminRecipeItem, "id" | "createdAt" | "updatedAt">>,
        ingredients?: Array<{ ingredientId: string; quantity: number; unit: string; isOptional: boolean; preparationNote: string | null }>,
        steps?: Array<{ stepNumber: number; instruction: string; timeMinutes: number | null; educationalNote: string | null }>,
    ): Promise<AdminRecipeItem>;

    // Learning modules
    listLearningModules(filters?: { status?: ContentStatus; search?: string }): Promise<AdminLearningModuleItem[]>;
    getLearningModuleById(id: string): Promise<AdminLearningModuleItem | null>;
    createLearningModule(item: Omit<AdminLearningModuleItem, "id" | "createdAt" | "updatedAt">): Promise<AdminLearningModuleItem>;
    updateLearningModule(id: string, item: Partial<Omit<AdminLearningModuleItem, "id" | "createdAt" | "updatedAt">>): Promise<AdminLearningModuleItem>;

    // Questions
    listQuestions(filters?: { status?: ContentStatus; moduleId?: string; search?: string }): Promise<AdminQuestionItem[]>;
    getQuestionById(id: string): Promise<AdminQuestionItem | null>;
    createQuestion(
        question: Omit<AdminQuestionItem, "id" | "createdAt" | "updatedAt" | "options" | "learningModuleTitle">,
        options: Array<{ optionText: string; optionOrder: number; isCorrect: boolean }>,
    ): Promise<AdminQuestionItem>;
    updateQuestion(
        id: string,
        question: Partial<Omit<AdminQuestionItem, "id" | "createdAt" | "updatedAt" | "options" | "learningModuleTitle">>,
        options?: Array<{ optionText: string; optionOrder: number; isCorrect: boolean }>,
    ): Promise<AdminQuestionItem>;

    // Achievements
    listAchievements(filters?: { status?: ContentStatus; search?: string }): Promise<AdminAchievementItem[]>;
    getAchievementById(id: string): Promise<AdminAchievementItem | null>;
    createAchievement(item: Omit<AdminAchievementItem, "id" | "createdAt">): Promise<AdminAchievementItem>;
    updateAchievement(id: string, item: Partial<Omit<AdminAchievementItem, "id" | "createdAt">>): Promise<AdminAchievementItem>;

    // Daily Challenges
    listDailyChallenges(filters?: { status?: ContentStatus; search?: string }): Promise<AdminDailyChallengeItem[]>;
    getDailyChallengeById(id: string): Promise<AdminDailyChallengeItem | null>;
    createDailyChallenge(item: Omit<AdminDailyChallengeItem, "id" | "createdAt" | "recipeTitle" | "learningModuleTitle" | "ingredientName">): Promise<AdminDailyChallengeItem>;
    updateDailyChallenge(id: string, item: Partial<Omit<AdminDailyChallengeItem, "id" | "createdAt" | "recipeTitle" | "learningModuleTitle" | "ingredientName">>): Promise<AdminDailyChallengeItem>;
}

export class AdminService {
    constructor(private readonly persistence: AdminPersistence) {}

    async getDashboard(): Promise<AdminActionResponse<AdminDashboardSummary>> {
        try {
            const summary = await this.persistence.getDashboardSummary();
            return { success: true, data: summary };
        } catch (err: unknown) {
            const error = err instanceof Error ? err.message : "Failed to load admin dashboard summary.";
            return { success: false, error };
        }
    }

    // -------------------------------------------------------------
    // Ingredients
    // -------------------------------------------------------------
    async listIngredients(filters?: { status?: ContentStatus; search?: string }): Promise<AdminActionResponse<AdminIngredientItem[]>> {
        try {
            const data = await this.persistence.listIngredients(filters);
            return { success: true, data };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to list ingredients." };
        }
    }

    async getIngredient(id: string): Promise<AdminActionResponse<AdminIngredientItem>> {
        if (!isValidUuid(id)) return { success: false, error: "Invalid ingredient ID." };
        try {
            const data = await this.persistence.getIngredientById(id);
            if (!data) return { success: false, error: "Ingredient not found." };
            return { success: true, data };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to get ingredient." };
        }
    }

    async createIngredient(adminUserId: string, input: unknown): Promise<AdminActionResponse<AdminIngredientItem>> {
        const validation = validateIngredientInput(input);
        if (!validation.isValid || !validation.cleanData) {
            return { success: false, error: "Ingredient validation failed.", validationErrors: validation.errors };
        }

        try {
            const created = await this.persistence.createIngredient({
                name: validation.cleanData.name,
                slug: validation.cleanData.slug,
                description: validation.cleanData.description,
                category: validation.cleanData.category,
                imageUrl: validation.cleanData.imageUrl ?? null,
                storageInformation: validation.cleanData.storageInformation,
                safetyInformation: validation.cleanData.safetyInformation,
                status: validation.cleanData.status ?? "draft",
            });

            await this.persistence.logAudit({
                adminUserId,
                action: "ingredient_created",
                entityType: "ingredient",
                entityId: created.id,
                details: { name: created.name, slug: created.slug, status: created.status },
            });

            return { success: true, data: created, message: `Ingredient "${created.name}" created successfully.` };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to create ingredient." };
        }
    }

    async updateIngredient(adminUserId: string, id: string, input: unknown): Promise<AdminActionResponse<AdminIngredientItem>> {
        if (!isValidUuid(id)) return { success: false, error: "Invalid ingredient ID." };

        const validation = validateIngredientInput(input);
        if (!validation.isValid || !validation.cleanData) {
            return { success: false, error: "Ingredient validation failed.", validationErrors: validation.errors };
        }

        try {
            const updated = await this.persistence.updateIngredient(id, {
                name: validation.cleanData.name,
                slug: validation.cleanData.slug,
                description: validation.cleanData.description,
                category: validation.cleanData.category,
                imageUrl: validation.cleanData.imageUrl ?? null,
                storageInformation: validation.cleanData.storageInformation,
                safetyInformation: validation.cleanData.safetyInformation,
                status: validation.cleanData.status,
            });

            await this.persistence.logAudit({
                adminUserId,
                action: "ingredient_updated",
                entityType: "ingredient",
                entityId: id,
                details: { name: updated.name, status: updated.status },
            });

            return { success: true, data: updated, message: `Ingredient "${updated.name}" updated successfully.` };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to update ingredient." };
        }
    }

    async setIngredientStatus(adminUserId: string, id: string, status: ContentStatus): Promise<AdminActionResponse<AdminIngredientItem>> {
        if (!isValidUuid(id)) return { success: false, error: "Invalid ingredient ID." };
        try {
            const existing = await this.persistence.getIngredientById(id);
            if (!existing) return { success: false, error: "Ingredient not found." };

            const updated = await this.persistence.updateIngredient(id, { status });
            await this.persistence.logAudit({
                adminUserId,
                action: `ingredient_status_${status}`,
                entityType: "ingredient",
                entityId: id,
                details: { previousStatus: existing.status, newStatus: status },
            });

            return { success: true, data: updated, message: `Ingredient status changed to ${status}.` };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to change ingredient status." };
        }
    }

    // -------------------------------------------------------------
    // Recipes
    // -------------------------------------------------------------
    async listRecipes(filters?: { status?: ContentStatus; search?: string }): Promise<AdminActionResponse<AdminRecipeItem[]>> {
        try {
            const data = await this.persistence.listRecipes(filters);
            return { success: true, data };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to list recipes." };
        }
    }

    async getRecipe(id: string): Promise<
        AdminActionResponse<
            AdminRecipeItem & {
                ingredients: Array<{ ingredientId: string; name: string; quantity: number; unit: string; isOptional: boolean; preparationNote: string | null }>;
                steps: Array<{ id: string; stepNumber: number; instruction: string; timeMinutes: number | null; educationalNote: string | null }>;
            }
        >
    > {
        if (!isValidUuid(id)) return { success: false, error: "Invalid recipe ID." };
        try {
            const data = await this.persistence.getRecipeById(id);
            if (!data) return { success: false, error: "Recipe not found." };
            return { success: true, data };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to get recipe." };
        }
    }

    async createRecipe(adminUserId: string, input: unknown): Promise<AdminActionResponse<AdminRecipeItem>> {
        const validation = validateRecipeInput(input);
        if (!validation.isValid || !validation.cleanData) {
            return { success: false, error: "Recipe validation failed.", validationErrors: validation.errors };
        }

        const data = validation.cleanData;

        // If publishing, check ingredient availability
        if (data.status === "published" && data.ingredients) {
            for (const ing of data.ingredients) {
                const existingIng = await this.persistence.getIngredientById(ing.ingredientId);
                if (!existingIng || existingIng.status !== "published") {
                    return {
                        success: false,
                        error: `Cannot publish recipe: Ingredient "${existingIng?.name ?? ing.ingredientId}" is not published.`,
                    };
                }
            }
        }

        try {
            const created = await this.persistence.createRecipe(
                {
                    title: data.title,
                    slug: data.slug,
                    description: data.description,
                    cuisine: data.cuisine,
                    category: data.category,
                    difficulty: data.difficulty,
                    prepTimeMinutes: data.prepTimeMinutes,
                    cookTimeMinutes: data.cookTimeMinutes,
                    servings: data.servings,
                    imageUrl: data.imageUrl ?? null,
                    educationalInfo: data.educationalInfo,
                    safetyNotes: data.safetyNotes,
                    nutritionInfo: data.nutritionInfo ?? null,
                    status: data.status ?? "draft",
                },
                data.ingredients
                    ? data.ingredients.map((ing) => ({
                          ingredientId: ing.ingredientId,
                          quantity: ing.quantity,
                          unit: ing.unit,
                          isOptional: ing.isOptional ?? false,
                          preparationNote: ing.preparationNote ?? null,
                      }))
                    : [],
                data.steps
                    ? data.steps.map((s) => ({
                          stepNumber: s.stepNumber,
                          instruction: s.instruction,
                          timeMinutes: s.timeMinutes ?? null,
                          educationalNote: s.educationalNote ?? null,
                      }))
                    : [],
            );

            await this.persistence.logAudit({
                adminUserId,
                action: "recipe_created",
                entityType: "recipe",
                entityId: created.id,
                details: { title: created.title, slug: created.slug, status: created.status },
            });

            return { success: true, data: created, message: `Recipe "${created.title}" created successfully.` };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to create recipe." };
        }
    }

    async updateRecipe(adminUserId: string, id: string, input: unknown): Promise<AdminActionResponse<AdminRecipeItem>> {
        if (!isValidUuid(id)) return { success: false, error: "Invalid recipe ID." };

        const validation = validateRecipeInput(input);
        if (!validation.isValid || !validation.cleanData) {
            return { success: false, error: "Recipe validation failed.", validationErrors: validation.errors };
        }

        const data = validation.cleanData;

        if (data.status === "published" && data.ingredients) {
            for (const ing of data.ingredients) {
                const existingIng = await this.persistence.getIngredientById(ing.ingredientId);
                if (!existingIng || existingIng.status !== "published") {
                    return {
                        success: false,
                        error: `Cannot publish recipe: Ingredient "${existingIng?.name ?? ing.ingredientId}" is not published.`,
                    };
                }
            }
        }

        try {
            const updated = await this.persistence.updateRecipe(
                id,
                {
                    title: data.title,
                    slug: data.slug,
                    description: data.description,
                    cuisine: data.cuisine,
                    category: data.category,
                    difficulty: data.difficulty,
                    prepTimeMinutes: data.prepTimeMinutes,
                    cookTimeMinutes: data.cookTimeMinutes,
                    servings: data.servings,
                    imageUrl: data.imageUrl ?? null,
                    educationalInfo: data.educationalInfo,
                    safetyNotes: data.safetyNotes,
                    nutritionInfo: data.nutritionInfo ?? null,
                    status: data.status,
                },
                data.ingredients
                    ? data.ingredients.map((ing) => ({
                          ingredientId: ing.ingredientId,
                          quantity: ing.quantity,
                          unit: ing.unit,
                          isOptional: ing.isOptional ?? false,
                          preparationNote: ing.preparationNote ?? null,
                      }))
                    : undefined,
                data.steps
                    ? data.steps.map((s) => ({
                          stepNumber: s.stepNumber,
                          instruction: s.instruction,
                          timeMinutes: s.timeMinutes ?? null,
                          educationalNote: s.educationalNote ?? null,
                      }))
                    : undefined,
            );

            await this.persistence.logAudit({
                adminUserId,
                action: "recipe_updated",
                entityType: "recipe",
                entityId: id,
                details: { title: updated.title, status: updated.status },
            });

            return { success: true, data: updated, message: `Recipe "${updated.title}" updated successfully.` };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to update recipe." };
        }
    }

    async setRecipeStatus(adminUserId: string, id: string, status: ContentStatus): Promise<AdminActionResponse<AdminRecipeItem>> {
        if (!isValidUuid(id)) return { success: false, error: "Invalid recipe ID." };

        try {
            const existing = await this.persistence.getRecipeById(id);
            if (!existing) return { success: false, error: "Recipe not found." };

            if (status === "published") {
                if (!existing.steps || existing.steps.length === 0) {
                    return { success: false, error: "Cannot publish recipe without recipe steps." };
                }
                if (!existing.ingredients || existing.ingredients.length === 0) {
                    return { success: false, error: "Cannot publish recipe without ingredients." };
                }
                for (const ing of existing.ingredients) {
                    const existingIng = await this.persistence.getIngredientById(ing.ingredientId);
                    if (!existingIng || existingIng.status !== "published") {
                        return {
                            success: false,
                            error: `Cannot publish recipe: Linked ingredient "${existingIng?.name ?? ing.ingredientId}" is not published.`,
                        };
                    }
                }
            }

            const updated = await this.persistence.updateRecipe(id, { status });
            await this.persistence.logAudit({
                adminUserId,
                action: `recipe_status_${status}`,
                entityType: "recipe",
                entityId: id,
                details: { previousStatus: existing.status, newStatus: status },
            });

            return { success: true, data: updated, message: `Recipe status changed to ${status}.` };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to change recipe status." };
        }
    }

    // -------------------------------------------------------------
    // Learning Modules
    // -------------------------------------------------------------
    async listLearningModules(filters?: { status?: ContentStatus; search?: string }): Promise<AdminActionResponse<AdminLearningModuleItem[]>> {
        try {
            const data = await this.persistence.listLearningModules(filters);
            return { success: true, data };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to list learning modules." };
        }
    }

    async getLearningModule(id: string): Promise<AdminActionResponse<AdminLearningModuleItem>> {
        if (!isValidUuid(id)) return { success: false, error: "Invalid learning module ID." };
        try {
            const data = await this.persistence.getLearningModuleById(id);
            if (!data) return { success: false, error: "Learning module not found." };
            return { success: true, data };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to get learning module." };
        }
    }

    async createLearningModule(adminUserId: string, input: unknown): Promise<AdminActionResponse<AdminLearningModuleItem>> {
        const validation = validateLearningModuleInput(input);
        if (!validation.isValid || !validation.cleanData) {
            return { success: false, error: "Learning module validation failed.", validationErrors: validation.errors };
        }

        try {
            const created = await this.persistence.createLearningModule({
                title: validation.cleanData.title,
                slug: validation.cleanData.slug,
                description: validation.cleanData.description,
                category: validation.cleanData.category,
                difficulty: validation.cleanData.difficulty,
                content: validation.cleanData.content as Json,
                status: validation.cleanData.status ?? "draft",
            });

            await this.persistence.logAudit({
                adminUserId,
                action: "module_created",
                entityType: "learning_module",
                entityId: created.id,
                details: { title: created.title, slug: created.slug, status: created.status },
            });

            return { success: true, data: created, message: `Learning module "${created.title}" created successfully.` };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to create learning module." };
        }
    }

    async updateLearningModule(adminUserId: string, id: string, input: unknown): Promise<AdminActionResponse<AdminLearningModuleItem>> {
        if (!isValidUuid(id)) return { success: false, error: "Invalid learning module ID." };

        const validation = validateLearningModuleInput(input);
        if (!validation.isValid || !validation.cleanData) {
            return { success: false, error: "Learning module validation failed.", validationErrors: validation.errors };
        }

        try {
            const updated = await this.persistence.updateLearningModule(id, {
                title: validation.cleanData.title,
                slug: validation.cleanData.slug,
                description: validation.cleanData.description,
                category: validation.cleanData.category,
                difficulty: validation.cleanData.difficulty,
                content: validation.cleanData.content as Json,
                status: validation.cleanData.status,
            });

            await this.persistence.logAudit({
                adminUserId,
                action: "module_updated",
                entityType: "learning_module",
                entityId: id,
                details: { title: updated.title, status: updated.status },
            });

            return { success: true, data: updated, message: `Learning module "${updated.title}" updated successfully.` };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to update learning module." };
        }
    }

    async setLearningModuleStatus(adminUserId: string, id: string, status: ContentStatus): Promise<AdminActionResponse<AdminLearningModuleItem>> {
        if (!isValidUuid(id)) return { success: false, error: "Invalid learning module ID." };
        try {
            const existing = await this.persistence.getLearningModuleById(id);
            if (!existing) return { success: false, error: "Learning module not found." };

            const updated = await this.persistence.updateLearningModule(id, { status });
            await this.persistence.logAudit({
                adminUserId,
                action: `module_status_${status}`,
                entityType: "learning_module",
                entityId: id,
                details: { previousStatus: existing.status, newStatus: status },
            });

            return { success: true, data: updated, message: `Learning module status changed to ${status}.` };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to change learning module status." };
        }
    }

    // -------------------------------------------------------------
    // Questions
    // -------------------------------------------------------------
    async listQuestions(filters?: { status?: ContentStatus; moduleId?: string; search?: string }): Promise<AdminActionResponse<AdminQuestionItem[]>> {
        try {
            const data = await this.persistence.listQuestions(filters);
            return { success: true, data };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to list questions." };
        }
    }

    async getQuestion(id: string): Promise<AdminActionResponse<AdminQuestionItem>> {
        if (!isValidUuid(id)) return { success: false, error: "Invalid question ID." };
        try {
            const data = await this.persistence.getQuestionById(id);
            if (!data) return { success: false, error: "Question not found." };
            return { success: true, data };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to get question." };
        }
    }

    async createQuestion(adminUserId: string, input: unknown): Promise<AdminActionResponse<AdminQuestionItem>> {
        const validation = validateQuestionInput(input);
        if (!validation.isValid || !validation.cleanData) {
            return { success: false, error: "Question validation failed.", validationErrors: validation.errors };
        }

        const data = validation.cleanData;

        if (data.status === "published" && data.learningModuleId) {
            const existingMod = await this.persistence.getLearningModuleById(data.learningModuleId);
            if (!existingMod || existingMod.status !== "published") {
                return {
                    success: false,
                    error: `Cannot publish question: Associated learning module "${existingMod?.title ?? data.learningModuleId}" is not published.`,
                };
            }
        }

        try {
            const created = await this.persistence.createQuestion(
                {
                    slug: data.slug,
                    learningModuleId: data.learningModuleId ?? null,
                    questionText: data.questionText,
                    questionType: data.questionType,
                    explanation: data.explanation,
                    difficulty: data.difficulty,
                    status: data.status ?? "draft",
                },
                data.options ?? [],
            );

            await this.persistence.logAudit({
                adminUserId,
                action: "question_created",
                entityType: "question",
                entityId: created.id,
                details: { slug: created.slug, status: created.status },
            });

            return { success: true, data: created, message: `Question "${created.slug}" created successfully.` };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to create question." };
        }
    }

    async updateQuestion(adminUserId: string, id: string, input: unknown): Promise<AdminActionResponse<AdminQuestionItem>> {
        if (!isValidUuid(id)) return { success: false, error: "Invalid question ID." };

        const validation = validateQuestionInput(input);
        if (!validation.isValid || !validation.cleanData) {
            return { success: false, error: "Question validation failed.", validationErrors: validation.errors };
        }

        const data = validation.cleanData;

        if (data.status === "published" && data.learningModuleId) {
            const existingMod = await this.persistence.getLearningModuleById(data.learningModuleId);
            if (!existingMod || existingMod.status !== "published") {
                return {
                    success: false,
                    error: `Cannot publish question: Associated learning module "${existingMod?.title ?? data.learningModuleId}" is not published.`,
                };
            }
        }

        try {
            const updated = await this.persistence.updateQuestion(
                id,
                {
                    slug: data.slug,
                    learningModuleId: data.learningModuleId ?? null,
                    questionText: data.questionText,
                    questionType: data.questionType,
                    explanation: data.explanation,
                    difficulty: data.difficulty,
                    status: data.status,
                },
                data.options,
            );

            await this.persistence.logAudit({
                adminUserId,
                action: "question_updated",
                entityType: "question",
                entityId: id,
                details: { slug: updated.slug, status: updated.status },
            });

            return { success: true, data: updated, message: `Question "${updated.slug}" updated successfully.` };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to update question." };
        }
    }

    async setQuestionStatus(adminUserId: string, id: string, status: ContentStatus): Promise<AdminActionResponse<AdminQuestionItem>> {
        if (!isValidUuid(id)) return { success: false, error: "Invalid question ID." };

        try {
            const existing = await this.persistence.getQuestionById(id);
            if (!existing) return { success: false, error: "Question not found." };

            if (status === "published") {
                if (!existing.learningModuleId) {
                    return { success: false, error: "Cannot publish question without associating it with a learning module." };
                }
                const existingMod = await this.persistence.getLearningModuleById(existing.learningModuleId);
                if (!existingMod || existingMod.status !== "published") {
                    return {
                        success: false,
                        error: `Cannot publish question: Associated learning module "${existingMod?.title ?? existing.learningModuleId}" is not published.`,
                    };
                }
                if (!existing.options || existing.options.length < 2) {
                    return { success: false, error: "Cannot publish question with fewer than 2 options." };
                }
                const correctCount = existing.options.filter((o) => o.isCorrect).length;
                if (correctCount !== 1) {
                    return { success: false, error: `Cannot publish question: Must have exactly 1 correct option (found ${correctCount}).` };
                }
            }

            const updated = await this.persistence.updateQuestion(id, { status });
            await this.persistence.logAudit({
                adminUserId,
                action: `question_status_${status}`,
                entityType: "question",
                entityId: id,
                details: { previousStatus: existing.status, newStatus: status },
            });

            return { success: true, data: updated, message: `Question status changed to ${status}.` };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to change question status." };
        }
    }

    // -------------------------------------------------------------
    // Achievements
    // -------------------------------------------------------------
    async listAchievements(filters?: { status?: ContentStatus; search?: string }): Promise<AdminActionResponse<AdminAchievementItem[]>> {
        try {
            const data = await this.persistence.listAchievements(filters);
            return { success: true, data };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to list achievements." };
        }
    }

    async getAchievement(id: string): Promise<AdminActionResponse<AdminAchievementItem>> {
        if (!isValidUuid(id)) return { success: false, error: "Invalid achievement ID." };
        try {
            const data = await this.persistence.getAchievementById(id);
            if (!data) return { success: false, error: "Achievement not found." };
            return { success: true, data };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to get achievement." };
        }
    }

    async createAchievement(adminUserId: string, input: unknown): Promise<AdminActionResponse<AdminAchievementItem>> {
        const validation = validateAchievementInput(input);
        if (!validation.isValid || !validation.cleanData) {
            return { success: false, error: "Achievement validation failed.", validationErrors: validation.errors };
        }

        try {
            const created = await this.persistence.createAchievement({
                name: validation.cleanData.name,
                slug: validation.cleanData.slug,
                description: validation.cleanData.description,
                icon: validation.cleanData.icon,
                requirement: validation.cleanData.requirement as Json,
                status: validation.cleanData.status ?? "draft",
            });

            await this.persistence.logAudit({
                adminUserId,
                action: "achievement_created",
                entityType: "achievement",
                entityId: created.id,
                details: { name: created.name, slug: created.slug, status: created.status },
            });

            return { success: true, data: created, message: `Achievement "${created.name}" created successfully.` };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to create achievement." };
        }
    }

    async updateAchievement(adminUserId: string, id: string, input: unknown): Promise<AdminActionResponse<AdminAchievementItem>> {
        if (!isValidUuid(id)) return { success: false, error: "Invalid achievement ID." };

        const validation = validateAchievementInput(input);
        if (!validation.isValid || !validation.cleanData) {
            return { success: false, error: "Achievement validation failed.", validationErrors: validation.errors };
        }

        try {
            const updated = await this.persistence.updateAchievement(id, {
                name: validation.cleanData.name,
                slug: validation.cleanData.slug,
                description: validation.cleanData.description,
                icon: validation.cleanData.icon,
                requirement: validation.cleanData.requirement as Json,
                status: validation.cleanData.status,
            });

            await this.persistence.logAudit({
                adminUserId,
                action: "achievement_updated",
                entityType: "achievement",
                entityId: id,
                details: { name: updated.name, status: updated.status },
            });

            return { success: true, data: updated, message: `Achievement "${updated.name}" updated successfully.` };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to update achievement." };
        }
    }

    async setAchievementStatus(adminUserId: string, id: string, status: ContentStatus): Promise<AdminActionResponse<AdminAchievementItem>> {
        if (!isValidUuid(id)) return { success: false, error: "Invalid achievement ID." };
        try {
            const existing = await this.persistence.getAchievementById(id);
            if (!existing) return { success: false, error: "Achievement not found." };

            const updated = await this.persistence.updateAchievement(id, { status });
            await this.persistence.logAudit({
                adminUserId,
                action: `achievement_status_${status}`,
                entityType: "achievement",
                entityId: id,
                details: { previousStatus: existing.status, newStatus: status },
            });

            return { success: true, data: updated, message: `Achievement status changed to ${status}.` };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to change achievement status." };
        }
    }

    // -------------------------------------------------------------
    // Daily Challenges
    // -------------------------------------------------------------
    async listDailyChallenges(filters?: { status?: ContentStatus; search?: string }): Promise<AdminActionResponse<AdminDailyChallengeItem[]>> {
        try {
            const data = await this.persistence.listDailyChallenges(filters);
            return { success: true, data };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to list daily challenges." };
        }
    }

    async getDailyChallenge(id: string): Promise<AdminActionResponse<AdminDailyChallengeItem>> {
        if (!isValidUuid(id)) return { success: false, error: "Invalid challenge ID." };
        try {
            const data = await this.persistence.getDailyChallengeById(id);
            if (!data) return { success: false, error: "Daily challenge not found." };
            return { success: true, data };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to get daily challenge." };
        }
    }

    async createDailyChallenge(adminUserId: string, input: unknown): Promise<AdminActionResponse<AdminDailyChallengeItem>> {
        const validation = validateDailyChallengeInput(input);
        if (!validation.isValid || !validation.cleanData) {
            return { success: false, error: "Daily challenge validation failed.", validationErrors: validation.errors };
        }

        const data = validation.cleanData;

        // Check target entity existence and publication if published
        if (data.status === "published") {
            if (data.challengeType === "recipe" && data.recipeId) {
                const rec = await this.persistence.getRecipeById(data.recipeId);
                if (!rec || rec.status !== "published") {
                    return { success: false, error: `Cannot publish challenge: Target recipe "${rec?.title ?? data.recipeId}" is not published.` };
                }
            } else if (data.challengeType === "learning_module" && data.learningModuleId) {
                const mod = await this.persistence.getLearningModuleById(data.learningModuleId);
                if (!mod || mod.status !== "published") {
                    return { success: false, error: `Cannot publish challenge: Target learning module "${mod?.title ?? data.learningModuleId}" is not published.` };
                }
            } else if (data.challengeType === "ingredient" && data.ingredientId) {
                const ing = await this.persistence.getIngredientById(data.ingredientId);
                if (!ing || ing.status !== "published") {
                    return { success: false, error: `Cannot publish challenge: Target ingredient "${ing?.name ?? data.ingredientId}" is not published.` };
                }
            }
        }

        try {
            const created = await this.persistence.createDailyChallenge({
                challengeDate: data.challengeDate,
                title: data.title,
                slug: data.slug,
                description: data.description,
                challengeType: data.challengeType,
                recipeId: data.recipeId ?? null,
                learningModuleId: data.learningModuleId ?? null,
                ingredientId: data.ingredientId ?? null,
                status: data.status ?? "draft",
            });

            await this.persistence.logAudit({
                adminUserId,
                action: "challenge_created",
                entityType: "daily_challenge",
                entityId: created.id,
                details: { title: created.title, date: created.challengeDate, status: created.status },
            });

            return { success: true, data: created, message: `Daily challenge for ${created.challengeDate} created successfully.` };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to create daily challenge." };
        }
    }

    async updateDailyChallenge(adminUserId: string, id: string, input: unknown): Promise<AdminActionResponse<AdminDailyChallengeItem>> {
        if (!isValidUuid(id)) return { success: false, error: "Invalid challenge ID." };

        const validation = validateDailyChallengeInput(input);
        if (!validation.isValid || !validation.cleanData) {
            return { success: false, error: "Daily challenge validation failed.", validationErrors: validation.errors };
        }

        const data = validation.cleanData;

        if (data.status === "published") {
            if (data.challengeType === "recipe" && data.recipeId) {
                const rec = await this.persistence.getRecipeById(data.recipeId);
                if (!rec || rec.status !== "published") {
                    return { success: false, error: `Cannot publish challenge: Target recipe "${rec?.title ?? data.recipeId}" is not published.` };
                }
            } else if (data.challengeType === "learning_module" && data.learningModuleId) {
                const mod = await this.persistence.getLearningModuleById(data.learningModuleId);
                if (!mod || mod.status !== "published") {
                    return { success: false, error: `Cannot publish challenge: Target learning module "${mod?.title ?? data.learningModuleId}" is not published.` };
                }
            } else if (data.challengeType === "ingredient" && data.ingredientId) {
                const ing = await this.persistence.getIngredientById(data.ingredientId);
                if (!ing || ing.status !== "published") {
                    return { success: false, error: `Cannot publish challenge: Target ingredient "${ing?.name ?? data.ingredientId}" is not published.` };
                }
            }
        }

        try {
            const updated = await this.persistence.updateDailyChallenge(id, {
                challengeDate: data.challengeDate,
                title: data.title,
                slug: data.slug,
                description: data.description,
                challengeType: data.challengeType,
                recipeId: data.recipeId ?? null,
                learningModuleId: data.learningModuleId ?? null,
                ingredientId: data.ingredientId ?? null,
                status: data.status,
            });

            await this.persistence.logAudit({
                adminUserId,
                action: "challenge_updated",
                entityType: "daily_challenge",
                entityId: id,
                details: { title: updated.title, date: updated.challengeDate, status: updated.status },
            });

            return { success: true, data: updated, message: `Daily challenge updated successfully.` };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to update daily challenge." };
        }
    }

    async setDailyChallengeStatus(adminUserId: string, id: string, status: ContentStatus): Promise<AdminActionResponse<AdminDailyChallengeItem>> {
        if (!isValidUuid(id)) return { success: false, error: "Invalid challenge ID." };

        try {
            const existing = await this.persistence.getDailyChallengeById(id);
            if (!existing) return { success: false, error: "Daily challenge not found." };

            if (status === "published") {
                if (existing.challengeType === "recipe" && existing.recipeId) {
                    const rec = await this.persistence.getRecipeById(existing.recipeId);
                    if (!rec || rec.status !== "published") {
                        return { success: false, error: `Cannot publish challenge: Target recipe "${rec?.title ?? existing.recipeId}" is not published.` };
                    }
                } else if (existing.challengeType === "learning_module" && existing.learningModuleId) {
                    const mod = await this.persistence.getLearningModuleById(existing.learningModuleId);
                    if (!mod || mod.status !== "published") {
                        return { success: false, error: `Cannot publish challenge: Target learning module "${mod?.title ?? existing.learningModuleId}" is not published.` };
                    }
                } else if (existing.challengeType === "ingredient" && existing.ingredientId) {
                    const ing = await this.persistence.getIngredientById(existing.ingredientId);
                    if (!ing || ing.status !== "published") {
                        return { success: false, error: `Cannot publish challenge: Target ingredient "${ing?.name ?? existing.ingredientId}" is not published.` };
                    }
                }
            }

            const updated = await this.persistence.updateDailyChallenge(id, { status });
            await this.persistence.logAudit({
                adminUserId,
                action: `challenge_status_${status}`,
                entityType: "daily_challenge",
                entityId: id,
                details: { previousStatus: existing.status, newStatus: status },
            });

            return { success: true, data: updated, message: `Daily challenge status changed to ${status}.` };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : "Failed to change daily challenge status." };
        }
    }
}

// -------------------------------------------------------------
// Supabase Implementation
// -------------------------------------------------------------
function calculateStats(items: Array<{ status: ContentStatus }>): AdminContentStats {
    const stats: AdminContentStats = { total: items.length, draft: 0, review: 0, published: 0, archived: 0 };
    for (const item of items) {
        if (item.status === "draft") stats.draft++;
        else if (item.status === "review") stats.review++;
        else if (item.status === "published") stats.published++;
        else if (item.status === "archived") stats.archived++;
    }
    return stats;
}

export function createSupabaseAdminPersistence(client: SupabaseClient<Database>): AdminPersistence {
    return {
        async getDashboardSummary(): Promise<AdminDashboardSummary> {
            const [
                { data: ingredients },
                { data: recipes },
                { data: modules },
                { data: questions },
                { data: achievements },
                { data: challenges },
                { data: auditLogs },
            ] = await Promise.all([
                client.from("ingredients").select("status"),
                client.from("recipes").select("status"),
                client.from("learning_modules").select("status"),
                client.from("questions").select("status"),
                client.from("achievements").select("status"),
                client.from("daily_challenges").select("status"),
                client.from("admin_audit_logs").select("id, admin_user_id, action, entity_type, entity_id, details, created_at").order("created_at", { ascending: false }).limit(10),
            ]);

            const recentAuditLogs: AdminAuditLogItem[] = (auditLogs || []).map((l) => ({
                id: l.id,
                adminUserId: l.admin_user_id,
                action: l.action,
                entityType: l.entity_type,
                entityId: l.entity_id,
                details: l.details,
                createdAt: l.created_at,
            }));

            return {
                ingredients: calculateStats((ingredients as Array<{ status: ContentStatus }>) || []),
                recipes: calculateStats((recipes as Array<{ status: ContentStatus }>) || []),
                learningModules: calculateStats((modules as Array<{ status: ContentStatus }>) || []),
                questions: calculateStats((questions as Array<{ status: ContentStatus }>) || []),
                achievements: calculateStats((achievements as Array<{ status: ContentStatus }>) || []),
                dailyChallenges: calculateStats((challenges as Array<{ status: ContentStatus }>) || []),
                recentAuditLogs,
            };
        },

        async logAudit(entry): Promise<void> {
            try {
                await client.from("admin_audit_logs").insert({
                    admin_user_id: entry.adminUserId,
                    action: entry.action,
                    entity_type: entry.entityType,
                    entity_id: entry.entityId,
                    details: entry.details ?? {},
                });
            } catch {
                // Non-blocking audit log insert error
            }
        },

        // Ingredients
        async listIngredients(filters): Promise<AdminIngredientItem[]> {
            let query = client.from("ingredients").select("*").order("name");
            if (filters?.status) query = query.eq("status", filters.status);
            const { data, error } = await query;
            if (error) throw error;
            let items: AdminIngredientItem[] = (data || []).map((d) => ({
                id: d.id,
                name: d.name,
                slug: d.slug,
                description: d.description,
                category: d.category,
                imageUrl: d.image_url,
                storageInformation: d.storage_information,
                safetyInformation: d.safety_information,
                status: d.status,
                createdAt: d.created_at,
                updatedAt: d.updated_at,
            }));
            if (filters?.search) {
                const s = filters.search.toLowerCase();
                items = items.filter((i) => i.name.toLowerCase().includes(s) || i.category.toLowerCase().includes(s) || i.slug.includes(s));
            }
            return items;
        },

        async getIngredientById(id): Promise<AdminIngredientItem | null> {
            const { data, error } = await client.from("ingredients").select("*").eq("id", id).maybeSingle();
            if (error || !data) return null;
            return {
                id: data.id,
                name: data.name,
                slug: data.slug,
                description: data.description,
                category: data.category,
                imageUrl: data.image_url,
                storageInformation: data.storage_information,
                safetyInformation: data.safety_information,
                status: data.status,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };
        },

        async createIngredient(item): Promise<AdminIngredientItem> {
            const { data, error } = await client.from("ingredients").insert({
                name: item.name,
                slug: item.slug,
                description: item.description,
                category: item.category,
                image_url: item.imageUrl,
                storage_information: item.storageInformation,
                safety_information: item.safetyInformation,
                status: item.status,
            }).select().single();
            if (error || !data) throw error || new Error("Failed to insert ingredient.");
            return {
                id: data.id,
                name: data.name,
                slug: data.slug,
                description: data.description,
                category: data.category,
                imageUrl: data.image_url,
                storageInformation: data.storage_information,
                safetyInformation: data.safety_information,
                status: data.status,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };
        },

        async updateIngredient(id, item): Promise<AdminIngredientItem> {
            const updatePayload: IngredientUpdate = {};
            if (item.name !== undefined) updatePayload.name = item.name;
            if (item.slug !== undefined) updatePayload.slug = item.slug;
            if (item.description !== undefined) updatePayload.description = item.description;
            if (item.category !== undefined) updatePayload.category = item.category;
            if (item.imageUrl !== undefined) updatePayload.image_url = item.imageUrl;
            if (item.storageInformation !== undefined) updatePayload.storage_information = item.storageInformation;
            if (item.safetyInformation !== undefined) updatePayload.safety_information = item.safetyInformation;
            if (item.status !== undefined) updatePayload.status = item.status;

            const { data, error } = await client.from("ingredients").update(updatePayload).eq("id", id).select().single();
            if (error || !data) throw error || new Error("Failed to update ingredient.");
            return {
                id: data.id,
                name: data.name,
                slug: data.slug,
                description: data.description,
                category: data.category,
                imageUrl: data.image_url,
                storageInformation: data.storage_information,
                safetyInformation: data.safety_information,
                status: data.status,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };
        },

        // Recipes
        async listRecipes(filters): Promise<AdminRecipeItem[]> {
            let query = client.from("recipes").select("*").order("title");
            if (filters?.status) query = query.eq("status", filters.status);
            const { data, error } = await query;
            if (error) throw error;
            let items: AdminRecipeItem[] = (data || []).map((d) => ({
                id: d.id,
                title: d.title,
                slug: d.slug,
                description: d.description,
                cuisine: d.cuisine,
                category: d.category,
                difficulty: d.difficulty,
                prepTimeMinutes: d.prep_time_minutes,
                cookTimeMinutes: d.cook_time_minutes,
                servings: d.servings,
                imageUrl: d.image_url,
                educationalInfo: d.educational_info,
                safetyNotes: d.safety_notes,
                nutritionInfo: d.nutrition_info,
                status: d.status,
                createdAt: d.created_at,
                updatedAt: d.updated_at,
            }));
            if (filters?.search) {
                const s = filters.search.toLowerCase();
                items = items.filter((i) => i.title.toLowerCase().includes(s) || i.cuisine.toLowerCase().includes(s) || i.slug.includes(s));
            }
            return items;
        },

        async getRecipeById(id) {
            const [
                { data: recipe, error: recError },
                { data: recipeIngredients },
                { data: recipeSteps },
            ] = await Promise.all([
                client.from("recipes").select("*").eq("id", id).maybeSingle(),
                client.from("recipe_ingredients").select("ingredient_id, quantity, unit, is_optional, preparation_note").eq("recipe_id", id),
                client.from("recipe_steps").select("id, step_number, instruction, time_minutes, educational_note").eq("recipe_id", id).order("step_number"),
            ]);

            if (recError || !recipe) return null;

            let ingredientsWithNames: Array<{
                ingredientId: string;
                name: string;
                quantity: number;
                unit: string;
                isOptional: boolean;
                preparationNote: string | null;
            }> = [];

            if (recipeIngredients && recipeIngredients.length > 0) {
                const ingIds = recipeIngredients.map((r) => r.ingredient_id);
                const { data: names } = await client.from("ingredients").select("id, name").in("id", ingIds);
                const nameMap = new Map((names || []).map((n) => [n.id, n.name]));

                ingredientsWithNames = recipeIngredients.map((r) => ({
                    ingredientId: r.ingredient_id,
                    name: nameMap.get(r.ingredient_id) ?? "Unknown Ingredient",
                    quantity: Number(r.quantity),
                    unit: r.unit,
                    isOptional: r.is_optional,
                    preparationNote: r.preparation_note,
                }));
            }

            return {
                id: recipe.id,
                title: recipe.title,
                slug: recipe.slug,
                description: recipe.description,
                cuisine: recipe.cuisine,
                category: recipe.category,
                difficulty: recipe.difficulty,
                prepTimeMinutes: recipe.prep_time_minutes,
                cookTimeMinutes: recipe.cook_time_minutes,
                servings: recipe.servings,
                imageUrl: recipe.image_url,
                educationalInfo: recipe.educational_info,
                safetyNotes: recipe.safety_notes,
                nutritionInfo: recipe.nutrition_info,
                status: recipe.status,
                createdAt: recipe.created_at,
                updatedAt: recipe.updated_at,
                ingredients: ingredientsWithNames,
                steps: (recipeSteps || []).map((s) => ({
                    id: s.id,
                    stepNumber: s.step_number,
                    instruction: s.instruction,
                    timeMinutes: s.time_minutes,
                    educationalNote: s.educational_note,
                })),
            };
        },

        async createRecipe(recipe, ingredients, steps): Promise<AdminRecipeItem> {
            const { data: created, error: recError } = await client.from("recipes").insert({
                title: recipe.title,
                slug: recipe.slug,
                description: recipe.description,
                cuisine: recipe.cuisine,
                category: recipe.category,
                difficulty: recipe.difficulty,
                prep_time_minutes: recipe.prepTimeMinutes,
                cook_time_minutes: recipe.cookTimeMinutes,
                servings: recipe.servings,
                image_url: recipe.imageUrl,
                educational_info: recipe.educationalInfo,
                safety_notes: recipe.safetyNotes,
                nutrition_info: recipe.nutritionInfo,
                status: recipe.status,
            }).select().single();

            if (recError || !created) throw recError || new Error("Failed to insert recipe.");

            if (ingredients.length > 0) {
                await client.from("recipe_ingredients").insert(
                    ingredients.map((ing) => ({
                        recipe_id: created.id,
                        ingredient_id: ing.ingredientId,
                        quantity: ing.quantity,
                        unit: ing.unit,
                        is_optional: ing.isOptional,
                        preparation_note: ing.preparationNote,
                    })),
                );
            }

            if (steps.length > 0) {
                await client.from("recipe_steps").insert(
                    steps.map((st) => ({
                        recipe_id: created.id,
                        step_number: st.stepNumber,
                        instruction: st.instruction,
                        time_minutes: st.timeMinutes,
                        educational_note: st.educationalNote,
                    })),
                );
            }

            return {
                id: created.id,
                title: created.title,
                slug: created.slug,
                description: created.description,
                cuisine: created.cuisine,
                category: created.category,
                difficulty: created.difficulty,
                prepTimeMinutes: created.prep_time_minutes,
                cookTimeMinutes: created.cook_time_minutes,
                servings: created.servings,
                imageUrl: created.image_url,
                educationalInfo: created.educational_info,
                safetyNotes: created.safety_notes,
                nutritionInfo: created.nutrition_info,
                status: created.status,
                createdAt: created.created_at,
                updatedAt: created.updated_at,
                ingredientCount: ingredients.length,
                stepCount: steps.length,
            };
        },

        async updateRecipe(id, recipe, ingredients, steps): Promise<AdminRecipeItem> {
            const updatePayload: RecipeUpdate = {};
            if (recipe.title !== undefined) updatePayload.title = recipe.title;
            if (recipe.slug !== undefined) updatePayload.slug = recipe.slug;
            if (recipe.description !== undefined) updatePayload.description = recipe.description;
            if (recipe.cuisine !== undefined) updatePayload.cuisine = recipe.cuisine;
            if (recipe.category !== undefined) updatePayload.category = recipe.category;
            if (recipe.difficulty !== undefined) updatePayload.difficulty = recipe.difficulty;
            if (recipe.prepTimeMinutes !== undefined) updatePayload.prep_time_minutes = recipe.prepTimeMinutes;
            if (recipe.cookTimeMinutes !== undefined) updatePayload.cook_time_minutes = recipe.cookTimeMinutes;
            if (recipe.servings !== undefined) updatePayload.servings = recipe.servings;
            if (recipe.imageUrl !== undefined) updatePayload.image_url = recipe.imageUrl;
            if (recipe.educationalInfo !== undefined) updatePayload.educational_info = recipe.educationalInfo;
            if (recipe.safetyNotes !== undefined) updatePayload.safety_notes = recipe.safetyNotes;
            if (recipe.nutritionInfo !== undefined) updatePayload.nutrition_info = recipe.nutritionInfo;
            if (recipe.status !== undefined) updatePayload.status = recipe.status;

            const { data: updated, error: recError } = await client.from("recipes").update(updatePayload).eq("id", id).select().single();
            if (recError || !updated) throw recError || new Error("Failed to update recipe.");

            if (ingredients !== undefined) {
                await client.from("recipe_ingredients").delete().eq("recipe_id", id);
                if (ingredients.length > 0) {
                    await client.from("recipe_ingredients").insert(
                        ingredients.map((ing) => ({
                            recipe_id: id,
                            ingredient_id: ing.ingredientId,
                            quantity: ing.quantity,
                            unit: ing.unit,
                            is_optional: ing.isOptional,
                            preparation_note: ing.preparationNote,
                        })),
                    );
                }
            }

            if (steps !== undefined) {
                await client.from("recipe_steps").delete().eq("recipe_id", id);
                if (steps.length > 0) {
                    await client.from("recipe_steps").insert(
                        steps.map((st) => ({
                            recipe_id: id,
                            step_number: st.stepNumber,
                            instruction: st.instruction,
                            time_minutes: st.timeMinutes,
                            educational_note: st.educationalNote,
                        })),
                    );
                }
            }

            return {
                id: updated.id,
                title: updated.title,
                slug: updated.slug,
                description: updated.description,
                cuisine: updated.cuisine,
                category: updated.category,
                difficulty: updated.difficulty,
                prepTimeMinutes: updated.prep_time_minutes,
                cookTimeMinutes: updated.cook_time_minutes,
                servings: updated.servings,
                imageUrl: updated.image_url,
                educationalInfo: updated.educational_info,
                safetyNotes: updated.safety_notes,
                nutritionInfo: updated.nutrition_info,
                status: updated.status,
                createdAt: updated.created_at,
                updatedAt: updated.updated_at,
            };
        },

        // Learning modules
        async listLearningModules(filters): Promise<AdminLearningModuleItem[]> {
            let query = client.from("learning_modules").select("*").order("title");
            if (filters?.status) query = query.eq("status", filters.status);
            const { data, error } = await query;
            if (error) throw error;
            let items: AdminLearningModuleItem[] = (data || []).map((d) => ({
                id: d.id,
                title: d.title,
                slug: d.slug,
                description: d.description,
                category: d.category,
                difficulty: d.difficulty,
                content: d.content,
                status: d.status,
                createdAt: d.created_at,
                updatedAt: d.updated_at,
            }));
            if (filters?.search) {
                const s = filters.search.toLowerCase();
                items = items.filter((i) => i.title.toLowerCase().includes(s) || i.category.toLowerCase().includes(s) || i.slug.includes(s));
            }
            return items;
        },

        async getLearningModuleById(id): Promise<AdminLearningModuleItem | null> {
            const { data, error } = await client.from("learning_modules").select("*").eq("id", id).maybeSingle();
            if (error || !data) return null;
            return {
                id: data.id,
                title: data.title,
                slug: data.slug,
                description: data.description,
                category: data.category,
                difficulty: data.difficulty,
                content: data.content,
                status: data.status,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };
        },

        async createLearningModule(item): Promise<AdminLearningModuleItem> {
            const { data, error } = await client.from("learning_modules").insert({
                title: item.title,
                slug: item.slug,
                description: item.description,
                category: item.category,
                difficulty: item.difficulty,
                content: item.content,
                status: item.status,
            }).select().single();
            if (error || !data) throw error || new Error("Failed to insert learning module.");
            return {
                id: data.id,
                title: data.title,
                slug: data.slug,
                description: data.description,
                category: data.category,
                difficulty: data.difficulty,
                content: data.content,
                status: data.status,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };
        },

        async updateLearningModule(id, item): Promise<AdminLearningModuleItem> {
            const updatePayload: LearningModuleUpdate = {};
            if (item.title !== undefined) updatePayload.title = item.title;
            if (item.slug !== undefined) updatePayload.slug = item.slug;
            if (item.description !== undefined) updatePayload.description = item.description;
            if (item.category !== undefined) updatePayload.category = item.category;
            if (item.difficulty !== undefined) updatePayload.difficulty = item.difficulty;
            if (item.content !== undefined) updatePayload.content = item.content;
            if (item.status !== undefined) updatePayload.status = item.status;

            const { data, error } = await client.from("learning_modules").update(updatePayload).eq("id", id).select().single();
            if (error || !data) throw error || new Error("Failed to update learning module.");
            return {
                id: data.id,
                title: data.title,
                slug: data.slug,
                description: data.description,
                category: data.category,
                difficulty: data.difficulty,
                content: data.content,
                status: data.status,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };
        },

        // Questions
        async listQuestions(filters): Promise<AdminQuestionItem[]> {
            let query = client.from("questions").select("*").order("created_at", { ascending: false });
            if (filters?.status) query = query.eq("status", filters.status);
            if (filters?.moduleId) query = query.eq("learning_module_id", filters.moduleId);
            const { data, error } = await query;
            if (error) throw error;

            const moduleIds = Array.from(new Set((data || []).map((q) => q.learning_module_id).filter(Boolean))) as string[];
            let moduleTitleMap = new Map<string, string>();
            if (moduleIds.length > 0) {
                const { data: mods } = await client.from("learning_modules").select("id, title").in("id", moduleIds);
                moduleTitleMap = new Map((mods || []).map((m) => [m.id, m.title]));
            }

            let items: AdminQuestionItem[] = (data || []).map((d) => ({
                id: d.id,
                slug: d.slug,
                learningModuleId: d.learning_module_id,
                learningModuleTitle: d.learning_module_id ? moduleTitleMap.get(d.learning_module_id) ?? null : null,
                questionText: d.question_text,
                questionType: d.question_type,
                explanation: d.explanation,
                difficulty: d.difficulty,
                status: d.status,
                createdAt: d.created_at,
                updatedAt: d.updated_at,
            }));

            if (filters?.search) {
                const s = filters.search.toLowerCase();
                items = items.filter((i) => i.questionText.toLowerCase().includes(s) || i.slug.includes(s));
            }
            return items;
        },

        async getQuestionById(id): Promise<AdminQuestionItem | null> {
            const [{ data: question, error: qError }, { data: options }] = await Promise.all([
                client.from("questions").select("*").eq("id", id).maybeSingle(),
                client.from("question_options").select("id, option_text, option_order, is_correct").eq("question_id", id).order("option_order"),
            ]);

            if (qError || !question) return null;

            let moduleTitle: string | null = null;
            if (question.learning_module_id) {
                const { data: mod } = await client.from("learning_modules").select("title").eq("id", question.learning_module_id).maybeSingle();
                moduleTitle = mod?.title ?? null;
            }

            return {
                id: question.id,
                slug: question.slug,
                learningModuleId: question.learning_module_id,
                learningModuleTitle: moduleTitle,
                questionText: question.question_text,
                questionType: question.question_type,
                explanation: question.explanation,
                difficulty: question.difficulty,
                status: question.status,
                createdAt: question.created_at,
                updatedAt: question.updated_at,
                options: (options || []).map((o) => ({
                    id: o.id,
                    optionText: o.option_text,
                    optionOrder: o.option_order,
                    isCorrect: o.is_correct,
                })),
            };
        },

        async createQuestion(question, options): Promise<AdminQuestionItem> {
            const { data: created, error: qError } = await client.from("questions").insert({
                slug: question.slug,
                learning_module_id: question.learningModuleId,
                question_text: question.questionText,
                question_type: question.questionType,
                explanation: question.explanation,
                difficulty: question.difficulty,
                status: question.status,
            }).select().single();

            if (qError || !created) throw qError || new Error("Failed to insert question.");

            if (options.length > 0) {
                await client.from("question_options").insert(
                    options.map((opt) => ({
                        question_id: created.id,
                        option_text: opt.optionText,
                        option_order: opt.optionOrder,
                        is_correct: opt.isCorrect,
                    })),
                );
            }

            return {
                id: created.id,
                slug: created.slug,
                learningModuleId: created.learning_module_id,
                questionText: created.question_text,
                questionType: created.question_type,
                explanation: created.explanation,
                difficulty: created.difficulty,
                status: created.status,
                createdAt: created.created_at,
                updatedAt: created.updated_at,
                options: options.map((opt, idx) => ({
                    id: `opt-${idx}`,
                    optionText: opt.optionText,
                    optionOrder: opt.optionOrder,
                    isCorrect: opt.isCorrect,
                })),
            };
        },

        async updateQuestion(id, question, options): Promise<AdminQuestionItem> {
            const updatePayload: QuestionUpdate = {};
            if (question.slug !== undefined) updatePayload.slug = question.slug;
            if (question.learningModuleId !== undefined) updatePayload.learning_module_id = question.learningModuleId;
            if (question.questionText !== undefined) updatePayload.question_text = question.questionText;
            if (question.questionType !== undefined) updatePayload.question_type = question.questionType;
            if (question.explanation !== undefined) updatePayload.explanation = question.explanation;
            if (question.difficulty !== undefined) updatePayload.difficulty = question.difficulty;
            if (question.status !== undefined) updatePayload.status = question.status;

            const { data: updated, error: qError } = await client.from("questions").update(updatePayload).eq("id", id).select().single();
            if (qError || !updated) throw qError || new Error("Failed to update question.");

            if (options !== undefined) {
                await client.from("question_options").delete().eq("question_id", id);
                if (options.length > 0) {
                    await client.from("question_options").insert(
                        options.map((opt) => ({
                            question_id: id,
                            option_text: opt.optionText,
                            option_order: opt.optionOrder,
                            is_correct: opt.isCorrect,
                        })),
                    );
                }
            }

            return {
                id: updated.id,
                slug: updated.slug,
                learningModuleId: updated.learning_module_id,
                questionText: updated.question_text,
                questionType: updated.question_type,
                explanation: updated.explanation,
                difficulty: updated.difficulty,
                status: updated.status,
                createdAt: updated.created_at,
                updatedAt: updated.updated_at,
            };
        },

        // Achievements
        async listAchievements(filters): Promise<AdminAchievementItem[]> {
            let query = client.from("achievements").select("*").order("name");
            if (filters?.status) query = query.eq("status", filters.status);
            const { data, error } = await query;
            if (error) throw error;
            let items: AdminAchievementItem[] = (data || []).map((d) => ({
                id: d.id,
                name: d.name,
                slug: d.slug,
                description: d.description,
                icon: d.icon,
                requirement: d.requirement,
                status: d.status,
                createdAt: d.created_at,
            }));
            if (filters?.search) {
                const s = filters.search.toLowerCase();
                items = items.filter((i) => i.name.toLowerCase().includes(s) || i.slug.includes(s));
            }
            return items;
        },

        async getAchievementById(id): Promise<AdminAchievementItem | null> {
            const { data, error } = await client.from("achievements").select("*").eq("id", id).maybeSingle();
            if (error || !data) return null;
            return {
                id: data.id,
                name: data.name,
                slug: data.slug,
                description: data.description,
                icon: data.icon,
                requirement: data.requirement,
                status: data.status,
                createdAt: data.created_at,
            };
        },

        async createAchievement(item): Promise<AdminAchievementItem> {
            const { data, error } = await client.from("achievements").insert({
                name: item.name,
                slug: item.slug,
                description: item.description,
                icon: item.icon,
                requirement: item.requirement,
                status: item.status,
            }).select().single();
            if (error || !data) throw error || new Error("Failed to insert achievement.");
            return {
                id: data.id,
                name: data.name,
                slug: data.slug,
                description: data.description,
                icon: data.icon,
                requirement: data.requirement,
                status: data.status,
                createdAt: data.created_at,
            };
        },

        async updateAchievement(id, item): Promise<AdminAchievementItem> {
            const updatePayload: AchievementUpdate = {};
            if (item.name !== undefined) updatePayload.name = item.name;
            if (item.slug !== undefined) updatePayload.slug = item.slug;
            if (item.description !== undefined) updatePayload.description = item.description;
            if (item.icon !== undefined) updatePayload.icon = item.icon;
            if (item.requirement !== undefined) updatePayload.requirement = item.requirement;
            if (item.status !== undefined) updatePayload.status = item.status;

            const { data, error } = await client.from("achievements").update(updatePayload).eq("id", id).select().single();
            if (error || !data) throw error || new Error("Failed to update achievement.");
            return {
                id: data.id,
                name: data.name,
                slug: data.slug,
                description: data.description,
                icon: data.icon,
                requirement: data.requirement,
                status: data.status,
                createdAt: data.created_at,
            };
        },

        // Daily Challenges
        async listDailyChallenges(filters): Promise<AdminDailyChallengeItem[]> {
            let query = client.from("daily_challenges").select("*").order("challenge_date", { ascending: false });
            if (filters?.status) query = query.eq("status", filters.status);
            const { data, error } = await query;
            if (error) throw error;
            let items: AdminDailyChallengeItem[] = (data || []).map((d) => ({
                id: d.id,
                challengeDate: d.challenge_date,
                title: d.title,
                slug: d.slug,
                description: d.description,
                challengeType: d.challenge_type,
                recipeId: d.recipe_id,
                learningModuleId: d.learning_module_id,
                ingredientId: d.ingredient_id,
                status: d.status,
                createdAt: d.created_at,
            }));
            if (filters?.search) {
                const s = filters.search.toLowerCase();
                items = items.filter((i) => i.title.toLowerCase().includes(s) || i.challengeDate.includes(s) || i.slug.includes(s));
            }
            return items;
        },

        async getDailyChallengeById(id): Promise<AdminDailyChallengeItem | null> {
            const { data, error } = await client.from("daily_challenges").select("*").eq("id", id).maybeSingle();
            if (error || !data) return null;

            let recipeTitle: string | null = null;
            let moduleTitle: string | null = null;
            let ingredientName: string | null = null;

            if (data.recipe_id) {
                const { data: rec } = await client.from("recipes").select("title").eq("id", data.recipe_id).maybeSingle();
                recipeTitle = rec?.title ?? null;
            }
            if (data.learning_module_id) {
                const { data: mod } = await client.from("learning_modules").select("title").eq("id", data.learning_module_id).maybeSingle();
                moduleTitle = mod?.title ?? null;
            }
            if (data.ingredient_id) {
                const { data: ing } = await client.from("ingredients").select("name").eq("id", data.ingredient_id).maybeSingle();
                ingredientName = ing?.name ?? null;
            }

            return {
                id: data.id,
                challengeDate: data.challenge_date,
                title: data.title,
                slug: data.slug,
                description: data.description,
                challengeType: data.challenge_type,
                recipeId: data.recipe_id,
                recipeTitle,
                learningModuleId: data.learning_module_id,
                learningModuleTitle: moduleTitle,
                ingredientId: data.ingredient_id,
                ingredientName,
                status: data.status,
                createdAt: data.created_at,
            };
        },

        async createDailyChallenge(item): Promise<AdminDailyChallengeItem> {
            const { data, error } = await client.from("daily_challenges").insert({
                challenge_date: item.challengeDate,
                title: item.title,
                slug: item.slug,
                description: item.description,
                challenge_type: item.challengeType,
                recipe_id: item.recipeId,
                learning_module_id: item.learningModuleId,
                ingredient_id: item.ingredientId,
                status: item.status,
            }).select().single();
            if (error || !data) throw error || new Error("Failed to insert daily challenge.");
            return {
                id: data.id,
                challengeDate: data.challenge_date,
                title: data.title,
                slug: data.slug,
                description: data.description,
                challengeType: data.challenge_type,
                recipeId: data.recipe_id,
                learningModuleId: data.learning_module_id,
                ingredientId: data.ingredient_id,
                status: data.status,
                createdAt: data.created_at,
            };
        },

        async updateDailyChallenge(id, item): Promise<AdminDailyChallengeItem> {
            const updatePayload: DailyChallengeUpdate = {};
            if (item.challengeDate !== undefined) updatePayload.challenge_date = item.challengeDate;
            if (item.title !== undefined) updatePayload.title = item.title;
            if (item.slug !== undefined) updatePayload.slug = item.slug;
            if (item.description !== undefined) updatePayload.description = item.description;
            if (item.challengeType !== undefined) updatePayload.challenge_type = item.challengeType;
            if (item.recipeId !== undefined) updatePayload.recipe_id = item.recipeId;
            if (item.learningModuleId !== undefined) updatePayload.learning_module_id = item.learningModuleId;
            if (item.ingredientId !== undefined) updatePayload.ingredient_id = item.ingredientId;
            if (item.status !== undefined) updatePayload.status = item.status;

            const { data, error } = await client.from("daily_challenges").update(updatePayload).eq("id", id).select().single();
            if (error || !data) throw error || new Error("Failed to update daily challenge.");
            return {
                id: data.id,
                challengeDate: data.challenge_date,
                title: data.title,
                slug: data.slug,
                description: data.description,
                challengeType: data.challenge_type,
                recipeId: data.recipe_id,
                learningModuleId: data.learning_module_id,
                ingredientId: data.ingredient_id,
                status: data.status,
                createdAt: data.created_at,
            };
        },
    };
}
