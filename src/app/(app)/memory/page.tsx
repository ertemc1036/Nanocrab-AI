import type { Metadata } from "next"
import { BrainIcon, ShieldCheckIcon } from "lucide-react"

import { ProposalCard } from "@/components/chat/proposal-card"
import { PageHeader } from "@/components/layout/page-header"
import { MemoryItem, NewMemoryForm } from "@/components/memory/memory-ui"
import { MEMORY_CATEGORY_LABELS } from "@/lib/nanocrab-ceo/memory-labels"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { listMemories, MAX_MEMORIES } from "@/lib/dal/memories"
import { listProposals } from "@/lib/dal/proposals"
import { requireWorkspaceScope } from "@/lib/dal/workspace"
import type { MemoryCategory } from "@/lib/nanocrab-ceo/types"

export const metadata: Metadata = { title: "Memory" }

export default async function MemoryPage() {
  await requireWorkspaceScope()
  const [memories, proposals] = await Promise.all([
    listMemories(),
    listProposals({ status: "pending", kinds: ["memory"] }),
  ])
  const grouped = (Object.keys(MEMORY_CATEGORY_LABELS) as MemoryCategory[])
    .map((c) => ({ category: c, items: memories.filter((m) => m.category === c) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Memory"
        description={`What NanoCrab remembers across conversations · ${memories.length} of ${MAX_MEMORIES}`}
      />

      <p className="flex items-start gap-2 rounded-xl border border-dashed bg-card/50 px-4 py-3 text-sm text-muted-foreground">
        <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
        Memory is separate from conversations. Only what you add or approve is saved —
        NanoCrab never stores its own guesses as facts. Avoid personal details you
        don&apos;t need to share.
      </p>

      {proposals.length > 0 ? (
        <section aria-labelledby="suggested-memories" className="space-y-3">
          <h2
            id="suggested-memories"
            className="text-sm font-medium text-muted-foreground"
          >
            Suggested by NanoCrab — approve to remember
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {proposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {grouped.length === 0 ? (
            <EmptyState
              icon={BrainIcon}
              title="Nothing remembered yet"
              description="Add facts, goals and decisions you want NanoCrab to keep in mind, or approve its suggestions in chat."
            />
          ) : (
            grouped.map((g) => (
              <section key={g.category} aria-labelledby={`mem-${g.category}`}>
                <h2
                  id={`mem-${g.category}`}
                  className="mb-2 text-sm font-medium text-muted-foreground"
                >
                  {MEMORY_CATEGORY_LABELS[g.category]}
                </h2>
                <ul className="space-y-2">
                  {g.items.map((m) => (
                    <MemoryItem key={m.id} memory={m} />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Add a memory</CardTitle>
            <CardDescription>
              Confirmed facts, goals, decisions, preferences, challenges or progress.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NewMemoryForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
