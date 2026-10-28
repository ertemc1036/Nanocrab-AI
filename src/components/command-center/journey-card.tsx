import { CheckIcon } from "lucide-react"

import type { Milestone } from "@/lib/nanocrab-ceo/journey"
import { cn } from "@/lib/utils"

/** The founder journey as a vertical stepper. Untracked milestones are labelled. */
export function JourneyCard({ milestones }: { milestones: Milestone[] }) {
  const current = milestones.find((m) => m.status === "current")
  return (
    <section aria-labelledby="journey" className="rounded-2xl border bg-card p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="journey" className="text-sm font-semibold">
          Founder journey
        </h2>
        {current ? (
          <p className="text-xs text-muted-foreground">
            Active milestone:{" "}
            <span className="font-medium text-foreground">{current.title}</span>
          </p>
        ) : null}
      </div>
      <ol className="mt-6">
        {milestones.map((m, i) => (
          <li key={m.id} className="relative flex gap-4 pb-5 last:pb-0">
            {i < milestones.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-7 left-[13px] h-[calc(100%-1.5rem)] w-px",
                  m.status === "done" ? "bg-primary/50" : "bg-border"
                )}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "relative flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                m.status === "done" &&
                  "border-primary bg-primary text-primary-foreground",
                m.status === "current" &&
                  "border-primary bg-background text-primary ring-4 ring-primary/20",
                m.status === "upcoming" && "bg-background text-muted-foreground"
              )}
            >
              {m.status === "done" ? <CheckIcon className="size-3.5" /> : i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p
                className={cn(
                  "flex flex-wrap items-center gap-2 text-sm font-medium",
                  m.status === "upcoming" && "text-muted-foreground"
                )}
              >
                {m.title}
                <span className="sr-only">
                  {m.status === "done"
                    ? "(completed)"
                    : m.status === "current"
                      ? "(current)"
                      : ""}
                </span>
                {!m.tracked && m.status !== "done" ? (
                  <span className="rounded-full border px-1.5 py-px text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Tracking soon
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">{m.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
