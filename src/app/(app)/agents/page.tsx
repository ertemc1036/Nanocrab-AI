import type { Metadata } from "next"
import { BotIcon } from "lucide-react"

import { CreateAgentButton } from "@/components/layout/create-agent-button"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { requireUser } from "@/lib/dal/auth"

export const metadata: Metadata = { title: "My Agents" }

export default async function AgentsPage() {
  await requireUser()

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Agents"
        description="Create, customize and manage your AI agents."
        actions={<CreateAgentButton />}
      />
      <EmptyState
        icon={BotIcon}
        title="No agents yet"
        description="Start from a template like Study Coach or Startup Advisor, or build a fully custom agent."
        action={<CreateAgentButton />}
      />
    </div>
  )
}
