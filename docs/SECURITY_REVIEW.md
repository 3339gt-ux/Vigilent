# Security Review

## Summary

The repository is a prototype with useful Supabase schema groundwork, but production security is incomplete. The most important current improvement is that demo/localStorage mode is now explicit and production mode fails closed when Supabase configuration is absent.

## Authentication

Status: partially implemented.

- Demo login and registration remain available only with `NEXT_PUBLIC_VIGILEN_APP_MODE=demo`.
- Production login, signup, logout, session loading, and password reset now use Supabase Auth.
- Authenticated users without an organization are routed to onboarding.
- Required next step: test Supabase email-confirmation settings and add an update-password callback page if password recovery should complete inside Vygilence.

## Tenant Isolation

Status: improved, pending test.

- Tenant-owned tables include `organization_id`.
- RLS is enabled on core tables.
- Schema policies include organization membership helpers and `with check` clauses for tenant-owned writes.
- `organization_members` is now the production membership authority.
- First-organization onboarding is performed by `create_organization_for_current_user`, a security-definer RPC called by the authenticated user through the anon client.
- Required next step: test RLS with multiple real Supabase users and organizations.

## RLS Risks

- Role-based permissions are not enforced yet.
- Normal users should not be able to mutate audit logs except through server-side append-only paths.
- Organization/profile onboarding likely needs service-role server logic, not browser inserts.
- Policies need migration tests before production.

## File Storage

Status: implemented for MVP private evidence storage, pending production verification.

- Evidence uploads now use the private Supabase Storage bucket `evidence-documents`.
- Production file paths are organisation scoped: `organisations/{organisation_id}/documents/{document_id}/{safe_filename}`.
- Uploads validate extension, MIME type, and `NEXT_PUBLIC_VIGILEN_MAX_UPLOAD_BYTES`.
- Evidence rows store original filename, safe filename, storage path, MIME type, file size, uploader, organisation id, metadata dates, tags, and timestamps.
- Files are not physically deleted in the MVP. Deleting a document sets `status='deleted'`.
- Storage bucket and storage object policies are managed in `supabase/storage_setup.sql`, separate from core table schema, to avoid hosted Supabase ownership errors on `storage.objects`.
- Remaining next step: add malware scanning/retention controls before accepting high-risk customer files.

## Signed URLs

Status: implemented for authenticated evidence viewing.

- Evidence files never use public URLs.
- The client requests a temporary signed URL only after the document row is scoped to the active organisation.
- Signed URL TTL is controlled by `NEXT_PUBLIC_VIGILEN_SIGNED_URL_TTL_SECONDS`.
- Audit pack share links remain prototype-only and must not be used for public sharing.

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
