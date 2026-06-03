# Vygilence Repository Audit Report

Date: 2026-06-02

## What Is Working

- Next.js App Router project builds a coherent SaaS prototype for an evidence vault, evidence matrix, audit packs, organization settings, and billing screens.
- TypeScript domain types exist for organizations, profiles, requirements, evidence documents, matrix cells, audit packs, and audit logs.
- Supabase client setup exists and uses public URL and anon key environment variables.
- Supabase schema defines tenant-owned tables and enables RLS on core tables.
- Product-boundary disclaimers are present in the dashboard and landing page.
- Basic audit activity data model exists.
- Local prototype flow is usable when demo mode is explicitly enabled.

## Demo Or Mock Only

- Login and registration are mock React-context flows, not Supabase Auth.
- Evidence upload now uses private Supabase Storage in production mode.
- localStorage is the main data store in demo mode.
- Audit pack share links, PIN protection, and external viewer behavior are simulated.
- Billing and invoices are simulated; no Stripe checkout, customer, subscription, invoice, webhook, or payment state exists.
- Organization members and invites are stored locally in demo mode.
- API credentials in settings are demo strings only.
- Readiness scores are internal evidence completeness indicators, not compliance certification.

## Critical Issues

- Production authentication is not implemented. The app cannot safely onboard or authenticate real users yet.
- Production organization onboarding is not implemented. Creating organizations and profiles must be server-side and transactional.
- Secure file storage has an MVP implementation using a private bucket, organisation-scoped paths, and short-lived signed URLs. Storage setup is separated into `supabase/storage_setup.sql` for hosted Supabase compatibility.
- Audit pack sharing is not production-ready. Tokens and PINs need cryptographic generation, hashing, expiry enforcement, revocation, authorization, and audit logs.
- Stripe billing is placeholder-only and must not collect or process card data in-app.
- Current client-side Supabase writes are too broad for production workflows; server-side validation and role checks are needed.
- No production deployment configuration or environment validation pipeline exists beyond the new fail-closed client checks.

## Medium Issues

- RLS was present but prototype policies were broad. The schema now includes `with check` tenant checks, but policies still need to be tested against real Supabase Auth sessions.
- Audit logs are mutable at the database table level except for the explicit user policy shape; production should prevent normal user updates/deletes.
- Roles are strings in profiles but not enforced consistently in RLS or application logic.
- Several UI paths still represent future capabilities, including billing, invites, API keys, and share portals.
- No automated tests exist for tenancy isolation, authentication, storage access, or evidence status calculations.
- No centralized environment schema validates required production variables at deployment time.
- `Record<string, any>` and UI casts reduce TypeScript safety in metadata and select handlers.

## Low Issues

- Some copy still uses broad terms such as "compliance" in UI labels. This is acceptable as an evidence category label but should continue to avoid certification claims.
- The dashboard and marketing pages include simulated data and pricing that need product review before public use.
- There are no seed scripts, migrations folder, or typed Supabase generated database types.
- npm reports two moderate dependency audit findings after `npm install`; these should be reviewed separately before production.

## Recommended Build Order

1. Implement Supabase Auth with email/password or magic-link flows, session handling, and protected server-side routes.
2. Build server-side organization onboarding that creates organization, owner profile, roles, and starter records transactionally.
3. Generate Supabase database types and replace loose client types where possible.
4. Finalize and test RLS with real users across at least two organizations.
5. Verify private Supabase Storage RLS with multiple real organizations and roles.
6. Replace localStorage demo writes with production server actions or API routes.
7. Implement audit logging as append-only, server-authored events.
8. Build secure audit-pack sharing with hashed PINs, token rotation, expiry, revocation, and access logs.
9. Add Stripe Checkout, Customer Portal, webhooks, subscription state tables, and idempotent billing event processing.
10. Add tests for auth, RLS, storage, signed URLs, billing webhooks, and build/lint gates.
