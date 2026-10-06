import type { ContentStatus, DifficultyLevel, LearningModuleCategory, QuestionType } from "../../types/database";

export type GameModeName =
    | "ingredient_quiz"
    | "recipe_builder"
    | "cooking_order"
    | "kitchen_challenge"
    | "food_detective";

export type GameSessionStatus = "active" | "completed" | "abandoned";

export type GameEngineErrorCode =
    | "UNAUTHENTICATED_USER"
    | "INVALID_GAME_MODE"
    | "SESSION_NOT_FOUND"
    | "SESSION_NOT_OWNED_BY_USER"
    | "SESSION_COMPLETED"
    | "SESSION_ABANDONED"
    | "INVALID_QUESTION"
    | "INVALID_OPTION"
    | "INVALID_STEP"
    | "OPTION_QUESTION_MISMATCH"
    | "INVALID_SUBMISSION"
    | "DUPLICATE_ATTEMPT"
    | "NO_RECIPE_CHALLENGES"
    | "INVALID_SESSION_TRANSITION"
    | "DATABASE_FAILURE";

export interface GameEngineError extends Error {
    code: GameEngineErrorCode;
}

export interface GameSessionRecord {
    id: string;
    user_id: string;
    game_mode: GameModeName;
    status: GameSessionStatus;
    started_at: string;
    completed_at: string | null;
    score: number;
    challenge_recipe_ids: string[];
    created_at: string;
    updated_at: string;
}

export interface GameAttemptRecord {
    id: string;
    session_id: string;
    question_id: string | null;
    selected_option_id: string | null;
    recipe_id: string | null;
    selected_ingredient_ids: string[] | null;
    selected_recipe_step_ids: string[] | null;
    is_correct: boolean;
    response_time_ms: number | null;
    created_at: string;
}

export interface QuestionOptionRecord {
    id: string;
    question_id: string;
    option_text: string;
    option_order: number;
    is_correct: boolean;
}

export interface QuestionRecord {
    id: string;
    slug: string;
    learning_module_id: string | null;
    learning_module_category: LearningModuleCategory | null;
    learning_module_status: ContentStatus | null;
    question_text: string;
    question_type: QuestionType;
    explanation: string;
    difficulty: DifficultyLevel;
    status: ContentStatus;
    created_at: string;
    updated_at: string;
    options: QuestionOptionRecord[];
}

export interface RecipeBuilderIngredientRecord {
    id: string;
    name: string;
    status: ContentStatus;
}

export interface RecipeBuilderRecipeRecord {
    id: string;
    title: string;
    description: string;
    status: ContentStatus;
    ingredients: RecipeBuilderIngredientRecord[];
}

export interface RecipeBuilderIngredientChoice {
    id: string;
    name: string;
}

export interface RecipeBuilderChallenge {
    recipeId: string;
    title: string;
    description: string;
    options: RecipeBuilderIngredientChoice[];
}

export interface RecipeBuilderSubmission {
    sessionId: string;
    recipeId: string;
    selectedIngredientIds: string[];
    responseTimeMs?: number | null;
}

export interface RecipeBuilderSubmissionResult {
    session: GameSessionRecord;
    attempt: GameAttemptRecord;
    isCorrect: boolean;
    scoreDelta: number;
    completedCount: number;
    correctCount: number;
    challengeCount: number;
    isComplete: boolean;
}

export interface CookingOrderStepRecord {
    id: string;
    recipe_id: string;
    step_number: number;
    instruction: string;
    time_minutes: number | null;
    educational_note: string | null;
}

export interface CookingOrderRecipeRecord {
    id: string;
    title: string;
    description: string;
    status: ContentStatus;
    steps: CookingOrderStepRecord[];
}

export interface CookingOrderStepChoice {
    id: string;
    instruction: string;
}

export interface CookingOrderChallenge {
    recipeId: string;
    title: string;
    description: string;
    steps: CookingOrderStepChoice[];
}

export interface CookingOrderSubmission {
    sessionId: string;
    recipeId: string;
    orderedStepIds: string[];
    responseTimeMs?: number | null;
}

export interface CookingOrderSubmissionResult {
    session: GameSessionRecord;
    attempt: GameAttemptRecord;
    isCorrect: boolean;
    scoreDelta: number;
    completedCount: number;
    correctCount: number;
    challengeCount: number;
    isComplete: boolean;
}

export interface LoadModeQuestionSet {
    mode: GameModeName;
    question: QuestionRecord | null;
    questionCount: number;
}

export interface GameModeDefinition {
    readonly modeId: GameModeName;
    readonly baseScore: number;
    readonly allowDuplicateQuestionAttempts: boolean;
    readonly allowQuestionSelection: (question: QuestionRecord) => boolean;
    readonly allowRecipeSelection?: (recipe: RecipeBuilderRecipeRecord) => boolean;
    readonly allowCookingOrderSelection?: (recipe: CookingOrderRecipeRecord) => boolean;
    readonly evaluateCorrectness: (question: QuestionRecord, selectedOptionId: string) => boolean;
    readonly evaluateRecipeBuilderAnswer?: (recipe: RecipeBuilderRecipeRecord, selectedIngredientIds: readonly string[], sessionId: string) => boolean;
    readonly evaluateCookingOrderAnswer?: (recipe: CookingOrderRecipeRecord, orderedStepIds: readonly string[]) => boolean;
    readonly calculateScore: (isCorrect: boolean) => number;
}

export interface CreateSessionInput {
    userId: string;
    gameMode: GameModeName;
    challengeRecipeIds?: string[];
}

export interface SubmitAnswerInput {
    userId: string;
    sessionId: string;
    questionId: string;
    selectedOptionId: string;
    responseTimeMs?: number | null;
    clientScore?: number;
    clientIsCorrect?: boolean;
}

export interface CompleteSessionInput {
    userId: string;
    sessionId: string;
}

export interface SessionSubmissionResult {
    session: GameSessionRecord;
    attempt: GameAttemptRecord;
    isCorrect: boolean;
    scoreDelta: number;
}

export interface GamePersistence {
    createSession(input: CreateSessionInput): Promise<GameSessionRecord>;
    getSessionById(sessionId: string): Promise<GameSessionRecord | null>;
    updateSession(sessionId: string, updates: Partial<GameSessionRecord>): Promise<GameSessionRecord | null>;
    getQuestionById(questionId: string): Promise<QuestionRecord | null>;
    getQuestionOptions(questionId: string): Promise<QuestionOptionRecord[]>;
    listQuestionsForMode(gameMode: GameModeName): Promise<QuestionRecord[]>;
    insertAttempt(input: {
        session_id: string;
        question_id: string | null;
        selected_option_id: string | null;
        recipe_id: string | null;
        selected_ingredient_ids: string[] | null;
        selected_recipe_step_ids: string[] | null;
        is_correct: boolean;
        response_time_ms: number | null;
    }): Promise<GameAttemptRecord>;
    getAttemptsForSession(sessionId: string): Promise<GameAttemptRecord[]>;
    countAttemptsForQuestion(sessionId: string, questionId: string): Promise<number>;
    listRecipeBuilderCatalog(): Promise<{
        recipes: RecipeBuilderRecipeRecord[];
        ingredients: RecipeBuilderIngredientChoice[];
    }>;
    getRecipeBuilderRecipeById(recipeId: string): Promise<RecipeBuilderRecipeRecord | null>;
    listPublishedIngredientsByIds(ingredientIds: string[]): Promise<RecipeBuilderIngredientChoice[]>;
    countAttemptsForRecipe(sessionId: string, recipeId: string): Promise<number>;
    listCookingOrderCatalog(): Promise<CookingOrderRecipeRecord[]>;
    getCookingOrderRecipeById(recipeId: string): Promise<CookingOrderRecipeRecord | null>;
}
