import { describe, expect, it } from "vitest";
import type {
    AdminPersistence,
    AdminIngredientItem,
    AdminRecipeItem,
    AdminLearningModuleItem,
    AdminQuestionItem,
    AdminAchievementItem,
    AdminDailyChallengeItem,
    AdminAuditLogItem,
    AdminDashboardSummary,
    ContentStatus,
} from "./types";
import { AdminService } from "./service";
import {
    validateIngredientInput,
    validateRecipeInput,
    validateLearningModuleInput,
    validateQuestionInput,
    validateAchievementInput,
    validateDailyChallengeInput,
    isValidSlug,
    isValidUuid,
} from "./validation";

const ADMIN_USER_ID = "admin-1111-4111-8111-111111111111";

function createMockAdminPersistence(): AdminPersistence & {
    ingredients: AdminIngredientItem[];
    recipes: Array<AdminRecipeItem & {
        ingredients: Array<{ ingredientId: string; name: string; quantity: number; unit: string; isOptional: boolean; preparationNote: string | null }>;
        steps: Array<{ id: string; stepNumber: number; instruction: string; timeMinutes: number | null; educationalNote: string | null }>;
    }>;
    modules: AdminLearningModuleItem[];
    questions: AdminQuestionItem[];
    achievements: AdminAchievementItem[];
    challenges: AdminDailyChallengeItem[];
    auditLogs: AdminAuditLogItem[];
} {
    const ingredients: AdminIngredientItem[] = [];
    const recipes: Array<AdminRecipeItem & {
        ingredients: Array<{ ingredientId: string; name: string; quantity: number; unit: string; isOptional: boolean; preparationNote: string | null }>;
        steps: Array<{ id: string; stepNumber: number; instruction: string; timeMinutes: number | null; educationalNote: string | null }>;
    }> = [];
    const modules: AdminLearningModuleItem[] = [];
    const questions: AdminQuestionItem[] = [];
    const achievements: AdminAchievementItem[] = [];
    const challenges: AdminDailyChallengeItem[] = [];
    const auditLogs: AdminAuditLogItem[] = [];

    return {
        ingredients,
        recipes,
        modules,
        questions,
        achievements,
        challenges,
        auditLogs,

        async getDashboardSummary(): Promise<AdminDashboardSummary> {
            const countStats = (items: Array<{ status: ContentStatus }>) => ({
                total: items.length,
                draft: items.filter((i) => i.status === "draft").length,
                review: items.filter((i) => i.status === "review").length,
                published: items.filter((i) => i.status === "published").length,
                archived: items.filter((i) => i.status === "archived").length,
            });

            return {
                ingredients: countStats(ingredients),
                recipes: countStats(recipes),
                learningModules: countStats(modules),
                questions: countStats(questions),
                achievements: countStats(achievements),
                dailyChallenges: countStats(challenges),
                recentAuditLogs: auditLogs.slice(0, 10),
            };
        },

        async logAudit(entry) {
            auditLogs.unshift({
                id: `log-${Date.now()}-${Math.random()}`,
                adminUserId: entry.adminUserId,
                action: entry.action,
                entityType: entry.entityType,
                entityId: entry.entityId,
                details: entry.details ?? {},
                createdAt: new Date().toISOString(),
            });
        },

        // Ingredients
        async listIngredients(filters) {
            let res = [...ingredients];
            if (filters?.status) res = res.filter((i) => i.status === filters.status);
            if (filters?.search) res = res.filter((i) => i.name.toLowerCase().includes(filters.search!.toLowerCase()));
            return res;
        },
        async getIngredientById(id) {
            return ingredients.find((i) => i.id === id) ?? null;
        },
        async createIngredient(item) {
            const created: AdminIngredientItem = {
                ...item,
                id: `11111111-2222-3333-4444-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            ingredients.push(created);
            return created;
        },
        async updateIngredient(id, item) {
            const idx = ingredients.findIndex((i) => i.id === id);
            if (idx === -1) throw new Error("Not found");
            const updated = { ...ingredients[idx], ...item, updatedAt: new Date().toISOString() };
            ingredients[idx] = updated;
            return updated;
        },

        // Recipes
        async listRecipes(filters) {
            let res = [...recipes];
            if (filters?.status) res = res.filter((r) => r.status === filters.status);
            if (filters?.search) res = res.filter((r) => r.title.toLowerCase().includes(filters.search!.toLowerCase()));
            return res;
        },
        async getRecipeById(id) {
            return recipes.find((r) => r.id === id) ?? null;
        },
        async createRecipe(recipe, ings, steps) {
            const id = `22222222-3333-4444-5555-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
            const created = {
                ...recipe,
                id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ingredients: ings.map((ing) => ({
                    ...ing,
                    name: ingredients.find((i) => i.id === ing.ingredientId)?.name ?? "Ingredient",
                    preparationNote: ing.preparationNote ?? null,
                })),
                steps: steps.map((s) => ({
                    ...s,
                    id: `step-${s.stepNumber}`,
                    educationalNote: s.educationalNote ?? null,
                    timeMinutes: s.timeMinutes ?? null,
                })),
            };
            recipes.push(created);
            return created;
        },
        async updateRecipe(id, recipe, ings, steps) {
            const idx = recipes.findIndex((r) => r.id === id);
            if (idx === -1) throw new Error("Not found");
            const existing = recipes[idx];
            const updated = {
                ...existing,
                ...recipe,
                ingredients: ings !== undefined
                    ? ings.map((ing) => ({ ...ing, name: ingredients.find((i) => i.id === ing.ingredientId)?.name ?? "Ingredient", preparationNote: ing.preparationNote ?? null }))
                    : existing.ingredients,
                steps: steps !== undefined
                    ? steps.map((s) => ({ ...s, id: `step-${s.stepNumber}`, educationalNote: s.educationalNote ?? null, timeMinutes: s.timeMinutes ?? null }))
                    : existing.steps,
                updatedAt: new Date().toISOString(),
            };
            recipes[idx] = updated;
            return updated;
        },

        // Learning modules
        async listLearningModules(filters) {
            let res = [...modules];
            if (filters?.status) res = res.filter((m) => m.status === filters.status);
            return res;
        },
        async getLearningModuleById(id) {
            return modules.find((m) => m.id === id) ?? null;
        },
        async createLearningModule(item) {
            const created: AdminLearningModuleItem = {
                ...item,
                id: `33333333-4444-5555-6666-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            modules.push(created);
            return created;
        },
        async updateLearningModule(id, item) {
            const idx = modules.findIndex((m) => m.id === id);
            if (idx === -1) throw new Error("Not found");
            const updated = { ...modules[idx], ...item, updatedAt: new Date().toISOString() };
            modules[idx] = updated;
            return updated;
        },

        // Questions
        async listQuestions(filters) {
            let res = [...questions];
            if (filters?.status) res = res.filter((q) => q.status === filters.status);
            if (filters?.moduleId) res = res.filter((q) => q.learningModuleId === filters.moduleId);
            return res;
        },
        async getQuestionById(id) {
            return questions.find((q) => q.id === id) ?? null;
        },
        async createQuestion(question, options) {
            const created: AdminQuestionItem = {
                ...question,
                id: `44444444-5555-6666-7777-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                options: options.map((opt, idx) => ({ id: `opt-${idx}`, ...opt })),
            };
            questions.push(created);
            return created;
        },
        async updateQuestion(id, question, options) {
            const idx = questions.findIndex((q) => q.id === id);
            if (idx === -1) throw new Error("Not found");
            const existing = questions[idx];
            const updated = {
                ...existing,
                ...question,
                options: options !== undefined
                    ? options.map((opt, i) => ({ id: `opt-${i}`, ...opt }))
                    : existing.options,
                updatedAt: new Date().toISOString(),
            };
            questions[idx] = updated;
            return updated;
        },

        // Achievements
        async listAchievements(filters) {
            let res = [...achievements];
            if (filters?.status) res = res.filter((a) => a.status === filters.status);
            return res;
        },
        async getAchievementById(id) {
            return achievements.find((a) => a.id === id) ?? null;
        },
        async createAchievement(item) {
            const created: AdminAchievementItem = {
                ...item,
                id: `55555555-6666-7777-8888-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
                createdAt: new Date().toISOString(),
            };
            achievements.push(created);
            return created;
        },
        async updateAchievement(id, item) {
            const idx = achievements.findIndex((a) => a.id === id);
            if (idx === -1) throw new Error("Not found");
            const updated = { ...achievements[idx], ...item };
            achievements[idx] = updated;
            return updated;
        },

        // Daily Challenges
        async listDailyChallenges(filters) {
            let res = [...challenges];
            if (filters?.status) res = res.filter((c) => c.status === filters.status);
            return res;
        },
        async getDailyChallengeById(id) {
            return challenges.find((c) => c.id === id) ?? null;
        },
        async createDailyChallenge(item) {
            const created: AdminDailyChallengeItem = {
                ...item,
                id: `66666666-7777-8888-9999-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
                createdAt: new Date().toISOString(),
            };
            challenges.push(created);
            return created;
        },
        async updateDailyChallenge(id: string, item: Partial<Omit<AdminDailyChallengeItem, "id" | "createdAt" | "recipeTitle" | "learningModuleTitle" | "ingredientName">>): Promise<AdminDailyChallengeItem> {
            const idx = challenges.findIndex((c) => c.id === id);
            if (idx === -1) throw new Error("Not found");
            const updated = { ...challenges[idx], ...item };
            challenges[idx] = updated;
            return updated;
        },
    };
}

describe("Phase 4.6 — Admin & Content Management Foundation", () => {
    describe("1. Validation Engine", () => {
        it("validates slug rules (kebab-case, alphanumeric, hyphens)", () => {
            expect(isValidSlug("olive-oil")).toBe(true);
            expect(isValidSlug("knife-skills-101")).toBe(true);
            expect(isValidSlug("garlic")).toBe(true);
            expect(isValidSlug("Olive Oil")).toBe(false);
            expect(isValidSlug("olive_oil")).toBe(false);
            expect(isValidSlug("-olive-oil")).toBe(false);
            expect(isValidSlug("")).toBe(false);
        });

        it("validates UUIDs properly", () => {
            expect(isValidUuid("11111111-2222-3333-4444-555555555555")).toBe(true);
            expect(isValidUuid("not-a-uuid")).toBe(false);
            expect(isValidUuid(null)).toBe(false);
        });

        it("validates ingredient creation and rejects invalid fields", () => {
            const invalid = validateIngredientInput({
                name: "",
                slug: "Invalid Slug",
                description: "",
                category: "",
                storageInformation: "",
                safetyInformation: "",
            });
            expect(invalid.isValid).toBe(false);
            expect(invalid.errors.name).toBeDefined();
            expect(invalid.errors.slug).toBeDefined();

            const valid = validateIngredientInput({
                name: "Fresh Basil",
                slug: "fresh-basil",
                description: "Aromatic herb used in Italian sauces.",
                category: "Herbs",
                storageInformation: "Keep stem ends in water at room temperature.",
                safetyInformation: "Wash thoroughly under cold running water.",
                status: "draft",
            });
            expect(valid.isValid).toBe(true);
            expect(valid.cleanData?.name).toBe("Fresh Basil");
        });

        it("validates recipe step sequencing and ingredient requirements for publishing", () => {
            const draftRecipe = validateRecipeInput({
                title: "Tomato Sauce",
                slug: "tomato-sauce",
                description: "Classic marinara sauce.",
                cuisine: "Italian",
                category: "Sauce",
                difficulty: "beginner",
                prepTimeMinutes: 10,
                cookTimeMinutes: 20,
                servings: 4,
                educationalInfo: "Simmering reduces water and concentrates acidity and sweetness.",
                safetyNotes: "Avoid hot bubbling sauce splatters.",
                status: "draft",
            });
            expect(draftRecipe.isValid).toBe(true);

            // Publishing without ingredients or steps must fail
            const incompletePublish = validateRecipeInput({
                ...draftRecipe.cleanData,
                status: "published",
                ingredients: [],
                steps: [],
            });
            expect(incompletePublish.isValid).toBe(false);
            expect(incompletePublish.errors.ingredients).toBeDefined();
            expect(incompletePublish.errors.steps).toBeDefined();

            // Publishing with non-sequential steps must fail
            const nonSequential = validateRecipeInput({
                ...draftRecipe.cleanData,
                status: "published",
                ingredients: [{ ingredientId: "11111111-2222-3333-4444-555555555555", quantity: 100, unit: "g" }],
                steps: [
                    { stepNumber: 1, instruction: "Step 1" },
                    { stepNumber: 3, instruction: "Step 3 (skipped 2)" },
                ],
            });
            expect(nonSequential.isValid).toBe(false);
            expect(nonSequential.errors.steps_sequence).toBeDefined();
        });

        it("validates question options rule: exactly ONE correct option required to publish", () => {
            const noCorrect = validateQuestionInput({
                slug: "saute-heat-level",
                learningModuleId: "11111111-2222-3333-4444-555555555555",
                questionText: "What heat level is used for sautéing?",
                questionType: "multiple_choice",
                explanation: "Sautéing requires medium-high heat.",
                difficulty: "beginner",
                status: "published",
                options: [
                    { optionText: "Low heat", optionOrder: 1, isCorrect: false },
                    { optionText: "Medium-high heat", optionOrder: 2, isCorrect: false },
                ],
            });
            expect(noCorrect.isValid).toBe(false);
            expect(noCorrect.errors.options_correct).toContain("exactly ONE correct");

            const multipleCorrect = validateQuestionInput({
                slug: "saute-heat-level",
                learningModuleId: "11111111-2222-3333-4444-555555555555",
                questionText: "What heat level is used for sautéing?",
                questionType: "multiple_choice",
                explanation: "Sautéing requires medium-high heat.",
                difficulty: "beginner",
                status: "published",
                options: [
                    { optionText: "Low heat", optionOrder: 1, isCorrect: true },
                    { optionText: "Medium-high heat", optionOrder: 2, isCorrect: true },
                ],
            });
            expect(multipleCorrect.isValid).toBe(false);
            expect(multipleCorrect.errors.options_correct).toContain("exactly ONE correct");

            const validQuestion = validateQuestionInput({
                slug: "saute-heat-level",
                learningModuleId: "11111111-2222-3333-4444-555555555555",
                questionText: "What heat level is used for sautéing?",
                questionType: "multiple_choice",
                explanation: "Sautéing requires medium-high heat.",
                difficulty: "beginner",
                status: "published",
                options: [
                    { optionText: "Low heat", optionOrder: 1, isCorrect: false },
                    { optionText: "Medium-high heat", optionOrder: 2, isCorrect: true },
                ],
            });
            expect(validQuestion.isValid).toBe(true);
        });

        it("validates learning module inputs and categories", () => {
            const invalidCat = validateLearningModuleInput({
                title: "Invalid Module",
                slug: "invalid-module",
                description: "Test description",
                category: "invalid_category",
                difficulty: "beginner",
                content: { text: "Hello" },
            });
            expect(invalidCat.isValid).toBe(false);
            expect(invalidCat.errors.category).toBeDefined();

            const validMod = validateLearningModuleInput({
                title: "Knife Skills 101",
                slug: "knife-skills-101",
                description: "Master the chef's knife grip and basic cuts.",
                category: "techniques",
                difficulty: "beginner",
                content: { overview: "Knife safety rules", sections: [] },
                status: "published",
            });
            expect(validMod.isValid).toBe(true);
            expect(validMod.cleanData?.title).toBe("Knife Skills 101");
        });

        it("validates achievement inputs and requirements", () => {
            const invalidSlug = validateAchievementInput({
                name: "Master Chef",
                slug: "Master Chef",
                description: "Cook 50 recipes.",
                icon: "trophy",
                requirement: { type: "recipe_mastery", count: 50 },
            });
            expect(invalidSlug.isValid).toBe(false);
            expect(invalidSlug.errors.slug).toBeDefined();

            const validAch = validateAchievementInput({
                name: "Knife Apprentice",
                slug: "knife-apprentice",
                description: "Complete your first knife skills module.",
                icon: "knife",
                requirement: { type: "module_completion", moduleId: "knife-101" },
                status: "published",
            });
            expect(validAch.isValid).toBe(true);
            expect(validAch.cleanData?.name).toBe("Knife Apprentice");
        });

        it("validates daily challenge target reference integrity matching challenge type", () => {
            const recipeChallengeNoId = validateDailyChallengeInput({
                challengeDate: "2026-10-04",
                title: "Cook Carbonara",
                slug: "cook-carbonara",
                description: "Master emulsion without scrambling eggs.",
                challengeType: "recipe",
                recipeId: null,
            });
            expect(recipeChallengeNoId.isValid).toBe(false);
            expect(recipeChallengeNoId.errors.recipeId).toBeDefined();

            const recipeChallengeExtraTarget = validateDailyChallengeInput({
                challengeDate: "2026-10-04",
                title: "Cook Carbonara",
                slug: "cook-carbonara",
                description: "Master emulsion without scrambling eggs.",
                challengeType: "recipe",
                recipeId: "11111111-2222-3333-4444-555555555555",
                ingredientId: "22222222-3333-4444-5555-666666666666",
            });
            expect(recipeChallengeExtraTarget.isValid).toBe(false);
            expect(recipeChallengeExtraTarget.errors.target).toBeDefined();
        });
    });

    describe("2. Admin Service & Lifecycle Management", () => {
        it("allows admin to create, edit, and transition ingredient lifecycle with audit logging", async () => {
            const persistence = createMockAdminPersistence();
            const service = new AdminService(persistence);

            // 1. Create ingredient in draft
            const createRes = await service.createIngredient(ADMIN_USER_ID, {
                name: "Extra Virgin Olive Oil",
                slug: "extra-virgin-olive-oil",
                description: "Cold-pressed olive oil.",
                category: "Oils",
                storageInformation: "Store in dark cupboard.",
                safetyInformation: "Keep away from high flame.",
                status: "draft",
            });

            expect(createRes.success).toBe(true);
            if (!createRes.success) throw new Error("Create failed");
            expect(createRes.data.status).toBe("draft");
            expect(persistence.auditLogs).toHaveLength(1);
            expect(persistence.auditLogs[0].action).toBe("ingredient_created");

            // 2. Publish ingredient
            const publishRes = await service.setIngredientStatus(ADMIN_USER_ID, createRes.data.id, "published");
            expect(publishRes.success).toBe(true);
            if (!publishRes.success) throw new Error("Publish failed");
            expect(publishRes.data.status).toBe("published");
            expect(persistence.auditLogs[0].action).toBe("ingredient_status_published");

            // 3. Archive ingredient
            const archiveRes = await service.setIngredientStatus(ADMIN_USER_ID, createRes.data.id, "archived");
            expect(archiveRes.success).toBe(true);
            if (!archiveRes.success) throw new Error("Archive failed");
            expect(archiveRes.data.status).toBe("archived");
            expect(persistence.auditLogs[0].action).toBe("ingredient_status_archived");
        });

        it("prevents publishing recipes when linked ingredients are unpublished", async () => {
            const persistence = createMockAdminPersistence();
            const service = new AdminService(persistence);

            // Create a draft ingredient
            const draftIng = await persistence.createIngredient({
                name: "Draft Truffle",
                slug: "draft-truffle",
                description: "Rare fungus.",
                category: "Produce",
                imageUrl: null,
                storageInformation: "Refrigerate.",
                safetyInformation: "Clean dirt.",
                status: "draft",
            });

            // Create recipe attempting to publish with draft ingredient
            const res = await service.createRecipe(ADMIN_USER_ID, {
                title: "Truffle Pasta",
                slug: "truffle-pasta",
                description: "Gourmet pasta.",
                cuisine: "Italian",
                category: "Main",
                difficulty: "advanced",
                prepTimeMinutes: 10,
                cookTimeMinutes: 10,
                servings: 2,
                educationalInfo: "Truffle aroma is volatile.",
                safetyNotes: "Clean properly.",
                status: "published",
                ingredients: [{ ingredientId: draftIng.id, quantity: 10, unit: "g" }],
                steps: [{ stepNumber: 1, instruction: "Shave truffle." }],
            });

            expect(res.success).toBe(false);
            if (res.success) throw new Error("Should fail");
            expect(res.error).toContain("is not published");
        });

        it("prevents publishing daily challenges when target entity is unpublished", async () => {
            const persistence = createMockAdminPersistence();
            const service = new AdminService(persistence);

            // Create draft learning module
            const draftMod = await persistence.createLearningModule({
                title: "Draft Heat Control",
                slug: "draft-heat-control",
                description: "Understanding temperature.",
                category: "techniques",
                difficulty: "intermediate",
                content: { text: "Heat info" },
                status: "draft",
            });

            const challengeRes = await service.createDailyChallenge(ADMIN_USER_ID, {
                challengeDate: "2026-10-05",
                title: "Daily Heat Quest",
                slug: "daily-heat-quest",
                description: "Learn temperature control.",
                challengeType: "learning_module",
                learningModuleId: draftMod.id,
                status: "published",
            });

            expect(challengeRes.success).toBe(false);
            if (challengeRes.success) throw new Error("Should fail");
            expect(challengeRes.error).toContain("is not published");
        });

        it("computes dashboard summary metrics accurately across all content categories", async () => {
            const persistence = createMockAdminPersistence();
            const service = new AdminService(persistence);

            await persistence.createIngredient({
                name: "Salt",
                slug: "salt",
                description: "Mineral.",
                category: "Seasoning",
                imageUrl: null,
                storageInformation: "Dry.",
                safetyInformation: "Safe.",
                status: "published",
            });

            await persistence.createIngredient({
                name: "Pepper",
                slug: "pepper",
                description: "Spice.",
                category: "Seasoning",
                imageUrl: null,
                storageInformation: "Dry.",
                safetyInformation: "Safe.",
                status: "draft",
            });

            const summaryRes = await service.getDashboard();
            expect(summaryRes.success).toBe(true);
            if (!summaryRes.success) throw new Error("Failed to get dashboard");
            expect(summaryRes.data.ingredients.total).toBe(2);
            expect(summaryRes.data.ingredients.published).toBe(1);
            expect(summaryRes.data.ingredients.draft).toBe(1);
        });
    });

    describe("3. Security Invariants & Separation of Concerns", () => {
        it("ensures admin operations do NOT grant or modify XP balances directly", () => {
            const service = new AdminService(createMockAdminPersistence());
            // Verify that AdminService contains NO methods for manipulating XP or leaderboards
            expect((service as unknown as Record<string, unknown>).awardXp).toBeUndefined();
            expect((service as unknown as Record<string, unknown>).setLeaderboardRank).toBeUndefined();
            expect((service as unknown as Record<string, unknown>).setStreak).toBeUndefined();
        });

        it("ensures audit log stores action details without passwords, secrets, or API keys", async () => {
            const persistence = createMockAdminPersistence();
            const service = new AdminService(persistence);

            await service.createIngredient(ADMIN_USER_ID, {
                name: "Garlic",
                slug: "garlic",
                description: "Aromatic allium.",
                category: "Produce",
                storageInformation: "Pantry.",
                safetyInformation: "Clean.",
                status: "published",
            });

            expect(persistence.auditLogs).toHaveLength(1);
            const entry = persistence.auditLogs[0];
            const serialized = JSON.stringify(entry);
            expect(serialized).not.toContain("password");
            expect(serialized).not.toContain("secret");
            expect(serialized).not.toContain("sk-");
            expect(serialized).not.toContain("AIza");
        });
    });
});
