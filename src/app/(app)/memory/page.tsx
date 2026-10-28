import type { Metadata } from "next"
import { BrainIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"

export const metadata: Metadata = { title: "Memory" }

export default function MemoryPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Memory"
        description="Knowledge notes your agents can use in every conversation."
      />
      <EmptyState
        icon={BrainIcon}
        title="No memories yet"
        description="Memory notes belong to an agent. Create an agent first, then teach it what it should know."
      />
    </div>
  )
}
