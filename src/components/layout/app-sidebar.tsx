import Link from "next/link"
import type { ReactNode } from "react"

import { Logo } from "@/components/brand/logo"
import { CreateAgentButton } from "@/components/layout/create-agent-button"
import { SidebarNav } from "@/components/layout/sidebar-nav"

/** Desktop sidebar. `footer` is reserved for the account menu. */
export function AppSidebar({ footer }: { footer?: ReactNode }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link
          href="/dashboard"
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Logo />
        </Link>
      </div>
      <div className="px-3 pb-4">
        <CreateAgentButton className="w-full" />
      </div>
      <div className="flex-1 overflow-y-auto px-3">
        <SidebarNav />
      </div>
      {footer ? <div className="border-t border-sidebar-border p-3">{footer}</div> : null}
    </aside>
  )
}
