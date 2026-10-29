import { beforeEach, describe, expect, it, vi } from "vitest"

const dal = vi.hoisted(() => ({ updateMyLeadershipSettings: vi.fn() }))
const auth = vi.hoisted(() => ({ requireUser: vi.fn() }))

vi.mock("@/lib/dal/auth", () => ({ requireUser: auth.requireUser }))
vi.mock("@/lib/dal/founder", () => ({
  updateMyLeadershipSettings: dal.updateMyLeadershipSettings,
}))
vi.mock("next/cache", () => ({ refresh: vi.fn() }))

import { updateLeadershipAction } from "./leadership-actions"

beforeEach(() => {
  vi.clearAllMocks()
  auth.requireUser.mockResolvedValue({ id: "u1", email: "a@example.com" })
})

describe("updateLeadershipAction (settings persistence)", () => {
  it("persists Executive Mode", async () => {
    const r = await updateLeadershipAction({ leadershipStyle: "executive" })
    expect(r.ok).toBe(true)
    expect(dal.updateMyLeadershipSettings).toHaveBeenCalledWith({
      leadershipStyle: "executive",
    })
  })

  it("switches back to Standard", async () => {
    const r = await updateLeadershipAction({ leadershipStyle: "standard" })
    expect(r.ok).toBe(true)
    expect(dal.updateMyLeadershipSettings).toHaveBeenCalledWith({
      leadershipStyle: "standard",
    })
  })

  it("persists a language and allows resetting it to the default", async () => {
    await updateLeadershipAction({ preferredLanguage: "en" })
    expect(dal.updateMyLeadershipSettings).toHaveBeenLastCalledWith({
      preferredLanguage: "en",
    })
    await updateLeadershipAction({ preferredLanguage: null })
    expect(dal.updateMyLeadershipSettings).toHaveBeenLastCalledWith({
      preferredLanguage: null,
    })
  })

  it("rejects unknown values and extra fields without writing", async () => {
    for (const bad of [
      { leadershipStyle: "dictator" },
      { preferredLanguage: "fr" },
      { leadershipStyle: "executive", userId: "someone-else" },
      {},
      null,
    ]) {
      const r = await updateLeadershipAction(bad)
      expect(r.ok).toBe(false)
    }
    expect(dal.updateMyLeadershipSettings).not.toHaveBeenCalled()
  })

  it("requires a signed-in user before touching data", async () => {
    auth.requireUser.mockRejectedValueOnce(new Error("REDIRECT:/login"))
    await expect(
      updateLeadershipAction({ leadershipStyle: "executive" })
    ).rejects.toThrow("REDIRECT")
    expect(dal.updateMyLeadershipSettings).not.toHaveBeenCalled()
  })

  it("reports database failures instead of claiming success", async () => {
    dal.updateMyLeadershipSettings.mockRejectedValueOnce(new Error("no profile"))
    const r = await updateLeadershipAction({ leadershipStyle: "executive" })
    expect(r.ok).toBe(false)
  })
})
