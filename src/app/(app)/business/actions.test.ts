import { beforeEach, describe, expect, it, vi } from "vitest"

const dal = vi.hoisted(() => ({ createBusiness: vi.fn(), updateBusiness: vi.fn() }))
vi.mock("@/lib/dal/business", () => dal)
const auth = vi.hoisted(() => ({ signedIn: true }))
vi.mock("@/lib/dal/auth", () => ({
  requireUser: vi.fn(async () => {
    if (!auth.signedIn) throw new Error("REDIRECT:/login")
    return { id: "u1", email: "a@b.co", displayName: null }
  }),
}))
vi.mock("next/cache", () => ({ refresh: vi.fn() }))
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

import { createBusinessAction, updateBusinessAction } from "./actions"

const idle = { status: "idle" } as const
function form(values: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(values)) fd.set(k, v)
  return fd
}
const ID = "4f0d8c1e-2b7a-4c39-9a51-0d2e6f3b8a77"

beforeEach(() => {
  vi.clearAllMocks()
  auth.signedIn = true
})

describe("signed-out visitors", () => {
  it("are redirected to login by both actions", async () => {
    auth.signedIn = false
    await expect(
      createBusinessAction(idle, form({ name: "X", description: "" }))
    ).rejects.toThrow("REDIRECT:/login")
    await expect(
      updateBusinessAction(idle, form({ id: ID, name: "X", description: "" }))
    ).rejects.toThrow("REDIRECT:/login")
    expect(dal.createBusiness).not.toHaveBeenCalled()
    expect(dal.updateBusiness).not.toHaveBeenCalled()
  })
})

describe("createBusinessAction", () => {
  it("creates a trimmed business and returns to the Command Center", async () => {
    await expect(
      createBusinessAction(idle, form({ name: "  Crab Bakery ", description: " Bread " }))
    ).rejects.toThrow("REDIRECT:/dashboard")
    expect(dal.createBusiness).toHaveBeenCalledWith({
      name: "Crab Bakery",
      description: "Bread",
    })
  })

  it("requires a name", async () => {
    const result = await createBusinessAction(idle, form({ name: " ", description: "" }))
    expect(result.fieldErrors?.name).toBeDefined()
    expect(dal.createBusiness).not.toHaveBeenCalled()
  })

  it("reports failures", async () => {
    dal.createBusiness.mockRejectedValueOnce(new Error("db"))
    const result = await createBusinessAction(idle, form({ name: "X", description: "" }))
    expect(result.status).toBe("error")
  })
})

describe("updateBusinessAction", () => {
  it("updates by id", async () => {
    const result = await updateBusinessAction(
      idle,
      form({ id: ID, name: "New name", description: "" })
    )
    expect(dal.updateBusiness).toHaveBeenCalledWith(ID, {
      name: "New name",
      description: "",
    })
    expect(result.status).toBe("success")
  })

  it("rejects a malformed id without touching the database", async () => {
    const result = await updateBusinessAction(
      idle,
      form({ id: "1 or 1=1", name: "X", description: "" })
    )
    expect(result.status).toBe("error")
    expect(dal.updateBusiness).not.toHaveBeenCalled()
  })

  it("reports not-found/not-owned as a generic failure", async () => {
    dal.updateBusiness.mockRejectedValueOnce(new Error("not found"))
    const result = await updateBusinessAction(
      idle,
      form({ id: ID, name: "X", description: "" })
    )
    expect(result).toMatchObject({
      status: "error",
      message: expect.stringMatching(/Couldn't save/),
    })
  })
})
