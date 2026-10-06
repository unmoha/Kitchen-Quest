import Link from "next/link";
import { CookingPot } from "lucide-react";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { navigation } from "@/components/layout/navigation";

function DesktopNavigation() {
  return (
    <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
      {navigation.map((item) => (
        <Link
          className="rounded-full px-3 py-2 text-sm font-medium text-[#4f6255] transition-colors hover:bg-[#e9ede5] hover:text-[#1c3328]"
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-[#e7e3d9] bg-[#f8f6f0]/95">
      <div className="mx-auto flex min-h-[76px] max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Link aria-label="Kitchen Quest home" className="flex shrink-0 items-center gap-3" href="/">
          <span className="grid size-10 place-items-center rounded-[13px] bg-[#254235] text-[#f0c86a]">
            <CookingPot aria-hidden="true" size={22} strokeWidth={1.8} />
          </span>
          <span className="leading-tight">
            <span className="display-font block text-lg font-semibold text-[#254235]">Kitchen Quest</span>
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.12em] text-[#59675c] sm:block">Curiosity, served daily</span>
          </span>
        </Link>
        <DesktopNavigation />
        <MobileNavigation />
      </div>
    </header>
  );
}