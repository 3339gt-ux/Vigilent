# LUMÉN Dashboard Customisation System

This document describes the design, implementation, and storage mechanics of the local dashboard customisation foundation in LUMÉN (formerly Vygilence/Vigilen).

> [!IMPORTANT]
> This system is currently a **local/user-level customisation foundation**, not a full organisation-wide or team-shared dashboard builder. All layout configurations, visibility choices, and styling states are stored in the user's local web browser (`localStorage`) and are specific to the logged-in user and current organization tenant.

---

## 1. What Is Implemented

* **Central Widget Registry**: A static definition mapping all 15 key dashboard items (KPI Strip Cards, Hero visualization, Right Rail Sections, and Lower Grid Panels) to default layout configurations, zones, and display capabilities.
* **Interactive Edit Mode**: A sandbox state activated via **"Customize Layout"** where changes are staged in a draft configuration (`tempCustomization`) before saving.
* **Granular Positioning Controls**: Individual widgets support ordering actions (move **Up** or **Down** within their zones) and position toggles (move to **Main Grid** vs. **Right Command Rail**).
* **Visibility Controls**: Toggle showing/hiding any widget, with a hidden-widgets recovery dock at the top of the editing viewport.
* **Draft Transaction Flow**: Real-time **Save**, **Cancel**, and **Reset to Defaults** operations to commit, discard, or flush customized configurations.
* **Readability Settings Panel**: Configures visual presentation rules (font sizes, density spacing, border-radius controls, contrast preferences, motion settings, and accent color palettes) applied live to the workspace UI.
* **Extended Hero Controls**: Support for layout presets (`Balanced Orbit`, `Focus Area`, `Structured List`), central orb metric content selections, and visual detail levels.
* **Selectable Dashboard Home Variations**: The home screen supports 6 visual hero/layout variations (Command Map, Executive Command Bar, Operations Taskboard, Evidence Readiness, Matrix Overview, Focus Mode) stored in local preferences and previewed live inside the Customize Modal.
* **Dark / Light / Midtone Theme Support**: Built to dynamically inherit from the root theme structure, preserving readable text contrast and gradient borders across all mode shifts.

---

## 2. What Is Partial or Deferred

### Partial Features (Current Pass)
* **Reset Individual Pane**: Restores a single pane's default order, visibility, and detail level within Edit Mode (implemented in Phase 2).
* **Pane Detail Levels**: Stored preferences (Compact, Standard, Detailed) mapped to change the quantity of info rendered in major cards (implemented in Phase 3).
* **Live Readability Previews**: Readability values preview live inside the customization modal before saving (implemented in Phase 4).
* **Major vs. Minor Hero Nodes**: Interactive nodes represent primary categories; minor sub-nodes are rendered as smaller orbits to avoid clutter.

### Deferred Features (Future Roadmap)
* **Freeform Drag-and-Drop Grid**: Grid layouts currently use structured column zones and flex ordering. Full 2D drag-and-drop handles are deferred to avoid layout instability.
* **Database-Backed Layout Persistence**: Multi-device or shared team configurations are deferred. Settings are stored exclusively in the browser's `localStorage` to keep database schema and RLS policies untouched.
* **Organisation-Wide Master Templates**: Force-pushing layouts to other members of the organization is deferred.
* **Hero Node Rearranging and Custom Mapping**: Editing the coordinate positions of individual SVG nodes on the map is deferred.

---

## 3. Storage and Tenancy Model

To ensure absolute compliance with data security and tenant isolation rules, all layout states are stored under keynames namespaced by the user ID and organization ID:

```typescript
const storageKey = `vygilence_dashboard_customization_${userId}_${orgId}`;
```

### Preference Schema
The configuration follows this TypeScript model:
```typescript
type DashboardCustomization = {
  visibleKpis: string[];
  kpiOrder: string[];
  visiblePanels: string[];
  defaultViewMode: 'system' | 'list';
  defaultRailTab: 'focus' | 'upcoming' | 'action' | 'activity';
  density: 'comfortable' | 'compact' | 'executive';
  heroStyle: 'map' | 'core' | 'list';
  dashboardHomeVariant?: 'map' | 'executive-bar' | 'taskboard' | 'evidence-readiness' | 'matrix-overview' | 'focus-mode';
  heroDetailLevel: 'minimal' | 'balanced' | 'full';
  visibleRightRailSections: string[];
  dataWindow: 'snapshot' | '7days' | '30days' | '90days';
  motionPreference: 'standard' | 'reduced';
  effectIntensity: 'subtle' | 'standard' | 'vibrant';
  heroAccent?: string;
  heroLayoutPreset?: string;
  heroCustomPositions?: Record<string, { x: number; y: number }>;
  rightRailOrder?: string[];
  lowerPanelsOrder?: string[];

  // Readability / window settings
  fontSize: 'sm' | 'standard' | 'lg' | 'xl';
  layoutDensity: 'compact' | 'comfortable' | 'spacious';
  paneSpacing: 'tight' | 'standard' | 'wide';
  cardRadius: 'sharp' | 'standard' | 'soft' | 'rounded';
  contrast: 'standard' | 'high';
  motion: 'minimal' | 'standard' | 'enhanced';
  dataDetailLevel: 'summary' | 'standard' | 'detailed';
  colourAccent: string;
  tableOptions: {
    stickyHeaders: boolean;
    rowHeight: 'compact' | 'standard' | 'spacious';
    zebraRows: boolean;
    compactTable: boolean;
  };

  // Expanded Hero settings
  heroVisualMode: 'standard' | 'detailed' | 'showcase' | 'minimal';
  heroNodeDisplayLevel: 'icons-only' | 'icons-labels' | 'icons-labels-metrics' | 'full-detail';
  heroCentralOrbContent: string;
  showMinorNodes: boolean;
  visibleHeroNodes: string[];

  // Widget settings
  widgetSettings: Record<string, {
    detailLevel: 'compact' | 'standard' | 'detailed';
    hoverDetailLevel: 'none' | 'summary' | 'full';
    clickBehaviour: 'open-drawer' | 'navigate' | 'filtered-view';
    showSecondaryMetrics?: boolean;
    showChart?: boolean;
    showRecentRecords?: boolean;
    showWarnings?: boolean;
  }>;
};
```

---

## 4. How Customisation Operations Work

### A. Edit Dashboard Mode
When the user clicks "Customize Layout" on the dashboard header:
1. `isEditingDashboard` is set to `true`.
2. A copy of `currentCustomization` is cloned into React state `tempCustomization`.
3. The page renders interactive action bars and positioning overlays for each card.

### B. Pane Show / Hide
* Clicking **"Hide"** on a widget removes its ID from the respective order list or visibility array (`visibleKpis`, `visiblePanels`, `visibleRightRailSections`) inside `tempCustomization`.
* Hidden widgets are pushed to a top dock component. Clicking a hidden item's tag restores it back to its original layout region.

### C. Pane Reordering
* For lists of card IDs, reordering is calculated by finding the index of the item, shifting its position (up/down index swap), and writing the updated array to `tempCustomization`.
* MAIN grid vs. RAIL movement swaps the widget ID between `lowerPanelsOrder` / `visiblePanels` and `rightRailOrder` / `visibleRightRailSections` collections.

### D. Save / Cancel / Reset Transactions
* **Save**: Copies the state of `tempCustomization` to `currentCustomization`, writes it to `localStorage`, and exits edit mode.
* **Cancel**: Discards `tempCustomization` changes, reverting to the saved state of `currentCustomization`, and exits edit mode.
* **Reset to Defaults**: Replaces the active configuration with `DEFAULT_CUSTOMIZATION_SETTINGS`, deletes the custom key from `localStorage`, and updates both states.

### E. Readability Settings
Readability styles inject inline properties or append CSS variables directly to the root element. These modify sizing, padding, and accent colors instantly. In Phase 4, readability changes live-preview instantly in a draft state and can be reverted by clicking Cancel.

---

## 5. Compliance & Data Honesty Rules

LUMÉN strictly enforces data honesty in compliance visualization:
1. **No Fake Analytics**: The dashboard does not generate fictional trends, mock compliance scores, or fake timelines.
2. **Honest Empty States**: If an organization has no active data or records matching a detailed widget view, the UI renders an honest empty state ("No entries recorded") instead of generating mock placeholder entries.
3. **No Unauthenticated Leaks**: Widget configurations cannot read, write, or leak evidence files or auth contexts outside the tenant boundary.
4. **Data Honesty in Layout Variations**: All selectable dashboard home variations map to real, snapshot-based data only. Fake trend lines, fake historical claims, and fake regulator/certification badges are strictly forbidden. Empty or unavailable states are honestly marked.
