import "server-only"

import { getMyFounderProfile } from "@/lib/dal/founder"
import { listMemories } from "@/lib/dal/memories"
import { listMilestones } from "@/lib/dal/milestones"
import { getActivePlan } from "@/lib/dal/plans"
import { listRevenue, revenueTotals } from "@/lib/dal/revenue"
import { listTasks } from "@/lib/dal/tasks"
import type { WorkspaceScope } from "@/lib/dal/workspace"

import type { WorkspaceSnapshot } from "./context"

/** Loads everything the AI CEO may see — only the signed-in founder's data. */
export async function loadWorkspaceSnapshot(
  scope: WorkspaceScope
): Promise<WorkspaceSnapshot> {
  const [profile, plan, milestones, tasks, memories, revenue] = await Promise.all([
    getMyFounderProfile(),
    getActivePlan(scope),
    listMilestones(scope),
    listTasks(scope),
    listMemories(),
    listRevenue(scope),
  ])
  if (!profile) throw new Error("Founder profile missing")
  return {
    profile,
    business: scope.business,
    plan: plan ? { version: plan.version, sections: plan.sections } : null,
    milestones,
    tasks,
    memories,
    revenue: revenueTotals(revenue),
    today: new Date().toISOString().slice(0, 10),
  }
}
