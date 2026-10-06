"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { href: "/admin", label: "Dashboard", exact: true },
    { href: "/admin/ingredients", label: "Ingredients" },
    { href: "/admin/recipes", label: "Recipes" },
    { href: "/admin/learning", label: "Learning Modules" },
    { href: "/admin/questions", label: "Questions" },
    { href: "/admin/challenges", label: "Daily Challenges" },
    { href: "/admin/achievements", label: "Achievements" },
];

export function AdminNav() {
    const pathname = usePathname();

    return (
        <nav aria-label="Admin Navigation" className="border-b border-[#e7e3d9] bg-[#fdfcf9] px-4">
            <div className="mx-auto flex max-w-7xl space-x-1 overflow-x-auto py-2">
                {navItems.map((item) => {
                    const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                                isActive
                                    ? "bg-[#254235] text-white shadow-xs"
                                    : "text-[#59675c] hover:bg-[#f0ece1] hover:text-[#25382f]"
                            }`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
