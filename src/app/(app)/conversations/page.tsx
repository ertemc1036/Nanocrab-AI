import type { Metadata } from "next"
import { MessagesSquareIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"

export const metadata: Metadata = { title: "Conversations" }

export default function ConversationsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Conversations"
        description="Every conversation with your agents, in one place."
      />
      <EmptyState
        icon={MessagesSquareIcon}
        title="No conversations yet"
        description="Conversations you start with your agents will appear here."
      />
    </div>
  )
}
