"use client"

import { useActionState, useEffect, useMemo, useRef } from "react"

import { createRevenueAction } from "@/app/(app)/revenue/actions"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { NativeSelect } from "@/components/forms/native-select"
import { SubmitButton } from "@/components/forms/submit-button"
import { Label } from "@/components/ui/label"
import { currencyOptions } from "@/lib/currencies"
import { initialFormState } from "@/lib/validation/form"

export function RevenueForm({
  defaultCurrency,
  today,
}: {
  defaultCurrency: string
  today: string
}) {
  const [state, formAction] = useActionState(createRevenueAction, initialFormState)
  const ref = useRef<HTMLFormElement>(null)
  const currencies = useMemo(() => currencyOptions(defaultCurrency), [defaultCurrency])
  useEffect(() => {
    if (state.status === "success") ref.current?.reset()
  }, [state])
  const v = state.values
  const e = state.fieldErrors

  return (
    <form ref={ref} action={formAction} className="grid gap-4" noValidate>
      <FormAlert state={state} />
      <div className="grid grid-cols-[1fr_110px] gap-3">
        <FormField
          name="amount"
          label="Amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          defaultValue={v?.amount}
          error={e?.amount}
        />
        <div className="grid gap-2">
          <Label htmlFor="revenue-currency">Currency</Label>
          <NativeSelect
            id="revenue-currency"
            name="currency"
            defaultValue={v?.currency ?? defaultCurrency}
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <FormField
        name="saleDate"
        label="Sale date"
        type="date"
        max={today}
        defaultValue={v?.saleDate ?? today}
        error={e?.saleDate}
      />
      <FormField
        name="item"
        label="Product or service"
        maxLength={200}
        placeholder="e.g. 4-week bread subscription"
        defaultValue={v?.item}
        error={e?.item}
      />
      <FormField
        name="customerReference"
        label="Customer reference (optional)"
        maxLength={120}
        hint="An order number or company name. Avoid personal details."
        defaultValue={v?.customerReference}
        error={e?.customerReference}
      />
      <FormField
        name="evidenceNote"
        label="Evidence (optional)"
        maxLength={1000}
        hint="Payment reference, invoice or receipt number. You can add it later to verify the sale."
        defaultValue={v?.evidenceNote}
        error={e?.evidenceNote}
      />
      <FormField
        name="evidenceUrl"
        label="Evidence link (optional)"
        type="url"
        placeholder="https://"
        defaultValue={v?.evidenceUrl}
        error={e?.evidenceUrl}
      />
      <div>
        <SubmitButton pendingLabel="Recording…">Record sale</SubmitButton>
      </div>
    </form>
  )
}
