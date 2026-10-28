import type { z } from "zod"

/** Serializable result returned by form Server Actions to `useActionState`. */
export type FormState<Field extends string = string> = {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors?: Partial<Record<Field, string>>
  /** Echoed non-secret values so the form keeps them after a failed submit. */
  values?: Partial<Record<Field, string>>
}

export const initialFormState: FormState = { status: "idle" }

/** Reads only the expected string fields from FormData. */
export function readForm<const K extends string>(
  formData: FormData,
  keys: readonly K[]
): Record<K, string> {
  const out = {} as Record<K, string>
  for (const key of keys) {
    const value = formData.get(key)
    out[key] = typeof value === "string" ? value : ""
  }
  return out
}

/** First error message per field. */
export function fieldErrorsFrom<T>(error: z.ZodError<T>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join(".")
    if (key && !(key in result)) result[key] = issue.message
  }
  return result
}
