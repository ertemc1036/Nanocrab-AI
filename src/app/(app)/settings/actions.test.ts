import { beforeEach, describe, expect, it, vi } from "vitest"

const auth = vi.hoisted(() => ({ signInWithPassword: vi.fn(), updateUser: vi.fn() }))
const dal = vi.hoisted(() => ({
  updateMyDisplayName: vi.fn(),
  deleteMyAccount: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ auth })) }))
vi.mock("@/lib/dal/auth", () => ({
  requireUser: vi.fn(async () => ({
    id: "u1",
    email: "ada@example.com",
    displayName: "Ada",
  })),
}))
vi.mock("@/lib/dal/profiles", () => ({ updateMyDisplayName: dal.updateMyDisplayName }))
vi.mock("@/lib/dal/account", () => ({ deleteMyAccount: dal.deleteMyAccount }))
vi.mock("next/cache", () => ({ refresh: vi.fn() }))
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

import { changePasswordAction, deleteAccountAction, updateProfileAction } from "./actions"

const idle = { status: "idle" } as const
function form(values: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(values)) fd.set(k, v)
  return fd
}

beforeEach(() => vi.clearAllMocks())

describe("updateProfileAction", () => {
  it("validates before writing", async () => {
    const result = await updateProfileAction(idle, form({ displayName: "  " }))
    expect(result.fieldErrors?.displayName).toBeDefined()
    expect(dal.updateMyDisplayName).not.toHaveBeenCalled()
  })

  it("saves a trimmed display name", async () => {
    const result = await updateProfileAction(idle, form({ displayName: " Ada L " }))
    expect(dal.updateMyDisplayName).toHaveBeenCalledWith("Ada L")
    expect(result.status).toBe("success")
  })

  it("reports database failures instead of failing silently", async () => {
    dal.updateMyDisplayName.mockRejectedValueOnce(new Error("db down"))
    const result = await updateProfileAction(idle, form({ displayName: "Ada" }))
    expect(result.status).toBe("error")
  })
})

describe("changePasswordAction", () => {
  const input = {
    currentPassword: "oldpass1",
    password: "newpass1",
    confirmPassword: "newpass1",
  }

  it("re-verifies the current password for the signed-in user's email", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null })
    auth.updateUser.mockResolvedValue({ error: null })
    const result = await changePasswordAction(idle, form(input))
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "oldpass1",
    })
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "newpass1" })
    expect(result.status).toBe("success")
  })

  it("does not change the password when the current one is wrong", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials" } })
    const result = await changePasswordAction(idle, form(input))
    expect(result.fieldErrors?.currentPassword).toBeDefined()
    expect(auth.updateUser).not.toHaveBeenCalled()
  })
})

describe("deleteAccountAction", () => {
  it("requires the typed confirmation", async () => {
    const result = await deleteAccountAction(idle, form({ confirmation: "delete" }))
    expect(result.status).toBe("error")
    expect(dal.deleteMyAccount).not.toHaveBeenCalled()
  })

  it("deletes the account and leaves the app", async () => {
    await expect(
      deleteAccountAction(idle, form({ confirmation: "DELETE" }))
    ).rejects.toThrow("REDIRECT:/?account=deleted")
    expect(dal.deleteMyAccount).toHaveBeenCalledOnce()
  })
})
