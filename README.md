# NanoCrab AI

**Your AI. Your Rules.** — your personal AI CEO, from zero business experience
to your first customer and first revenue. NanoCrab leads until you earn your
first revenue; then you become the CEO and NanoCrab becomes your AI Co-Founder.

> Status: **MVP feature-complete** — authentication, onboarding, AI CEO chat
> (OpenAI), business planner, tasks, founder memory, revenue tracking and the
> AI Co-Founder transition. Live OpenAI and Supabase checks are still pending.
> See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/AI.md](docs/AI.md).

## Getting started

Requirements: Node.js ≥ 22.12.

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase values
npm run dev                  # http://localhost:3000
```

Authentication needs a Supabase project — follow
[docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md). Without it, the app runs but
auth pages show a "not configured" notice and private pages stay locked.

## Scripts

| Command                  | What it does                                              |
| ------------------------ | --------------------------------------------------------- |
| `npm run dev`            | Start the dev server                                      |
| `npm run build`          | Production build                                          |
| `npm run check`          | Typecheck + lint + unit tests                             |
| `npm run typecheck`      | Generate route types and run `tsc`                        |
| `npm run lint`           | ESLint                                                    |
| `npm test`               | Vitest unit tests                                         |
| `npm run format`         | Prettier (with Tailwind class sorting)                    |
| `npm run test:db`        | Database security tests on a throwaway local PostgreSQL   |
| `npm run db:types`       | Regenerate database types from the migrations             |
| `npm run supabase:check` | Verify your Supabase project has all tables and functions |

## Docs

- [Architecture & plan](docs/ARCHITECTURE.md)
- [Supabase setup](docs/SUPABASE_SETUP.md)
- [AI engine, costs & live test plan](docs/AI.md)
- [Security model & live checklist](docs/SECURITY.md)

## Adding UI components

Components in `src/components/ui` are vendored from shadcn/ui
(`new-york-v4`, Radix base). The shadcn CLI also works where the registry is
reachable: `npx shadcn@latest add <component>`.
