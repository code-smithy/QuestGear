# QuestGear Development Plan

**Source of truth:** `docs/tabletop-lending-web-requirements.md`  
**Last updated:** 2026-08-12

This plan translates the requirements contract into an implementation sequence. Each phase should leave the main branch buildable, tested, and documented.

## Guiding Principles

- Ship vertical slices that include database migrations, Row Level Security, frontend behavior, tests, and documentation.
- Keep trusted business rules in Supabase functions or Edge Functions, especially loan state changes, reservation conflict checks, reminders, reviews, and reliability scoring.
- Keep the browser responsible for presentation, validation hints, and invoking trusted operations, not for enforcing protected state transitions.
- Treat RLS tests as first-class feature tests. A feature is incomplete if authorization is implemented only in React.
- Prefer small, explicit modules over broad shared abstractions. Add shared code only when it removes proven duplication or codifies a stable domain rule.
- Update this plan or add an ADR under `docs/decisions/` when scope or architecture intentionally changes.

## Phase 0: Foundation

Goal: create a production-ready skeleton for a static GitHub Pages app backed by Supabase.

Deliverables:

- React, TypeScript, and Vite project scaffold.
- Strict TypeScript configuration.
- Formatting, linting, unit test, component test, and Playwright setup.
- React Router configured with `HashRouter`.
- TanStack Query provider and app-level error/loading patterns.
- Supabase client initialization using public Vite environment variables.
- Environment validation and `.env.example`.
- GitHub Actions workflow for typecheck, lint, tests, build, and Pages deployment.
- README setup instructions.

Validation:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- One Playwright smoke test for app shell routing.

## Phase 1: Authentication And Profiles

Goal: support Discord login, protected routes, onboarding, and profile settings.

Deliverables:

- Supabase Discord OAuth integration points in the frontend.
- Session restore, auth state listener, logout, and protected route handling.
- `profiles` migration, profile creation trigger, constraints, indexes, and RLS.
- Onboarding form for display name, region, time zone, and reminder lead days.
- Settings page for editable profile fields and notification preferences.
- Public profile view that excludes private data.

Validation:

- Unit tests for profile validation.
- Component tests for onboarding and settings error states.
- Database/RLS tests proving users can update only their own permitted profile fields.
- Manual OAuth check for local and GitHub Pages redirect URLs.

## Phase 2: Inventory And Discovery

Goal: let authenticated users catalogue, publish, browse, and inspect lendable items.

Deliverables:

- Migrations for `items`, `item_photos`, `item_contents`, `item_damage`, and `item_unavailable_periods`.
- Storage buckets and policies for `item-photos` and `profile-photos`.
- My Inventory page with draft, published, unavailable, and archived filters.
- Item editor sections for basics, category attributes, photos, contents, condition, damage, lending rules, and publishing.
- Category-specific Zod validation.
- Browse page with search and filters.
- Item detail page with gallery, contents, damage, rules, availability, lender summary, and request entry point.

Validation:

- Unit tests for item, category, date-range, and availability helpers.
- Component tests for item form validation and browse states.
- RLS tests for owner-only writes and authenticated reads of visible published data.
- Storage policy tests for owner-scoped uploads.

## Phase 3: Loan Requests And Handover

Goal: implement the core lending workflow through approved reservation and activation.

Deliverables:

- Migrations for `loans`, `loan_items`, `loan_date_proposals`, `loan_condition_reports`, and `loan_events`.
- Trusted operations for request creation, counteroffers, approval, rejection, cancellation, and handover confirmation.
- Transactional approval with row locks to prevent overlapping approved reservations.
- Immutable loan events for every state transition.
- Item snapshots stored when a loan becomes active.
- Requests page with incoming, sent, needs-action, and closed views.
- Loan detail page with status, agreed dates, items, timeline, handover actions, and unauthorized states.
- Home dashboard sections for lent items, borrowed items, requests requiring action, upcoming due dates, and overdue loans.

Validation:

- Unit tests for overlap detection and loan state helpers.
- Component tests for request, counteroffer, dashboard, and handover UI.
- Database/RLS tests for loan visibility, state transition permissions, append-only events, and conflicting approval failure.
- Playwright flow from owner publishing an item through borrower request, lender counter, borrower acceptance, and two-party handover.

## Phase 4: Extensions, Returns, And Notifications

Goal: complete the active-loan lifecycle and add required in-app notifications.

Deliverables:

- Trusted operations for extension request/response, return submission, return acceptance, and return dispute.
- Evidence-photo handling through the private `loan-evidence` bucket.
- `notifications` table, RLS, unread count, inbox, and mark-read actions.
- Notification creation for loan requests, responses, handover prompts, extension events, return events, completion, and review availability.
- Supabase Cron job calling `process_due_notifications` at least hourly.
- Deterministic deduplication keys for reminder, due-time, overdue, and penalty events.
- Browser push left disabled unless explicitly promoted into scope.

Validation:

- Unit tests for reminder time calculation and overdue derivation.
- Component tests for return submission, lender acceptance, notification states, and conflict messages.
- Database/RLS tests for private evidence access, notification ownership, idempotent scheduled processing, and return/dispute transitions.
- Playwright flow for extension, return pending, lender acceptance, and dispute path.

## Phase 5: Reviews And Reliability

Goal: implement post-loan reviews and trusted public reliability scores.

Deliverables:

- Migrations for `reviews`, `reliability_events`, and `reliability_scores`.
- Trusted `submit_review` and `recalculate_reliability` operations.
- Blind review reveal after both parties submit or the 14-day review period closes.
- Bayesian review component, automatic penalty component, role scores, combined score, and confidence label.
- Public reliability summary on user profiles.
- Reliability help page explaining score behavior without exposing private loan details.

Validation:

- Unit tests for Bayesian score, penalty thresholds, role score, combined score, and confidence labels.
- Component tests for review submission and reliability presentation for new and established users.
- Database/RLS tests for hidden review content, one review per reviewer and loan, and trusted-only reliability writes.
- Playwright flow for completed loan review submission, reveal, and recalculation.

## Phase 6: Hardening And Release

Goal: verify the complete MVP against acceptance criteria and deployment constraints.

Deliverables:

- Accessibility pass for keyboard navigation, focus states, labels, error association, contrast, and non-color status cues.
- Responsive pass for viewports from 360 pixels upward.
- Production GitHub Pages configuration and base-path verification.
- Supabase production configuration documentation.
- Secret audit for frontend build output.
- Release checklist covering Discord OAuth, route refresh, photo upload, RLS coverage, and all acceptance criteria.

Validation:

- Full CI suite passes.
- Full Playwright MVP journey passes.
- Manual release checks from the requirements are complete.
- No known critical authorization, data integrity, or deployment issues remain.

## Architecture Direction

### Frontend Layers

Use a feature-oriented structure once the app is scaffolded:

```text
src/
  app/                 App shell, providers, router, layout
  components/          Shared UI primitives and reusable app components
  features/
    auth/
    profiles/
    inventory/
    browse/
    loans/
    notifications/
    reviews/
    reliability/
  lib/                 Supabase client, env, dates, query helpers
  test/                Test utilities and fixtures
```

Feature folders should own their pages, form schemas, API calls, hooks, and feature-specific components. Shared modules should stay small and stable.

### Supabase Structure

Use migrations for every database object:

```text
supabase/
  migrations/
  functions/
  tests/
```

Database changes should be grouped by product capability, not by object type alone. For example, the loan-request phase should include the loan tables, policies, functions, indexes, and tests needed for that phase to work.

### Domain Rules

Keep reusable domain rules in pure TypeScript functions when they are needed by the UI:

- Date range validation.
- Reminder time calculation.
- Overdue derivation for display.
- Reliability formula display helpers.
- Category-specific validation helpers.

Authoritative rules that protect data integrity must also exist in the database or trusted server-side code. The frontend copy is for fast feedback and good UX.

### Data Access

- Use TanStack Query for reads and mutation invalidation.
- Keep Supabase calls behind feature-level API modules.
- Return typed results and map raw database errors into safe user-facing messages.
- Never expose service-role keys or private secrets to Vite.
- Do not let React components construct complex database writes directly.

### UI And Accessibility

- Build loading, empty, error, success, and unauthorized states with every feature.
- Prefer forms with explicit labels, field-level errors, and keyboard-friendly controls.
- Keep responsive behavior part of initial implementation, not a final polish pass.
- Render user-provided text as plain text.

## Testing Direction

### Test Pyramid

- Pure unit tests for deterministic rules and validation.
- Component tests for forms, dashboards, state-specific actions, and error handling.
- Database/RLS tests for permissions, trusted operations, constraints, and conflict handling.
- Playwright tests for critical cross-page user journeys.

### Unit Test Standards

- Keep unit tests close to pure domain functions.
- Test boundary cases, not only happy paths.
- Name tests by behavior, not implementation detail.
- Avoid brittle snapshots for ordinary UI.
- Prefer fixture builders over large repeated inline objects.
- When a bug is fixed, add the smallest regression test that would have caught it.

### Component Test Standards

- Test what a user can see and do.
- Use accessible queries from Testing Library.
- Cover loading, empty, validation error, authorization error, conflict, and success states.
- Mock feature API boundaries, not internal component functions.

### Database And RLS Test Standards

- Every exposed table needs read/write policy tests.
- Every trusted operation needs success, unauthorized, invalid-state, and conflict tests.
- Test both the allowed actor and a near-miss actor.
- Test idempotency for scheduled notification and reliability operations.
- Keep test users and records explicit enough that policy failures are easy to diagnose.

### End-To-End Standards

- Keep E2E tests focused on acceptance criteria and integration seams.
- Seed data through trusted setup utilities, not fragile UI setup, except where the UI itself is under test.
- Run the full MVP journey before release.
- Use screenshots only when they help diagnose layout or responsive regressions.

## Definition Of Done For Each Feature

A feature is done only when:

- Required migrations, policies, indexes, functions, and storage rules are included.
- Frontend forms and views support loading, empty, error, success, and unauthorized states.
- Frontend validation and database validation agree.
- Relevant unit, component, database/RLS, and E2E tests are added or deliberately marked out of scope.
- User-facing errors do not expose raw database internals.
- Documentation and configuration examples are current.
- Typecheck, lint, tests, and production build pass.
