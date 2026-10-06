import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { AI_CHEF_SYSTEM_PROMPT, formatContextForPrompt } from "./prompts";
import {
    checkRateLimit,
    sanitizeAiResponse,
    validateChatHistory,
    validateUserMessage,
} from "./safety";
import type {
    AiChefResponse,
    ChatMessage,
    ContextItem,
} from "./types";

export interface AiChefPersistence {
    getRelevantPublishedContent(query: string): Promise<ContextItem[]>;
}

export interface AiChefProvider {
    generateResponse(params: {
        systemPrompt: string;
        userMessage: string;
        history: ChatMessage[];
        contextText: string;
    }): Promise<string>;
}

export function extractSearchTerms(message: string): string[] {
    const clean = message.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
    const words = clean.split(/\s+/).filter((w) => w.length >= 3);
    const stopWords = new Set([
        "what", "when", "where", "which", "who", "whom", "this", "that", "these", "those",
        "am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
        "having", "do", "does", "did", "doing", "would", "should", "could", "ought",
        "and", "but", "if", "or", "because", "as", "until", "while", "how", "why", "tell",
        "about", "please", "help", "can", "you", "make", "cook", "recipe",
    ]);

    const keywords = words.filter((w) => !stopWords.has(w));
    return Array.from(new Set(keywords)).slice(0, 5);
}

export class DefaultAiChefProvider implements AiChefProvider {
    async generateResponse(params: {
        systemPrompt: string;
        userMessage: string;
        history: ChatMessage[];
        contextText: string;
    }): Promise<string> {
        const providerName = (process.env.AI_PROVIDER || "gemini").toLowerCase().trim();

        // If explicitly set to mock, bypass external network requests
        if (providerName === "mock") {
            return this.generateEducationalFallback(params.userMessage, params.contextText);
        }

        if (providerName === "gemini") {
            const geminiApiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
            if (!geminiApiKey) {
                return this.generateEducationalFallback(params.userMessage, params.contextText);
            }

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
                
                // Map validated history to Gemini parts format (role: "user" | "model")
                const historyContents = (params.history || []).map((m) => ({
                    role: m.role === "assistant" ? "model" : "user",
                    parts: [{ text: m.content }],
                }));

                // Append the current turn with separated context
                const contents = [
                    ...historyContents,
                    {
                        role: "user",
                        parts: [{ text: `${params.contextText}\n\nUser Question:\n${params.userMessage}` }],
                    },
                ];

                const res = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        system_instruction: {
                            parts: [{ text: params.systemPrompt }],
                        },
                        contents,
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 800,
                        },
                    }),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (res.ok) {
                    const json = await res.json();
                    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (typeof text === "string" && text.trim().length > 0) {
                        return text.trim();
                    }
                }
            } catch (err: unknown) {
                if (err instanceof Error && err.name === "AbortError") {
                    throw new Error("AI Chef request timed out. Please try again.");
                }
            }
        } else if (providerName === "openai") {
            const openaiApiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
            if (!openaiApiKey) {
                return this.generateEducationalFallback(params.userMessage, params.contextText);
            }

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);

                const endpoint = "https://api.openai.com/v1/chat/completions";
                const messages = [
                    { role: "system", content: params.systemPrompt },
                    { role: "system", content: params.contextText },
                    ...(params.history || []).map((m) => ({ role: m.role, content: m.content })),
                    { role: "user", content: params.userMessage },
                ];

                const res = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${openaiApiKey}`,
                    },
                    body: JSON.stringify({
                        model: "gpt-4o-mini",
                        messages,
                        temperature: 0.7,
                        max_tokens: 800,
                    }),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (res.ok) {
                    const json = await res.json();
                    const text = json?.choices?.[0]?.message?.content;
                    if (typeof text === "string" && text.trim().length > 0) {
                        return text.trim();
                    }
                }
            } catch (err: unknown) {
                if (err instanceof Error && err.name === "AbortError") {
                    throw new Error("AI Chef request timed out. Please try again.");
                }
            }
        } else {
            throw new Error(`Unsupported AI provider: "${providerName}". Supported providers are 'gemini', 'openai', and 'mock'.`);
        }

        // Domain-grounded fallback assistant for offline/demo/testing environments
        return this.generateEducationalFallback(params.userMessage, params.contextText);
    }

    private generateEducationalFallback(userMessage: string, contextText: string): string {
        const lower = userMessage.toLowerCase();

        // 1. Progression attempt boundary
        if (lower.includes("xp") || lower.includes("level") || lower.includes("achievement") || lower.includes("streak") || lower.includes("rank")) {
            return "As AI Chef, I'm your culinary learning assistant, but I cannot modify your XP, chef levels, achievements, streaks, or leaderboard standing. You can earn XP and unlock achievements by completing games and learning modules in Kitchen Quest!";
        }

        // 2. Medical / Diagnosis boundary
        if (lower.includes("diagnose") || lower.includes("medicine") || lower.includes("cure") || lower.includes("allergic reaction") || lower.includes("medical condition")) {
            return "I can help explain culinary ingredients and cooking techniques, but I cannot provide medical diagnoses or dietary medical advice. If you suspect an allergic reaction or medical condition, please consult a qualified healthcare professional.";
        }

        // 3. Food safety guidance
        if (lower.includes("safe") || lower.includes("spoil") || lower.includes("salmonella") || lower.includes("temperature") || lower.includes("bacteria") || lower.includes("raw")) {
            return "Food safety is essential in the kitchen! Please note that I provide general culinary educational guidance and am not an authoritative medical or regulatory food-safety system. Always follow safe food handling practices: keep perishable foods refrigerated below 40°F (4°C), cook poultry to an internal temperature of 165°F (74°C), and use separate cutting boards for raw meats and produce to avoid cross-contamination. When in doubt, throw it out!";
        }

        // 4. Sautéing / Heat techniques
        if (lower.includes("saut") || lower.includes("pan") || lower.includes("brown") || lower.includes("sear")) {
            return "Sautéing means cooking food quickly in a small amount of fat over medium-high heat. The key is to preheat your pan and oil before adding ingredients, and avoid overcrowding the pan so moisture can evaporate rather than steaming the food.";
        }

        // 5. Lentils / Legumes
        if (lower.includes("lentil") || lower.includes("mushy") || lower.includes("simmer")) {
            return "To keep lentils from becoming mushy, maintain a gentle simmer rather than a rapid rolling boil. Red split lentils cook quickly (15–20 minutes) and naturally break down into a creamy consistency, whereas whole brown or green lentils hold their shape better.";
        }

        // 6. Ingredient substitutions
        if (lower.includes("substitute") || lower.includes("replace") || lower.includes("instead of")) {
            return "When making ingredient substitutions, consider both flavor and moisture balance. For aromatics like garlic or onion, shallots or leeks make great alternatives. For dairy, unsweetened coconut milk or oat milk work well depending on whether the dish is savory or sweet.";
        }

        // 7. General culinary educational response
        if (contextText && !contextText.includes("No specific Kitchen Quest database entries")) {
            return `Based on Kitchen Quest culinary principles:\n\nGreat cooking relies on balancing heat, moisture, seasoning, and patience. Always taste as you cook, prep your ingredients ahead of time (mise en place), and manage your cooking heat to control moisture and develop rich flavors!`;
        }

        return "Welcome to Kitchen Quest! Whether you're mastering knife skills, learning how aromatics layer flavor, or exploring new recipes, I'm here to help. What cooking technique or ingredient would you like to explore today?";
    }
}

export class AiChefService {
    constructor(
        private readonly persistence: AiChefPersistence,
        private readonly provider: AiChefProvider = new DefaultAiChefProvider(),
    ) {}

    async askChef(params: {
        userId?: string;
        message: string;
        history?: ChatMessage[];
    }): Promise<AiChefResponse> {
        // 1. Authenticate user
        if (!params.userId) {
            return {
                success: false,
                error: "You must be signed in to ask AI Chef.",
            };
        }

        // 2. Validate input message
        const validation = validateUserMessage(params.message);
        if (!validation.isValid || !validation.cleanMessage) {
            return {
                success: false,
                error: validation.error ?? "Invalid message.",
            };
        }

        // 3. Validate untrusted chat history
        const historyValidation = validateChatHistory(params.history);
        if (!historyValidation.isValid) {
            return {
                success: false,
                error: historyValidation.error ?? "Invalid chat history.",
            };
        }

        // 4. Check rate limiting
        const rateLimit = checkRateLimit(params.userId);
        if (!rateLimit.isAllowed) {
            return {
                success: false,
                error: `You are sending messages too quickly. Please wait ${rateLimit.retryAfterSeconds ?? 10} seconds before asking another question.`,
            };
        }

        // 5. Retrieve relevant educational context from database
        let relevantItems: ContextItem[] = [];
        try {
            relevantItems = await this.persistence.getRelevantPublishedContent(validation.cleanMessage);
        } catch {
            // Non-fatal fallback: proceed without extra context
            relevantItems = [];
        }

        const contextText = formatContextForPrompt(relevantItems);

        // 6. Generate AI response using validated clean history
        try {
            const rawResponse = await this.provider.generateResponse({
                systemPrompt: AI_CHEF_SYSTEM_PROMPT,
                userMessage: validation.cleanMessage,
                history: historyValidation.cleanHistory,
                contextText,
            });

            const sanitized = sanitizeAiResponse(rawResponse);

            return {
                success: true,
                response: sanitized,
                relevantContextFound: relevantItems.length > 0,
            };
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "AI Chef is currently unavailable. Please try again in a moment.";
            return {
                success: false,
                error: errorMessage,
            };
        }
    }
}

export function createSupabaseAiChefPersistence(client: SupabaseClient<Database>): AiChefPersistence {
    return {
        async getRelevantPublishedContent(query: string): Promise<ContextItem[]> {
            const keywords = extractSearchTerms(query);
            if (keywords.length === 0) {
                return [];
            }

            const items: ContextItem[] = [];

            // 1. Search published ingredients
            try {
                const { data: ingredients } = await client
                    .from("ingredients")
                    .select("name, description, storage_information, safety_information")
                    .eq("status", "published")
                    .limit(3);

                if (ingredients) {
                    for (const ing of ingredients) {
                        const ingMatch = keywords.some(
                            (k) => ing.name.toLowerCase().includes(k) || ing.description.toLowerCase().includes(k),
                        );
                        if (ingMatch) {
                            items.push({
                                type: "ingredient",
                                title: ing.name,
                                description: ing.description,
                                details: `Storage: ${ing.storage_information}. Safety: ${ing.safety_information}`,
                            });
                        }
                    }
                }
            } catch {
                // Ignore search error
            }

            // 2. Search published recipes
            try {
                const { data: recipes } = await client
                    .from("recipes")
                    .select("title, description, educational_info, safety_notes")
                    .eq("status", "published")
                    .limit(3);

                if (recipes) {
                    for (const rec of recipes) {
                        const recMatch = keywords.some(
                            (k) => rec.title.toLowerCase().includes(k) || rec.description.toLowerCase().includes(k),
                        );
                        if (recMatch) {
                            items.push({
                                type: "recipe",
                                title: rec.title,
                                description: rec.description,
                                details: `Educational Info: ${rec.educational_info}. Safety: ${rec.safety_notes}`,
                            });
                        }
                    }
                }
            } catch {
                // Ignore search error
            }

            // 3. Search published learning modules
            try {
                const { data: modules } = await client
                    .from("learning_modules")
                    .select("title, description")
                    .eq("status", "published")
                    .limit(3);

                if (modules) {
                    for (const mod of modules) {
                        const modMatch = keywords.some(
                            (k) => mod.title.toLowerCase().includes(k) || mod.description.toLowerCase().includes(k),
                        );
                        if (modMatch) {
                            items.push({
                                type: "learning_module",
                                title: mod.title,
                                description: mod.description,
                            });
                        }
                    }
                }
            } catch {
                // Ignore search error
            }

            return items.slice(0, 4); // Limit to 4 most relevant items
        },
    };
}
