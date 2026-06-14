# Vygilence Dashboard Visual Prototype Directions

This document outlines the three static visual concepts created for the Vygilence dashboard, providing the design rationale, differences, alignment with user targets, and details on what would need to be wired for production.

## Purpose of the Prototype Page
The previous attempt to redesign the dashboard directly in the live app led to usability regressions and looked too similar to the original dashboard. To prevent this, we created three isolated, high-fidelity static prototypes at `/dashboard-prototypes` to align on the visual direction before modifying the real codebase.

These prototypes are **entirely static visual representations**. They use local mockup display values only, do not write to local storage, and do not connect to Supabase or live auth/matrix state.

---

## The Three Visual Concepts

### 1. Executive Command Centre
* **Visual Profile**: Dark premium SaaS command centre, using very deep slate/zinc tones with high-contrast glowing elements.
* **Core Rationale**: This is closest to the target "Ideal Operations Cockpit" design. It features a heavy visual grid, rich SVGs, and glow effects.
* **Layout Structure**:
  - **Top KPI Command Strip**: High-impact horizontal strip with border separators, highlighting overall readiness, files in the vault, and checks outstanding.
  - **Left Sidebar**: Clean, structured navigation grouped by Core, Assurance, and Admin.
  - **Top-Right Controls**: Dedicated area for search, notification bell with alert counter, and user profile avatar drawer.
  - **Central Luminous Core**: Concentric SVG rings (outer dashed rotating, inner segment indicators) with animated flowing dash paths extending to module satellites (Competency, Assets, Vault, Packs). A large center compliance orb pulses with posture metrics.
  - **Right Intelligence Rail**: A tabbed interactive sidebar providing context-aware suggestions ("Smart Focus"), upcoming renewals, and high-priority alerts.
  - **Lower Analytics Grid**: Matrix detail blocks showing status breakdowns by requirement categories, training posture, and suggested risk focus items.

### 2. Compliance Control Room
* **Visual Profile**: Operational and action-oriented midtone slate style.
* **Core Rationale**: Optimized for daily compliance managers who need immediate insight into what needs attention and who is currently non-compliant.
* **Layout Structure**:
  - **Attention Metrics**: Prominent upper metrics focusing on critical failures, warnings, and upcoming expiries.
  - **Live Action Feed**: Chronological list of urgent calibration updates and employee matrix checks.
  - **Compact Hub Map**: A smaller compliance posture core focusing purely on alert triggers.
  - **Operational Telemetry**: Grid mapping out exact modules and status lights.

### 3. Evidence Intelligence Hub
* **Visual Profile**: Clean, elegant slate/light theme using translucent glass card treatments and soft shadows.
* **Core Rationale**: Focuses on professional, enterprise document readiness, pack templates, and vault integrity, avoiding overly flashy elements in favor of maximum readability.
* **Layout Structure**:
  - **Refined KPI Cards**: Clean white card blocks showcasing overall files and pack statuses.
  - **Clean Hub Map**: A simplified SVG network connecting personnel, assets, vault, and packs.
  - **Audit Pack Builder**: Focuses on dossiers currently ready for export or review.

---

## Rationale and Ideal Target Alignment
* **Which direction is closest to the user's target?** 
  - **Concept 1: Executive Command Centre** is the closest. It implements the dark, neon-accented, concentric-circle-driven cockpit aesthetic shown in the user's target screenshot, providing an immersive operations-room experience.
* **Data Honesty and Design Rules**:
  - No claims of actual database metrics are made in the prototype routes. All values are hardcoded mock display items.
  - No fake AI claims or fake trends are shown; features are framed as "Smart Focus" recommendations.
  - Generic/standard-compliant names are used (e.g. "Safety Management System", "Asset Calibration Logs", "Personnel Training Matrix") instead of hardcoding regulatory standards like ISO/SOC/TAPA.

---

## Path to Production
If one of these concepts is selected for live implementation, the following steps must be taken:
1. **Layout & Sidebar Changes**: Refactor `src/app/dashboard/layout.tsx` to align the sidebar into the Core/Assurance/Admin structure, move user and quick-actions controls to the top-right command bar, and add the legal notice tooltip next to the workspace badge.
2. **Page Telemetry Wiring**: Refactor `src/app/dashboard/page.tsx` to match the selected layout grid, connecting the KPI strip, the right-rail tabs, and the lower status tables to active Supabase hook data.
3. **SVG posturing**: Bind the SVG nodes and paths to dynamic status categories from the requirement and competency registries (e.g. coloring path strokes green/amber/red depending on database status).
4. **Theme styling**: Port the CSS classes and keyframes (dash flow, orbit rotation) from `DashboardPrototypeComponents.tsx` to `src/app/globals.css`.
