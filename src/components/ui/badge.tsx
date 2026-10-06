import type { ReactNode } from "react";

type BadgeTone = "green" | "yellow" | "coral" | "blue" | "neutral";

const badgeClasses: Record<BadgeTone, string> = {
    green: "bg-[#e5eee2] text-[#254235]",
    yellow: "bg-[#fbf1d5] text-[#69531d]",
    coral: "bg-[#f8e6df] text-[#8e3f2b]",
    blue: "bg-[#e4edf0] text-[#315b69]",
    neutral: "bg-[#f0efe9] text-[#59665d]",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
    return (
        <span className={`inline-flex min-h-7 items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses[tone]}`}>
            {children}
        </span>
    );
}