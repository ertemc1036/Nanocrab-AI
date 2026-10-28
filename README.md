# NanoCrab AI

**Your AI. Your Rules.** — a platform for creating, customizing and using your
own AI agents without writing code.

> Status: **Phase 1 of 5** (design system + app shell). Authentication, agents,
> chat and memory are not functional yet. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Getting started

Requirements: Node.js ≥ 22.12.

```bash
npm install
cp .env.example .env.local   # values are needed from Phase 2 onwards
npm run dev                  # http://localhost:3000
```

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

## Adding UI components

Components in `src/components/ui` are vendored from shadcn/ui
(`new-york-v4`, Radix base). The shadcn CLI also works where the registry is
reachable: `npx shadcn@latest add <component>`.
