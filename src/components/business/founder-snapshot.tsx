import Link from "next/link"
import { CircleHelpIcon, PencilIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { FounderContext } from "@/lib/nanocrab-ceo/founder-profile/context"

/** Shows exactly what NanoCrab knows — and doesn't know — about the founder. */
export function FounderSnapshot({ context }: { context: FounderContext }) {
  return (
    <section
      aria-labelledby="founder-snapshot"
      className="rounded-2xl border bg-card p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="founder-snapshot" className="text-sm font-semibold">
          What NanoCrab knows about you
        </h2>
        <Button asChild variant="ghost" size="sm">
          <Link href="/onboarding">
            <PencilIcon />
            Edit
          </Link>
        </Button>
      </div>
      <dl className="mt-4 grid gap-3">
        {context.known
          .filter((f) => f.key !== "business")
          .map((fact) => (
            <div key={fact.key}>
              <dt className="text-xs text-muted-foreground">{fact.label}</dt>
              <dd className="mt-0.5 text-sm break-words">{fact.value}</dd>
            </div>
          ))}
      </dl>
      {context.unknown.length > 0 ? (
        <div className="mt-5 rounded-lg border border-dashed bg-muted/40 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CircleHelpIcon className="size-3.5" />
            Unknown — your AI CEO will ask instead of guessing
          </p>
          <p className="mt-1 text-sm">{context.unknown.map((u) => u.label).join(", ")}</p>
        </div>
      ) : null}
    </section>
  )
}
