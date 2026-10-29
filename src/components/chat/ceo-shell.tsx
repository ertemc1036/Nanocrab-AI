import { notFound } from "next/navigation"
import { CrownIcon, HandshakeIcon } from "lucide-react"

import { ChatView } from "@/components/chat/chat-view"
import { ConversationList } from "@/components/chat/conversation-list"
import { ExecutiveToggle } from "@/components/chat/executive-toggle"
import { MobileConversations } from "@/components/chat/mobile-conversations"
import { getAIConfig } from "@/lib/ai/config"
import {
  getConversation,
  getLastActivityAt,
  listConversations,
  listMessages,
} from "@/lib/dal/chat"
import { getMyFounderProfile } from "@/lib/dal/founder"
import { listMilestones } from "@/lib/dal/milestones"
import { listProposals } from "@/lib/dal/proposals"
import { listTasks } from "@/lib/dal/tasks"
import { requireWorkspaceScope } from "@/lib/dal/workspace"
import { buildAccountabilityReport } from "@/lib/nanocrab-ceo/accountability"
import { starterPrompts } from "@/lib/nanocrab-ceo/leadership"
import { getModeConfig } from "@/lib/nanocrab-ceo/modes"
import type { ChatBriefing } from "@/components/chat/chat-view"

/** AI CEO page body: conversation history + chat. Reads the session. */
export async function CeoShell({ conversationId }: { conversationId: string | null }) {
  const scope = await requireWorkspaceScope()
  const config = getAIConfig()
  const mode = getModeConfig(scope.business.operatingMode)
  const ModeIcon = scope.business.operatingMode === "ceo" ? CrownIcon : HandshakeIcon

  const [conversations, conversation, founder] = await Promise.all([
    listConversations(scope),
    conversationId ? getConversation(conversationId, scope) : Promise.resolve(null),
    getMyFounderProfile(),
  ])
  if (conversationId && !conversation) notFound()

  const [messages, proposals] = conversation
    ? await Promise.all([
        listMessages(conversation.id, scope),
        listProposals({ conversationId: conversation.id, limit: 30 }),
      ])
    : [[], []]

  // A new conversation opens with a factual status briefing from stored tasks.
  let briefing: ChatBriefing | null = null
  if (!conversation) {
    const [tasks, milestones, lastSessionAt] = await Promise.all([
      listTasks(scope),
      listMilestones(scope),
      getLastActivityAt(scope),
    ])
    if (tasks.length) {
      const today = new Date().toISOString().slice(0, 10)
      const r = buildAccountabilityReport(tasks, milestones, today, lastSessionAt)
      briefing = {
        open: r.open,
        overdue: r.overdue.length,
        dueSoon: r.dueSoon.length,
        blocked: r.blocked.length,
        completedSinceLastSession: r.completedSinceLastSession.length,
        completionPct: r.completionPct,
        focus: r.mostImportant?.title ?? null,
      }
    }
  }

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
        <div className="flex items-center gap-2">
          {founder ? <ExecutiveToggle style={founder.leadershipStyle} /> : null}
          <MobileConversations conversations={conversations} />
        </div>
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
            starters={starterPrompts(founder?.preferredLanguage ?? null)}
            briefing={briefing}
          />
        </section>
      </div>
    </div>
  )
}
