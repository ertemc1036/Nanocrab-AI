"use client"

import { ZapIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { updateLeadershipAction } from "@/app/(app)/settings/leadership-actions"
import type { LeadershipStyle } from "@/lib/nanocrab-ceo/types"
import { cn } from "@/lib/utils"

/** Executive Mode on/off. Changes NanoCrab's server-side instructions, not just a label. */
export function ExecutiveToggle({ style }: { style: LeadershipStyle }) {
  const [on, setOn] = useState(style === "executive")
  const [pending, startTransition] = useTransition()

  const toggle = () =>
    startTransition(async () => {
      const next = !on
      const r = await updateLeadershipAction({
        leadershipStyle: next ? "executive" : "standard",
      })
      if (r.ok) {
        setOn(next)
        toast.success(r.message)
      } else toast.error(r.message)
    })

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Executive Mode"
      disabled={pending}
      onClick={toggle}
      title={
        on
          ? "Executive Mode: strict priorities, max 3 tasks, firm follow-up"
          : "Standard CEO: collaborative planning, flexible accountability"
      }
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60",
        on ? "border-primary/50 bg-primary/15 text-primary" : "text-muted-foreground"
      )}
    >
      <ZapIcon className="size-3.5" />
      <span className="hidden sm:inline">Executive Mode</span>
      <span
        aria-hidden
        className={cn(
          "relative h-4 w-7 rounded-full transition-colors",
          on ? "bg-primary" : "bg-secondary"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3 rounded-full bg-background transition-all",
            on ? "left-3.5" : "left-0.5"
          )}
        />
      </span>
    </button>
  )
}
