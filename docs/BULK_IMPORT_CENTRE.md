# LUMÉN Bulk Import Centre

The Bulk Import Centre is the safe foundation for importing records from existing customer systems into LUMÉN.

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

Relationship/link imports are deferred to a later phase:

- Evidence-to-Requirement Links.
- Evidence-to-Person Links.
- Evidence-to-Asset Links.
- Evidence-to-Competency Links.
- Actions.

## Template Fields

Every template includes `external_id`. This is required for safe matching, future rollback, and future source-system synchronisation.

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

Stores stable source-system IDs mapped to LUMÉN entity IDs. This is required for future updates, duplicate control, and rollback.

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
