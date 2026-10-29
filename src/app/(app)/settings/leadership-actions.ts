"use server"

import { refresh } from "next/cache"
import { z } from "zod"

import { requireUser } from "@/lib/dal/auth"
import { updateMyLeadershipSettings } from "@/lib/dal/founder"

export type LeadershipResult = { ok: boolean; message?: string }

const leadershipSchema = z
  .object({
    leadershipStyle: z.enum(["standard", "executive"]).optional(),
    // null = "not set" → NanoCrab replies in German by default.
    preferredLanguage: z.enum(["de", "en", "tr"]).nullable().optional(),
  })
  .strict()
  .refine((v) => v.leadershipStyle !== undefined || v.preferredLanguage !== undefined, {
    message: "Nothing to update.",
  })

/** Saves how NanoCrab leads and which language it replies in. */
export async function updateLeadershipAction(input: unknown): Promise<LeadershipResult> {
  // Outside any try/catch so the sign-in redirect isn't swallowed.
  await requireUser()
  const parsed = leadershipSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: "Invalid leadership setting." }

  try {
    await updateMyLeadershipSettings(parsed.data)
  } catch {
    return {
      ok: false,
      message: "Couldn't save. Complete your founder profile first, then try again.",
    }
  }

  refresh()
  const style = parsed.data.leadershipStyle
  return {
    ok: true,
    message:
      style === "executive"
        ? "Executive Mode on. NanoCrab will lead with strict priorities and follow-up."
        : style === "standard"
          ? "Standard CEO style on."
          : "Language saved.",
  }
}
