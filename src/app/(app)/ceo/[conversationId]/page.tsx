import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { z } from "zod"

import { CeoShell } from "@/components/chat/ceo-shell"

export const metadata: Metadata = { title: "AI CEO" }

export default async function ConversationPage({
  params,
}: PageProps<"/ceo/[conversationId]">) {
  const { conversationId } = await params
  if (!z.uuid().safeParse(conversationId).success) notFound()
  return <CeoShell conversationId={conversationId} />
}
