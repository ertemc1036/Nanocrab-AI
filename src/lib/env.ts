import { z } from "zod"

const supabaseEnvSchema = z.object({
  url: z.url({ protocol: /^https?$/ }),
  publishableKey: z.string().min(20),
})

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>

/**
 * Public Supabase configuration. These values are safe to expose to the
 * browser — all data access is protected by Row Level Security.
 *
 * `NEXT_PUBLIC_*` variables must be referenced literally so Next.js can inline
 * them; do not refactor to dynamic `process.env[key]` access.
 *
 * Returns `null` when Supabase is not configured, so the UI can show a clear
 * configuration-required state instead of failing at runtime.
 */
export function getSupabaseEnv(): SupabaseEnv | null {
  const parsed = supabaseEnvSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      // Legacy name used by older Supabase projects.
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
  return parsed.success ? parsed.data : null
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null
}

/** Absolute base URL of this app, used for auth email redirect links. */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  return raw.replace(/\/+$/, "")
}
