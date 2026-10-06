import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "quiet";

const buttonClasses: Record<ButtonVariant, string> = {
    primary: "bg-[#b14b30] text-white hover:bg-[#a8442d]",
    secondary: "border border-[#d8ddd3] bg-white text-[#254235] hover:bg-[#f0f3ed]",
    quiet: "text-[#254235] hover:bg-[#edf0e9]",
};

const sharedClasses =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c55a3d] disabled:cursor-not-allowed disabled:opacity-55";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    children: ReactNode;
}

interface ButtonLinkProps {
    href: string;
    variant?: ButtonVariant;
    children: ReactNode;
    className?: string;
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
    return (
        <button className={`${sharedClasses} ${buttonClasses[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
}

export function ButtonLink({ href, variant = "primary", className = "", children }: ButtonLinkProps) {
    return (
        <Link className={`${sharedClasses} ${buttonClasses[variant]} ${className}`} href={href}>
            {children}
        </Link>
    );
}