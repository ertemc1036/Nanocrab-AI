"use client"

import { HistoryIcon } from "lucide-react"
import { useState } from "react"

import { ConversationList } from "@/components/chat/conversation-list"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import type { ConversationSummary } from "@/lib/dal/chat"

export function MobileConversations({
  conversations,
}: {
  conversations: ConversationSummary[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          <HistoryIcon />
          Conversations
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-4">
        <SheetHeader className="px-0">
          <SheetTitle>Conversations</SheetTitle>
          <SheetDescription className="sr-only">
            Your AI CEO conversations
          </SheetDescription>
        </SheetHeader>
        <ConversationList
          conversations={conversations}
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
