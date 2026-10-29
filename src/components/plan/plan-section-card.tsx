"use client"

import { PencilIcon, SparklesIcon } from "lucide-react"
import { useState, useTransition } from "react"

import { improveSectionAction, savePlanSectionAction } from "@/app/(app)/plan/actions"
import { ProposalCard } from "@/components/chat/proposal-card"
import { ActionButton } from "@/components/shared/action-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SECTION_MAX } from "@/lib/nanocrab-ceo/plan"
import type { Proposal } from "@/lib/nanocrab-ceo/proposals"

export function PlanSectionCard({
  sectionKey,
  label,
  hint,
  content,
  aiConfigured,
  hasPlan,
  proposals,
}: {
  sectionKey: string
  label: string
  hint: string
  content: string
  aiConfigured: boolean
  hasPlan: boolean
  proposals: Proposal[]
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(content)
  const [improving, setImproving] = useState(false)
  const [instruction, setInstruction] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const save = () =>
    startTransition(async () => {
      const result = await savePlanSectionAction(sectionKey, draft)
      if (result.ok) {
        setEditing(false)
        setError(null)
      } else setError(result.message ?? "Couldn't save.")
    })

  const headingId = `plan-${sectionKey}`
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-2xl border bg-card p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={headingId} className="font-semibold tracking-tight">
            {label}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        </div>
        {!editing ? (
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(content)
                setEditing(true)
              }}
            >
              <PencilIcon />
              Edit
            </Button>
            {aiConfigured && hasPlan ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImproving((v) => !v)}
                aria-expanded={improving}
              >
                <SparklesIcon />
                Improve
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-4 grid gap-3">
          <label htmlFor={`${headingId}-text`} className="sr-only">
            {label}
          </label>
          <Textarea
            id={`${headingId}-text`}
            value={draft}
            maxLength={SECTION_MAX}
            rows={8}
            onChange={(e) => setDraft(e.target.value)}
          />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save as new version"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : content.trim() ? (
        <p className="mt-4 text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground italic">Not written yet.</p>
      )}

      {improving && !editing ? (
        <div className="mt-4 grid gap-2 rounded-xl border border-dashed bg-muted/30 p-3">
          <label htmlFor={`${headingId}-instruction`} className="text-xs font-medium">
            What should NanoCrab improve? (optional)
          </label>
          <Input
            id={`${headingId}-instruction`}
            value={instruction}
            maxLength={500}
            placeholder="e.g. Make it more specific for small offices in Berlin"
            onChange={(e) => setInstruction(e.target.value)}
          />
          <div>
            <ActionButton
              size="sm"
              pendingLabel="NanoCrab is thinking…"
              action={() => improveSectionAction(sectionKey, instruction)}
            >
              <SparklesIcon />
              Suggest an improvement
            </ActionButton>
          </div>
        </div>
      ) : null}

      {proposals.length > 0 ? (
        <div className="mt-4 space-y-3">
          {proposals.map((p) => (
            <ProposalCard key={p.id} proposal={p} />
          ))}
        </div>
      ) : null}
    </section>
  )
}
