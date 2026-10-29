import { beforeEach, describe, expect, it, vi } from "vitest"

const dal = vi.hoisted(() => ({
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}))

vi.mock("@/lib/dal/auth", () => ({ requireUser: vi.fn(async () => ({ id: "u1" })) }))
vi.mock("@/lib/dal/tasks", () => dal)
vi.mock("next/cache", () => ({ refresh: vi.fn() }))

import { createTaskAction, setTaskBlockedAction } from "./actions"

const ID = "11111111-1111-4111-8111-111111111111"
const idle = { status: "idle" } as const
function form(values: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(values)) fd.set(k, v)
  return fd
}

beforeEach(() => vi.clearAllMocks())

describe("createTaskAction", () => {
  it("saves success criteria and deliverable", async () => {
    const r = await createTaskAction(
      idle,
      form({
        title: "Call 5 cafés",
        description: "",
        priority: "high",
        dueDate: "",
        successCriteria: " 1 trial order ",
        deliverable: "Call notes",
      })
    )
    expect(r.status).toBe("success")
    expect(dal.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        successCriteria: "1 trial order",
        deliverable: "Call notes",
      })
    )
  })

  it("rejects an over-long success criterion", async () => {
    const r = await createTaskAction(
      idle,
      form({ title: "x", priority: "low", successCriteria: "a".repeat(1001) })
    )
    expect(r.fieldErrors?.successCriteria).toBeDefined()
    expect(dal.createTask).not.toHaveBeenCalled()
  })
})

describe("setTaskBlockedAction", () => {
  it("records a trimmed blocker reason", async () => {
    const r = await setTaskBlockedAction(ID, "  waiting for supplier ")
    expect(r.ok).toBe(true)
    expect(dal.updateTask).toHaveBeenCalledWith(ID, {
      blockedReason: "waiting for supplier",
    })
  })

  it("unblocks with an empty reason", async () => {
    await setTaskBlockedAction(ID, "")
    expect(dal.updateTask).toHaveBeenCalledWith(ID, { blockedReason: "" })
  })

  it("rejects invalid ids and long reasons without writing", async () => {
    expect((await setTaskBlockedAction("nope", "x")).ok).toBe(false)
    expect((await setTaskBlockedAction(ID, "x".repeat(501))).ok).toBe(false)
    expect(dal.updateTask).not.toHaveBeenCalled()
  })

  it("reports a failed update (e.g. another founder's task) instead of claiming success", async () => {
    dal.updateTask.mockRejectedValueOnce(new Error("update task: not found"))
    expect((await setTaskBlockedAction(ID, "x")).ok).toBe(false)
  })
})
