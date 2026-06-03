<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may differ from older Next.js versions. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Vygilence Repository Rules

Vygilence is an audit readiness and evidence intelligence platform. It organizes audit evidence, tracks expiries, builds audit packs, and highlights missing records.

Vygilence must not:

- provide legal advice
- provide safety advice
- claim ISO, BRC, TAPA, RSA, HSA, DVSA, HSE, or other regulatory compliance
- generate safety statements, method statements, risk assessments, or legal documents
- copy standards text
- guarantee audit success

Production work must fail closed:

- `NEXT_PUBLIC_VIGILEN_APP_MODE=demo` is required for localStorage/demo mode.
- Missing `NEXT_PUBLIC_VIGILEN_APP_MODE` means production mode.
- Production mode requires explicit Supabase environment variables.
- Do not add localStorage fallbacks to production paths.
- Do not store payment card details, API secrets, evidence files, signed URLs, PINs, or auth state in localStorage for production.
- Treat billing, share links, member invites, API keys, and evidence upload/storage as prototype-only unless backed by explicit server-side integrations.

Security and tenancy rules:

- All tenant-owned rows must include `organization_id`.
- Every Supabase read/write must be scoped by authenticated user membership and Row Level Security.
- Insert and update policies must include `with check`.
- Evidence files must use private storage buckets and short-lived signed URLs.
- Audit logs should be append-only for normal users.
- Do not expose Supabase service-role keys to the browser.

Before code changes:

- Read the relevant files and local patterns first.
- Keep changes focused; do not redesign the UI or add major features during audit/hardening work.
- Run `npm run build` and `npm run lint` when available.
