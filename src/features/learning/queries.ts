import "server-only";

import type { LearningModule } from "@/types/learning";
import { toLearningModule } from "@/lib/learning-mapping";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LearningModulesResult =
    | { status: "unconfigured" }
    | { status: "error" }
    | { status: "empty" }
    | { status: "ready"; modules: LearningModule[] };

export type LearningModuleResult =
    | { status: "unconfigured" }
    | { status: "error" }
    | { status: "not-found" }
    | { status: "ready"; module: LearningModule };

export async function getPublishedLearningModules(): Promise<LearningModulesResult> {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        return { status: "unconfigured" };
    }

    const { data, error } = await supabase
        .from("learning_modules")
        .select("id, title, slug, description, category, difficulty, content, status, created_at, updated_at")
        .eq("status", "published")
        .order("category")
        .order("title");

    if (error) {
        console.error("Published learning modules query failed", error.code);
        return { status: "error" };
    }
    if (!data?.length) {
        return { status: "empty" };
    }
    return { status: "ready", modules: data.map(toLearningModule) };
}

export async function getPublishedLearningModuleBySlug(slug: string): Promise<LearningModuleResult> {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        return { status: "unconfigured" };
    }

    const { data, error } = await supabase
        .from("learning_modules")
        .select("id, title, slug, description, category, difficulty, content, status, created_at, updated_at")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

    if (error) {
        console.error("Published learning module detail query failed", error.code);
        return { status: "error" };
    }
    if (!data) {
        return { status: "not-found" };
    }
    return { status: "ready", module: toLearningModule(data) };
}