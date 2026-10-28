import type { LucideIcon } from "lucide-react"

/** An area of the Command Center that has no data yet, stated plainly. */
export function StatusTile({
  icon: Icon,
  title,
  status,
  note,
}: {
  icon: LucideIcon
  title: string
  status: string
  note: string
}) {
  return (
    <div className="rounded-xl border border-dashed bg-card/50 p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Icon className="size-3.5" />
          {title}
        </p>
        <span className="rounded-full border px-1.5 py-px text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          Soon
        </span>
      </div>
      <p className="mt-3 text-sm font-medium">{status}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">{note}</p>
    </div>
  )
}
