"use client"

import { FlaskConicalIcon, PencilIcon } from "lucide-react"
import { useState, useTransition } from "react"

import { saveAssumptionsAction } from "@/app/(app)/plan/actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function AssumptionsCard({ assumptions }: { assumptions: string[] }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(assumptions.join("\n"))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <section
      aria-labelledby="assumptions"
      className="rounded-2xl border border-dashed bg-card p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id="assumptions"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <FlaskConicalIcon className="size-4 text-warning" />
            Assumptions to validate
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Claims that aren&apos;t proven yet. Test them with real customers before
            relying on them.
          </p>
        </div>
        {!editing ? (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <PencilIcon />
            Edit
          </Button>
        ) : null}
      </div>
      {editing ? (
        <div className="mt-4 grid gap-3">
          <label htmlFor="assumptions-text" className="text-xs font-medium">
            One assumption per line
          </label>
          <Textarea
            id="assumptions-text"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await saveAssumptionsAction(text)
                  if (r.ok) setEditing(false)
                  else setError(r.message ?? "Couldn't save.")
                })
              }
            >
              {pending ? "Saving…" : "Save as new version"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : assumptions.length ? (
        <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm">
          {assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground italic">None listed.</p>
      )}
    </section>
  )
}
