# Auth Debugging

## Issue

After Supabase email confirmation was disabled, signup/login could create or authenticate a Supabase user, but the app still showed:

```text
Failed to load application data: {}
```

The failure happened after auth succeeded, when `AppContext.loadData()` tried to load profile and organisation data.

## Root Cause

The auth flow treated any post-login Supabase data loading error as a fatal application state:

- `loadData()` cleared the app user when a profile, membership, or organisation query failed.
- An authenticated user without an organisation was too close to the generic failure path.
- Supabase/PostgREST errors were logged directly, which can appear as `{}` in the browser console.
- The app needed to preserve the authenticated Supabase user and redirect to `/onboarding` when no organisation membership exists.

## Expected Table Names

The code and schema use these exact names:

- `organizations`
- `organization_members`
- `profiles`
- `compliance_requirements`
- `evidence_documents`
- `matrix_cells`
- `audit_packs`
- `audit_logs`

The code does not use:

- `organisations`
- `organisation_members`
- `users`
- `activity_logs`

## Required RPC

The onboarding flow calls:

```sql
public.create_organization_for_current_user(
  org_name text,
  org_industry text,
  org_country text,
  profile_full_name text
)
```

The function must exist and be executable by authenticated users:

```sql
grant execute on function public.create_organization_for_current_user(text, text, text, text) to authenticated;
```

## Fix Applied

- Added `src/lib/supabaseDiagnostics.ts` to format Supabase errors with `message`, `code`, `details`, `hint`, and `status`.
- Updated immediate auth data queries to throw readable diagnostic errors.
- Made `loadProductionData()` preserve the authenticated Supabase user before profile and organisation lookups.
- Made missing organisation membership a normal state, not a crash.
- Changed `loadData()` catch handling so an authenticated user remains authenticated even if profile or membership lookup fails.
- Added the RPC execution grant to `supabase/schema.sql`.

## Verification

1. Apply the latest `supabase/schema.sql`.
2. Confirm email confirmation is disabled in Supabase Auth settings, or confirm the email before testing login.
3. Register a new user.
4. Expected: user is authenticated and sent to `/onboarding`.
5. Create an organisation.
6. Expected: `organizations`, `organization_members`, and `profiles` rows are created.
7. Expected: user reaches `/dashboard`.
8. Log out.
9. Log in again.
10. Expected: user with membership goes directly to `/dashboard`.

If a Supabase query fails, the browser console and UI should now show a readable error including the query context and any Supabase `code`, `details`, or `hint`.
