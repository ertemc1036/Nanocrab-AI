"use client"

import { LogOutIcon, TriangleAlertIcon } from "lucide-react"
import { Component, useTransition, type ReactNode } from "react"

import { logOutAction } from "@/lib/auth/actions"

/**
 * Contains failures of the sidebar account menu (e.g. the profile can't be
 * loaded) so they don't take down the whole page. The failure is shown, not
 * hidden: the slot says the account couldn't be loaded, the error is logged
 * server-side by the data layer, and signing out stays available.
 */
export class AccountErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  override render() {
    return this.state.failed ? <AccountUnavailable /> : this.props.children
  }
}

function AccountUnavailable() {
  const [pending, startTransition] = useTransition()
  return (
    <div role="alert" className="flex items-center gap-3 rounded-lg p-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 ring-1 ring-destructive/30">
        <TriangleAlertIcon className="size-4 text-destructive" />
      </div>
      <p className="min-w-0 flex-1 text-xs text-muted-foreground">
        Couldn&apos;t load your account.
      </p>
      <button
        type="button"
        onClick={() => startTransition(() => logOutAction())}
        disabled={pending}
        aria-label="Sign out"
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        <LogOutIcon className="size-4" />
      </button>
    </div>
  )
}
