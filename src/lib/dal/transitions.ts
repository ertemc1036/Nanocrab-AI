import "server-only"

import { DataAccessError } from "@/lib/dal/errors"
import { requireWorkspaceScope, type WorkspaceScope } from "@/lib/dal/workspace"
import type { OperatingMode } from "@/lib/nanocrab-ceo/types"

export type RoleTransition = {
  fromMode: OperatingMode
  toMode: OperatingMode
  reason: "first_revenue" | "manual"
  createdAt: string
}

export async function listTransitions(scope?: WorkspaceScope): Promise<RoleTransition[]> {
  const { user, business, supabase } = scope ?? (await requireWorkspaceScope())
  const { data, error } = await supabase
    .from("ai_role_transitions")
    .select("from_mode, to_mode, reason, created_at")
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(50)
  if (error) throw new DataAccessError("list transitions", error)
  return data.map((r) => ({
    fromMode: r.from_mode === "cofounder" ? "cofounder" : "ceo",
    toMode: r.to_mode === "cofounder" ? "cofounder" : "ceo",
    reason: r.reason === "first_revenue" ? "first_revenue" : "manual",
    createdAt: r.created_at,
  }))
}

/** Founder-confirmed mode switch, recorded by the database function. */
export async function switchMode(
  toMode: OperatingMode,
  reason: "first_revenue" | "manual",
  revenueRecordId: string | null
): Promise<void> {
  const { business, supabase } = await requireWorkspaceScope()
  const { error } = await supabase.rpc("switch_operating_mode", {
    p_business_id: business.id,
    p_to_mode: toMode,
    p_reason: reason,
    p_revenue_record_id: revenueRecordId ?? undefined,
  })
  if (error) throw new DataAccessError("switch operating mode", error)
}
