"use server";

import { requireAdminUser } from "@/lib/auth/current-user";
import { AdminService, createSupabaseAdminPersistence } from "./service";
import type {
    AdminActionResponse,
    AdminDashboardSummary,
    AdminIngredientItem,
    AdminRecipeItem,
    AdminLearningModuleItem,
    AdminQuestionItem,
    AdminAchievementItem,
    AdminDailyChallengeItem,
    ContentStatus,
} from "./types";

async function getAdminService() {
    const auth = await requireAdminUser();
    if (!auth.success) {
        return { error: auth.error, service: null, user: null };
    }
    const persistence = createSupabaseAdminPersistence(auth.supabase);
    const service = new AdminService(persistence);
    return { error: null, service, user: auth.user };
}

// -------------------------------------------------------------
// Dashboard Action
// -------------------------------------------------------------
export async function getAdminDashboardAction(): Promise<AdminActionResponse<AdminDashboardSummary>> {
    const { error, service } = await getAdminService();
    if (error || !service) return { success: false, error: error ?? "Unauthorized" };
    return service.getDashboard();
}

// -------------------------------------------------------------
// Ingredients Actions
// -------------------------------------------------------------
export async function listAdminIngredientsAction(filters?: { status?: ContentStatus; search?: string }): Promise<AdminActionResponse<AdminIngredientItem[]>> {
    const { error, service } = await getAdminService();
    if (error || !service) return { success: false, error: error ?? "Unauthorized" };
    return service.listIngredients(filters);
}

export async function getAdminIngredientAction(id: string): Promise<AdminActionResponse<AdminIngredientItem>> {
    const { error, service } = await getAdminService();
    if (error || !service) return { success: false, error: error ?? "Unauthorized" };
    return service.getIngredient(id);
}

export async function createAdminIngredientAction(input: unknown): Promise<AdminActionResponse<AdminIngredientItem>> {
    const { error, service, user } = await getAdminService();
    if (error || !service || !user) return { success: false, error: error ?? "Unauthorized" };
    return service.createIngredient(user.id, input);
}

export async function updateAdminIngredientAction(id: string, input: unknown): Promise<AdminActionResponse<AdminIngredientItem>> {
    const { error, service, user } = await getAdminService();
    if (error || !service || !user) return { success: false, error: error ?? "Unauthorized" };
    return service.updateIngredient(user.id, id, input);
}

export async function setAdminIngredientStatusAction(id: string, status: ContentStatus): Promise<AdminActionResponse<AdminIngredientItem>> {
    const { error, service, user } = await getAdminService();
    if (error || !service || !user) return { success: false, error: error ?? "Unauthorized" };
    return service.setIngredientStatus(user.id, id, status);
}

// -------------------------------------------------------------
// Recipes Actions
// -------------------------------------------------------------
export async function listAdminRecipesAction(filters?: { status?: ContentStatus; search?: string }): Promise<AdminActionResponse<AdminRecipeItem[]>> {
    const { error, service } = await getAdminService();
    if (error || !service) return { success: false, error: error ?? "Unauthorized" };
    return service.listRecipes(filters);
}

export async function getAdminRecipeAction(id: string): Promise<
    AdminActionResponse<
        AdminRecipeItem & {
            ingredients: Array<{ ingredientId: string; name: string; quantity: number; unit: string; isOptional: boolean; preparationNote: string | null }>;
            steps: Array<{ id: string; stepNumber: number; instruction: string; timeMinutes: number | null; educationalNote: string | null }>;
        }
    >
> {
    const { error, service } = await getAdminService();
    if (error || !service) return { success: false, error: error ?? "Unauthorized" };
    return service.getRecipe(id);
}

export async function createAdminRecipeAction(input: unknown): Promise<AdminActionResponse<AdminRecipeItem>> {
    const { error, service, user } = await getAdminService();
    if (error || !service || !user) return { success: false, error: error ?? "Unauthorized" };
    return service.createRecipe(user.id, input);
}

export async function updateAdminRecipeAction(id: string, input: unknown): Promise<AdminActionResponse<AdminRecipeItem>> {
    const { error, service, user } = await getAdminService();
    if (error || !service || !user) return { success: false, error: error ?? "Unauthorized" };
    return service.updateRecipe(user.id, id, input);
}

export async function setAdminRecipeStatusAction(id: string, status: ContentStatus): Promise<AdminActionResponse<AdminRecipeItem>> {
    const { error, service, user } = await getAdminService();
    if (error || !service || !user) return { success: false, error: error ?? "Unauthorized" };
    return service.setRecipeStatus(user.id, id, status);
}

// -------------------------------------------------------------
// Learning Modules Actions
// -------------------------------------------------------------
export async function listAdminLearningModulesAction(filters?: { status?: ContentStatus; search?: string }): Promise<AdminActionResponse<AdminLearningModuleItem[]>> {
    const { error, service } = await getAdminService();
    if (error || !service) return { success: false, error: error ?? "Unauthorized" };
    return service.listLearningModules(filters);
}

export async function getAdminLearningModuleAction(id: string): Promise<AdminActionResponse<AdminLearningModuleItem>> {
    const { error, service } = await getAdminService();
    if (error || !service) return { success: false, error: error ?? "Unauthorized" };
    return service.getLearningModule(id);
}

export async function createAdminLearningModuleAction(input: unknown): Promise<AdminActionResponse<AdminLearningModuleItem>> {
    const { error, service, user } = await getAdminService();
    if (error || !service || !user) return { success: false, error: error ?? "Unauthorized" };
    return service.createLearningModule(user.id, input);
}

export async function updateAdminLearningModuleAction(id: string, input: unknown): Promise<AdminActionResponse<AdminLearningModuleItem>> {
    const { error, service, user } = await getAdminService();
    if (error || !service || !user) return { success: false, error: error ?? "Unauthorized" };
    return service.updateLearningModule(user.id, id, input);
}

export async function setAdminLearningModuleStatusAction(id: string, status: ContentStatus): Promise<AdminActionResponse<AdminLearningModuleItem>> {
    const { error, service, user } = await getAdminService();
    if (error || !service || !user) return { success: false, error: error ?? "Unauthorized" };
    return service.setLearningModuleStatus(user.id, id, status);
}

// -------------------------------------------------------------
// Questions Actions
// -------------------------------------------------------------
export async function listAdminQuestionsAction(filters?: { status?: ContentStatus; moduleId?: string; search?: string }): Promise<AdminActionResponse<AdminQuestionItem[]>> {
    const { error, service } = await getAdminService();
    if (error || !service) return { success: false, error: error ?? "Unauthorized" };
    return service.listQuestions(filters);
}

export async function getAdminQuestionAction(id: string): Promise<AdminActionResponse<AdminQuestionItem>> {
    const { error, service } = await getAdminService();
    if (error || !service) return { success: false, error: error ?? "Unauthorized" };
    return service.getQuestion(id);
}

export async function createAdminQuestionAction(input: unknown): Promise<AdminActionResponse<AdminQuestionItem>> {
    const { error, service, user } = await getAdminService();
    if (error || !service || !user) return { success: false, error: error ?? "Unauthorized" };
    return service.createQuestion(user.id, input);
}

export async function updateAdminQuestionAction(id: string, input: unknown): Promise<AdminActionResponse<AdminQuestionItem>> {
    const { error, service, user } = await getAdminService();
    if (error || !service || !user) return { success: false, error: error ?? "Unauthorized" };
    return service.updateQuestion(user.id, id, input);
}

export async function setAdminQuestionStatusAction(id: string, status: ContentStatus): Promise<AdminActionResponse<AdminQuestionItem>> {
    const { error, service, user } = await getAdminService();
    if (error || !service || !user) return { success: false, error: error ?? "Unauthorized" };
    return service.setQuestionStatus(user.id, id, status);
}

// -------------------------------------------------------------
// Achievements Actions
// -------------------------------------------------------------
export async function listAdminAchievementsAction(filters?: { status?: ContentStatus; search?: string }): Promise<AdminActionResponse<AdminAchievementItem[]>> {
    const { error, service } = await getAdminService();
    if (error || !service) return { success: false, error: error ?? "Unauthorized" };
    return service.listAchievements(filters);
}

export async function getAdminAchievementAction(id: string): Promise<AdminActionResponse<AdminAchievementItem>> {
    const { error, service } = await getAdminService();
    if (error || !service) return { success: false, error: error ?? "Unauthorized" };
    return service.getAchievement(id);
}

export async function createAdminAchievementAction(input: unknown): Promise<AdminActionResponse<AdminAchievementItem>> {
    const { error, service, user } = await getAdminService();
    if (error || !service || !user) return { success: false, error: error ?? "Unauthorized" };
    return service.createAchievement(user.id, input);
}

export async function updateAdminAchievementAction(id: string, input: unknown): Promise<AdminActionResponse<AdminAchievementItem>> {
    const { error, service, user } = await getAdminService();
    if (error || !service || !user) return { success: false, error: error ?? "Unauthorized" };
    return service.updateAchievement(user.id, id, input);
}

export async function setAdminAchievementStatusAction(id: string, status: ContentStatus): Promise<AdminActionResponse<AdminAchievementItem>> {
    const { error, service, user } = await getAdminService();
    if (error || !service || !user) return { success: false, error: error ?? "Unauthorized" };
    return service.setAchievementStatus(user.id, id, status);
}

// -------------------------------------------------------------
// Daily Challenges Actions
// -------------------------------------------------------------
export async function listAdminDailyChallengesAction(filters?: { status?: ContentStatus; search?: string }): Promise<AdminActionResponse<AdminDailyChallengeItem[]>> {
    const { error, service } = await getAdminService();
    if (error || !service) return { success: false, error: error ?? "Unauthorized" };
    return service.listDailyChallenges(filters);
}

export async function getAdminDailyChallengeAction(id: string): Promise<AdminActionResponse<AdminDailyChallengeItem>> {
    const { error, service } = await getAdminService();
    if (error || !service) return { success: false, error: error ?? "Unauthorized" };
    return service.getDailyChallenge(id);
}

export async function createAdminDailyChallengeAction(input: unknown): Promise<AdminActionResponse<AdminDailyChallengeItem>> {
    const { error, service, user } = await getAdminService();
    if (error || !service || !user) return { success: false, error: error ?? "Unauthorized" };
    return service.createDailyChallenge(user.id, input);
}

export async function updateAdminDailyChallengeAction(id: string, input: unknown): Promise<AdminActionResponse<AdminDailyChallengeItem>> {
    const { error, service, user } = await getAdminService();
    if (error || !service || !user) return { success: false, error: error ?? "Unauthorized" };
    return service.updateDailyChallenge(user.id, id, input);
}

export async function setAdminDailyChallengeStatusAction(id: string, status: ContentStatus): Promise<AdminActionResponse<AdminDailyChallengeItem>> {
    const { error, service, user } = await getAdminService();
    if (error || !service || !user) return { success: false, error: error ?? "Unauthorized" };
    return service.setDailyChallengeStatus(user.id, id, status);
}
