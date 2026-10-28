import { z } from "zod"

export const businessInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give your business a working name.")
    .max(80, "Use at most 80 characters."),
  description: z.string().trim().max(1000, "Use at most 1000 characters.").default(""),
})

export const businessIdSchema = z.uuid()
