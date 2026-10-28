"use server"

import { redirect } from "next/navigation"

import { authErrorMessage } from "@/lib/auth/errors"
import { DEFAULT_AUTHENTICATED_PATH, safeRedirectPath } from "@/lib/auth/redirect"
import { requireUser } from "@/lib/dal/auth"
import { getSiteUrl, isSupabaseConfigured } from "@/lib/env"
import { createClient } from "@/lib/supabase/server"
import {
  forgotPasswordSchema,
  logInSchema,
  resetPasswordSchema,
  signUpSchema,
} from "@/lib/validation/auth"
import { fieldErrorsFrom, readForm, type FormState } from "@/lib/validation/form"

const NOT_CONFIGURED: FormState = {
  status: "error",
  message: "Authentication is not configured yet. Please try again later.",
}

export async function signUpAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const input = readForm(formData, ["displayName", "email", "password"] as const)
  const values = { displayName: input.displayName, email: input.email }
  const parsed = signUpSchema.safeParse(input)
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values }
  }
  if (!isSupabaseConfigured()) return NOT_CONFIGURED

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=${DEFAULT_AUTHENTICATED_PATH}`,
    },
  })
  if (error) return { status: "error", message: authErrorMessage(error), values }

  // Email confirmation disabled: the user is signed in immediately.
  if (data.session) redirect(DEFAULT_AUTHENTICATED_PATH)

  // Confirmation required. The same response is returned whether or not the
  // email is already registered, so accounts can't be enumerated.
  return {
    status: "success",
    message: `We've sent a confirmation link to ${parsed.data.email}. Open it to activate your account.`,
  }
}

export async function logInAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const input = readForm(formData, ["email", "password", "next"] as const)
  const values = { email: input.email }
  const parsed = logInSchema.safeParse(input)
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values }
  }
  if (!isSupabaseConfigured()) return NOT_CONFIGURED

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { status: "error", message: authErrorMessage(error), values }

  redirect(safeRedirectPath(input.next))
}

export async function logOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient()
    await supabase.auth.signOut({ scope: "local" })
  }
  redirect("/login")
}

export async function requestPasswordResetAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const input = readForm(formData, ["email"] as const)
  const parsed = forgotPasswordSchema.safeParse(input)
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values: input }
  }
  if (!isSupabaseConfigured()) return NOT_CONFIGURED

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/auth/confirm?next=/reset-password`,
  })
  // Surface rate limiting and outages (no HTTP status / 5xx). Otherwise respond
  // identically for known and unknown addresses to avoid account enumeration.
  if (
    error &&
    (error.status === 429 ||
      error.code?.startsWith("over_") ||
      !error.status ||
      error.status >= 500)
  ) {
    return { status: "error", message: authErrorMessage(error), values: input }
  }

  return {
    status: "success",
    message: `If an account exists for ${parsed.data.email}, you'll receive a reset link shortly.`,
  }
}

export async function resetPasswordAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  // Requires the session established by the recovery link.
  await requireUser()
  const parsed = resetPasswordSchema.safeParse(
    readForm(formData, ["password", "confirmPassword"] as const)
  )
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { status: "error", message: authErrorMessage(error) }

  redirect(`${DEFAULT_AUTHENTICATED_PATH}?password=updated`)
}
