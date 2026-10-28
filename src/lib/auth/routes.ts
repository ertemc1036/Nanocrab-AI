/** Route classification shared by the proxy and tests. */

/** Pages that require a signed-in user. */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/business",
  "/ceo",
  "/plan",
  "/tasks",
  "/revenue",
  "/memory",
  "/settings",
  // Reserved for the agent architecture (AI CEO persona, future specialists).
  "/agents",
  "/conversations",
] as const

/** Sign-in/sign-up pages; signed-in users are sent to the app instead. */
export const GUEST_ONLY_PATHS = ["/login", "/signup", "/forgot-password"] as const

/** Requires the short-lived session created by a password-recovery link. */
export const RESET_PASSWORD_PATH = "/reset-password"

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function isProtectedPath(pathname: string): boolean {
  return (
    PROTECTED_PREFIXES.some((p) => matchesPrefix(pathname, p)) ||
    matchesPrefix(pathname, RESET_PASSWORD_PATH)
  )
}

export function isGuestOnlyPath(pathname: string): boolean {
  return GUEST_ONLY_PATHS.some((p) => matchesPrefix(pathname, p))
}
