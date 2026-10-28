import "server-only"

import { redirect } from "next/navigation"
import { cache } from "react"

import { DataAccessError } from "@/lib/dal/errors"
import { isSupabaseConfigured } from "@/lib/env"
import { createClient } from "@/lib/supabase/server"

export type CurrentUser = {
  id: string
  email: string
  displayName: string | null
}

/**
 * Returns the signed-in user, or null. The session JWT is verified with
 * getClaims() (signature + expiry), so the id can be trusted for authorization.
 * Memoized per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isSupabaseConfigured()) return null

  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data) return null

  const id = data.claims.sub
  if (typeof id !== "string" || id.length === 0) return null

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", id)
    .maybeSingle()
  if (profileError) throw new DataAccessError("load profile", profileError)

  return {
    id,
    email: typeof data.claims.email === "string" ? data.claims.email : "",
    displayName: profile?.display_name ?? null,
  }
})

/**
 * Returns the signed-in user or redirects to /login. Call this at the top of
 * every protected page, Server Action and Route Handler — never rely on the
 * proxy alone.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}
