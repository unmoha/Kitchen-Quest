import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    id: string;
}

export function Input({ label, id, className = "", ...props }: InputProps) {
    return (
        <label className="block text-sm font-medium text-[#33463a]" htmlFor={id}>
            <span className="sr-only">{label}</span>
            <input
                className={`min-h-11 w-full rounded-full border border-[#dcded5] bg-white px-4 text-sm text-[#25382f] placeholder:text-[#7c867d] focus:border-[#547a5e] focus:outline-none focus:ring-2 focus:ring-[#547a5e]/20 ${className}`}
                id={id}
                {...props}
            />
        </label>
    );
}