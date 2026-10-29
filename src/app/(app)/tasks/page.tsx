import type { Metadata } from "next"
import { CompassIcon } from "lucide-react"

import { ProposalCard } from "@/components/chat/proposal-card"
import { PageHeader } from "@/components/layout/page-header"
import { TaskForm } from "@/components/tasks/task-form"
import { TaskList } from "@/components/tasks/task-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { listProposals } from "@/lib/dal/proposals"
import { listTasks } from "@/lib/dal/tasks"
import { requireWorkspaceScope } from "@/lib/dal/workspace"
import { getDailyAction } from "@/lib/nanocrab-ceo/journey"

export const metadata: Metadata = { title: "Tasks" }

export default async function TasksPage() {
  const scope = await requireWorkspaceScope()
  const [tasks, proposals] = await Promise.all([
    listTasks(scope),
    listProposals({ status: "pending", kinds: ["task", "next_action"] }),
  ])
  const today = new Date().toISOString().slice(0, 10)
  const daily = getDailyAction(tasks, today)
  const open = tasks.filter((t) => t.status !== "done").length
  const done = tasks.length - open

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tasks"
        description={`${scope.business.name} · ${open} open · ${done} done`}
      />

      <section aria-labelledby="today" className="rounded-2xl border bg-card p-5 sm:p-6">
        <p className="flex items-center gap-2 text-xs font-medium text-primary">
          <CompassIcon className="size-3.5" />
          Today&apos;s recommended action
        </p>
        {daily ? (
          <>
            <h2 id="today" className="mt-3 text-lg font-semibold tracking-tight">
              {daily.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{daily.reason}</p>
          </>
        ) : (
          <>
            <h2 id="today" className="mt-3 text-lg font-semibold tracking-tight">
              No open tasks
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a task below, or ask your AI CEO what to do next.
            </p>
          </>
        )}
      </section>

      {proposals.length > 0 ? (
        <section aria-labelledby="suggested" className="space-y-3">
          <h2 id="suggested" className="text-sm font-medium text-muted-foreground">
            Suggested by NanoCrab — approve to add
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {proposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <TaskList tasks={tasks} today={today} />
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>New task</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
