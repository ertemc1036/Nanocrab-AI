export const DEFAULT_AUTHENTICATED_PATH = "/dashboard"

/**
 * Sanitizes a user-supplied post-auth redirect target (e.g. `?next=`).
 * Only same-origin, absolute paths are allowed, which prevents open
 * redirects such as `//evil.com`, `/\evil.com` or `https://evil.com`.
 */
export function safeRedirectPath(
  value: unknown,
  fallback: string = DEFAULT_AUTHENTICATED_PATH
): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) {
    return fallback
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback
  }
  // Reject control characters (incl. tab/newline, which browsers strip).
  if (/[\u0000-\u001f\u007f]/.test(value)) {
    return fallback
  }
  try {
    const url = new URL(value, "http://localhost")
    if (url.origin !== "http://localhost") return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
