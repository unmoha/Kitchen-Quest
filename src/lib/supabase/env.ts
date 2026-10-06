export interface SupabasePublicConfig {
    url: string;
    publishableKey: string;
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

    if (!url || !publishableKey) {
        return null;
    }

    try {
        const parsedUrl = new URL(url);
        const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
        if (parsedUrl.protocol !== "https:" && !(parsedUrl.protocol === "http:" && localHosts.has(parsedUrl.hostname))) {
            return null;
        }
    } catch {
        return null;
    }

    return { url, publishableKey };
}