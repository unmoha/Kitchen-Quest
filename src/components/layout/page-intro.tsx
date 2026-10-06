interface PageIntroProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function PageIntro({ eyebrow, title, description }: PageIntroProps) {
  return (
    <div className="max-w-3xl">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#a8442d]">{eyebrow}</p>
      <h1 className="display-font text-4xl leading-tight text-[#254235] sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[#59675c] sm:text-lg">{description}</p>
    </div>
  );
}