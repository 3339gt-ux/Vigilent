# Premium Interactive Landing Dashboard

This document provides a technical walkthrough of the redesigned premium interactive landing dashboard implemented for Vygilence on `/dashboard`. It describes the design layout, interactive elements, theme system integration, data sources, and accessibility features.

---

## 1. Dashboard Layout & Sections

The dashboard is structured as a modern, responsive, two-column workspace on desktop, folding into a clean stacked layout on smaller screens.

### Left Sidebar
- Integrates with the existing global application layout.
- Maintains collapsed, expanded, and pinned behaviors.
- Includes navigation access to all existing modules (Dashboard, Favourites, Requirements, Competency Matrix, Evidence Vault, Asset Matrix, Audit Pack Builder, Reports, Audit Trail, Settings, Billing, Organisation Management).

### Top Header
- **Greeting**: Greets the logged-in user dynamically using `user.full_name` or `user.email`.
- **Organisation Name**: Displays the active workspace/organisation name (`organization.name`).
- **Global Search**: Preserves the command palette entry point (top-right button matching the theme with support for `Ctrl+K` / `Cmd+K`).
- **Notification Panel**: A modern drop-down listing recent notifications.
- **Quick Action Menu**: Triggers quick creation of:
  - Framework Requirements
  - Competency Requirements
  - Corrective Actions
  - Audit Packs
- **Profile / Avatar Dropdown**: User profile menu.

### Top KPI Strip
Displays six core compliance indicators, fully data-backed:
1. **Overall Compliance / Assurance**: Shows the computed readiness score (e.g., `92%`).
2. **Requirements**: Shows compliant/total active requirements count.
3. **Evidence Coverage**: Displays the percentage of documents classified.
4. **Training Completion**: Based on active competency records and qualifications.
5. **Open Actions**: Lists active corrective actions (`Open` and `In Progress`).
6. **Asset Assurance**: Compliance progress across all active asset checks.

### Central Compliance Program Overview
An interactive visual map representing the core compliance posture of the active organization.
- **Compliance Core centerpiece**: The abstract rotating spinner is replaced with a data-rich circular layout:
  - **Center displays**: The overall readiness score percentage.
  - **Readiness label**: Dynamic semantic status label (Excellent, Good, Fair, Needs Attention, Critical) matches the score tone.
  - **Status badge**: Small overlay showing `LIVE` or `SNAPSHOT` alongside a pulsing status indicator dot.
  - **Watermark**: The rotating starburst spikes are integrated as a faint watermark (opacity `0.12`) to preserve the brand signature without obscuring the reading score.
- **Segmented Compliance Ring**: An outer concentric SVG ring at radius `r=52.5` represents the breakdown of requirements: Compliant (Green), At Risk (Amber), Needs Attention (Red), and Not Assessed (Grey). Individual segments are cleanly separated by a visual 3px gap.
- **Animated Risk Pulses**: Exits from the centerpiece targeting any sub-module with active warning or expired items display warning dots with pulsing animations (`animate-ping`). Under reduced-motion settings, the ping animations are automatically disabled.
- **State-Responsive Pathways**: Orthogonal data flow lines connect the core to satellite nodes. The pathway strokes dynamically indicate the destination node's health (emerald-500/20 for green, amber-500/20 for warning, rose-500/20 for critical, neutral for others). Data packets flow animation is suspended under reduced motion mode.
- **Satellite Nodes**: Hover-scaling circular nodes displaying sub-module icons. Label text adjacent to the right displays the module title, badge warning counts, and total items (e.g. "Requirements [badge 21]" and "236 Requirements").
- **List View**: Toggles to a clean list/tabular overview of the modules with summary statistics.
- **Interactions**:
  - Hovering a satellite node highlights its SVG path, scales the node, and populates the details panel.
  - Clicking a satellite node triggers the slide-out detail drawer populated with attention-required records.
  - Clicking the Compliance Core centerpiece displays overall posture diagnostics and dual navigation buttons.
- **Responsive Stack**: On mobile screens, the map collapses into a clean grid of glassmorphic cards. On desktop, it renders the full interactive network diagram.

### Right-Side Live Intelligence Rail
Provides continuous context-aware insights and shortcuts:
1. **Compliance Snapshot**: A premium horizontal split panel featuring:
   - **Left**: A thick semi-circular speedometer gauge arc mapped to a colorful multi-stop gradient (red -> orange -> emerald -> indigo) indicating the current readiness score.
   - **Right**: Status legends representing valid, due soon, and needs-attention records with live counts.
2. **Due & Overdue**: Combined feed of overdue framework requirements, upcoming actions, and expired asset checks.
3. **Recent Activity**: Displays non-restricted workspace audit logs for transparency. Owner/Admin restrictions are strictly respected.
4. **Expiring Soon**: Aggregated list of evidence or competencies expiring within the next 30 days.
5. **Smart Insights**: Suggests focus areas based on data (e.g. classification of raw files or linking empty matrices).

### Lower Dashboard Panels
1. **Readiness Snapshot**: Displays the current calculated readiness score. Historical trend lines are intentionally not shown until a persisted historical dataset exists.
2. **Requirement Status**: A segmented SVG donut chart mapping the calculated GREEN, AMBER, RED, and GREY requirement states with counts and percentages.
3. **Readiness**: A speedometer gauge displaying the readiness percentage with needs-attention and due-soon counts below.
4. **Training Completion**: Concentric progress ring mapping competency completion with details on completed vs overdue staff competency items.

### Tier 2 Lower Lists Row
1. **Asset Category Health**: Shows compliant percentage bars per parent asset category.
2. **Top Risk Gaps**: Highlights pending risk levels (Critical, High, Medium, Low).
3. **Active Alerts**: List of workspace warnings (expired items, checkout lapses, unclassified docs).

### Discreet Quick Upload Card
Allows drag-and-drop or click-to-upload files directly from the dashboard:
- Supports dragging or selecting files.
- Users must associate a context (General, Requirement, Asset, Competency) to link/classify.
- Tenant scoping and security parameters are strictly enforced.

---

## 2. Technical Data Mapping

All metrics leverage the existing canonical calculators inside `AppContext` to avoid divergent calculations:
- `readinessScore` for overall compliance.
- `stats` for requirement and document numbers.
- `buildAssetMatrix` for asset check status calculations.
- `competencySummary` for training/qualification progress.
- `actions` for corrective action items.

---

## 3. Responsive & Theme Behavior

- **Desktop & Laptop**: Full-screen split grid showing the System Map side-by-side with the Live Intelligence Rail.
- **Tablet / Narrow**: The System Map collapses into responsive cards, and the Live Intelligence Rail wraps underneath.
- **Mobile**: Simplified list view stack with touch-friendly KPI cards and scrollable lists.
- **Themes**: Uses standard design tokens for full support across **Light**, **Midtone**, and **Dark** themes.
  - Borders: `border-border` and `border-border/40`
  - Cards: `bg-card text-card-foreground`
  - Highlights: Indigo gradients and HSL semantic success/warning/danger colors.

---

## 4. Interactive Intelligence Layer & Customization

The dashboard incorporates a live interactive intelligence layer enabling deep inspection and workspace personalization:

### Hover Popovers & Tooltips
- **Insight Popovers**: Triggered when hovering or focusing the six top KPI cards and the central Compliance Core orb. Popovers show driver scores, next action suggestions, and attention-required items.
- **Readiness Point Tooltip**: Hovering over the compliance trend point displays the month's readiness score.
- **Donut Chart Segment Hover**: Displays calculated GREEN, AMBER, RED, and GREY requirement counts and supports filtered click-through.

### Reusable Insight Detail Drawer
- Triggered by clicking the Compliance Core centerpiece, satellite nodes, or KPI cards.
- Slides in from the right to present a comprehensive inspection view of the selected system module.
- Displays a status breakdown, the metrics context value, and a list of associated records needing attention.
- Clicking any record inside the drawer navigates directly to that specific item's details.
- **Dual CTAs**: Provides primary action buttons at the bottom: "Open Reports" and "View Attention Items" for the hub, or module-specific actions (e.g. "Create Requirement" and "Open Module").

### Advanced Layout Customization Panel
- Triggered by clicking the **"Customize"** button in the dashboard controls.
- Opens an overlay dialog permitting users to:
  - **Layout Density**: Toggle between **Comfortable**, **Compact**, and **Executive** density levels. Adjusts margins, grid gaps, card padding, and heading typography dynamically.
  - **Hero Style**: Choose between **System Map** (full diagram), **Compliance Core Only** (hides satellite nodes & paths), and **List Overview** (tabular module overview).
  - **Hero Detail Level**: Toggle between **Minimal**, **Balanced**, and **Full** representation styles.
  - **Motion Preference**: Toggle between **Standard animations** and **Reduced motion** (which suppresses pings and flow line packet animations).
  - **Default Data Window**: Configure default timeline range (**Snapshot**, **7 Days**, **30 Days**, **90 Days**).
  - **Right Rail Sections**: Multi-select visible sections (Snapshot, Tasks, Activity, Suggestions, Expiring).
  - **KPI Sorting & Visibility**: Hide or reorder the Top KPI cards.
- **Undo Capability**: Stashes the previous customization configuration. Clicking the **"Undo"** button in the dashboard header reverts the layout change immediately.
- **Reset Defaults**: Instantly restores the default configuration settings.
- Scoped to `vygilence_dashboard_customization_${userId}_${orgId}` in `localStorage`.

### Historical Trend Honesty Assertions
- The compliance trend widget charts current workspace statistics and does not simulate fake historical progression coordinates. In compliance mode, it explicitly prints "Historical trend unavailable" next to the current snapshot point to prevent auditing inaccuracies.

---

## 5. Accessibility (a11y)

- All interactive controls are fully keyboard focusable with visible focus outlines and support native `<button>` or `<Link>` semantics.
- SVG hubs and interactive elements map `onFocus` and `onBlur` listeners to support popover display via keyboard navigation.
- SVG animations, pings, and dashboard visual flows strictly respect the customization's `motionPreference` settings (and fall back to system `prefers-reduced-motion` settings).
- Aria-labels are applied to icon-only controls.
- Color alone is never used to convey status; warning badges are backed by descriptive texts.
