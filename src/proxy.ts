import { NextResponse, type NextRequest } from "next/server"

import { safeRedirectPath } from "@/lib/auth/redirect"
import { isGuestOnlyPath, isProtectedPath } from "@/lib/auth/routes"
import { getSupabaseEnv } from "@/lib/env"
import { updateSession } from "@/lib/supabase/proxy"

/**
 * Coarse, optimistic route protection plus session refresh.
 *
 * This is NOT the security boundary: every protected page, Server Action and
 * data access re-verifies the user (src/lib/dal) and the database enforces
 * Row Level Security. The proxy just avoids rendering private pages for
 * signed-out visitors and keeps the session cookie fresh.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const env = getSupabaseEnv()

  if (!env) {
    // Fail closed: without Supabase there is no way to be signed in.
    if (isProtectedPath(pathname)) return redirectToLogin(request, pathname, search)
    return NextResponse.next()
  }

  const session = await updateSession(request, env)

  if (!session.userId && isProtectedPath(pathname)) {
    return withCookies(redirectToLogin(request, pathname, search), session.response())
  }

  if (session.userId && isGuestOnlyPath(pathname)) {
    const next = safeRedirectPath(request.nextUrl.searchParams.get("next"))
    return withCookies(
      NextResponse.redirect(new URL(next, request.url)),
      session.response()
    )
  }

  return session.response()
}

function redirectToLogin(request: NextRequest, pathname: string, search: string) {
  const url = new URL("/login", request.url)
  url.searchParams.set("next", `${pathname}${search}`)
  return NextResponse.redirect(url)
}

/** Carries refreshed auth cookies and no-cache headers onto a redirect. */
function withCookies(target: NextResponse, source: NextResponse) {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie)
  const cacheControl = source.headers.get("cache-control")
  if (cacheControl) target.headers.set("cache-control", cacheControl)
  return target
}

export const config = {
  matcher: [
    // Everything except static assets and image optimization.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
