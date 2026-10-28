"use server"

import { refresh } from "next/cache"
import { z } from "zod"

import { requireUser } from "@/lib/dal/auth"
import { deleteConversation, renameConversation } from "@/lib/dal/chat"

export type SimpleResult = { ok: boolean; message?: string }

const idSchema = z.uuid()
const titleSchema = z
  .string()
  .trim()
  .min(1, "Enter a title.")
  .max(120, "Use at most 120 characters.")

export async function renameConversationAction(
  id: string,
  title: string
): Promise<SimpleResult> {
  await requireUser()
  const parsedId = idSchema.safeParse(id)
  const parsedTitle = titleSchema.safeParse(title)
  if (!parsedId.success) return { ok: false, message: "Conversation not found." }
  if (!parsedTitle.success)
    return { ok: false, message: parsedTitle.error.issues[0]?.message }
  try {
    await renameConversation(parsedId.data, parsedTitle.data)
  } catch {
    return { ok: false, message: "Couldn't rename this conversation." }
  }
  refresh()
  return { ok: true }
}

export async function deleteConversationAction(id: string): Promise<SimpleResult> {
  await requireUser()
  const parsedId = idSchema.safeParse(id)
  if (!parsedId.success) return { ok: false, message: "Conversation not found." }
  try {
    await deleteConversation(parsedId.data)
  } catch {
    return { ok: false, message: "Couldn't delete this conversation." }
  }
  refresh()
  return { ok: true }
}
