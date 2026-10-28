import "server-only"

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
