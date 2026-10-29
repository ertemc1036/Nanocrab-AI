#!/usr/bin/env node
// Checks that the Supabase project configured in .env.local has everything this
// app needs. Uses only the public publishable key (the same one the browser
// gets) and never prints key values.
//
//   npm run supabase:check
import { existsSync, readFileSync } from "node:fs"

function loadEnvFile(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2")
  }
  return out
}

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local"), ...process.env }
const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "")
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const TABLES = [
  "profiles",
  "agents",
  "agent_memories",
  "conversations",
  "messages",
  "usage_events",
  "founder_profiles",
  "businesses",
  "business_plans",
  "business_tasks",
  "business_milestones",
  "founder_memories",
  "ai_proposals",
  "revenue_records",
  "ai_role_transitions",
]
// Parameter names must match, or PostgREST reports the function as missing.
// Values are null: anonymous callers are denied before anything runs.
const FUNCTIONS = {
  delete_my_account: {},
  begin_ai_request: Object.fromEntries(
    [
      "p_kind",
      "p_provider",
      "p_model",
      "p_reserved_cost_micros",
      "p_business_id",
      "p_conversation_id",
      "p_limit_per_minute",
      "p_limit_per_day",
      "p_monthly_limit_micros",
      "p_global_daily_limit_micros",
    ].map((k) => [k, null])
  ),
  finish_ai_request: Object.fromEntries(
    [
      "p_request_id",
      "p_status",
      "p_input_tokens",
      "p_output_tokens",
      "p_cost_micros",
    ].map((k) => [k, null])
  ),
  create_plan_version: Object.fromEntries(
    ["p_business_id", "p_sections", "p_status", "p_source", "p_note"].map((k) => [
      k,
      null,
    ])
  ),
  activate_plan_version: { p_plan_id: null },
  switch_operating_mode: Object.fromEntries(
    ["p_business_id", "p_to_mode", "p_reason", "p_revenue_record_id"].map((k) => [
      k,
      null,
    ])
  ),
}

const ok = (msg) => console.log(`  ✓ ${msg}`)
const bad = (msg) => console.log(`  ✗ ${msg}`)
const warn = (msg) => console.log(`  ! ${msg}`)
let problems = 0

if (!url || !key) {
  console.log("Supabase is not configured.")
  bad(
    "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local"
  )
  process.exit(1)
}
console.log(`Supabase project: ${new URL(url).host}`)
console.log(
  `Key: ${key.startsWith("sb_publishable_") ? "publishable key" : "legacy anon key"} (value not shown)`
)
if (
  key.startsWith("sb_secret_") ||
  /service_role/.test(Buffer.from(key.split(".")[1] ?? "", "base64").toString())
) {
  bad(
    "This looks like a SECRET / service-role key. Never use it in NEXT_PUBLIC_ variables."
  )
  process.exit(1)
}

const headers = { apikey: key }
async function call(path, init = {}) {
  try {
    const res = await fetch(`${url}${path}`, {
      ...init,
      headers: { ...headers, ...init.headers },
    })
    let body = null
    try {
      body = await res.json()
    } catch {}
    return { status: res.status, body }
  } catch (error) {
    return { status: 0, body: { message: error.message } }
  }
}

console.log("\nAuth")
const settings = await call("/auth/v1/settings")
if (settings.status === 200) {
  ok("Auth API reachable and key accepted")
  ok(`Email sign-in ${settings.body?.external?.email ? "enabled" : "DISABLED"}`)
  ok(
    `Email confirmation ${settings.body?.mailer_autoconfirm ? "off (users are signed in immediately)" : "required"}`
  )
  if (settings.body?.disable_signup) warn("Sign-ups are disabled in this project")
} else {
  problems++
  bad(`Auth API returned ${settings.status} — check the URL and key`)
}

console.log("\nTables (migrations in supabase/migrations)")
for (const table of TABLES) {
  const r = await call(`/rest/v1/${table}?select=*&limit=1`)
  const code = r.body?.code
  if (code === "PGRST205" || code === "42P01") {
    problems++
    bad(`${table}: missing`)
  } else if (r.status === 401 || r.status === 403 || code === "42501") {
    ok(`${table}: exists (anonymous access denied, as expected)`)
  } else if (r.status === 200) {
    problems++
    warn(
      `${table}: exists but is READABLE WITHOUT SIGNING IN — re-apply the migrations' grants/RLS`
    )
  } else {
    problems++
    bad(`${table}: unexpected response ${r.status} ${code ?? ""}`)
  }
}

console.log("\nFunctions")
for (const [fn, args] of Object.entries(FUNCTIONS)) {
  const r = await call(`/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args),
  })
  const code = r.body?.code
  if (code === "PGRST202" || code === "42883") {
    problems++
    bad(`${fn}: missing`)
  } else if (r.status === 401 || r.status === 403 || code === "42501") {
    ok(`${fn}: exists (anonymous access denied, as expected)`)
  } else {
    problems++
    warn(
      `${fn}: unexpected response ${r.status} ${code ?? ""} — anonymous callers may have access`
    )
  }
}

console.log(
  problems === 0
    ? "\nAll checks passed."
    : `\n${problems} problem(s) found. Apply the migrations in order (see docs/SUPABASE_SETUP.md), then re-run.`
)
process.exit(problems === 0 ? 0 : 1)
