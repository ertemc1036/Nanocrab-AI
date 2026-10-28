"use client"

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  PencilIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react"
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { saveFounderProfileAction } from "@/app/(onboarding)/onboarding/actions"
import { FormAlert } from "@/components/forms/form-alert"
import { NativeSelect } from "@/components/forms/native-select"
import { SubmitButton } from "@/components/forms/submit-button"
import { TagInput } from "@/components/forms/tag-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { COUNTRY_CODES, countryName } from "@/lib/nanocrab-ceo/founder-profile/countries"
import {
  BUDGET_PRESETS,
  BUSINESS_PREFERENCES,
  GOALS,
  INTEREST_SUGGESTIONS,
  LIMITS,
  SKILL_SUGGESTIONS,
  WEEKLY_HOUR_PRESETS,
  type BusinessPreference,
  type Goal,
} from "@/lib/nanocrab-ceo/founder-profile/options"
import { cn } from "@/lib/utils"
import { initialFormState } from "@/lib/validation/form"

export type OnboardingAnswers = {
  goal: Goal | null
  goalDetails: string
  skills: string[]
  interests: string[]
  weeklyHours: number | null
  budget: { amount: number; currency: string } | null
  businessPreference: BusinessPreference | null
  hasIdea: boolean | null
  ideaDescription: string
  countryCode: string | null
}

export const EMPTY_ANSWERS: OnboardingAnswers = {
  goal: null,
  goalDetails: "",
  skills: [],
  interests: [],
  weeklyHours: null,
  budget: null,
  businessPreference: null,
  hasIdea: null,
  ideaDescription: "",
  countryCode: null,
}

type StepId =
  "goal" | "skills" | "interests" | "hours" | "budget" | "preference" | "idea" | "country"

type Step = {
  id: StepId
  question: string
  why: string
  required: boolean
  answered: (a: OnboardingAnswers) => boolean
}

const STEPS: Step[] = [
  {
    id: "goal",
    question: "What do you want to achieve?",
    why: "This shapes every recommendation NanoCrab makes.",
    required: true,
    answered: (a) => a.goal !== null,
  },
  {
    id: "skills",
    question: "What skills do you have today?",
    why: "Businesses that use skills you already have are faster and cheaper to start.",
    required: false,
    answered: (a) => a.skills.length > 0,
  },
  {
    id: "interests",
    question: "What are you interested in?",
    why: "You'll put in more hours on something you care about.",
    required: false,
    answered: (a) => a.interests.length > 0,
  },
  {
    id: "hours",
    question: "How many hours can you dedicate each week?",
    why: "Plans are only useful if they fit your real schedule.",
    required: false,
    answered: (a) => a.weeklyHours !== null,
  },
  {
    id: "budget",
    question: "What's your starting budget?",
    why: "The amount you're willing to invest — not your savings. Zero is a valid answer.",
    required: false,
    answered: (a) => a.budget !== null,
  },
  {
    id: "preference",
    question: "Do you prefer an online or a local business?",
    why: "This narrows down which opportunities fit you.",
    required: false,
    answered: (a) => a.businessPreference !== null,
  },
  {
    id: "idea",
    question: "Do you already have a business idea?",
    why: "If you do, NanoCrab starts from your idea instead of suggesting new ones.",
    required: false,
    answered: (a) => a.hasIdea !== null,
  },
  {
    id: "country",
    question: "Which country are you operating in?",
    why: "Rules, payment options and customer habits differ by country.",
    required: false,
    answered: (a) => a.countryCode !== null,
  },
]

const REVIEW = STEPS.length

export function OnboardingFlow({
  initial,
  mode,
}: {
  initial: OnboardingAnswers
  mode: "create" | "edit"
}) {
  const [answers, setAnswers] = useState<OnboardingAnswers>(initial)
  // -1 = intro (first-time only), 0..n-1 = questions, n = review
  const [index, setIndex] = useState(mode === "create" ? -1 : 0)
  const [state, formAction] = useActionState(saveFounderProfileAction, initialFormState)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus()
  }, [index])

  const update = <K extends keyof OnboardingAnswers>(
    key: K,
    value: OnboardingAnswers[K]
  ) => setAnswers((prev) => ({ ...prev, [key]: value }))

  const payload = useMemo(
    () =>
      JSON.stringify({
        ...answers,
        ideaDescription: answers.hasIdea ? answers.ideaDescription : "",
      }),
    [answers]
  )

  if (index === -1) {
    return <Intro headingRef={headingRef} onStart={() => setIndex(0)} />
  }

  if (index === REVIEW) {
    return (
      <div className="w-full max-w-2xl">
        <ProgressBar value={STEPS.length} total={STEPS.length} label="Review" />
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-8 text-2xl font-semibold tracking-tight outline-none sm:text-3xl"
        >
          Review your answers
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          NanoCrab only uses what you share here. Skipped questions stay unknown — your AI
          CEO will ask rather than guess.
        </p>
        <dl className="mt-8 divide-y divide-border rounded-2xl border bg-card/70">
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex items-start gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <dt className="text-xs font-medium text-muted-foreground">
                  {step.question}
                </dt>
                <dd className="mt-1 text-sm break-words">
                  {step.answered(answers) ? (
                    summarize(step.id, answers)
                  ) : (
                    <span className="text-muted-foreground italic">Skipped</span>
                  )}
                </dd>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIndex(i)}
                aria-label={`Edit: ${step.question}`}
              >
                <PencilIcon />
                Edit
              </Button>
            </div>
          ))}
        </dl>
        <form action={formAction} className="mt-8 grid gap-4">
          <FormAlert state={state} />
          {state.fieldErrors && Object.keys(state.fieldErrors).length > 0 ? (
            <ul className="list-inside list-disc text-sm text-destructive">
              {Object.entries(state.fieldErrors).map(([field, message]) => (
                <li key={field}>{message}</li>
              ))}
            </ul>
          ) : null}
          <input type="hidden" name="payload" value={payload} />
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" onClick={() => setIndex(REVIEW - 1)}>
              <ArrowLeftIcon />
              Back
            </Button>
            <SubmitButton pendingLabel="Saving…" className="font-semibold">
              {mode === "create" ? "Save and continue" : "Save changes"}
              <CheckIcon />
            </SubmitButton>
          </div>
        </form>
      </div>
    )
  }

  const step = STEPS[index]!
  const canContinue = !step.required || step.answered(answers)

  return (
    <div className="w-full max-w-2xl">
      <ProgressBar
        value={index + 1}
        total={STEPS.length}
        label={`Question ${index + 1} of ${STEPS.length}`}
      />
      <form
        className="mt-8"
        onSubmit={(e) => {
          e.preventDefault()
          if (canContinue) setIndex(index + 1)
        }}
      >
        <fieldset>
          <legend className="contents">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-semibold tracking-tight text-balance outline-none sm:text-3xl"
            >
              {step.question}
            </h1>
          </legend>
          <p className="mt-2 text-sm text-muted-foreground">
            {step.why}
            {!step.required ? (
              <span className="text-muted-foreground/70"> Optional.</span>
            ) : null}
          </p>
          <div className="mt-8">
            <StepBody step={step.id} answers={answers} update={update} />
          </div>
        </fieldset>

        <div className="mt-10 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIndex(index - 1)}
            disabled={index === 0 && mode === "edit"}
          >
            <ArrowLeftIcon />
            Back
          </Button>
          <div className="flex items-center gap-2">
            {!step.required && !step.answered(answers) ? (
              <Button type="button" variant="ghost" onClick={() => setIndex(index + 1)}>
                Skip
              </Button>
            ) : null}
            <Button type="submit" disabled={!canContinue} className="font-semibold">
              Continue
              <ArrowRightIcon />
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

function Intro({
  headingRef,
  onStart,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>
  onStart: () => void
}) {
  return (
    <div className="w-full max-w-xl text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
        <SparklesIcon className="size-6 text-primary" />
      </div>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-gradient-brand mt-6 text-3xl font-semibold tracking-tight text-balance outline-none sm:text-4xl"
      >
        Let&apos;s build your first business.
      </h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
        Answer eight quick questions so your AI CEO understands where you&apos;re starting
        from. It takes about three minutes, and everything except your goal is optional.
      </p>
      <ul className="mx-auto mt-8 grid max-w-sm gap-3 text-left text-sm text-muted-foreground">
        <li className="flex gap-3">
          <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
          Private to your account. Used only to tailor your recommendations.
        </li>
        <li className="flex gap-3">
          <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
          NanoCrab never assumes skills, money or experience you didn&apos;t share.
        </li>
        <li className="flex gap-3">
          <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
          You stay in charge of every decision.
        </li>
      </ul>
      <Button
        size="lg"
        className="mt-10 h-11 px-6 font-semibold shadow-[0_10px_30px_-10px_var(--primary)]"
        onClick={onStart}
      >
        Let&apos;s begin
        <ArrowRightIcon />
      </Button>
    </div>
  )
}

function ProgressBar({
  value,
  total,
  label,
}: {
  value: number
  total: number
  label: string
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        <span>{Math.round((value / total) * 100)}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={value}
        aria-label="Onboarding progress"
        className="h-1.5 overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--brand),var(--brand-2))] transition-[width] duration-300"
          style={{ width: `${(value / total) * 100}%` }}
        />
      </div>
    </div>
  )
}

/** Large selectable card backed by a real radio input. */
function ChoiceCard({
  name,
  checked,
  onSelect,
  title,
  description,
}: {
  name: string
  checked: boolean
  onSelect: () => void
  title: string
  description?: string
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border bg-card/60 p-4 transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
        checked ? "border-primary/60 bg-primary/10" : "hover:bg-card"
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
          checked ? "border-primary bg-primary" : "border-muted-foreground/40"
        )}
      >
        {checked ? (
          <span className="size-1.5 rounded-full bg-primary-foreground" />
        ) : null}
      </span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        {description ? (
          <span className="mt-0.5 block text-[13px] text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  )
}

function PresetButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "h-11 rounded-xl border px-4 text-sm font-medium tabular-nums transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        selected ? "border-primary/60 bg-primary/10" : "bg-card/60 hover:bg-card"
      )}
    >
      {children}
    </button>
  )
}

function StepBody({
  step,
  answers: a,
  update,
}: {
  step: StepId
  answers: OnboardingAnswers
  update: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void
}) {
  switch (step) {
    case "goal":
      return (
        <div className="grid gap-6">
          <div role="radiogroup" aria-label="Goal" className="grid gap-3 sm:grid-cols-2">
            {GOALS.map((g) => (
              <ChoiceCard
                key={g.value}
                name="goal"
                checked={a.goal === g.value}
                onSelect={() => update("goal", g.value)}
                title={g.label}
                description={g.description}
              />
            ))}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="goal-details">Anything else? (optional)</Label>
            <Textarea
              id="goal-details"
              value={a.goalDetails}
              maxLength={LIMITS.goalDetails}
              onChange={(e) => update("goalDetails", e.target.value)}
              placeholder="e.g. I want €500 a month extra within a year"
              rows={2}
            />
          </div>
        </div>
      )
    case "skills":
      return (
        <TagInput
          label="Skills"
          value={a.skills}
          onChange={(v) => update("skills", v)}
          suggestions={SKILL_SUGGESTIONS}
          max={LIMITS.tags}
          maxLength={LIMITS.tag}
          placeholder="Type a skill and press Enter"
        />
      )
    case "interests":
      return (
        <TagInput
          label="Interests"
          value={a.interests}
          onChange={(v) => update("interests", v)}
          suggestions={INTEREST_SUGGESTIONS}
          max={LIMITS.tags}
          maxLength={LIMITS.tag}
          placeholder="Type an interest and press Enter"
        />
      )
    case "hours":
      return (
        <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {WEEKLY_HOUR_PRESETS.map((h) => (
              <PresetButton
                key={h}
                selected={a.weeklyHours === h}
                onClick={() => update("weeklyHours", h)}
              >
                {`${h} hrs`}
              </PresetButton>
            ))}
          </div>
          <div className="grid max-w-48 gap-2">
            <Label htmlFor="weekly-hours">Or enter hours per week</Label>
            <Input
              id="weekly-hours"
              type="number"
              inputMode="numeric"
              min={1}
              max={LIMITS.weeklyHoursMax}
              value={a.weeklyHours ?? ""}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10)
                update(
                  "weeklyHours",
                  Number.isFinite(n)
                    ? Math.min(Math.max(n, 1), LIMITS.weeklyHoursMax)
                    : null
                )
              }}
            />
          </div>
        </div>
      )
    case "budget":
      return <BudgetStep answers={a} update={update} />
    case "preference":
      return (
        <div
          role="radiogroup"
          aria-label="Business type"
          className="grid gap-3 sm:grid-cols-3"
        >
          {BUSINESS_PREFERENCES.map((p) => (
            <ChoiceCard
              key={p.value}
              name="preference"
              checked={a.businessPreference === p.value}
              onSelect={() => update("businessPreference", p.value)}
              title={p.label}
              description={p.description}
            />
          ))}
        </div>
      )
    case "idea":
      return (
        <div className="grid gap-6">
          <div
            role="radiogroup"
            aria-label="Existing idea"
            className="grid gap-3 sm:grid-cols-2"
          >
            <ChoiceCard
              name="has-idea"
              checked={a.hasIdea === true}
              onSelect={() => update("hasIdea", true)}
              title="Yes, I have an idea"
              description="Even a rough one counts."
            />
            <ChoiceCard
              name="has-idea"
              checked={a.hasIdea === false}
              onSelect={() => update("hasIdea", false)}
              title="Not yet"
              description="Help me find one that fits me."
            />
          </div>
          {a.hasIdea ? (
            <div className="grid gap-2">
              <Label htmlFor="idea">Describe your idea (optional)</Label>
              <Textarea
                id="idea"
                value={a.ideaDescription}
                maxLength={LIMITS.ideaDescription}
                onChange={(e) => update("ideaDescription", e.target.value)}
                placeholder="What would you sell, and to whom?"
                rows={4}
              />
            </div>
          ) : null}
        </div>
      )
    case "country":
      return <CountryStep answers={a} update={update} />
  }
}

function BudgetStep({
  answers: a,
  update,
}: {
  answers: OnboardingAnswers
  update: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void
}) {
  const [currency, setCurrency] = useState(a.budget?.currency ?? "USD")
  const currencies = useMemo(() => {
    try {
      return Intl.supportedValuesOf("currency")
    } catch {
      return ["USD", "EUR", "GBP"]
    }
  }, [])
  const format = (amount: number) => {
    try {
      return new Intl.NumberFormat("en", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(amount)
    } catch {
      return `${amount} ${currency}`
    }
  }
  const setAmount = (amount: number | null) =>
    update("budget", amount === null ? null : { amount, currency })

  return (
    <div className="grid gap-6">
      <div className="grid max-w-48 gap-2">
        <Label htmlFor="currency">Currency</Label>
        <NativeSelect
          id="currency"
          value={currency}
          onChange={(e) => {
            setCurrency(e.target.value)
            if (a.budget) update("budget", { ...a.budget, currency: e.target.value })
          }}
        >
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {BUDGET_PRESETS.map((amount) => (
          <PresetButton
            key={amount}
            selected={a.budget?.amount === amount}
            onClick={() => setAmount(amount)}
          >
            {amount === 0 ? "Nothing yet" : format(amount)}
          </PresetButton>
        ))}
      </div>
      <div className="grid max-w-48 gap-2">
        <Label htmlFor="budget-amount">Or enter an amount</Label>
        <Input
          id="budget-amount"
          type="number"
          inputMode="decimal"
          min={0}
          max={LIMITS.budgetMax}
          step="any"
          value={a.budget?.amount ?? ""}
          onChange={(e) => {
            const n = Number.parseFloat(e.target.value)
            setAmount(Number.isFinite(n) && n >= 0 ? Math.min(n, LIMITS.budgetMax) : null)
          }}
        />
      </div>
    </div>
  )
}

function CountryStep({
  answers: a,
  update,
}: {
  answers: OnboardingAnswers
  update: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void
}) {
  const countries = useMemo(
    () =>
      COUNTRY_CODES.map((code) => ({ code, name: countryName(code) })).sort((x, y) =>
        x.name.localeCompare(y.name)
      ),
    []
  )
  return (
    <div className="grid max-w-sm gap-2">
      <Label htmlFor="country">Country</Label>
      <NativeSelect
        id="country"
        value={a.countryCode ?? ""}
        onChange={(e) => update("countryCode", e.target.value || null)}
      >
        <option value="">Select a country…</option>
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}

function summarize(step: StepId, a: OnboardingAnswers): string {
  switch (step) {
    case "goal": {
      const label = GOALS.find((g) => g.value === a.goal)?.label ?? ""
      return a.goalDetails.trim() ? `${label} — ${a.goalDetails.trim()}` : label
    }
    case "skills":
      return a.skills.join(", ")
    case "interests":
      return a.interests.join(", ")
    case "hours":
      return `${a.weeklyHours} hours per week`
    case "budget": {
      if (!a.budget) return ""
      try {
        return new Intl.NumberFormat("en", {
          style: "currency",
          currency: a.budget.currency,
        }).format(a.budget.amount)
      } catch {
        return `${a.budget.amount} ${a.budget.currency}`
      }
    }
    case "preference":
      return (
        BUSINESS_PREFERENCES.find((p) => p.value === a.businessPreference)?.label ?? ""
      )
    case "idea":
      return a.hasIdea ? a.ideaDescription.trim() || "Yes" : "Not yet"
    case "country":
      return a.countryCode ? countryName(a.countryCode) : ""
  }
}
