# Priority Fix Pack 1 - Readiness & Diagnostics

This document details the readiness fixes, safe startup diagnostics, and local release checklists implemented under Priority Fix Pack 1.

## Summary of Fixes

1. **System Readiness & Diagnostics Panel**:
   - Added an administrative panel in **Settings** visible to **Owner** and **Admin** roles.
   - Displays environment availability status (presence/absence of Supabase keys, application mode, loaded record count, and expected storage bucket).
   - Provides clear verification statuses for database tables, Asset Matrix schemas, and bucket provisioning.

2. **In-App Password Recovery Completion**:
   - Implemented a native in-app password update flow in `src/app/login/page.tsx` that requires a valid Supabase recovery session before accepting a new password.
   - In **Demo / Local mode**, password recovery actions are disabled, replaced by a clear text notice directing the user to contact their administrator.

3. **Production Invitations Restrictions**:
   - Restrained member invitations outside of demo mode (since organization membership features are not implemented in the frontend).
   - Exchanged the "Invite Member" button for a disabled label: *"Production Invites Disabled"*.
   - Added a professional informational banner explaining that team management and invitation flows are simulation-only.

4. **Product Copy Sanitization**:
   - Cleaned up all regulator overclaims and references to named standards (DVSA, ISO, BRCGS, TAPA, etc.) that could imply legal certification.
   - Corrected testimonials, landing page feature lists, and general disclaimers.
   - Updated seed database records (`src/lib/db.ts`) to rename "Q2 DVSA Safety Audit Pack" to "Q2 Fleet Readiness Audit Pack".

5. **Safe Database Error Masking**:
   - Hardened error handling by mapping PostgREST/PostgreSQL raw database errors, syntax faults, and RLS violations to clean, user-friendly messages.
   - Modified the global `throwSupabaseError` method to mask raw errors before they reach any UI view component, preventing database columns, table structures, and internal RLS policies from leaking.

---

## Local Release / Smoke Test Checklist

Before executing any release or staging deployment, verify the application status:

### 1. Build & Lint Pipeline
- [ ] **Next.js Compilation**: Run `npm run build` locally and ensure it completes without compiler errors.
- [ ] **Lint Analysis**: Run `npm run lint` and ensure there are 0 errors and warning counts remain within the baseline boundary (~227 warnings).
- [ ] **Formatting Checks**: Run `git diff --check` to verify no trailing whitespace exists.

### 2. User Journey Smoke Tests
- [ ] **Demo Login Smoke**: Open `/login` in demo mode. Verify that the form requires disclaimer acknowledgement, credentials validate, and the password reset link is disabled.
- [ ] **Password Recovery Smoke**: Request a real reset email from the staging Supabase project. Verify a valid link opens the Set New Password form and an invalid/expired link is rejected.
- [ ] **Settings Diagnostics Smoke**: Log in as an Admin. Navigate to `/dashboard/settings`. Verify the System Readiness & Diagnostics panel renders correctly.
- [ ] **Organisation Member Smoke**: Go to `/dashboard/organisation`. In production mode, verify the "Production Invites Disabled" button and explanation banner are present.
- [ ] **Dashboard Hero Smoke**: Verify compliance rings load and popovers hover accurately.
- [ ] **Requirements Registry Smoke**: Open `/dashboard/requirements`. Import templates and check that items load without z-index collisions.
- [ ] **Evidence Vault Smoke**: Upload documents and test category metadata assignments.
- [ ] **Competency Matrix Smoke**: Check teammate grids and ensure expiries/warnings display correctly.
- [ ] **Asset Matrix Smoke**: Verify vehicle check rotations and ensure grid borders remain sticky.
- [ ] **Reports & Pivot Smoke**: Verify reporting builder dropdown labels and check float percentage totals.
- [ ] **Global Search Smoke**: Type an asset/requirement and verify deep-links.

---

## Remaining Blockers & Staging Requirements

The following gates must be completed in a staging environment before pilot or production deployments:

### Staging Supabase Verification (Required)
- Apply all migrations in `supabase/` to a hosted staging project.
- Verify the following table structures exist: `saved_reports`, `assets`, `asset_check_assignments`.
- Provision the private storage bucket `evidence-documents` and verify RLS storage policies.
- Configure Supabase Auth Site URL and redirect configuration to support redirecting recovery links to the app `/login` page.
