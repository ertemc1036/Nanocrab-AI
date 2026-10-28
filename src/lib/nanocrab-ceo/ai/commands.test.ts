import { describe, expect, it, vi } from "vitest"

import { EMPTY_PLAN } from "../plan"
import type { Proposal } from "../proposals"
import {
  addDays,
  executeProposal,
  InvalidProposalError,
  type CommandDeps,
} from "./commands"

function deps(over: Partial<CommandDeps> = {}): CommandDeps {
  return {
    createTask: vi.fn(async () => {}),
    createMilestone: vi.fn(async () => {}),
    createMemory: vi.fn(async () => {}),
    getActivePlanSections: vi.fn(async () => ({ ...EMPTY_PLAN, concept: "Old" })),
    createActivePlanVersion: vi.fn(async () => {}),
    today: () => new Date("2026-10-31T15:00:00Z"),
    ...over,
  }
}

const base = { id: "p", status: "pending" as const, createdAt: "", conversationId: null }

describe("executeProposal", () => {
  it("creates an AI-sourced task with a computed due date", async () => {
    const d = deps()
    await executeProposal(
      {
        ...base,
        kind: "task",
        payload: {
          title: "Call",
          description: "",
          priority: "high",
          dueInDays: 2,
          rationale: "",
        },
      },
      d
    )
    expect(d.createTask).toHaveBeenCalledWith({
      title: "Call",
      description: "",
      priority: "high",
      dueDate: "2026-11-02",
      source: "ai",
    })
  })

  it("saves memories as AI-suggested (approved by the founder), not as user facts", async () => {
    const d = deps()
    await executeProposal(
      {
        ...base,
        kind: "memory",
        payload: { category: "decision", content: "B2B only", rationale: "" },
      },
      d
    )
    expect(d.createMemory).toHaveBeenCalledWith({
      category: "decision",
      content: "B2B only",
      source: "ai_suggested",
    })
  })

  it("updates one plan section in a new version, keeping the others", async () => {
    const d = deps()
    await executeProposal(
      {
        ...base,
        kind: "plan_section",
        payload: { section: "problem", content: "New problem", rationale: "" },
      },
      d
    )
    expect(d.createActivePlanVersion).toHaveBeenCalledWith(
      expect.objectContaining({ concept: "Old", problem: "New problem" }),
      expect.stringContaining("Problem updated")
    )
  })

  it("refuses tampered payloads instead of repairing them", async () => {
    const d = deps()
    const bad = {
      ...base,
      kind: "task",
      payload: { title: "", priority: "urgent" },
    } as unknown as Proposal
    await expect(executeProposal(bad, d)).rejects.toBeInstanceOf(InvalidProposalError)
    expect(d.createTask).not.toHaveBeenCalled()
  })

  it("computes dates in UTC across month boundaries", () => {
    expect(addDays(new Date("2026-01-31T23:30:00Z"), 1)).toBe("2026-02-01")
  })
})
