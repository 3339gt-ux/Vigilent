# Vygilence UI/UX Microcopy Audit

This document audits user-facing text, disclaimers, warnings, and button labels across the Vygilence application.

## Key Vocabulary Constraints
1. **Favourite** (never "Starred" or "Bookmark" in user-visible text; variable names may remain but all UI labels must align).
2. **Organisation** (British English "s" spelling for all user-facing headers, form fields, and hints).
3. **Print / Save as PDF** (never "generated PDF" or "PDF export" if calling the native browser print dialogue).
4. **Personal Browser Report** / **Personal Account Report** / **Organisation Report** / **Scheduling** (clear labeling for active vs. deferred tiers).

---

## Detailed Copy Audit

| Issue ID | Route / Location | Component / File | Current Wording | Recommended Wording | Observed Problem | Severity | Affects Trust / Compliance |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **MC-001** | `/dashboard/requirements` | [FilterControls.tsx:L28](file:///c:/Vigilen/src/components/FilterControls.tsx#L28) | `StarredFilterSelect` | `FavouriteFilterSelect` | Inconsistent naming in component file import and export declarations. | **Medium** | No |
| **MC-002** | `/dashboard/matrix` | [matrix/page.tsx:L722](file:///c:/Vigilen/src/app/dashboard/matrix/page.tsx#L722) | `<StarredFilterSelect>` | `<FavouriteFilterSelect>` | The filter dropdown calls a component containing "Starred" in its name. | **Medium** | No |
| **MC-003** | `/dashboard/matrix` | [matrix/page.tsx:L781](file:///c:/Vigilen/src/app/dashboard/matrix/page.tsx#L781) | `Favourite Requirements only` | `Favourite Requirements only` | Correctly matches "Favourite", but the state hook is named `showOnlyStarredReqs`. | **Low** | No |
| **MC-004** | `/dashboard/vault` | [vault/page.tsx:L108](file:///c:/Vigilen/src/app/dashboard/vault/page.tsx#L108) | `showOnlyStarredDocs` | `showOnlyFavouriteDocs` | State variables inside the vault page use "Starred" instead of "Favourite". | **Low** | No |
| **MC-005** | `/dashboard/audit-packs` | [audit-packs/page.tsx:L688](file:///c:/Vigilen/src/app/dashboard/audit-packs/page.tsx#L688) | `Print / PDF` | `Print / Save as PDF` | Button implies server-side PDF compilation rather than browser printing. | **Medium** | Yes |
| **MC-006** | `/dashboard/audit-packs` | [audit-packs/page.tsx:L745](file:///c:/Vigilen/src/app/dashboard/audit-packs/page.tsx#L745) | `PDF` | `Print / Save as PDF` | Short label "PDF" implies an automatic file download rather than opening a print window. | **Medium** | Yes |
| **MC-007** | `/dashboard/reports` | [reports/page.tsx:L3605](file:///c:/Vigilen/src/app/dashboard/reports/page.tsx#L3605) | `Personal account report (Unavailable)` | `Personal Account Report (Unavailable)` | Lowercase spelling for "account" and "report" in option dropdown looks unpolished. | **Low** | No |
| **MC-008** | `/dashboard/reports` | [reports/page.tsx:L3609](file:///c:/Vigilen/src/app/dashboard/reports/page.tsx#L3609) | `Organisation report (Unavailable)` | `Organisation Report (Unavailable)` | Inconsistent capitalization of visibility options dropdown items. | **Low** | No |
| **MC-009** | `/dashboard/reports` | [reports/page.tsx:L3868](file:///c:/Vigilen/src/app/dashboard/reports/page.tsx#L3868) | `Scheduling is not configured` | `Scheduling is unavailable in this environment` | Suggests a database error or configuration failure rather than a product tier deferral. | **Medium** | Yes |
| **MC-010** | `/onboarding` | [onboarding/page.tsx:L93](file:///c:/Vigilen/src/app/onboarding/page.tsx#L93) | Raw postgres error string | `We could not create your organisation. Please try again.` | Exposing raw PGRST database error codes damages system credibility. | **High** | Yes |
| **MC-011** | `/onboarding` | [onboarding/page.tsx:L86](file:///c:/Vigilen/src/app/onboarding/page.tsx#L86) | `Create your organisation` | `Create your organisation` | Correct spelling, but ensure that "Organisation" with an "s" is consistently applied across all dialogs. | **Low** | No |
| **MC-012** | `/dashboard/organisation` | [organisation/page.tsx:L35](file:///c:/Vigilen/src/app/dashboard/organisation/page.tsx#L35) | `OrganisationManagement` | `OrganisationManagement` | Ensure public UI references use British English "s" (Organisation) rather than technical variables like `organization`. | **Low** | No |
| **MC-013** | `/dashboard/organisation` | [organisation/page.tsx:L165](file:///c:/Vigilen/src/app/dashboard/organisation/page.tsx#L165) | `Member invites require production onboarding...` | `Workspace invitations are unavailable in demo mode.` | Tooltip warning on invitation failures mentions "production onboarding" which sounds internal. | **Medium** | Yes |
| **MC-014** | `/dashboard/settings` | [settings/page.tsx:L52](file:///c:/Vigilen/src/app/dashboard/settings/page.tsx#L52) | `API token generation requires a production secrets service...` | `API Token generation is unavailable in demo mode.` | Alert message exposes internal backend infrastructure requirements. | **Medium** | Yes |
| **MC-015** | `/dashboard/settings` | [settings/page.tsx:L112](file:///c:/Vigilen/src/app/dashboard/settings/page.tsx#L112) | `Error seeding local demo data: ` + error | `Demo seeding failed. Please refresh your browser.` | Exposes raw stack trace properties to users during local seeds. | **High** | Yes |
| **MC-016** | `/dashboard/settings` | [settings/page.tsx:L608](file:///c:/Vigilen/src/app/dashboard/settings/page.tsx#L608) | `Seeding complete! 1,800+ demo compliance logs successfully loaded.` | `Seeding complete! 2,100+ database records successfully loaded.` | Hardcoded seed number contradicts actual loaded counts in high-volume states. | **Medium** | Yes |
| **MC-017** | `/dashboard/audit-trail` | [audit-trail/page.tsx:L51](file:///c:/Vigilen/src/app/dashboard/audit-trail/page.tsx#L51) | `getUndoUnavailableReason` | `getUndoUnavailableReason` | Code handles undo failures by saying "Permanent hard deletions cannot be undone" implying logs are deleted. | **High** | Yes |
| **MC-018** | `/dashboard/audit-trail` | [audit-trail/page.tsx:L64](file:///c:/Vigilen/src/app/dashboard/audit-trail/page.tsx#L64) | `System-level transaction logs cannot be undone.` | `Log transactions are immutable.` | Audit logs must declare total immutability rather than implying only "system-level" items are locked. | **High** | Yes |
| **MC-019** | `/dashboard/vault` | [vault/page.tsx:L1424](file:///c:/Vigilen/src/app/dashboard/vault/page.tsx#L1424) | `Delete permanently` | `Delete permanently (Archive recovery bypass)` | Destructive deletion warnings do not warn users about the loss of mapped compliance records. | **High** | Yes |
| **MC-020** | `/dashboard/organisation` | [organisation/page.tsx:L57](file:///c:/Vigilen/src/app/dashboard/organisation/page.tsx#L57) | `type: 'disable' or 'remove'` | `type: 'disable' or 'remove'` | Member deletion modal does not warn that removing users does not clear their audit logs. | **Medium** | Yes |
| **MC-021** | Global Shell | [layout.tsx:L303](file:///c:/Vigilen/src/app/dashboard/layout.tsx#L303) | `Vygilence is an evidence repository. It does not generate...` | `Vygilence is an evidence repository. It does not generate...` | Public banner disclaims liability, which is excellent. Ensure spelling is exactly "Vygilence". | **Low** | Yes |
| **MC-022** | `/dashboard/reports` | [reports/page.tsx:L3030](file:///c:/Vigilen/src/app/dashboard/reports/page.tsx#L3030) | `stored locally in your browser workspace` | `stored locally in your browser session` | "Browser workspace" is confusing and implies a persistent shared team workspace. | **Medium** | Yes |
| **MC-023** | `/dashboard/reports/detail` | [reports/detail/page.tsx:L315](file:///c:/Vigilen/src/app/dashboard/reports/detail/page.tsx#L315) | `Local Report` | `Personal Browser Report` | Inconsistent naming of locally saved custom configurations. | **Medium** | No |
| **MC-024** | `/dashboard` | [dashboard/page.tsx:L57](file:///c:/Vigilen/src/app/dashboard/page.tsx#L57) | `DashboardRecordTarget` | `DashboardRecordTarget` | Target descriptions in dashboard widgets use abbreviations like "Comp" instead of "Competency". | **Medium** | No |

---

## Detailed Rationale

### 1. "Starred" vs "Favourite" Alignment
Vygilence organizes user bookmarking under the "Favourites Hub". Exposing "Starred" in filters and column options creates visual confusion. Users expect a single, unified terminology for saving items. Variable names inside the code like `showOnlyStarredDocs` may remain to avoid breaking logical code hooks, but user-visible select dropdowns must consistently display "Favourite".

### 2. "Organisation" Spelling Rule
Vygilence strictly enforces British English spelling conventions for public UI and descriptions. Database schema fields like `organization_id` must use the "z" spelling to avoid breaking Supabase configurations, but user-visible headers, table labels, and error messages must use the "s" spelling (e.g. `Organisation setup`, `Workspace Organisation`).

### 3. Print / Save as PDF vs PDF
Vygilence does not generate PDF files server-side. Rather, it formats pages using CSS and prints them through the client's native browser print dialogue. Labeling buttons as "Download PDF" is deceptive and causes user friction if download folders remain empty. The action must be labeled "Print / Save as PDF".

### 4. Database Error Masking
Supabase database error messages contain database column names and schema structures. Leaking these messages directly to client viewports is a trust risk. All database exceptions must map through clean, generic text alerts that direct users on how to recover.
