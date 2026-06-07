# Vygilence UI/UX Design System Findings

This document evaluates the consistency, responsiveness, and compatibility of the Vygilence design system tokens, typography, layout metrics, and color palettes across light, midtone, and dark appearances.

---

## 1. Typography & Hierarchy

### Observations
* **Titles & Subtitles**: Standardized at `text-3xl font-extrabold tracking-tight` for route headings and `text-sm text-muted-foreground mt-1` for descriptions. This provides strong visual entry anchors.
* **Section & Card Headers**: Group headers use uppercase tracking elements like `text-[10px] font-bold text-muted-foreground uppercase tracking-widest` which structure spacing cleanly.
* **Table Elements**: Column headers are correctly bolded but vary in height/padding across matrices.
* **Text Sizing Overload**: In the matrix grids (`matrix/page.tsx:973`), cell density controls switch font size to `text-[11px]` or `text-xs`. The drop-down selection options sometimes default to standard browser sizes, creating tiny visual jumps.

### Recommendations
* Standardize matrix row headers to match typography tokens exactly.
* Enforce a uniform line-height rule (`leading-relaxed`) on card descriptions to prevent squishing when descriptions wrap.

---

## 2. Spacing & Density Tokens

### Observations
* **Layout Padding**: Most routes use `space-y-6` or `space-y-8` which allows content blocks to breathe.
* **Density Controls**: Standardized comfortable/compact states swap pad metrics:
  * Comfortable: `p-4 text-xs`
  * Compact: `p-2 text-[11px]`
* **Nested Containers**: The dashboard and reports overview pages sometimes nest cards inside empty containers, adding unnecessary margins that waste horizontal grid space.

### Recommendations
* Remove outer grid wrapper margins when nesting dashboard charts.
* Introduce a strict margin-bottom limit of `mb-4` for form controls inside drawers and modals.

---

## 3. Control Hierarchy & State Styling

| Control State | Observed Styling | Problem / Friction | Recommended Token Fix |
| :--- | :--- | :--- | :--- |
| **Primary Action** | `bg-indigo-650 text-white font-bold` | Midtone theme has poor boundary contrast. | Change selector token to `bg-indigo-600` under midtone classes. |
| **Secondary Action** | `bg-muted hover:bg-muted/80 text-foreground` | Blends too closely with card backgrounds. | Add an explicit border outline `border-border/80` to secondary buttons. |
| **Disabled Action** | `disabled:opacity-50 disabled:cursor-not-allowed` | No explanatory tooltips for why actions are locked. | Bind helper text overlays under disabled selectors. |
| **Hover States** | `transition-colors hover:bg-muted/10` | Interactive matrix cells sometimes lack hover scaling. | Apply a subtle shadow elevation transition `hover:shadow-xs` globally. |
| **Focus Indicator** | `focus-visible:outline-indigo-500` | Native select controls in dark mode bypass outlines. | Apply Tailwind `focus:ring-1 focus:ring-indigo-500` on input selects. |

---

## 4. Status Indicator Colors & Semantics

Vygilence uses a protective status design that must mean the same thing across all modules.

| Status | Semantic Meaning | Color Value (Light) | Color Value (Dark) | Checked and Confirmed Modules |
| :--- | :--- | :--- | :--- | :--- |
| **Compliant** / **Valid** | Active, verified records uploaded. | `bg-emerald-500/10` text-emerald-600 | `bg-emerald-500/10` text-emerald-400 | Matrix, Vault, Competencies, Reports |
| **Due Soon** / **Warning** | Expiring in 30 days. | `bg-amber-500/10` text-amber-600 | `bg-amber-500/10` text-amber-400 | Matrix, Vault, Competencies, Reports |
| **Expired** / **Overdue** | Certificate lapsed / review overdue. | `bg-rose-500/10` text-rose-600 | `bg-rose-500/10` text-rose-400 | Matrix, Vault, Competencies, Reports |
| **Missing** | No documents linked. | `bg-zinc-500/10` text-zinc-500 | `bg-zinc-500/10` text-zinc-550 | Matrix, Vault, Competencies, Reports |
| **Archived** / **Inactive** | Removed from active workflows. | `bg-zinc-500/15` text-zinc-650 | `bg-zinc-500/25` text-zinc-400 | Vault, Organisation, Audit Packs |

---

## 5. Visual Theme Audit

### A. Light Theme
* **Unreadable Options**: When options in a select drop-down are rendered, native browser components can inherit default values, creating white text on white backgrounds on certain OS viewports.
* **Contrast Issues**: Faint borders (`border-border`) are too washed out under direct light themes.

### B. Midtone Theme
* **Surfaces Merging**: Because midtone overrides background and card variables close together (background: `hsl(218, 15%, 30%)`, card: `hsl(218, 14%, 36%)`), surfaces merge, resulting in zero shadow contrast.
* **Text Muddying**: Muted text (`--muted-foreground`) loses readability against slate surfaces.

### C. Dark Theme
* **Option Contrast**: Text options in drawers can merge into backgrounds.
* **Bright Badges**: Extreme colors for expired badges (bright red) create high visual noise.

---

## Recommended Token Changes in `globals.css`

```css
/* Recommended Midtone Border contrast polish */
:root.midtone {
  --border: 216 12% 42%;
  --muted-foreground: 215 18% 85%;
  --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1);
}

/* Enforced Select focus styling globally */
select:focus, input:focus, textarea:focus {
  border-color: hsl(var(--indigo-500)) !important;
  box-shadow: 0 0 0 1px hsl(var(--indigo-500)/0.3) !important;
}
```
