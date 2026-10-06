import type {
    ContentStatus,
    DifficultyLevel,
    QuestionType,
    DailyChallengeType,
    LearningModuleCategory,
    IngredientInput,
    RecipeInput,
    LearningModuleInput,
    QuestionInput,
    AchievementInput,
    DailyChallengeInput,
    Json,
} from "./types";

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const VALID_STATUSES = new Set<ContentStatus>(["draft", "review", "published", "archived"]);
const VALID_DIFFICULTIES = new Set<DifficultyLevel>(["beginner", "intermediate", "advanced"]);
const VALID_QUESTION_TYPES = new Set<QuestionType>(["multiple_choice", "true_false", "ordering"]);
const VALID_DAILY_CHALLENGE_TYPES = new Set<DailyChallengeType>(["recipe", "learning_module", "ingredient", "technique"]);
const VALID_MODULE_CATEGORIES = new Set<LearningModuleCategory>([
    "ingredients",
    "techniques",
    "tools",
    "food_safety",
    "nutrition",
    "world_cuisine",
]);

export interface ValidationResult<T> {
    isValid: boolean;
    errors: Record<string, string>;
    cleanData?: T;
}

export function isValidSlug(slug: string): boolean {
    return typeof slug === "string" && slug.length >= 1 && slug.length <= 100 && SLUG_REGEX.test(slug);
}

export function isValidUuid(id: unknown): boolean {
    return typeof id === "string" && UUID_REGEX.test(id);
}

// 1. Validate Ingredient Input
export function validateIngredientInput(input: unknown): ValidationResult<IngredientInput> {
    const errors: Record<string, string> = {};

    if (!input || typeof input !== "object") {
        return { isValid: false, errors: { _general: "Invalid input payload." } };
    }

    const raw = input as Record<string, unknown>;

    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    if (name.length < 1 || name.length > 100) {
        errors.name = "Name must be between 1 and 100 characters.";
    }

    const slug = typeof raw.slug === "string" ? raw.slug.trim().toLowerCase() : "";
    if (!isValidSlug(slug)) {
        errors.slug = "Slug must contain only lowercase letters, numbers, and hyphens (e.g. 'extra-virgin-olive-oil').";
    }

    const description = typeof raw.description === "string" ? raw.description.trim() : "";
    if (description.length < 1 || description.length > 2000) {
        errors.description = "Description must be between 1 and 2000 characters.";
    }

    const category = typeof raw.category === "string" ? raw.category.trim() : "";
    if (category.length < 1 || category.length > 60) {
        errors.category = "Category must be between 1 and 60 characters.";
    }

    const storageInfo = typeof raw.storageInformation === "string" ? raw.storageInformation.trim() : "";
    if (storageInfo.length < 1 || storageInfo.length > 1000) {
        errors.storageInformation = "Storage information must be between 1 and 1000 characters.";
    }

    const safetyInfo = typeof raw.safetyInformation === "string" ? raw.safetyInformation.trim() : "";
    if (safetyInfo.length < 1 || safetyInfo.length > 1000) {
        errors.safetyInformation = "Safety information must be between 1 and 1000 characters.";
    }

    let status: ContentStatus = "draft";
    if (raw.status !== undefined && raw.status !== null) {
        if (typeof raw.status === "string" && VALID_STATUSES.has(raw.status as ContentStatus)) {
            status = raw.status as ContentStatus;
        } else {
            errors.status = "Invalid status. Must be draft, review, published, or archived.";
        }
    }

    const imageUrl = typeof raw.imageUrl === "string" && raw.imageUrl.trim().length > 0 ? raw.imageUrl.trim() : null;

    if (Object.keys(errors).length > 0) {
        return { isValid: false, errors };
    }

    return {
        isValid: true,
        errors: {},
        cleanData: {
            name,
            slug,
            description,
            category,
            imageUrl,
            storageInformation: storageInfo,
            safetyInformation: safetyInfo,
            status,
        },
    };
}

// 2. Validate Recipe Input
export function validateRecipeInput(input: unknown): ValidationResult<RecipeInput> {
    const errors: Record<string, string> = {};

    if (!input || typeof input !== "object") {
        return { isValid: false, errors: { _general: "Invalid input payload." } };
    }

    const raw = input as Record<string, unknown>;

    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    if (title.length < 1 || title.length > 160) {
        errors.title = "Title must be between 1 and 160 characters.";
    }

    const slug = typeof raw.slug === "string" ? raw.slug.trim().toLowerCase() : "";
    if (!isValidSlug(slug)) {
        errors.slug = "Slug must contain only lowercase letters, numbers, and hyphens.";
    }

    const description = typeof raw.description === "string" ? raw.description.trim() : "";
    if (description.length < 1 || description.length > 2000) {
        errors.description = "Description must be between 1 and 2000 characters.";
    }

    const cuisine = typeof raw.cuisine === "string" ? raw.cuisine.trim() : "";
    if (cuisine.length < 1 || cuisine.length > 100) {
        errors.cuisine = "Cuisine must be between 1 and 100 characters.";
    }

    const category = typeof raw.category === "string" ? raw.category.trim() : "";
    if (category.length < 1 || category.length > 80) {
        errors.category = "Category must be between 1 and 80 characters.";
    }

    const difficulty = typeof raw.difficulty === "string" && VALID_DIFFICULTIES.has(raw.difficulty as DifficultyLevel)
        ? (raw.difficulty as DifficultyLevel)
        : null;
    if (!difficulty) {
        errors.difficulty = "Difficulty must be 'beginner', 'intermediate', or 'advanced'.";
    }

    const prepTime = typeof raw.prepTimeMinutes === "number" ? Math.floor(raw.prepTimeMinutes) : -1;
    if (prepTime < 0 || prepTime > 1440) {
        errors.prepTimeMinutes = "Prep time must be between 0 and 1440 minutes.";
    }

    const cookTime = typeof raw.cookTimeMinutes === "number" ? Math.floor(raw.cookTimeMinutes) : -1;
    if (cookTime < 0 || cookTime > 1440) {
        errors.cookTimeMinutes = "Cook time must be between 0 and 1440 minutes.";
    }

    const servings = typeof raw.servings === "number" ? Math.floor(raw.servings) : -1;
    if (servings < 1 || servings > 100) {
        errors.servings = "Servings must be between 1 and 100.";
    }

    const educationalInfo = typeof raw.educationalInfo === "string" ? raw.educationalInfo.trim() : "";
    if (educationalInfo.length < 1 || educationalInfo.length > 2000) {
        errors.educationalInfo = "Educational info must be between 1 and 2000 characters.";
    }

    const safetyNotes = typeof raw.safetyNotes === "string" ? raw.safetyNotes.trim() : "";
    if (safetyNotes.length < 1 || safetyNotes.length > 2000) {
        errors.safetyNotes = "Safety notes must be between 1 and 2000 characters.";
    }

    let status: ContentStatus = "draft";
    if (raw.status !== undefined && raw.status !== null) {
        if (typeof raw.status === "string" && VALID_STATUSES.has(raw.status as ContentStatus)) {
            status = raw.status as ContentStatus;
        } else {
            errors.status = "Invalid status. Must be draft, review, published, or archived.";
        }
    }

    const imageUrl = typeof raw.imageUrl === "string" && raw.imageUrl.trim().length > 0 ? raw.imageUrl.trim() : null;

    // Validate Recipe Ingredients
    const cleanIngredients: RecipeInput["ingredients"] = [];
    if (Array.isArray(raw.ingredients)) {
        const seenIngredientIds = new Set<string>();
        for (let i = 0; i < raw.ingredients.length; i++) {
            const item = raw.ingredients[i] as Record<string, unknown>;
            if (!item || typeof item !== "object") {
                errors[`ingredients_${i}`] = `Ingredient at index ${i} is invalid.`;
                continue;
            }
            const ingredientId = typeof item.ingredientId === "string" ? item.ingredientId : "";
            if (!isValidUuid(ingredientId)) {
                errors[`ingredients_${i}_id`] = `Invalid ingredient ID at index ${i}.`;
            }
            if (seenIngredientIds.has(ingredientId)) {
                errors[`ingredients_${i}_duplicate`] = `Duplicate ingredient at index ${i}.`;
            }
            seenIngredientIds.add(ingredientId);

            const quantity = typeof item.quantity === "number" ? item.quantity : Number(item.quantity);
            if (isNaN(quantity) || quantity <= 0) {
                errors[`ingredients_${i}_qty`] = `Quantity at index ${i} must be greater than 0.`;
            }

            const unit = typeof item.unit === "string" ? item.unit.trim() : "";
            if (unit.length < 1 || unit.length > 40) {
                errors[`ingredients_${i}_unit`] = `Unit at index ${i} must be between 1 and 40 characters.`;
            }

            cleanIngredients.push({
                ingredientId,
                quantity: Number(quantity.toFixed(3)),
                unit,
                isOptional: Boolean(item.isOptional),
                preparationNote: typeof item.preparationNote === "string" ? item.preparationNote.trim() : null,
            });
        }
    }

    // Validate Recipe Steps
    const cleanSteps: RecipeInput["steps"] = [];
    if (Array.isArray(raw.steps)) {
        const seenStepNumbers = new Set<number>();
        for (let i = 0; i < raw.steps.length; i++) {
            const step = raw.steps[i] as Record<string, unknown>;
            if (!step || typeof step !== "object") {
                errors[`steps_${i}`] = `Step at index ${i} is invalid.`;
                continue;
            }

            const stepNumber = typeof step.stepNumber === "number" ? Math.floor(step.stepNumber) : i + 1;
            if (stepNumber < 1) {
                errors[`steps_${i}_num`] = `Step number at index ${i} must be greater than 0.`;
            }
            if (seenStepNumbers.has(stepNumber)) {
                errors[`steps_${i}_duplicate`] = `Duplicate step number ${stepNumber}.`;
            }
            seenStepNumbers.add(stepNumber);

            const instruction = typeof step.instruction === "string" ? step.instruction.trim() : "";
            if (instruction.length < 1 || instruction.length > 3000) {
                errors[`steps_${i}_inst`] = `Step instruction at index ${i} must be between 1 and 3000 characters.`;
            }

            const timeMinutes = typeof step.timeMinutes === "number" ? Math.floor(step.timeMinutes) : null;
            if (timeMinutes !== null && (timeMinutes < 0 || timeMinutes > 1440)) {
                errors[`steps_${i}_time`] = `Step time at index ${i} must be between 0 and 1440 minutes.`;
            }

            cleanSteps.push({
                stepNumber,
                instruction,
                timeMinutes,
                educationalNote: typeof step.educationalNote === "string" ? step.educationalNote.trim() : null,
            });
        }
    }

    // Publishing requirement check
    if (status === "published") {
        if (cleanIngredients.length === 0) {
            errors.ingredients = "A recipe must contain at least one ingredient to be published.";
        }
        if (cleanSteps.length === 0) {
            errors.steps = "A recipe must contain at least one step to be published.";
        }
        // Verify sequential steps (1, 2, 3...)
        const sortedStepNums = cleanSteps.map((s) => s.stepNumber).sort((a, b) => a - b);
        for (let i = 0; i < sortedStepNums.length; i++) {
            if (sortedStepNums[i] !== i + 1) {
                errors.steps_sequence = "Recipe steps must be strictly sequential (1, 2, 3...) without gaps to publish.";
                break;
            }
        }
    }

    if (Object.keys(errors).length > 0) {
        return { isValid: false, errors };
    }

    return {
        isValid: true,
        errors: {},
        cleanData: {
            title,
            slug,
            description,
            cuisine,
            category,
            difficulty: difficulty!,
            prepTimeMinutes: prepTime,
            cookTimeMinutes: cookTime,
            servings,
            imageUrl,
            educationalInfo,
            safetyNotes,
            nutritionInfo: (raw.nutritionInfo as Json) || null,
            status,
            ingredients: cleanIngredients,
            steps: cleanSteps,
        },
    };
}

// 3. Validate Learning Module Input
export function validateLearningModuleInput(input: unknown): ValidationResult<LearningModuleInput> {
    const errors: Record<string, string> = {};

    if (!input || typeof input !== "object") {
        return { isValid: false, errors: { _general: "Invalid input payload." } };
    }

    const raw = input as Record<string, unknown>;

    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    if (title.length < 1 || title.length > 160) {
        errors.title = "Title must be between 1 and 160 characters.";
    }

    const slug = typeof raw.slug === "string" ? raw.slug.trim().toLowerCase() : "";
    if (!isValidSlug(slug)) {
        errors.slug = "Slug must contain only lowercase letters, numbers, and hyphens.";
    }

    const description = typeof raw.description === "string" ? raw.description.trim() : "";
    if (description.length < 1 || description.length > 2000) {
        errors.description = "Description must be between 1 and 2000 characters.";
    }

    const category = typeof raw.category === "string" && VALID_MODULE_CATEGORIES.has(raw.category as LearningModuleCategory)
        ? (raw.category as LearningModuleCategory)
        : null;
    if (!category) {
        errors.category = "Category must be one of: ingredients, techniques, tools, food_safety, nutrition, world_cuisine.";
    }

    const difficulty = typeof raw.difficulty === "string" && VALID_DIFFICULTIES.has(raw.difficulty as DifficultyLevel)
        ? (raw.difficulty as DifficultyLevel)
        : null;
    if (!difficulty) {
        errors.difficulty = "Difficulty must be 'beginner', 'intermediate', or 'advanced'.";
    }

    const content = raw.content;
    if (!content || typeof content !== "object" || Array.isArray(content)) {
        errors.content = "Content must be a valid JSON object.";
    }

    let status: ContentStatus = "draft";
    if (raw.status !== undefined && raw.status !== null) {
        if (typeof raw.status === "string" && VALID_STATUSES.has(raw.status as ContentStatus)) {
            status = raw.status as ContentStatus;
        } else {
            errors.status = "Invalid status. Must be draft, review, published, or archived.";
        }
    }

    if (Object.keys(errors).length > 0) {
        return { isValid: false, errors };
    }

    return {
        isValid: true,
        errors: {},
        cleanData: {
            title,
            slug,
            description,
            category: category!,
            difficulty: difficulty!,
            content: content as Json,
            status,
        },
    };
}

// 4. Validate Question Input
export function validateQuestionInput(input: unknown): ValidationResult<QuestionInput> {
    const errors: Record<string, string> = {};

    if (!input || typeof input !== "object") {
        return { isValid: false, errors: { _general: "Invalid input payload." } };
    }

    const raw = input as Record<string, unknown>;

    const slug = typeof raw.slug === "string" ? raw.slug.trim().toLowerCase() : "";
    if (!isValidSlug(slug)) {
        errors.slug = "Slug must contain only lowercase letters, numbers, and hyphens.";
    }

    const learningModuleId = typeof raw.learningModuleId === "string" && raw.learningModuleId.trim().length > 0
        ? raw.learningModuleId.trim()
        : null;
    if (learningModuleId !== null && !isValidUuid(learningModuleId)) {
        errors.learningModuleId = "Invalid learning module ID.";
    }

    const questionText = typeof raw.questionText === "string" ? raw.questionText.trim() : "";
    if (questionText.length < 1 || questionText.length > 2000) {
        errors.questionText = "Question text must be between 1 and 2000 characters.";
    }

    const questionType = typeof raw.questionType === "string" && VALID_QUESTION_TYPES.has(raw.questionType as QuestionType)
        ? (raw.questionType as QuestionType)
        : null;
    if (!questionType) {
        errors.questionType = "Question type must be 'multiple_choice', 'true_false', or 'ordering'.";
    }

    const explanation = typeof raw.explanation === "string" ? raw.explanation.trim() : "";
    if (explanation.length < 1 || explanation.length > 2000) {
        errors.explanation = "Explanation must be between 1 and 2000 characters.";
    }

    const difficulty = typeof raw.difficulty === "string" && VALID_DIFFICULTIES.has(raw.difficulty as DifficultyLevel)
        ? (raw.difficulty as DifficultyLevel)
        : null;
    if (!difficulty) {
        errors.difficulty = "Difficulty must be 'beginner', 'intermediate', or 'advanced'.";
    }

    let status: ContentStatus = "draft";
    if (raw.status !== undefined && raw.status !== null) {
        if (typeof raw.status === "string" && VALID_STATUSES.has(raw.status as ContentStatus)) {
            status = raw.status as ContentStatus;
        } else {
            errors.status = "Invalid status. Must be draft, review, published, or archived.";
        }
    }

    // Validate options
    const cleanOptions: QuestionInput["options"] = [];
    let correctCount = 0;
    if (Array.isArray(raw.options)) {
        const seenOrders = new Set<number>();
        const seenTexts = new Set<string>();

        for (let i = 0; i < raw.options.length; i++) {
            const opt = raw.options[i] as Record<string, unknown>;
            if (!opt || typeof opt !== "object") {
                errors[`options_${i}`] = `Option at index ${i} is invalid.`;
                continue;
            }

            const optionText = typeof opt.optionText === "string" ? opt.optionText.trim() : "";
            if (optionText.length < 1 || optionText.length > 1000) {
                errors[`options_${i}_text`] = `Option text at index ${i} must be between 1 and 1000 characters.`;
            }
            if (seenTexts.has(optionText.toLowerCase())) {
                errors[`options_${i}_duplicate_text`] = `Duplicate option text "${optionText}".`;
            }
            seenTexts.add(optionText.toLowerCase());

            const optionOrder = typeof opt.optionOrder === "number" ? Math.floor(opt.optionOrder) : i + 1;
            if (optionOrder < 1) {
                errors[`options_${i}_order`] = `Option order must be greater than 0.`;
            }
            if (seenOrders.has(optionOrder)) {
                errors[`options_${i}_duplicate_order`] = `Duplicate option order ${optionOrder}.`;
            }
            seenOrders.add(optionOrder);

            const isCorrect = Boolean(opt.isCorrect);
            if (isCorrect) {
                correctCount++;
            }

            cleanOptions.push({
                optionText,
                optionOrder,
                isCorrect,
            });
        }
    }

    // Publishing requirement check for questions
    if (status === "published") {
        if (!learningModuleId) {
            errors.learningModuleId = "A published question must be associated with a learning module.";
        }
        if (cleanOptions.length < 2) {
            errors.options = "A published question must have at least 2 options.";
        }
        if (correctCount !== 1) {
            errors.options_correct = `A question must have exactly ONE correct option. Found ${correctCount}.`;
        }
    } else if (cleanOptions.length > 0 && correctCount > 1) {
        errors.options_correct = `Question options cannot have more than one correct answer. Found ${correctCount}.`;
    }

    if (Object.keys(errors).length > 0) {
        return { isValid: false, errors };
    }

    return {
        isValid: true,
        errors: {},
        cleanData: {
            slug,
            learningModuleId,
            questionText,
            questionType: questionType!,
            explanation,
            difficulty: difficulty!,
            status,
            options: cleanOptions,
        },
    };
}

// 5. Validate Achievement Input
export function validateAchievementInput(input: unknown): ValidationResult<AchievementInput> {
    const errors: Record<string, string> = {};

    if (!input || typeof input !== "object") {
        return { isValid: false, errors: { _general: "Invalid input payload." } };
    }

    const raw = input as Record<string, unknown>;

    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    if (name.length < 1 || name.length > 100) {
        errors.name = "Name must be between 1 and 100 characters.";
    }

    const slug = typeof raw.slug === "string" ? raw.slug.trim().toLowerCase() : "";
    if (!isValidSlug(slug)) {
        errors.slug = "Slug must contain only lowercase letters, numbers, and hyphens.";
    }

    const description = typeof raw.description === "string" ? raw.description.trim() : "";
    if (description.length < 1 || description.length > 1000) {
        errors.description = "Description must be between 1 and 1000 characters.";
    }

    const icon = typeof raw.icon === "string" ? raw.icon.trim() : "";
    if (icon.length < 1 || icon.length > 80) {
        errors.icon = "Icon must be between 1 and 80 characters.";
    }

    const requirement = raw.requirement;
    if (!requirement || typeof requirement !== "object" || Array.isArray(requirement)) {
        errors.requirement = "Requirement must be a valid JSON object.";
    }

    let status: ContentStatus = "draft";
    if (raw.status !== undefined && raw.status !== null) {
        if (typeof raw.status === "string" && VALID_STATUSES.has(raw.status as ContentStatus)) {
            status = raw.status as ContentStatus;
        } else {
            errors.status = "Invalid status. Must be draft, review, published, or archived.";
        }
    }

    if (Object.keys(errors).length > 0) {
        return { isValid: false, errors };
    }

    return {
        isValid: true,
        errors: {},
        cleanData: {
            name,
            slug,
            description,
            icon,
            requirement: requirement as Json,
            status,
        },
    };
}

// 6. Validate Daily Challenge Input
export function validateDailyChallengeInput(input: unknown): ValidationResult<DailyChallengeInput> {
    const errors: Record<string, string> = {};

    if (!input || typeof input !== "object") {
        return { isValid: false, errors: { _general: "Invalid input payload." } };
    }

    const raw = input as Record<string, unknown>;

    const challengeDate = typeof raw.challengeDate === "string" ? raw.challengeDate.trim() : "";
    if (!DATE_REGEX.test(challengeDate)) {
        errors.challengeDate = "Challenge date must be in YYYY-MM-DD format.";
    }

    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    if (title.length < 1 || title.length > 160) {
        errors.title = "Title must be between 1 and 160 characters.";
    }

    const slug = typeof raw.slug === "string" ? raw.slug.trim().toLowerCase() : "";
    if (!isValidSlug(slug)) {
        errors.slug = "Slug must contain only lowercase letters, numbers, and hyphens.";
    }

    const description = typeof raw.description === "string" ? raw.description.trim() : "";
    if (description.length < 1 || description.length > 2000) {
        errors.description = "Description must be between 1 and 2000 characters.";
    }

    const challengeType = typeof raw.challengeType === "string" && VALID_DAILY_CHALLENGE_TYPES.has(raw.challengeType as DailyChallengeType)
        ? (raw.challengeType as DailyChallengeType)
        : null;
    if (!challengeType) {
        errors.challengeType = "Challenge type must be 'recipe', 'learning_module', 'ingredient', or 'technique'.";
    }

    const recipeId = typeof raw.recipeId === "string" && raw.recipeId.trim().length > 0 ? raw.recipeId.trim() : null;
    const learningModuleId = typeof raw.learningModuleId === "string" && raw.learningModuleId.trim().length > 0 ? raw.learningModuleId.trim() : null;
    const ingredientId = typeof raw.ingredientId === "string" && raw.ingredientId.trim().length > 0 ? raw.ingredientId.trim() : null;

    if (recipeId && !isValidUuid(recipeId)) errors.recipeId = "Invalid recipe ID.";
    if (learningModuleId && !isValidUuid(learningModuleId)) errors.learningModuleId = "Invalid learning module ID.";
    if (ingredientId && !isValidUuid(ingredientId)) errors.ingredientId = "Invalid ingredient ID.";

    // Target reference consistency check matching database constraints
    if (challengeType === "recipe") {
        if (!recipeId) errors.recipeId = "Recipe challenge must specify a recipe.";
        if (learningModuleId || ingredientId) errors.target = "Recipe challenge cannot also specify learning module or ingredient.";
    } else if (challengeType === "learning_module") {
        if (!learningModuleId) errors.learningModuleId = "Learning module challenge must specify a learning module.";
        if (recipeId || ingredientId) errors.target = "Learning module challenge cannot also specify recipe or ingredient.";
    } else if (challengeType === "ingredient") {
        if (!ingredientId) errors.ingredientId = "Ingredient challenge must specify an ingredient.";
        if (recipeId || learningModuleId) errors.target = "Ingredient challenge cannot also specify recipe or learning module.";
    } else if (challengeType === "technique") {
        if (recipeId || learningModuleId || ingredientId) errors.target = "Technique challenge must not specify external target entities.";
    }

    let status: ContentStatus = "draft";
    if (raw.status !== undefined && raw.status !== null) {
        if (typeof raw.status === "string" && VALID_STATUSES.has(raw.status as ContentStatus)) {
            status = raw.status as ContentStatus;
        } else {
            errors.status = "Invalid status. Must be draft, review, published, or archived.";
        }
    }

    if (Object.keys(errors).length > 0) {
        return { isValid: false, errors };
    }

    return {
        isValid: true,
        errors: {},
        cleanData: {
            challengeDate,
            title,
            slug,
            description,
            challengeType: challengeType!,
            recipeId,
            learningModuleId,
            ingredientId,
            status,
        },
    };
}
