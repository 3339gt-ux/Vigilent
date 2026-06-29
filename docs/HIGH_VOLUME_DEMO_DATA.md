# Overview360 High-Volume Demo Dataset Mode

This document describes the design, configuration, and safety controls for the **High-Volume Demo Dataset Mode** in the Overview360 platform.

## Purpose

The High-Volume Demo Dataset Mode is designed to stress-test UI components, grid layouts, global search, dashboards, reports, and performance. It populates local browser storage with several thousand related demo records.

## Dataset Statistics

The generated dataset comprises the following entities:

1. **People (200 records)**:
   - Generated with deterministic first names, last names, roles, and emails.
   - Distributed deterministically across 8 departments.
   - Classifications include Employee/Contractor and Active/Inactive statuses.

2. **Competency Types (300 records)**:
   - Covers 10 standard competency categories (Safety, Equipment & Vehicle, Transport, Security, Quality & Compliance, Environmental, Operational, Professional, Industry Certification, Other).
   - Generated with deterministic risk levels and validity periods.

3. **Competency Records (~1,500 records)**:
   - Mapped selectively based on the employee's department/role to model a realistic training matrix without bloating memory.
   - Produces approximately 1,500 saved records. Missing cells are inferred by the matrix where no record exists.

4. **Assets (200 records)**:
   - Distributed across Vehicles, Trailers, Forklifts, Facilities, and Equipment.
   - Includes generated parent/subcategory taxonomy records for category-tree testing.
   - Generated with unique registration plates, serial numbers, locations, and lead owners from the generated employee pool.

5. **Asset Check Assignments & Records (~600 records)**:
   - Assigns generic recurring checks based on the asset's category.
   - Sets status parameters (Valid, Due Soon, Overdue, Missing) and matches them to completed test log history.

6. **Requirements (100 records)**:
   - Advanced compliance framework requirements across 12 categories.
   - Includes GREEN, AMBER, and RED statuses with upcoming or overdue review dates.

7. **Evidence Records (500 records)**:
   - **Metadata-Only**: No files, storage object paths, public URLs, or signed URLs are generated.
   - Pre-linked to requirements, asset checks, and employee competency slots to simulate a connected compliance vault.
   - File preview/open actions correctly report that no private file is attached.

8. **Actions / Tasks (200 records)**:
   - Mapped follow-up actions in various states (Open, In Progress, Complete, Cancelled).

9. **Audit Trail Logs (100 records)**:
   - Recent activity events for non-administrative operations.

---

## Safety & Scoping Controls

To prevent data contamination and ensure compliance:

- **Local/Demo Containerization**: Seeding is strictly limited to local browser localStorage. The code verifies `NEXT_PUBLIC_VIGILEN_APP_MODE=demo` is active.
- **Supabase Guardrails**: When running in production mode, all seeding buttons are disabled and hidden from Settings. There are zero remote writes, migrations, or role escalations.
- **No Fabricated Signed URLs**: Evidence files remain strictly private, metadata-only links, avoiding mock URLs or unauthenticated file leak paths.
- **Mock Prefixes**: Primary user-facing records are prefixed with `[DEMO]`; relationship and history rows use generated IDs.

## Performance and Limitations

- The dataset is generated from a fixed random seed, while date fields remain relative to the day it is loaded.
- Data is stored in browser localStorage and may approach browser storage quotas when combined with unrelated local data.
- Evidence rows are metadata fixtures only; they cannot be previewed or downloaded.
- This mode is for local interface and performance testing, not production readiness or compliance validation.

---

## How to Load & Reset

1. Start the application locally with the demo environment variable:
   ```bash
   NEXT_PUBLIC_VIGILEN_APP_MODE=demo npm run dev
   ```
2. Navigate to **Account Settings** (`/dashboard/settings`).
3. Scroll down to **Demo Workspace Seeding & Diagnostics**.
4. Click **Load High-Volume Demo Dataset** and approve the confirmation dialog.
5. To revert, click **Reset to Standard Demo Dataset** or wipe the database clean using **Clear Demo Data**.
