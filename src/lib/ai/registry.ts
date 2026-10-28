import "server-only"

import { OpenAIProvider } from "@/lib/ai/providers/openai"
import type { AIProvider } from "@/lib/ai/types"

let provider: AIProvider | null = null

/** The active AI provider. OpenAI only for now; swap here to add others. */
export function getAIProvider(): AIProvider {
  provider ??= new OpenAIProvider()
  return provider
}
