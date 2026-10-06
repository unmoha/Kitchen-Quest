import { describe, expect, it } from "vitest";
import {
    calculateNextStreak,
    getDaysDifference,
    getUtcDateString,
    isStreakActiveToday,
    parseDateStringToUtcMidnight,
} from "./streak-calculator";

describe("streak-calculator", () => {
    describe("date calculations", () => {
        it("returns today in YYYY-MM-DD UTC format", () => {
            const fixedDate = new Date("2026-10-03T12:00:00Z");
            expect(getUtcDateString(fixedDate)).toBe("2026-10-03");
        });

        it("parses date string to UTC midnight timestamp", () => {
            const ts = parseDateStringToUtcMidnight("2026-10-03");
            expect(ts).toBe(Date.UTC(2026, 9, 3));
        });

        it("calculates whole calendar day difference accurately", () => {
            expect(getDaysDifference("2026-10-01", "2026-10-02")).toBe(1);
            expect(getDaysDifference("2026-10-01", "2026-10-01")).toBe(0);
            expect(getDaysDifference("2026-10-01", "2026-10-03")).toBe(2);
            expect(getDaysDifference("2026-09-30", "2026-10-01")).toBe(1);
        });
    });

    describe("calculateNextStreak", () => {
        it("initializes streak to 1 on first qualifying activity ever", () => {
            const result = calculateNextStreak(0, 0, null, "2026-10-03");
            expect(result).toEqual({
                currentStreak: 1,
                longestStreak: 1,
                lastActivityDate: "2026-10-03",
                isIncremented: true,
            });
        });

        it("does not increment streak on repeated activity on the same calendar day (idempotent)", () => {
            const result = calculateNextStreak(5, 7, "2026-10-03", "2026-10-03");
            expect(result).toEqual({
                currentStreak: 5,
                longestStreak: 7,
                lastActivityDate: "2026-10-03",
                isIncremented: false,
            });
        });

        it("increments streak by 1 on consecutive calendar day", () => {
            const result = calculateNextStreak(5, 7, "2026-10-02", "2026-10-03");
            expect(result).toEqual({
                currentStreak: 6,
                longestStreak: 7,
                lastActivityDate: "2026-10-03",
                isIncremented: true,
            });
        });

        it("updates longest streak when current streak surpasses previous record", () => {
            const result = calculateNextStreak(7, 7, "2026-10-02", "2026-10-03");
            expect(result).toEqual({
                currentStreak: 8,
                longestStreak: 8,
                lastActivityDate: "2026-10-03",
                isIncremented: true,
            });
        });

        it("resets current streak to 1 after a gap of more than 1 day while preserving longest streak", () => {
            const result = calculateNextStreak(5, 10, "2026-09-30", "2026-10-03");
            expect(result).toEqual({
                currentStreak: 1,
                longestStreak: 10,
                lastActivityDate: "2026-10-03",
                isIncremented: true,
            });
        });

        it("ignores out-of-order past activity dates without downgrading current streak", () => {
            const result = calculateNextStreak(5, 10, "2026-10-03", "2026-10-01");
            expect(result).toEqual({
                currentStreak: 5,
                longestStreak: 10,
                lastActivityDate: "2026-10-03",
                isIncremented: false,
            });
        });
    });

    describe("isStreakActiveToday", () => {
        it("returns true when last activity date equals today", () => {
            expect(isStreakActiveToday("2026-10-03", "2026-10-03")).toBe(true);
        });

        it("returns false when last activity date is yesterday or earlier", () => {
            expect(isStreakActiveToday("2026-10-02", "2026-10-03")).toBe(false);
            expect(isStreakActiveToday(null, "2026-10-03")).toBe(false);
        });
    });
});
