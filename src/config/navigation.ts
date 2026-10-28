import {
  BotIcon,
  BrainIcon,
  LayoutDashboardIcon,
  MessagesSquareIcon,
  SettingsIcon,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
}

/** Primary app navigation. Only add entries for features that actually work. */
export const appNav: readonly NavItem[] = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboardIcon },
  { title: "My Agents", href: "/agents", icon: BotIcon },
  { title: "Conversations", href: "/conversations", icon: MessagesSquareIcon },
  { title: "Memory", href: "/memory", icon: BrainIcon },
  { title: "Settings", href: "/settings", icon: SettingsIcon },
]

export const createAgentHref = "/agents/new"

/**
 * Whether a nav item should render as active for the current pathname.
 * Matches the exact route or any nested route ("/agents/123" activates "/agents"),
 * but never a sibling that merely shares a prefix ("/agents-archive").
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname
  return normalized === href || normalized.startsWith(`${href}/`)
}
