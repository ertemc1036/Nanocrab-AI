/** Answer options for founder onboarding. Shared by UI, validation and AI context. */

export const GOALS = [
  {
    value: "side_income",
    label: "Earn extra income",
    description: "Build something alongside my job or studies.",
  },
  {
    value: "replace_income",
    label: "Replace my income",
    description: "Eventually make this my full-time living.",
  },
  {
    value: "build_startup",
    label: "Build a startup",
    description: "Create a company that can grow and scale.",
  },
  {
    value: "freelance",
    label: "Sell my skills",
    description: "Freelance or offer services independently.",
  },
  {
    value: "explore",
    label: "Explore and learn",
    description: "I'm curious and want to test what's possible.",
  },
  { value: "other", label: "Something else", description: "I'll describe it myself." },
] as const

export type Goal = (typeof GOALS)[number]["value"]
export const GOAL_VALUES = GOALS.map((g) => g.value) as [Goal, ...Goal[]]

export const BUSINESS_PREFERENCES = [
  {
    value: "online",
    label: "Online",
    description: "Digital products, services or content.",
  },
  {
    value: "local",
    label: "Local",
    description: "Serve customers in my area in person.",
  },
  { value: "either", label: "Either", description: "I'm open to both." },
] as const

export type BusinessPreference = (typeof BUSINESS_PREFERENCES)[number]["value"]
export const BUSINESS_PREFERENCE_VALUES = BUSINESS_PREFERENCES.map((p) => p.value) as [
  BusinessPreference,
  ...BusinessPreference[],
]

export const WEEKLY_HOUR_PRESETS = [5, 10, 20, 40] as const
export const BUDGET_PRESETS = [0, 100, 500, 1000, 5000] as const

export const SKILL_SUGGESTIONS = [
  "Writing",
  "Design",
  "Software development",
  "Sales",
  "Marketing",
  "Social media",
  "Teaching",
  "Cooking",
  "Photography",
  "Video editing",
  "Customer service",
  "Accounting",
  "Languages",
  "Crafts",
  "Fitness coaching",
  "Project management",
] as const

export const INTEREST_SUGGESTIONS = [
  "Technology",
  "Health & fitness",
  "Food",
  "Education",
  "Fashion",
  "Travel",
  "Gaming",
  "Finance",
  "Sustainability",
  "Pets",
  "Music",
  "Home & garden",
  "Parenting",
  "Art",
  "Sports",
  "Beauty",
] as const

export const LIMITS = {
  goalDetails: 500,
  tag: 60,
  tags: 20,
  tagsTotal: 1000,
  ideaDescription: 2000,
  weeklyHoursMax: 100,
  budgetMax: 10_000_000,
} as const
