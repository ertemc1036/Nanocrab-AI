import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRightIcon,
  BotIcon,
  BrainIcon,
  MessagesSquareIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react"

import { FormAlert } from "@/components/forms/form-alert"
import { CreateAgentButton } from "@/components/layout/create-agent-button"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/dal/auth"
import { getWorkspaceSummary } from "@/lib/dal/workspace"
import { displayNameOrEmail } from "@/lib/user-display"

export const metadata: Metadata = { title: "Overview" }

const gettingStarted = [
  {
    icon: BotIcon,
    title: "Create an agent",
    description: "Pick a template or start from scratch and give it a purpose.",
  },
  {
    icon: BrainIcon,
    title: "Add memory",
    description: "Teach your agent the facts and preferences it should always know.",
  },
  {
    icon: MessagesSquareIcon,
    title: "Start a conversation",
    description: "Chat with your agent — it answers using your configuration.",
  },
]

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser()
  const [summary, params] = await Promise.all([getWorkspaceSummary(), searchParams])
  const name = displayNameOrEmail(user.displayName, user.email)

  const stats: { label: string; value: number; icon: LucideIcon }[] = [
    { label: "Agents", value: summary.agents, icon: BotIcon },
    { label: "Conversations", value: summary.conversations, icon: MessagesSquareIcon },
    { label: "Memory notes", value: summary.memories, icon: BrainIcon },
    {
      label: "AI responses this month",
      value: summary.aiResponsesThisMonth,
      icon: SparklesIcon,
    },
  ]

  return (
    <div className="space-y-10">
      {params.password === "updated" ? (
        <FormAlert
          state={{ status: "success", message: "Your password has been updated." }}
        />
      ) : null}

      <PageHeader
        title={`Welcome, ${name}`}
        description="Create your own AI. Give it a purpose. Make it work for you."
        actions={<CreateAgentButton />}
      />

      <section aria-labelledby="usage" className="space-y-4">
        <h2 id="usage" className="text-sm font-medium text-muted-foreground">
          Your workspace
        </h2>
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border bg-card p-5">
              <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Icon className="size-3.5" />
                {label}
              </dt>
              <dd className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
                {value.toLocaleString()}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {summary.agents === 0 ? (
        <>
          <section aria-labelledby="getting-started" className="space-y-4">
            <h2
              id="getting-started"
              className="text-sm font-medium text-muted-foreground"
            >
              Getting started
            </h2>
            <ol className="grid gap-4 md:grid-cols-3">
              {gettingStarted.map(({ icon: Icon, title, description }, i) => (
                <li key={title} className="rounded-xl border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-secondary ring-1 ring-border">
                      <Icon className="size-4 text-primary" />
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </li>
              ))}
            </ol>
          </section>
          <EmptyState
            icon={BotIcon}
            title="No agents yet"
            description="Your agents will appear here. Create your first one to get started."
            action={<CreateAgentButton />}
          />
        </>
      ) : (
        <Button asChild variant="outline">
          <Link href="/agents">
            View your agents
            <ArrowRightIcon />
          </Link>
        </Button>
      )}
    </div>
  )
}
