/**
 * Database security tests for the AI CEO workspace: AI request ledger and
 * limits, conversations, plans, tasks, milestones, memory, proposals, revenue
 * and operating-mode transitions. Run with `npm run test:db`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  as,
  asUser,
  connectDb,
  createAuthUser,
  DATABASE_URL,
  disconnectDb,
  expectPgError,
  rawDb,
} from "./helpers"

async function createBusiness(userId: string, name = "Biz"): Promise<string> {
  const rows = await asUser(userId, (q) =>
    q<{ id: string }>("insert into public.businesses (name) values ($1) returning id", [
      name,
    ])
  )
  return rows[0]!.id
}

async function createConversation(userId: string, businessId: string): Promise<string> {
  const rows = await asUser(userId, (q) =>
    q<{ id: string }>(
      "insert into public.conversations (user_id, business_id, title) values ($1, $2, 'Chat') returning id",
      [userId, businessId]
    )
  )
  return rows[0]!.id
}

type Begin = { request_id: string | null; allowed: boolean; reason: string | null }
const LIMITS = { perMinute: 5, perDay: 100, monthly: 2_000_000, global: 10_000_000 }

function beginRequest(
  userId: string,
  opts: Partial<{
    reserved: number
    business: string | null
    conversation: string | null
    perMinute: number
    perDay: number
    monthly: number
    global: number | null
  }> = {}
) {
  return asUser(userId, (q) =>
    q<Begin>(
      "select * from public.begin_ai_request('chat_completion', 'openai', 'gpt-test', $1, $2, $3, $4, $5, $6, $7)",
      [
        opts.reserved ?? 1000,
        opts.business ?? null,
        opts.conversation ?? null,
        opts.perMinute ?? LIMITS.perMinute,
        opts.perDay ?? LIMITS.perDay,
        opts.monthly ?? LIMITS.monthly,
        opts.global === undefined ? LIMITS.global : opts.global,
      ]
    )
  ).then((rows) => rows[0]!)
}

describe.skipIf(!DATABASE_URL)("AI CEO workspace security", () => {
  let alice: string
  let bob: string
  let aliceBiz: string
  let bobBiz: string

  beforeAll(async () => {
    await connectDb()
    alice = await createAuthUser("Alice")
    bob = await createAuthUser("Bob")
    aliceBiz = await createBusiness(alice, "Alice Co")
    bobBiz = await createBusiness(bob, "Bob Co")
  })

  afterAll(async () => {
    await disconnectDb()
  })

  describe("businesses and conversations", () => {
    it("User A cannot read User B's business", async () => {
      const rows = await asUser(alice, (q) =>
        q("select * from public.businesses where id = $1", [bobBiz])
      )
      expect(rows).toHaveLength(0)
    })

    it("User A cannot read User B's conversations or messages", async () => {
      const conv = await createConversation(bob, bobBiz)
      await asUser(bob, (q) =>
        q(
          "insert into public.messages (user_id, conversation_id, role, content) values ($1, $2, 'user', 'secret plan')",
          [bob, conv]
        )
      )
      const convs = await asUser(alice, (q) =>
        q("select * from public.conversations where id = $1", [conv])
      )
      const msgs = await asUser(alice, (q) =>
        q("select * from public.messages where conversation_id = $1", [conv])
      )
      expect(convs).toHaveLength(0)
      expect(msgs).toHaveLength(0)
    })

    it("cannot start a conversation in another user's business", async () => {
      await expectPgError(
        asUser(alice, (q) =>
          q("insert into public.conversations (user_id, business_id) values ($1, $2)", [
            alice,
            bobBiz,
          ])
        ),
        "23503"
      )
    })

    it("requires a conversation to belong to an agent or a business", async () => {
      await expectPgError(
        asUser(alice, (q) => q("insert into public.conversations (title) values ('x')")),
        "23514"
      )
    })

    it("accepts cancelled assistant messages", async () => {
      const conv = await createConversation(alice, aliceBiz)
      await asUser(alice, (q) =>
        q(
          "insert into public.messages (user_id, conversation_id, role, content, status) values ($1, $2, 'assistant', 'partial', 'cancelled')",
          [alice, conv]
        )
      )
    })
  })

  describe("AI request ledger and limits", () => {
    it("records a started request with a cost reservation", async () => {
      const carol = await createAuthUser()
      const r = await beginRequest(carol, { reserved: 1234 })
      expect(r.allowed).toBe(true)
      const { rows } = await rawDb().query(
        "select status, reserved_cost_micros, user_id from public.usage_events where id = $1",
        [r.request_id]
      )
      expect(rows[0]).toEqual({
        status: "started",
        reserved_cost_micros: "1234",
        user_id: carol,
      })
    })

    it("enforces the per-minute rate limit", async () => {
      const dave = await createAuthUser()
      for (let i = 0; i < 3; i++) {
        expect((await beginRequest(dave, { perMinute: 3 })).allowed).toBe(true)
      }
      expect(await beginRequest(dave, { perMinute: 3 })).toMatchObject({
        allowed: false,
        reason: "rate_minute",
      })
    })

    it("enforces the monthly spending limit using the reservation", async () => {
      const erin = await createAuthUser()
      expect(
        (await beginRequest(erin, { reserved: 600_000, monthly: 1_000_000 })).allowed
      ).toBe(true)
      expect(
        await beginRequest(erin, { reserved: 600_000, monthly: 1_000_000 })
      ).toMatchObject({
        allowed: false,
        reason: "monthly_spend",
      })
    })

    it("can't lower recorded spend by finishing a request with zero cost", async () => {
      const frank = await createAuthUser()
      const r = await beginRequest(frank, { reserved: 900_000, monthly: 1_000_000 })
      await asUser(frank, (q) =>
        q("select public.finish_ai_request($1, 'completed', 0, 0, 0)", [r.request_id])
      )
      expect(
        await beginRequest(frank, { reserved: 200_000, monthly: 1_000_000 })
      ).toMatchObject({
        allowed: false,
        reason: "monthly_spend",
      })
    })

    it("caps caller-supplied limits at hard ceilings", async () => {
      const gina = await createAuthUser()
      const r = await beginRequest(gina, {
        reserved: 999_000_000,
        monthly: 999_000_000_000,
        perMinute: 100000,
      })
      const { rows } = await rawDb().query(
        "select reserved_cost_micros from public.usage_events where id = $1",
        [r.request_id]
      )
      expect(rows[0].reserved_cost_micros).toBe("2000000")
    })

    it("enforces the global daily budget across users", async () => {
      // Existing spend today plus this reservation exceeds a 1-micro budget.
      const harry = await createAuthUser()
      expect(await beginRequest(harry, { global: 1 })).toMatchObject({
        allowed: false,
        reason: "global_spend",
      })
    })

    it("finishes only the caller's own started request, once", async () => {
      const r = await beginRequest(alice)
      await asUser(bob, (q) =>
        q("select public.finish_ai_request($1, 'completed', 5, 5, 99)", [r.request_id])
      )
      let { rows } = await rawDb().query(
        "select status from public.usage_events where id = $1",
        [r.request_id]
      )
      expect(rows[0].status).toBe("started")
      await asUser(alice, (q) =>
        q("select public.finish_ai_request($1, 'completed', 10, 20, 30)", [r.request_id])
      )
      await asUser(alice, (q) =>
        q("select public.finish_ai_request($1, 'failed', 0, 0, 0)", [r.request_id])
      )
      ;({ rows } = await rawDb().query(
        "select status, input_tokens, output_tokens, cost_micros from public.usage_events where id = $1",
        [r.request_id]
      ))
      expect(rows[0]).toEqual({
        status: "completed",
        input_tokens: 10,
        output_tokens: 20,
        cost_micros: "30",
      })
    })

    it("rejects requests against another user's business or conversation", async () => {
      const bobConv = await createConversation(bob, bobBiz)
      await expectPgError(beginRequest(alice, { business: bobBiz }), "42501")
      await expectPgError(beginRequest(alice, { conversation: bobConv }), "42501")
    })

    it("denies anonymous callers", async () => {
      await expectPgError(
        as("anon", null, (q) =>
          q(
            "select * from public.begin_ai_request('chat_completion','openai','m',1,null,null,5,5,5,5)"
          )
        ),
        "42501"
      )
    })

    it("hides other users' usage", async () => {
      const rows = await asUser(bob, (q) =>
        q("select * from public.usage_events where user_id = $1", [alice])
      )
      expect(rows).toHaveLength(0)
    })
  })

  describe("business plans", () => {
    const sections = { concept: "Bread", problem: "Stale bread" }

    it("versions plans and keeps exactly one active", async () => {
      const biz = await createBusiness(alice, "Plan Co")
      const ids: string[] = []
      for (const status of ["active", "draft", "active"]) {
        const rows = await asUser(alice, (q) =>
          q<{ id: string }>(
            "select public.create_plan_version($1, $2, $3, 'user', '') as id",
            [biz, JSON.stringify(sections), status]
          )
        )
        ids.push(rows[0]!.id)
      }
      await asUser(alice, (q) => q("select public.activate_plan_version($1)", [ids[1]]))
      const rows = await asUser(alice, (q) =>
        q<{ version: number; status: string }>(
          "select version, status from public.business_plans where business_id = $1 order by version",
          [biz]
        )
      )
      expect(rows).toEqual([
        { version: 1, status: "archived" },
        { version: 2, status: "active" },
        { version: 3, status: "archived" },
      ])
    })

    it("keeps plan sections immutable", async () => {
      const biz = await createBusiness(alice, "Immutable Co")
      await asUser(alice, (q) =>
        q("select public.create_plan_version($1, $2, 'active', 'user', '')", [
          biz,
          JSON.stringify(sections),
        ])
      )
      await expectPgError(
        asUser(alice, (q) =>
          q("update public.business_plans set sections = '{}' where business_id = $1", [
            biz,
          ])
        ),
        "42501"
      )
    })

    it("can't create or activate plans in another user's business", async () => {
      await expectPgError(
        asUser(alice, (q) =>
          q("select public.create_plan_version($1, $2, 'active', 'user', '')", [
            bobBiz,
            JSON.stringify(sections),
          ])
        ),
        "23503"
      )
      const rows = await asUser(bob, (q) =>
        q<{ id: string }>(
          "select public.create_plan_version($1, $2, 'draft', 'ai', '') as id",
          [bobBiz, JSON.stringify(sections)]
        )
      )
      await expectPgError(
        asUser(alice, (q) => q("select public.activate_plan_version($1)", [rows[0]!.id])),
        "42501"
      )
      const read = await asUser(alice, (q) =>
        q("select * from public.business_plans where business_id = $1", [bobBiz])
      )
      expect(read).toHaveLength(0)
    })
  })

  describe("tasks and milestones", () => {
    it("User A cannot access User B's tasks", async () => {
      const rows = await asUser(bob, (q) =>
        q<{ id: string }>(
          "insert into public.business_tasks (user_id, business_id, title) values ($1, $2, 'Call cafés') returning id",
          [bob, bobBiz]
        )
      )
      const id = rows[0]!.id
      const read = await asUser(alice, (q) =>
        q("select * from public.business_tasks where id = $1", [id])
      )
      const upd = await asUser(alice, (q) =>
        q("update public.business_tasks set status = 'done' where id = $1 returning id", [
          id,
        ])
      )
      const del = await asUser(alice, (q) =>
        q("delete from public.business_tasks where id = $1 returning id", [id])
      )
      expect([read.length, upd.length, del.length]).toEqual([0, 0, 0])
    })

    it("can't add a task to another user's business", async () => {
      await expectPgError(
        asUser(alice, (q) =>
          q(
            "insert into public.business_tasks (user_id, business_id, title) values ($1, $2, 'x')",
            [alice, bobBiz]
          )
        ),
        "23503"
      )
    })

    it("validates task fields and protects ownership columns", async () => {
      await expectPgError(
        asUser(alice, (q) =>
          q(
            "insert into public.business_tasks (user_id, business_id, title, priority) values ($1, $2, 'x', 'urgent')",
            [alice, aliceBiz]
          )
        ),
        "23514"
      )
      await expectPgError(
        asUser(alice, (q) =>
          q("update public.business_tasks set business_id = $1", [bobBiz])
        ),
        "42501"
      )
    })

    it("isolates milestones", async () => {
      await asUser(bob, (q) =>
        q(
          "insert into public.business_milestones (user_id, business_id, title) values ($1, $2, 'First 10 customers')",
          [bob, bobBiz]
        )
      )
      const read = await asUser(alice, (q) =>
        q("select * from public.business_milestones where business_id = $1", [bobBiz])
      )
      expect(read).toHaveLength(0)
    })
  })

  describe("founder memory", () => {
    it("AI requests made as User A can't retrieve User B's memories", async () => {
      await asUser(bob, (q) =>
        q(
          "insert into public.founder_memories (business_id, category, content) values ($1, 'fact', 'Bob private fact')",
          [bobBiz]
        )
      )
      // This is exactly the query the AI context loader runs, as the caller.
      const rows = await asUser(alice, (q) =>
        q("select content from public.founder_memories order by updated_at desc limit 50")
      )
      expect(rows.map((r) => r.content)).not.toContain("Bob private fact")
    })

    it("can't attach a memory to another user's business", async () => {
      await expectPgError(
        asUser(alice, (q) =>
          q(
            "insert into public.founder_memories (business_id, category, content) values ($1, 'fact', 'x')",
            [bobBiz]
          )
        ),
        "23503"
      )
    })

    it("rejects unknown categories and empty content", async () => {
      await expectPgError(
        asUser(alice, (q) =>
          q(
            "insert into public.founder_memories (category, content) values ('gossip', 'x')"
          )
        ),
        "23514"
      )
      await expectPgError(
        asUser(alice, (q) =>
          q(
            "insert into public.founder_memories (category, content) values ('fact', '  ')"
          )
        ),
        "23514"
      )
    })
  })

  describe("AI proposals (structured commands)", () => {
    it("can't create proposals targeting another user's business", async () => {
      await expectPgError(
        asUser(alice, (q) =>
          q(
            "insert into public.ai_proposals (user_id, business_id, kind, payload) values ($1, $2, 'task', '{}')",
            [alice, bobBiz]
          )
        ),
        "23503"
      )
    })

    it("can't accept or read another user's proposals", async () => {
      const rows = await asUser(bob, (q) =>
        q<{ id: string }>(
          "insert into public.ai_proposals (user_id, business_id, kind, payload) values ($1, $2, 'task', '{\"title\":\"x\"}') returning id",
          [bob, bobBiz]
        )
      )
      const upd = await asUser(alice, (q) =>
        q(
          "update public.ai_proposals set status = 'accepted' where id = $1 returning id",
          [rows[0]!.id]
        )
      )
      const read = await asUser(alice, (q) =>
        q("select * from public.ai_proposals where id = $1", [rows[0]!.id])
      )
      expect([upd.length, read.length]).toEqual([0, 0])
    })

    it("does not allow rewriting a proposal's payload", async () => {
      const rows = await asUser(alice, (q) =>
        q<{ id: string }>(
          "insert into public.ai_proposals (user_id, business_id, kind, payload) values ($1, $2, 'task', '{\"title\":\"x\"}') returning id",
          [alice, aliceBiz]
        )
      )
      await expectPgError(
        asUser(alice, (q) =>
          q("update public.ai_proposals set payload = '{}' where id = $1", [rows[0]!.id])
        ),
        "42501"
      )
    })
  })

  describe("revenue and operating mode", () => {
    async function addRevenue(userId: string, businessId: string, extra = {}) {
      const r = { status: "self_reported", evidence_note: "", ...extra }
      const rows = await asUser(userId, (q) =>
        q<{ id: string }>(
          `insert into public.revenue_records (user_id, business_id, amount, currency, sale_date, item, status, evidence_note)
           values ($1, $2, 49.00, 'EUR', '2026-10-20', 'Bread subscription', $3, $4) returning id`,
          [userId, businessId, r.status, r.evidence_note]
        )
      )
      return rows[0]!.id
    }

    it("won't mark revenue as verified without evidence", async () => {
      await expectPgError(addRevenue(alice, aliceBiz, { status: "verified" }), "23514")
      const id = await addRevenue(alice, aliceBiz)
      await expectPgError(
        asUser(alice, (q) =>
          q("update public.revenue_records set status = 'verified' where id = $1", [id])
        ),
        "23514"
      )
    })

    it("rejects non-positive amounts and bad currencies", async () => {
      await expectPgError(
        asUser(alice, (q) =>
          q(
            "insert into public.revenue_records (user_id, business_id, amount, currency, sale_date, item) values ($1, $2, 0, 'EUR', '2026-10-01', 'x')",
            [alice, aliceBiz]
          )
        ),
        "23514"
      )
      await expectPgError(
        asUser(alice, (q) =>
          q(
            "insert into public.revenue_records (user_id, business_id, amount, currency, sale_date, item) values ($1, $2, 5, 'eur', '2026-10-01', 'x')",
            [alice, aliceBiz]
          )
        ),
        "23514"
      )
    })

    it("hides other users' revenue", async () => {
      await addRevenue(bob, bobBiz)
      const rows = await asUser(alice, (q) =>
        q("select * from public.revenue_records where business_id = $1", [bobBiz])
      )
      expect(rows).toHaveLength(0)
    })

    it("requires verified revenue for the first-revenue transition", async () => {
      const biz = await createBusiness(alice, "Transition Co")
      const selfReported = await addRevenue(alice, biz)
      await expectPgError(
        asUser(alice, (q) =>
          q("select public.switch_operating_mode($1, 'cofounder', 'first_revenue', $2)", [
            biz,
            selfReported,
          ])
        ),
        "22023"
      )
      const verified = await addRevenue(alice, biz, {
        status: "verified",
        evidence_note: "Stripe payment pi_123",
      })
      await asUser(alice, (q) =>
        q("select public.switch_operating_mode($1, 'cofounder', 'first_revenue', $2)", [
          biz,
          verified,
        ])
      )
      const mode = await asUser(alice, (q) =>
        q<{ operating_mode: string }>(
          "select operating_mode from public.businesses where id = $1",
          [biz]
        )
      )
      expect(mode[0]!.operating_mode).toBe("cofounder")
      const transitions = await asUser(alice, (q) =>
        q<Record<string, unknown>>(
          "select from_mode, to_mode, reason, revenue_record_id from public.ai_role_transitions where business_id = $1",
          [biz]
        )
      )
      expect(transitions).toEqual([
        {
          from_mode: "ceo",
          to_mode: "cofounder",
          reason: "first_revenue",
          revenue_record_id: verified,
        },
      ])
    })

    it("allows a recorded manual switch back, but not a no-op", async () => {
      const biz = await createBusiness(alice, "Manual Co")
      await expectPgError(
        asUser(alice, (q) =>
          q("select public.switch_operating_mode($1, 'ceo', 'manual', null)", [biz])
        ),
        "22023"
      )
      await asUser(alice, (q) =>
        q("select public.switch_operating_mode($1, 'cofounder', 'manual', null)", [biz])
      )
      await asUser(alice, (q) =>
        q("select public.switch_operating_mode($1, 'ceo', 'manual', null)", [biz])
      )
      const rows = await asUser(alice, (q) =>
        q(
          "select to_mode from public.ai_role_transitions where business_id = $1 order by id",
          [biz]
        )
      )
      expect(rows.map((r) => r.to_mode)).toEqual(["cofounder", "ceo"])
    })

    it("can't switch another user's business or use their revenue", async () => {
      const bobRevenue = await addRevenue(bob, bobBiz, {
        status: "verified",
        evidence_note: "receipt 1",
      })
      await expectPgError(
        asUser(alice, (q) =>
          q("select public.switch_operating_mode($1, 'cofounder', 'manual', null)", [
            bobBiz,
          ])
        ),
        "42501"
      )
      await expectPgError(
        asUser(alice, (q) =>
          q("select public.switch_operating_mode($1, 'cofounder', 'first_revenue', $2)", [
            aliceBiz,
            bobRevenue,
          ])
        ),
        "22023"
      )
    })

    it("does not let users write transitions or the mode directly", async () => {
      await expectPgError(
        asUser(alice, (q) =>
          q(
            "insert into public.ai_role_transitions (user_id, business_id, from_mode, to_mode, reason) values ($1, $2, 'ceo', 'cofounder', 'manual')",
            [alice, aliceBiz]
          )
        ),
        "42501"
      )
      await expectPgError(
        asUser(alice, (q) =>
          q("update public.businesses set operating_mode = 'cofounder' where id = $1", [
            aliceBiz,
          ])
        ),
        "42501"
      )
    })
  })
})
