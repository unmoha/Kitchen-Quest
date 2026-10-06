# Kitchen Quest

**Learn food. Master recipes. Become a better cook.**

Kitchen Quest is an educational cooking game concept for curious home cooks. It brings together practical food knowledge, recipe inspiration, and playful learning so people can better understand the ingredients, techniques, tools, and traditions behind a meal.

## Product Vision

The learning journey is designed to move from discovery to understanding, then practice, feedback, and reinforcement. Food safety guidance is conservative and educational; nutrition content is not medical advice. Cultural content should be grounded in ingredients, techniques, and context rather than stereotypes.

## Current Features

- Responsive application shell, existing Phase 1 routes, and shared design system.
- Supabase email/password registration, login, email confirmation callback, password reset, and password update flows.
- Server-verified profile reads and display-name updates protected by PostgreSQL RLS.
- Recipes and learning modules loaded from published Supabase content, with RLS-enforced publication filtering.
- Recipe search/filter, recipe detail, ingredient list, and ordered method backed by database rows.
- Published learning module list and lesson detail pages.
- Reproducible PostgreSQL migration, content seed, and pgTAP ownership/publication tests.

The home-page featured cards and progress visualization remain Phase 1 previews. Game modes are still previews. There is no scoring, XP, progression, achievement awarding, streak tracking, or leaderboard implementation.

## Technology

- Next.js App Router
- React and TypeScript with strict checking
- Tailwind CSS
- ESLint
- Vitest
- Lucide React icons
- Supabase JS, Supabase SSR, and Supabase CLI

## Project Structure

```text
src/
	app/             App Router pages, auth, profile, and content detail routes
	components/      Shared layout, UI, auth, profile, and content components
	data/            Phase 1 home-page preview content and filter constants
	features/         Server-side published-content queries
	lib/              Supabase clients, auth helpers, mapping, and tests
	types/            Maintained database and application types
supabase/	         PostgreSQL migrations, seed data, and pgTAP tests
public/
	images/           Local food photography
```

## Setup

Requirements: Node.js 20.9 or newer and npm. Local database commands also require Docker Desktop with its Linux engine running.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` and set the Supabase project URL and publishable key. The publishable key is intended for browser use; never put a service-role or secret key in a `NEXT_PUBLIC_` variable or browser code. The app shows a setup state when these public variables are absent.

## Supabase Setup

The schema is reproducible from `supabase/migrations/20261001000000_phase2_foundation.sql`; `supabase/seed.sql` supplies published educational content. `supabase/config.toml` configures local auth redirects and seed execution.

```bash
npm run db:start  # Start local Supabase services; requires Docker
npm run db:reset  # Recreate the local database, apply migrations, and seed it
npm run db:test   # Run pgTAP ownership and publication tests
npm run db:stop   # Stop local Supabase services
```

For a hosted project, apply migrations through the Supabase CLI and allow `http://localhost:3000/auth/callback` in the project's Auth redirect URL settings. Do not apply schema changes only through the dashboard.

Profiles are private and user-scoped. Public roles have read-only grants on educational content and can only see rows with `status = 'published'`. Questions and answer options have no client grants; answer-key validation is reserved for trusted server operations in a later phase.

## Development Commands

```bash
npm run dev       # Start the development server
npm run lint      # Run ESLint
npm run typecheck # Run strict TypeScript checking
npm test          # Run unit tests once
npm run build     # Create a production build
npm start         # Serve the production build
npm run db:test   # Run local PostgreSQL RLS tests
```

## Current Phase

**Phase 2 — Database and authentication foundation.** The schema, RLS policies, Supabase integration, auth routes, profile workflow, and published content reads are implemented. A Supabase project and local Docker database are required to exercise the remote auth and database behavior; those were not available during this implementation, so SQL/auth integration tests have not been claimed as run.

## Phase Roadmap

1. **Phase 1 — Foundation and UX:** responsive shell, accessible components, route structure, local typed previews, and frontend states. Complete.
2. **Phase 2 — Data foundation:** PostgreSQL schema and migrations, Supabase auth, RLS, profile updates, and published content retrieval. Implemented; local/remote database verification remains environment-dependent.
3. **Phase 3 — Learning and gameplay:** build curated lesson content and challenge flows, with server-validated answers and scoring.
4. **Phase 4 — Player progression:** add account-backed profiles, progress, achievements, streaks, and fair leaderboard behavior with authorization and tests.
5. **Phase 5 — Product expansion:** evaluate additional experiences such as an AI Chef or administration tools only after the core product and security model are established.

Later phases are roadmap intent, not implemented functionality.
