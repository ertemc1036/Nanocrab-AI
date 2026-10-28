/** Display helpers shared by server and client components. */

export function displayNameOrEmail(displayName: string | null, email: string): string {
  return displayName?.trim() || email.split("@")[0] || "Account"
}

export function initials(displayName: string | null, email: string): string {
  const source = displayName?.trim() || email.split("@")[0] || "?"
  const parts = source.split(/\s+/).filter(Boolean)
  const letters =
    parts.length >= 2
      ? `${parts[0]![0]}${parts[parts.length - 1]![0]}`
      : source.slice(0, 2)
  return letters.toUpperCase()
}
