import { beforeEach, describe, expect, it, vi } from "vitest"

const dal = vi.hoisted(() => ({ saveMyFounderProfile: vi.fn() }))
vi.mock("@/lib/dal/founder", () => dal)
const auth = vi.hoisted(() => ({ signedIn: true }))
vi.mock("@/lib/dal/auth", () => ({
  requireUser: vi.fn(async () => {
    if (!auth.signedIn) throw new Error("REDIRECT:/login")
    return { id: "u1", email: "a@b.co", displayName: null }
  }),
}))
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

import { saveFounderProfileAction } from "./actions"

const idle = { status: "idle" } as const
const submit = (payload: unknown) => {
  const fd = new FormData()
  fd.set("payload", typeof payload === "string" ? payload : JSON.stringify(payload))
  return saveFounderProfileAction(idle, fd)
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.signedIn = true
})

describe("saveFounderProfileAction", () => {
  it("saves validated answers and goes to the Command Center", async () => {
    await expect(
      submit({ goal: "freelance", skills: ["Design", "design"], countryCode: "fr" })
    ).rejects.toThrow("REDIRECT:/dashboard")
    expect(dal.saveMyFounderProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        goal: "freelance",
        skills: ["Design"],
        countryCode: "FR",
      })
    )
  })

  it("rejects missing, oversized or malformed payloads without saving", async () => {
    expect((await saveFounderProfileAction(idle, new FormData())).status).toBe("error")
    expect((await submit("{not json")).status).toBe("error")
    expect((await submit("x".repeat(20_000))).status).toBe("error")
    expect(dal.saveMyFounderProfile).not.toHaveBeenCalled()
  })

  it("returns validation errors for invalid answers", async () => {
    const result = await submit({ goal: "freelance", weeklyHours: 500 })
    expect(result.status).toBe("error")
    expect(result.fieldErrors?.weeklyHours).toBeDefined()
    expect(dal.saveMyFounderProfile).not.toHaveBeenCalled()
  })

  it("ignores fields that aren't part of the profile", async () => {
    await expect(
      submit({ goal: "explore", user_id: "someone-else", currentBusinessId: "x" })
    ).rejects.toThrow("REDIRECT")
    const saved = dal.saveMyFounderProfile.mock.calls[0]![0]
    expect(saved).not.toHaveProperty("user_id")
    expect(saved).not.toHaveProperty("currentBusinessId")
  })

  it("sends signed-out visitors to login instead of reporting a save error", async () => {
    auth.signedIn = false
    await expect(submit({ goal: "explore" })).rejects.toThrow("REDIRECT:/login")
    expect(dal.saveMyFounderProfile).not.toHaveBeenCalled()
  })

  it("reports save failures instead of failing silently", async () => {
    dal.saveMyFounderProfile.mockRejectedValueOnce(new Error("db down"))
    const result = await submit({ goal: "explore" })
    expect(result.status).toBe("error")
  })
})
