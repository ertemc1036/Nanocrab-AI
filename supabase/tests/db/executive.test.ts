/**
 * Executive CEO Mode V2: leadership settings and executive task fields.
 * Run with `npm run test:db`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  asUser,
  connectDb,
  createAuthUser,
  DATABASE_URL,
  disconnectDb,
  expectPgError,
  rawDb,
} from "./helpers"

describe.skipIf(!DATABASE_URL)("executive CEO settings and tasks", () => {
  let alice: string
  let bob: string
  let bobBiz: string

  beforeAll(async () => {
    await connectDb()
    alice = await createAuthUser("Alice")
    bob = await createAuthUser("Bob")
    for (const u of [alice, bob]) {
      await asUser(u, (q) =>
        q("insert into public.founder_profiles (goal) values ('explore')")
      )
    }
    const rows = await asUser(bob, (q) =>
      q<{ id: string }>(
        "insert into public.businesses (name) values ('DropTap') returning id"
      )
    )
    bobBiz = rows[0]!.id
  })

  afterAll(async () => {
    await disconnectDb()
  })

  it("defaults existing and new founders to Standard style with no language preference", async () => {
    const rows = await asUser(alice, (q) =>
      q("select leadership_style, preferred_language from public.founder_profiles")
    )
    expect(rows).toEqual([{ leadership_style: "standard", preferred_language: null }])
  })

  it("persists the founder's own leadership style and language", async () => {
    await asUser(alice, (q) =>
      q(
        "update public.founder_profiles set leadership_style = 'executive', preferred_language = 'de'"
      )
    )
    const { rows } = await rawDb().query(
      "select leadership_style, preferred_language from public.founder_profiles where user_id = $1",
      [alice]
    )
    expect(rows[0]).toEqual({ leadership_style: "executive", preferred_language: "de" })
  })

  it("rejects unknown styles and languages", async () => {
    await expectPgError(
      asUser(alice, (q) =>
        q("update public.founder_profiles set leadership_style = 'tyrant'")
      ),
      "23514"
    )
    await expectPgError(
      asUser(alice, (q) =>
        q("update public.founder_profiles set preferred_language = 'xx'")
      ),
      "23514"
    )
  })

  it("can't change another founder's settings", async () => {
    const rows = await asUser(alice, (q) =>
      q(
        "update public.founder_profiles set leadership_style = 'executive' where user_id = $1 returning user_id",
        [bob]
      )
    )
    expect(rows).toHaveLength(0)
    const { rows: bobRows } = await rawDb().query(
      "select leadership_style from public.founder_profiles where user_id = $1",
      [bob]
    )
    expect(bobRows[0].leadership_style).toBe("standard")
  })

  it("stores executive task fields and keeps them private", async () => {
    const rows = await asUser(bob, (q) =>
      q<{ id: string }>(
        `insert into public.business_tasks (user_id, business_id, title, success_criteria, deliverable)
         values ($1, $2, 'Call 10 shops', '3 shops agree to a trial', 'List of interested shops') returning id`,
        [bob, bobBiz]
      )
    )
    const id = rows[0]!.id
    await asUser(bob, (q) =>
      q(
        "update public.business_tasks set blocked_reason = 'No phone numbers yet' where id = $1",
        [id]
      )
    )
    const theirs = await asUser(alice, (q) =>
      q("select * from public.business_tasks where id = $1", [id])
    )
    const updated = await asUser(alice, (q) =>
      q(
        "update public.business_tasks set blocked_reason = '' where id = $1 returning id",
        [id]
      )
    )
    expect(theirs).toHaveLength(0)
    expect(updated).toHaveLength(0)
  })

  it("caps executive task field lengths", async () => {
    await expectPgError(
      asUser(bob, (q) =>
        q(
          "insert into public.business_tasks (user_id, business_id, title, deliverable) values ($1, $2, 'x', $3)",
          [bob, bobBiz, "d".repeat(501)]
        )
      ),
      "23514"
    )
  })
})
