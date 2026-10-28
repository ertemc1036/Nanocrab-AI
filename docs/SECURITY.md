# Security model

NanoCrab AI treats user isolation as a database guarantee, not just an
application convention. There are three independent layers:

| Layer                | Where                   | What it does                                                                                                                                                                                                  |
| -------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Proxy             | `src/proxy.ts`          | Refreshes the session cookie; redirects signed-out visitors away from private pages. Optimistic only — never trusted for authorization. Fails closed if Supabase isn't configured.                            |
| 2. Data Access Layer | `src/lib/dal/*`         | The only code that reads/writes user data. Every function calls `requireUser()`, which verifies the JWT with `getClaims()`, and filters by the verified user id. Server Actions and pages call it themselves. |
| 3. Database          | `supabase/migrations/*` | RLS on every table, minimal grants, composite foreign keys that make cross-user references impossible.                                                                                                        |

## Database guarantees

- **RLS is enabled on every table** in `public`; all policies are scoped
  `to authenticated` and require `user_id = auth.uid()`.
- **`anon` has no privileges** on any user-data table. Supabase's default
  broad grants are explicitly revoked.
- **Column-level grants**: users can only update the columns the app edits.
  `user_id`, `id`, timestamps and `profiles.plan` are not writable, so rows
  can't be transferred and plans can't be self-upgraded.
- **Composite foreign keys** — e.g. `conversations(agent_id, user_id) →
agents(id, user_id)` — mean a row can never reference another user's agent
  or conversation, even though FK checks bypass RLS.
- **Messages are append-only** for users (no update/delete grant); they're
  removed with their conversation.
- **`usage_events` is read-only** for users. Usage is recorded through
  `record_usage_event()` (`security definer`), which pins `user_id` to
  `auth.uid()` and validates referenced agents/conversations.
- **Account deletion** uses `delete_my_account()` (`security definer`),
  which can only delete the caller's own auth user; everything cascades.
- **No service-role key** is used anywhere in the app.
- **Founder data (Stage 1)**: `founder_profiles` and `businesses` follow the
  same model. `businesses.operating_mode` has no insert/update grant, so mode
  changes can only happen through a future audited function (Stage 4).
  `founder_profiles.current_business_id` uses a composite FK, so it can only
  point at the founder's own business, and is cleared (not cascaded) if that
  business is deleted. The onboarding schema stores no sensitive identifiers
  (no address, birth date or ID numbers); budget is optional and stored only
  as the founder entered it.

## Application guarantees

- All form input is validated server-side with Zod (`src/lib/validation`).
- Post-auth redirects are restricted to same-origin paths
  (`safeRedirectPath`), preventing open redirects.
- Sign-up and password-reset responses don't reveal whether an email is
  registered.
- Changing a password requires the current password.
- Supabase errors are mapped to generic messages; internals aren't shown.
  Database errors are logged server-side with code + message only.
- Security headers (HSTS, `X-Frame-Options: DENY`, `nosniff`,
  Referrer-Policy, Permissions-Policy) are set in `next.config.ts`.
- Auth endpoint rate limiting is provided by Supabase Auth (configure under
  **Authentication → Rate Limits**). Per-user AI request limits arrive in
  Phase 4–5, backed by `usage_events`.

## Automated tests

| Command           | What it covers                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`        | Validation rules, open-redirect protection, route classification, proxy redirects (signed in/out, fail-closed), auth & settings Server Actions (Supabase mocked), email-link confirmation route, error mapping.                                                                                                                                                                                                                     |
| `npm run test:db` | Applies the real migrations to a throwaway PostgreSQL and runs RLS/grant/ownership tests as the `anon` and `authenticated` roles with simulated JWTs: cross-user read/write/delete attempts, spoofed `user_id`, cross-user foreign keys, column privileges, usage ledger, account deletion, cascades, type drift, and founder profile / business isolation (including the read-only operating mode and current-business ownership). |

`test:db` uses a small stand-in for Supabase's `auth` schema
(`supabase/tests/db/supabase-shim.sql`) that mirrors Supabase's default
grants, so the tests prove our revokes work. It is **not** a substitute for
verifying against a real Supabase project.

## Live verification checklist

These checks need a real Supabase project and have **not** been performed yet.
Run them after completing [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

**Authentication**

- [ ] Sign up with a new email → confirmation email arrives → link lands on
      `/dashboard` signed in, and the name appears in the sidebar.
- [ ] Sign up again with the same email → same "check your email" message
      (no enumeration).
- [ ] Log out → `/dashboard` redirects to `/login?next=%2Fdashboard`.
- [ ] Log in with a wrong password → "Incorrect email or password."
- [ ] Log in from `/login?next=/settings` → lands on `/settings`.
- [ ] Forgot password → email arrives → link opens `/reset-password` → new
      password works; old one doesn't.
- [ ] Open an already-used or expired link → `/login` shows the expired-link
      message.
- [ ] Settings: change display name → sidebar updates. Change password with a
      wrong current password → rejected.
- [ ] Delete account → redirected to `/`; logging in again fails; rows are
      gone from all tables.
- [ ] Session survives a browser restart and refreshes after the access token
      expires (default 1 hour).

**Data isolation** (two accounts, A and B; use the browser console or a
REST client with each user's access token and the publishable key)

- [ ] As B, `GET /rest/v1/profiles` returns only B's profile.
- [ ] As B, `PATCH /rest/v1/profiles?id=eq.<A>` changes nothing.
- [ ] As B, `PATCH /rest/v1/profiles?id=eq.<B>` with `{"plan":"pro"}` is
      rejected (permission denied).
- [ ] With only the publishable key (no user token), `GET /rest/v1/agents`
      is rejected.
- [ ] Dashboard → **Database → Tables** shows RLS enabled on all six tables,
      and **Advisors → Security Advisor** reports no RLS warnings.

**Founder workspace (Stage 1)**

- [ ] New account → after confirming email, `/dashboard` redirects to
      `/onboarding`.
- [ ] Complete onboarding skipping several questions → Command Center shows
      the profile milestone done and the skipped items as unknown on My
      Business.
- [ ] Edit the founder profile from Settings → answers are pre-filled and
      changes persist.
- [ ] Create and rename a business → it appears as the current business.
- [ ] As B, `PATCH /rest/v1/businesses?id=eq.<A's business>` changes nothing;
      `PATCH` of B's own business with `{"operating_mode":"cofounder"}` is
      rejected.
- [ ] As B, `PATCH /rest/v1/founder_profiles` with A's business id as
      `current_business_id` is rejected.

Agent/conversation/memory isolation becomes testable through the UI in
Phases 3–5; it's already covered at the database level by `npm run test:db`.
