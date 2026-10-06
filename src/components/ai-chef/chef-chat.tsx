"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bot, Send, Sparkles, User, AlertCircle, LogIn, Loader2 } from "lucide-react";
import { askAiChefAction } from "@/features/ai-chef/actions";
import { MAX_MESSAGE_LENGTH } from "@/features/ai-chef/safety";
import type { ChatMessage } from "@/features/ai-chef/types";

interface ChefChatProps {
    isAuthenticated: boolean;
}

const STARTER_PROMPTS = [
    "What does sautéing mean?",
    "How can I make lentils less mushy?",
    "Why do onions turn brown?",
    "What can I substitute for garlic?",
    "What is the secret to a gentle simmer?",
];

export function ChefChat({ isAuthenticated }: ChefChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: "assistant",
            content: "Hello Chef! I'm AI Chef, your culinary learning assistant for Kitchen Quest. Ask me anything about cooking techniques, ingredient science, recipe troubleshooting, or food substitutions!",
        },
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    async function handleSendMessage(messageText?: string) {
        const textToSend = (messageText ?? inputValue).trim();
        if (!textToSend || isLoading) return;

        if (!isAuthenticated) {
            setErrorMessage("Please sign in to ask AI Chef.");
            return;
        }

        setErrorMessage(null);
        setInputValue("");

        const newHistory: ChatMessage[] = [
            ...messages,
            { role: "user", content: textToSend },
        ];

        setMessages(newHistory);
        setIsLoading(true);

        try {
            const result = await askAiChefAction({
                message: textToSend,
                history: messages,
            });

            if (result.success && result.response) {
                setMessages([
                    ...newHistory,
                    { role: "assistant", content: result.response },
                ]);
            } else {
                setErrorMessage(result.error ?? "Failed to get a response from AI Chef.");
            }
        } catch {
            setErrorMessage("A network error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSendMessage();
        }
    }

    return (
        <section
            aria-label="AI Chef Conversation"
            className="flex flex-col h-[650px] max-h-[80vh] rounded-2xl border border-[#dce6df] bg-white shadow-sm overflow-hidden"
        >
            {/* Conversation Log */}
            <div
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
                role="log"
                aria-live="polite"
            >
                {messages.map((msg, index) => {
                    const isAssistant = msg.role === "assistant";
                    return (
                        <div
                            key={index}
                            className={`flex items-start gap-3 ${
                                isAssistant ? "justify-start" : "justify-end"
                            }`}
                        >
                            {isAssistant && (
                                <div
                                    aria-hidden="true"
                                    className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#254235] text-[#e8f4ec] shadow-2xs mt-0.5"
                                >
                                    <Bot size={20} />
                                </div>
                            )}

                            <div
                                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                    isAssistant
                                        ? "bg-[#f4f7f4] text-[#1f3328] border border-[#e2eae4]"
                                        : "bg-[#254235] text-white shadow-2xs"
                                }`}
                            >
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>

                            {!isAssistant && (
                                <div
                                    aria-hidden="true"
                                    className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e6eee8] text-[#254235] shadow-2xs mt-0.5"
                                >
                                    <User size={18} />
                                </div>
                            )}
                        </div>
                    );
                })}

                {isLoading && (
                    <div className="flex items-start gap-3">
                        <div
                            aria-hidden="true"
                            className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#254235] text-[#e8f4ec] shadow-2xs"
                        >
                            <Bot size={20} />
                        </div>
                        <div className="rounded-2xl border border-[#e2eae4] bg-[#f4f7f4] px-4 py-3 text-sm text-[#59675c] flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin text-[#3d7b52]" />
                            <span>AI Chef is thinking...</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Error banner */}
            {errorMessage && (
                <div
                    role="alert"
                    className="flex items-center gap-2 border-t border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-800"
                >
                    <AlertCircle size={16} aria-hidden="true" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {/* Starter Suggestions & Input Bar */}
            <div className="border-t border-[#e2eae4] bg-[#f9faf9] p-3 sm:p-4 space-y-3">
                {/* Starter Pills */}
                {messages.length <= 2 && (
                    <div className="flex flex-wrap items-center gap-1.5" aria-label="Suggested starter questions">
                        <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#687b6c] mr-1">
                            <Sparkles size={12} aria-hidden="true" />
                            Ideas:
                        </span>
                        {STARTER_PROMPTS.map((prompt, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => void handleSendMessage(prompt)}
                                disabled={isLoading || !isAuthenticated}
                                className="rounded-full border border-[#d8e3da] bg-white px-3 py-1 text-xs font-medium text-[#2d493a] shadow-3xs transition hover:bg-[#ebf4ee] hover:border-[#b8d1be] disabled:opacity-50"
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                )}

                {/* Input Area or Sign-In Prompt */}
                {isAuthenticated ? (
                    <div className="space-y-1.5">
                        <div className="relative flex items-end gap-2">
                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                maxLength={MAX_MESSAGE_LENGTH}
                                placeholder="Ask AI Chef about ingredients, cooking steps, science, or techniques..."
                                rows={2}
                                disabled={isLoading}
                                className="w-full resize-none rounded-xl border border-[#d2ded5] bg-white px-3.5 py-2.5 text-sm text-[#1f3328] placeholder-[#7d8f80] focus:border-[#3d7b52] focus:ring-1 focus:ring-[#3d7b52] focus:outline-none disabled:bg-[#f2f4f2]"
                                aria-label="Cooking question for AI Chef"
                            />
                            <button
                                type="button"
                                onClick={() => void handleSendMessage()}
                                disabled={!inputValue.trim() || isLoading}
                                aria-label="Send message to AI Chef"
                                className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#254235] text-white shadow-2xs transition hover:bg-[#1a2f25] disabled:cursor-not-allowed disabled:bg-[#9cb0a2]"
                            >
                                {isLoading ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Send size={18} />
                                )}
                            </button>
                        </div>
                        <div className="flex justify-between items-center px-1 text-[11px] text-[#718274]">
                            <span>Press Enter to send, Shift+Enter for new line</span>
                            <span>{inputValue.length} / {MAX_MESSAGE_LENGTH}</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between rounded-xl border border-[#d9e5db] bg-[#edf5ef] p-3 text-xs text-[#254235]">
                        <div className="flex items-center gap-2">
                            <LogIn size={16} aria-hidden="true" />
                            <span>Sign in to chat with AI Chef and explore culinary science.</span>
                        </div>
                        <Link
                            href="/auth/login?redirect=/chef"
                            className="rounded-lg bg-[#254235] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1a2f25]"
                        >
                            Sign In
                        </Link>
                    </div>
                )}
            </div>
        </section>
    );
}
