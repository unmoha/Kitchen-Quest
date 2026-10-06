import type { ReactNode } from "react";

export function AuthPageShell({ children }: { children: ReactNode }) {
    return (
        <main className="mx-auto flex w-full max-w-[1280px] flex-1 justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
            <div className="w-full max-w-md">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[#a8442d]">Kitchen Quest account</p>
                {children}
            </div>
        </main>
    );
}