"use client"

import { PlusIcon, XIcon } from "lucide-react"
import { useId, useState, type KeyboardEvent } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * Free-text tag entry with one-click suggestions. Enter or comma adds a tag;
 * Backspace on an empty input removes the last one.
 */
export function TagInput({
  value,
  onChange,
  suggestions = [],
  max,
  maxLength,
  placeholder,
  label,
}: {
  value: string[]
  onChange: (next: string[]) => void
  suggestions?: readonly string[]
  max: number
  maxLength: number
  placeholder?: string
  label: string
}) {
  const [draft, setDraft] = useState("")
  const inputId = useId()
  const has = (tag: string) => value.some((v) => v.toLowerCase() === tag.toLowerCase())
  const full = value.length >= max

  const add = (raw: string) => {
    const tag = raw.trim().slice(0, maxLength)
    if (!tag || has(tag) || full) return
    onChange([...value, tag])
  }
  const remove = (tag: string) => onChange(value.filter((v) => v !== tag))

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      add(draft)
      setDraft("")
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      remove(value[value.length - 1]!)
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        <div className="flex gap-2">
          <Input
            id={inputId}
            value={draft}
            maxLength={maxLength}
            disabled={full}
            placeholder={full ? `Maximum of ${max} reached` : placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => {
              add(draft)
              setDraft("")
            }}
            disabled={!draft.trim() || full}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-input outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
            aria-label="Add"
          >
            <PlusIcon className="size-4" />
          </button>
        </div>
        {value.length > 0 ? (
          <ul
            className="flex flex-wrap gap-2"
            aria-label={`Selected ${label.toLowerCase()}`}
          >
            {value.map((tag) => (
              <li
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-primary/15 py-1 pr-1 pl-3 text-sm text-foreground ring-1 ring-primary/30"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => remove(tag)}
                  className="flex size-5 items-center justify-center rounded-full outline-none hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Remove ${tag}`}
                >
                  <XIcon className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {suggestions.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-xs font-medium text-muted-foreground">Suggestions</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => {
              const selected = has(s)
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={selected}
                  disabled={!selected && full}
                  onClick={() =>
                    selected
                      ? onChange(value.filter((v) => v.toLowerCase() !== s.toLowerCase()))
                      : add(s)
                  }
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-40",
                    selected
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  )}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
