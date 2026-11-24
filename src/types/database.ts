export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ContentStatus = "draft" | "review" | "published" | "archived";
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";
export type QuestionType = "multiple_choice" | "true_false" | "ordering";
export type DailyChallengeType = "recipe" | "learning_module" | "ingredient" | "technique";
export type LearningModuleCategory = "ingredients" | "techniques" | "tools" | "food_safety" | "nutrition" | "world_cuisine";
export type GameMode = "ingredient_quiz" | "recipe_builder" | "cooking_order" | "kitchen_challenge" | "food_detective";
export type GameSessionStatus = "active" | "completed" | "abandoned";

type Relation<
    ForeignKeyName extends string,
    Columns extends string[],
    ReferencedRelation extends string,
    ReferencedColumns extends string[],
> = {
    foreignKeyName: ForeignKeyName;
    columns: Columns;
    isOneToOne: false;
    referencedRelation: ReferencedRelation;
    referencedColumns: ReferencedColumns;
};

type Table<Row, RequiredInsert extends keyof Row, Relationships = []> = {
    Row: Row;
    Insert: Pick<Row, RequiredInsert> & Partial<Omit<Row, RequiredInsert>>;
    Update: Partial<Row>;
    Relationships: Relationships;
};

export type UserRole = "user" | "admin";
export type AdminEntityType = "ingredient" | "recipe" | "learning_module" | "question" | "achievement" | "daily_challenge";

type ProfileRow = {
    id: string;
    display_name: string;
    avatar_url: string | null;
    role: UserRole;
    created_at: string;
    updated_at: string;
};

type AdminAuditLogRow = {
    id: string;
    admin_user_id: string;
    action: string;
    entity_type: AdminEntityType;
    entity_id: string | null;
    details: Json;
    created_at: string;
};

type IngredientRow = {
    id: string;
    name: string;
    slug: string;
    description: string;
    category: string;
    image_url: string | null;
    storage_information: string;
    safety_information: string;
    status: ContentStatus;
    created_at: string;
    updated_at: string;
};

type RecipeRow = {
    id: string;
    title: string;
    slug: string;
    description: string;
    cuisine: string;
    category: string;
    difficulty: DifficultyLevel;
    prep_time_minutes: number;
    cook_time_minutes: number;
    servings: number;
    image_url: string | null;
    educational_info: string;
    safety_notes: string;
    nutrition_info: Json | null;
    status: ContentStatus;
    created_at: string;
    updated_at: string;
};

type RecipeIngredientRow = {
    recipe_id: string;
    ingredient_id: string;
    quantity: number;
    unit: string;
    is_optional: boolean;
    preparation_note: string | null;
};

type RecipeStepRow = {
    id: string;
    recipe_id: string;
    step_number: number;
    instruction: string;
    time_minutes: number | null;
    educational_note: string | null;
};

type LearningModuleRow = {
    id: string;
    title: string;
    slug: string;
    description: string;
    category: LearningModuleCategory;
    difficulty: DifficultyLevel;
    content: Json;
    status: ContentStatus;
    created_at: string;
    updated_at: string;
};

type QuestionRow = {
    id: string;
    slug: string;
    learning_module_id: string | null;
    question_text: string;
    question_type: QuestionType;
    explanation: string;
    difficulty: DifficultyLevel;
    status: ContentStatus;
    created_at: string;
    updated_at: string;
};

type QuestionOptionRow = {
    id: string;
    question_id: string;
    option_text: string;
    option_order: number;
    is_correct: boolean;
};

type AchievementRow = {
    id: string;
    name: string;
    slug: string;
    description: string;
    icon: string;
    requirement: Json;
    status: ContentStatus;
    created_at: string;
};

type DailyChallengeRow = {
    id: string;
    challenge_date: string;
    title: string;
    slug: string;
    description: string;
    challenge_type: DailyChallengeType;
    recipe_id: string | null;
    learning_module_id: string | null;
    ingredient_id: string | null;
    status: ContentStatus;
    created_at: string;
};

type GameSessionRow = {
    id: string;
    user_id: string;
    game_mode: GameMode;
    status: GameSessionStatus;
    started_at: string;
    completed_at: string | null;
    score: number;
    challenge_recipe_ids: string[];
    created_at: string;
    updated_at: string;
};

type GameAttemptRow = {
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
};

type UserLearningProgressRow = {
    id: string;
    user_id: string;
    learning_module_id: string | null;
    recipe_id: string | null;
    mastery_score: number;
    completed_at: string | null;
    last_attempted_at: string | null;
    created_at: string;
    updated_at: string;
};

export type XpSourceType = "game_answer" | "game_session_completion" | "learning_completion";

type UserXpTransactionRow = {
    id: string;
    user_id: string;
    amount: number;
    source_type: XpSourceType;
    source_id: string;
    description: string;
    created_at: string;
};

type UserAchievementRow = {
    id: string;
    user_id: string;
    achievement_id: string;
    unlocked_at: string;
    created_at: string;
};

type UserStreakRow = {
    id: string;
    user_id: string;
    current_streak: number;
    longest_streak: number;
    last_activity_date: string | null;
    created_at: string;
    updated_at: string;
};

type UserDailyChallengeRow = {
    id: string;
    user_id: string;
    daily_challenge_id: string;
    completed_at: string;
    created_at: string;
};

export interface Database {
    public: {
        Tables: {
            profiles: Table<ProfileRow, "id" | "display_name">;
            ingredients: Table<IngredientRow, "name" | "slug" | "description" | "category" | "storage_information" | "safety_information">;
            recipes: Table<RecipeRow, "title" | "slug" | "description" | "cuisine" | "category" | "difficulty" | "prep_time_minutes" | "cook_time_minutes" | "servings" | "educational_info" | "safety_notes">;
            recipe_ingredients: Table<RecipeIngredientRow, "recipe_id" | "ingredient_id" | "quantity" | "unit", [
                Relation<"recipe_ingredients_recipe_id_fkey", ["recipe_id"], "recipes", ["id"]>,
                Relation<"recipe_ingredients_ingredient_id_fkey", ["ingredient_id"], "ingredients", ["id"]>,
            ]>;
            recipe_steps: Table<RecipeStepRow, "recipe_id" | "step_number" | "instruction", [
                Relation<"recipe_steps_recipe_id_fkey", ["recipe_id"], "recipes", ["id"]>,
            ]>;
            learning_modules: Table<LearningModuleRow, "title" | "slug" | "description" | "category" | "difficulty" | "content">;
            questions: Table<QuestionRow, "slug" | "question_text" | "question_type" | "explanation" | "difficulty", [
                Relation<"questions_learning_module_id_fkey", ["learning_module_id"], "learning_modules", ["id"]>,
            ]>;
            question_options: Table<QuestionOptionRow, "question_id" | "option_text" | "option_order", [
                Relation<"question_options_question_id_fkey", ["question_id"], "questions", ["id"]>,
            ]>;
            achievements: Table<AchievementRow, "name" | "slug" | "description" | "icon" | "requirement">;
            user_achievements: Table<UserAchievementRow, "user_id" | "achievement_id", [
                Relation<"user_achievements_user_id_fkey", ["user_id"], "profiles", ["id"]>,
                Relation<"user_achievements_achievement_id_fkey", ["achievement_id"], "achievements", ["id"]>,
            ]>;
            user_streaks: Table<UserStreakRow, "user_id", [
                Relation<"user_streaks_user_id_fkey", ["user_id"], "profiles", ["id"]>,
            ]>;
            user_daily_challenges: Table<UserDailyChallengeRow, "user_id" | "daily_challenge_id", [
                Relation<"user_daily_challenges_user_id_fkey", ["user_id"], "profiles", ["id"]>,
                Relation<"user_daily_challenges_daily_challenge_id_fkey", ["daily_challenge_id"], "daily_challenges", ["id"]>,
            ]>;
            daily_challenges: Table<DailyChallengeRow, "challenge_date" | "title" | "slug" | "description" | "challenge_type", [
                Relation<"daily_challenges_recipe_id_fkey", ["recipe_id"], "recipes", ["id"]>,
                Relation<"daily_challenges_learning_module_id_fkey", ["learning_module_id"], "learning_modules", ["id"]>,
                Relation<"daily_challenges_ingredient_id_fkey", ["ingredient_id"], "ingredients", ["id"]>,
            ]>;
            game_sessions: Table<GameSessionRow, "user_id" | "game_mode" | "status", [
                Relation<"game_sessions_user_id_fkey", ["user_id"], "profiles", ["id"]>,
            ]>;
            game_attempts: Table<GameAttemptRow, "session_id" | "is_correct", [
                Relation<"game_attempts_session_id_fkey", ["session_id"], "game_sessions", ["id"]>,
                Relation<"game_attempts_question_id_fkey", ["question_id"], "questions", ["id"]>,
                Relation<"game_attempts_selected_option_id_fkey", ["selected_option_id"], "question_options", ["id"]>,
                Relation<"game_attempts_recipe_id_fkey", ["recipe_id"], "recipes", ["id"]>,
            ]>;
            user_learning_progress: Table<UserLearningProgressRow, "user_id" | "mastery_score", [
                Relation<"user_learning_progress_user_id_fkey", ["user_id"], "profiles", ["id"]>,
                Relation<"user_learning_progress_learning_module_id_fkey", ["learning_module_id"], "learning_modules", ["id"]>,
                Relation<"user_learning_progress_recipe_id_fkey", ["recipe_id"], "recipes", ["id"]>,
            ]>;
            user_xp_transactions: Table<UserXpTransactionRow, "user_id" | "amount" | "source_type" | "source_id" | "description", [
                Relation<"user_xp_transactions_user_id_fkey", ["user_id"], "profiles", ["id"]>,
            ]>;
            admin_audit_logs: Table<AdminAuditLogRow, "admin_user_id" | "action" | "entity_type", [
                Relation<"admin_audit_logs_admin_user_id_fkey", ["admin_user_id"], "profiles", ["id"]>,
            ]>;
        };
        Views: Record<string, never>;
        Functions: {
            is_admin: {
                Args: {
                    p_user_id?: string;
                };
                Returns: boolean;
            };
            award_user_xp: {
                Args: {
                    p_user_id: string;
                    p_amount: number;
                    p_source_type: string;
                    p_source_id: string;
                    p_description?: string;
                };
                Returns: string | null;
            };
            unlock_user_achievement: {
                Args: {
                    p_user_id: string;
                    p_achievement_id: string;
                };
                Returns: string | null;
            };
            record_user_streak: {
                Args: {
                    p_user_id: string;
                    p_session_id: string;
                };
                Returns: {
                    current_streak: number;
                    longest_streak: number;
                    last_activity_date: string;
                    incremented: boolean;
                } | null;
            };
            complete_user_daily_challenge: {
                Args: {
                    p_user_id: string;
                    p_daily_challenge_id: string;
                    p_session_id: string;
                };
                Returns: boolean;
            };
            get_leaderboard: {
                Args: {
                    p_page?: number;
                    p_page_size?: number;
                };
                Returns: Array<{
                    user_id: string;
                    rank: number;
                    display_name: string;
                    avatar_url: string | null;
                    total_xp: number;
                    total_count: number;
                }>;
            };
            get_user_leaderboard_rank: {
                Args: {
                    p_user_id: string;
                };
                Returns: Array<{
                    rank: number;
                    total_xp: number;
                    total_players: number;
                }>;
            };
        };
        Enums: {
            content_status: ContentStatus;
            difficulty_level: DifficultyLevel;
            question_type: QuestionType;
            daily_challenge_type: DailyChallengeType;
            game_mode: GameMode;
            game_session_status: GameSessionStatus;
        };
        CompositeTypes: Record<string, never>;
    };
}