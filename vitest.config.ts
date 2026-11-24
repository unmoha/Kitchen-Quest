import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["src/**/*.test.ts"],
        // Unit tests must never call real AI providers or use real keys.
        env: {
            AI_PROVIDER: "mock",
            GEMINI_API_KEY: "",
            OPENAI_API_KEY: "",
            AI_API_KEY: "",
        },
    },
});