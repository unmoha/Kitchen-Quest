import type { ReactNode } from "react";

export function PreviewNotice({ children }: { children: ReactNode }) {
    return (
        <div className="rounded-xl border border-[#e8d89d] bg-[#fff8e7] px-4 py-3 text-sm leading-6 text-[#5c4d29]" role="note">
            {children}
        </div>
    );
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="rounded-xl border border-dashed border-[#d8ddd3] bg-[#fbfaf6] px-6 py-10 text-center">
            <h2 className="display-font text-2xl text-[#254235]">{title}</h2>
            <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#59675c]">{children}</div>
        </div>
    );
}

export function LoadingState({ label = "Loading content" }: { label?: string }) {
    return (
        <div aria-live="polite" className="flex min-h-40 items-center justify-center gap-3 text-sm text-[#59675c]" role="status">
            <span aria-hidden="true" className="size-4 animate-pulse rounded-full bg-[#547a5e] motion-reduce:animate-none" />
            {label}
        </div>
    );
}

export function ErrorState({ message = "We could not load this content. Please try again." }: { message?: string }) {
    return (
        <div className="rounded-xl border border-[#e6c8bd] bg-[#fcf1ed] px-5 py-4 text-sm leading-6 text-[#793d2b]" role="alert">
            {message}
        </div>
    );
}

export function SuccessState({ children }: { children: ReactNode }) {
    return (
        <div className="rounded-xl border border-[#cbdcc9] bg-[#edf5eb] px-5 py-4 text-sm leading-6 text-[#294b34]" role="status">
            {children}
        </div>
    );
}

export function UnauthorizedState() {
    return (
        <div className="rounded-xl border border-[#d8ddd3] bg-white px-5 py-4 text-sm leading-6 text-[#59665d]" role="status">
            Your personal account data will be available when accounts are introduced in a later phase.
        </div>
    );
}

export function UnavailableNotice({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f0efe9] px-4 py-3 text-sm text-[#59665d]">
            <span>{children}</span>
            <span className="shrink-0 font-semibold">Coming later</span>
        </div>
    );
}