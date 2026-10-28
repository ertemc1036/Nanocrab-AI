# NanoCrab AI

**Your AI. Your Rules.** — a platform for creating, customizing and using your
own AI agents without writing code.

> Status: **Phase 2 of 5** — authentication, profiles/account settings and the
> secured database schema are implemented. Agents, chat and memory UIs are not
> functional yet. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

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

| Command             | What it does                           |
| ------------------- | -------------------------------------- |
| `npm run dev`       | Start the dev server                   |
| `npm run build`     | Production build                       |
| `npm run check`     | Typecheck + lint + unit tests          |
| `npm run typecheck` | Generate route types and run `tsc`     |
| `npm run lint`      | ESLint                                 |
| `npm test`          | Vitest unit tests                      |
| `npm run format`    | Prettier (with Tailwind class sorting) |

## Docs

- [Architecture & plan](docs/ARCHITECTURE.md)
- [Supabase setup](docs/SUPABASE_SETUP.md)
- [Security model & live checklist](docs/SECURITY.md)

## Adding UI components

Components in `src/components/ui` are vendored from shadcn/ui
(`new-york-v4`, Radix base). The shadcn CLI also works where the registry is
reachable: `npx shadcn@latest add <component>`.
