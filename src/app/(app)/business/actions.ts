"use server"

import { refresh } from "next/cache"
import { redirect } from "next/navigation"

import { requireUser } from "@/lib/dal/auth"
import { createBusiness, updateBusiness } from "@/lib/dal/business"
import { businessIdSchema, businessInputSchema } from "@/lib/validation/business"
import { fieldErrorsFrom, readForm, type FormState } from "@/lib/validation/form"

export async function createBusinessAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireUser()
  const input = readForm(formData, ["name", "description"] as const)
  const parsed = businessInputSchema.safeParse(input)
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values: input }
  }

  try {
    await createBusiness(parsed.data)
  } catch {
    return {
      status: "error",
      message: "Couldn't create your workspace. Please try again.",
      values: input,
    }
  }

  redirect("/dashboard")
}

export async function updateBusinessAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireUser()
  const input = readForm(formData, ["id", "name", "description"] as const)
  const values = { name: input.name, description: input.description }
  const id = businessIdSchema.safeParse(input.id)
  const parsed = businessInputSchema.safeParse(values)
  if (!id.success) return { status: "error", message: "Business not found.", values }
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values }
  }

  try {
    await updateBusiness(id.data, parsed.data)
  } catch {
    return {
      status: "error",
      message: "Couldn't save your changes. Please try again.",
      values,
    }
  }

  refresh()
  return { status: "success", message: "Business updated.", values: parsed.data }
}
