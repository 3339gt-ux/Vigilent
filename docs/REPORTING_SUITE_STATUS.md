# Vygilence Reporting & Analytics Suite - Feature Status

This document details the operational status of all reporting and analytics features in Vygilence, distinguishing between locally implemented client-side capabilities and deferred remote database integrations.

---

## 1. Implemented Features (Operational)

### 1.1 Reporting Modules & Overview Metrics
* **Executive Overview Dashboard**: Summarizes compliance scores, active requirement totals, evidence files, and active corrective actions. Includes detailed calculation tooltips for key metrics.
* **Workspace Overall Readiness**: Standardized overall readiness percentage based on assessed active compliance obligations:
  * Green status = 100% compliant
  * Amber status = 50% warning / due soon
  * Red status = 0% gap / non-compliant
  * Grey status = unassessed or exempted (omitted from both numerator and denominator).

### 1.2 Interactive Chart Wrappers
* **SVG Donut Charts**: Renders requirement RAG distributions, evidence expiry status, and audit pack state with interactive segment hover overlays, toggleable raw tabular data grids, and summary CSV exports. Supports focused zoom modals.
* **SVG Trend Sparklines**: Renders upload and audit history trends with interactive data point hover coordinates, toggleable raw grids, and CSV downloads.

### 1.3 Pivot Table & Custom Builder
* **Custom Report Builder**: Previews dynamic query configurations, titles views with exact aggregate formulas (e.g. `COUNT(*)`), displays total underlying records count, and validates configuration completeness. Auto-generates names/descriptions when blank.
* **Pivot Percentages Grid**: Supports row, column, and total percentage calculations with clean integer rounding:
  * Column totals display `N/A` under row percentage (`row_pct`) mode to block mathematically invalid double-sums.
  * Row totals display `N/A` under column percentage (`col_pct`) mode.
  * Grid data is fully synced with identical precision in CSV exports.

### 1.4 Personal Browser Reports (Local Storage)
* **Local Storage Persistence**: Personal reports are saved locally on the client's browser, fully isolated and scoped by user ID and organization ID to prevent cross-tenant leakages.
* **Feature Scope**: Users can search, filter, sort, favourite, unfavourite, duplicate, rename, edit, and delete local browser reports with confirmations.
* **Exploratory Branding**: Explicitly tagged as `Stored in this browser for the current user and workspace. (Personal Browser Report)`.

### 1.5 Export and Print Layouts
* **Print-to-PDF Polish**: Standard browser print layouts automatically hide the desktop sidebar, mobile header, mobile dropdown panel, and top warning banners. Spacing is optimized to ensure charts and tables are not clipped.
* **Clean CSV Exports**: CSV files cleanly escape quotes, commas, and line breaks, exporting matched column selections without leaking signed URLs, absolute storage paths, or sensitive technician info.

---

## 2. Deferred Features (Non-Operational)

### 2.1 Remote Saved Reports Database Migration
* **Status**: Deferred. The remote database schema (`public.saved_reports`) is not provisioned in this environment.
* **Fail Closed Behavior**: If a production user attempts to save a database-backed report, Vygilence throws an explicit error and disables options, rather than silently falling back to client-side localStorage.

### 2.2 Account-Backed & Organisation-Shared Reports
* **Status**: Disabled.
* **UI State**: Options to save as a database-backed personal account report or shared organisation report are disabled and labeled with the disclaimer:
  `Organisation-shared reports are not enabled in this environment yet.`

### 2.3 Report Scheduling & Delivery
* **Status**: Disabled.
* **UI State**: Automatic PDF/CSV email delivery is disabled and labeled:
  `Scheduling not configured`.

---

## 3. Security & Isolation Boundaries

### 3.1 Audit Trail & Activity Logs
* **Admin-Only Restriction**: The "Activity & Admin" and "Report Audit History" tabs are restricted strictly to users with roles `Owner` or `Admin`. Normal members are blocked from querying, viewing, or exporting audit trail history.

### 3.2 Tenant Isolation
* All local browser storage keys are prefixed and validated against the logged-in user's active `organization_id` and `user_id`. Logged-out users or cross-organization context changes immediately trigger isolation resets.
