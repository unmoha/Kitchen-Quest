import { describe, expect, it } from "vitest";
import {
    XP_REWARDS,
    calculateLevel,
    calculateUserLevelInfo,
    getLevelThreshold,
    hasLeveledUp,
} from "./levels";

describe("XP Levels - Level Thresholds & Calculations", () => {
    it("matches exact level threshold requirements for Levels 1 through 10", () => {
        expect(getLevelThreshold(1)).toBe(0);
        expect(getLevelThreshold(2)).toBe(100);
        expect(getLevelThreshold(3)).toBe(250);
        expect(getLevelThreshold(4)).toBe(450);
        expect(getLevelThreshold(5)).toBe(700);
        expect(getLevelThreshold(6)).toBe(1000);
        expect(getLevelThreshold(7)).toBe(1350);
        expect(getLevelThreshold(8)).toBe(1750);
        expect(getLevelThreshold(9)).toBe(2200);
        expect(getLevelThreshold(10)).toBe(2700);
    });

    it("calculates deterministic progression for levels above 10", () => {
        // Level 11 = 25 * 10 * 13 = 3250 (+550 from L10)
        expect(getLevelThreshold(11)).toBe(3250);
        // Level 12 = 25 * 11 * 14 = 3850 (+600 from L11)
        expect(getLevelThreshold(12)).toBe(3850);
        // Level 13 = 25 * 12 * 15 = 4500 (+650 from L12)
        expect(getLevelThreshold(13)).toBe(4500);
    });

    it("calculates exact user level across boundaries", () => {
        expect(calculateLevel(0)).toBe(1);
        expect(calculateLevel(99)).toBe(1);
        expect(calculateLevel(100)).toBe(2);
        expect(calculateLevel(249)).toBe(2);
        expect(calculateLevel(250)).toBe(3);
        expect(calculateLevel(449)).toBe(3);
        expect(calculateLevel(450)).toBe(4);
        expect(calculateLevel(699)).toBe(4);
        expect(calculateLevel(700)).toBe(5);
        expect(calculateLevel(999)).toBe(5);
        expect(calculateLevel(1000)).toBe(6);
        expect(calculateLevel(1349)).toBe(6);
        expect(calculateLevel(1350)).toBe(7);
        expect(calculateLevel(1749)).toBe(7);
        expect(calculateLevel(1750)).toBe(8);
        expect(calculateLevel(2199)).toBe(8);
        expect(calculateLevel(2200)).toBe(9);
        expect(calculateLevel(2699)).toBe(9);
        expect(calculateLevel(2700)).toBe(10);
        expect(calculateLevel(3249)).toBe(10);
        expect(calculateLevel(3250)).toBe(11);
        expect(calculateLevel(3850)).toBe(12);
    });

    it("handles edge cases safely in calculateLevel (negative, NaN, non-finite)", () => {
        expect(calculateLevel(-50)).toBe(1);
        expect(calculateLevel(Number.NaN)).toBe(1);
        expect(calculateLevel(Number.POSITIVE_INFINITY)).toBe(1);
    });

    it("calculates detailed user level info correctly (e.g. 180 XP -> Level 2)", () => {
        const info = calculateUserLevelInfo(180);
        expect(info.level).toBe(2);
        expect(info.totalXp).toBe(180);
        expect(info.currentLevelXp).toBe(100);
        expect(info.nextLevelXp).toBe(250);
        expect(info.xpIntoLevel).toBe(80);
        expect(info.xpNeededForNextLevel).toBe(150);
        expect(info.progressPercent).toBe(53.33);
    });

    it("calculates detailed user level info for 0 XP (Level 1 start)", () => {
        const info = calculateUserLevelInfo(0);
        expect(info.level).toBe(1);
        expect(info.totalXp).toBe(0);
        expect(info.currentLevelXp).toBe(0);
        expect(info.nextLevelXp).toBe(100);
        expect(info.xpIntoLevel).toBe(0);
        expect(info.xpNeededForNextLevel).toBe(100);
        expect(info.progressPercent).toBe(0);
    });

    it("calculates detailed user level info at exact level boundary (Level 3 at 250 XP)", () => {
        const info = calculateUserLevelInfo(250);
        expect(info.level).toBe(3);
        expect(info.totalXp).toBe(250);
        expect(info.currentLevelXp).toBe(250);
        expect(info.nextLevelXp).toBe(450);
        expect(info.xpIntoLevel).toBe(0);
        expect(info.xpNeededForNextLevel).toBe(200);
        expect(info.progressPercent).toBe(0);
    });

    it("calculates detailed user level info for high level (Level 10 at 2850 XP)", () => {
        const info = calculateUserLevelInfo(2850);
        expect(info.level).toBe(10);
        expect(info.totalXp).toBe(2850);
        expect(info.currentLevelXp).toBe(2700);
        expect(info.nextLevelXp).toBe(3250);
        expect(info.xpIntoLevel).toBe(150);
        expect(info.xpNeededForNextLevel).toBe(550);
        expect(info.progressPercent).toBe(27.27);
    });

    it("detects level up transitions accurately", () => {
        expect(hasLeveledUp(120, 180)).toEqual({
            leveledUp: false,
            previousLevel: 2,
            currentLevel: 2,
        });

        expect(hasLeveledUp(80, 130)).toEqual({
            leveledUp: true,
            previousLevel: 1,
            currentLevel: 2,
        });

        expect(hasLeveledUp(50, 260)).toEqual({
            leveledUp: true,
            previousLevel: 1,
            currentLevel: 3,
        });
    });

    it("defines reward constants as specified", () => {
        expect(XP_REWARDS.CORRECT_ANSWER).toBe(10);
        expect(XP_REWARDS.SESSION_COMPLETION).toBe(25);
        expect(XP_REWARDS.LEARNING_COMPLETION).toBe(25);
    });
});
