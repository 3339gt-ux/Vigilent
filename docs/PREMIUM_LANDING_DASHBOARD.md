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
An interactive interactive map visualizing the Vygilence Core compliance status.
- **System View**: Renders a glowing central hub with a slowly rotating 32-spike radial starburst spark. Nested concentric rings border the hub.
- **Circuit Pathways**: Circuit board trace style orthogonal paths connect the central hub to six satellite nodes. Small glowing arrowheads or dashes infinitely flow along the paths from the center outwards to represent data packet transmission.
- **Satellite Nodes**: Each point of contact features a hover-scaling circular node (with sub-module icon) and a text label adjacent to the right displaying the module title, badge issues count, and total items (e.g., "Requirements [badge 21]" and "236 Requirements").
- **List View**: Toggles to a clean list/tabular overview of the modules with summary statistics.
- **Interactions**:
  - Hovering over a satellite node highlights the SVG arc, pulses the node, and populates the details panel.
  - Clicking a node routes the user directly to that section.
  - Interactive badges display warning counts (e.g., overdue requirements, expired competencies).
- **Responsive Stack**: On mobile screens (`block md:hidden`), the system map collapses into a grid of 6 sleek glassmorphic cards. On desktop (`hidden md:block`), it renders the full animated network diagram.

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
- **Insight Popovers**: Triggered when hovering or focusing the six top KPI cards and the central command orb. Asset category bars provide direct filtered links and native hover labels.
- **Readiness Point Tooltip**: Hovering over the current readiness point displays the live calculated score and its source.
- **Donut Chart Segment Hover**: Displays calculated GREEN, AMBER, RED, and GREY requirement counts and supports filtered click-through.

### Reusable Insight Detail Drawer
- Triggered when clicking a satellite node or any of the Top KPI cards.
- Slides in from the right to present a comprehensive inspection view of the selected system module.
- Displays a status breakdown, the metrics context value, and a list of associated records needing attention.
- Clicking any record inside the drawer navigates directly to that specific item's details.
- Includes a primary action button at the bottom to navigate directly to the filtered module view.

### Dashboard Customization Panel
- Triggered by clicking the **"Customize"** button in the dashboard controls.
- Opens an overlay dialog permitting users to:
  - Toggle visibility of individual Top KPI cards.
  - Reorder the Top KPI cards using visual up/down sorting controls.
  - Toggle visibility of lower widgets and panels (Trend, Donut Chart, Readiness, Training, Asset Health, Risk Gaps, Alerts).
  - Configure the default layout view mode (`system` graphical vs `list` module overview) and the default active Live Rail tab (`tasks`, `activity`, `suggestions`).
- Customization preferences contain display settings only and are persisted to `localStorage` under a key scoped by the active user and organisation (`vygilence_dashboard_customization_${userId}_${orgId}`). This is a convenience preference, not a security boundary.

### Filter & Drill-down Parameterized Routing
All navigation links from popovers, donut segments, risk gap rows, alert items, and drawer CTA buttons pass detailed query parameters to direct the user to pre-filtered lists:
- **Evidence Vault**: Evaluates query parameters for `status` (`Expired`, `Expiring Soon`, `Unclassified`), `link` / `linkFilter` (`Unlinked Only`, `Linked Only`), and `category`.
- **Competency Matrix**: Evaluates supported `status` query parameters to pre-filter staff records (`Expired`, `Missing`, `Expiring Soon`, `Valid`) and ignores unsupported values.
- **Asset Matrix**: Evaluates supported `status` (`Expired`, `Missing`, `Expiring Soon`, `Compliant`) and valid `category` parameters.
- **Requirements**: Evaluates supported `status` (`Attention`, `RED`, `AMBER`, `GREEN`, `GREY`), `filter` (`actions`, `due-week`), and `risk` (`Critical`, `High`, `Medium`, `Low`) values.

---

## 5. Accessibility (a11y)

- All clickable elements are fully keyboard focusable and support native `<button>` or `<Link>` semantics.
- Visual focus outlines are provided for keyboard-navigating users.
- Connective animations and pulses respects `prefers-reduced-motion` settings.
- Aria-labels are applied to icon-only controls.
- Color alone is never used to convey status; warning badges are backed by descriptive texts.
