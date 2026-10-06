import type {
    AchievementEvaluationContext,
    AchievementItem,
    AchievementRequirement,
    AchievementWithProgress,
    UserAchievementItem,
} from "./types";

export interface RequirementEvaluation {
    isSatisfied: boolean;
    currentProgress: number;
    maxProgress: number;
    progressPercent: number;
}

export function evaluateRequirement(
    requirement: AchievementRequirement,
    context: AchievementEvaluationContext,
): RequirementEvaluation {
    if (!requirement || typeof requirement !== "object") {
        return { isSatisfied: false, currentProgress: 0, maxProgress: 1, progressPercent: 0 };
    }

    const kind = requirement.kind;

    switch (kind) {
        case "game_sessions_completed": {
            const count = typeof requirement.count === "number" && requirement.count > 0 ? requirement.count : 1;
            const current = Math.max(0, context.completedSessionCount);
            const isSatisfied = current >= count;
            const progressPercent = Math.min(100, Math.round((Math.min(current, count) / count) * 100));
            return {
                isSatisfied,
                currentProgress: Math.min(current, count),
                maxProgress: count,
                progressPercent,
            };
        }

        case "distinct_game_modes": {
            const count = typeof requirement.count === "number" && requirement.count > 0 ? requirement.count : 1;
            const current = Math.max(0, context.completedGameModes.length);
            const isSatisfied = current >= count;
            const progressPercent = Math.min(100, Math.round((Math.min(current, count) / count) * 100));
            return {
                isSatisfied,
                currentProgress: Math.min(current, count),
                maxProgress: count,
                progressPercent,
            };
        }

        case "min_level": {
            const targetLevel = typeof requirement.level === "number" && requirement.level > 0 ? requirement.level : 1;
            const current = Math.max(1, context.userLevel);
            const isSatisfied = current >= targetLevel;
            const progressPercent = Math.min(100, Math.round((Math.min(current, targetLevel) / targetLevel) * 100));
            return {
                isSatisfied,
                currentProgress: Math.min(current, targetLevel),
                maxProgress: targetLevel,
                progressPercent,
            };
        }

        case "mastery_score": {
            const minScore = typeof requirement.min_score === "number" && requirement.min_score > 0 ? requirement.min_score : 100;
            const current = Math.max(0, context.highestMasteryScore);
            const isSatisfied = current >= minScore;
            const progressPercent = Math.min(100, Math.round((Math.min(current, minScore) / minScore) * 100));
            return {
                isSatisfied,
                currentProgress: Math.min(current, minScore),
                maxProgress: minScore,
                progressPercent,
            };
        }

        case "module_completions": {
            const count = typeof requirement.count === "number" && requirement.count > 0 ? requirement.count : 1;
            const current = Math.max(0, context.completedModuleIds.length);
            const isSatisfied = current >= count;
            const progressPercent = Math.min(100, Math.round((Math.min(current, count) / count) * 100));
            return {
                isSatisfied,
                currentProgress: Math.min(current, count),
                maxProgress: count,
                progressPercent,
            };
        }

        case "ingredient_lessons": {
            const count = typeof requirement.count === "number" && requirement.count > 0 ? requirement.count : 1;
            const total = Math.max(0, context.completedModuleIds.length + context.completedRecipeIds.length);
            const isSatisfied = total >= count;
            const progressPercent = Math.min(100, Math.round((Math.min(total, count) / count) * 100));
            return {
                isSatisfied,
                currentProgress: Math.min(total, count),
                maxProgress: count,
                progressPercent,
            };
        }

        case "module_slug": {
            const targetSlug = typeof requirement.slug === "string" ? requirement.slug : "";
            const isCompleted = targetSlug.length > 0 && context.completedModuleSlugs.includes(targetSlug);
            return {
                isSatisfied: isCompleted,
                currentProgress: isCompleted ? 1 : 0,
                maxProgress: 1,
                progressPercent: isCompleted ? 100 : 0,
            };
        }

        case "recipe_views":
        case "recipe_completions": {
            const count = typeof requirement.count === "number" && requirement.count > 0 ? requirement.count : 1;
            const current = Math.max(0, context.completedRecipeIds.length);
            const isSatisfied = current >= count;
            const progressPercent = Math.min(100, Math.round((Math.min(current, count) / count) * 100));
            return {
                isSatisfied,
                currentProgress: Math.min(current, count),
                maxProgress: count,
                progressPercent,
            };
        }

        case "cuisine_modules": {
            const count = typeof requirement.count === "number" && requirement.count > 0 ? requirement.count : 1;
            const current = Math.max(0, context.distinctCuisineCount);
            const isSatisfied = current >= count;
            const progressPercent = Math.min(100, Math.round((Math.min(current, count) / count) * 100));
            return {
                isSatisfied,
                currentProgress: Math.min(current, count),
                maxProgress: count,
                progressPercent,
            };
        }

        case "learning_days": {
            const count = typeof requirement.count === "number" && requirement.count > 0 ? requirement.count : 1;
            const current = Math.max(0, context.distinctLearningDaysCount);
            const isSatisfied = current >= count;
            const progressPercent = Math.min(100, Math.round((Math.min(current, count) / count) * 100));
            return {
                isSatisfied,
                currentProgress: Math.min(current, count),
                maxProgress: count,
                progressPercent,
            };
        }

        default:
            return {
                isSatisfied: false,
                currentProgress: 0,
                maxProgress: 1,
                progressPercent: 0,
            };
    }
}

export function buildAchievementsWithProgress(
    achievements: AchievementItem[],
    userUnlocks: UserAchievementItem[],
    context: AchievementEvaluationContext,
): AchievementWithProgress[] {
    const unlockMap = new Map<string, UserAchievementItem>();
    for (const unlock of userUnlocks) {
        unlockMap.set(unlock.achievementId, unlock);
    }

    return achievements.map((achievement) => {
        const unlockRecord = unlockMap.get(achievement.id);
        const evalResult = evaluateRequirement(achievement.requirement, context);

        const isUnlocked = Boolean(unlockRecord) || evalResult.isSatisfied;
        const unlockedAt = unlockRecord ? unlockRecord.unlockedAt : null;

        return {
            ...achievement,
            isUnlocked,
            unlockedAt,
            currentProgress: isUnlocked ? evalResult.maxProgress : evalResult.currentProgress,
            maxProgress: evalResult.maxProgress,
            progressPercent: isUnlocked ? 100 : evalResult.progressPercent,
        };
    });
}
