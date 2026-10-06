import type { QuestionOptionRecord, QuestionRecord } from "../game-engine/types";

export interface FoodDetectiveOption {
    id: string;
    optionText: string;
    optionOrder: number;
}

export interface FoodDetectiveClue {
    id: string;
    questionText: string;
    difficulty: string;
    options: FoodDetectiveOption[];
}

export interface FoodDetectiveSubmission {
    sessionId: string;
    questionId: string;
    selectedOptionId: string;
    responseTimeMs?: number | null;
}

function shuffled<T>(values: readonly T[], random: () => number = Math.random): T[] {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
}

export function chooseFoodDetectiveClues(
    questions: readonly QuestionRecord[],
    count = 3,
    random: () => number = Math.random,
): QuestionRecord[] {
    return shuffled(questions, random).slice(0, Math.min(count, questions.length));
}

export function sanitizeFoodDetectiveClue(
    question: QuestionRecord,
    random: () => number = Math.random,
): FoodDetectiveClue {
    const rawOptions = (question.options ?? []).map((option: QuestionOptionRecord) => ({
        id: option.id,
        optionText: option.option_text,
        optionOrder: option.option_order,
    }));

    return {
        id: question.id,
        questionText: question.question_text,
        difficulty: question.difficulty,
        options: shuffled(rawOptions, random),
    };
}

export function parseFoodDetectiveSubmission(value: unknown): FoodDetectiveSubmission | null {
    if (typeof value !== "object" || value === null) {
        return null;
    }

    const input = value as Record<string, unknown>;
    if (typeof input.sessionId !== "string" || input.sessionId.length === 0) {
        return null;
    }
    if (typeof input.questionId !== "string" || input.questionId.length === 0) {
        return null;
    }
    if (typeof input.selectedOptionId !== "string" || input.selectedOptionId.length === 0) {
        return null;
    }

    if (input.responseTimeMs !== undefined
        && input.responseTimeMs !== null
        && (typeof input.responseTimeMs !== "number" || !Number.isFinite(input.responseTimeMs) || input.responseTimeMs < 0)) {
        return null;
    }

    return {
        sessionId: input.sessionId,
        questionId: input.questionId,
        selectedOptionId: input.selectedOptionId,
        responseTimeMs: input.responseTimeMs as number | null | undefined,
    };
}
