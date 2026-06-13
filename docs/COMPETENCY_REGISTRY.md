# Competency Registry Management

This document details the architecture, capabilities, and system design of the **Competency Registry Management** module in Vygilence.

## Overview
The Competency module has been redesigned from a single training matrix table into a comprehensive, two-tab management module:
1. **People Matrix**: The original grid view displaying person-by-competency training status, expiry dates, and gaps, with advanced filtering and search.
2. **Competency Registry**: A centralized registry of all competency types (definitions) that serves as the organization-wide "source of truth". It enables lifecycle management, compliance analysis, bulk configuration updates, and template pack imports.

---

## Architectural & Schema Extensions

### 1. Enhanced Data Model (`src/lib/types.ts`)
To support customizable verification workflows and alert profiles, the `CompetencyType` schema includes the following new optional properties:
* `review_period_months` (`number` | `null`): Standard period after which a competency definition itself should be reviewed for standard updates.
* `warning_days` (`number` | `null`): Warning period (in days) prior to credential expiry where the status turns amber (Expiring Soon). Defaults to system-wide settings if not specified.

### 2. Payload Sanitization (`src/lib/db.ts`)
To prevent schema validation errors when interfacing with Supabase:
* Custom local storage configurations (demo mode) persist all custom parameters.
* The Supabase serialization handler (`upsertCompetencyType`) automatically strips any client-only fields from the database payload before submission, ensuring full backward compatibility and preventing column mismatch crashes.

### 3. Compliance & Expiry Engine (`src/lib/competencyEngine.ts`)
The compliance status calculations have been updated to support customizable warning windows:
* `calculateCompetencyStatus` accepts an optional `warningDays` parameter.
* `buildCompetencyMatrix` and `buildCompetencySummary` load each competency type's warning window (`type.warning_days ?? DEFAULT_WARNING_DAYS`) to dynamically determine warning status.

---

## Competency Registry Capabilities

The **Competency Registry** tab (`src/app/dashboard/competencies/page.tsx`) offers complete control over the organization's competency catalog:

### 1. Lifecycle Operations
* **Create**: A glassmorphic modal form allows authorized roles to define new competencies, specifying title, description, category, default risk, review and renewal periods, and whether evidence files are mandatory.
* **Edit**: Modify titles, categories, renewal profiles, and evidence constraints.
* **Archive/Restore**: Soft-delete/deactivate competencies to remove them from active compliance scoring grids without destroying historical training logs.
* **Duplicate**: Instantly clone existing definitions to speed up setup for similar qualifications.
* **Template Packs**: Direct entry point to import predefined industry standards (e.g., standard safety compliance packs).

### 2. Selection & Bulk Updates
Equipped with a bulk operation toolbar allowing users to:
* Re-categorize multiple competencies at once.
* Bulk-assign warning windows or renewal periods.
* Toggle evidence file upload requirements across multiple items.
* Bulk archive inactive competency types.

### 3. Integrated Registry Stats & Metrics
Every row in the registry displays rich, live telemetry showing:
* **Compliance Rate**: Computed dynamically based on active person-to-competency requirements.
* **Fulfillment States**: Breakdown of active, expiring, expired, and missing records.
* **Linked Requirements**: Counter showing number of compliance clauses or standards mapped to the competency.
* **Evidence Count**: Counter showing number of document attachments stored in the vault matching this competency.

---

## Navigation & Deep-Linking

The page mounts state via URL query parameters, enabling deep-linking directly into detail drawers:
* `?tab=registry` - Focuses the Competency Registry tab.
* `?tab=registry&competencyId=<id>` or `?id=<id>` or `?competency=<id>` - Opens the registry tab and loads the **Competency Detail Workspace Drawer** for the specified competency.
* `?person=<id>` - Opens the People Matrix tab and opens the selected teammate's training drawer.

### Global Search Integration
The **Global Search Panel** (`src/components/GlobalSearchPanel.tsx`) routes all competency queries (`/dashboard/competencies?competency=<id>`) directly into the registry detail drawer, allowing admins to inspect compliance logs in one click from anywhere in the app.
