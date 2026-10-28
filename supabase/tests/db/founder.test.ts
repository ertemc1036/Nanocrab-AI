/**
 * Database security tests for founder profiles and businesses (AI CEO Stage 1).
 * Run with `npm run test:db`.
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

async function createBusiness(userId: string, name = "Crab Bakery"): Promise<string> {
  const rows = await asUser(userId, (q) =>
    q<{ id: string }>("insert into public.businesses (name) values ($1) returning id", [
      name,
    ])
  )
  return rows[0]!.id
}

async function createProfile(userId: string) {
  await asUser(userId, (q) =>
    q("insert into public.founder_profiles (goal) values ('side_income')")
  )
}

describe.skipIf(!DATABASE_URL)("founder profiles and businesses", () => {
  let alice: string
  let bob: string

  beforeAll(async () => {
    await connectDb()
    alice = await createAuthUser("Alice")
    bob = await createAuthUser("Bob")
    await createProfile(alice)
    await createProfile(bob)
  })

  afterAll(async () => {
    await disconnectDb()
  })

  describe("founder_profiles", () => {
    it("defaults user_id to the caller and stores skipped answers as unknown", async () => {
      const rows = await asUser(alice, (q) =>
        q<Record<string, unknown>>(
          "select user_id, weekly_hours, budget_amount, has_idea, country_code from public.founder_profiles"
        )
      )
      expect(rows).toEqual([
        {
          user_id: alice,
          weekly_hours: null,
          budget_amount: null,
          has_idea: null,
          country_code: null,
        },
      ])
    })

    it("hides other founders' profiles", async () => {
      const rows = await asUser(bob, (q) =>
        q("select * from public.founder_profiles where user_id = $1", [alice])
      )
      expect(rows).toHaveLength(0)
    })

    it("prevents writing another founder's profile", async () => {
      const updated = await asUser(bob, (q) =>
        q(
          "update public.founder_profiles set goal_details = 'pwned' where user_id = $1 returning user_id",
          [alice]
        )
      )
      expect(updated).toHaveLength(0)
      await expectPgError(
        asUser(bob, (q) =>
          q(
            "insert into public.founder_profiles (user_id, goal) values ($1, 'explore')",
            [alice]
          )
        ),
        "42501"
      )
    })

    it("does not let founders delete their profile directly", async () => {
      await expectPgError(
        asUser(alice, (q) => q("delete from public.founder_profiles")),
        "42501"
      )
    })

    it("denies anon access", async () => {
      await expectPgError(
        as("anon", null, (q) => q("select * from public.founder_profiles")),
        "42501"
      )
    })

    it("validates answers", async () => {
      const bad = [
        "goal = 'get_rich_quick'",
        "weekly_hours = 0",
        "weekly_hours = 200",
        "country_code = 'usa'",
        "budget_amount = -1, budget_currency = 'USD'",
        "budget_amount = 100",
        "budget_currency = 'usd', budget_amount = 1",
        "business_preference = 'space'",
      ]
      for (const assignment of bad) {
        await expectPgError(
          asUser(alice, (q) => q(`update public.founder_profiles set ${assignment}`)),
          "23514"
        )
      }
    })

    it("caps skills and interests", async () => {
      const tooMany = Array.from({ length: 21 }, (_, i) => `skill${i}`)
      await expectPgError(
        asUser(alice, (q) =>
          q("update public.founder_profiles set skills = $1", [tooMany])
        ),
        "23514"
      )
      await expectPgError(
        asUser(alice, (q) =>
          q("update public.founder_profiles set interests = $1", [["x".repeat(1001)]])
        ),
        "23514"
      )
    })
  })

  describe("businesses", () => {
    it("starts every business in AI CEO mode", async () => {
      const id = await createBusiness(alice)
      const { rows } = await rawDb().query(
        "select user_id, operating_mode, status from public.businesses where id = $1",
        [id]
      )
      expect(rows[0]).toEqual({ user_id: alice, operating_mode: "ceo", status: "active" })
    })

    it("does not let founders change the operating mode directly", async () => {
      const id = await createBusiness(alice)
      await expectPgError(
        asUser(alice, (q) =>
          q("update public.businesses set operating_mode = 'cofounder' where id = $1", [
            id,
          ])
        ),
        "42501"
      )
      await expectPgError(
        asUser(alice, (q) =>
          q(
            "insert into public.businesses (name, operating_mode) values ('x', 'cofounder')"
          )
        ),
        "42501"
      )
    })

    it("hides and protects other founders' businesses", async () => {
      const id = await createBusiness(alice, "Secret Venture")
      const read = await asUser(bob, (q) =>
        q("select * from public.businesses where id = $1", [id])
      )
      const updated = await asUser(bob, (q) =>
        q("update public.businesses set name = 'Stolen' where id = $1 returning id", [id])
      )
      const deleted = await asUser(bob, (q) =>
        q("delete from public.businesses where id = $1 returning id", [id])
      )
      expect(read).toHaveLength(0)
      expect(updated).toHaveLength(0)
      expect(deleted).toHaveLength(0)
      const { rows } = await rawDb().query(
        "select name from public.businesses where id = $1",
        [id]
      )
      expect(rows[0].name).toBe("Secret Venture")
    })

    it("prevents creating a business for another founder", async () => {
      await expectPgError(
        asUser(bob, (q) =>
          q("insert into public.businesses (user_id, name) values ($1, 'Spoof')", [alice])
        ),
        "42501"
      )
    })

    it("lets the owner rename, archive and delete their business", async () => {
      const id = await createBusiness(alice)
      await asUser(alice, (q) =>
        q(
          "update public.businesses set name = 'Renamed', status = 'archived' where id = $1",
          [id]
        )
      )
      const deleted = await asUser(alice, (q) =>
        q("delete from public.businesses where id = $1 returning id", [id])
      )
      expect(deleted).toHaveLength(1)
    })
  })

  describe("current business", () => {
    it("can point at the founder's own business", async () => {
      const id = await createBusiness(alice)
      await asUser(alice, (q) =>
        q("update public.founder_profiles set current_business_id = $1", [id])
      )
      const rows = await asUser(alice, (q) =>
        q<{ current_business_id: string }>(
          "select current_business_id from public.founder_profiles"
        )
      )
      expect(rows[0]!.current_business_id).toBe(id)
    })

    it("can never point at another founder's business", async () => {
      const aliceBusiness = await createBusiness(alice)
      await expectPgError(
        asUser(bob, (q) =>
          q("update public.founder_profiles set current_business_id = $1", [
            aliceBusiness,
          ])
        ),
        "23503"
      )
    })

    it("is cleared, not cascaded, when the business is deleted", async () => {
      const id = await createBusiness(alice)
      await asUser(alice, async (q) => {
        await q("update public.founder_profiles set current_business_id = $1", [id])
        await q("delete from public.businesses where id = $1", [id])
      })
      const rows = await asUser(alice, (q) =>
        q<{ current_business_id: string | null }>(
          "select current_business_id from public.founder_profiles"
        )
      )
      expect(rows).toEqual([{ current_business_id: null }])
    })
  })

  it("removes founder data when the account is deleted", async () => {
    const carol = await createAuthUser("Carol")
    await createProfile(carol)
    const biz = await createBusiness(carol)
    await asUser(carol, (q) =>
      q("update public.founder_profiles set current_business_id = $1", [biz])
    )
    await asUser(carol, (q) => q("select public.delete_my_account()"))
    const { rows } = await rawDb().query(
      `select
         (select count(*) from public.founder_profiles where user_id = $1)::int as profiles,
         (select count(*) from public.businesses where user_id = $1)::int as businesses`,
      [carol]
    )
    expect(rows[0]).toEqual({ profiles: 0, businesses: 0 })
  })
})
