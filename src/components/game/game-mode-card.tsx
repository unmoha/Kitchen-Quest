import { Apple, BookOpenCheck, CookingPot, Search, ShieldCheck } from "lucide-react";
import type { GameMode } from "@/types/content";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UnavailableNotice } from "@/components/ui/page-states";

const modeIcons = {
  "ingredient-quiz": Apple,
  "recipe-builder": BookOpenCheck,
  "cooking-order": CookingPot,
  "kitchen-challenge": ShieldCheck,
  "food-detective": Search,
} as const;

const modeTones = ["green", "yellow", "coral", "blue", "green"] as const;
const iconTones = [
  "bg-[#e5eee2] text-[#3c6848]",
  "bg-[#fbf1d5] text-[#8a6c25]",
  "bg-[#f8e6df] text-[#a34d35]",
  "bg-[#e4edf0] text-[#3c6979]",
  "bg-[#e5eee2] text-[#3c6848]",
] as const;

export function GameModeCard({ mode, index, href, ctaLabel }: { mode: GameMode; index: number; href?: string; ctaLabel?: string }) {
  const Icon = modeIcons[mode.id];

  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${iconTones[index % iconTones.length]}`}>
          <Icon aria-hidden="true" size={23} strokeWidth={1.8} />
        </span>
        <Badge tone={modeTones[index % modeTones.length]}>{href ? "Playable" : "Mode preview"}</Badge>
      </div>
      <h2 className="display-font mt-5 text-2xl text-[#254235]">{mode.name}</h2>
      <p className="mt-2 flex-1 text-sm leading-6 text-[#59675c]">{mode.description}</p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-[#59675c]">
        Learning focus · {mode.learningFocus}
      </p>
      <div className="mt-5">
        {href ? (
          <ButtonLink href={href} variant="secondary" className="w-full justify-center">{ctaLabel ?? "Play now"}</ButtonLink>
        ) : (
          <UnavailableNotice>Interactive challenges are not part of this preview.</UnavailableNotice>
        )}
      </div>
    </Card>
  );
}