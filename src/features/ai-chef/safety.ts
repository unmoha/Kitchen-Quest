import type { ChatMessage } from "./types";

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_HISTORY_MESSAGES = 6;
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const MAX_REQUESTS_PER_WINDOW = 10;

/**
 * Single-Process Rate Limiter:
 * Maintains an in-memory sliding window of request timestamps per authenticated user ID.
 * Note: This rate limiter is single-process/instance scoped (designed for single-node / container runtimes
 * without requiring external infrastructure like Redis).
 */
interface RateLimitRecord {
    timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function validateUserMessage(message: unknown): {
    isValid: boolean;
    error?: string;
    cleanMessage?: string;
} {
    if (typeof message !== "string") {
        return {
            isValid: false,
            error: "Message must be a text string.",
        };
    }

    const trimmed = message.trim();
    if (trimmed.length === 0) {
        return {
            isValid: false,
            error: "Please enter a cooking question or topic.",
        };
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
        return {
            isValid: false,
            error: `Message is too long. Please keep questions under ${MAX_MESSAGE_LENGTH} characters.`,
        };
    }

    return {
        isValid: true,
        cleanMessage: trimmed,
    };
}

export function validateChatHistory(history: unknown): {
    isValid: boolean;
    error?: string;
    cleanHistory: ChatMessage[];
} {
    if (history === undefined || history === null) {
        return { isValid: true, cleanHistory: [] };
    }

    if (!Array.isArray(history)) {
        return {
            isValid: false,
            error: "Chat history must be an array of messages.",
            cleanHistory: [],
        };
    }

    if (history.length > MAX_HISTORY_MESSAGES) {
        return {
            isValid: false,
            error: `Chat history exceeds maximum of ${MAX_HISTORY_MESSAGES} messages.`,
            cleanHistory: [],
        };
    }

    const cleanHistory: ChatMessage[] = [];

    for (let i = 0; i < history.length; i++) {
        const item = history[i];

        if (!item || typeof item !== "object" || Array.isArray(item)) {
            return {
                isValid: false,
                error: `Malformed history message at index ${i}. Expected an object.`,
                cleanHistory: [],
            };
        }

        const role = (item as Record<string, unknown>).role;
        const content = (item as Record<string, unknown>).content;

        // Strictly disallow "system", "developer", "admin", or other roles
        if (role !== "user" && role !== "assistant") {
            return {
                isValid: false,
                error: `Invalid role "${String(role)}" at history index ${i}. Only "user" and "assistant" are allowed.`,
                cleanHistory: [],
            };
        }

        if (typeof content !== "string") {
            return {
                isValid: false,
                error: `Invalid message content at history index ${i}. Content must be a string.`,
                cleanHistory: [],
            };
        }

        const trimmedContent = content.trim();
        if (trimmedContent.length === 0) {
            return {
                isValid: false,
                error: `Empty message content at history index ${i}.`,
                cleanHistory: [],
            };
        }

        if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
            return {
                isValid: false,
                error: `Message at history index ${i} exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters.`,
                cleanHistory: [],
            };
        }

        cleanHistory.push({
            role,
            content: trimmedContent,
        });
    }

    return {
        isValid: true,
        cleanHistory,
    };
}

export function checkRateLimit(userId: string, nowMs: number = Date.now()): {
    isAllowed: boolean;
    retryAfterSeconds?: number;
} {
    if (!userId) {
        return { isAllowed: false, retryAfterSeconds: 60 };
    }

    const record = rateLimitStore.get(userId) ?? { timestamps: [] };
    const cutoff = nowMs - RATE_LIMIT_WINDOW_MS;

    // Filter out timestamps older than the active window
    const recent = record.timestamps.filter((ts) => ts > cutoff);

    if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
        const oldestRecent = recent[0];
        const resetTime = oldestRecent + RATE_LIMIT_WINDOW_MS;
        const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - nowMs) / 1000));

        return {
            isAllowed: false,
            retryAfterSeconds,
        };
    }

    recent.push(nowMs);
    rateLimitStore.set(userId, { timestamps: recent });

    return { isAllowed: true };
}

export function resetRateLimitsForTesting(): void {
    rateLimitStore.clear();
}

export const MAX_RESPONSE_LENGTH = 10000;

export function sanitizeAiResponse(raw: string): string {
    if (!raw || typeof raw !== "string") return "";

    // Redact any patterns resembling API keys or secret tokens
    const redacted = raw
        .replace(/(?:sk-[a-zA-Z0-9_-]{20,})/gi, "[REDACTED_KEY]")
        .replace(/(?:AIza[0-9A-Za-z-_]{35})/g, "[REDACTED_KEY]")
        .trim();

    if (redacted.length > MAX_RESPONSE_LENGTH) {
        return redacted.slice(0, MAX_RESPONSE_LENGTH) + "...";
    }

    return redacted;
}
