"use client"

import {
  ArrowUpIcon,
  PlugZapIcon,
  SparklesIcon,
  SquareIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"

import { Markdown } from "@/components/chat/markdown"
import { ProposalCard } from "@/components/chat/proposal-card"
import { Button } from "@/components/ui/button"
import type { Proposal } from "@/lib/nanocrab-ceo/proposals"
import { cn } from "@/lib/utils"

export type ChatMessageView = {
  id: string
  role: "user" | "assistant"
  content: string
  status: "complete" | "error" | "cancelled" | "streaming"
}

type StreamEvent =
  | { type: "start"; conversationId: string }
  | { type: "delta"; text: string }
  | { type: "proposals"; proposals: Proposal[] }
  | { type: "done"; messageId: string | null; status: "complete" | "cancelled" }
  | { type: "error"; message: string }

/** Facts shown before a new conversation, computed server-side from stored tasks. */
export type ChatBriefing = {
  open: number
  overdue: number
  dueSoon: number
  blocked: number
  completedSinceLastSession: number
  completionPct: number
  focus: string | null
}

function briefingLines(b: ChatBriefing): string[] {
  const lines: string[] = []
  if (b.completedSinceLastSession)
    lines.push(`${b.completedSinceLastSession} completed since your last session`)
  if (b.overdue) lines.push(`${b.overdue} overdue`)
  if (b.blocked) lines.push(`${b.blocked} blocked`)
  if (b.dueSoon) lines.push(`${b.dueSoon} due in the next 2 days`)
  lines.push(`${b.open} open · ${b.completionPct}% done`)
  return lines
}

export function ChatView({
  conversationId: initialConversationId,
  initialMessages,
  initialProposals,
  aiConfigured,
  maxInputChars,
  assistantName,
  starters,
  briefing,
}: {
  conversationId: string | null
  initialMessages: ChatMessageView[]
  initialProposals: Proposal[]
  aiConfigured: boolean
  maxInputChars: number
  assistantName: string
  starters: string[]
  briefing: ChatBriefing | null
}) {
  const router = useRouter()
  const [conversationId, setConversationId] = useState(initialConversationId)
  const [messages, setMessages] = useState(initialMessages)
  const [proposals, setProposals] = useState(initialProposals)
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [messages, proposals])

  useEffect(() => () => abortRef.current?.abort(), [])

  const updateAssistant = (fn: (m: ChatMessageView) => ChatMessageView) =>
    setMessages((prev) => {
      const last = prev.at(-1)
      if (!last || last.role !== "assistant") return prev
      return [...prev.slice(0, -1), fn(last)]
    })

  async function send(text: string) {
    const message = text.trim()
    if (!message || streaming || !aiConfigured) return
    setError(null)
    setInput("")
    setStreaming(true)
    setMessages((prev) => [
      ...prev,
      {
        id: `local-user-${Date.now()}`,
        role: "user",
        content: message,
        status: "complete",
      },
      {
        id: `local-assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        status: "streaming",
      },
    ])

    const controller = new AbortController()
    abortRef.current = controller
    let isNewConversation = false

    try {
      const res = await fetch("/api/ceo/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, message }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "Something went wrong. Please try again.")
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let newline
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline).trim()
          buffer = buffer.slice(newline + 1)
          if (!line) continue
          const event = JSON.parse(line) as StreamEvent
          if (event.type === "start") {
            if (!conversationId) {
              isNewConversation = true
              setConversationId(event.conversationId)
              window.history.replaceState(null, "", `/ceo/${event.conversationId}`)
            }
          } else if (event.type === "delta") {
            updateAssistant((m) => ({ ...m, content: m.content + event.text }))
          } else if (event.type === "proposals") {
            setProposals((prev) => [...prev, ...event.proposals])
          } else if (event.type === "done") {
            updateAssistant((m) => ({
              ...m,
              id: event.messageId ?? m.id,
              status: event.status,
            }))
          } else if (event.type === "error") {
            updateAssistant((m) => ({ ...m, status: "error" }))
            setError(event.message)
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        updateAssistant((m) => ({ ...m, status: "cancelled" }))
      } else {
        updateAssistant((m) => ({ ...m, status: "error" }))
        setError(
          err instanceof Error ? err.message : "Something went wrong. Please try again."
        )
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
      if (isNewConversation) router.refresh()
      textareaRef.current?.focus()
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send(input)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void send(input)
    }
  }

  const empty = messages.length === 0

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
              <SparklesIcon className="size-6 text-primary" />
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">
              {assistantName} is ready to brief you
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              It knows your profile, business, plan, tasks and memory, and decides the
              next priority with you. Deutsch, English or Türkçe.
            </p>
            {briefing ? (
              <div
                aria-label="Status since your last session"
                className="mt-5 w-full max-w-xl rounded-xl border bg-card/60 px-4 py-3 text-left text-sm"
              >
                <p className="text-xs font-medium tracking-wide text-primary uppercase">
                  Status from your tasks
                </p>
                <p className="mt-1 text-muted-foreground">
                  {briefingLines(briefing).join(" · ")}
                </p>
                {briefing.focus ? (
                  <p className="mt-1">
                    <span className="text-muted-foreground">Focus: </span>
                    {briefing.focus}
                  </p>
                ) : null}
              </div>
            ) : null}
            {aiConfigured ? (
              <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                {starters.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-xl border bg-card/60 px-4 py-3 text-left text-sm outline-none hover:bg-card focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <ol className="mx-auto flex max-w-3xl flex-col gap-6 px-1 py-6">
            {messages.map((m) => (
              <li key={m.id} className={cn("flex", m.role === "user" && "justify-end")}>
                {m.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-sm whitespace-pre-wrap">
                    {m.content}
                  </div>
                ) : (
                  <div className="flex max-w-full min-w-0 gap-3">
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
                      <SparklesIcon className="size-3.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {m.content ? <Markdown>{m.content}</Markdown> : null}
                      {m.status === "streaming" && !m.content ? (
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <span className="sr-only">{assistantName} is thinking</span>
                          <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60" />
                          <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
                          <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
                        </p>
                      ) : null}
                      {m.status === "cancelled" ? (
                        <p className="mt-2 text-xs text-muted-foreground">Stopped.</p>
                      ) : null}
                      {m.status === "error" ? (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                          <TriangleAlertIcon className="size-3.5" />
                          This reply didn&apos;t complete.
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}
              </li>
            ))}
            {proposals.length > 0 ? (
              <li className="space-y-3 pl-10">
                <p className="text-xs text-muted-foreground">
                  Suggestions only change your workspace if you approve them.
                </p>
                {proposals.map((p) => (
                  <ProposalCard key={p.id} proposal={p} />
                ))}
              </li>
            ) : null}
          </ol>
        )}
        <div ref={endRef} />
      </div>

      <div className="mx-auto w-full max-w-3xl pt-3">
        {error ? (
          <p
            role="alert"
            className="mb-2 flex items-center gap-1.5 text-sm text-destructive"
          >
            <TriangleAlertIcon className="size-4" />
            {error}
          </p>
        ) : null}
        {aiConfigured ? (
          <form
            onSubmit={onSubmit}
            className="flex items-end gap-2 rounded-2xl border bg-card p-2 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
          >
            <label htmlFor="chat-input" className="sr-only">
              Message {assistantName}
            </label>
            <textarea
              id="chat-input"
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              maxLength={maxInputChars}
              rows={1}
              placeholder={`Message ${assistantName}…`}
              className="field-sizing-content max-h-48 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            {streaming ? (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                onClick={() => abortRef.current?.abort()}
                aria-label="Stop response"
              >
                <SquareIcon className="fill-current" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim()}
                aria-label="Send message"
              >
                <ArrowUpIcon />
              </Button>
            )}
          </form>
        ) : (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-dashed bg-card/60 p-4 text-sm"
          >
            <PlugZapIcon className="mt-0.5 size-4 shrink-0 text-warning" />
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">
                AI isn&apos;t configured yet.
              </span>{" "}
              Add <code className="font-mono">OPENAI_API_KEY</code> on the server to start
              real conversations. Your plan, tasks, memory and revenue work without it.
            </p>
          </div>
        )}
        <p className="mt-2 text-center text-[11px] text-muted-foreground/70">
          NanoCrab can be wrong. It suggests — you decide. No income is guaranteed.
        </p>
      </div>
    </div>
  )
}
