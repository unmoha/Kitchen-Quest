# Kitchen-Quest project rules

Stack: Next.js 16 (App Router, Turbopack), React, TypeScript, Tailwind, Supabase, Vitest.

## Non-negotiables
- XP, achievements, streaks and leaderboard changes happen ONLY in server-side Supabase functions/server actions. Never award them from client code.
- Never run `npm audit fix --force`. Never edit files in supabase/migrations that are already committed; add a new migration instead.
- Do not hard-code hex colors in components. Use theme tokens (CSS variables / Tailwind theme).
- All interactive UI must be keyboard accessible, have visible focus, and respect prefers-reduced-motion.
- Paths with brackets like src/app/recipes/[slug] need -LiteralPath in PowerShell.

## Definition of done (run all, in this order)
1. npx tsc --noEmit
2. npx vitest run
3. npm run build
Every behavior change needs a test. Keep diffs small and focused; do not reformat unrelated files.

## Conventions
- Pure logic lives in logic.ts files with unit tests; components stay thin.
- Reuse components in src/components/ui (Button, ButtonLink, Badge, PageIntro, page-states).
