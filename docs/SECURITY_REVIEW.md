# Security Review

## Summary

The repository is a prototype with useful Supabase schema groundwork, but production security is incomplete. The most important current improvement is that demo/localStorage mode is now explicit and production mode fails closed when Supabase configuration is absent.

## Authentication

Status: blocking.

- Login and registration are mock-only in demo mode.
- Production sign-in and registration now fail closed instead of silently accepting any credentials.
- Required next step: implement Supabase Auth and server-side organization onboarding.

## Tenant Isolation

Status: partial.

- Tenant-owned tables include `organization_id`.
- RLS is enabled on core tables.
- Schema policies now include a `current_organization_id()` helper and `with check` clauses for tenant-owned writes.
- Required next step: test RLS with multiple real Supabase users and organizations.

## RLS Risks

- Role-based permissions are not enforced yet.
- Normal users should not be able to mutate audit logs except through server-side append-only paths.
- Organization/profile onboarding likely needs service-role server logic, not browser inserts.
- Policies need migration tests before production.

## File Storage

Status: not implemented.

- Evidence uploads store filenames and metadata only.
- No private bucket, object path convention, MIME validation, file size limit, virus scan, retention policy, or signed URL flow exists.
- Required next step: use private Supabase Storage with paths like `{organization_id}/{document_id}/{filename}` and generate short-lived signed URLs server-side.

## Signed URLs

Status: not implemented.

- Audit pack links are prototype URLs only.
- Signed URLs must have short TTLs, be server-generated, and be logged.
- Share tokens must be random, revocable, and scoped to a pack and organization.

## localStorage And Demo Risk

Status: improved but still prototype.

- Demo mode now requires `NEXT_PUBLIC_VIGILEN_APP_MODE=demo`.
- Production no longer silently falls back to localStorage when Supabase variables are missing.
- Remaining direct localStorage prototype paths are demo-gated.

## Billing

Status: placeholder.

- The billing page simulates Stripe and invoices.
- Production checkout is blocked until explicit Stripe server-side integration exists.
- Never collect raw card details in the app. Use Stripe Checkout or Elements with PCI-aware design.

## Audit Logging

Status: partial.

- Audit log schema exists.
- Demo logs are localStorage based.
- Production logs should be server-authored, append-only, tamper-resistant, and include actor, organization, object, action, timestamp, IP/session metadata where appropriate.

## Environment Variables

Status: improved.

- Production mode requires Supabase public URL and anon key.
- Server-only secrets are not present.
- Required next step: add a server-side environment validation module for production-only integrations.

## TypeScript Safety

Status: medium risk.

- Domain interfaces exist.
- `Record<string, any>` and select `as any` casts should be reduced.
- Supabase generated database types should be introduced once schema stabilizes.

## Immediate Recommendations

1. Keep the app in demo mode only for local prototype work.
2. Do not deploy public production traffic until Supabase Auth, onboarding, RLS tests, private storage, and signed URLs are complete.
3. Replace browser-side sensitive mutations with server-side routes/actions.
4. Add automated multi-tenant isolation tests before accepting customer data.
