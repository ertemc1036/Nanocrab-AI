/** AI failures mapped to safe, user-facing messages. */
export type AIErrorKind =
  | "not_configured"
  | "rate_limited"
  | "spend_limit"
  | "provider_busy"
  | "provider_error"
  | "timeout"
  | "cancelled"
  | "invalid_output"
  | "no_business"

const MESSAGES: Record<AIErrorKind, string> = {
  not_configured:
    "NanoCrab's AI isn't configured yet. Add an OpenAI API key to enable it.",
  rate_limited: "You're sending messages quickly. Please wait a moment and try again.",
  spend_limit: "You've reached your AI usage limit for now. It resets automatically.",
  provider_busy: "The AI service is busy right now. Please try again shortly.",
  provider_error: "The AI service couldn't complete this request. Please try again.",
  timeout: "The AI took too long to respond. Please try again.",
  cancelled: "Response stopped.",
  invalid_output: "NanoCrab returned something we couldn't use. Please try again.",
  no_business:
    "Create a business workspace first so NanoCrab knows what you're building.",
}

export class AIError extends Error {
  constructor(
    readonly kind: AIErrorKind,
    detail?: string
  ) {
    super(detail ?? MESSAGES[kind])
    this.name = "AIError"
  }

  get userMessage(): string {
    return MESSAGES[this.kind]
  }
}

/** Maps the database limit check's reason to an error. */
export function limitError(reason: string | null): AIError {
  if (reason === "monthly_spend" || reason === "global_spend")
    return new AIError("spend_limit")
  return new AIError("rate_limited")
}

export function userMessageFor(kind: AIErrorKind): string {
  return MESSAGES[kind]
}
