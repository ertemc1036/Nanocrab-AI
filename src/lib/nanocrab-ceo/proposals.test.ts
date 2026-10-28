import { describe, expect, it } from "vitest"

import { parseProposalCall, validateProposalPayload } from "./proposals"

describe("parseProposalCall", () => {
  it("accepts a valid task proposal", () => {
    expect(
      parseProposalCall(
        "propose_task",
        JSON.stringify({
          title: "Call 5 cafés",
          description: "",
          priority: "high",
          dueInDays: 3,
          rationale: "",
        })
      )
    ).toMatchObject({ kind: "task" })
  })

  it.each([
    ["unknown tool", "transfer_money", "{}"],
    ["bad json", "propose_task", "{"],
    [
      "invalid priority",
      "propose_task",
      JSON.stringify({
        title: "x",
        description: "",
        priority: "urgent",
        dueInDays: null,
        rationale: "",
      }),
    ],
    [
      "unknown plan section",
      "propose_plan_update",
      JSON.stringify({ section: "salaries", content: "x", rationale: "" }),
    ],
    [
      "memory with bad category",
      "propose_memory",
      JSON.stringify({ category: "gossip", content: "x", rationale: "" }),
    ],
  ])("rejects %s", (_label, name, args) => {
    expect(parseProposalCall(name, args)).toBeNull()
  })
})

describe("validateProposalPayload", () => {
  it("re-validates stored payloads before execution", () => {
    expect(
      validateProposalPayload("milestone", {
        title: "x",
        description: "",
        targetInDays: 30,
        rationale: "",
      })
    ).not.toBeNull()
    expect(
      validateProposalPayload("milestone", {
        title: "",
        description: "",
        targetInDays: 30,
        rationale: "",
      })
    ).toBeNull()
  })
})
