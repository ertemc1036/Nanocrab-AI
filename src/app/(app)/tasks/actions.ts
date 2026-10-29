"use server"

import { refresh } from "next/cache"

import { requireUser } from "@/lib/dal/auth"
import { createTask, deleteTask, updateTask } from "@/lib/dal/tasks"
import { fieldErrorsFrom, readForm, type FormState } from "@/lib/validation/form"
import {
  blockedReasonSchema,
  taskInputSchema,
  taskStatusSchema,
  uuidSchema,
} from "@/lib/validation/workspace"

export type ActionResult = { ok: boolean; message?: string }

const FIELDS = [
  "title",
  "description",
  "priority",
  "dueDate",
  "successCriteria",
  "deliverable",
] as const

export async function createTaskAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireUser()
  const input = readForm(formData, FIELDS)
  const parsed = taskInputSchema.safeParse(input)
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values: input }
  try {
    await createTask(parsed.data)
  } catch {
    return {
      status: "error",
      message: "Couldn't add the task. Please try again.",
      values: input,
    }
  }
  refresh()
  return { status: "success", message: "Task added." }
}

export async function updateTaskAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireUser()
  const input = readForm(formData, [...FIELDS, "id"] as const)
  const id = uuidSchema.safeParse(input.id)
  const parsed = taskInputSchema.safeParse(input)
  if (!id.success) return { status: "error", message: "Task not found." }
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values: input }
  try {
    await updateTask(id.data, parsed.data)
  } catch {
    return {
      status: "error",
      message: "Couldn't save the task. Please try again.",
      values: input,
    }
  }
  refresh()
  return { status: "success", message: "Task updated." }
}

export async function setTaskStatusAction(
  id: string,
  status: string
): Promise<ActionResult> {
  await requireUser()
  const parsedId = uuidSchema.safeParse(id)
  const parsedStatus = taskStatusSchema.safeParse(status)
  if (!parsedId.success || !parsedStatus.success)
    return { ok: false, message: "Invalid task." }
  try {
    await updateTask(parsedId.data, { status: parsedStatus.data })
  } catch {
    return { ok: false, message: "Couldn't update the task." }
  }
  refresh()
  return { ok: true }
}

/** Marks a task blocked with a reason, or unblocks it with an empty reason. */
export async function setTaskBlockedAction(
  id: string,
  reason: string
): Promise<ActionResult> {
  await requireUser()
  const parsedId = uuidSchema.safeParse(id)
  const parsedReason = blockedReasonSchema.safeParse(reason)
  if (!parsedId.success) return { ok: false, message: "Invalid task." }
  if (!parsedReason.success)
    return { ok: false, message: parsedReason.error.issues[0]?.message }
  try {
    await updateTask(parsedId.data, { blockedReason: parsedReason.data })
  } catch {
    return { ok: false, message: "Couldn't update the task." }
  }
  refresh()
  return { ok: true, message: parsedReason.data ? "Marked as blocked." : "Unblocked." }
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  await requireUser()
  const parsedId = uuidSchema.safeParse(id)
  if (!parsedId.success) return { ok: false, message: "Invalid task." }
  try {
    await deleteTask(parsedId.data)
  } catch {
    return { ok: false, message: "Couldn't delete the task." }
  }
  refresh()
  return { ok: true }
}
