# Premium Landing Dashboard Architecture

This document describes the design decisions, component hierarchy, theme configuration, and customization architecture implemented as part of the dashboard premium command-center overhaul.

---

## Architecture Overview

The landing dashboard is refactored into a highly modular, presentational-driven system. The layout, style sheets, and view compositions have been decoupled from the primary route page:

1. **`src/app/dashboard/layout.tsx`** (Dashboard Shell):
   - Serves as the outer framework container.
   - Houses the top-right command bar containing notifications, avatar dropdown menus, search bar, and workspace actions.
   - Embeds the workspace identity and warning disclaimer as a hover tooltip in the brand block.
   - Manages responsive mobile and collapsible sidebar behaviors.

2. **`src/app/dashboard/page.tsx`** (Controller & State Broker):
   - Fetches and calculates all metrics, active counts, expired/due alerts, list items, and activity logs.
   - Manages customization preferences state (`DashboardCustomization`) and active drawer overlays.
   - Delegates the rendering of visual sections to optimized presentational components.

3. **`src/app/dashboard/DashboardComponents.tsx`** (Visual Modules):
   - Contains all the rewritten visual sections:
     - `DashboardHeader`: Greetings and quick upload buttons.
     - `KpiStrip`: Row of meters displaying compliance metrics with progress tracks.
     - `SystemHeroMap`: Central interactive centerpiece showing readiness score, segmented health gauge, concentric orbital spinners, active pathways, and module satellites.
     - `RightIntelligenceRail`: Side panel showing compliance snapshots, due and overdue progress indicators, expiring items, recent activities, and priority actions.
     - `LowerAnalytics`: Renders trend graphs, requirement status donut charts, readiness speedometers, and training completion gauges.
     - `LowerDetails`: Framework lists, asset assurance checks, top risk metrics, active alerts, and the drag-and-drop vault dropzone.

---

## Design Systems & Themes

The redesigned command center uses a high-contrast theme structure that is attractive in Dark, Light, and Midtone modes:

- **Orbital Spinners**: Concentric SVG rings that orbit in alternating directions (`spin-clockwise` and `spin-counter`) to give the centerpiece a premium, active look.
- **Dynamic Glows**: Ambient drop shadows and radial gradients that adjust based on user's active theme.
- **Visual Status Signals**: Status indicators reflect real logical counts (Green, Amber, Red, Grey) rather than placeholders.
- **Motion Reduction**: Clean CSS rules that respect user preferences (`prefers-reduced-motion: reduce`) or the customization menu settings to halt rotations and animations.

---

## Customization Preferences

All layout, density, and visibility choices are preserved in `localStorage` scoped by `user_id` and `organization_id`:

- **Density Modes**: Comfortable, Compact, or Executive.
- **Hero Styles**: Central interactive map, list view, or minimal dials.
- **Visibilities**: Toggle right rail sections, KPIs, and lower panels individually.
- **Effect Intensities**: Standard, vibrant, or subtle glow animations.
