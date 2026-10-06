export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp?: string;
}

export interface ContextItem {
    type: "ingredient" | "recipe" | "learning_module";
    title: string;
    description: string;
    details?: string;
}

export interface AiChefRequest {
    message: string;
    history?: ChatMessage[];
}

export interface AiChefResponse {
    success: boolean;
    response?: string;
    error?: string;
    relevantContextFound?: boolean;
}
