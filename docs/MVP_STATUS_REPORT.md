# MVP Status Report

## Branch Review

All active Codex branches were reviewed on June 3, 2026.

| Branch | Status | Disposition |
| --- | --- | --- |
| `codex/security-production-audit` | Implemented and tested with build/lint at the time of delivery. | Merged into `main`; superseded by later branches. |
| `codex/supabase-auth-onboarding` | Implemented and tested with build/lint at the time of delivery. | Merged into `main`; superseded by later branches. |
| `codex/private-evidence-storage` | Implemented and tested with build/lint at the time of delivery. | Merged into `main`; superseded by later branches. |
| `codex/requirements-framework` | Implemented and tested with build/lint at the time of delivery. | Merged into `main`; superseded by template pack branch. |
| `codex/generic-requirement-template-packs` | Implemented and tested with build/lint at the time of delivery. | Merged into `main`; current MVP head. |

## Merge Plan Executed

The completed branch stack was linear, so `main` was fast-forwarded through the safe completed branches in this order:

1. `codex/security-production-audit`
2. `codex/supabase-auth-onboarding`
3. `codex/private-evidence-storage`
4. `codex/requirements-framework`
5. `codex/generic-requirement-template-packs`

No merge conflicts occurred.

## Implemented Features

- Production readiness audit documentation and repo rules.
- Explicit demo mode gating with production fail-closed environment checks.
- Supabase Auth signup, login, logout, password reset request, session persistence, protected routes, and onboarding redirect flow.
- Organisation onboarding with owner membership creation.
- Idempotent core Supabase schema for app tables and RLS policies.
- Hosted Supabase-compatible private storage setup split into `supabase/storage_setup.sql`.
- Private evidence upload to `evidence-documents` bucket using organisation-scoped object paths.
- File type, MIME type, filename, file size, and signed URL handling for evidence records.
- Evidence document metadata editing, tags, lifecycle dates, and soft delete.
- Standards-agnostic Requirements Framework with requirements, evidence types, document links, reviews, actions, and requirement actions.
- Requirements dashboard widgets for overview, status, reviews, and actions.
- Dedicated Requirements page with detail drawer and document linking.
- Generic requirement template packs with preview, select/deselect, duplicate marking, and selected import.
- Documentation and manual test plans for auth, storage, requirements, and template packs.

## Verification

Code-level verification completed after merging:

- Login route and Supabase password login path are present.
- Register route and Supabase signup path are present.
- Onboarding route and organisation creation RPC path are present.
- Dashboard auth gate redirects unauthenticated users to login and users without organisation to onboarding.
- Document upload paths call private Supabase Storage upload and create evidence records.
- Requirements page is present at `/dashboard/requirements`.
- Template pack import UI and static pack catalogue are present.

Command verification:

- `npm run build`
- `npm run lint`

Live workflow verification still required against the hosted Supabase project:

- Real signup/login/logout.
- First organisation onboarding.
- Private evidence upload and signed URL opening.
- Requirement creation and document linking.
- Template pack import with RLS-backed persistence.

## Missing Features

- Automated tests for auth, RLS, storage, requirements, and template imports.
- Server-side mutation layer for sensitive writes.
- Malware scanning, retention policy, and storage lifecycle controls.
- Production audit log hardening with append-only server-authored events.
- Invite/member management.
- Billing integration remains placeholder-only.
- Audit pack public sharing remains prototype-only and should not be used for external access.
- Password update callback page for full password recovery flow.
- Generated Supabase TypeScript database types.

## Blockers

- Hosted Supabase must have the latest `supabase/schema.sql` applied.
- Hosted Supabase must have `supabase/storage_setup.sql` applied after the core schema.
- Required production environment variables must be configured.
- Storage bucket policies need live project verification because hosted Supabase policy ownership can differ from local assumptions.
- End-to-end production validation needs real test users and at least two organisations to confirm RLS isolation.

## Recommended Next Development Stage

Move into a hardening and validation stage before adding new product modules:

1. Apply the merged SQL scripts to Supabase and run the manual auth/storage/requirements/template pack test plans.
2. Add automated integration tests for tenant isolation and RLS.
3. Introduce server-side route handlers or actions for sensitive mutations.
4. Generate typed Supabase bindings and replace broad `any` usage in data models.
5. Harden audit logging and operational monitoring.
6. Only after that, add future standards mapping tables that point to the generic requirements model.
