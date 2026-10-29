"use client"

import { CheckIcon, Loader2Icon } from "lucide-react"
import { useState, useTransition } from "react"

import { updateLeadershipAction } from "@/app/(app)/settings/leadership-actions"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LANGUAGES, LEADERSHIP_STYLES } from "@/lib/nanocrab-ceo/leadership"
import type { LeadershipStyle, PreferredLanguage } from "@/lib/nanocrab-ceo/types"
import { cn } from "@/lib/utils"

const DEFAULT_VALUE = "default"

/** Chooses HOW NanoCrab leads and which language it answers in. Saved server-side. */
export function LeadershipSettings({
  style,
  language,
}: {
  style: LeadershipStyle
  language: PreferredLanguage | null
}) {
  const [current, setCurrent] = useState(style)
  const [lang, setLang] = useState<PreferredLanguage | null>(language)
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const save = (input: {
    leadershipStyle?: LeadershipStyle
    preferredLanguage?: PreferredLanguage | null
  }) =>
    startTransition(async () => {
      const r = await updateLeadershipAction(input)
      setResult(r)
      if (r.ok) {
        if (input.leadershipStyle) setCurrent(input.leadershipStyle)
        if (input.preferredLanguage !== undefined) setLang(input.preferredLanguage)
      }
    })

  return (
    <div className="grid gap-6">
      <div
        role="radiogroup"
        aria-label="Leadership style"
        className="grid gap-3 sm:grid-cols-2"
      >
        {(Object.keys(LEADERSHIP_STYLES) as LeadershipStyle[]).map((id) => {
          const s = LEADERSHIP_STYLES[id]
          const selected = current === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={pending}
              onClick={() => !selected && save({ leadershipStyle: id })}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-70",
                selected ? "border-primary bg-primary/10" : "hover:bg-accent/50"
              )}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                {s.name}
                {selected ? <CheckIcon className="size-4 text-primary" /> : null}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {s.summary}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid max-w-xs gap-2">
        <Label htmlFor="ceo-language">Reply language</Label>
        <Select
          value={lang ?? DEFAULT_VALUE}
          disabled={pending}
          onValueChange={(v) =>
            save({
              preferredLanguage: v === DEFAULT_VALUE ? null : (v as PreferredLanguage),
            })
          }
        >
          <SelectTrigger id="ceo-language" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_VALUE}>Automatic (German by default)</SelectItem>
            {(Object.keys(LANGUAGES) as PreferredLanguage[]).map((code) => (
              <SelectItem key={code} value={code}>
                {LANGUAGES[code].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Automatic follows the language you write in.
        </p>
      </div>

      <div className="min-h-5 text-xs" aria-live="polite">
        {pending ? (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Loader2Icon className="size-3.5 animate-spin" /> Saving…
          </span>
        ) : result?.message ? (
          <span className={result.ok ? "text-success" : "text-destructive"}>
            {result.message}
          </span>
        ) : null}
      </div>
    </div>
  )
}
