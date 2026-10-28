import {
  BrainIcon,
  BriefcaseBusinessIcon,
  CircleDollarSignIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  SettingsIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  /**
   * "soon" items are shown so founders can see where the product is going, but
   * are rendered disabled — never as links to placeholder pages.
   */
  status: "available" | "soon"
}

/** Business workspace navigation. */
export const appNav: readonly NavItem[] = [
  {
    title: "Command Center",
    href: "/dashboard",
    icon: LayoutDashboardIcon,
    status: "available",
  },
  {
    title: "My Business",
    href: "/business",
    icon: BriefcaseBusinessIcon,
    status: "available",
  },
  { title: "AI CEO", href: "/ceo", icon: SparklesIcon, status: "soon" },
  { title: "Business Plan", href: "/plan", icon: ClipboardListIcon, status: "soon" },
  { title: "Tasks", href: "/tasks", icon: ListChecksIcon, status: "soon" },
  { title: "Revenue", href: "/revenue", icon: CircleDollarSignIcon, status: "soon" },
  { title: "Memory", href: "/memory", icon: BrainIcon, status: "soon" },
  { title: "Settings", href: "/settings", icon: SettingsIcon, status: "available" },
]

/**
 * Whether a nav item should render as active for the current pathname.
 * Matches the exact route or any nested route ("/business/edit" activates
 * "/business"), but never a sibling that merely shares a prefix.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname
  return normalized === href || normalized.startsWith(`${href}/`)
}
