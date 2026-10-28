/**
 * Maps Supabase Auth errors to safe, user-facing messages. Unknown errors get
 * a generic message so internal details are never shown to users.
 */
export function authErrorMessage(
  error: { code?: string; status?: number } | null
): string {
  switch (error?.code) {
    case "invalid_credentials":
      return "Incorrect email or password."
    case "email_not_confirmed":
      return "Please confirm your email address first. Check your inbox for the link."
    case "weak_password":
      return "That password is too weak. Try a longer one with letters and numbers."
    case "same_password":
      return "Choose a password different from your current one."
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Please wait a moment and try again."
    case "signup_disabled":
      return "Sign-ups are currently disabled."
    case "otp_expired":
      return "This link has expired. Please request a new one."
    case "session_not_found":
    case "refresh_token_not_found":
      return "Your session has expired. Please log in again."
  }
  if (error?.status === 429)
    return "Too many attempts. Please wait a moment and try again."
  return "Something went wrong. Please try again."
}
