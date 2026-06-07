# Vygilence UI/UX Design System Findings

This document evaluates the styling structure, typography tokens, layout spacing, control hierarchies, and visual theme adaptability across the Vygilence application.

---

## 1. Core Theme Findings

| Finding ID | Element / Theme | Current Behaviour | Recommended Token / Component Change | Modules Affected | Risk | Benefit |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **DS-001** | **Light Theme** | Faint borders (`border-border`: `220 15% 89%`) are too washed out, losing visibility on lower-contrast office displays. | Darken border variables in Light mode settings: change `--border` token to `220 15% 82%`. | All modules | Low | Improved container separation. |
| **DS-002** | **Midtone Theme** | Background (`218 15% 30%`) and card (`218 14% 36%`) colors are too close, causing surfaces to merge and shadows to disappear. | Change `--background` to a darker HSL value: `218 15% 22%` under `root.midtone` class overrides in [globals.css](file:///c:/Vigilen/src/app/globals.css). | All modules | Low | Re-established spatial layout elevation. |
| **DS-003** | **Dark Theme** | Expired/Warning status badges (bright red/amber) are highly saturated, causing visual vibration against dark slates. | Decrease badge color saturation inside dark media selectors: change `--expired` HSL values to a softer hue. | Matrix, Vault, Competencies | Low | Balanced, professional compliance alerts. |

---

## 2. Layout, Cards & Borders

| Finding ID | Element | Current Behaviour | Recommended Token / Component Change | Modules Affected | Risk | Benefit |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **DS-004** | **Border Tokens** | Cards use different border weights (`border` vs `border-2`) depending on the active interface style (focused, command-centre, executive), causing layout shifts when switching styles. | Standardise layout classes by applying dynamic variables (`border-[var(--card-border-width)]`) instead of hardcoded numbers. | Global Shell | Medium | High layout stability across styles. |
| **DS-005** | **Card Backgrounds** | Card gradients in Command Centre style (`linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--muted)/0.25) 100%)`) look muddy in Midtone appearance because cards blend with backgrounds. | Disable card gradients inside the `root.midtone` selector to keep card surfaces solid: `--card-gradient: none`. | Dashboard, Reports | Low | Cleaner card boundaries in Midtone. |

---

## 3. Data Tables & Matrix Grids

| Finding ID | Element | Current Behaviour | Recommended Token / Component Change | Modules Affected | Risk | Benefit |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **DS-006** | **Table Styles** | Column header heights and padding vary between requirements, vault, and details list tables. | Implement a unified class mapping (`h-11 px-4 py-3 align-middle`) on all standard `thead th` tags. | Requirements, Vault, Reports | Low | Highly consistent table headers. |
| **DS-007** | **Matrix Styles** | The sticky column title shadow (`shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]`) is hardcoded to black, looking incorrect in Dark/Midtone modes. | Map shadow to the card-shadow variable inside [globals.css](file:///c:/Vigilen/src/app/globals.css): `shadow-[4px_0_8px_-4px_var(--card-shadow)]`. | Evidence Matrix, Competencies | Low | Adaptive, theme-compliant column divides. |
| **DS-008** | **Matrix Divider Line** | Horizontal scroll of competencies leaves person name column static but without a right divider border line. | Apply an explicit right border class (`border-r border-border`) to the sticky employee name cell container. | Competency Matrix | Medium | Locked column orientation during scrolls. |

---

## 4. Inputs, Dropdowns & Modals

| Finding ID | Element | Current Behaviour | Recommended Token / Component Change | Modules Affected | Risk | Benefit |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **DS-009** | **Buttons** | Secondary buttons (`bg-muted hover:bg-muted/80 text-foreground`) lack border outlines, making them blend with card backgrounds. | Add an explicit border outline `border-border/80` to all secondary buttons to separate them. | Global Shell | Low | Improved call-to-action visibility. |
| **DS-010** | **Dropdowns** | Native select controls in dark mode bypass outlines on focus, reverting to system defaults. | Apply Tailwind focus ring styling globally: `focus:ring-1 focus:ring-indigo-500` on input selects. | Settings, Forms | Low | Clean visual focus indicators. |
| **DS-011** | **Modals** | Overlay modal containers lack backdrop click listeners, locking page dismissal. | Bind backdrop mouse click dismiss handlers to all quick action and confirmation modals. | Dashboard, Favourites | Medium | Smooth modal dismissal flows. |
| **DS-012** | **Drawers** | Details drawers overlap floating toasts, causing actions to block each other. | Adjust drawer z-index stacks or reposition toasts to avoid collisions. | Competencies, Shell | Low | Accessible action headers. |

---

## 5. System Notifications, Badges & Chips

| Finding ID | Element | Current Behaviour | Recommended Token / Component Change | Modules Affected | Risk | Benefit |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **DS-013** | **Toasts** | Inline toast notifications use static border values that look harsh under Light appearance. | Switch inline toasts to use `border-border/60` and apply card styling classes. | Global Shell | Low | Elegant visual alerts. |
| **DS-014** | **Badges** | Compliance status badges use highly saturated background blocks, looking loud on dense pages. | Shift badges to a subtle background tint (`bg-muted/60` with a colored dot indicator) for high-volume views. | Matrix, Competencies | Low | Professional, balanced data representation. |
| **DS-015** | **Chips** | Active filter chips stack awkwardly on mobile viewports, extending beyond card bounds. | Wrap filter chips inside a flex-wrap container with `gap-1.5` padding controls. | Requirements, Vault | Low | Clean responsive wrapping. |
| **DS-016** | **Pagination** | Page size selection dropdown lacks footer separation padding. | Add `mr-3` margin alignment to pagination select elements. | Vault, Requirements | Low | Balanced table footers. |

---

## 6. Charts & Print Layouts

| Finding ID | Element | Current Behaviour | Recommended Token / Component Change | Modules Affected | Risk | Benefit |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **DS-017** | **Charts** | Radar chart tooltip containers dismiss instantly on mouse hover. | Set dismiss hover lag to 150ms in charting tooltip configuration files. | Dashboard | Low | Accessible hover states. |
| **DS-018** | **Print Styles** | There are no print styles defined in `globals.css`, causing dark backgrounds to print as solid black blocks. | Implement a dedicated `@media print` style sheet to hide nav bars, sidebars, headers and force white backgrounds. | Reports, Audit Packs | Medium | Printable compliance records that conserve ink. |

---

## Token Adjustments Recommendation in `globals.css`

To apply the required changes, add the following CSS token overrides to the global stylesheet:

```css
/* Recommended Midtone Border & Background contrast overrides */
:root.midtone {
  --background: 218 15% 22%;
  --border: 216 12% 42%;
  --muted-foreground: 215 18% 85%;
  --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
}

/* Enforced Select focus styling globally */
select:focus, input:focus, textarea:focus {
  border-color: hsl(var(--indigo-500)) !important;
  box-shadow: 0 0 0 1px hsl(var(--indigo-500)/0.3) !important;
}

/* Accessibility Focus Outline fallback */
button:focus-visible, a:focus-visible {
  outline: 2px solid hsl(var(--indigo-550));
  outline-offset: 2px;
}

/* Print Layout rules */
@media print {
  body {
    background: white !important;
    color: black !important;
  }
  .print\:hidden {
    display: none !important;
  }
  .bg-card {
    background: transparent !important;
    border-color: #ccc !important;
    box-shadow: none !important;
  }
}
```
