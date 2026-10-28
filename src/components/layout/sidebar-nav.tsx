"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { appNav, isNavItemActive } from "@/config/navigation"
import { cn } from "@/lib/utils"

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {appNav.map((item) => {
        const active = isNavItemActive(pathname, item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
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
