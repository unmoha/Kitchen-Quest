import type { XpSourceType } from "@/types/database";

export type { XpSourceType };

export interface UserXpTransaction {
    id: string;
    userId: string;
    amount: number;
    sourceType: XpSourceType;
    sourceId: string;
    description: string;
    createdAt: string;
}

export interface UserLevelInfo {
    level: number;
    totalXp: number;
    currentLevelXp: number;
    nextLevelXp: number;
    xpIntoLevel: number;
    xpNeededForNextLevel: number;
    progressPercent: number;
}

export interface XpAwardResult {
    awarded: boolean;
    amount: number;
    sourceType: XpSourceType;
    sourceId: string;
    description: string;
}

export interface SessionXpSummary {
    totalXpEarned: number;
    breakdown: Array<{
        description: string;
        amount: number;
        sourceType: XpSourceType;
    }>;
    levelInfo: UserLevelInfo;
    leveledUp: boolean;
    previousLevel: number;
    currentLevel: number;
}
