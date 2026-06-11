# Premium Interactive Landing Dashboard

This document provides a technical walkthrough of the new premium interactive landing dashboard designed for Vygilence. It describes the design layout, interactive elements, theme system integration, data sources, and accessibility features.

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
- **Quick Action Menu**: Interactive drawer triggers for quick creation of:
  - Framework Requirements
  - Competency Requirements
  - Corrective Actions
  - Audit Packs
- **Profile / Avatar Dropdown**: Existing user menu integrations.

### Top KPI Strip
Displays six core compliance indicators, fully data-backed:
1. **Overall Compliance / Assurance**: Shows the computed readiness score (e.g., `85%`) based on met objectives.
2. **Requirements**: Shows compliant/total active requirements count.
3. **Evidence Coverage**: Displays the percentage of documents classified.
4. **Training Completion**: Based on active competency records and qualifications.
5. **Open Actions**: Lists active corrective actions (`Open` and `In Progress`).
6. **Asset Assurance**: Compliance progress across all active asset checks.

*Note: All trend elements indicate current snapshots, as historical tracking is not yet implemented.*

### Central Compliance Program Overview
An interactive interactive map visualizing the Vygilence Core compliance status.
- **System View**: Renders a glowing central hub ("Vygilence Hub") with SVG connecting arcs leading to six satellite nodes:
  - Requirements
  - Competency Matrix
  - Evidence Vault
  - Asset Matrix
  - Audit Pack Builder
  - Reports
- **List View**: Toggles to a clean list/tabular overview of the modules with summary statistics.
- **Interactions**:
  - Hovering over a satellite node highlights the SVG arc, pulses the node, and populates the details panel in the center.
  - Clicking a node routes the user directly to that section.
  - Interactive badges display warning counts (e.g., overdue requirements, expired competencies).

### Right-Side Live Intelligence Rail
Provides continuous context-aware insights and shortcuts:
1. **Compliance Snapshot**: A custom SVG radial gauge displaying the overall readiness score.
2. **Due & Overdue**: Combined feed of overdue framework requirements, upcoming actions, and expired asset checks.
3. **Recent Activity**: Displays non-restricted workspace audit logs for transparency. Owner/Admin restrictions are strictly respected.
4. **Expiring Soon**: Aggregated list of evidence or competencies expiring within the next 30 days.
5. **Smart Insights**: Contextual suggestions (e.g., highlighting unclassified documents or empty audit packs).

### Lower Dashboard Panels
1. **Requirement Status Distribution**: Compact visual progress bar of requirements (Compliant vs Non-Compliant vs In Progress).
2. **Asset Category Health**: Interactive progress bars detailing compliance percentages per asset category.
3. **Top Risk Gap Levels**: Lists critical gaps (e.g., critical-risk requirements that are missing evidence).
4. **Active Alerts**: Critical workspace alerts (e.g., expired check-ups or missing documents).

### Discreet Quick Upload Card
Allows drag-and-drop or click-to-upload files directly from the dashboard:
- Supports dragging or selecting files.
- Users must associate a context:
  - Evidence Vault General Upload
  - Requirement Evidence
  - Asset Evidence
  - Competency Record Evidence
- Routes to app-integrated confirmation modals to link/classify.
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

## 4. Accessibility (a11y)

- All clickable elements are fully keyboard focusable and support native `<button>` or `<Link>` semantics.
- Visual focus outlines are provided for keyboard-navigating users.
- Connective animations and pulses respects `prefers-reduced-motion` settings.
- Aria-labels are applied to icon-only controls.
- Color alone is never used to convey status; warning badges are backed by descriptive texts.

---

## 5. Known Limitations & Future Roadmap

- **Historical Trends**: Trend charts currently show a snapshot. Real-time historical tracking requires database-level timeline snapshot migrations.
- **Drag-and-Drop Auto-linking**: Files dropped are staged for manual linking context selection before upload to comply with tenancy/RLS guidelines. Fully automated AI-based classification is currently a roadmap item.
