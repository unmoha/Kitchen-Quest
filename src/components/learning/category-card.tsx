import { Apple, CookingPot, Globe2, Leaf, ShieldCheck, Utensils } from "lucide-react";
import type { LearningCategory } from "@/types/content";
import { Card } from "@/components/ui/card";

const categoryIcons = {
  ingredients: Apple,
  techniques: CookingPot,
  tools: Utensils,
  safety: ShieldCheck,
  nutrition: Leaf,
  cuisines: Globe2,
} as const;

const iconColors = {
  green: "bg-[#e5eee2] text-[#3c6848]",
  yellow: "bg-[#fbf1d5] text-[#8a6c25]",
  coral: "bg-[#f8e6df] text-[#a34d35]",
  blue: "bg-[#e4edf0] text-[#3c6979]",
} as const;

export function CategoryCard({ category }: { category: LearningCategory }) {
  const Icon = categoryIcons[category.id];

  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <span className={`mb-5 grid size-12 place-items-center rounded-2xl ${iconColors[category.color]}`}>
        <Icon aria-hidden="true" size={23} strokeWidth={1.8} />
      </span>
      <h3 className="display-font text-[22px] text-[#254235]">{category.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-[#59675c]">{category.description}</p>
      <ul className="mt-4 space-y-2 border-t border-[#eeece5] pt-4 text-sm leading-5 text-[#59675c]">
        {category.exampleTopics.map((topic) => (
          <li className="flex items-start gap-2" key={topic}>
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-[#b14b30]" />
            {topic}
          </li>
        ))}
      </ul>
      <p className="mt-5 border-t border-[#eeece5] pt-4 text-xs font-semibold uppercase tracking-[0.08em] text-[#59675c]">
        Explore topics
      </p>
    </Card>
  );
}