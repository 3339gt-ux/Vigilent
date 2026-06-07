# Vygilence UI/UX Issue Register

This register catalogues all visual, spacing, layout, microcopy, accessibility, and consistency issues identified during the visual audit of the Vygilence application.

## Severity Level Definitions
* **Critical**: Prevents use, causes unreadable content, breaks mobile/theme usability, or exposes restricted data.
* **High**: Obstructs navigation/comprehension, makes a module look unfinished, or causes layout instability/shifts.
* **Medium**: Causes avoidable friction, styling inconsistencies, weak hierarchy, or poor microcopy.
* **Low**: Cosmetic issues, minor alignment tweaks, optional polish.

---

## Complete Issue Register

| Issue ID | Route / Module | Component / Location | Theme | Viewport | Observed Problem | Severity | Category | Recommended Improvement | Expected Benefit | Effort / Risk |
| :--- | :--- | :--- | :---: | :---: | :--- | :---: | :--- | :--- | :--- | :---: |
| **IS-001** | Evidence Matrix | Matrix Row Titles (`matrix/page.tsx:906`) | Dark | Tablet / Desktop | Sticky row titles shadow uses hardcoded black shadow borders, which look muddy or clip in Dark Mode. | **Medium** | Consistency | Switch shadow override to `var(--card-shadow)` and border variables. | Clean division boundaries between headers. | Low / Low |
| **IS-002** | Favourites Hub | Favourites Cards (`favourites/page.tsx:794`) | All | Mobile / Tablet | Grid layout on mobile doesn't collapse smoothly, creating text clipping for long titles. | **Medium** | Responsive | Wrap items in flex-col or apply truncate limits at standard breakpoints. | Eliminates cropped text. | Low / Low |
| **IS-003** | Reports Home | Custom Report Builder (`reports/page.tsx:3495`) | All | All | Dropdown lists for dimensions/measures display raw database keys instead of user-friendly names. | **High** | Trust | Map display names (e.g. `Requirement Title`) instead of DB columns (e.g. `requirement_title`). | Enhances enterprise suitability. | Medium / Low |
| **IS-004** | Global Themes | CSS variables (`globals.css:382`) | Midtone | All | Background (`--background`) and Card (`--card`) variables are too close in HSL, causing panels to merge visually. | **High** | Colour | Darken background token or lighten card surfaces. | Restores spatial layout hierarchy. | Low / Low |
| **IS-005** | Audit Packs | Expiry Warnings (`audit-packs/page.tsx:603`) | Dark | All | Expiry amber/red warnings have bright foreground colors, creating high visual noise. | **Medium** | Accessibility | Lighten borders and shift foreground opacity slightly. | Balanced, professional tone. | Low / Low |
| **IS-006** | Settings Page | API Credentials Input (`settings/page.tsx:330`) | Dark | Mobile | Token input field overflows container bounds on narrow viewports (360px). | **High** | Responsive | Add `w-full max-w-full overflow-hidden` or text-wrap limits. | Clears horizontal overflow defects. | Low / Low |
| **IS-007** | Dashboard | Obligation Forecast (`dashboard/page.tsx`) | All | All | Tooltips on radar items close instantly on mouse hover, preventing selection. | **Medium** | Interaction | Set dismiss hover lag to 150ms. | Intuitive desktop interaction. | Low / Low |
| **IS-008** | Competencies | Teammates Matrix (`competencies/page.tsx`) | All | Tablet / Mobile | Horizontal scroll of competencies leaves person name column static but without border line. | **High** | Layout | Add an explicit border-r on the sticky employee name cell when scrolled. | Preserves cell line boundaries. | Medium / Low |
| **IS-009** | Evidence Vault | Preview drawer (`vault/page.tsx`) | Midtone | All | File preview canvas has weak border outlines against the midtone drawer backdrop. | **Medium** | Spacing | Apply a solid border outline around preview bounds. | Clear focus boundaries. | Low / Low |
| **IS-010** | App Shell Shell | Navigation Sidebar (`layout.tsx:392`) | Light | Desktop | User avatar and Sign Out button are too close to the bottom container bounds. | **Low** | Spacing | Add `pb-6` padding to the sidebar footer. | Professional balance. | Low / Low |
| **IS-011** | Audit Trail | Log Detail Drawer (`audit-trail/page.tsx:116`) | All | Tablet / Mobile | Before/After JSON snapshot text block does not wrap, pushing the drawer layout bounds. | **High** | Responsive | Enable `pre-wrap` css styling on JSON code snapshots. | Restores clean drawer layout. | Low / Low |
| **IS-012** | Billing Page | Pricing Tiers Toggles (`billing/page.tsx:144`) | Midtone | All | Plan selection state uses solid indigo accents, which lose contrast on midtone slate cards. | **Medium** | Colour | Use clear border highlights instead of full block overlays. | Readability. | Low / Low |
| **IS-013** | Onboarding | Workspace Setup (`onboarding/page.tsx`) | All | All | Onboarding errors print raw PGRST database error codes to the user. | **High** | Trust | Map raw Supabase errors through translation functions. | Avoids exposing technical details. | Medium / Low |
| **IS-014** | Favourites Hub | Saved Views list (`favourites/page.tsx:418`) | All | All | Saved view list renders with "Starred View Filter Config" descriptions which are too technical. | **Medium** | Microcopy | Simplify description text to "Saved view configuration". | Clear purpose. | Low / Low |
| **IS-015** | Reports Detail | Export Buttons (`reports/detail/page.tsx:9`) | Light | Mobile | CSV and PDF export triggers stack on top of search bar, overlapping input text. | **High** | Layout | Move export triggers below search input on mobile views. | Fixes visual overlapping. | Medium / Low |
| **IS-016** | Favourites Hub | Confirm Removal Modal (`favourites/page.tsx:683`) | All | All | Modal does not dismiss if clicking outside the modal box boundaries. | **Medium** | Interaction | Add click-outside listener to close the modal. | Intuitive layout control. | Low / Low |
