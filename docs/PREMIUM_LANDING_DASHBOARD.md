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
- **Greeting**: Greets the logged-in user dynamically with time-aware and day-aware greetings (e.g. "Good morning", "Happy Friday").
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
Displays six core operational indicators, fully data-backed:
1. **Readiness Health**: Shows the canonical requirement readiness score. It displays `N/A` when no active requirements have been assessed.
2. **Requirements**: Shows compliant/total active requirements count.
3. **Evidence Coverage**: Displays the percentage of documents classified.
4. **Training Completion**: Based on active competency records and qualifications.
5. **Open Actions**: Lists active corrective actions (`Open` and `In Progress`).
6. **Asset Assurance**: Compliance progress across all active asset checks.

### Central Compliance Program Overview
An interactive visual system map representing the current compliance and readiness posture of the active organization, integrated directly from the approved exact hero prototype.

- **Centralized ComplianceCore centerpiece**: Encapsulates a data-rich HUD readout with the real workspace compliance/readiness score, an uppercase status label (Critical, Needs Attention, Fair, Strong, Excellent) derived from the real rating score, and a small live snapshot status indicator. Hovering over the core triggers an outward pulse/glow animation.
- **Satellite Nodes**: 6 interactive satellite nodes map to the following real modules:
  - Requirements (routes to `/dashboard/requirements`)
  - Evidence Vault (routes to `/dashboard/vault`)
  - Competency Matrix (routes to `/dashboard/competencies`)
  - Asset Matrix (routes to `/dashboard/matrix`)
  - Audit Pack Builder (routes to `/dashboard/audit-packs`)
  - Reports (routes to `/dashboard/reports`)
- **Data-Driven Indicators**: Each node displays dynamic state information:
  - An SVG circular progress ring around the node representing completion percentages (e.g. compliant requirements / active requirements).
  - A small, compact mini data bar below the label representing progress.
  - A warning badge with numerical indicator showing outstanding expired or attention-needed counts.
  - Neutral labels (e.g. `available`, `checks`) when progress metrics are not applicable.
- **Interactivity & Hover Beams**:
  - Hovering a node brightens the node circle and icon.
  - The parallel connector trace leading to the core brightens in the node's theme accent color.
  - A glowing, animated traveling packet travels along the connector trace to the core.
  - Middle-left and middle-right nodes support the exact same active connector beam behavior as diagonal nodes.
  - Popover insight tooltips are rendered dynamically upon hovering.
- **Three-Theme Visual System**:
  - **Dark**: High-contrast, premium neon aesthetic matching the approved dark mode mock.
  - **Light**: Crisp, highly readable, and non-washed out styling.
  - **Midtone / Grey**: Replaces muddy contrasts with a refined slate/graphite background treatment (`#1e293b`), preserving neon path colors and text clarity.
- **Hero Accent Customization**:
  - Prepared with structured hero CSS variables mapping primary, secondary, glow, and connector colors.
  - Integrated local-only customization setting (`Hero Accent`) inside the customization panel with options: Default Blue/Violet, Cyan/Emerald, Blue/Amber, Violet/Rose, Rainbow Spectrum. Persists user preference via `localStorage` with a reset control.
- **Prototype Reference Route**:
  - The prototype page at `/dashboard-prototypes/exact-hero` remains fully available as a static, pixel-perfect visual reference.


### Right-Side Live Intelligence Rail
Provides continuous context-aware insights and shortcuts:
1. **Compliance Snapshot**: A premium horizontal split panel featuring a speedometer gauge indicating the current readiness score and status legends.
2. **Focus**: Smart Insights suggesting high-impact areas based on data (e.g. classification of raw files or linking empty matrices).
3. **Next 7 Days**: Combined feed of upcoming actions, framework requirements, and expiring asset checks due in the next week.
4. **Needs Action**: Overdue and critical items across requirements and asset checks that demand immediate intervention.
5. **Activity**: Displays workspace activity made available by the existing audit-log permissions.

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
- **Insight Popovers**: Triggered when hovering or focusing the six top KPI cards, the central Compliance Core orb, and the Compliance Snapshot status items (Compliant, In Progress, At Risk, Needs Attention) in the Right Rail. Popovers persist smoothly to allow hovering inside.
- **Expandable Drilldowns**: Status rows inside popovers can be expanded by clicking, displaying a list of exact underlying records (up to 5). Clicking any record deep links directly to its workspace detail view (e.g. opening the central Requirement Workspace modal via `requirementId`).
- **Readiness Point Tooltip**: Hovering over the readiness snapshot point displays the current calculated score.
- **Donut Chart Segment Hover**: Displays calculated GREEN, AMBER, RED, and GREY requirement counts and supports filtered click-through.

### Reusable Insight Detail Drawer
- Triggered by clicking the Compliance Core centerpiece, satellite nodes, or KPI cards.
- Slides in from the right to present a comprehensive inspection view of the selected system module.
- Displays a status breakdown, the metrics context value, and a list of associated records needing attention.
- Clicking any record inside the drawer navigates directly to that specific item's details.
- **Dual CTAs**: Provides primary action buttons at the bottom: "Open Reports" and "View Attention Items" for the hub, or module-specific actions.

### Smart Evidence Dropzone Side Panel
- **Window Drag Handler**: Dragging files anywhere over the dashboard page automatically slides out a premium dropzone panel from the right.
- **Context Classification Dialog**: Dropping files opens an interactive classification dialog where users select a target context (General, Requirement, Action, Asset, Competency) and select the specific target record to automatically link files privately upon upload.

### Advanced Layout Customization Panel
- Triggered by clicking the **"Customize"** button in the dashboard controls.
- Opens an overlay dialog permitting users to:
  - **Layout Density**: Toggle between **Comfortable**, **Compact**, and **Executive** density levels. Adjusts margins, grid gaps, card padding, and heading typography dynamically.
  - **Hero Style**: Choose between **System Map** (full diagram), **Compliance Core Only** (hides satellite nodes & paths), and **List Overview** (tabular module overview).
  - **Hero Detail Level**: Toggle between **Minimal**, **Balanced**, and **Full** representation styles.
  - **Motion Preference**: Toggle between **Standard animations** and **Reduced motion** (which suppresses pings and flow line packet animations).
  - **Effect Intensity**: Choose between **Subtle**, **Standard**, and **Vibrant** rendering of SVG path glows and shadows.
  - **Upcoming Items Window**: Controls how far ahead the right-rail due-item list looks (**Due Today**, **7 Days**, **30 Days**, **90 Days**). It does not alter the readiness score or create historical data.
  - **Right Rail Sections**: Multi-select visible sections (Snapshot, Focus, Next 7 Days, Needs Action, Activity).
  - **KPI Sorting & Visibility**: Hide or reorder the Top KPI cards.
- **Undo Capability**: A dedicated **"Undo Changes"** button instantly reverts all un-saved tweaks to the previously stored configuration.
- **Reset Defaults**: Loads the default configuration into the customization form; **Save Changes** applies it.
- Scoped to `vygilence_dashboard_customization_${userId}_${orgId}` in `localStorage`.

### Historical Trend Honesty Assertions
- The compliance trend widget charts current workspace statistics and does not simulate fake historical progression coordinates. In compliance mode, it explicitly prints "Historical trend unavailable" next to the current snapshot point to prevent auditing inaccuracies.

---

## 5. Accessibility (a11y)

- All interactive controls are fully keyboard focusable with visible focus outlines and support native `<button>` or `<Link>` semantics.
- SVG hubs and interactive elements map `onFocus` and `onBlur` listeners to support popover display via keyboard navigation.
- Compliance Core flow lines, warning pings, watermark rotation, and live indicators respect the dashboard's explicit reduced-motion preference.
- Escape closes the insight drawer, customization dialog, and dashboard quick-action dialogs.
- Aria-labels are applied to icon-only controls.
- Color alone is never used to convey status; warning badges are backed by descriptive texts.
