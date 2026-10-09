# 🍳 Kitchen Quest

**Learn food. Master recipes. Become a better cook.**

![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)
![Status](https://img.shields.io/badge/status-pre--release-orange)

Kitchen Quest is an educational cooking game that combines practical food knowledge, recipe learning, interactive challenges, and game-based progression.

[Live demo](https://your-demo-link) · [Screenshots](#screenshots)

## Screenshots

[Add 2-3 screenshots or a short GIF: home, a game, the leaderboard]

## Features

- **Authentication:** registration, login, email confirmation, and password reset via Supabase
- **Recipes:** searchable recipes with ingredients and step-by-step methods
- **Learning:** lessons on ingredients, techniques, and food safety
- **Five games:** Ingredient Quiz, Recipe Builder, Cooking Order, Kitchen Challenge, Food Detective
- **Progression:** XP, levels, achievements, daily challenges, and streaks
- **Leaderboards:** server-calculated rankings based on XP
- **AI Chef:** an educational cooking assistant with safety-focused responses
- **Admin tools:** protected content management
- **Security:** PostgreSQL Row Level Security, server-side validation, protected progression operations

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS |
| Backend | Supabase, PostgreSQL |
| Quality | Vitest, ESLint |
| Tooling | Supabase CLI |

## Getting started

**Requirements:** Node.js 20.9+, npm, and a Supabase project.

```bash
git clone https://github.com/unmoha/Kitchen-Quest.git
cd Kitchen-Quest
npm install
```

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

> ⚠️ Never commit `.env.local` or expose service-role keys in browser code.

```bash
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check the project |
| `npm test` | Run tests |
| `npm run build` | Create a production build |
| `npm start` | Run the production build |

## Database

Migrations, seed data, and security tests live in `supabase/`. Use the Supabase CLI to apply migrations, and review the target project and migration status before applying changes.

## Food safety and scope

Kitchen Quest provides general cooking education. Food-safety guidance is conservative and evidence-based. Nutrition content is educational, not medical advice.

## Project status

Core implementation and automated verification are complete. Real-world deployment and production smoke testing are still needed before public release.

## Credits

Developed by **Anwar Mohammed**, a HAL Technologies product.
© 2026 HAL Technologies
