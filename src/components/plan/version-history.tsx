"use client"

import { HistoryIcon } from "lucide-react"
import { useState } from "react"

import { activatePlanAction } from "@/app/(app)/plan/actions"
import { ActionButton } from "@/components/shared/action-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { PlanVersion } from "@/lib/dal/plans"
import { PLAN_SECTIONS } from "@/lib/nanocrab-ceo/plan"

export function VersionHistory({ versions }: { versions: PlanVersion[] }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <section aria-labelledby="versions" className="rounded-2xl border bg-card p-5">
      <h2 id="versions" className="flex items-center gap-2 text-sm font-semibold">
        <HistoryIcon className="size-4" />
        Version history
      </h2>
      {versions.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No versions yet.</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {versions.map((v) => (
            <li key={v.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">v{v.version}</span>
                <Badge
                  variant={v.status === "active" ? "default" : "outline"}
                  className="capitalize"
                >
                  {v.status}
                </Badge>
                <Badge variant="secondary">
                  {v.source === "ai" ? "NanoCrab" : "You"}
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "UTC",
                  }).format(new Date(v.createdAt))}{" "}
                  UTC
                </span>
              </div>
              {v.note ? (
                <p className="mt-1 text-xs text-muted-foreground">{v.note}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setOpen(open === v.id ? null : v.id)}
                  aria-expanded={open === v.id}
                >
                  {open === v.id ? "Hide" : "View"}
                </Button>
                {v.status !== "active" ? (
                  <ActionButton
                    size="xs"
                    variant="outline"
                    action={activatePlanAction.bind(null, v.id)}
                  >
                    {v.status === "draft" ? "Activate" : "Restore"}
                  </ActionButton>
                ) : null}
              </div>
              {open === v.id ? (
                <dl className="mt-3 grid gap-3 border-t pt-3">
                  {PLAN_SECTIONS.filter((s) => v.sections[s.key]).map((s) => (
                    <div key={s.key}>
                      <dt className="text-xs text-muted-foreground">{s.label}</dt>
                      <dd className="mt-0.5 text-xs whitespace-pre-wrap">
                        {v.sections[s.key]}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
