import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { UserLearningProgress } from "@/features/learning-progress/types";
import { learningCategoryLabels, type LearningModule } from "@/types/learning";

const difficultyTones = {
    Beginner: "green",
    Intermediate: "yellow",
    Advanced: "coral",
} as const;

export function LearningModuleCard({
    module,
    progress,
}: {
    module: LearningModule;
    progress?: UserLearningProgress | null;
}) {
    return (
        <Card className="flex h-full flex-col p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{learningCategoryLabels[module.category]}</Badge>
                <Badge tone={difficultyTones[module.difficulty]}>{module.difficulty}</Badge>
                {progress?.status === "completed" ? (
                    <Badge tone="green">
                        <CheckCircle2 aria-hidden="true" className="mr-1 inline" size={12} />
                        Completed · {progress.masteryScore}%
                    </Badge>
                ) : progress?.status === "in_progress" ? (
                    <Badge tone="yellow">
                        In progress · {progress.masteryScore}%
                    </Badge>
                ) : null}
            </div>
            <h2 className="display-font mt-5 text-2xl text-[#254235]">
                <Link className="hover:text-[#a8442d] hover:underline" href={`/learn/${module.slug}`}>{module.title}</Link>
            </h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-[#59675c]">{module.description}</p>
            <Link className="mt-5 inline-flex min-h-11 items-center gap-2 border-t border-[#eeece5] pt-4 text-sm font-semibold text-[#a8442d]" href={`/learn/${module.slug}`}>
                Open module <ArrowUpRight aria-hidden="true" size={16} />
            </Link>
        </Card>
    );
}
