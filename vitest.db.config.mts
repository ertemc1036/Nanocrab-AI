import { defineConfig } from "vitest/config"

// Database security tests. Run via `npm run test:db` (scripts/test-db.sh),
// which provisions a throwaway PostgreSQL with the migrations applied.
export default defineConfig({
  test: {
    environment: "node",
    include: ["supabase/tests/db/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20000,
  },
})
