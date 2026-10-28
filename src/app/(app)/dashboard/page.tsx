import type { Metadata } from "next"
import { BotIcon, BrainIcon, MessagesSquareIcon } from "lucide-react"

import { CreateAgentButton } from "@/components/layout/create-agent-button"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"

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

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Welcome to NanoCrab AI"
        description="Create your own AI. Give it a purpose. Make it work for you."
        actions={<CreateAgentButton />}
      />

      <section aria-labelledby="getting-started" className="space-y-4">
        <h2 id="getting-started" className="text-sm font-medium text-muted-foreground">
          Getting started
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {gettingStarted.map(({ icon: Icon, title, description }, i) => (
            <li key={title} className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex size-9 items-center justify-center rounded-lg bg-secondary ring-1 ring-border">
                  <Icon className="size-4 text-primary" />
                </div>
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="your-agents" className="space-y-4">
        <h2 id="your-agents" className="text-sm font-medium text-muted-foreground">
          Your agents
        </h2>
        <EmptyState
          icon={BotIcon}
          title="No agents yet"
          description="Your agents will appear here. Create your first one to get started."
          action={<CreateAgentButton />}
        />
      </section>
    </div>
  )
}
