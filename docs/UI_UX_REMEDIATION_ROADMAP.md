# Vygilence UI/UX Remediation Roadmap

This roadmap structures the identified UI/UX and visual bugs into prioritised development tasks.

---

## Suggested Owners
* **Antigravity**: Best suited for styling tweaks, markup adjustments, z-index layers, responsive scaling, and CSS tokens.
* **Codex**: Best suited for logic, React hooks state mapping, routing queries, database error translators, and accessibility focus traps.
* **Manual visual review**: Human-led design inspection and graphical UAT verification.

---

## 1. Top 10 Quick Wins
*Low effort (<1 hour), low risk, immediate high visual or compliance benefit.*

| Task ID | Issue ID | Affected Page | Exact Fix | Suggested Owner | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **QW-001** | **IS-020** | `/login` | Set initial `agreedDisclaimers` state to `false` in [login/page.tsx](file:///c:/Vigilen/src/app/login/page.tsx). | Antigravity | Checkbox is unchecked on page load; form submission blocked. |
| **QW-002** | **IS-021** | `/register` | Set initial `agreedDisclaimers` state to `false` in [register/page.tsx](file:///c:/Vigilen/src/app/register/page.tsx). | Antigravity | Checkbox is unchecked on register load; register form blocked. |
| **QW-003** | **IS-030** | Global Shell | Set mobile navigation menu toggle button z-index explicitly to `z-50` in [layout.tsx](file:///c:/Vigilen/src/app/dashboard/layout.tsx). | Antigravity | Menu button sits on top of all scrolling page content on mobile. |
| **QW-004** | **IS-001** | `/dashboard/matrix` | Change row titles shadow to use adaptive variables: `shadow-[4px_0_8px_-4px_var(--card-shadow)]` in [matrix/page.tsx](file:///c:/Vigilen/src/app/dashboard/matrix/page.tsx). | Antigravity | Divider shadow adapts to dark/midtone background cards. |
| **QW-005** | **IS-010** | Global Shell | Add `pb-6` padding to the desktop sidebar footer element container in [layout.tsx](file:///c:/Vigilen/src/app/dashboard/layout.tsx). | Antigravity | Sidebar bottom controls have balanced vertical spacing. |
| **QW-006** | **IS-023** | `/dashboard/settings` | Update success status message text from "1,800+" to "2,100+" database records in [settings/page.tsx](file:///c:/Vigilen/src/app/dashboard/settings/page.tsx). | Antigravity | Displayed text reflects exact seeded records totals. |
| **QW-007** | **IS-026** | `/dashboard/audit-packs` | Rename pack export action button labels to "Print / Save as PDF" in [audit-packs/page.tsx](file:///c:/Vigilen/src/app/dashboard/audit-packs/page.tsx). | Antigravity | Buttons match standard reports terminology. |
| **QW-008** | **IS-016** | `/dashboard/favourites` | Bind click listener on modal backdrop overlay to clear selection: `onClick={() => setConfirmItem(null)}` in [favourites/page.tsx](file:///c:/Vigilen/src/app/dashboard/favourites/page.tsx). | Antigravity | Clicking outside modal closes confirmation panel cleanly. |
| **QW-009** | **IS-033** | Global Shell | Increase bell badge count display threshold to `99+` in [NotificationBell.tsx](file:///c:/Vigilen/src/components/NotificationBell.tsx). | Antigravity | Unread alert count reads exactly up to 99 before truncating. |
| **QW-010** | **IS-029** | Global Shell | Apply Tailwind transition classes (`transition-all duration-150 scale-95 hover:scale-100`) to collapsed sidebar tooltips in [layout.tsx](file:///c:/Vigilen/src/app/dashboard/layout.tsx). | Antigravity | Tooltips scale and fade in smoothly on hover. |

---

## 2. Top 10 Highest-Value Fixes
*High impact on user flow, compliance safety, accessibility, or core system trust.*

| Task ID | Issue ID | Affected Page | Exact Fix | Suggested Owner | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **HV-001** | **IS-013** | `/onboarding` | Translate raw Supabase error messages inside the catch block in [onboarding/page.tsx](file:///c:/Vigilen/src/app/onboarding/page.tsx). | Codex | Error displays user-friendly recovery instructions, hiding PGRST code. |
| **HV-002** | **IS-003** | `/dashboard/reports` | Map database keys to user-friendly names in report builder selectors in [reports/page.tsx](file:///c:/Vigilen/src/app/dashboard/reports/page.tsx). | Codex | Dropdowns display readable names like "Requirement Title" instead of DB keys. |
| **HV-003** | **IS-008** | `/dashboard/competencies` | Add an explicit right border (`border-r border-border`) to the sticky employee name cells in [competencies/page.tsx](file:///c:/Vigilen/src/app/dashboard/competencies/page.tsx). | Antigravity | Vertical separator remains visible when grid is scrolled horizontally. |
| **HV-004** | **IS-042** | `/dashboard/organisation` | Implement a focus trap wrapper (or native dialog element) for member editing in [organisation/page.tsx](file:///c:/Vigilen/src/app/dashboard/organisation/page.tsx). | Codex | Keyboard Tab navigation is contained inside modal; cannot escape to page. |
| **HV-005** | **IS-011** | `/dashboard/audit-trail` | Convert snapshot columns grid from `grid-cols-2` to responsive `grid-cols-1 md:grid-cols-2` in [audit-trail/page.tsx](file:///c:/Vigilen/src/app/dashboard/audit-trail/page.tsx). | Antigravity | JSON files stack vertically on mobile drawer views, preventing character wrapping. |
| **HV-006** | **IS-031** | Global Shell | Set mobile dropdown container z-index to `z-40` (matching mobile header) in [layout.tsx](file:///c:/Vigilen/src/app/dashboard/layout.tsx). | Antigravity | Mobile navigation panel stays fully on top of scrolled page content. |
| **HV-007** | **IS-027** | `/dashboard/audit-trail` | Rephrase audit event rollbacks to represent append-only compensatory entries in [audit-trail/page.tsx](file:///c:/Vigilen/src/app/dashboard/audit-trail/page.tsx). | Codex | Warnings state that original records remain immutable and reversing logs are recorded. |
| **HV-008** | **IS-039** | `/dashboard/matrix` | Darken unlinked cell placeholder text to `text-muted-foreground/75` in [matrix/page.tsx](file:///c:/Vigilen/src/app/dashboard/matrix/page.tsx). | Antigravity | Placeholders meet WCAG minimum contrast requirements in Light mode. |
| **HV-009** | **IS-025** | `/dashboard/reports` | Apply the largest-remainder method to calculate percentage totals in [reports/page.tsx](file:///c:/Vigilen/src/app/dashboard/reports/page.tsx). | Codex | Column total percentages sum exactly to 100% in pivot displays. |
| **HV-010** | **IS-007** | `/dashboard` | Add a 150ms hover exit delay configuration to obligation radar chart tooltips in [dashboard/page.tsx](file:///c:/Vigilen/src/app/dashboard/page.tsx). | Antigravity | Tooltips do not dismiss instantly when moving pointer to details links. |

---

## 3. Top 10 Structural Improvements
*Design-system level upgrades, CSS token changes, or global accessibility refactoring.*

| Task ID | Issue ID | Affected Page | Exact Fix | Suggested Owner | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **SI-001** | **IS-004** | Global CSS | Darken midtone theme background HSL variable to `218 15% 22%` in [globals.css](file:///c:/Vigilen/src/app/globals.css). | Antigravity | Cards have distinct contrast against page backgrounds in Midtone. |
| **SI-002** | **IS-028** | Global CSS | Add a comprehensive `@media print` style sheet block to [globals.css](file:///c:/Vigilen/src/app/globals.css). | Antigravity | Browser prints force white backgrounds, hide shell bars, and scale text. |
| **SI-003** | **IS-034** | Global Shell | Add explicit screen reader labels (aria-labels) to theme selection icons in [layout.tsx](file:///c:/Vigilen/src/app/dashboard/layout.tsx). | Antigravity | Assistive technologies read descriptive actions for theme selectors. |
| **SI-004** | **IS-032** | Global Shell | Set a strict max-height cap (`max-h-[70vh] overflow-y-auto`) on notifications list container in [NotificationBell.tsx](file:///c:/Vigilen/src/components/NotificationBell.tsx). | Antigravity | Alert list has scrollable bounds, keeping action buttons on-screen. |
| **SI-005** | **IS-017** | `/dashboard` | Bind click-outside dismissal event listener to Quick Actions modals in [dashboard/page.tsx](file:///c:/Vigilen/src/app/dashboard/page.tsx). | Codex | Clicking modal backdrop closes overlay dialog. |
| **SI-006** | **IS-018** | `/dashboard` | Bind click-outside backdrop dismissal to Upload Evidence modals in [dashboard/page.tsx](file:///c:/Vigilen/src/app/dashboard/page.tsx). | Codex | Clicking modal backdrop closes upload modal. |
| **SI-007** | **IS-019** | `/dashboard` | Bind click-outside backdrop dismissal to full Activity Log dialog in [dashboard/page.tsx](file:///c:/Vigilen/src/app/dashboard/page.tsx). | Codex | Clicking backdrop closes activity logs drawer. |
| **SI-008** | **IS-040** | `/dashboard/competencies` | Reposition global toast notifications overlay stack away from drawer headers in [competencies/page.tsx](file:///c:/Vigilen/src/app/dashboard/competencies/page.tsx). | Antigravity | Toasts do not cover close buttons inside details drawers. |
| **SI-009** | **IS-035** | `/dashboard` | Reserve container dimensions by setting fixed min-heights on overview summary cards in [dashboard/page.tsx](file:///c:/Vigilen/src/app/dashboard/page.tsx). | Antigravity | Cards do not shift page layout heights on mounting statistics. |
| **SI-010** | **IS-036** | `/dashboard` | Shift Compliance Radar popover alignment dynamically based on viewport dimensions in [dashboard/page.tsx](file:///c:/Vigilen/src/app/dashboard/page.tsx). | Antigravity | Popover does not clip off-screen under expanded sidebar views on laptops. |

---

## 4. Phase-by-Phase Execution Details

### Phase 1: Immediate Critical Fixes
Focus: Resolve visual locks, overlapping menu buttons, and compliance bypasses.
* **RM-001**: Fix registration/login disclaimer pre-checked states (**IS-020**, **IS-021**).
* **RM-002**: Fix mobile navigation toggle button z-index and menu panel clipping (**IS-030**, **IS-031**).
* **RM-003**: Fix CSV/PDF export triggers overlapping search bar on mobile screens (**IS-015**).
* **RM-004**: Fix API token input field overflowing container widths on mobile settings card (**IS-006**).

### Phase 2: High-Priority Pilot Readiness
Focus: Spacing and layout alignment, theme contrast, and modal controls.
* **RM-005**: Resolve Midtone theme backgrounds and cards bleeding together (**IS-004**).
* **RM-006**: Lock divider borders on Competency and Evidence matrices during scrolls (**IS-008**, **IS-055**).
* **RM-007**: Implement modal focus traps for accessibility compliance (**IS-042**).
* **RM-008**: Force side-by-side JSON snapshot drawers to stack on mobile viewports (**IS-011**).
* **RM-009**: Adjust Compliance Radar popover alignment to prevent desktop bleeding (**IS-036**).

### Phase 3: Medium-Priority Customer Polish
Focus: microcopy alignment, error text masking, and tooltip interactions.
* **RM-010**: Replace all database keys with user-friendly strings in reports custom builder (**IS-003**).
* **RM-011**: Translate Postgres connection warning codes during onboarding (**IS-013**).
* **RM-012**: Map largest-remainder calculations to correct reports pivot percentages totals (**IS-025**).
* **RM-013**: Adjust radar tooltips exit delay to prevent instant dismissals (**IS-007**).
* **RM-014**: Standardise "Starred" terminology to "Favourite" in all filter dropdowns (**MC-001**, **MC-002**).

### Phase 4: Low-Priority Refinements
Focus: Visual details, animations, and spacing tweaks.
* **RM-015**: Add hover scaling and fade-in transitions to collapsed sidebar navigation tooltips (**IS-029**).
* **RM-016**: Add padding spacing to the sidebar bottom footer area (**IS-010**).
* **RM-017**: Update seed loader metrics text to report exact seeded counts (**IS-023**).
* **RM-018**: Expand unread alert badge truncation limits in the notification bell (**IS-033**).

### Phase 5: Structural Design-System Work
Focus: Global stylesheets and standard components updates.
* **RM-019**: Write a comprehensive print styling media sheet in CSS (**IS-028**).
* **RM-020**: Apply backdrop click handlers to exit modals and overlays (**IS-016**, **IS-017**, **IS-018**, **IS-019**).
* **RM-021**: Darken faint matrix text to pass Light mode WCAG contrast guidelines (**IS-039**).
