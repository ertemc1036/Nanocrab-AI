/**
 * Voice architecture (not enabled). Text chat is the supported MVP.
 *
 * When voice is added it must:
 * - Use a supported OpenAI voice API (Realtime) through a VoiceProvider.
 * - Mint short-lived client session credentials server-side; never ship the
 *   API key to the browser.
 * - Record usage as `voice` events through begin_ai_request() with separate,
 *   lower limits than text, and stay disabled unless VOICE_ENABLED=true.
 */
export type VoiceSession = {
  /** Ephemeral credential for the browser; expires quickly. */
  clientSecret: string
  expiresAt: string
  model: string
}

export interface VoiceProvider {
  readonly id: string
  createSession(options: { userId: string; instructions: string }): Promise<VoiceSession>
}

export type VoiceLimits = { maxSessionSeconds: number; sessionsPerDay: number }

export const VOICE_DEFAULTS: VoiceLimits & { enabled: false } = {
  enabled: false,
  maxSessionSeconds: 300,
  sessionsPerDay: 5,
}
