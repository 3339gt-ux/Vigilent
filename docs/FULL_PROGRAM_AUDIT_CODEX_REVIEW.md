# Codex Review of the Full Program Audit

## Review Decision

- **Reviewed branch:** `audit/full-program-product-audit`
- **Reviewed audit commit:** `6a555b3412168d7c1192ba3e8ba460902499b552`
- **Audited checkpoint:** `9c3e75315a90dc33da91f976fd91fbe8146326b5`
- **Audit accepted:** No, not as a release-readiness decision.
- **Usable portion:** The report is a useful partial source-led UX checklist after applying the corrections below.

The audit has no browser screenshots or completed browser smoke evidence. It therefore cannot substantiate claims that all visible routes, responsive states, themes, accessibility behavior, or high-volume interactions were tested.

## Material Corrections

1. The two reported critical disclaimer blockers are false. Login and registration both initialize `agreedDisclaimers` to `false`, require acknowledgement, and disable submission until checked.
2. The mobile header and menu already use `z-50` and `z-40`. The reported fix is already present.
3. Competency and Asset Matrix sticky columns already have explicit right borders.
4. A global `@media print` stylesheet exists, and report pages also use print utility classes.
5. Private evidence opening already uses short-lived Supabase signed URLs. The missing capability is secure external sharing, not signed URL generation for authenticated users.
6. The current Audit Pack Builder does not expose the claimed client-side public PIN-sharing workflow. Share fields remain in the data model, but the UI saves internal packs and states that evidence remains private.
7. Onboarding already maps common schema/PGRST failures to friendly messages. Its fallback can still expose an unrecognized raw message, so this is a medium hardening item rather than the described universal leak.
8. Using the authenticated Supabase anon client with RLS and a security-definer onboarding RPC is not itself a vulnerability. A service-role key is neither required nor desirable in the browser.
9. `saved_reports` exists in `supabase/schema.sql` and an idempotent migration. Its hosted-project deployment status is unverified, not proven absent.
10. The audit trail preserves immutable event fields and appends an `undo_executed` event after a recovery mutation. “Undo” wording may be improved, but the implementation is not silently rewriting history.
11. Pivot percentage rounding can make displayed cells fail to total exactly 100%; this is a reporting polish/data-presentation issue, not a security or pilot blocker.
12. The reported high-volume dataset counts are inaccurate. The deterministic generator currently produces 100 requirements, 500 evidence records, 200 people, 300 competency types, 1,641 competency records, 200 actions, 200 assets, 295 assignments, 281 check records, and 100 audit logs.

## Missing or Understated Findings

1. **Critical for production: hosted Supabase state is unverified.** The repository contains migrations for audit trail, saved reports, Asset Matrix, asset improvements, and asset categories, plus separate storage setup. The audit provides no proof that the hosted project has the complete schema, RLS policies, private bucket, or storage policies.
2. **High: password recovery cannot complete in-app.** Reset email redirects to `/login`, but there is no recovery callback or password-update screen using `supabase.auth.updateUser`.
3. **High: production invitation onboarding is unavailable.** Organisation invitations are explicitly blocked outside demo mode; the remaining resend link is a demo simulation.
4. **High: startup/deployment verification remains incomplete.** There is no comprehensive startup validation for required tables and storage, and the expected `SUPABASE_SETUP.md` and `DEPLOYMENT_CHECKLIST.md` files are absent.
5. **High: release evidence is missing.** There is no automated test runner or browser E2E suite, no CI pipeline, and no automated RLS/storage cross-tenant test. A successful build and warning-only lint run do not prove operational readiness.
6. **High product-boundary risk:** the audit’s industry section rates Vygilence against named standards/regulators and uses “fit” language that can be read as a compliance claim. Demo data and some user-facing copy also retain named-regulator references. These require product-copy review before a customer demonstration.
7. **Medium: production documentation is stale.** `PRODUCTION_READINESS.md` still says signed URLs are not implemented even though authenticated signed URL access exists.
8. **Medium: lint debt is understated.** The 227 warnings include React effect/purity and accessibility-related warnings, not only cosmetic style warnings.

## Findings to Remove or Downgrade

- Remove both disclaimer critical findings.
- Remove mobile navigation z-index as an established source defect; retain browser verification as a test item.
- Remove missing sticky matrix borders as an established source defect; retain visual verification.
- Remove missing print stylesheet.
- Replace “missing secure signed URLs” with “external sharing is not production implemented.”
- Remove the asserted public PIN workflow from current behavior.
- Downgrade onboarding error leakage to medium fallback hardening.
- Downgrade pivot rounding and focus-trap work to medium unless browser testing proves a blocking keyboard workflow.
- Treat radar, theme contrast, tooltip transitions, toast overlap, and notification sizing as unverified browser findings.

## Readiness Decisions

### Internal Local Testing

**Ready with known limitations.** Demo mode is explicitly gated, build passes, core modules are implemented, and the high-volume generator is suitable for local stress testing. Testers must understand that demo data, billing, invites, and some registry settings are not production behavior.

### Customer Demo

**Conditionally ready after a short hardening pass.** Before demonstrating:

- run an actual browser smoke test across desktop and mobile;
- remove or clearly label billing, invitations, external sharing, and local-only settings;
- remove named-standard/regulator claims and confidence/guarantee language;
- verify login, onboarding, upload, signed opening, requirements, competencies, assets, reports, actions, and audit packs;
- correct stale readiness documentation and demo dataset descriptions.

Use demo mode only. Do not represent the demonstration as a production or compliance-certified deployment.

### Pilot

**Blocked.** A pilot requires a staging Supabase project with all migrations and storage provisioning applied, password recovery, tenant-isolation tests, role tests, backup/restore procedures, observability, support/runbooks, and browser E2E coverage. Production invitations are also required if pilot customers will manage multiple users.

### Production

**Blocked.** In addition to pilot gates, production requires CI/CD, migration verification and rollback procedures, rate limiting, monitoring, retention/deletion policy, upload malware/content controls or an accepted compensating policy, incident response, operational ownership, and production billing only if paid plans are exposed.

## Top 10 Final Implementation Priorities

1. Provision a fresh staging Supabase project from all migrations and storage scripts; record exact results.
2. Add automated multi-tenant RLS, role, and private-storage isolation tests.
3. Complete password recovery with a secure callback and password-update flow.
4. Add startup diagnostics for environment, connection, required tables, RPCs, and private bucket.
5. Add CI for build, lint, type checking, migrations, and browser smoke tests.
6. Implement or explicitly defer production member invitations and remove misleading controls.
7. Remove named-standard/regulator claims and other product-boundary violations from customer-visible copy and demo data.
8. Run desktop/mobile/theme/accessibility browser acceptance tests and fix confirmed blockers.
9. Define backup, restore, retention, deletion, upload scanning, monitoring, and incident-response procedures.
10. Resolve stale documentation and then address verified UX issues such as report labels, rounding, modal focus, and notification bounds.

## Supabase Migration and Provisioning Work

The following require staging/hosted verification before pilot:

- core `supabase/schema.sql`;
- `20260605000000_audit_trail_events.sql`;
- `20260606000000_saved_reports.sql`;
- `20260611000000_asset_matrix_system.sql`;
- `20260611000001_asset_matrix_improvements.sql`;
- `20260611000002_asset_categories.sql`;
- `supabase/storage_setup.sql`;
- private bucket `evidence-documents`;
- storage policies, table RLS policies, grants, indexes, and onboarding RPC;
- Auth site URL and redirect configuration;
- confirmation that Competency Registry `review_period_months` and `warning_days` remain intentionally local-only or receive an approved migration.

No remote migration was run during this review.

## Information Architecture and Roadmap Review

The Antigravity report does not provide a concrete menu or information-architecture recommendation, so that part cannot be accepted or rejected. The existing roadmap is ordered poorly because it places cosmetic border and rounding work ahead of password recovery, hosted migration verification, tenant tests, and deployment controls.

The next branch should be a new, clean priority-fix branch from the audited checkpoint. Do not apply `stash@{0}` wholesale: it changes seven large dashboard modules and would obscure security and release work. Keep the stash temporarily for selective review, extract only independently accepted changes later, then discard it once those changes are accounted for.

## What to Send to Antigravity Next

Ask for a narrowly scoped staging-readiness pass that produces:

1. an exact migration/provisioning manifest;
2. fresh-project and existing-project migration results;
3. RLS/storage role test evidence;
4. password recovery completion;
5. startup diagnostics and deployment checklist;
6. browser smoke evidence at desktop and mobile sizes;
7. no product-boundary or named-standard claims.
