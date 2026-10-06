import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLElement> {
    children: ReactNode;
}

export function Card({ className = "", children, ...props }: CardProps) {
    return (
        <article className={`overflow-hidden rounded-lg border border-[#e7e3d9] bg-white ${className}`} {...props}>
            {children}
        </article>
    );
}