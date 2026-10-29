import "server-only"

import { getLastActivityAt } from "@/lib/dal/chat"
import { getMyFounderProfile } from "@/lib/dal/founder"
import { listMemories } from "@/lib/dal/memories"
import { listMilestones } from "@/lib/dal/milestones"
import { getActivePlan } from "@/lib/dal/plans"
import { listProposals } from "@/lib/dal/proposals"
import { listRevenue, revenueTotals } from "@/lib/dal/revenue"
import { listTasks } from "@/lib/dal/tasks"
import type { WorkspaceScope } from "@/lib/dal/workspace"

import { buildAccountabilityReport } from "../accountability"
import type { Proposal } from "../proposals"

import type { WorkspaceSnapshot } from "./context"

/** Loads everything the AI CEO may see — only the signed-in founder's data. */
export async function loadWorkspaceSnapshot(
  scope: WorkspaceScope
): Promise<WorkspaceSnapshot> {
  const [profile, plan, milestones, tasks, memories, revenue, lastSessionAt, rejected] =
    await Promise.all([
      getMyFounderProfile(),
      getActivePlan(scope),
      listMilestones(scope),
      listTasks(scope),
      listMemories(),
      listRevenue(scope),
      getLastActivityAt(scope),
      listProposals({
        status: "dismissed",
        kinds: ["task", "milestone", "next_action"],
        limit: 10,
      }),
    ])
  if (!profile) throw new Error("Founder profile missing")
  const today = new Date().toISOString().slice(0, 10)
  return {
    profile,
    business: scope.business,
    plan: plan ? { version: plan.version, sections: plan.sections } : null,
    milestones,
    tasks,
    memories,
    revenue: revenueTotals(revenue),
    today,
    accountability: buildAccountabilityReport(tasks, milestones, today, lastSessionAt),
    rejectedSuggestions: rejected.map(proposalTitle),
  }
}

function proposalTitle(p: Proposal): string {
  switch (p.kind) {
    case "task":
    case "milestone":
    case "next_action":
      return p.payload.title
    case "memory":
      return p.payload.content
    case "plan_section":
      return p.payload.section
  }
}
