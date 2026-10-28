import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { getSupabaseEnv } from "@/lib/env"
import type { Database } from "@/lib/supabase/database.types"

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("Supabase is not configured. See README → Supabase setup.")
    this.name = "SupabaseNotConfiguredError"
  }
}

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Uses the signed-in user's session from cookies, so every query is subject to
 * Row Level Security. A new client must be created per request.
 */
export async function createClient() {
  const env = getSupabaseEnv()
  if (!env) throw new SupabaseNotConfiguredError()

  const cookieStore = await cookies()

  return createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  })
}
