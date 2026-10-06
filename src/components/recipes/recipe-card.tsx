import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";
import type { Recipe } from "@/types/content";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { UserLearningProgress } from "@/features/learning-progress/types";

const difficultyTone = {
  Beginner: "green",
  Intermediate: "yellow",
  Advanced: "coral",
} as const;

export function RecipeCard({
  recipe,
  progress,
  eager = false,
}: {
  recipe: Recipe;
  progress?: UserLearningProgress | null;
  eager?: boolean;
}) {
  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;

  return (
    <Card className="group flex h-full flex-col transition-transform duration-200 hover:-translate-y-1">
      <div className="relative aspect-[1.55] overflow-hidden bg-[#e8e8dc]">
        <Image
          alt={recipe.imageAlt}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          fill
          loading={eager ? "eager" : "lazy"}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          src={recipe.image}
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone={difficultyTone[recipe.difficulty]}>{recipe.difficulty}</Badge>
          <span className="text-xs font-medium text-[#59675c]">{recipe.cuisine}</span>
          {progress?.status === "completed" ? (
            <Badge tone="green">
              <CheckCircle2 aria-hidden="true" className="mr-1 inline" size={12} />
              Mastered · {progress.masteryScore}%
            </Badge>
          ) : progress?.status === "in_progress" ? (
            <Badge tone="yellow">
              Practiced · {progress.masteryScore}%
            </Badge>
          ) : null}
        </div>
        <h3 className="display-font text-[22px] leading-snug text-[#254235]">
          <Link className="rounded-sm hover:text-[#a8442d] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c55a3d]" href={`/recipes/${recipe.slug}`}>
            {recipe.name}
          </Link>
        </h3>
        <p className="mt-2 flex-1 text-sm leading-6 text-[#59675c]">{recipe.description}</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#eeece5] pt-4 text-xs font-medium text-[#59675c]">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 aria-hidden="true" size={15} />
            {totalMinutes} min total
          </span>
          <span>Prep {recipe.prepMinutes} · Cook {recipe.cookMinutes} min</span>
        </div>
      </div>
    </Card>
  );
}
