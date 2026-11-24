import { describe, expect, it } from "vitest";
import {
    describeDuration,
    detectMinutesInText,
    formatClock,
    parseCookCommand,
    parseSpokenNumber,
    remainingSeconds,
    suggestTimerSeconds,
} from "./logic";

describe("parseSpokenNumber", () => {
    it("handles digits, words and compounds", () => {
        expect(parseSpokenNumber("12")).toBe(12);
        expect(parseSpokenNumber("eight")).toBe(8);
        expect(parseSpokenNumber("twenty five")).toBe(25);
        expect(parseSpokenNumber("thirty-two")).toBe(32);
        expect(parseSpokenNumber("a")).toBe(1);
        expect(parseSpokenNumber("banana")).toBeNull();
        expect(parseSpokenNumber("")).toBeNull();
    });
});

describe("parseCookCommand", () => {
    it("recognises navigation", () => {
        expect(parseCookCommand("Next!")).toEqual({ type: "next" });
        expect(parseCookCommand("okay continue")).toEqual({ type: "next" });
        expect(parseCookCommand("go back")).toEqual({ type: "back" });
        expect(parseCookCommand("previous step")).toEqual({ type: "back" });
        expect(parseCookCommand("can you repeat that")).toEqual({ type: "repeat" });
        expect(parseCookCommand("say that again")).toEqual({ type: "repeat" });
    });

    it("recognises teaching and ingredient commands", () => {
        expect(parseCookCommand("why?")).toEqual({ type: "why" });
        expect(parseCookCommand("show ingredients")).toEqual({ type: "ingredients" });
    });

    it("sets timers from spoken durations", () => {
        expect(parseCookCommand("set a timer for 8 minutes")).toEqual({ type: "timer-set", seconds: 480 });
        expect(parseCookCommand("set timer for ten minutes")).toEqual({ type: "timer-set", seconds: 600 });
        expect(parseCookCommand("start a timer for thirty seconds")).toEqual({ type: "timer-set", seconds: 30 });
        expect(parseCookCommand("set a timer for twenty five minutes")).toEqual({ type: "timer-set", seconds: 1500 });
    });

    it("controls the current timer", () => {
        expect(parseCookCommand("start timer")).toEqual({ type: "timer-start" });
        expect(parseCookCommand("pause the timer")).toEqual({ type: "timer-pause" });
        expect(parseCookCommand("cancel timer")).toEqual({ type: "timer-clear" });
    });

    it("ignores kitchen chatter", () => {
        expect(parseCookCommand("pass me the salt")).toBeNull();
        expect(parseCookCommand("")).toBeNull();
        expect(parseCookCommand("set a timer for banana minutes")).toBeNull();
    });
});

describe("timer helpers", () => {
    it("detects minutes in instruction text", () => {
        expect(detectMinutesInText("Simmer for 8-10 minutes until thick.")).toBe(8);
        expect(detectMinutesInText("Bake 25 min")).toBe(25);
        expect(detectMinutesInText("Rest for 1 hour")).toBe(60);
        expect(detectMinutesInText("Stir well.")).toBeNull();
    });

    it("prefers stored duration over text", () => {
        expect(suggestTimerSeconds({ minutes: 5, instruction: "Cook 20 minutes" })).toBe(300);
        expect(suggestTimerSeconds({ minutes: null, instruction: "Cook 20 minutes" })).toBe(1200);
        expect(suggestTimerSeconds({ minutes: 0, instruction: "Stir." })).toBeNull();
    });

    it("formats clocks and durations", () => {
        expect(formatClock(75)).toBe("1:15");
        expect(formatClock(5)).toBe("0:05");
        expect(formatClock(3725)).toBe("1:02:05");
        expect(formatClock(-4)).toBe("0:00");
        expect(describeDuration(480)).toBe("8 min");
        expect(describeDuration(90)).toBe("1 min 30 sec");
        expect(describeDuration(30)).toBe("30 sec");
    });

    it("computes remaining time for running and paused timers", () => {
        expect(remainingSeconds({ endsAt: 10_000, pausedLeft: 0 }, 7_500)).toBe(3);
        expect(remainingSeconds({ endsAt: 10_000, pausedLeft: 0 }, 12_000)).toBe(0);
        expect(remainingSeconds({ endsAt: null, pausedLeft: 42 }, 99_999)).toBe(42);
    });
});

describe("kitchen chatter must not trigger navigation", () => {
    it.each([
        "put the butter back in the fridge",
        "is the oil ready",
        "it's next to the stove",
        "I need more ingredients for this",
        "why is it burning",
    ])("ignores %s", (phrase) => expect(parseCookCommand(phrase)).toBeNull());

    it("accepts polite and wake-word commands", () => {
        expect(parseCookCommand("chef go back")).toEqual({ type: "back" });
        expect(parseCookCommand("hey chef next step please")).toEqual({ type: "next" });
        expect(parseCookCommand("I'm ready")).toEqual({ type: "next" });
    });

    it("sets timers in hours", () => {
        expect(parseCookCommand("set a timer for 1 hour")).toEqual({ type: "timer-set", seconds: 3600 });
        expect(parseCookCommand("set a timer for an hour")).toEqual({ type: "timer-set", seconds: 3600 });
        expect(parseCookCommand("set a timer for two hours")).toEqual({ type: "timer-set", seconds: 7200 });
    });
});
