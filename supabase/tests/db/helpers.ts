/** Shared helpers for the database security tests (see rls.test.ts). */
import { randomUUID } from "node:crypto"

import { Client, type QueryResultRow } from "pg"
import { expect } from "vitest"

export const DATABASE_URL = process.env.DATABASE_URL

type Role = "anon" | "authenticated"

let db: Client

export async function connectDb() {
  db = new Client({ connectionString: DATABASE_URL })
  await db.connect()
  return db
}

export async function disconnectDb() {
  await db?.end()
}

/** Raw superuser connection (bypasses RLS) for setup and assertions. */
export const rawDb = () => db

/** Runs `fn` in a transaction as the given role, with `sub` as the JWT subject. */
export async function as<T>(
  role: Role,
  sub: string | null,
  fn: (
    q: <R extends QueryResultRow>(sql: string, params?: unknown[]) => Promise<R[]>
  ) => Promise<T>
): Promise<T> {
  await db.query("begin")
  try {
    await db.query(`set local role ${role}`)
    await db.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify(sub ? { sub, role } : { role }),
    ])
    const result = await fn(async (sql, params) => (await db.query(sql, params)).rows)
    await db.query("commit")
    return result
  } catch (error) {
    await db.query("rollback")
    throw error
  }
}

export const asUser = <T>(userId: string, fn: Parameters<typeof as<T>>[2]): Promise<T> =>
  as("authenticated", userId, fn)

/** Expects the promise to fail with the given Postgres SQLSTATE code. */
export async function expectPgError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code })
}

export async function createAuthUser(displayName?: string): Promise<string> {
  const id = randomUUID()
  await db.query(
    "insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)",
    [
      id,
      `${id}@example.test`,
      JSON.stringify(displayName ? { display_name: displayName } : {}),
    ]
  )
  return id
}

export async function createAgent(userId: string, name = "Test Agent"): Promise<string> {
  const rows = await asUser(userId, (q) =>
    q<{ id: string }>("insert into public.agents (name) values ($1) returning id", [name])
  )
  return rows[0]!.id
}

export async function createConversation(
  userId: string,
  agentId: string
): Promise<string> {
  const rows = await asUser(userId, (q) =>
    q<{ id: string }>(
      "insert into public.conversations (user_id, agent_id) values ($1, $2) returning id",
      [userId, agentId]
    )
  )
  return rows[0]!.id
}

export const USER_TABLES = [
  "profiles",
  "agents",
  "agent_memories",
  "conversations",
  "messages",
  "usage_events",
  "businesses",
  "founder_profiles",
] as const
