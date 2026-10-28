import { NextRequest, NextResponse } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const session = vi.hoisted(() => ({ userId: null as string | null }))

vi.mock("@/lib/supabase/proxy", () => ({
  updateSession: vi.fn(async () => {
    const response = NextResponse.next()
    response.cookies.set("sb-test-auth-token", "refreshed")
    response.headers.set("cache-control", "private, no-store")
    return { response: () => response, userId: session.userId }
  }),
}))

import { proxy } from "./proxy"

const req = (path: string) => new NextRequest(new URL(path, "http://localhost:3000"))

function configure() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co")
  vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "sb_publishable_0123456789abcdefghij"
  )
}

beforeEach(() => {
  session.userId = null
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("proxy without Supabase configured", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
  })

  it("fails closed for protected pages", async () => {
    const res = await proxy(req("/settings"))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fsettings"
    )
  })

  it("serves public pages", async () => {
    const res = await proxy(req("/login"))
    expect(res.headers.get("location")).toBeNull()
  })
})

describe("proxy with Supabase configured", () => {
  beforeEach(configure)

  it.each([
    "/dashboard",
    "/agents",
    "/agents/abc",
    "/conversations",
    "/memory",
    "/settings",
  ])("redirects signed-out visitors away from %s", async (path) => {
    const res = await proxy(req(path))
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get("location")!)
    expect(location.pathname).toBe("/login")
    expect(location.searchParams.get("next")).toBe(path)
  })

  it("preserves the query string in next", async () => {
    const res = await proxy(req("/agents?q=coach"))
    const location = new URL(res.headers.get("location")!)
    expect(location.searchParams.get("next")).toBe("/agents?q=coach")
  })

  it("lets signed-in users through to protected pages", async () => {
    session.userId = "user-1"
    const res = await proxy(req("/dashboard"))
    expect(res.headers.get("location")).toBeNull()
    expect(res.cookies.get("sb-test-auth-token")?.value).toBe("refreshed")
  })

  it("sends signed-in users from guest pages to the app", async () => {
    session.userId = "user-1"
    const res = await proxy(req("/login"))
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard")
  })

  it("honours a safe next param for signed-in users on guest pages", async () => {
    session.userId = "user-1"
    const res = await proxy(req("/login?next=/memory"))
    expect(res.headers.get("location")).toBe("http://localhost:3000/memory")
  })

  it("ignores an unsafe next param", async () => {
    session.userId = "user-1"
    const res = await proxy(req("/login?next=//evil.com"))
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard")
  })

  it("carries refreshed auth cookies and no-store onto redirects", async () => {
    const res = await proxy(req("/settings"))
    expect(res.cookies.get("sb-test-auth-token")?.value).toBe("refreshed")
    expect(res.headers.get("cache-control")).toBe("private, no-store")
  })

  it("lets anyone reach the landing page", async () => {
    const res = await proxy(req("/"))
    expect(res.headers.get("location")).toBeNull()
  })
})
