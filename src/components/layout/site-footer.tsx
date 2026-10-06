import Link from "next/link";
import { CookingPot } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[#e7e3d9] bg-[#f3f1e9]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-10">
        <Link className="flex items-center gap-2 text-sm font-semibold text-[#254235]" href="/">
          <CookingPot aria-hidden="true" size={19} />
          <span>Kitchen Quest</span>
        </Link>
        <p className="max-w-xl text-xs leading-5 text-[#59675c]">
          Educational content is for learning and inspiration and is not medical or food-safety advice. Always follow current local food-safety guidance.
        </p>
        <span className="shrink-0 text-xs text-[#59675c]">Kitchen Quest · Curiosity, served daily</span>
      </div>
    </footer>
  );
}