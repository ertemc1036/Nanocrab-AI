"use client"

import {
  BrainIcon,
  CheckIcon,
  ClipboardListIcon,
  CompassIcon,
  FlagIcon,
  ListChecksIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react"
import { useState, useTransition } from "react"

import {
  acceptProposalAction,
  dismissProposalAction,
} from "@/app/(app)/proposals/actions"
import { Button } from "@/components/ui/button"
import { PLAN_SECTIONS } from "@/lib/nanocrab-ceo/plan"
import type { Proposal } from "@/lib/nanocrab-ceo/proposals"
import { cn } from "@/lib/utils"

const META = {
  task: { icon: ListChecksIcon, label: "Suggested task", accept: "Add task" },
  next_action: {
    icon: CompassIcon,
    label: "Recommended next action",
    accept: "Add to tasks",
  },
  milestone: { icon: FlagIcon, label: "Suggested milestone", accept: "Add milestone" },
  memory: { icon: BrainIcon, label: "Save to memory?", accept: "Save" },
  plan_section: {
    icon: ClipboardListIcon,
    label: "Plan update",
    accept: "Apply to plan",
  },
} as const

function describe(p: Proposal): {
  title: string
  body?: string
  meta?: string
  rationale?: string
} {
  switch (p.kind) {
    case "task":
      return {
        title: p.payload.title,
        body: p.payload.description || undefined,
        meta: `${p.payload.priority} priority${p.payload.dueInDays !== null ? ` · due in ${p.payload.dueInDays} day${p.payload.dueInDays === 1 ? "" : "s"}` : ""}`,
        rationale: p.payload.rationale || undefined,
      }
    case "next_action":
      return { title: p.payload.title, rationale: p.payload.reason || undefined }
    case "milestone":
      return {
        title: p.payload.title,
        body: p.payload.description || undefined,
        meta:
          p.payload.targetInDays !== null
            ? `target in ${p.payload.targetInDays} days`
            : undefined,
        rationale: p.payload.rationale || undefined,
      }
    case "memory":
      return {
        title: p.payload.content,
        meta: p.payload.category,
        rationale: p.payload.rationale || undefined,
      }
    case "plan_section":
      return {
        title:
          PLAN_SECTIONS.find((s) => s.key === p.payload.section)?.label ??
          p.payload.section,
        body: p.payload.content,
        rationale: p.payload.rationale || undefined,
      }
  }
}

/** An AI suggestion the founder must approve before anything changes. */
export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const [status, setStatus] = useState(proposal.status)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()
  const meta = META[proposal.kind]
  const Icon = meta.icon
  const d = describe(proposal)

  const run = (action: typeof acceptProposalAction, next: "accepted" | "dismissed") =>
    startTransition(async () => {
      const result = await action(proposal.id)
      setMessage(result.message)
      setError(!result.ok)
      if (result.ok) setStatus(next)
    })

  return (
    <div
      className={cn(
        "rounded-xl border bg-card/80 p-4",
        status === "pending" ? "border-primary/30" : "opacity-80"
      )}
    >
      <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-primary uppercase">
        <Icon className="size-3.5" />
        {meta.label}
        <span className="ml-auto font-normal text-muted-foreground normal-case">
          Suggested by NanoCrab
        </span>
      </p>
      <p className="mt-2 text-sm font-medium break-words">{d.title}</p>
      {d.body ? (
        <p className="mt-1 line-clamp-6 text-sm whitespace-pre-wrap text-muted-foreground">
          {d.body}
        </p>
      ) : null}
      {d.meta ? (
        <p className="mt-1.5 text-xs text-muted-foreground capitalize">{d.meta}</p>
      ) : null}
      {d.rationale ? (
        <p className="mt-2 border-l-2 pl-2 text-xs text-muted-foreground italic">
          {d.rationale}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {status === "pending" ? (
          <>
            <Button
              size="sm"
              disabled={pending}
              onClick={() => run(acceptProposalAction, "accepted")}
            >
              {pending ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
              {meta.accept}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => run(dismissProposalAction, "dismissed")}
            >
              <XIcon />
              Dismiss
            </Button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            {status === "accepted" ? "Approved" : "Dismissed"}
          </span>
        )}
        {message ? (
          <span
            role="status"
            className={cn("text-xs", error ? "text-destructive" : "text-success")}
          >
            {message}
          </span>
        ) : null}
      </div>
    </div>
  )
}
