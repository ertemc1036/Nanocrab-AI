import "server-only"

import { redirect } from "next/navigation"

import { requireUser, type CurrentUser } from "@/lib/dal/auth"
import { getCurrentBusiness } from "@/lib/dal/business"
import type { Business } from "@/lib/nanocrab-ceo/types"
import { createClient } from "@/lib/supabase/server"

export type WorkspaceScope = {
  user: CurrentUser
  business: Business
  supabase: Awaited<ReturnType<typeof createClient>>
}

/** Signed-in user + their current business, or null if they have none. */
export async function getWorkspaceScope(): Promise<WorkspaceScope | null> {
  const user = await requireUser()
  const business = await getCurrentBusiness()
  if (!business) return null
  return { user, business, supabase: await createClient() }
}

/** Like getWorkspaceScope(), but sends founders without a business to create one. */
export async function requireWorkspaceScope(): Promise<WorkspaceScope> {
  const scope = await getWorkspaceScope()
  if (!scope) redirect("/business")
  return scope
}

export function oneOf<T extends string>(
  values: readonly T[],
  value: string,
  fallback: T
): T {
  return (values as readonly string[]).includes(value) ? (value as T) : fallback
}
