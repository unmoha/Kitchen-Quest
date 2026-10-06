import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  align?: "left" | "center";
}

export function SectionHeading({ eyebrow, title, children, align = "left" }: SectionHeadingProps) {
  const alignment = align === "center" ? "mx-auto text-center" : "";

  return (
    <div className={`max-w-2xl ${alignment}`}>
      {eyebrow ? <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#a8442d]">{eyebrow}</p> : null}
      <h2 className="display-font text-3xl leading-tight text-[#254235] sm:text-4xl">{title}</h2>
      {children ? <div className="mt-3 text-base leading-7 text-[#59675c]">{children}</div> : null}
    </div>
  );
}