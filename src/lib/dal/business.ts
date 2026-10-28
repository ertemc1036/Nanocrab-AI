import "server-only"

import { cache } from "react"

import { requireUser } from "@/lib/dal/auth"
import { DataAccessError, logDataAccessFailure } from "@/lib/dal/errors"
import { getMyFounderProfile } from "@/lib/dal/founder"
import type { Business } from "@/lib/nanocrab-ceo/types"
import type { Tables } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"

const COLUMNS =
  "id, name, description, origin, status, operating_mode, created_at, updated_at" as const

type Row = Pick<
  Tables<"businesses">,
  | "id"
  | "name"
  | "description"
  | "origin"
  | "status"
  | "operating_mode"
  | "created_at"
  | "updated_at"
>

export function toBusiness(row: Row): Business {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    origin: row.origin === "opportunity" ? "opportunity" : "own_idea",
    status: row.status === "archived" ? "archived" : "active",
    operatingMode: row.operating_mode === "cofounder" ? "cofounder" : "ceo",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * The founder's current business: the one selected on their profile, or else
 * their most recently updated active business. Null if they have none.
 */
export const getCurrentBusiness = cache(async (): Promise<Business | null> => {
  const user = await requireUser()
  const supabase = await createClient()
  const profile = await getMyFounderProfile()

  if (profile?.currentBusinessId) {
    const { data, error } = await supabase
      .from("businesses")
      .select(COLUMNS)
      .eq("id", profile.currentBusinessId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (error) throw new DataAccessError("get current business", error)
    if (data && data.status === "active") return toBusiness(data)
  }

  const { data, error } = await supabase
    .from("businesses")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new DataAccessError("get latest business", error)
  return data ? toBusiness(data) : null
})

export type BusinessInput = { name: string; description: string }

/** Creates a business and makes it the founder's current business. */
export async function createBusiness(input: BusinessInput): Promise<Business> {
  const user = await requireUser()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("businesses")
    .insert({ user_id: user.id, name: input.name, description: input.description })
    .select(COLUMNS)
    .single()
  if (error) throw new DataAccessError("create business", error)

  // Selecting it is best-effort: getCurrentBusiness() falls back to the latest
  // active business, so a failure here doesn't lose the workspace.
  const { error: selectError } = await supabase
    .from("founder_profiles")
    .update({ current_business_id: data.id })
    .eq("user_id", user.id)
  if (selectError) logDataAccessFailure("select current business", selectError)

  return toBusiness(data)
}

/** Updates a business owned by the signed-in founder. */
export async function updateBusiness(id: string, input: BusinessInput): Promise<void> {
  const user = await requireUser()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("businesses")
    .update({ name: input.name, description: input.description })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
  if (error) throw new DataAccessError("update business", error)
  // Zero rows means it doesn't exist or isn't theirs — never reveal which.
  if (data?.length !== 1) throw new DataAccessError("update business: not found")
}
