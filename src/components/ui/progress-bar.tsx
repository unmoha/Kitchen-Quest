interface ProgressBarProps {
    value: number;
    max?: number;
    label: string;
    tone?: "green" | "coral" | "yellow";
}

const progressClasses = {
    green: "bg-[#547a5e]",
    coral: "bg-[#b14b30]",
    yellow: "bg-[#d5a934]",
};

export function ProgressBar({ value, max = 100, label, tone = "green" }: ProgressBarProps) {
    const safeMax = Math.max(1, max);
    const percentage = Math.min(100, Math.max(0, (value / safeMax) * 100));

    return (
        <div
            aria-label={label}
            aria-valuemax={safeMax}
            aria-valuemin={0}
            aria-valuenow={Math.min(safeMax, Math.max(0, value))}
            className="h-2.5 overflow-hidden rounded-full bg-[#e9e8df]"
            role="progressbar"
        >
            <div className={`h-full rounded-full transition-[width] duration-500 ${progressClasses[tone]}`} style={{ width: `${percentage}%` }} />
        </div>
    );
}