/**
 * Database security tests for the Supabase migrations.
 *
 * These run the real migrations on PostgreSQL and execute queries as the
 * `anon` / `authenticated` roles with a simulated JWT `sub` claim — the same
 * mechanism Supabase's PostgREST uses — so Row Level Security, column grants
 * and foreign keys are evaluated exactly as in production.
 *
 * Run with `npm run test:db`.
 */
import { randomUUID } from "node:crypto"

import { Client } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  as,
  asUser,
  connectDb,
  createAgent,
  createAuthUser,
  createConversation,
  DATABASE_URL,
  disconnectDb,
  expectPgError,
  rawDb,
  USER_TABLES,
} from "./helpers"

describe.skipIf(!DATABASE_URL)("database security (RLS, grants, ownership)", () => {
  let alice: string
  let bob: string

  beforeAll(async () => {
    await connectDb()
    alice = await createAuthUser("  Alice  ")
    bob = await createAuthUser("Bob")
  })

  afterAll(async () => {
    await disconnectDb()
  })

  describe("schema hardening", () => {
    it("enables row level security on every user-data table", async () => {
      const { rows } = await rawDb().query<{ relname: string; relrowsecurity: boolean }>(
        `select c.relname, c.relrowsecurity from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind = 'r'`
      )
      const tables = new Map(rows.map((r) => [r.relname, r.relrowsecurity]))
      for (const table of USER_TABLES) {
        expect(tables.get(table), table).toBe(true)
      }
      // Every public table must be one we know about and protect.
      expect([...tables.keys()].sort()).toEqual([...USER_TABLES].sort())
    })

    it.each(USER_TABLES)("denies the anon role all access to %s", async (table) => {
      await expectPgError(
        as("anon", null, (q) => q(`select * from public.${table}`)),
        "42501"
      )
    })

    it("returns nothing to an authenticated role without a user id", async () => {
      await createAgent(alice)
      const rows = await as("authenticated", null, (q) =>
        q("select * from public.agents")
      )
      expect(rows).toHaveLength(0)
      await expectPgError(
        as("authenticated", null, (q) =>
          q("insert into public.agents (name) values ('x')")
        ),
        "42501"
      )
    })
  })

  describe("profiles", () => {
    it("creates a profile with a trimmed display name on sign-up", async () => {
      const rows = await asUser(alice, (q) =>
        q<{ display_name: string; plan: string }>(
          "select display_name, plan from public.profiles"
        )
      )
      expect(rows).toEqual([{ display_name: "Alice", plan: "free" }])
    })

    it("only exposes the caller's own profile", async () => {
      const rows = await asUser(alice, (q) =>
        q<{ id: string }>("select id from public.profiles")
      )
      expect(rows.map((r) => r.id)).toEqual([alice])
    })

    it("lets the owner update their display name", async () => {
      await asUser(alice, (q) =>
        q("update public.profiles set display_name = 'Alice B' where id = $1", [alice])
      )
      const { rows } = await rawDb().query(
        "select display_name from public.profiles where id = $1",
        [alice]
      )
      expect(rows[0].display_name).toBe("Alice B")
    })

    it("does not let a user change their plan", async () => {
      await expectPgError(
        asUser(alice, (q) =>
          q("update public.profiles set plan = 'free' where id = $1", [alice])
        ),
        "42501"
      )
    })

    it("silently ignores updates to another user's profile", async () => {
      const rows = await asUser(alice, (q) =>
        q(
          "update public.profiles set display_name = 'pwned' where id = $1 returning id",
          [bob]
        )
      )
      expect(rows).toHaveLength(0)
      const { rows: bobRows } = await rawDb().query(
        "select display_name from public.profiles where id = $1",
        [bob]
      )
      expect(bobRows[0].display_name).toBe("Bob")
    })

    it("does not let users insert or delete profiles directly", async () => {
      await expectPgError(
        asUser(alice, (q) =>
          q("insert into public.profiles (id) values ($1)", [randomUUID()])
        ),
        "42501"
      )
      await expectPgError(
        asUser(alice, (q) => q("delete from public.profiles where id = $1", [alice])),
        "42501"
      )
    })
  })

  describe("profile backfill migration", () => {
    it("creates missing profiles for pre-existing users and is idempotent", async () => {
      const { readFile } = await import("node:fs/promises")
      const sql = await readFile(
        "supabase/migrations/20261030000100_backfill_profiles.sql",
        "utf8"
      )
      const legacy = await createAuthUser("  Legacy User  ")
      // Simulate an account created before the sign-up trigger existed.
      await rawDb().query("delete from public.profiles where id = $1", [legacy])
      await rawDb().query(sql)
      await rawDb().query(sql)
      const { rows } = await rawDb().query(
        "select display_name from public.profiles where id = $1",
        [legacy]
      )
      expect(rows).toEqual([{ display_name: "Legacy User" }])
      // Existing profiles are left untouched.
      const { rows: alice_ } = await rawDb().query(
        "select display_name from public.profiles where id = $1",
        [alice]
      )
      expect(alice_[0].display_name).toBe("Alice B")
    })
  })

  describe("agents", () => {
    it("defaults user_id to the caller", async () => {
      const id = await createAgent(alice, "Default Owner")
      const { rows } = await rawDb().query(
        "select user_id from public.agents where id = $1",
        [id]
      )
      expect(rows[0].user_id).toBe(alice)
    })

    it("hides other users' agents", async () => {
      const id = await createAgent(alice, "Private")
      const rows = await asUser(bob, (q) =>
        q("select * from public.agents where id = $1", [id])
      )
      expect(rows).toHaveLength(0)
    })

    it("prevents updating or deleting another user's agent", async () => {
      const id = await createAgent(alice, "Mine")
      const updated = await asUser(bob, (q) =>
        q("update public.agents set name = 'Stolen' where id = $1 returning id", [id])
      )
      const deleted = await asUser(bob, (q) =>
        q("delete from public.agents where id = $1 returning id", [id])
      )
      expect(updated).toHaveLength(0)
      expect(deleted).toHaveLength(0)
      const { rows } = await rawDb().query(
        "select name from public.agents where id = $1",
        [id]
      )
      expect(rows[0].name).toBe("Mine")
    })

    it("prevents creating an agent on behalf of another user", async () => {
      await expectPgError(
        asUser(bob, (q) =>
          q("insert into public.agents (user_id, name) values ($1, 'Spoof')", [alice])
        ),
        "42501"
      )
    })

    it("prevents transferring an agent to another user", async () => {
      const id = await createAgent(alice)
      await expectPgError(
        asUser(alice, (q) =>
          q("update public.agents set user_id = $1 where id = $2", [bob, id])
        ),
        "42501"
      )
    })

    it("lets the owner update and delete their agent", async () => {
      const id = await createAgent(alice, "Editable")
      await asUser(alice, (q) =>
        q("update public.agents set name = 'Edited' where id = $1", [id])
      )
      const deleted = await asUser(alice, (q) =>
        q("delete from public.agents where id = $1 returning id", [id])
      )
      expect(deleted).toHaveLength(1)
    })

    it("enforces field length constraints", async () => {
      await expectPgError(
        asUser(alice, (q) => q("insert into public.agents (name) values ('   ')")),
        "23514"
      )
      await expectPgError(
        asUser(alice, (q) =>
          q("insert into public.agents (name, instructions) values ('x', $1)", [
            "a".repeat(8001),
          ])
        ),
        "23514"
      )
    })
  })

  describe("agent memories", () => {
    it("lets the owner manage memories for their agent", async () => {
      const agentId = await createAgent(alice)
      const rows = await asUser(alice, (q) =>
        q<{ id: string }>(
          "insert into public.agent_memories (user_id, agent_id, content) values ($1, $2, 'Likes tea') returning id",
          [alice, agentId]
        )
      )
      const memoryId = rows[0]!.id
      await asUser(alice, (q) =>
        q("update public.agent_memories set pinned = true where id = $1", [memoryId])
      )
      const own = await asUser(alice, (q) =>
        q("select id from public.agent_memories where agent_id = $1", [agentId])
      )
      expect(own).toHaveLength(1)
    })

    it("prevents attaching a memory to another user's agent", async () => {
      const aliceAgent = await createAgent(alice)
      // Owned by Bob but pointing at Alice's agent: composite FK rejects it.
      await expectPgError(
        asUser(bob, (q) =>
          q(
            "insert into public.agent_memories (user_id, agent_id, content) values ($1, $2, 'x')",
            [bob, aliceAgent]
          )
        ),
        "23503"
      )
      // Claiming to be Alice: RLS rejects it.
      await expectPgError(
        asUser(bob, (q) =>
          q(
            "insert into public.agent_memories (user_id, agent_id, content) values ($1, $2, 'x')",
            [alice, aliceAgent]
          )
        ),
        "42501"
      )
    })

    it("hides other users' memories", async () => {
      const agentId = await createAgent(alice)
      await asUser(alice, (q) =>
        q("insert into public.agent_memories (agent_id, content) values ($1, 'secret')", [
          agentId,
        ])
      )
      const rows = await asUser(bob, (q) =>
        q("select * from public.agent_memories where agent_id = $1", [agentId])
      )
      expect(rows).toHaveLength(0)
    })
  })

  describe("conversations and messages", () => {
    it("prevents starting a conversation with another user's agent", async () => {
      const aliceAgent = await createAgent(alice)
      await expectPgError(
        asUser(bob, (q) =>
          q("insert into public.conversations (user_id, agent_id) values ($1, $2)", [
            bob,
            aliceAgent,
          ])
        ),
        "23503"
      )
    })

    it("prevents posting into another user's conversation", async () => {
      const agentId = await createAgent(alice)
      const conversationId = await createConversation(alice, agentId)
      await expectPgError(
        asUser(bob, (q) =>
          q(
            "insert into public.messages (user_id, conversation_id, role, content) values ($1, $2, 'user', 'hi')",
            [bob, conversationId]
          )
        ),
        "23503"
      )
    })

    it("hides other users' conversations and messages", async () => {
      const agentId = await createAgent(alice)
      const conversationId = await createConversation(alice, agentId)
      await asUser(alice, (q) =>
        q(
          "insert into public.messages (user_id, conversation_id, role, content) values ($1, $2, 'user', 'private')",
          [alice, conversationId]
        )
      )
      const conversations = await asUser(bob, (q) =>
        q("select * from public.conversations where id = $1", [conversationId])
      )
      const messages = await asUser(bob, (q) =>
        q("select * from public.messages where conversation_id = $1", [conversationId])
      )
      expect(conversations).toHaveLength(0)
      expect(messages).toHaveLength(0)
    })

    it("treats messages as append-only for users", async () => {
      const agentId = await createAgent(alice)
      const conversationId = await createConversation(alice, agentId)
      await asUser(alice, (q) =>
        q(
          "insert into public.messages (user_id, conversation_id, role, content) values ($1, $2, 'user', 'hi')",
          [alice, conversationId]
        )
      )
      await expectPgError(
        asUser(alice, (q) => q("update public.messages set content = 'edited'")),
        "42501"
      )
      await expectPgError(
        asUser(alice, (q) => q("delete from public.messages")),
        "42501"
      )
    })

    it("rejects invalid message roles", async () => {
      const agentId = await createAgent(alice)
      const conversationId = await createConversation(alice, agentId)
      await expectPgError(
        asUser(alice, (q) =>
          q(
            "insert into public.messages (user_id, conversation_id, role, content) values ($1, $2, 'system', 'x')",
            [alice, conversationId]
          )
        ),
        "23514"
      )
    })

    it("cascades agent deletion to its conversations, messages and memories", async () => {
      const agentId = await createAgent(alice)
      const conversationId = await createConversation(alice, agentId)
      await asUser(alice, async (q) => {
        await q(
          "insert into public.messages (user_id, conversation_id, role, content) values ($1, $2, 'user', 'hi')",
          [alice, conversationId]
        )
        await q(
          "insert into public.agent_memories (agent_id, content) values ($1, 'note')",
          [agentId]
        )
        await q("delete from public.agents where id = $1", [agentId])
      })
      const { rows } = await rawDb().query(
        `select
           (select count(*) from public.conversations where agent_id = $1)::int as conversations,
           (select count(*) from public.messages where conversation_id = $2)::int as messages,
           (select count(*) from public.agent_memories where agent_id = $1)::int as memories`,
        [agentId, conversationId]
      )
      expect(rows[0]).toEqual({ conversations: 0, messages: 0, memories: 0 })
    })
  })

  describe("usage events", () => {
    it("does not let users write usage events directly", async () => {
      await expectPgError(
        asUser(alice, (q) =>
          q(
            "insert into public.usage_events (user_id, event_type, provider, model) values ($1, 'chat_completion', 'anthropic', 'm')",
            [alice]
          )
        ),
        "42501"
      )
    })

    it("records usage for the caller through record_usage_event", async () => {
      const agentId = await createAgent(alice)
      await asUser(alice, (q) =>
        q(
          "select public.record_usage_event('chat_completion', 'anthropic', 'm', 10, 20, $1)",
          [agentId]
        )
      )
      const own = await asUser(alice, (q) =>
        q<{ user_id: string; input_tokens: number }>(
          "select user_id, input_tokens from public.usage_events where agent_id = $1",
          [agentId]
        )
      )
      expect(own).toEqual([{ user_id: alice, input_tokens: 10 }])
      const others = await asUser(bob, (q) => q("select * from public.usage_events"))
      expect(others).toHaveLength(0)
    })

    it("rejects usage that references another user's agent", async () => {
      const aliceAgent = await createAgent(alice)
      await expectPgError(
        asUser(bob, (q) =>
          q(
            "select public.record_usage_event('chat_completion', 'anthropic', 'm', 1, 1, $1)",
            [aliceAgent]
          )
        ),
        "42501"
      )
    })

    it("rejects negative token counts", async () => {
      await expectPgError(
        asUser(alice, (q) =>
          q(
            "select public.record_usage_event('chat_completion', 'anthropic', 'm', -5, 0)"
          )
        ),
        "23514"
      )
    })

    it("does not let anon record usage", async () => {
      await expectPgError(
        as("anon", null, (q) =>
          q("select public.record_usage_event('chat_completion', 'anthropic', 'm', 1, 1)")
        ),
        "42501"
      )
    })
  })

  describe("account deletion", () => {
    it("does not let anon call delete_my_account", async () => {
      await expectPgError(
        as("anon", null, (q) => q("select public.delete_my_account()")),
        "42501"
      )
    })

    it("deletes only the caller's account and data", async () => {
      const carol = await createAuthUser("Carol")
      const carolAgent = await createAgent(carol)
      await createConversation(carol, carolAgent)
      const bobAgent = await createAgent(bob)

      await asUser(carol, (q) => q("select public.delete_my_account()"))

      const { rows } = await rawDb().query(
        `select
           (select count(*) from auth.users where id = $1)::int as users,
           (select count(*) from public.profiles where id = $1)::int as profiles,
           (select count(*) from public.agents where user_id = $1)::int as agents,
           (select count(*) from public.conversations where user_id = $1)::int as conversations,
           (select count(*) from public.agents where id = $2)::int as bob_agent`,
        [carol, bobAgent]
      )
      expect(rows[0]).toEqual({
        users: 0,
        profiles: 0,
        agents: 0,
        conversations: 0,
        bob_agent: 1,
      })
    })
  })
})

describe.skipIf(!DATABASE_URL)("generated types", () => {
  it("database.types.ts matches the migrated schema", async () => {
    const { readFile } = await import("node:fs/promises")
    const source = await readFile("src/lib/supabase/database.types.ts", "utf8")
    const client = new Client({ connectionString: DATABASE_URL })
    await client.connect()
    try {
      for (const table of USER_TABLES) {
        const block = new RegExp(
          `\\n      ${table}: \\{\\n        Row: \\{([^}]*)\\}`
        ).exec(source)
        expect(block, `Row type for ${table}`).not.toBeNull()
        const typed = [...block![1]!.matchAll(/^\s+(\w+):/gm)].map((m) => m[1]).sort()
        const { rows } = await client.query<{ column_name: string }>(
          `select column_name from information_schema.columns
           where table_schema = 'public' and table_name = $1`,
          [table]
        )
        expect(typed, table).toEqual(rows.map((r) => r.column_name).sort())
      }
    } finally {
      await client.end()
    }
  })
})
