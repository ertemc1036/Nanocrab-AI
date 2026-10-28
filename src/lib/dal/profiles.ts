import "server-only"

import { cache } from "react"

import { requireUser } from "@/lib/dal/auth"
import { DataAccessError } from "@/lib/dal/errors"
import { createClient } from "@/lib/supabase/server"

export type Profile = {
  id: string
  email: string
  displayName: string | null
  plan: string
  createdAt: string
}

/**
 * The signed-in user's display name (null if they haven't set one).
 * Throws DataAccessError if the profile can't be read — including when the
 * profile row is missing, which means the sign-up trigger/migrations weren't
 * applied when the account was created.
 */
export const getMyDisplayName = cache(async (): Promise<string | null> => {
  const user = await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle()
  if (error) throw new DataAccessError("load profile", error)
  if (!data) throw new DataAccessError("load profile: no profile row for this user")
  return data.display_name
})

export async function getMyProfile(): Promise<Profile> {
  const user = await requireUser()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, plan, created_at")
    .eq("id", user.id)
    .single()
  if (error) throw new DataAccessError("get profile", error)

  return {
    id: data.id,
    email: user.email,
    displayName: data.display_name,
    plan: data.plan,
    createdAt: data.created_at,
  }
}

export async function updateMyDisplayName(displayName: string): Promise<void> {
  const user = await requireUser()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id)
    .select("id")
  if (error) throw new DataAccessError("update profile", error)
  // RLS turns unauthorized updates into no-ops; treat that as a failure.
  if (!data || data.length !== 1)
    throw new DataAccessError("update profile: no row updated")
}
