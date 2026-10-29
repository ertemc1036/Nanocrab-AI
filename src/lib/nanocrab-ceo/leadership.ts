import type { LeadershipStyle, PreferredLanguage } from "./types"

/**
 * Leadership styles control HOW NanoCrab leads (tone, strictness, follow-up).
 * They are independent of the operating mode (WHO leads: AI CEO vs AI
 * Co-Founder) and never grant permission to act without approval.
 */
export type LeadershipConfig = {
  id: LeadershipStyle
  name: string
  summary: string
  /** Max tasks NanoCrab may propose per reply. */
  maxTasksPerReply: number
  rules: readonly string[]
}

export const LEADERSHIP_STYLES: Record<LeadershipStyle, LeadershipConfig> = {
  standard: {
    id: "standard",
    name: "Standard CEO",
    summary:
      "Direct recommendations, collaborative planning and flexible accountability.",
    maxTasksPerReply: 3,
    rules: [
      "Give a direct recommendation, then invite the founder to adjust it.",
      "Plan tasks collaboratively: propose, explain, let the founder shape them.",
      "Mention overdue or blocked work when it's relevant, and offer to re-plan it.",
    ],
  },
  executive: {
    id: "executive",
    name: "Executive CEO",
    summary:
      "Strong prioritization, direct instructions, at most three immediate tasks and strict follow-up on unfinished work.",
    maxTasksPerReply: 3,
    rules: [
      "Pick ONE objective that matters most right now and say so plainly. Defer everything else explicitly.",
      "Give direct instructions in the imperative. No hedging, no menus of options unless the decision truly needs the founder.",
      "Never give more than three immediate tasks.",
      "Before any new work, address overdue tasks: name them, ask what blocked them, and require the founder to either finish them or revise the deadline. Be firm and constructive, never shaming.",
      "Follow up on unfinished and blocked work in every execution reply until it is resolved.",
      "Hold the founder to the success criteria; don't accept vague progress reports — ask for the specific result.",
    ],
  },
}

export function getLeadershipConfig(style: LeadershipStyle): LeadershipConfig {
  return LEADERSHIP_STYLES[style]
}

export const LANGUAGES: Record<
  PreferredLanguage,
  { label: string; englishName: string }
> = {
  de: { label: "Deutsch", englishName: "German" },
  en: { label: "English", englishName: "English" },
  tr: { label: "Türkçe", englishName: "Turkish" },
}

/** Default when the founder hasn't chosen a language. */
export const DEFAULT_LANGUAGE: PreferredLanguage = "de"

type Headings = {
  directive: string
  why: string
  orders: string
  deadline: string
  success: string
  report: string
}

/** Executive response headings per language and operating mode. */
export function responseHeadings(
  language: PreferredLanguage,
  cofounder: boolean
): Headings {
  const h: Record<PreferredLanguage, Headings> = {
    de: {
      directive: cofounder ? "EMPFEHLUNG" : "CEO-DIREKTIVE",
      why: "WARUM",
      orders: cofounder ? "NÄCHSTE SCHRITTE" : "DEINE AUFGABEN",
      deadline: "DEADLINE",
      success: "ERFOLGSKRITERIEN",
      report: "RÜCKMELDUNG",
    },
    en: {
      directive: cofounder ? "RECOMMENDATION" : "CEO DIRECTIVE",
      why: "WHY",
      orders: cofounder ? "NEXT STEPS" : "YOUR ORDERS",
      deadline: "DEADLINE",
      success: "SUCCESS CRITERIA",
      report: "REPORT BACK",
    },
    tr: {
      directive: cofounder ? "ÖNERİ" : "CEO DİREKTİFİ",
      why: "NEDEN",
      orders: cofounder ? "SONRAKİ ADIMLAR" : "GÖREVLERİN",
      deadline: "SON TARİH",
      success: "BAŞARI KRİTERLERİ",
      report: "GERİ BİLDİRİM",
    },
  }
  return h[language]
}

/** Starter prompts in the founder's language. */
export function starterPrompts(language: PreferredLanguage | null): string[] {
  switch (language ?? DEFAULT_LANGUAGE) {
    case "en":
      return [
        "What should I do today?",
        "Review my open tasks and set priorities.",
        "What's blocking my first paying customer?",
        "Help me write my first offer.",
      ]
    case "tr":
      return [
        "Bugün ne yapmalıyım?",
        "Açık görevlerimi gözden geçir ve öncelikleri belirle.",
        "İlk ödeme yapan müşterimin önünde ne engel var?",
        "İlk teklifimi yazmama yardım et.",
      ]
    default:
      return [
        "Was soll ich heute tun?",
        "Prüfe meine offenen Aufgaben und setze Prioritäten.",
        "Was hält mich vom ersten zahlenden Kunden ab?",
        "Hilf mir, mein erstes Angebot zu formulieren.",
      ]
  }
}
