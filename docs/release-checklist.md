# QuestGear Release Checklist

Use this checklist for Phase 6 hardening and every production release.

## Automated Checks

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm audit:secrets`
- [ ] `pnpm test:e2e`
- [ ] Supabase database/RLS tests in `supabase/tests`

## Accessibility

- [ ] All interactive controls are keyboard reachable.
- [ ] Focus indicators are visible on links, buttons, inputs, selects, and textareas.
- [ ] Inputs have visible labels.
- [ ] Field errors are associated with their controls by `aria-describedby`.
- [ ] Invalid fields expose `aria-invalid`.
- [ ] Loading states use `role="status"`.
- [ ] Error states use `role="alert"` where immediate attention is needed.
- [ ] Status is communicated with text, not color alone.
- [ ] Contrast meets WCAG 2.2 AA for core workflows.

## Responsive Layout

- [ ] 360px viewport has no horizontal page overflow.
- [ ] 390px mobile viewport keeps primary actions reachable.
- [ ] Tablet viewport keeps forms readable without clipped labels.
- [ ] Desktop viewport keeps navigation, filters, cards, and detail pages aligned.
- [ ] Browser refresh works on every hash route.
- [ ] GitHub Pages repository base path works for assets and OAuth return.

## Supabase Production

- [ ] Discord provider is enabled.
- [ ] Supabase Site URL matches `VITE_SITE_URL`.
- [ ] Production and localhost redirect URLs are allow-listed.
- [ ] Storage buckets and policies exist for `item-photos`, `profile-photos`,
  and `loan-evidence`.
- [ ] `process_due_notifications` runs at least hourly.
- [ ] No service-role key, Discord client secret, push private key, or exact
  private address is exposed to the frontend build.

## MVP Acceptance Criteria

- [ ] AC-001 Login through Discord returns to QuestGear.
- [ ] AC-002 Owner can create, save, and publish an item.
- [ ] AC-003 Borrower can find a published item by search.
- [ ] AC-004 Borrower can submit a loan request and lender receives a notification.
- [ ] AC-005 Counteroffer acceptance stores agreed dates.
- [ ] AC-006 Conflicting second approval fails without partial writes.
- [ ] AC-007 Two-party handover activates the loan and stores item snapshots.
- [ ] AC-008 Active loans appear in lender and borrower dashboards.
- [ ] AC-009 Reminder and due notifications are created exactly once.
- [ ] AC-010 Borrower return plus lender acceptance completes the loan.
- [ ] AC-011 Borrower return alone leaves the loan return pending.
- [ ] AC-012 Completed loan reviews submit once and reveal correctly.
- [ ] AC-013 Reliability combines revealed reviews and late-return events.
- [ ] AC-014 Unrelated users cannot read private loans, evidence, or hidden reviews.
- [ ] AC-015 GitHub Pages assets, hash routes, refresh, and OAuth return work under
  the configured base path.
