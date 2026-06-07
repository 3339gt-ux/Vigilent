# Vygilence UI/UX Route Scorecard

This scorecard evaluates the primary routes and modules of the Vygilence application against 12 key criteria on a scale of 1 to 10.

## Scoring Scale
* **9.0–10.0**: Excellent. Production-ready, polished, consistent, and meets accessibility standards.
* **7.0–8.9**: Good. Usable for pilots, with minor styling details or responsiveness issues.
* **5.0–6.9**: Fair. Visible UI defects, alignment issues, or microcopy mismatches requiring polish before customer demos.
* **1.0–4.9**: Poor / Blocker. Breaks user flows, lacks responsive scaling, or fails security/compliance disclaimers.

---

## Overall Route Summary Table

| Route / Module | Route Path | Overall Average Score | Visual Polish | Hierarchy | Spacing | Colour / Theme | Typography | Layout Stability | Data Density | Navigation | Interaction | Accessibility | Responsive | Enterprise |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Auth & Onboarding** | `/login`, `/register`, `/onboarding` | **6.75** | 7.0 | 7.5 | 7.0 | 8.0 | 7.5 | 8.5 | 7.0 | 7.0 | 6.0 | 6.5 | 5.5 | 3.5 |
| **App Shell** | Sidebar, Headers, Notifications | **7.58** | 8.0 | 8.5 | 8.0 | 7.0 | 8.0 | 8.5 | 7.5 | 8.0 | 7.5 | 6.5 | 7.0 | 8.5 |
| **Dashboard** | `/dashboard` | **7.25** | 7.5 | 7.5 | 7.0 | 8.0 | 7.5 | 6.5 | 7.5 | 8.0 | 7.0 | 7.0 | 7.0 | 6.5 |
| **Requirements** | `/dashboard/requirements` | **7.46** | 7.5 | 7.5 | 8.0 | 8.0 | 7.5 | 8.5 | 7.0 | 8.0 | 7.5 | 7.0 | 6.5 | 6.5 |
| **Evidence Vault** | `/dashboard/vault` | **7.67** | 8.0 | 8.0 | 8.0 | 7.5 | 8.0 | 8.5 | 7.5 | 8.0 | 7.5 | 7.0 | 7.5 | 6.5 |
| **Evidence Matrix** | `/dashboard/matrix` | **6.71** | 6.5 | 6.5 | 7.0 | 6.0 | 7.0 | 8.0 | 8.0 | 7.5 | 7.0 | 5.5 | 6.0 | 5.5 |
| **Competency Matrix**| `/dashboard/competencies` | **6.92** | 7.0 | 7.0 | 7.5 | 7.5 | 7.0 | 8.0 | 8.5 | 7.5 | 7.0 | 5.5 | 5.5 | 5.0 |
| **Audit Trails** | `/dashboard/audit-*` | **7.29** | 8.0 | 8.0 | 8.0 | 7.5 | 8.0 | 8.5 | 7.5 | 8.0 | 7.0 | 6.5 | 6.0 | 4.0 |
| **Reports** | `/dashboard/reports/*` | **7.13** | 7.5 | 7.5 | 7.0 | 7.5 | 7.5 | 6.5 | 8.0 | 8.0 | 7.0 | 6.5 | 6.5 | 6.0 |
| **Favourites Hub** | `/dashboard/favourites` | **7.54** | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.5 | 7.5 | 8.0 | 7.0 | 7.0 | 6.5 | 8.0 |
| **Administration** | `/dashboard/organisation`, `/settings`, `/billing` | **7.25** | 7.5 | 7.5 | 7.5 | 7.0 | 7.5 | 8.5 | 7.0 | 8.0 | 7.0 | 6.5 | 6.5 | 8.5 |

**Calculated Overall Application Score**: **7.24 / 10**

---

## Module Scorecards & Justifications

### 1. Authentication & Onboarding (`/login`, `/register`, `/onboarding`)
* **Overall Score**: **6.75 / 10**
* **Explanation**: The visual branding of the authentication screens is clean, but major compliance issues (pre-checked operational disclaimers) and database error leaks during onboarding drag the overall readiness down.
* **Top 3 Strengths**:
  1. Clean 2-column promo layout on desktop screens with clear brand marks.
  2. Integrated warning notifications for input validation.
  3. Stable layout transitions on loading states.
* **Top 3 Weaknesses**:
  1. Disclaimer checkbox is initialized to `true` (operational bypass).
  2. Leaks raw PGRST/Supabase database errors directly to client viewport.
  3. The country selection in onboarding is hardcoded without select dropdown mappings.
* **Required Before Customer Demo**: Fix pre-checked disclaimers (`agreedDisclaimers` state set to false on load) to establish operational compliance.
* **Required Before Paid Pilot**: Map raw Postgres PGRST errors to user-friendly status banners.
* **Required Before General Production**: Integrate real country drop-down inputs mapping UK, Ireland, and continental shipping destinations.

### 2. Global Application Shell
* **Overall Score**: **7.58 / 10**
* **Explanation**: Extremely stable, beautiful persistent desktop sidebar, appearance selection toggles, and notification alerts. Usability on mobile drops due to header z-index conflicts and clipping.
* **Top 3 Strengths**:
  1. Premium bell wiggle animation on active alerts.
  2. Persistent, collapse-capable and pin-capable sidebar.
  3. Clear global regulatory warning banner at the top of the shell.
* **Top 3 Weaknesses**:
  1. Mobile menu toggle button z-index is too low (`z-30`), causing scroll elements to overlap.
  2. Mobile menu dropdown (z-30) overlaps main content but sits below mobile header (z-40) leading to clipping.
  3. Notification bell count badge truncates to `9+` even when dozens of alerts are seeded.
* **Required Before Customer Demo**: Fix mobile toggle z-index and header overlap so the menu displays properly on mobile viewports.
* **Required Before Paid Pilot**: Add screen reader helper labels (ARIA) to appearance selector icons.
* **Required Before General Production**: Apply a strict vertical height scroll limit (`max-h-[70vh] overflow-y-auto`) to the notification bell popup.

### 3. Dashboard Mission Control (`/dashboard`)
* **Overall Score**: **7.25 / 10**
* **Explanation**: High information density that gives a strong overview of compliance. Friction in interaction (radar chart hover tooltip lock) and card sizing shifts on mount require visual polish.
* **Top 3 Strengths**:
  1. "Attention Centre" gives immediate focus to overdue items.
  2. "Focus Mode" collapsing secondary panels is an excellent, polished layout choice.
  3. The quick action shortcuts form a great workspace gateway.
* **Top 3 Weaknesses**:
  1. Obligation forecast radar tooltips close instantly on hover, locking selection.
  2. Center statistics card containers shift size noticeably during data fetch.
  3. Quick action modals lack backdrop clicking dismissal hooks.
* **Required Before Customer Demo**: Fix the radar tooltip dismiss hover lag (set to 150ms) so users can interact with elements.
* **Required Before Paid Pilot**: Standardise statistics card container dimensions to eliminate visual layout shifts.
* **Required Before General Production**: Bind backdrop click dismiss handlers to all quick action modals.

### 4. Requirements Registry (`/dashboard/requirements`)
* **Overall Score**: **7.46 / 10**
* **Explanation**: A highly functional grid view. Needs spacing adjustments in compact mode and layer management in filters to feel enterprise-ready.
* **Top 3 Strengths**:
  1. Premium persistent view filters and saved search tags.
  2. CSV metadata exports are clean.
  3. Status tone chips map status levels clearly.
* **Top 3 Weaknesses**:
  1. Column visibility selector has no container boundary locks, overlapping buttons.
  2. Spacing in compact layout mode is slightly misaligned.
  3. Filter option items stack awkwardly on mobile widths.
* **Required Before Customer Demo**: Polish column visibility z-index layer limits.
* **Required Before Paid Pilot**: Adjust compact layout padding to prevent row clipping.
* **Required Before General Production**: Ensure mobile layouts stack filters cleanly in a toggleable accordion panel.

### 5. Evidence Vault (`/dashboard/vault`)
* **Overall Score**: **7.67 / 10**
* **Explanation**: An excellent file management portal with bulk uploads and metadata checks. Let down by weak visual contrast on preview panels in Midtone theme and missing scroll bounds in drawers.
* **Top 3 Strengths**:
  1. Bulk dropzone upload configuration wizard is clean and polished.
  2. Clear linking shortcuts to requirements and competencies.
  3. Archive view works cleanly.
* **Top 3 Weaknesses**:
  1. File preview canvas lacks borders against Midtone theme cards.
  2. Bulk metadata drawer has no max-height lock, extending beyond scroll boundaries.
  3. Inconsistent naming between "Starred" in filters and "Favourites" in shell.
* **Required Before Customer Demo**: Apply border outline contrast to document preview canvas in Midtone.
* **Required Before Paid Pilot**: Fix bulk action configuration drawer height limits.
* **Required Before General Production**: Standardise "Starred" terminology to "Favourite" in all filters and select fields.

### 6. Evidence Matrix (`/dashboard/matrix`)
* **Overall Score**: **6.71 / 10**
* **Explanation**: A dense grid mapping requirements to assets. Fails basic WCAG accessibility contrast limits in Light mode and horizontal scroll lacks visual column locks.
* **Top 3 Strengths**:
  1. Highly dense data overview that maps complex multi-tenant connections.
  2. Clear color-coded cells mapping compliance.
  3. Row hiding options work smoothly.
* **Top 3 Weaknesses**:
  1. "N/A" cell placeholders in Light mode have weak contrast (`text-muted-foreground/45`), failing WCAG rules.
  2. Sticky row headers have hardcoded black shadows that clip in Dark/Midtone.
  3. No visual vertical border locking name headers on horizontal scroll.
* **Required Before Customer Demo**: Increase "N/A" cell contrast to at least `text-muted-foreground/70` in Light mode.
* **Required Before Paid Pilot**: Fix the sticky cell shadow variables to adapt to the active theme palette.
* **Required Before General Production**: Add a vertical border dividing sticky headers from scrolled columns.

### 7. Competency Matrix (`/dashboard/competencies`)
* **Overall Score**: **6.92 / 10**
* **Explanation**: High volume employee mapping grid. Let down by column border loss on horizontal scroll and details drawer toast overlapping.
* **Top 3 Strengths**:
  1. Quick filters for roles, departments, and competency categories.
  2. Person details drawer splits metrics, documents, and updates cleanly.
  3. Sizing controls (comfortable vs compact) allow excellent scaling.
* **Top 3 Weaknesses**:
  1. Horizontal scroll leaves the sticky teammate name column without a divider border line.
  2. Toast notifications cover the close buttons of the person workspace drawer.
  3. Mobile stack of teammate cards clips long role descriptions.
* **Required Before Customer Demo**: Add a right border to teammate sticky name cell to prevent visual blending during horizontal scroll.
* **Required Before Paid Pilot**: Shift toast notification stacking coordinates so they do not overlap drawer close buttons.
* **Required Before General Production**: Standardise mobile card truncation limits for long text strings.

### 8. Audit Trails & Pack Builder (`/dashboard/audit-trail`, `/dashboard/audit-packs`)
* **Overall Score**: **7.29**
* **Explanation**: Highly robust audit trail logs and pack creation wizard. Severely impacted by undo warning disclaimers that conflict with audit immutability standards, and lack of mobile JSON formatting.
* **Top 3 Strengths**:
  1. Multi-step audit pack builder wizard is visually stunning.
  2. Before/after state snapshot comparisons are clear.
  3. Log detail drawers segment actors and IP addresses cleanly.
* **Top 3 Weaknesses**:
  1. Event undo warnings imply database mutability, breaching audit trail immutability claims.
  2. Before/after JSON logs are rendered side-by-side in a 2-column grid that overflows on mobile.
  3. Export PDF button text labeled simply as "PDF" or "Print / PDF" instead of "Print / Save as PDF".
* **Required Before Customer Demo**: Rewrite PDF buttons to state "Print / Save as PDF" consistently.
* **Required Before Paid Pilot**: Force JSON snapshots to collapse to a single column on mobile screen widths.
* **Required Before General Production**: Reframe the "Undo" log messaging as a reverse compensating transaction to uphold compliance requirements.

### 9. Reporting & Analytics Suite (`/dashboard/reports`, `/dashboard/reports/detail`)
* **Overall Score**: **7.13 / 10**
* **Explanation**: A comprehensive custom reporting suite with pivot tables. Let down by lack of CSS print styling and mathematical rounding bugs in pivot tables.
* **Top 3 Strengths**:
  1. Chart focus modals isolate compliance indicators.
  2. Report Catalogue matches corporate auditing requirements.
  3. Saved reports management is clean.
* **Top 3 Weaknesses**:
  1. No print layout classes or media queries in `globals.css` (distorted print output).
  2. Rounding calculations inside pivot cells can result in a column sum exceeding 100%.
  3. PDF export buttons on mobile stack directly over the search inputs.
* **Required Before Customer Demo**: Move PDF/CSV export buttons below search inputs on mobile viewport sizes to prevent overlaps.
* **Required Before Paid Pilot**: Fix pivot grid rounding calculations to ensure totals sum exactly to 100%.
* **Required Before General Production**: Implement print style sheets in `globals.css` to hide headers, sidebars, and optimize fonts for physical paper exports.

### 10. Favourites Hub (`/dashboard/favourites`)
* **Overall Score**: **7.54 / 10**
* **Explanation**: Excellent aggregation point for bookmarks. Needs modal polish (lack of click-outside close) and mobile grid card wrapping to be production-ready.
* **Top 3 Strengths**:
  1. Segments bookmarks across four different modules under custom tabs.
  2. Action shortcuts back to source dashboard layouts.
  3. Clean empty states when filters do not yield matches.
* **Top 3 Weaknesses**:
  1. Confirm removal modal lacks backdrop click dismissal, locking screen.
  2. Mobile grid layout wraps long titles onto multiple lines, clipping boundaries.
  3. Saved view filters contain confusing technical descriptors.
* **Required Before Customer Demo**: Add click-outside backdrop event listeners to close the confirmation modal.
* **Required Before Paid Pilot**: Wrap grid card elements in responsive layouts to prevent mobile layout clipping.
* **Required Before General Production**: Simplify description text to human-readable strings.

---

## Shared Component Scorecard

These components are used globally across routes.

| Shared Component | Visual Polish | Consistency | Spacing | Theme Adaptability | Accessibility | Responsive | Overall Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Buttons & Action Triggers** | 8.0 | 7.5 | 8.0 | 7.0 | 7.0 | 7.5 | **7.50** |
| **Form Inputs (Text, Select)** | 7.5 | 8.0 | 7.5 | 7.0 | 7.5 | 7.0 | **7.42** |
| **Dropdowns & Popovers** | 7.0 | 7.5 | 7.5 | 6.5 | 6.0 | 6.0 | **6.75** |
| **Modals & Dialog Overlays** | 8.0 | 8.0 | 8.0 | 7.5 | 6.5 | 7.0 | **7.50** |
| **Drawers & Slide-outs** | 8.0 | 8.5 | 7.5 | 7.5 | 7.0 | 7.0 | **7.58** |
| **Tables & Data Grids** | 7.0 | 7.5 | 7.0 | 6.5 | 6.0 | 6.0 | **6.67** |
| **Toasts & Notifications** | 8.5 | 8.0 | 8.0 | 8.5 | 8.0 | 8.0 | **8.17** |
| **Pagination Controls** | 8.0 | 8.5 | 8.0 | 8.0 | 8.0 | 7.5 | **8.00** |
