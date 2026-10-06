import type { ContentStatus } from "@/features/admin/types";

export function StatusBadge({ status }: { status: ContentStatus }) {
    switch (status) {
        case "published":
            return (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-300">
                    Published
                </span>
            );
        case "draft":
            return (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-300">
                    Draft
                </span>
            );
        case "review":
            return (
                <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800 border border-sky-300">
                    Review
                </span>
            );
        case "archived":
            return (
                <span className="inline-flex items-center rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-semibold text-stone-700 border border-stone-300">
                    Archived
                </span>
            );
        default:
            return null;
    }
}
