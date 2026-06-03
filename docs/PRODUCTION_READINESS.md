# Production Readiness

Vigilen is not production-ready yet. The current codebase is a prototype with explicit demo mode support and partial Supabase schema groundwork.

## Current Gate

- Demo mode requires `NEXT_PUBLIC_VIGILEN_APP_MODE=demo`.
- Missing app mode defaults to production.
- Production mode requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Prototype login, registration, localStorage persistence, fake billing, fake invites, and fake API tokens are blocked or demo-gated.

## Required Environment Variables

Minimum production variables:

- `NEXT_PUBLIC_VIGILEN_APP_MODE=production`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Future production variables:

- Supabase service role key, server-side only
- Stripe secret key, server-side only
- Stripe webhook secret
- Storage bucket name: `evidence-documents`
- Evidence upload limits and signed URL TTLs
- Signed URL TTL configuration
- App base URL
- Email provider keys
- Observability and error-reporting keys

## Production Blockers

- Supabase Auth is wired into login/register/logout/password-reset from the browser anon client.
- Organization creation is handled by the `create_organization_for_current_user` Supabase RPC, which creates the organization, owner membership, and profile atomically for the authenticated user.
- Tenant-sensitive mutations still need deeper role enforcement and test coverage beyond baseline RLS and client scoping.
- Evidence files are stored in the private `evidence-documents` Supabase Storage bucket when production mode is configured.
- Signed URLs are not implemented.
- Billing is simulated and must be replaced with Stripe-hosted flows.
- Audit-pack sharing is simulated and exposes prototype PIN behavior.
- No automated RLS, auth, storage, or billing tests exist.
- No CI/CD build, lint, typecheck, migration, or smoke-test pipeline is defined.

## Deployment Checklist

- Add environment validation that fails build/start when production variables are missing.
- Use server-side routes/actions for organization onboarding, storage, audit logs, billing, and share links.
- Keep service-role keys off the browser.
- Enable and test RLS for every tenant-owned table.
- Use the private `evidence-documents` bucket only.
- Generate short-lived signed URLs after verifying organisation membership.
- Add rate limits to auth, share links, uploads, and invite flows.
- Add malware/content scanning policy for uploaded files before public or auditor access.
- Add backup, restore, retention, and deletion policies.
- Add monitoring for auth failures, RLS denials, storage errors, webhook failures, and suspicious share-link access.

## Release Criteria

- `npm run build` succeeds in CI.
- `npm run lint` succeeds in CI.
- Database migrations apply cleanly to a fresh Supabase project.
- RLS tests prove users cannot read, write, update, or delete another organization's data.
- Storage tests prove users cannot access another organization's files.
- Billing webhook tests prove subscription state is idempotent and cannot be spoofed from the browser.
- Product copy review confirms Vigilen does not provide legal advice, safety advice, compliance certification, standards text, or audit-success guarantees.
