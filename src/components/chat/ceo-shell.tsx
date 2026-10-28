import { notFound } from "next/navigation"
import { CrownIcon, HandshakeIcon } from "lucide-react"

import { ChatView } from "@/components/chat/chat-view"
import { ConversationList } from "@/components/chat/conversation-list"
import { MobileConversations } from "@/components/chat/mobile-conversations"
import { getAIConfig } from "@/lib/ai/config"
import { getConversation, listConversations, listMessages } from "@/lib/dal/chat"
import { listProposals } from "@/lib/dal/proposals"
import { requireWorkspaceScope } from "@/lib/dal/workspace"
import { getModeConfig } from "@/lib/nanocrab-ceo/modes"

/** AI CEO page body: conversation history + chat. Reads the session. */
export async function CeoShell({ conversationId }: { conversationId: string | null }) {
  const scope = await requireWorkspaceScope()
  const config = getAIConfig()
  const mode = getModeConfig(scope.business.operatingMode)
  const ModeIcon = scope.business.operatingMode === "ceo" ? CrownIcon : HandshakeIcon

  const [conversations, conversation] = await Promise.all([
    listConversations(scope),
    conversationId ? getConversation(conversationId, scope) : Promise.resolve(null),
  ])
  if (conversationId && !conversation) notFound()

  const [messages, proposals] = conversation
    ? await Promise.all([
        listMessages(conversation.id, scope),
        listProposals({ conversationId: conversation.id, limit: 30 }),
      ])
    : [[], []]

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] flex-col lg:h-[calc(100dvh-5rem)]">
      <div className="flex items-center justify-between gap-3 pb-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {conversation?.title ?? mode.aiRole}
          </h1>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ModeIcon className="size-3.5 text-primary" />
            {mode.name} · {scope.business.name}
          </p>
        </div>
        <MobileConversations conversations={conversations} />
      </div>
      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[240px_1fr]">
        <aside aria-label="Conversations" className="hidden min-h-0 lg:block">
          <ConversationList conversations={conversations} />
        </aside>
        <section aria-label="Chat" className="min-h-0">
          <ChatView
            key={conversation?.id ?? "new"}
            conversationId={conversation?.id ?? null}
            initialMessages={messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              status: m.status,
            }))}
            initialProposals={[...proposals].reverse()}
            aiConfigured={config.hasApiKey}
            maxInputChars={config.maxInputChars}
            assistantName="NanoCrab"
          />
        </section>
      </div>
    </div>
  )
}
