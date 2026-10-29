"use client"

import { Loader2Icon } from "lucide-react"
import { useState, useTransition, type ComponentProps, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Result = { ok: boolean; message?: string }

/** Button that runs a server action and shows its pending state and result. */
export function ActionButton({
  action,
  children,
  pendingLabel,
  showSuccess = true,
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick"> & {
  action: () => Promise<Result>
  children: ReactNode
  pendingLabel?: string
  showSuccess?: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<Result | null>(null)
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-2", className)}>
      <Button
        {...props}
        disabled={pending || props.disabled}
        onClick={() =>
          startTransition(async () => {
            setResult(await action())
          })
        }
      >
        {pending ? <Loader2Icon className="animate-spin" /> : null}
        {pending && pendingLabel ? pendingLabel : children}
      </Button>
      {result?.message && (!result.ok || showSuccess) ? (
        <span
          role={result.ok ? "status" : "alert"}
          className={cn("text-xs", result.ok ? "text-success" : "text-destructive")}
        >
          {result.message}
        </span>
      ) : null}
    </span>
  )
}
