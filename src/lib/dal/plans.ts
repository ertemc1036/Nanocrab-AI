import "server-only"

import { DataAccessError } from "@/lib/dal/errors"
import { requireWorkspaceScope, type WorkspaceScope } from "@/lib/dal/workspace"
import { parseStoredPlan, type PlanSections } from "@/lib/nanocrab-ceo/plan"
import type { Json } from "@/lib/supabase/database.types"

export type PlanVersion = {
  id: string
  version: number
  status: "draft" | "active" | "archived"
  source: "user" | "ai"
  sections: PlanSections
  note: string
  createdAt: string
  activatedAt: string | null
}

const COLUMNS =
  "id, version, status, source, sections, note, created_at, activated_at" as const

function toPlan(r: {
  id: string
  version: number
  status: string
  source: string
  sections: Json
  note: string
  created_at: string
  activated_at: string | null
}): PlanVersion {
  return {
    id: r.id,
    version: r.version,
    status:
      r.status === "active" ? "active" : r.status === "draft" ? "draft" : "archived",
    source: r.source === "ai" ? "ai" : "user",
    sections: parseStoredPlan(r.sections),
    note: r.note,
    createdAt: r.created_at,
    activatedAt: r.activated_at,
  }
}

export async function listPlanVersions(scope?: WorkspaceScope): Promise<PlanVersion[]> {
  const { user, business, supabase } = scope ?? (await requireWorkspaceScope())
  const { data, error } = await supabase
    .from("business_plans")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .order("version", { ascending: false })
    .limit(100)
  if (error) throw new DataAccessError("list plan versions", error)
  return data.map(toPlan)
}

export async function getActivePlan(scope?: WorkspaceScope): Promise<PlanVersion | null> {
  const { user, business, supabase } = scope ?? (await requireWorkspaceScope())
  const { data, error } = await supabase
    .from("business_plans")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .eq("status", "active")
    .maybeSingle()
  if (error) throw new DataAccessError("get active plan", error)
  return data ? toPlan(data) : null
}

/** Saves a new immutable plan version for the current business. */
export async function createPlanVersion(
  sections: PlanSections,
  options: { status: "draft" | "active"; source: "user" | "ai"; note?: string },
  scope?: WorkspaceScope
): Promise<string> {
  const { business, supabase } = scope ?? (await requireWorkspaceScope())
  const { data, error } = await supabase.rpc("create_plan_version", {
    p_business_id: business.id,
    p_sections: sections as unknown as Json,
    p_status: options.status,
    p_source: options.source,
    p_note: options.note ?? "",
  })
  if (error) throw new DataAccessError("create plan version", error)
  return data
}

/** Makes a version (draft or archived) the active plan, after verifying ownership. */
export async function activatePlanVersion(planId: string): Promise<void> {
  const { user, business, supabase } = await requireWorkspaceScope()
  const { data: owned, error: findError } = await supabase
    .from("business_plans")
    .select("id")
    .eq("id", planId)
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .maybeSingle()
  if (findError) throw new DataAccessError("find plan version", findError)
  if (!owned) throw new DataAccessError("activate plan: not found")
  const { error } = await supabase.rpc("activate_plan_version", { p_plan_id: planId })
  if (error) throw new DataAccessError("activate plan version", error)
}

/** Discards a draft (kept for history as archived). */
export async function discardDraft(planId: string): Promise<void> {
  const { user, business, supabase } = await requireWorkspaceScope()
  const { data, error } = await supabase
    .from("business_plans")
    .update({ status: "archived" })
    .eq("id", planId)
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .eq("status", "draft")
    .select("id")
  if (error) throw new DataAccessError("discard draft", error)
  if (data.length !== 1) throw new DataAccessError("discard draft: not found")
}
