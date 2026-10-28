import { cn } from "@/lib/utils"

/**
 * NanoCrab mark: a compact crab silhouette — two raised claws over a rounded
 * shell — inside a gradient tile.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center rounded-[10px]",
        "bg-[linear-gradient(135deg,var(--brand),var(--brand-2))] shadow-[0_0_0_1px_oklch(1_0_0/12%)_inset,0_6px_20px_-6px_var(--brand)]",
        className
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[70%]" fill="none">
        {/* claws */}
        <path
          d="M6.6 10.4C4.6 9.9 3.6 7.6 4.6 5.6l2.1 1.6.5-2.6c1.7.8 2.4 3 1.4 4.6"
          stroke="oklch(0.16 0.02 38)"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17.4 10.4c2-.5 3-2.8 2-4.8l-2.1 1.6-.5-2.6c-1.7.8-2.4 3-1.4 4.6"
          stroke="oklch(0.16 0.02 38)"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* shell */}
        <path
          d="M5.5 15.2c0-2.7 2.9-4.6 6.5-4.6s6.5 1.9 6.5 4.6c0 1.6-1.6 2.6-3.4 2.6H8.9c-1.8 0-3.4-1-3.4-2.6Z"
          fill="oklch(0.16 0.02 38)"
        />
        {/* eyes */}
        <circle cx="10" cy="14.3" r="0.95" fill="oklch(0.97 0.01 38)" />
        <circle cx="14" cy="14.3" r="0.95" fill="oklch(0.97 0.01 38)" />
        {/* legs */}
        <path
          d="M7 18.6 5.6 20M17 18.6l1.4 1.4M10 18.4l-.6 1.9M14 18.4l.6 1.9"
          stroke="oklch(0.16 0.02 38)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string
  showWordmark?: boolean
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {showWordmark ? (
        <span className="text-[15px] font-semibold tracking-tight">
          NanoCrab<span className="font-normal text-muted-foreground"> AI</span>
        </span>
      ) : null}
    </span>
  )
}
