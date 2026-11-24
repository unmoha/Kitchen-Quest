export type CookCommand =
    | { type: "next" }
    | { type: "back" }
    | { type: "repeat" }
    | { type: "why" }
    | { type: "ingredients" }
    | { type: "timer-start" }
    | { type: "timer-pause" }
    | { type: "timer-clear" }
    | { type: "timer-set"; seconds: number };

const UNITS: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
    twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

/** Parses "12", "twelve", "twenty five" or "twenty-five". Returns null when not a number. */
export function parseSpokenNumber(raw: string): number | null {
    const text = raw.trim().toLowerCase().replace(/-/g, " ");
    if (!text) return null;
    if (/^\d+$/.test(text)) return Number(text);
    if (text === "a" || text === "an") return 1;
    if (text === "half an" || text === "half a") return 0.5;
    const parts = text.split(/\s+/);
    if (parts.length === 1) {
        if (parts[0] in UNITS) return UNITS[parts[0]];
        if (parts[0] in TENS) return TENS[parts[0]];
        return null;
    }
    if (parts.length === 2 && parts[0] in TENS && parts[1] in UNITS && UNITS[parts[1]] < 10) {
        return TENS[parts[0]] + UNITS[parts[1]];
    }
    return null;
}

const FILLER = "(?:(?:hey|ok|okay|please|chef|can you|could you|you can)\\s+)*";
const TAIL = "(?:\\s+(?:please|now))?";
/** Navigation phrases must be the WHOLE utterance, so "put the butter back" or "is the oil ready" are ignored. */
const exact = (phrases: string) => new RegExp(`^${FILLER}(?:${phrases})${TAIL}$`);

const NEXT = exact("next|next step|continue|go on|go ahead|i'?m ready|ready");
const BACK = exact("back|go back|previous|previous step|last step|go to the previous step");
const REPEAT = exact("repeat|repeat that|repeat the step|say that again|read that again|read it again|read it|what was that");
const WHY = exact("why|why is that|explain|explain that|tell me more|what does that do");
const INGREDIENTS = exact("ingredients|show ingredients|show the ingredients|open ingredients|list ingredients|what are the ingredients");

/** Turns a spoken phrase from a hands-free cook into an action, or null if it is not a command. */
export function parseCookCommand(transcript: string): CookCommand | null {
    const text = transcript.toLowerCase().replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
    if (!text) return null;

    const setTimer = text.match(/(?:set|start|put on)(?: a| an| the)? timer (?:for |to )?(.+?) ?(minutes?|mins?|seconds?|secs?|hours?|hrs?)\b/);
    if (setTimer) {
        const amount = parseSpokenNumber(setTimer[1]);
        if (amount !== null && amount > 0) {
            const unit = setTimer[2][0];
            const perUnit = unit === "h" ? 3600 : unit === "m" ? 60 : 1;
            return { type: "timer-set", seconds: Math.round(amount * perUnit) };
        }
    }
    if (/\b(cancel|clear|reset|delete) (the |my )?timer\b/.test(text)) return { type: "timer-clear" };
    if (/\b(pause|stop|hold) (the |my )?timer\b/.test(text)) return { type: "timer-pause" };
    if (/\b(start|begin|resume|run) (the |my )?timer\b/.test(text)) return { type: "timer-start" };
    if (INGREDIENTS.test(text)) return { type: "ingredients" };
    if (WHY.test(text)) return { type: "why" };
    if (REPEAT.test(text)) return { type: "repeat" };
    if (BACK.test(text)) return { type: "back" };
    if (NEXT.test(text)) return { type: "next" };
    return null;
}
/** Finds a cooking time in an instruction like "simmer for 8-10 minutes". Uses the lower bound; the cook can add time. */
export function detectMinutesInText(instruction: string): number | null {
    const match = instruction.toLowerCase().match(/(\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*\d+(?:\.\d+)?)?\s*(minutes?|mins?|hours?|hrs?)\b/);
    if (!match) return null;
    const value = Number(match[1]);
    if (!Number.isFinite(value) || value <= 0) return null;
    return match[2].startsWith("h") ? value * 60 : value;
}

/** Seconds to suggest for a step: the stored duration first, then a time found in the text. */
export function suggestTimerSeconds(step: { minutes: number | null; instruction: string }): number | null {
    const minutes = step.minutes && step.minutes > 0 ? step.minutes : detectMinutesInText(step.instruction);
    return minutes ? Math.round(minutes * 60) : null;
}

/** 75 -> "1:15", 3725 -> "1:02:05" */
export function formatClock(totalSeconds: number): string {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;
    const ss = String(seconds).padStart(2, "0");
    return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${ss}` : `${minutes}:${ss}`;
}

/** Friendly label for buttons: 480 -> "8 min", 90 -> "1 min 30 sec". */
export function describeDuration(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes === 0) return `${seconds} sec`;
    return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} sec`;
}

/** Remaining seconds for a timer that is either running (endsAt) or paused (pausedLeft). */
export function remainingSeconds(timer: { endsAt: number | null; pausedLeft: number }, now: number): number {
    if (timer.endsAt === null) return timer.pausedLeft;
    return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
}
