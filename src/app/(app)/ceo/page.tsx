import type { Metadata } from "next"

import { CeoShell } from "@/components/chat/ceo-shell"

export const metadata: Metadata = { title: "AI CEO" }

export default function CeoPage() {
  return <CeoShell conversationId={null} />
}
