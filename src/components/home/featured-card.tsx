import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { FeaturedContent } from "@/types/content";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const tones = { green: "green", yellow: "yellow", coral: "coral" } as const;

export function FeaturedCard({ item }: { item: FeaturedContent }) {
  return (
    <Card className="group h-full transition-transform duration-200 hover:-translate-y-1">
      <Link aria-label={`${item.title}: ${item.type}`} className="flex h-full flex-col" href={item.href}>
        <div className="relative aspect-[1.65] overflow-hidden bg-[#e8e8dc]">
          <Image
            alt={item.imageAlt}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            src={item.image}
          />
        </div>
        <div className="flex flex-1 flex-col p-5">
          <Badge tone={tones[item.accent]}>{item.type}</Badge>
          <h3 className="display-font mt-3 text-[22px] text-[#254235]">{item.title}</h3>
          <p className="mt-2 flex-1 text-sm leading-6 text-[#59675c]">{item.description}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#a8442d]">
            Explore <ArrowUpRight aria-hidden="true" size={16} />
          </span>
        </div>
      </Link>
    </Card>
  );
}