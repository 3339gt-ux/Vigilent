# Overview360 Bulk Import Centre

The Bulk Import Centre is the safe foundation for importing records from existing customer systems into Overview360.

Phase 1 is deliberately preview-first. It does not write uploaded spreadsheet rows directly into live requirements, people, asset, competency, evidence, action, report, or audit-pack tables.

## Purpose

Bulk import must respect the programme model:

- Requirements define the obligation.
- People and assets are the subjects.
- Competencies, checks, reviews, and procedures are the controls.
- Evidence proves the controls.
- Actions fix gaps.
- Reports and audit packs show the result.

The import centre exists to prevent uncontrolled spreadsheet uploads from turning live data into a dumping ground.

## Supported Phase 1 Imports

The route `/dashboard/imports` supports template download, CSV upload, parsing, validation preview, duplicate detection, unresolved-link reporting, and proposed row actions for:

| Import type | Phase 1 status |
|---|---|
| Requirements | Preview only |
| People | Preview only |
| Assets | Preview only |
| Competency Types | Preview only |
| Person Competency Records | Preview only |
| Asset Check Types | Preview only |
| Asset Check Assignments | Preview only |
| Evidence Metadata | Preview only, metadata only |

Phase 1.5 adds validation UX hardening only. It still does not commit rows to live records.

Relationship/link imports are deferred to a later phase:

- Evidence-to-Requirement Links.
- Evidence-to-Person Links.
- Evidence-to-Asset Links.
- Evidence-to-Competency Links.
- Actions.

## Template Fields

Every template includes `external_id`. This is required for safe matching, future rollback, and future source-system synchronisation.

Each supported import type now has two download options:

- Blank template: headers only, intended for customer data preparation.
- Example template: generic sample rows showing realistic values and linked external IDs.

Example templates are examples only. They do not represent production data, do not claim compliance, and do not upload or link physical evidence files.

### Sample External ID Strategy

The bundled example templates use consistent sample external IDs so users can understand the relationship model:

- People: `person-001`, `person-002`.
- Competency Types: `comp-forklift`, `comp-driver-cpc`.
- Person Competency Records reference the example people and competency types.
- Assets: `asset-forklift-001`, `asset-trailer-001`.
- Asset Check Types: `check-weekly-forklift`, `check-annual-trailer`.
- Asset Check Assignments reference the example assets and check types.
- Evidence Metadata uses metadata-only references such as `evidence-forklift-cert-person-001`.

For real imports, external IDs should come from the customer's source system where possible. If no source ID exists, create a stable deterministic ID before upload and keep it unchanged across future imports.

### Requirements

Required:

- `external_id`
- `title`
- `category`

Optional:

- `description`
- `risk_level`
- `owner_email`
- `review_frequency_months`
- `next_review_date`
- `evidence_required`
- `source_system`
- `source_reference`
- `notes`

### People

Required:

- `external_id`
- `first_name`
- `last_name`

Optional:

- `employee_number`
- `email`
- `department`
- `role`
- `person_type`
- `active`
- `start_date`
- `notes`

### Assets

Required:

- `external_id`
- `asset_name`
- `asset_type`

Optional:

- `asset_number`
- `category`
- `subcategory`
- `registration_or_serial`
- `location`
- `department`
- `owner_email`
- `active`
- `notes`

### Competency Types

Required:

- `external_id`
- `title`
- `category`

Optional:

- `description`
- `validity_period_months`
- `evidence_required`
- `default_risk_level`
- `active`
- `notes`

### Person Competency Records

Required:

- `external_id`
- `person_external_id`
- `competency_external_id`
- `status`

Optional:

- `completed_date`
- `expiry_date`
- `provider`
- `trainer`
- `certificate_number`
- `evidence_file_name`
- `notes`

### Asset Check Types

Required:

- `external_id`
- `title`

Optional:

- `category`
- `description`
- `frequency_months`
- `warning_days`
- `evidence_required`
- `risk_level`
- `active`
- `notes`

### Asset Check Assignments

Required:

- `external_id`
- `asset_external_id`
- `check_type_external_id`

Optional:

- `required`
- `frequency_months_override`
- `next_due_date`
- `active`
- `notes`

### Evidence Metadata

Required:

- `external_id`
- `file_name`
- `document_title`

Optional:

- `evidence_type`
- `category`
- `issue_date`
- `expiry_date`
- `review_date`
- `source_system`
- `external_file_reference`
- `tags`
- `notes`

Evidence Metadata does not mean evidence files have been uploaded. It is metadata and external reference information only.

## Validation Rules

General validation:

- Required fields must be present.
- Required columns must exist.
- Unknown columns are reported.
- Dates must use `YYYY-MM-DD`.
- Boolean values must be recognisable.
- Duplicate `external_id` values inside the file are errors.
- Long fields are warnings.
- Existing likely duplicates are warnings and proposed as skips until reviewed.

People validation:

- Duplicate employee numbers are warnings.
- Duplicate emails are warnings.
- First and last name are required.

Requirements validation:

- Duplicate titles are warnings.
- Category is required.
- Review frequency months must be numeric where provided.

Assets validation:

- Duplicate asset numbers are warnings.
- Duplicate registration or serial numbers are warnings.
- Asset type is required.

Competency Records validation:

- Unknown `person_external_id` is an unresolved-link error.
- Unknown `competency_external_id` is an unresolved-link error.
- Expiry date cannot be before completed date.

Asset Check Assignments validation:

- Unknown `asset_external_id` is an unresolved-link error.
- Unknown `check_type_external_id` is an unresolved-link error.
- Next due date must be valid.

Evidence Metadata validation:

- File name and document title are checked.
- Expiry cannot be before issue date.
- Metadata-only warning is always shown.
- No file upload, signed URL, or storage path is created.

### Validation Message Style

Messages should be plain English and action-focused. For example:

- "Person reference was not found. Import the People template first or correct person_external_id."
- "Check type was not found. Import the Asset Check Types template first or correct check_type_external_id."
- "Evidence metadata imports do not upload files. Upload physical evidence separately through the private Evidence Vault workflow."

The validation preview separates errors, warnings, duplicates, and unresolved links so users can fix the file before any future commit workflow is considered.

## Preview-First Model

The UI wizard is:

1. Select import type.
2. Download template.
3. Upload CSV.
4. Parse file.
5. Validate rows.
6. Preview proposed actions.
7. Save draft batch after database support is provisioned.
8. Commit after batch, row, snapshots, permissions, and rollback are verified.

Phase 1 stops before commit.

## Recommended Import Order

Use this order for validation and future staged imports:

1. Requirements.
2. People.
3. Assets.
4. Competency Types.
5. Asset Check Types.
6. Person Competency Records.
7. Asset Check Assignments.
8. Evidence Metadata.
9. Evidence link imports later.
10. File/ZIP imports later.

The order matters because relationship rows need base records to exist first. Person competency records need people and competency types. Asset check assignments need assets and check types.

In this premium UX refinement, the import order section is redesigned as an interactive, multi-stage guided workflow with the following features:
- **Toggle View Mode**: Users can switch between "Guided" (detailed explanation, dependencies, tips, checklist) and "Compact" (shorter step cards, minimal text for returning users).
- **Why this order matters panel**: Contextual advice on why base records must precede relationship records, featuring key advice chips.
- **Before you upload Checklist**: A mini checklist verifying requirements like template matching, stable external IDs, and validation review.
- **Common validation issues tips**: Bulleted common errors (missing columns, duplicate IDs, unknown references, date formats) to debug CSVs quickly.
- **Interactive Steps**: Clicking any active step card instantly updates the active template selection, making theStepper function as an interactive navigation wizard.
- **Stage-Grouped Columns**: Organized as a left-to-right journey across 3 columns: Stage 1 (Foundation Data), Stage 2 (Dependent Records), and Stage 3 (Later/Deferred) with deferred items visually muted.

## Validation Preview UX

The preview now includes:

- Summary cards for total rows, valid rows, warnings, errors, duplicates, unresolved links, proposed creates, and updates/skips.
- Filter tabs for all rows, valid rows, warnings, errors, duplicates, and unresolved links.
- Row-level counts for errors and warnings.
- Expandable row details showing original source row, mapped data, validation messages, unresolved links, and duplicate matches.
- A disabled live commit boundary explaining why commit is unavailable in Phase 1.5.

## Validation Report Export

Users can download a client-side `Validation Report CSV` from the current preview.

The report includes:

- import type;
- row number;
- external ID;
- proposed action;
- status;
- errors;
- warnings;
- unresolved links;
- duplicate keys.

The report is generated entirely from the client-side validation result. It does not write to Supabase, create import rows, or create live records.

## Import Batch Design

The draft migration is:

`supabase/migrations/20260616000000_import_batches.sql`

It proposes:

- `import_batches`
- `import_rows`
- `external_references`

### `import_batches`

Stores one upload/validation/import run. It captures organisation, type, source system, uploaded file name, user IDs, row counts, status, timestamps, and metadata.

### `import_rows`

Stores each row from the uploaded file with source data, mapped data, row status, proposed action, validation errors, validation warnings, before snapshot, and after snapshot.

### `external_references`

Stores stable source-system IDs mapped to Overview360 entity IDs. This is required for future updates, duplicate control, and rollback.

## Rollback Design

Rollback must be built before live imports are enabled.

Required rollback behaviour:

- Every committed row must record `before_snapshot` and `after_snapshot`.
- Created rows should be archived or deleted only where safe.
- Updated rows should be restorable from `before_snapshot`.
- Evidence metadata rows must never imply physical file deletion.
- Rollback should create audit trail entries.
- Rollback must be organisation-scoped.

## Permissions

The migration draft uses existing organisation helper functions:

- Organisation members can read their own organisation import history.
- Owner/Admin/Editor can create and update draft import rows where current write permissions allow.
- Viewer cannot import.
- Owner/Admin can delete import batches and rows.

This must be reviewed before hosted Supabase migration.

## Evidence Metadata vs Evidence Files

Evidence metadata import is allowed in Phase 1 as preview only.

It can contain:

- file name;
- title;
- evidence type;
- category;
- issue, expiry, and review dates;
- source system;
- external file reference;
- tags;
- notes.

It must not:

- create fake uploaded files;
- create storage paths;
- create signed URLs;
- pretend a physical file exists in the private bucket;
- auto-link evidence to requirements or subjects without confirmation.

Evidence file or ZIP upload is deferred.

In Phase 1.5, Evidence Metadata examples are deliberately metadata-only. They may include `external_file_reference` values from a legacy source, but those values are not storage paths, signed URLs, or uploaded files.

## Phase 1.5 Boundary

Phase 1.5 improves user understanding only:

- Better templates.
- Example rows.
- Better validation summaries.
- Row-level inspection.
- Validation report export.
- Import order guidance.
- Clearer disabled commit state.

It does not enable:

- Live record creation.
- Live record update.
- Import batch persistence through the app.
- Evidence file upload.
- Evidence link import.
- Rollback execution.
- Hosted Supabase migration execution.

## Supabase Migration Status

The import batch migration has been created as a local SQL draft only.

Remote migrations have not been run. Hosted Supabase verification is required before any live import commit workflow is enabled.

## Deferred

- Live commit from import preview.
- Batch persistence through the app data service.
- Rollback execution.
- External reference matching against persisted historical mappings.
- Relationship/link imports.
- Evidence file and ZIP imports.
- Import audit trail entries.
- Admin review workflow for approving import batches.

## Review Checklist

- `/dashboard/imports` loads.
- Templates download.
- Invalid CSV shows errors.
- Valid template parses.
- Duplicate external IDs are detected.
- Unresolved person, competency, asset, and check links are shown.
- Evidence metadata warnings are visible.
- Commit remains disabled.
- Module entry points route to `/dashboard/imports?type=...`.
- No live records are created from CSV upload.
