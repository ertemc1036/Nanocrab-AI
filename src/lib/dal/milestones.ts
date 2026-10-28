import "server-only"

import { DataAccessError } from "@/lib/dal/errors"
import { requireWorkspaceScope, type WorkspaceScope } from "@/lib/dal/workspace"
import type { BusinessMilestone } from "@/lib/nanocrab-ceo/types"
import type { Tables } from "@/lib/supabase/database.types"

const COLUMNS =
  "id, title, description, status, target_date, source, achieved_at" as const
type Row = Pick<
  Tables<"business_milestones">,
  "id" | "title" | "description" | "status" | "target_date" | "source" | "achieved_at"
>

function toMilestone(r: Row): BusinessMilestone {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status === "achieved" ? "achieved" : "planned",
    targetDate: r.target_date,
    source: r.source === "ai" ? "ai" : "user",
    achievedAt: r.achieved_at,
  }
}

export async function listMilestones(
  scope?: WorkspaceScope
): Promise<BusinessMilestone[]> {
  const { user, business, supabase } = scope ?? (await requireWorkspaceScope())
  const { data, error } = await supabase
    .from("business_milestones")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .order("created_at", { ascending: true })
    .limit(100)
  if (error) throw new DataAccessError("list milestones", error)
  return data.map(toMilestone)
}

export async function createMilestone(
  input: {
    title: string
    description: string
    targetDate: string | null
    source?: "user" | "ai"
  },
  scope?: WorkspaceScope
): Promise<void> {
  const { user, business, supabase } = scope ?? (await requireWorkspaceScope())
  const { error } = await supabase.from("business_milestones").insert({
    user_id: user.id,
    business_id: business.id,
    title: input.title,
    description: input.description,
    target_date: input.targetDate,
    source: input.source ?? "user",
  })
  if (error) throw new DataAccessError("create milestone", error)
}

export async function setMilestoneAchieved(id: string, achieved: boolean): Promise<void> {
  const { user, business, supabase } = await requireWorkspaceScope()
  const { data, error } = await supabase
    .from("business_milestones")
    .update({
      status: achieved ? "achieved" : "planned",
      achieved_at: achieved ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .select("id")
  if (error) throw new DataAccessError("update milestone", error)
  if (data.length !== 1) throw new DataAccessError("update milestone: not found")
}

export async function deleteMilestone(id: string): Promise<void> {
  const { user, business, supabase } = await requireWorkspaceScope()
  const { data, error } = await supabase
    .from("business_milestones")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .select("id")
  if (error) throw new DataAccessError("delete milestone", error)
  if (data.length !== 1) throw new DataAccessError("delete milestone: not found")
}
