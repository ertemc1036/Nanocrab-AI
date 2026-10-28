import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const auth = vi.hoisted(() => ({ verifyOtp: vi.fn(), exchangeCodeForSession: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ auth })) }))

import { GET } from "./route"

const get = (qs: string) =>
  GET(new NextRequest(`http://localhost:3000/auth/confirm?${qs}`))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co")
  vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "sb_publishable_0123456789abcdefghij"
  )
})

describe("GET /auth/confirm", () => {
  it("verifies a token hash and redirects to next", async () => {
    auth.verifyOtp.mockResolvedValue({ error: null })
    const res = await get("token_hash=abc&type=recovery&next=/reset-password")
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "abc", type: "recovery" })
    expect(res.headers.get("location")).toBe("http://localhost:3000/reset-password")
  })

  it("exchanges a PKCE code", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: null })
    const res = await get("code=xyz")
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("xyz")
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard")
  })

  it("never redirects off-site", async () => {
    auth.verifyOtp.mockResolvedValue({ error: null })
    const res = await get("token_hash=abc&type=signup&next=//evil.com")
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard")
  })

  it("sends invalid or expired links to login with an error", async () => {
    auth.verifyOtp.mockResolvedValue({ error: { code: "otp_expired" } })
    const res = await get("token_hash=abc&type=signup")
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?error=link_invalid"
    )
  })

  it("rejects unknown OTP types without calling Supabase", async () => {
    const res = await get("token_hash=abc&type=admin")
    expect(auth.verifyOtp).not.toHaveBeenCalled()
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?error=link_invalid"
    )
  })
})
