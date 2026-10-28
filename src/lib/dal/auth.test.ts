import { beforeEach, describe, expect, it, vi } from "vitest"

const client = vi.hoisted(() => ({
  auth: { getClaims: vi.fn() },
  from: vi.fn(),
}))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => client) }))
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

import { getCurrentUser, requireUser } from "./auth"

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co")
  vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "sb_publishable_0123456789abcdefghij"
  )
})

describe("getCurrentUser", () => {
  it("returns the verified identity without querying any table", async () => {
    client.auth.getClaims.mockResolvedValue({
      data: { claims: { sub: "u1", email: "ada@example.com" } },
      error: null,
    })
    await expect(getCurrentUser()).resolves.toEqual({
      id: "u1",
      email: "ada@example.com",
    })
    expect(client.from).not.toHaveBeenCalled()
  })

  it("returns null for an invalid or missing session", async () => {
    client.auth.getClaims.mockResolvedValue({ data: null, error: { code: "bad_jwt" } })
    await expect(getCurrentUser()).resolves.toBeNull()
  })
})

describe("requireUser", () => {
  it("redirects signed-out visitors to /login", async () => {
    client.auth.getClaims.mockResolvedValue({ data: null, error: null })
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login")
  })
})
