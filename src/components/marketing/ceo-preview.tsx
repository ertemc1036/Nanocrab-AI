import { CheckIcon, CompassIcon, CrownIcon, SparklesIcon } from "lucide-react"

/**
 * Static product illustration for the landing page. It depicts the AI CEO
 * experience; it is not a live AI response, is captioned as a
 * preview, and is hidden from assistive tech.
 */
export function CeoPreview() {
  return (
    <figure className="relative mx-auto w-full max-w-4xl select-none">
      <div
        aria-hidden="true"
        className="bg-glow absolute -inset-x-20 -top-16 bottom-0 -z-10 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="border-gradient overflow-hidden rounded-2xl shadow-[0_40px_120px_-40px_oklch(0_0_0/80%)]"
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="size-2.5 rounded-full bg-muted" />
          <span className="size-2.5 rounded-full bg-muted" />
          <span className="size-2.5 rounded-full bg-muted" />
          <span className="ml-3 font-mono text-[11px] text-muted-foreground">
            Command Center
          </span>
        </div>
        <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-[1fr_240px]">
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-primary">
                <CompassIcon className="size-3" />
                Next recommended action
              </p>
              <p className="mt-2 text-sm font-semibold">
                Interview 5 local cafés about weekly bread orders
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Validates demand before you spend your €300 budget on equipment.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
                <SparklesIcon className="size-3.5 text-primary" />
              </div>
              <div className="space-y-2 text-sm leading-relaxed text-foreground/90">
                <p>
                  You have 10 hours a week and baking skills. A B2B sourdough subscription
                  for offices fits both — but demand is an <em>assumption</em> until cafés
                  confirm it.
                </p>
                <p className="text-xs text-muted-foreground">
                  Approve this as this week&apos;s focus?
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-[11px] text-muted-foreground">Operating mode</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                <CrownIcon className="size-3.5 text-primary" />
                AI CEO Mode
              </p>
            </div>
            <div className="space-y-2.5 rounded-xl border bg-card p-4 text-xs">
              {[
                ["Founder profile", true],
                ["Business workspace", true],
                ["Business plan", false],
                ["First revenue", false],
              ].map(([label, done]) => (
                <p key={String(label)} className="flex items-center gap-2">
                  <span
                    className={
                      done
                        ? "flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
                        : "size-4 rounded-full border border-border"
                    }
                  >
                    {done ? <CheckIcon className="size-2.5" /> : null}
                  </span>
                  <span className={done ? "" : "text-muted-foreground"}>{label}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-xs text-muted-foreground">
        Illustrative preview, not a real conversation.
      </figcaption>
    </figure>
  )
}
