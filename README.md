# QuestGear

QuestGear is a responsive web application for tabletop players who want to catalogue,
lend, borrow, and track physical gaming gear.

## Documentation

- [Requirements](docs/tabletop-lending-web-requirements.md)
- [Development plan](docs/development-plan.md)
- [Production configuration](docs/production-configuration.md)
- [Release checklist](docs/release-checklist.md)

## Local Development

Required tooling:

- Node.js 22 or newer.
- pnpm 11 or newer.

Set up local configuration:

```bash
cp .env.example .env.local
```

Fill in the public Supabase values when a project is available:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
# Or, for older Supabase naming:
# VITE_SUPABASE_ANON_KEY=
VITE_SITE_URL=http://localhost:5173/
VITE_BASE_PATH=/
```

`VITE_SUPABASE_URL` must be the project root, for example
`https://project-ref.supabase.co`, not the REST endpoint ending in `/rest/v1`.

Install dependencies and start the app:

```bash
pnpm install
pnpm dev
```

Quality checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm audit:secrets
pnpm test:e2e
```

## Architecture

The frontend uses React, TypeScript, Vite, React Router with `HashRouter`,
TanStack Query, React Hook Form, Zod, and the Supabase JavaScript client.
German is the default interface language, with English available through the
shared translation layer.

Application code is organized by feature under `src/features`. Shared app shell
code lives under `src/app`, reusable utilities live under `src/lib`, and test
helpers live under `src/test`.

Supabase schema, policies, trusted functions, and database/RLS tests live under
`supabase/`. Protected business transitions must be implemented there rather
than only in the browser.
