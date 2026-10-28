"use server"

import { redirect } from "next/navigation"

import { requireUser } from "@/lib/dal/auth"
import { saveMyFounderProfile } from "@/lib/dal/founder"
import { founderProfileInputSchema } from "@/lib/nanocrab-ceo/founder-profile/schema"
import { fieldErrorsFrom, type FormState } from "@/lib/validation/form"

const MAX_PAYLOAD_BYTES = 16_000

/**
 * Saves founder onboarding answers. The multi-step form submits all answers as
 * one JSON field; it is size-limited, parsed and validated with Zod here.
 */
export async function saveFounderProfileAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  // Outside any try/catch so the sign-in redirect isn't swallowed.
  await requireUser()

  const raw = formData.get("payload")
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_PAYLOAD_BYTES) {
    return {
      status: "error",
      message: "We couldn't read your answers. Please try again.",
    }
  }

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return {
      status: "error",
      message: "We couldn't read your answers. Please try again.",
    }
  }

  const parsed = founderProfileInputSchema.safeParse(json)
  if (!parsed.success) {
    return {
      status: "error",
      message: "Some answers need attention.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    }
  }

  try {
    await saveMyFounderProfile(parsed.data)
  } catch {
    return { status: "error", message: "Couldn't save your profile. Please try again." }
  }

  redirect("/dashboard")
}
