"use server"

import { refresh } from "next/cache"

import { requireUser } from "@/lib/dal/auth"
import {
  createMemory,
  deleteMemory,
  MemoryLimitError,
  updateMemory,
} from "@/lib/dal/memories"
import { fieldErrorsFrom, readForm, type FormState } from "@/lib/validation/form"
import { memoryInputSchema, uuidSchema } from "@/lib/validation/workspace"

export async function createMemoryAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireUser()
  const input = readForm(formData, ["category", "content"] as const)
  const parsed = memoryInputSchema.safeParse(input)
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values: input }
  try {
    await createMemory({ ...parsed.data, source: "user" })
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof MemoryLimitError ? error.message : "Couldn't save this memory.",
      values: input,
    }
  }
  refresh()
  return { status: "success", message: "Saved." }
}

export async function updateMemoryAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireUser()
  const input = readForm(formData, ["id", "category", "content"] as const)
  const id = uuidSchema.safeParse(input.id)
  const parsed = memoryInputSchema.safeParse(input)
  if (!id.success) return { status: "error", message: "Memory not found." }
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values: input }
  try {
    await updateMemory(id.data, parsed.data)
  } catch {
    return { status: "error", message: "Couldn't save this memory.", values: input }
  }
  refresh()
  return { status: "success", message: "Saved." }
}

export async function deleteMemoryAction(
  id: string
): Promise<{ ok: boolean; message?: string }> {
  await requireUser()
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) return { ok: false, message: "Memory not found." }
  try {
    await deleteMemory(parsed.data)
  } catch {
    return { ok: false, message: "Couldn't delete this memory." }
  }
  refresh()
  return { ok: true }
}
