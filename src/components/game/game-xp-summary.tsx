import type { SessionXpSummary } from "@/features/xp-levels/types";
import { Sparkles, Zap } from "lucide-react";

interface GameXpSummaryProps {
    xpSummary: SessionXpSummary | null | undefined;
}

export function GameXpSummary({ xpSummary }: GameXpSummaryProps) {
    if (!xpSummary) {
        return null;
    }

    const {
        totalXpEarned,
        breakdown,
        levelInfo,
        leveledUp,
        currentLevel,
    } = xpSummary;

    return (
        <div className="mt-6 rounded-xl border border-[#dfe7de] bg-[#fafbf9] p-4 sm:p-5" aria-labelledby="session-xp-heading">
            {leveledUp ? (
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#c4dbbc] bg-[#edf6eb] p-3 text-[#234b32]" role="status">
                    <span className="grid size-8 place-items-center rounded-full bg-[#d7edd0] text-[#234b32]">
                        <Sparkles aria-hidden="true" size={18} />
                    </span>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#346a48]">Level Up!</p>
                        <p className="text-sm font-semibold">You reached Level {currentLevel}!</p>
                    </div>
                </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7e3d9] pb-3">
                <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-full bg-[#e5eee2] text-[#254235]">
                        <Zap aria-hidden="true" size={16} />
                    </span>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5c6d62]" id="session-xp-heading">XP Earned</p>
                        <p className="display-font text-2xl font-bold text-[#3d7b52]">+{totalXpEarned} XP</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#59675c]">Current Level</p>
                    <p className="display-font text-xl font-bold text-[#254235]">Level {levelInfo.level}</p>
                </div>
            </div>

            {breakdown.length > 0 ? (
                <ul className="mt-3 divide-y divide-[#eeece5]">
                    {breakdown.map((item, index) => (
                        <li key={`${item.sourceType}-${index}`} className="flex items-center justify-between py-1.5 text-xs">
                            <span className="text-[#59675c]">{item.description}</span>
                            <span className="font-semibold text-[#3d7b52]">+{item.amount} XP</span>
                        </li>
                    ))}
                </ul>
            ) : null}

            <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-medium text-[#59675c]">
                    <span>{levelInfo.xpIntoLevel} / {levelInfo.xpNeededForNextLevel} XP to Level {levelInfo.level + 1}</span>
                    <span>{levelInfo.progressPercent}%</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#edf0e9]">
                    <div
                        className="h-full rounded-full bg-[#3d7b52] transition-all duration-300"
                        style={{ width: `${levelInfo.progressPercent}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
