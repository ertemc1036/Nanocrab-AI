import "server-only"

import { DataAccessError } from "@/lib/dal/errors"
import { oneOf, requireWorkspaceScope, type WorkspaceScope } from "@/lib/dal/workspace"
import type { RevenueRecord, RevenueTotals } from "@/lib/nanocrab-ceo/types"
import type { Tables } from "@/lib/supabase/database.types"

const COLUMNS =
  "id, amount, currency, sale_date, item, customer_reference, evidence_note, evidence_url, status, verified_at, refunded_at" as const
type Row = Pick<
  Tables<"revenue_records">,
  | "id"
  | "amount"
  | "currency"
  | "sale_date"
  | "item"
  | "customer_reference"
  | "evidence_note"
  | "evidence_url"
  | "status"
  | "verified_at"
  | "refunded_at"
>

const STATUSES = ["self_reported", "verified", "refunded"] as const

function toRecord(r: Row): RevenueRecord {
  return {
    id: r.id,
    amount: Number(r.amount),
    currency: r.currency,
    saleDate: r.sale_date,
    item: r.item,
    customerReference: r.customer_reference,
    evidenceNote: r.evidence_note,
    evidenceUrl: r.evidence_url,
    status: oneOf(STATUSES, r.status, "self_reported"),
    verifiedAt: r.verified_at,
    refundedAt: r.refunded_at,
  }
}

export async function listRevenue(scope?: WorkspaceScope): Promise<RevenueRecord[]> {
  const { user, business, supabase } = scope ?? (await requireWorkspaceScope())
  const { data, error } = await supabase
    .from("revenue_records")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .order("sale_date", { ascending: false })
    .limit(500)
  if (error) throw new DataAccessError("list revenue", error)
  return data.map(toRecord)
}

/** Totals per currency. Currencies are never converted into each other. */
export function revenueTotals(records: RevenueRecord[]): RevenueTotals {
  const map = new Map<
    string,
    { verified: number; selfReported: number; refunded: number }
  >()
  for (const r of records) {
    const t = map.get(r.currency) ?? { verified: 0, selfReported: 0, refunded: 0 }
    if (r.status === "verified") t.verified += r.amount
    else if (r.status === "self_reported") t.selfReported += r.amount
    else t.refunded += r.amount
    map.set(r.currency, t)
  }
  return [...map.entries()]
    .map(([currency, t]) => ({
      currency,
      verified: round2(t.verified),
      selfReported: round2(t.selfReported),
      refunded: round2(t.refunded),
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency))
}

const round2 = (n: number) => Math.round(n * 100) / 100

export type RevenueInput = {
  amount: number
  currency: string
  saleDate: string
  item: string
  customerReference: string
  evidenceNote: string
  evidenceUrl: string | null
}

export async function createRevenue(input: RevenueInput): Promise<void> {
  const { user, business, supabase } = await requireWorkspaceScope()
  const { error } = await supabase.from("revenue_records").insert({
    user_id: user.id,
    business_id: business.id,
    amount: input.amount,
    currency: input.currency,
    sale_date: input.saleDate,
    item: input.item,
    customer_reference: input.customerReference,
    evidence_note: input.evidenceNote,
    evidence_url: input.evidenceUrl,
    status: "self_reported",
  })
  if (error) throw new DataAccessError("create revenue", error)
}

/**
 * Marks a sale verified by the founder with evidence. The database rejects
 * "verified" without an evidence note or link.
 */
export async function verifyRevenue(
  id: string,
  evidence: { evidenceNote: string; evidenceUrl: string | null }
): Promise<void> {
  const { user, business, supabase } = await requireWorkspaceScope()
  const { data, error } = await supabase
    .from("revenue_records")
    .update({
      status: "verified",
      evidence_note: evidence.evidenceNote,
      evidence_url: evidence.evidenceUrl,
      verified_at: new Date().toISOString(),
      refunded_at: null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .select("id")
  if (error) throw new DataAccessError("verify revenue", error)
  if (data.length !== 1) throw new DataAccessError("verify revenue: not found")
}

export async function refundRevenue(id: string): Promise<void> {
  const { user, business, supabase } = await requireWorkspaceScope()
  const { data, error } = await supabase
    .from("revenue_records")
    .update({ status: "refunded", refunded_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .select("id")
  if (error) throw new DataAccessError("refund revenue", error)
  if (data.length !== 1) throw new DataAccessError("refund revenue: not found")
}

export async function deleteRevenue(id: string): Promise<void> {
  const { user, business, supabase } = await requireWorkspaceScope()
  const { data, error } = await supabase
    .from("revenue_records")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .select("id")
  if (error) throw new DataAccessError("delete revenue", error)
  if (data.length !== 1) throw new DataAccessError("delete revenue: not found")
}
