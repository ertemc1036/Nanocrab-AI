"use server"

import { refresh } from "next/cache"
import { z } from "zod"

import { requireUser } from "@/lib/dal/auth"
import { createMemory, MemoryLimitError } from "@/lib/dal/memories"
import { createMilestone } from "@/lib/dal/milestones"
import { createPlanVersion, getActivePlan } from "@/lib/dal/plans"
import { getPendingProposal, resolveProposal } from "@/lib/dal/proposals"
import { createTask } from "@/lib/dal/tasks"
import { requireWorkspaceScope } from "@/lib/dal/workspace"
import { executeProposal, InvalidProposalError } from "@/lib/nanocrab-ceo/ai/commands"

export type ProposalActionResult = { ok: boolean; message: string }

const idSchema = z.uuid()

/**
 * Applies an AI proposal after the founder approves it. The proposal is
 * claimed first (pending → accepted) so it can't run twice, then executed as
 * a typed command through the ownership-checked data layer. If execution
 * fails, the claim is released so the founder can retry.
 */
export async function acceptProposalAction(id: string): Promise<ProposalActionResult> {
  await requireUser()
  const parsedId = idSchema.safeParse(id)
  if (!parsedId.success) return { ok: false, message: "Suggestion not found." }

  const scope = await requireWorkspaceScope()
  const proposal = await getPendingProposal(parsedId.data, scope)
  if (!proposal) return { ok: false, message: "This suggestion was already handled." }
  if (!(await resolveProposal(proposal.id, "accepted", scope))) {
    return { ok: false, message: "This suggestion was already handled." }
  }

  try {
    const message = await executeProposal(proposal, {
      createTask: (input) => createTask(input, scope),
      createMilestone: (input) => createMilestone(input, scope),
      createMemory: (input) => createMemory(input),
      getActivePlanSections: async () => (await getActivePlan(scope))?.sections ?? null,
      createActivePlanVersion: (sections, note) =>
        createPlanVersion(sections, { status: "active", source: "ai", note }, scope),
      today: () => new Date(),
    })
    refresh()
    return { ok: true, message }
  } catch (error) {
    await scope.supabase
      .from("ai_proposals")
      .update({ status: "pending", resolved_at: null })
      .eq("id", proposal.id)
      .eq("user_id", scope.user.id)
    if (error instanceof InvalidProposalError || error instanceof MemoryLimitError) {
      return { ok: false, message: error.message }
    }
    return { ok: false, message: "Couldn't apply this suggestion. Please try again." }
  }
}

export async function dismissProposalAction(id: string): Promise<ProposalActionResult> {
  await requireUser()
  const parsedId = idSchema.safeParse(id)
  if (!parsedId.success) return { ok: false, message: "Suggestion not found." }
  const scope = await requireWorkspaceScope()
  try {
    const done = await resolveProposal(parsedId.data, "dismissed", scope)
    refresh()
    return done
      ? { ok: true, message: "Dismissed." }
      : { ok: false, message: "This suggestion was already handled." }
  } catch {
    return { ok: false, message: "Couldn't dismiss this suggestion. Please try again." }
  }
}
