# Auth And Onboarding Manual Test Plan

Use production mode unless a test explicitly says demo mode.

## Environment Setup

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_VIGILEN_APP_MODE=production`.
3. Set `NEXT_PUBLIC_SUPABASE_URL`.
4. Set `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Apply `supabase/schema.sql` to the Supabase project.
6. Start the app with `npm run dev`.

## Production Auth Tests

1. Visit `/dashboard` while signed out.
   - Expected: redirected to `/login`.
2. Visit `/onboarding` while signed out.
   - Expected: redirected to `/login`.
3. Create a new account on `/register`.
   - Expected: Supabase Auth user is created.
   - Expected: user lands on `/onboarding` if email confirmation is disabled.
   - If email confirmation is enabled, confirm email first, then log in.
4. Submit onboarding with no organisation name.
   - Expected: validation error.
5. Submit onboarding with organisation name, optional industry, and default country Ireland.
   - Expected: organization row is created.
   - Expected: organization_members row is created with role `Owner`.
   - Expected: profile row is created/updated with role `Owner`.
   - Expected: user lands on `/dashboard`.
6. Log out from the dashboard.
   - Expected: Supabase session is cleared and user returns to public pages.
7. Log in again.
   - Expected: user goes to `/dashboard`, not onboarding.
8. Use the password reset action on `/login`.
   - Expected: Supabase sends reset instructions for a registered email.

## Multi-Tenant Checks

1. Create user A and complete onboarding for organization A.
2. Create user B and complete onboarding for organization B.
3. While signed in as user A, inspect dashboard data queries and records.
   - Expected: only organization A rows are visible.
4. While signed in as user B, inspect dashboard data queries and records.
   - Expected: only organization B rows are visible.
5. Attempt to fetch or mutate organization A rows as user B using browser requests.
   - Expected: RLS denies access or returns no rows.

## Demo Mode Regression

1. Set `NEXT_PUBLIC_VIGILEN_APP_MODE=demo`.
2. Start the app.
3. Log in with any email and password.
   - Expected: demo/localStorage mode still works.
4. Remove demo mode and Supabase variables.
   - Expected: production auth actions fail clearly with missing Supabase environment messaging.
