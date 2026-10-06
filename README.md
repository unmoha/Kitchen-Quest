# Kitchen Quest

**Learn food. Master recipes. Become a better cook.**

Kitchen Quest is an educational cooking game that combines practical food knowledge, recipe learning, interactive challenges, and game-based progression.

## Features

* **Authentication:** Registration, login, email confirmation, password reset, and password updates using Supabase.
* **Recipes:** Searchable recipes, ingredients, and step-by-step cooking methods.
* **Learning:** Educational modules and lessons about ingredients, techniques, and food safety.
* **Five interactive games:** Ingredient Quiz, Recipe Builder, Cooking Order, Kitchen Challenge, and Food Detective.
* **Progression:** Learning progress, XP, levels, achievements, daily challenges, and streaks.
* **Leaderboards:** Server-calculated rankings based on earned XP.
* **AI Chef:** An educational cooking assistant with safety-focused response handling.
* **Administration:** Protected tools for managing educational content.
* **Security:** PostgreSQL Row Level Security (RLS), server-side validation, and protected progression operations.

## Technology

* Next.js App Router
* React and TypeScript
* Tailwind CSS
* Supabase and PostgreSQL
* Vitest
* ESLint
* Supabase CLI

## Requirements

* Node.js 20.9 or newer
* npm
* A Supabase project for hosted authentication and database functionality

## Installation

Clone the repository and enter the project directory:

```bash
git clone https://github.com/unmoha/Kitchen-Quest.git
cd Kitchen-Quest
npm install
```

Create a `.env.local` file in the project root with your Supabase project URL and publishable key:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Never commit `.env.local` or expose service-role keys in browser code.

Start the development server:

```bash
npm run dev
```

Open http://localhost:3000.

## Development Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

## Database

Database configuration, migrations, seed data, and security tests are maintained in the `supabase/` directory.

Use the Supabase CLI to apply migrations to the intended project. Review the target project and migration status before applying database changes.

## Food Safety and Educational Scope

Kitchen Quest provides general cooking education. Food-safety guidance should be conservative and evidence-based. Nutrition content is educational and is not a substitute for professional medical advice.

## Developer and Ownership

**Developed by Anwar Mohammed**
**A HAL Technologies product**
Copyright © 2026 HAL Technologies

## Project Status

The application has completed its planned core implementation and automated verification stages. Real-world deployment and production smoke testing remain necessary before public release.
