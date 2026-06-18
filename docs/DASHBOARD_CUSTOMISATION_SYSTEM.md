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
* **Editable Homepage Pane Grid**: The dashboard can now run in an advanced editable homepage mode alongside the classic home variations. Users can choose 4-pane infographic, 6-pane balanced, 8-pane operations, 12-pane executive detail, or custom layouts, then add, hide, duplicate, reset, resize, reorder, and configure panes from a live preview.
* **Pane and Metric Registry**: Editable homepage panes use a strict local registry of supported pane types (`Stat Tile`, `Progress / Readiness`, `Status Bars`, `Mini Chart`, `Work Queue`, `Module Summary`, `Quick Actions`, and `Pack Builder Summary`) and selectable data sources. Each metric resolves from existing app state only and provides honest empty-state copy when data is unavailable.
* **Pane Settings Drawer**: Each editable pane has focused settings for content, display mode, span, font size, emphasis, accent colour, helper text, duplication, reset, and removal. Changes preview immediately in the editable homepage draft and only persist after Save.
* **Dark / Light / Midtone Theme Support**: Built to dynamically inherit from the root theme structure, preserving readable text contrast and gradient borders across all mode shifts.

---

## 2. What Is Partial or Deferred

### Partial Features (Current Pass)
* **Reset Individual Pane**: Restores a single pane's default order, visibility, and detail level within Edit Mode (implemented in Phase 2).
* **Pane Detail Levels**: Stored preferences (Compact, Standard, Detailed) mapped to change the quantity of info rendered in major cards (implemented in Phase 3).
* **Live Readability Previews**: Readability values preview live inside the customization modal before saving (implemented in Phase 4).
* **Major vs. Minor Hero Nodes**: Interactive nodes represent primary categories; minor sub-nodes are rendered as smaller orbits to avoid clutter.

### Deferred Features (Future Roadmap)
* **Freeform Coordinate Grid**: Stage 4A supports drag/drop reordering plus keyboard/button move controls inside a responsive grid. Pixel-level 2D positioning and manual drag-resize handles remain deferred to avoid layout instability.
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
  dashboardLayoutMode?: 'classic' | 'editable';
  dashboardGridPreset?: '4-large' | '6-balanced' | '8-operations' | '12-executive' | 'custom';
  editableHomepagePanes?: DashboardPaneConfig[];

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

Editable homepage pane records include:

```typescript
type DashboardPaneConfig = {
  id: string;
  type: 'stat' | 'readiness' | 'status-bars' | 'mini-chart' | 'work-queue' | 'module-summary' | 'quick-actions' | 'pack-builder';
  title: string;
  metricKey: string;
  displayMode: 'stat' | 'bar' | 'donut' | 'list' | 'compact' | 'detailed';
  span: '1' | '2' | '3' | '4' | 'full';
  order: number;
  visible: boolean;
  style: {
    fontSize: 'sm' | 'md' | 'lg' | 'xl';
    emphasis: 'normal' | 'strong' | 'hero';
    accent: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate';
    compact?: boolean;
    showHelper?: boolean;
  };
  filters?: Record<string, string | number | boolean>;
  thresholds?: Record<string, number>;
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
* **Editable Homepage Reset**: While editing the advanced homepage grid, Reset restores the currently selected pane preset in the draft state and requires Save before persistence.

### E. Editable Homepage Pane Operations
* **Preset Selection**: Users choose the pane count and starting composition from the Home Style tab before entering Edit Dashboard.
* **Live Preview**: Edit Mode renders the actual homepage grid with pane boundaries, drag handles, move controls, hide/remove actions, and settings shortcuts.
* **Drag/Reorder**: Panes can be dragged to a new order. Up/Down buttons provide a keyboard-friendly fallback.
* **Add/Duplicate/Hide/Remove**: Users can add a blank pane, duplicate a configured pane, hide panes into a recovery dock, or remove panes from the draft layout.
* **Pane Settings**: Settings are grouped around content, display, style, and actions. Data source changes immediately re-render the pane with real workspace data.
* **Persistence**: Save commits the full pane array to the existing user/organisation-scoped local preference key. Cancel discards the draft.

### F. Readability Settings
Readability styles inject inline properties or append CSS variables directly to the root element. These modify sizing, padding, and accent colors instantly. In Phase 4, readability changes live-preview instantly in a draft state and can be reverted by clicking Cancel.

### G. Reorganised Settings Panel
To reduce complexity and visual clutter, the Layout Customization Panel is organised into 6 distinct, progressive disclosure tabs:
1. **Home Style**: Select the dashboard home layout variant using interactive option cards with descriptions and helper badges (replacing traditional dropdown selects).
2. **Visible Sections**: Toggle showing/hiding top KPI cards, lower panels, and right rail sections.
3. **Layout**: Reorder top KPI cards via Up/Down controls and configure default view modes and horizon windows.
4. **Readability**: Adjust font sizes, spacing densities, and border corner radius styles.
5. **Colours & Theme**: Choose global accent and hero colors, or high contrast mode.
6. **Advanced**: Fine-tune detail levels, motion, and effects intensity.

All settings persist in `localStorage` namespaced to the user and organization tenant.

---

## 5. Body Scroll Locking Rules

To maintain high usability and natural page interaction, body scroll locking is applied strictly to overlays, drawers, and modal popups. Specifically:
* **Locked Background Scroll**: Enabled when full overlays are active, such as the Asset Matrix drawer, the Requirement details drawer, the Action detail drawer, the Image Lightbox, and the Persona creation modal.
* **Unlocked Background Scroll**: Disabled/unlocked during normal inline card clicks, persona card selections, dashboard variation choices, tab switching, and inline filters. The `useBodyScrollLock` hook is hardened with unique React identifiers to handle multiple simultaneous overlays safely without permanently locking the viewport.

---

## 6. Compliance & Data Honesty Rules

LUMÉN strictly enforces data honesty in compliance visualization:
1. **No Fake Analytics**: The dashboard does not generate fictional trends, mock compliance scores, or fake timelines.
2. **Honest Empty States**: If an organization has no active data or records matching a detailed widget view, the UI renders an honest empty state ("No entries recorded") instead of generating mock placeholder entries.
3. **No Unauthenticated Leaks**: Widget configurations cannot read, write, or leak evidence files or auth contexts outside the tenant boundary.
4. **Data Honesty in Layout Variations**: All selectable dashboard home variations map to real, snapshot-based data only. Fake trend lines, fake historical claims, and fake regulator/certification badges are strictly forbidden. Empty or unavailable states are honestly marked.
