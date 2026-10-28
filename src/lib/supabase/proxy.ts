import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { SupabaseEnv } from "@/lib/env"
import type { Database } from "@/lib/supabase/database.types"

/**
 * Refreshes the Supabase session cookie for the current request and returns
 * the verified user id (or null). Must run before any response is generated.
 */
export async function updateSession(request: NextRequest, env: SupabaseEnv) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value)
        }
      },
    },
  })

  // getClaims() verifies the JWT signature; never trust getSession() here.
  const { data } = await supabase.auth.getClaims()
  const userId = typeof data?.claims.sub === "string" ? data.claims.sub : null

  return { response: () => response, userId }
}
