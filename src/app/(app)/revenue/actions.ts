"use server"

import { refresh } from "next/cache"
import { z } from "zod"

import { requireUser } from "@/lib/dal/auth"
import {
  createRevenue,
  deleteRevenue,
  refundRevenue,
  verifyRevenue,
} from "@/lib/dal/revenue"
import { switchMode } from "@/lib/dal/transitions"
import { fieldErrorsFrom, readForm, type FormState } from "@/lib/validation/form"
import {
  evidenceInputSchema,
  revenueInputSchema,
  uuidSchema,
} from "@/lib/validation/workspace"

export type ActionResult = { ok: boolean; message?: string }

const FIELDS = [
  "amount",
  "currency",
  "saleDate",
  "item",
  "customerReference",
  "evidenceNote",
  "evidenceUrl",
] as const

export async function createRevenueAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireUser()
  const input = readForm(formData, FIELDS)
  const parsed = revenueInputSchema.safeParse(input)
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values: input }
  const today = new Date().toISOString().slice(0, 10)
  if (parsed.data.saleDate > today) {
    return {
      status: "error",
      fieldErrors: { saleDate: "The sale date can't be in the future." },
      values: input,
    }
  }
  try {
    await createRevenue(parsed.data)
  } catch {
    return {
      status: "error",
      message: "Couldn't record this sale. Please try again.",
      values: input,
    }
  }
  refresh()
  return {
    status: "success",
    message: "Sale recorded as self-reported. Add evidence to verify it.",
  }
}

/** Marks a sale verified *by the founder, with evidence*. Never automatic. */
export async function verifyRevenueAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireUser()
  const input = readForm(formData, ["id", "evidenceNote", "evidenceUrl"] as const)
  const id = uuidSchema.safeParse(input.id)
  const parsed = evidenceInputSchema.safeParse(input)
  if (!id.success) return { status: "error", message: "Sale not found." }
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values: input }
  try {
    await verifyRevenue(id.data, parsed.data)
  } catch {
    return {
      status: "error",
      message: "Couldn't verify this sale. Please try again.",
      values: input,
    }
  }
  refresh()
  return { status: "success", message: "Marked as verified with your evidence." }
}

export async function refundRevenueAction(id: string): Promise<ActionResult> {
  await requireUser()
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) return { ok: false, message: "Sale not found." }
  try {
    await refundRevenue(parsed.data)
  } catch {
    return { ok: false, message: "Couldn't mark this sale as refunded." }
  }
  refresh()
  return { ok: true }
}

export async function deleteRevenueAction(id: string): Promise<ActionResult> {
  await requireUser()
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) return { ok: false, message: "Sale not found." }
  try {
    await deleteRevenue(parsed.data)
  } catch {
    return { ok: false, message: "Couldn't delete this sale." }
  }
  refresh()
  return { ok: true }
}

const switchSchema = z.object({
  toMode: z.enum(["ceo", "cofounder"]),
  reason: z.enum(["first_revenue", "manual"]),
  revenueRecordId: z.uuid().nullable(),
  confirmed: z.literal(true),
})

/**
 * Switches the operating mode after the founder explicitly confirms it.
 * The database verifies ownership and, for the first-revenue transition, that
 * the referenced sale is verified; every switch is recorded.
 */
export async function switchModeAction(input: {
  toMode: "ceo" | "cofounder"
  reason: "first_revenue" | "manual"
  revenueRecordId: string | null
  confirmed: boolean
}): Promise<ActionResult> {
  await requireUser()
  const parsed = switchSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: "Please confirm the switch." }
  try {
    await switchMode(parsed.data.toMode, parsed.data.reason, parsed.data.revenueRecordId)
  } catch {
    return { ok: false, message: "Couldn't switch mode. Please try again." }
  }
  refresh()
  return {
    ok: true,
    message:
      parsed.data.toMode === "cofounder"
        ? "You're the CEO now. NanoCrab is your AI Co-Founder."
        : "NanoCrab is leading as your AI CEO again.",
  }
}
