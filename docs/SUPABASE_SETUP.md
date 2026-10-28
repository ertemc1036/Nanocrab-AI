# Supabase setup

Follow these steps once per environment (local development, staging,
production). Nothing here requires a service-role key: the app only uses the
public **publishable** key, and all data access goes through Row Level Security.

## 1. Create a project

1. Create a project at <https://supabase.com/dashboard>.
2. **Project Settings → API**: copy the **Project URL** and the **publishable
   key** (`sb_publishable_…`; older projects call it the `anon` key).

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

| Variable                               | Example                    | Notes                                       |
| -------------------------------------- | -------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | `https://abcd.supabase.co` | Project URL                                 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…`         | Publishable/anon key. Safe for the browser. |
| `NEXT_PUBLIC_SITE_URL`                 | `http://localhost:3000`    | Base URL used in auth email links           |

`.env.local` is git-ignored. **Never** put the service-role key or a secret key
in any `NEXT_PUBLIC_` variable; the app does not need one.

`NEXT_PUBLIC_*` values are inlined at build time, so rebuild/restart after
changing them.

## 3. Apply the database migrations

Migrations live in `supabase/migrations/` and must be applied in filename order.

**Option A — Supabase CLI (recommended):**

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**Option B — SQL editor:** open **SQL Editor** in the dashboard and run each
file in `supabase/migrations/` in order.

Afterwards, check **Database → Tables**: `profiles`, `agents`,
`agent_memories`, `conversations`, `messages` and `usage_events` should all
show **RLS enabled**.

## 4. Configure Authentication

**Authentication → URL Configuration**

- **Site URL**: your app's URL (`http://localhost:3000` for local dev).
- **Redirect URLs**: add `http://localhost:3000/**` and your production URL
  followed by `/**`.

**Authentication → Sign In / Providers → Email**

- Keep **Email** enabled.
- **Confirm email**: recommended **on** for production. When off, users are
  signed in immediately after sign-up.
- **Minimum password length**: 8 (the app also enforces letters + numbers).
- Consider enabling **leaked password protection** (paid plans).

**Authentication → Emails → Templates** (recommended: makes links work even
when opened on a different device/browser than the one that requested them)

- **Confirm signup** — set the link to:
  ```
  {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard
  ```
- **Reset password** — set the link to:
  ```
  {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
  ```

The default templates also work (the app handles the `?code=` PKCE flow), but
only in the same browser that started the sign-up or reset.

**Authentication → Rate Limits**: review the defaults for sign-ups, sign-ins
and emails. These are NanoCrab's rate limiting for auth endpoints.

**SMTP**: the built-in email service is heavily rate limited and meant for
testing. Configure a custom SMTP provider before inviting real users.

## 5. Run and verify

```bash
npm run dev
```

Then work through the live checklist in [SECURITY.md](./SECURITY.md#live-verification-checklist).

## 6. Keep types in sync

`src/lib/supabase/database.types.ts` mirrors the schema. After changing a
migration, regenerate it:

```bash
npx supabase gen types typescript --project-id <your-project-ref> > src/lib/supabase/database.types.ts
```

`npm run test:db` fails if the file drifts from the migrated schema.
