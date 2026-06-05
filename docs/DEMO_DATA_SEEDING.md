# Vygilence Demo Data Seeding & Reset System

This document outlines the design, safety features, data characteristics, and execution instructions for the Vygilence demo data seeding and reset system. It is designed to safely populate local/demo environments or remote Supabase databases with high-volume, realistic compliance data for testing scale and visual layout fidelity.

---

## 1. Summary of Generated Data & Counts

The system seeds a deterministic, highly-connected compliance dataset spanning **15 database tables**:

| Module / Entity | Table Name | Target Count | Seed Identifiers / Tags |
| :--- | :--- | :--- | :--- |
| **Organizations** | `organizations` | 1 | ID: `00000000-0000-0000-0000-d3e0d3e0d3e0`<br>Name: `Vygilence Demo Logistics Ltd` |
| **Profiles** | `profiles` | 1 | Name: `Demo Administrator`<br>Role: `Owner` |
| **Organization Members** | `organization_members` | 1 | Binds user `a001a001a001` to organization `d3e0d3e0d3e0` |
| **People / Employees** | `people` | 120 | Last names suffixed with `[DEMO]` |
| **Competency Types** | `competency_types` | 35 | Title prefixed with `[DEMO]` |
| **Competency Records** | `competency_records` | 350 | Connects people to competency types (Valid, Expired, Expiring Soon, Missing) |
| **Competency Record Docs** | `competency_record_documents` | ~240 | Links evidence documents to competency records |
| **Requirements** | `requirements` | 100 | Title prefixed with `[DEMO]` (GREEN, AMBER, RED, GREY statuses) |
| **Requirement Docs** | `requirement_documents` | ~110 | Links evidence documents to requirements |
| **Evidence Criteria** | `requirement_evidence_criteria` | 154 | Title prefixed with `[DEMO]` |
| **Criteria Matches** | `requirement_evidence_criterion_matches` | 53 | Connects criteria to uploaded files |
| **Actions** | `actions` | 180 | Title prefixed with `[DEMO]` (Open, In Progress, Complete, Cancelled) |
| **Requirement Actions** | `requirement_actions` | ~110 | Links actions to requirements |
| **Action Documents** | `action_documents` | ~40 | Links evidence documents as closure proof to actions |
| **Action Updates** | `action_updates` | ~90 | Logged comments on actions |
| **Audit Packs** | `audit_packs` | 20 | Name prefixed with `[DEMO]` (Draft, Ready, Sent, Archived) |
| **Audit Trail Events** | `audit_trail_events` | 500 | Tagged in metadata: `{"seeded_demo": true}` (Last 90 days) |
| **Matrix Cells** | `matrix_cells` | 80 | Binds requirements to facility units/vehicles |

---

## 2. Environment Variables & Credentials

Seeding a remote Supabase instance requires **bypass privileges** for Row Level Security (RLS) policies.

> [!WARNING]
> Do NOT commit service-role keys or private tokens to public repositories. Ensure `SUPABASE_SERVICE_ROLE_KEY` is added only to local, git-ignored `.env.local` files.

### Configuration Checklist (`.env.local`)
```bash
# Vygilence Mode (Set to "demo" for browser localStorage, or "production" for Supabase)
NEXT_PUBLIC_VIGILEN_APP_MODE=production

# Supabase target API configurations
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Private service-role key (Required for remote seeding scripts only)
SUPABASE_SERVICE_ROLE_KEY=your-private-service-role-key-never-share-this
```

---

## 3. Remote Supabase Safety & Isolation

To protect production and client data, the CLI seeding scripts enforce **strict safety boundaries**:

1. **Explicit Target Only:** Seeding and resets *only* target the organization ID `00000000-0000-0000-0000-d3e0d3e0d3e0` and the name `Vygilence Demo Logistics Ltd`.
2. **Safety Abort Gate:** If the organization ID `d3e0d3e0d3e0` exists in the database but maps to any name *other* than `Vygilence Demo Logistics Ltd`, the script immediately exits to prevent modifying or replacing client data.
3. **No Polluting Production:** Real organization rows are untouched.
4. **Bypassing Triggers Safely:** Immutable audit trail constraints are preserved. Demo events are inserted directly without triggering manual errors.

### Reset Confirmation Required
Destructive operations on Supabase require the `--confirm` command-line flag. Without it, the script exits immediately with instructions.

---

## 4. Execution Commands

### A. Local / Browser localStorage Demo Mode
For rapid visual review inside local localStorage/demo mode:
1. Ensure `NEXT_PUBLIC_VIGILEN_APP_MODE=demo` is set.
2. In the browser, navigate to the **Settings** page: `/dashboard/settings`.
3. Under the **High-Volume Demo Data Seeding** card:
   - Click **Seed High-Volume Demo Data** to populate localStorage.
   - Click **Reset to Default Sandbox** to clear data.

### B. Remote/Local Supabase Database (CLI)
Run these commands from the project root:

```bash
# Seed the Supabase database (Idempotent upserts)
npm run seed:demo

# Reset and delete the Supabase demo data (Requires --confirm flag)
npm run reset:demo -- --confirm
```

---

## 5. Verification inside the Application

After seeding, log in to verify performance and scaling layouts:

1. **Authentication:**
   - **Email:** `demo.administrator@demologistics.example.com`
   - **Password:** `demoPassword123!`
2. **Dashboard Visuals:** Verify that the readiness percentage widget loads quickly. The floating card dashboard remains correctly aligned under high volumes.
3. **Evidence Vault:** Check that 300+ items paginate smoothly or load correctly.
4. **Competency Matrix:** Confirm that the grid of 120 employees and 35 competency types displays the proper statuses (Valid, Expired, Expiring Soon, Missing) without layout shifts.
5. **Audit Trail:** Navigate to `/dashboard/audit-trail` (only visible to the seeded Owner/Admin user) and verify that 500 events are listed with paginated loading.

---

## 6. Manual Cleanup & Auth Caveats

Cascading foreign keys handles database records cleanup. However, Supabase Auth user management is handled outside the schema cascade:

- **Auth Cleanup:** The reset script attempts to delete the auth user `00000000-0000-0000-0000-a001a001a001` automatically using `supabase.auth.admin.deleteUser`.
- **Manual Dashboard Cleanup:** If the script prints a warning that auth deletion failed, log in to the Supabase Console, navigate to **Authentication -> Users**, and delete `demo.administrator@demologistics.example.com` manually.
