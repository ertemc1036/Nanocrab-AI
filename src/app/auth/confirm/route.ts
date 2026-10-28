import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { safeRedirectPath } from "@/lib/auth/redirect"
import { isSupabaseConfigured } from "@/lib/env"
import { createClient } from "@/lib/supabase/server"

const otpTypeSchema = z.enum([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]) satisfies z.ZodType<EmailOtpType>

/**
 * Landing endpoint for links in Supabase auth emails (sign-up confirmation,
 * password recovery). Supports both the `token_hash` template recommended for
 * SSR and the PKCE `code` flow. Redirects only to same-origin paths.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const next = safeRedirectPath(searchParams.get("next"))
  const failure = NextResponse.redirect(new URL("/login?error=link_invalid", request.url))

  if (!isSupabaseConfigured()) return failure

  const supabase = await createClient()
  const tokenHash = searchParams.get("token_hash")
  const type = otpTypeSchema.safeParse(searchParams.get("type"))
  const code = searchParams.get("code")

  if (tokenHash && type.success) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type.data,
    })
    if (!error) return NextResponse.redirect(new URL(next, request.url))
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, request.url))
  }

  return failure
}
