# Competency Registry Management

This document details the architecture, capabilities, and system design of the **Competency Registry Management** module in Overview360.

## Overview
The Competency module is presented as a two-tab management module:
1. **People Matrix**: The original grid view displaying person-by-competency training status, expiry dates, and gaps, with advanced filtering and search.
2. **Competency Registry**: A centralized registry of competency type definitions. It enables lifecycle management, record-health summaries, bulk configuration updates, and template pack imports.

---

## Architectural & Schema Extensions

### 1. Enhanced Data Model (`src/lib/types.ts`)
To support customizable verification workflows and alert profiles, the `CompetencyType` schema includes the following new optional properties:
* `review_period_months` (`number` | `null`): Suggested period after which a competency definition should be reviewed.
* `warning_days` (`number` | `null`): Warning period (in days) prior to credential expiry where the status turns amber (Expiring Soon). Defaults to system-wide settings if not specified.

`validity_period_months` already exists in the Supabase `competency_types` table and persists in production. `review_period_months` and `warning_days` are demo/local fields only in the current schema. Production forms display these values as read-only until matching database columns are provisioned.

### 2. Payload Sanitization (`src/lib/db.ts`)
To prevent schema validation errors when interfacing with Supabase:
* Custom local storage configurations (demo mode) persist all custom parameters.
* The Supabase serialization handler (`upsertCompetencyType`) strips `review_period_months` and `warning_days` from remote payloads, preventing column mismatch failures.
* Production users can still create, edit, archive, and restore schema-backed competency fields according to their role.

### 3. Compliance & Expiry Engine (`src/lib/competencyEngine.ts`)
The compliance status calculations have been updated to support customizable warning windows:
* `calculateCompetencyStatus` accepts an optional `warningDays` parameter.
* `buildCompetencyMatrix` and `buildCompetencySummary` load each competency type's warning window (`type.warning_days ?? DEFAULT_WARNING_DAYS`) to dynamically determine warning status.

---

## Competency Registry Capabilities

The **Competency Registry** tab (`src/app/dashboard/competencies/page.tsx`) manages the organization's competency catalog:

### 1. Lifecycle Operations
* **Create**: Authorized roles can define competencies with title, description, category, default risk, renewal period, and evidence requirements. Review period and custom warning window are editable in demo mode only.
* **Edit**: Modify titles, categories, renewal profiles, and evidence constraints.
* **Archive/Restore**: Soft-delete/deactivate competencies to remove them from active compliance scoring grids without destroying historical training logs.
* **Duplicate**: Instantly clone existing definitions to speed up setup for similar qualifications.
* **Template Packs**: Direct entry point to import generic operational starter packs.

### 2. Selection & Bulk Updates
Equipped with a bulk operation toolbar allowing users to:
* Re-categorize multiple competencies at once.
* Bulk-assign renewal periods. Warning-window bulk changes are available in demo mode only.
* Toggle evidence file upload requirements across multiple items.
* Bulk archive inactive competency types.

### 3. Integrated Registry Stats & Metrics
Every row in the registry displays live record telemetry showing:
* **Record Health**: Computed from competency records that actually exist for active people.
* **Record States**: Breakdown of valid, expiring, expired, and incomplete records.
* **Linked Requirements**: Counter showing the number of generic requirements mapped to the competency.
* **Evidence Count**: Counter showing number of document attachments stored in the vault matching this competency.

The current schema does not contain a separate person-to-competency assignment table. The registry therefore does not infer that every active person is assigned every competency. The People Matrix retains its existing gap view, while registry summaries and reports count actual records only.

---

## Navigation & Deep-Linking

The page mounts state via URL query parameters, enabling deep-linking directly into detail drawers:
* `?tab=registry` - Focuses the Competency Registry tab.
* `?tab=registry&competency=<id>` or the legacy `?competencyId=<id>` - Opens the registry tab and loads the **Competency Detail Workspace Drawer** for the specified competency.
* `?person=<id>` - Opens the People Matrix tab and opens the selected teammate's training drawer.
* `?person=<id>&competency=<id>` - Opens the selected person and competency cell in the People Matrix.

### Global Search Integration
The **Global Search Panel** (`src/components/GlobalSearchPanel.tsx`) routes competency type results (`/dashboard/competencies?competency=<id>`) directly into the registry detail drawer.

## Existing Records and History

Changing a competency type's renewal default does not rewrite existing person competency records. Existing completion and expiry dates remain authoritative until a user explicitly edits those records.

The History tab displays matching competency audit-log entries. It is a filtered view of the existing audit trail, not a separate complete event-sourcing system.
