import { beforeEach, describe, expect, it, vi } from "vitest"

const auth = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
}))
const currentUser = vi.hoisted(() => ({
  value: null as null | { id: string; email: string },
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth })),
}))

vi.mock("@/lib/dal/auth", () => ({
  requireUser: vi.fn(async () => {
    if (!currentUser.value) throw new Error("REDIRECT:/login")
    return currentUser.value
  }),
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

import {
  logInAction,
  requestPasswordResetAction,
  resetPasswordAction,
  signUpAction,
} from "./actions"

const idle = { status: "idle" } as const

function form(values: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(values)) fd.set(k, v)
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  currentUser.value = null
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co")
  vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "sb_publishable_0123456789abcdefghij"
  )
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.nanocrab.test")
})

describe("signUpAction", () => {
  const valid = { displayName: "Ada", email: "Ada@Example.com", password: "crabby123" }

  it("returns field errors and does not call Supabase on invalid input", async () => {
    const result = await signUpAction(idle, form({ ...valid, password: "short" }))
    expect(result.status).toBe("error")
    expect(result.fieldErrors?.password).toBeDefined()
    expect(result.values).toEqual({ displayName: "Ada", email: "Ada@Example.com" })
    expect(result.values).not.toHaveProperty("password")
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it("signs up with normalized data and a confirmation redirect", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null, user: {} }, error: null })
    const result = await signUpAction(idle, form(valid))
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "crabby123",
      options: {
        data: { display_name: "Ada" },
        emailRedirectTo: "https://app.nanocrab.test/auth/confirm?next=/dashboard",
      },
    })
    expect(result.status).toBe("success")
  })

  it("redirects to the dashboard when a session is returned", async () => {
    auth.signUp.mockResolvedValue({ data: { session: {}, user: {} }, error: null })
    await expect(signUpAction(idle, form(valid))).rejects.toThrow("REDIRECT:/dashboard")
  })

  it("maps Supabase errors to safe messages", async () => {
    auth.signUp.mockResolvedValue({
      data: { session: null, user: null },
      error: { code: "over_email_send_rate_limit", status: 429, message: "internal" },
    })
    const result = await signUpAction(idle, form(valid))
    expect(result.message).toMatch(/Too many attempts/)
  })

  it("reports a configuration error when Supabase is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    const result = await signUpAction(idle, form(valid))
    expect(result.status).toBe("error")
    expect(auth.signUp).not.toHaveBeenCalled()
  })
})

describe("logInAction", () => {
  it("rejects invalid credentials with a generic message", async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: { code: "invalid_credentials", status: 400 },
    })
    const result = await logInAction(idle, form({ email: "a@b.co", password: "wrong" }))
    expect(result.message).toBe("Incorrect email or password.")
  })

  it("redirects to a safe next path after login", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: null })
    await expect(
      logInAction(idle, form({ email: "a@b.co", password: "pw", next: "/memory" }))
    ).rejects.toThrow("REDIRECT:/memory")
  })

  it("never redirects off-site after login", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: null })
    await expect(
      logInAction(
        idle,
        form({ email: "a@b.co", password: "pw", next: "https://evil.com" })
      )
    ).rejects.toThrow("REDIRECT:/dashboard")
  })
})

describe("requestPasswordResetAction", () => {
  it("responds identically whether or not the account exists", async () => {
    auth.resetPasswordForEmail.mockResolvedValueOnce({ data: {}, error: null })
    const known = await requestPasswordResetAction(idle, form({ email: "a@b.co" }))
    auth.resetPasswordForEmail.mockResolvedValueOnce({
      data: null,
      error: { code: "user_not_found", status: 400 },
    })
    const unknown = await requestPasswordResetAction(idle, form({ email: "a@b.co" }))
    expect(known).toEqual(unknown)
    expect(known.status).toBe("success")
  })

  it("reports an outage instead of claiming an email was sent", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { name: "AuthRetryableFetchError", status: 0 },
    })
    const result = await requestPasswordResetAction(idle, form({ email: "a@b.co" }))
    expect(result.status).toBe("error")
  })

  it("uses the confirm route with a reset-password next path", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
    await requestPasswordResetAction(idle, form({ email: "a@b.co" }))
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("a@b.co", {
      redirectTo: "https://app.nanocrab.test/auth/confirm?next=/reset-password",
    })
  })
})

describe("resetPasswordAction", () => {
  it("requires a recovery session", async () => {
    await expect(
      resetPasswordAction(
        idle,
        form({ password: "crabby123", confirmPassword: "crabby123" })
      )
    ).rejects.toThrow("REDIRECT:/login")
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it("updates the password for the signed-in user", async () => {
    currentUser.value = { id: "u1", email: "a@b.co" }
    auth.updateUser.mockResolvedValue({ data: {}, error: null })
    await expect(
      resetPasswordAction(
        idle,
        form({ password: "crabby123", confirmPassword: "crabby123" })
      )
    ).rejects.toThrow("REDIRECT:/dashboard?password=updated")
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "crabby123" })
  })
})
