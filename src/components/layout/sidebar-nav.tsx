"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Suspense } from "react"

import { appNav, isNavItemActive } from "@/config/navigation"
import { cn } from "@/lib/utils"

const itemBase =
  "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors"

/**
 * Reading the URL must happen inside <Suspense> so dynamic routes can be
 * prerendered; the fallback renders the same links without an active state.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<NavItems pathname={null} onNavigate={onNavigate} />}>
      <CurrentNav onNavigate={onNavigate} />
    </Suspense>
  )
}

function CurrentNav({ onNavigate }: { onNavigate?: () => void }) {
  return <NavItems pathname={usePathname()} onNavigate={onNavigate} />
}

function NavItems({
  pathname,
  onNavigate,
}: {
  pathname: string | null
  onNavigate?: () => void
}) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {appNav.map((item) => {
        const Icon = item.icon

        if (item.status === "soon") {
          return (
            <span
              key={item.href}
              aria-disabled="true"
              className={cn(
                itemBase,
                "cursor-default text-sidebar-foreground/35 select-none"
              )}
            >
              <Icon className="size-4" />
              {item.title}
              <span className="ml-auto rounded-full border border-sidebar-border px-1.5 py-px text-[10px] font-medium tracking-wide text-sidebar-foreground/45 uppercase">
                Soon
              </span>
            </span>
          )
        }

        const active = pathname !== null && isNavItemActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              itemBase,
              "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}
          >
            {active ? (
              <span
                aria-hidden="true"
                className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
              />
            ) : null}
            <Icon
              className={cn(
                "size-4 transition-colors",
                active
                  ? "text-primary"
                  : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
              )}
            />
            {item.title}
          </Link>
        )
      })}
    </nav>
  )
}
