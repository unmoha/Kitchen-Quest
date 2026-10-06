export type LearningProgressStatus = "not_started" | "in_progress" | "completed";

export interface UserLearningProgress {
    id: string;
    userId: string;
    learningModuleId: string | null;
    recipeId: string | null;
    masteryScore: number;
    completedAt: string | null;
    lastAttemptedAt: string | null;
    createdAt: string;
    updatedAt: string;
    status: LearningProgressStatus;
}

export interface ProgressSummary {
    modules: Record<string, UserLearningProgress>;
    recipes: Record<string, UserLearningProgress>;
}

export interface SessionProgressUpdate {
    targetType: "learning_module" | "recipe";
    targetId: string;
    title: string;
    masteryScore: number;
    previousMasteryScore: number;
    isCompleted: boolean;
    wasPreviouslyCompleted: boolean;
}

export interface SessionProgressResult {
    sessionId: string;
    gameMode: string;
    updates: SessionProgressUpdate[];
}
