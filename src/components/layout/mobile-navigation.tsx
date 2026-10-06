"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { navigation } from "@/components/layout/navigation";

export function MobileNavigation() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative lg:hidden">
            <button
                aria-controls="mobile-primary-navigation"
                aria-expanded={isOpen}
                aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#d8ddd3] bg-white px-4 text-sm font-semibold text-[#254235] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c55a3d]"
                onClick={() => setIsOpen((open) => !open)}
                type="button"
            >
                {isOpen ? <X aria-hidden="true" size={18} /> : <Menu aria-hidden="true" size={18} />}
                <span>{isOpen ? "Close" : "Menu"}</span>
            </button>
            {isOpen ? (
                <div className="absolute right-0 top-[calc(100%+8px)] w-[min(17rem,calc(100vw-2rem))] rounded-lg border border-[#e7e3d9] bg-white p-1 shadow-[0_12px_32px_rgba(35,54,42,0.14)]">
                    <nav aria-label="Mobile navigation" className="grid gap-1" id="mobile-primary-navigation">
                        {navigation.map((item) => (
                            <Link
                                className="flex min-h-11 items-center rounded-full px-3 py-2 text-sm font-medium text-[#4f6255] transition-colors hover:bg-[#e9ede5] hover:text-[#1c3328]"
                                href={item.href}
                                key={item.href}
                                onClick={() => setIsOpen(false)}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            ) : null}
        </div>
    );
}