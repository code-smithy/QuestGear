# QuestGear Production Configuration

This checklist documents the production settings required for the static GitHub
Pages frontend and Supabase backend. It intentionally lists only public frontend
variables in GitHub Actions; private keys stay in Supabase or local operator
tools.

## GitHub Pages

Configure the repository for GitHub Pages deployment from GitHub Actions.

Required repository or environment variables:

```text
VITE_SUPABASE_URL=https://<supabase-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<public publishable or anon key>
VITE_SITE_URL=https://<account>.github.io/<repository>/
VITE_BASE_PATH=/<repository>/
```

For a custom domain, set:

```text
VITE_SITE_URL=https://<custom-domain>/
VITE_BASE_PATH=/
```

The workflow in `.github/workflows/pages.yml` runs typecheck, lint, unit tests,
and the production build before publishing `dist`.

## Supabase Auth

Configure Discord as the only MVP auth provider.

- Discord redirect URL:
  `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
- Supabase Site URL:
  `https://<account>.github.io/<repository>/`
- Supabase additional redirect URLs:
  `https://<account>.github.io/<repository>/`
  and `http://localhost:5173/`
- Store the Discord client secret only in Supabase provider settings.

The frontend calls Supabase OAuth with `redirectTo` set from `VITE_SITE_URL`.

## Supabase Database

Apply migrations in order from `supabase/migrations`.

Before release, verify RLS is enabled and tested for:

- `profiles` and `profile_locations`
- `items`, `item_photos`, `item_contents`, `item_damage`,
  `item_unavailable_periods`
- `loans`, `loan_items`, `loan_date_proposals`,
  `loan_condition_reports`, `loan_events`
- `notifications`
- `reviews`, `reliability_events`, `reliability_scores`

Trusted state transitions must remain in Postgres functions or Edge Functions.
The browser must not directly write loan status, agreed dates, completion
timestamps, review visibility, reliability events, or reliability scores.

## Supabase Storage

Create and verify these buckets and policies:

- `item-photos`: authenticated reads for visible items, owner-scoped writes.
- `profile-photos`: authenticated reads, owner-scoped writes.
- `loan-evidence`: private reads for loan parties only.

Upload tests should cover desktop and mobile browser photo selection before
release.

## Scheduled Jobs

Schedule `process_due_notifications` at least hourly with Supabase Cron.

The job must be idempotent for reminder, due-time, overdue, and reliability
penalty events by using deterministic deduplication keys.

## Secret Audit

Run these commands before release:

```bash
pnpm build
pnpm audit:secrets
```

The audit scans `dist` for private key blocks and common private token markers.
Public values prefixed with `VITE_`, including the Supabase publishable key, are
expected in the static build and are not treated as secrets.
