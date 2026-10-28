"use server"

import { redirect } from "next/navigation"
import { refresh } from "next/cache"

import { authErrorMessage } from "@/lib/auth/errors"
import { deleteMyAccount } from "@/lib/dal/account"
import { requireUser } from "@/lib/dal/auth"
import { updateMyDisplayName } from "@/lib/dal/profiles"
import { createClient } from "@/lib/supabase/server"
import {
  changePasswordSchema,
  deleteAccountSchema,
  updateProfileSchema,
} from "@/lib/validation/auth"
import { fieldErrorsFrom, readForm, type FormState } from "@/lib/validation/form"

export async function updateProfileAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const input = readForm(formData, ["displayName"] as const)
  const parsed = updateProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values: input }
  }

  try {
    await updateMyDisplayName(parsed.data.displayName)
  } catch {
    return {
      status: "error",
      message: "Couldn't save your profile. Please try again.",
      values: input,
    }
  }

  refresh()
  return {
    status: "success",
    message: "Profile updated.",
    values: { displayName: parsed.data.displayName },
  }
}

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const parsed = changePasswordSchema.safeParse(
    readForm(formData, ["currentPassword", "password", "confirmPassword"] as const)
  )
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) }

  const supabase = await createClient()

  // Re-authenticate so a hijacked session can't silently change the password.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  })
  if (verifyError) {
    return verifyError.code === "invalid_credentials"
      ? {
          status: "error",
          fieldErrors: { currentPassword: "Current password is incorrect." },
        }
      : { status: "error", message: authErrorMessage(verifyError) }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { status: "error", message: authErrorMessage(error) }

  return { status: "success", message: "Password changed." }
}

export async function deleteAccountAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = deleteAccountSchema.safeParse(
    readForm(formData, ["confirmation"] as const)
  )
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) }

  try {
    await deleteMyAccount()
  } catch {
    return { status: "error", message: "Couldn't delete your account. Please try again." }
  }

  redirect("/?account=deleted")
}
