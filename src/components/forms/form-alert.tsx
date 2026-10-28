import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { FormState } from "@/lib/validation/form"

/** Form-level success/error message. Announced to screen readers. */
export function FormAlert({
  state,
  className,
}: {
  state: FormState
  className?: string
}) {
  if (!state.message || state.status === "idle") return null
  const success = state.status === "success"
  const Icon = success ? CircleCheckIcon : TriangleAlertIcon
  return (
    <div
      role={success ? "status" : "alert"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm",
        success
          ? "border-success/30 bg-success/10 text-foreground"
          : "border-destructive/30 bg-destructive/10 text-foreground",
        className
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          success ? "text-success" : "text-destructive"
        )}
      />
      <p className="text-pretty">{state.message}</p>
    </div>
  )
}
