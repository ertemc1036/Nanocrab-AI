import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-card/40 px-6 py-14 text-center",
        className
      )}
    >
      <div
        aria-hidden="true"
        className="bg-glow pointer-events-none absolute inset-0 opacity-60"
      />
      <div className="relative flex flex-col items-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-secondary ring-1 ring-border">
          <Icon className="size-5 text-primary" />
        </div>
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="mt-1.5 max-w-sm text-sm text-pretty text-muted-foreground">
            {description}
          </p>
        ) : null}
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </div>
  )
}
