export type IngredientQuizOption = {
    id: string;
    option_text: string;
    option_order: number;
};

export type IngredientQuizQuestion = {
    id: string;
    slug: string;
    learning_module_id: string | null;
    question_text: string;
    question_type: string;
    explanation: string;
    difficulty: string;
    status: string;
    created_at: string;
    updated_at: string;
    learning_category: string;
    options: IngredientQuizOption[];
};

type QuestionRowLike = {
    readonly id: string;
    readonly slug: string;
    readonly learning_module_id: string | null;
    readonly question_text: string;
    readonly question_type: string;
    readonly explanation: string;
    readonly difficulty: string;
    readonly status: string;
    readonly created_at: string;
    readonly updated_at: string;
    readonly learning_category?: string | null;
    readonly options: ReadonlyArray<{
        readonly id: string;
        readonly question_id?: string;
        readonly option_text: string;
        readonly option_order: number;
        readonly is_correct?: boolean;
    }>;
};

export function sanitizeIngredientQuizQuestion<T extends QuestionRowLike>(question: T): IngredientQuizQuestion {
    return {
        id: question.id,
        slug: question.slug,
        learning_module_id: question.learning_module_id,
        question_text: question.question_text,
        question_type: question.question_type,
        explanation: question.explanation,
        difficulty: question.difficulty,
        status: question.status,
        created_at: question.created_at,
        updated_at: question.updated_at,
        learning_category: question.learning_category ?? "ingredients",
        options: (question.options ?? []).map((option) => ({
            id: option.id,
            option_text: option.option_text,
            option_order: option.option_order,
        })),
    };
}

export function pickIngredientQuizQuestions<T extends QuestionRowLike>(questions: readonly T[], limit = 5): IngredientQuizQuestion[] {
    const ingredientQuestions = (questions ?? []).filter(
        (question) => question.status === "published" && (question.learning_category ?? "ingredients") === "ingredients",
    );

    return ingredientQuestions.slice(0, limit).map((question) => sanitizeIngredientQuizQuestion(question));
}
