# Vygilence High-Volume Demo Dataset Mode

This document describes the design, configuration, and safety controls for the **High-Volume Demo Dataset Mode** in the Vygilence platform.

## Purpose

The High-Volume Demo Dataset Mode is designed to stress-test the UI components, grid layouts, global search, dashboards, reports, and performance of the application. It populates local browser storage with over 1,000 realistic, mock-prefixed compliance logs.

## Dataset Statistics

The generated dataset comprises the following entities:

1. **People (200 records)**:
   - Generated with deterministic first names, last names, roles, and emails.
   - Distributed across 8 depots/departments: Warehouse (35%), Transport (25%), Fleet (10%), Quality & Compliance (8%), Security (5%), HR / Training (7%), Maintenance (5%), Office/Admin (5%).
   - Classifications include Full-Time/Contractor and Active/Inactive statuses.

2. **Competency Types (300 records)**:
   - Covers 10 standard competency categories (Safety, Equipment & Vehicle, Transport, Security, Quality & Compliance, Environmental, Operational, Professional, Industry Certification, Other).
   - Generated with deterministic warning windows (30/60/90 days), risk levels, and validity periods.

3. **Competency Records (~1,500 records)**:
   - Mapped selectively based on the employee's department/role to model a realistic training matrix without bloating memory.
   - Breakdown: 65% Valid, 15% Expired, 10% Expiring Soon, 10% Missing.

4. **Assets (200 records)**:
   - Divided into Vehicles (70), Trailers (50), Forklifts (30), Facilities (10), and Equipment (40).
   - Generated with unique registration plates, serial numbers, locations, and lead owners from the generated employee pool.

5. **Asset Check Assignments & Records (~600 records)**:
   - Assigns statutory checks (CVRT, Tachograph, LOLER, Fire Tests) based on the asset's category.
   - Sets status parameters (Valid, Due Soon, Overdue, Missing) and matches them to completed test log history.

6. **Requirements (100 records)**:
   - Advanced compliance framework requirements across 12 categories.
   - Includes RAG statuses (GREEN, AMBER, RED, GREY) and upcoming review dates.

7. **Evidence Records (500 records)**:
   - **Metadata-Only**: No actual large documents are generated. Records exist as private metadata objects stored locally in browser state.
   - Pre-linked to requirements, asset checks, and employee competency slots to simulate a connected compliance vault.

8. **Actions / Tasks (200 records)**:
   - Mapped corrective actions in various states (Open, In Progress, Complete, Cancelled) and priorities.

9. **Audit Trail Logs (100 records)**:
   - Recent activity events for non-administrative operations.

---

## Safety & Scoping Controls

To prevent data contamination and ensure compliance:

- **Local/Demo Containerization**: Seeding is strictly limited to local browser localStorage. The code verifies `NEXT_PUBLIC_VIGILEN_APP_MODE=demo` is active.
- **Supabase Guardrails**: When running in production mode, all seeding buttons are disabled and hidden from Settings. There are zero remote writes, migrations, or role escalations.
- **No Fabricated Signed URLs**: Evidence files remain strictly private, metadata-only links, avoiding mock URLs or unauthenticated file leak paths.
- **Mock Prefixes**: All generated records are clearly prefixed with `[DEMO]` to distinguish them from standard workspace data.

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
