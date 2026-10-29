import { EMPTY_PLAN, PLAN_SECTIONS, type PlanSections } from "../plan"
import { validateProposalPayload, type Proposal } from "../proposals"
import type { MemoryCategory, Priority } from "../types"

/** Data operations a command may perform — all ownership-checked by the DAL. */
export type CommandDeps = {
  createTask(input: {
    title: string
    description: string
    priority: Priority
    dueDate: string | null
    source: "ai"
    successCriteria?: string
    deliverable?: string
  }): Promise<unknown>
  createMilestone(input: {
    title: string
    description: string
    targetDate: string | null
    source: "ai"
  }): Promise<unknown>
  createMemory(input: {
    category: MemoryCategory
    content: string
    source: "ai_suggested"
  }): Promise<unknown>
  getActivePlanSections(): Promise<PlanSections | null>
  createActivePlanVersion(sections: PlanSections, note: string): Promise<unknown>
  today(): Date
}

export function addDays(base: Date, days: number): string {
  const d = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate())
  )
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Executes an approved proposal as a typed application command. The stored
 * payload is validated again first; anything invalid is refused, never repaired.
 * Returns a short description of what changed.
 */
export async function executeProposal(
  proposal: Proposal,
  deps: CommandDeps
): Promise<string> {
  switch (proposal.kind) {
    case "task": {
      const p = validateProposalPayload("task", proposal.payload)
      if (!p) throw new InvalidProposalError()
      await deps.createTask({
        title: p.title,
        description: p.description,
        priority: p.priority,
        dueDate: p.dueInDays === null ? null : addDays(deps.today(), p.dueInDays),
        source: "ai",
        successCriteria: p.successCriteria,
        deliverable: p.deliverable,
      })
      return "Task added."
    }
    case "next_action": {
      const p = validateProposalPayload("next_action", proposal.payload)
      if (!p) throw new InvalidProposalError()
      await deps.createTask({
        title: p.title,
        description: p.reason,
        priority: "high",
        dueDate: addDays(deps.today(), 1),
        source: "ai",
      })
      return "Added to your tasks for tomorrow."
    }
    case "milestone": {
      const p = validateProposalPayload("milestone", proposal.payload)
      if (!p) throw new InvalidProposalError()
      await deps.createMilestone({
        title: p.title,
        description: p.description,
        targetDate:
          p.targetInDays === null ? null : addDays(deps.today(), p.targetInDays),
        source: "ai",
      })
      return "Milestone added."
    }
    case "memory": {
      const p = validateProposalPayload("memory", proposal.payload)
      if (!p) throw new InvalidProposalError()
      await deps.createMemory({
        category: p.category,
        content: p.content,
        source: "ai_suggested",
      })
      return "Saved to memory."
    }
    case "plan_section": {
      const p = validateProposalPayload("plan_section", proposal.payload)
      if (!p) throw new InvalidProposalError()
      const current = (await deps.getActivePlanSections()) ?? EMPTY_PLAN
      const label = PLAN_SECTIONS.find((s) => s.key === p.section)?.label ?? p.section
      await deps.createActivePlanVersion(
        { ...current, [p.section]: p.content },
        `${label} updated from a NanoCrab suggestion you approved`
      )
      return `${label} updated in a new plan version.`
    }
  }
}

export class InvalidProposalError extends Error {
  constructor() {
    super("This suggestion is no longer valid.")
    this.name = "InvalidProposalError"
  }
}
