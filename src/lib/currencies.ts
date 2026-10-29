/**
 * Fixed list of common ISO 4217 currencies for dropdowns. It must be static:
 * Intl.supportedValuesOf("currency") differs between Node and browsers, which
 * would make server- and client-rendered HTML disagree (hydration errors).
 * Validation still accepts any valid ISO code.
 */
export const COMMON_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "TRY",
  "CHF",
  "CAD",
  "AUD",
  "NZD",
  "JPY",
  "CNY",
  "HKD",
  "SGD",
  "INR",
  "KRW",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "BGN",
  "ILS",
  "AED",
  "SAR",
  "QAR",
  "EGP",
  "MAD",
  "NGN",
  "KES",
  "ZAR",
  "BRL",
  "MXN",
  "ARS",
  "CLP",
  "COP",
  "PEN",
  "IDR",
  "MYR",
  "THB",
  "PHP",
  "VND",
  "PKR",
  "BDT",
  "UAH",
  "GEL",
  "AZN",
  "KZT",
] as const

/** Options for a currency select, always including the current value. */
export function currencyOptions(current?: string | null): string[] {
  const list: string[] = [...COMMON_CURRENCIES]
  if (current && !list.includes(current)) list.unshift(current)
  return list
}
