import { afterEach, describe, expect, it } from "vitest";
import { getSupabasePublicConfig } from "./env";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

afterEach(() => {
    if (originalUrl === undefined) {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
        process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    }
    if (originalKey === undefined) {
        delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    } else {
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
    }
});

describe("getSupabasePublicConfig", () => {
    it("returns null when credentials are not configured", () => {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
        expect(getSupabasePublicConfig()).toBeNull();
    });

    it("accepts HTTPS projects and local Supabase URLs", () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
        expect(getSupabasePublicConfig()).toEqual({
            url: "https://example.supabase.co",
            publishableKey: "sb_publishable_test",
        });

        process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
        expect(getSupabasePublicConfig()?.url).toBe("http://127.0.0.1:54321");
    });

    it("rejects non-local insecure URLs", () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = "http://example.supabase.co";
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
        expect(getSupabasePublicConfig()).toBeNull();
    });
});