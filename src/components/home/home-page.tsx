import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, BookOpenCheck, CookingPot, Flame, Leaf, Sparkles, Trophy, Zap } from "lucide-react";
import { learningCategories } from "@/data/learning";
import { featuredContent } from "@/data/featured-content";
import { CategoryCard } from "@/components/learning/category-card";
import { FeaturedCard } from "@/components/home/featured-card";
import { SectionHeading } from "@/components/layout/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";

const steps = [
  {
    number: "01",
    title: "Discover",
    description: "Meet ingredients, tools, and the culinary science behind what we eat.",
    Icon: Leaf,
  },
  {
    number: "02",
    title: "Learn",
    description: "Master techniques, food safety, and kitchen fundamentals through structured lessons.",
    Icon: BookOpenCheck,
  },
  {
    number: "03",
    title: "Play",
    description: "Sharpen instincts across 5 interactive challenge formats with instant XP feedback.",
    Icon: Sparkles,
  },
  {
    number: "04",
    title: "Master",
    description: "Build streaks, unlock achievements, climb leaderboards, and cook with confidence.",
    Icon: CookingPot,
  },
];

const liveSkills = [
  { label: "Ingredient Know-how", value: 85, tone: "green" as const },
  { label: "Cooking Techniques", value: 70, tone: "coral" as const },
  { label: "Food Safety & Storage", value: 92, tone: "yellow" as const },
  { label: "Flavor & Recipe Structure", value: 64, tone: "green" as const },
];

export function HomePage() {
  return (
    <main>
      <section className="overflow-hidden bg-[#f8f6f0]">
        <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[0.94fr_1.06fr] lg:gap-12 lg:px-10 lg:py-16">
          <div className="reveal-up relative z-10 max-w-xl">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e1dccf] bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#59675c]">
              <span className="size-2 rounded-full bg-[#c55a3d]" aria-hidden="true" />
              For curious home cooks
            </span>
            <h1 className="display-font text-5xl leading-[0.97] text-[#254235] sm:text-6xl lg:text-7xl">
              Kitchen <span className="text-[#c55a3d]">Quest</span>
            </h1>
            <p className="mt-6 max-w-lg text-xl font-semibold leading-8 text-[#3c5144] sm:text-2xl sm:leading-9">
              Learn food. Master recipes. Become a better cook.
            </p>
            <p className="mt-4 max-w-lg text-base leading-7 text-[#59675c]">
              A playful and practical way into the kitchen: explore ingredients, understand culinary science, play bite-sized challenges, and level up your cooking skills.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/play">
                Play challenges <ArrowRight aria-hidden="true" size={17} />
              </ButtonLink>
              <ButtonLink href="/recipes" variant="secondary">
                Explore recipes
              </ButtonLink>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-[#59675c]">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#3d7b52]" aria-hidden="true" /> 5 Game Modes
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Flame size={14} className="text-[#ea580c]" aria-hidden="true" /> Daily Challenges
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Trophy size={14} className="text-[#d97706]" aria-hidden="true" /> Achievements
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap size={14} className="text-[#3d7b52]" aria-hidden="true" /> AI Sous Chef
              </span>
            </div>
          </div>

          <div className="relative min-h-[340px] sm:min-h-[440px] lg:min-h-[540px]">
            <div className="absolute inset-0 overflow-hidden rounded-lg bg-[#d8ddcf]">
              <Image
                alt="A home cook preparing colorful vegetables at a sunlit kitchen counter"
                className="object-cover object-center"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                src="/images/hero-table.jpg"
              />
            </div>
            <div className="absolute bottom-4 left-4 max-w-[250px] rounded-xl border border-white/55 bg-white/90 p-4 shadow-[0_8px_28px_rgba(35,54,42,0.14)] backdrop-blur-sm sm:bottom-6 sm:left-6">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-[#a8442d]">
                <CookingPot aria-hidden="true" size={15} />
                Kitchen wisdom, one idea at a time
              </div>
              <p className="display-font mt-2 text-lg leading-snug text-[#254235]">Good cooking starts with curiosity.</p>
            </div>
            <span aria-hidden="true" className="page-grain absolute -bottom-5 -right-5 -z-0 size-24 rounded-full opacity-[0.08]" />
          </div>
        </div>
        <a className="mx-auto hidden w-fit items-center gap-2 pb-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#59675c] lg:flex" href="#how-it-works">
          Take a look around <ArrowDown aria-hidden="true" size={14} />
        </a>
      </section>

      <section className="border-y border-[#e7e3d9] bg-white py-12 sm:py-16" id="how-it-works">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <SectionHeading eyebrow="How it works" title="From curious to confident, one step at a time.">
            A learning journey designed around the choices and techniques that make everyday cooking click.
          </SectionHeading>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ number, title, description, Icon }) => (
              <article className="relative border-t border-[#dfe3d9] pt-5" key={number}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-[0.12em] text-[#a8442d]">{number}</span>
                  <Icon aria-hidden="true" className="text-[#597664]" size={20} strokeWidth={1.7} />
                </div>
                <h3 className="display-font mt-5 text-2xl text-[#254235]">{title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-[#59675c]">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading eyebrow="Explore the kitchen" title="A little knowledge goes a long way.">
              Browse practical topics across the food skills you reach for every day.
            </SectionHeading>
            <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#a8442d]" href="/learn">
              All learning topics <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {learningCategories.map((category) => <CategoryCard category={category} key={category.id} />)}
          </div>
        </div>
      </section>

      <section className="bg-[#e9ede5] py-14 sm:py-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading eyebrow="A taste of what is ahead" title="Fresh ideas for your next kitchen moment." />
            <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#a8442d]" href="/recipes">
              Browse recipes <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {featuredContent.map((item) => <FeaturedCard item={item} key={item.id} />)}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-4 sm:px-6 lg:grid-cols-[0.86fr_1.14fr] lg:items-center lg:px-10">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#a8442d]">Progressive Mastery</p>
            <h2 className="display-font max-w-md text-3xl leading-tight text-[#254235] sm:text-4xl">A little practice adds up to culinary confidence.</h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-[#59675c]">
              Every quiz answered, recipe explored, and daily challenge completed earns XP toward your culinary level. Unlock achievements, build daily cooking habits, and consult your personal AI Chef.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/play">Start today&apos;s challenge</ButtonLink>
              <ButtonLink href="/profile" variant="secondary">View your profile</ButtonLink>
            </div>
          </div>
          <div className="rounded-2xl border border-[#e7e3d9] bg-white p-5 sm:p-8 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eeece5] pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#59675c]">Skill Progression</p>
                <h3 className="display-font mt-1 text-2xl text-[#254235]">Culinary mastery tracking</h3>
              </div>
              <span className="rounded-full bg-[#edf5eb] px-3 py-1.5 text-xs font-semibold text-[#294b34]">Active System</span>
            </div>
            <div className="mt-6 space-y-5">
              {liveSkills.map((skill) => (
                <div key={skill.label}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-[#34483a]">{skill.label}</span>
                    <span className="font-semibold tabular-nums text-[#59675c]">{skill.value}%</span>
                  </div>
                  <ProgressBar label={`${skill.label} progress indicator`} max={100} tone={skill.tone} value={skill.value} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}