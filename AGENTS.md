<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Kitchen-Quest project rules

Stack: Next.js 16 (App Router, Turbopack), React, TypeScript, Tailwind, Supabase, Vitest.

## Non-negotiables
- XP, achievements, streaks and leaderboard changes happen ONLY in server-side Supabase functions/server actions. Never award them from client code.
- Never run `npm audit fix --force`. Never edit committed files in supabase/migrations; add a new migration instead.
- Do not hard-code hex colors in components. Use theme tokens (CSS variables / Tailwind theme).
- All interactive UI must be keyboard accessible, have visible focus, and respect prefers-reduced-motion.
- Paths with brackets like src/app/recipes/[slug] need -LiteralPath in PowerShell.

## Definition of done (run in this order)
1. npm run typecheck
2. npx vitest run
3. npm run build
Every behavior change needs a test. Keep diffs small; do not reformat unrelated files.

## Conventions
- Pure logic lives in logic.ts files with unit tests; components stay thin.
- Reuse components in src/components/ui (Button, ButtonLink, Badge, PageIntro, page-states).
