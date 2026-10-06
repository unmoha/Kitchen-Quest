const fallbackPath = "/profile";

export function getSafeRedirectPath(value: string | null, fallback = fallbackPath): string {
    if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
        return fallback;
    }

    try {
        const target = new URL(value, "https://kitchen-quest.invalid");
        if (target.origin !== "https://kitchen-quest.invalid") {
            return fallback;
        }
        return `${target.pathname}${target.search}${target.hash}`;
    } catch {
        return fallback;
    }
}