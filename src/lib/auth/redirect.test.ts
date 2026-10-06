import { describe, expect, it } from "vitest";
import { getSafeRedirectPath } from "./redirect";

describe("getSafeRedirectPath", () => {
    it("preserves internal paths and their query strings", () => {
        expect(getSafeRedirectPath("/recipes?category=plant-based#results")).toBe("/recipes?category=plant-based#results");
    });

    it("rejects external and protocol-relative destinations", () => {
        expect(getSafeRedirectPath("https://example.com")).toBe("/profile");
        expect(getSafeRedirectPath("//example.com/profile")).toBe("/profile");
    });

    it("rejects backslash-based URL normalization and uses the fallback", () => {
        expect(getSafeRedirectPath("/\\example.com")).toBe("/profile");
        expect(getSafeRedirectPath(null, "/recipes")).toBe("/recipes");
    });
});