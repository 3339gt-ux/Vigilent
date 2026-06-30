# Evidence Pack Builder - Stage 3C-A Private File Export Hardening Design

This document defines the secure design for Stage 3C full Evidence Pack Builder ZIP export with private evidence and image files.

It began as a design and security review only.

Stage 3C-B has now been implemented for local testing against this design. The implementation keeps the same security rules and still requires hosted Supabase verification before production use.

## Stage 3C-B implementation status

The current local-testing checkpoint now includes:

- metadata-only ZIP export
- full private-file ZIP export for selected, permitted files
- organisation revalidation before fetch
- short-lived signed URL fetching with immediate blob download
- included, failed, and deferred file logs
- updated traceability rows for actual files
- conservative file count and size limits
- summary-only audit events where the existing audit helper can record them safely

The current implementation still treats the following as production blockers:

- hosted Supabase RLS/storage verification
- multi-user organisation-isolation testing
- larger-pack browser memory testing
- operational monitoring and support procedures

One deliberate hardening rule was added during implementation: demo-mode exports reject external placeholder URLs and only allow directly embedded local file data. This keeps local testing from accidentally bundling public placeholder assets.

The implementation also chose contextual per-record file folders over broad aggregate `06-Evidence-Files/` and `07-Image-Attachments/` buckets so exported files remain understandable during audit review.

## 1. Current baseline

Current state in the codebase:

- Stage 3B metadata-only ZIP export is implemented in [src/lib/evidencePackExport.ts](C:/Vigilen/src/lib/evidencePackExport.ts).
- Full private-file export is now implemented for local testing in [src/components/packs/EvidencePackBuilderSidebar.tsx](C:/Vigilen/src/components/packs/EvidencePackBuilderSidebar.tsx) and [src/lib/evidencePackExport.ts](C:/Vigilen/src/lib/evidencePackExport.ts).
- Pack Builder draft state is local only and scoped by `userId + organisationId` in [src/components/packs/EvidencePackBuilderProvider.tsx](C:/Vigilen/src/components/packs/EvidencePackBuilderProvider.tsx).
- Evidence documents use the private Supabase bucket `evidence-documents`.
- Document opening and image opening already use short-lived signed URLs through:
  - [src/lib/db.ts](C:/Vigilen/src/lib/db.ts) `getDocumentSignedUrl`
  - [src/lib/db.ts](C:/Vigilen/src/lib/db.ts) `getImageAttachmentSignedUrl`
- Storage policies are defined separately in [supabase/storage_setup.sql](C:/Vigilen/supabase/storage_setup.sql).

What is already safe today:

- metadata ZIP export
- full ZIP export for selected and revalidated private files
- no signed URLs in ZIP output
- no public URLs in ZIP output
- no raw storage paths in ZIP output
- short-lived file fetches during export with no URL persistence

## 2. File source inventory

Stage 3C may need to include private files from the following sources.

| Source | Table / link | TS type | File metadata available | Bucket / path source | Current org guard | Safe for Stage 3C |
|---|---|---|---|---|---|---|
| Evidence Vault document | `evidence_documents` | `EvidenceDocument` | title, file name, safe file name, mime type, size, dates, tags | `evidence-documents` + `storage_path` | document lookup filtered by `organization_id` | Yes |
| Requirement-linked evidence | `requirement_documents` -> `evidence_documents` | `RequirementDocument` + `EvidenceDocument` | link + document metadata | document record | link table RLS + document RLS | Yes |
| Action-linked evidence | `action_documents` -> `evidence_documents` | `ActionDocument` + `EvidenceDocument` | link + document metadata | document record | link table RLS + document RLS | Yes |
| Competency record evidence | `competency_record_documents` -> `evidence_documents` | `CompetencyRecordDocument` + `EvidenceDocument` | link + document metadata | document record | link table RLS + document RLS | Yes |
| Asset check evidence | `asset_check_evidence_links` -> `evidence_documents` | `AssetCheckEvidenceLink` + `EvidenceDocument` | link + document metadata | document record | link table RLS + document RLS | Yes |
| Image attachments backed by direct storage path | `record_image_attachments` | `RecordImageAttachment` | file name, mime type, dimensions, role, caption | `storage_bucket` + `storage_path` | attachment lookup filtered by `organisation_id` | Yes, with extra care |
| Image attachments backed by document row | `record_image_attachments.document_id` -> `evidence_documents` | `RecordImageAttachment` + `EvidenceDocument` | attachment metadata + document metadata | delegated to document record | attachment RLS + document RLS | Yes |
| Asset primary image | `record_image_attachments` with `entity_type='asset'` and `is_primary=true` | `RecordImageAttachment` | image metadata | attachment fields | attachment RLS | Yes |
| Asset gallery / supporting photos | `record_image_attachments` with `entity_type='asset'` and non-primary roles | `RecordImageAttachment` | image metadata | attachment fields | attachment RLS | Yes |
| Person avatar / profile image | `record_image_attachments` with `entity_type='person'` | `RecordImageAttachment` | image metadata | attachment fields | attachment RLS | Yes |
| Requirement supporting images | `record_image_attachments` with `entity_type='requirement'` | `RecordImageAttachment` | image metadata | attachment fields | attachment RLS | Yes |
| Action supporting / before / after images | `record_image_attachments` with `entity_type='action'` | `RecordImageAttachment` | image metadata | attachment fields | attachment RLS | Yes |

### Sources that should remain deferred

The following should remain deferred until separately implemented and reviewed:

- any future report exports that reference generated files rather than source evidence
- any future audit-pack attachments stored outside `evidence-documents`
- any future external-drive or third-party file integrations
- any source whose only available reference is an external URL not controlled by the current organisation

## 3. Non-negotiable security rules

Stage 3C-B must follow these rules without exception:

1. Export only files that belong to pack items explicitly added to the current draft.
2. Export child files only when the corresponding child section is explicitly included.
3. Never export files from outside the current organisation.
4. Never use Supabase service-role keys in browser code.
5. Never create public URLs.
6. Never store signed URLs in the ZIP, manifests, CSVs, logs, localStorage, audit metadata, or UI copy.
7. Never write raw private storage paths into ZIP contents, CSVs, logs, localStorage, audit metadata, or UI copy.
8. Signed URLs may exist only in memory, only for the duration of export-time file fetch.
9. Missing, deleted, inaccessible, or permission-denied files must be logged explicitly, not silently omitted.
10. Metadata-only summaries and traceability files from Stage 3B must remain in the full export.
11. Export must stop or skip safely when permission checks fail.
12. Export must enforce bounded file counts and total byte limits to avoid browser memory crashes.
13. Export must not weaken existing Evidence Vault, image manager, or import-page drag/drop protections.

## 4. Permission and organisation isolation design

Permission checks must happen in layers.

### 4.1 Resolve user and organisation

At export start:

1. Resolve the authenticated user from the existing app session.
2. Resolve the active organisation from the same source used by the rest of the app.
3. Refuse full export if either value is missing.

The export must not rely only on Pack Builder UI state.

### 4.2 Rebuild export candidates from live state

Before any signed URL is requested:

1. Read the current Pack Builder draft.
2. Re-resolve every selected item against the current in-memory workspace collections.
3. Rebuild child file candidates from the current linked records, not from stale cached ZIP metadata.

This protects against stale local draft state, deleted records, or cross-route drift.

### 4.3 Revalidate each file candidate

Each file candidate must pass all of the following:

- source entity still exists
- source entity belongs to the active organisation
- linked evidence / attachment row belongs to the active organisation
- linked document row belongs to the active organisation where applicable
- file is not archived/deleted/permanently deleted in a way that should exclude it
- child section is enabled for the current pack item

### 4.4 App-layer and RLS roles

Checks should happen both:

- in the app layer before fetch
- in Supabase through existing RLS when requesting the signed URL

RLS remains the hard boundary.
App-layer checks provide clearer failure reporting and protect against stale or malformed client state.

### 4.5 Cross-organisation leakage prevention

Cross-organisation leakage is prevented by combining:

- organisation-scoped pack draft keys
- organisation-scoped workspace collections
- organisation-scoped link tables
- organisation-scoped document queries
- storage object policies that require the folder path org UUID to match `is_organization_member(...)`

### 4.6 Missing or unavailable files

If a linked record exists but the file is unavailable:

- do not fail the whole export by default
- log the failure in `failed-files.csv`
- include a clear reason such as `missing document row`, `missing storage path`, `permission denied`, `signed URL creation failed`, or `blob fetch failed`
- include the pack item, child section, and source record reference

## 5. Signed URL and private-file fetch design

### 5.1 Preferred fetch path

Preferred Stage 3C-B path:

1. client-side export coordinator resolves candidates
2. existing authenticated Supabase client requests a short-lived signed URL for one file at a time
3. file is fetched immediately as a blob
4. blob is written into the ZIP in memory
5. signed URL string is discarded immediately

No signed URL should be persisted in state longer than needed for the in-flight file fetch.

### 5.2 URL generation helpers

Do not expose raw storage paths outside the export helper.

Add export-specific helpers that return blob-ready fetch info, not raw URLs for UI reuse. For example:

- `buildExportDocumentBlob(documentId, signal)`
- `buildExportImageBlob(attachmentId, signal)`

These helpers should:

- perform app-layer validation
- call the existing RLS-protected access path
- fetch the blob immediately
- return only `{ blob, safeFileName, mimeType, traceability }`

### 5.3 Signed URL expiry

Use a short TTL.

Recommended Stage 3C-B default:

- 60 seconds

This is shorter than the general document preview TTL and better fits one-shot export fetches.

### 5.4 Retry and timeout

Recommended defaults:

- signed URL generation retry: 1 retry on transient network failure
- blob fetch retry: 1 retry on transient network failure
- per-file fetch timeout: 20 seconds
- overall export timeout warning: 2 minutes before prompting the user that the export is large

Do not retry permission errors.

### 5.5 Export cancellation

Use `AbortController` so the user can cancel while:

- collecting candidates
- requesting signed URLs
- fetching blobs
- building ZIP

Cancelled items should be logged as `cancelled` rather than `failed`.

### 5.6 Browser memory limits

Stage 3C-B should use conservative client-side limits.

Recommended initial limits:

- max files: 100
- max total bytes: 250 MB
- warn at: 50 files or 100 MB
- hard stop above configured limits unless the implementation later adds a safer streaming/server approach

These limits should be configurable in code constants, not user-editable settings in the first pass.

## 6. Full ZIP structure design

The full export should extend the Stage 3B metadata structure.

```text
AssureCore-Evidence-Pack-{safe-pack-name}-{YYYY-MM-DD-HHMM}/
|-- 00-Pack-Index/
|   |-- pack-summary.json
|   |-- pack-summary.csv
|   |-- included-items.json
|   |-- traceability-map.csv
|   |-- README.txt
|   `-- export-notes.txt
|-- 01-Requirements/
|   `-- {Requirement-Title}/
|       |-- requirement-summary.json
|       |-- evidence/
|       `-- images/
|-- 02-People/
|   `-- {Person-Name}/
|       |-- person-summary.json
|       |-- competency-evidence/
|       `-- images/
|-- 03-Assets/
|   `-- {Asset-Name}/
|       |-- asset-summary.json
|       |-- checks/
|       |   `-- evidence/
|       `-- images/
|-- 04-Actions/
|   `-- {Action-Title}/
|       |-- action-summary.json
|       |-- evidence/
|       `-- images/
|-- 05-Evidence-Metadata/
|   `-- {Evidence-Title}/
|       |-- evidence-metadata.json
|       `-- files/
`-- 99-Export-Logs/
    |-- included-files.csv
    |-- failed-files.csv
    |-- deferred-files.csv
    `-- export-limitations.txt
```

### 6.1 File naming

Use generated safe export paths only.

Rules:

- sanitize every export filename
- keep a safe extension where possible
- prefix duplicates with deterministic counters or short ids
- never trust source filenames for ZIP folder structure
- prevent `../`, slashes, control characters, and duplicate collision overwrites

### 6.2 Manifest references

Manifest and traceability files may reference:

- pack item ids
- source entity ids
- generated ZIP-relative export paths

They must not reference:

- Supabase signed URLs
- raw storage paths
- local machine paths

## 7. Traceability and audit design

### 7.1 Traceability map extension

`traceability-map.csv` should be extended so each file row records:

- pack item id
- pack item type
- pack item title
- child section
- source record type
- source record id
- source link table if relevant
- generated ZIP-relative file path
- file status: `included`, `failed`, `deferred`, `cancelled`
- note
- export timestamp

### 7.2 Additional export logs

Stage 3C-B should add:

- `00-Pack-Index/included-files.csv`
- `99-Export-Logs/failed-files.csv`
- retain `99-Export-Logs/deferred-files.csv`

Recommended columns for `included-files.csv`:

- pack item id
- item type
- item title
- source record id
- source kind
- zip_relative_path
- mime_type
- file_size_bytes
- checksum_sha256 if calculated

Recommended columns for `failed-files.csv`:

- pack item id
- item type
- item title
- source record id
- source kind
- failure_stage
- failure_reason
- child section
- timestamp

### 7.3 Checksums

Optional in Stage 3C-B:

- compute SHA-256 after blob fetch

This is useful for traceability but should be optional if it causes major client performance cost.

### 7.4 Export audit event

If existing audit logging is used, log only safe metadata:

- export started
- export completed / failed / cancelled
- user id
- organisation id
- pack item count
- included file count
- failed file count
- deferred file count
- total exported bytes
- export mode: `metadata-only` or `full-private-files`

Do **not** log:

- signed URLs
- storage paths
- bucket object names
- local download paths

If export audit logging cannot be added cleanly without noisy or misleading client-side audit records, defer file-level audit detail and keep only summary events.

## 8. UI design for Stage 3C-B

The sidebar should keep both export choices visible:

1. `Export metadata pack (.zip)`
2. `Export full pack with files`

### 8.1 Pre-export warning copy

Before full export starts, show a confirmation panel explaining:

- this export includes private files currently accessible to the active organisation
- inaccessible or missing files will be listed in export logs
- export may be large and take time
- export is not a compliance certificate
- export uses temporary in-memory access only

### 8.2 Progress states

Show explicit progress steps:

1. Collecting selected records
2. Checking permissions
3. Fetching private files
4. Building ZIP
5. Finalising download

### 8.3 Completion summary

After export:

- files included
- files failed
- files deferred
- total bytes exported
- any limits hit

### 8.4 Empty state

If no eligible files exist:

- still allow metadata export
- explain that the current pack has no included private files

## 9. Risk assessment

| Risk | Severity | Likely cause | Mitigation | Implementation location | Test required |
|---|---|---|---|---|---|
| Cross-organisation leakage | Critical | stale draft or unchecked linked records | revalidate every file candidate against current org + rely on RLS | export helper + db helpers | multi-user org isolation test |
| Signed URL leakage | Critical | writing URLs into logs/manifests/UI state | never persist URLs; fetch blob immediately and discard | export helper | ZIP content grep + runtime inspection |
| Raw storage path leakage | High | copying `storage_path` into metadata or logs | strip paths from all ZIP outputs and audit metadata | export helper + manifest builder | ZIP content grep |
| Browser memory crash | High | too many files / too much data in JSZip | hard file/byte limits + warnings + cancellation | export coordinator | large-pack browser test |
| Incomplete pack mistaken as complete | High | failed files not surfaced clearly | `failed-files.csv`, result summary, warning copy | sidebar UI + logs | failure simulation test |
| Duplicate filename overwrite | High | same file names from multiple sources | safe deterministic zip path naming | export helper | duplicate-name test |
| Missing files silently omitted | High | catch-and-continue without log entry | mandatory failed/deferred file logs | export helper | missing-file test |
| Stale local draft | Medium | localStorage draft references removed records | re-resolve from current state and mark unavailable | provider + export helper | stale-draft test |
| RLS/storage policy mismatch | High | path format or policy assumption drift | staged Supabase verification before production | docs + hosted test plan | hosted staging test |
| Audit trail gaps | Medium | export not logged or overlogged | summary-only export audit event | audit helper | audit event test |

## 10. Stage 3C-B implementation plan

### 10.1 Files to change

Expected primary files:

- [src/lib/evidencePackExport.ts](C:/Vigilen/src/lib/evidencePackExport.ts)
- [src/components/packs/EvidencePackBuilderSidebar.tsx](C:/Vigilen/src/components/packs/EvidencePackBuilderSidebar.tsx)
- [src/components/packs/EvidencePackBuilderProvider.tsx](C:/Vigilen/src/components/packs/EvidencePackBuilderProvider.tsx) only if export progress/cancel state belongs there
- [src/lib/db.ts](C:/Vigilen/src/lib/db.ts) for tightly scoped export fetch helpers
- [src/lib/auditTrail.ts](C:/Vigilen/src/lib/auditTrail.ts) only if summary audit event is added
- [docs/EVIDENCE_PACK_BUILDER.md](C:/Vigilen/docs/EVIDENCE_PACK_BUILDER.md)

### 10.2 Helpers to add

Recommended helpers:

- `collectPackFileCandidates(...)`
- `resolveDocumentExportCandidate(...)`
- `resolveImageExportCandidate(...)`
- `fetchExportDocumentBlob(...)`
- `fetchExportImageBlob(...)`
- `buildFullEvidencePackZip(...)`
- `sanitizeZipPathSegment(...)`
- `makeUniqueZipPath(...)`

### 10.3 Data structures to add

Recommended types:

- `PackFileCandidate`
- `PackFileFetchResult`
- `PackFileFailure`
- `PackExportProgress`
- `PackExportLimits`

### 10.4 Acceptance criteria

Stage 3C-B should only be accepted when:

- full export includes actual private files for allowed sources
- no signed URL appears in ZIP contents
- no raw storage path appears in ZIP contents
- no public URL appears in ZIP contents
- cross-organisation files cannot be exported
- failed and deferred files are logged clearly
- metadata-only export still works
- Evidence Vault upload/open behaviour still works
- image manager workflows still works
- Bulk Import `/dashboard/imports` drag/drop protection still works

### 10.5 Test commands

- `npm run build`
- `npm run lint`
- `git diff --check`

### 10.6 Browser smoke checklist

1. Create a pack with one requirement, one person, one asset, one action, and linked evidence.
2. Include at least one image attachment.
3. Run full export.
4. Open ZIP locally.
5. Confirm metadata files are still present.
6. Confirm expected private files are present.
7. Confirm `included-files.csv`, `failed-files.csv`, and `deferred-files.csv` are present.
8. Search ZIP contents for `signedUrl`, `supabase.co/storage`, `storage_path`, `organisations/`, and verify no private path leakage.
9. Confirm cancelled export leaves no misleading success state.
10. Confirm other upload and drag/drop features still behave normally.

## 11. What must remain deferred if unsafe

The following should stay deferred unless the implementation proves safe:

- server-side background export jobs
- exporting more than the conservative client-side file/size limit
- external third-party file sources
- permanent export history storage
- full file-level audit retention if it would require schema changes

## 12. Recommended implementation prompt for Stage 3C-B

Use this prompt for the next implementation pass:

> Implement Evidence Pack Builder Stage 3C-B full private-file ZIP export using the Stage 3C-A design in `docs/EVIDENCE_PACK_BUILDER_PRIVATE_EXPORT_DESIGN.md`. Keep metadata export intact. Add full export for private evidence and image files only for explicitly selected pack items and included child sections. Revalidate every candidate against the current active organisation before fetch. Use existing authenticated Supabase session flow only, with short-lived in-memory signed URLs and immediate blob fetch. Do not store signed URLs, public URLs, or raw storage paths in ZIP files, manifests, logs, localStorage, audit records, or UI state. Add `included-files.csv`, `failed-files.csv`, and retain `deferred-files.csv`. Enforce conservative client-side limits, progress UI, cancellation support, and clear failure reporting. Keep Evidence Vault, image attachments, Bulk Import drag/drop protections, and metadata-only export working. Run `npm run build`, `npm run lint`, and `git diff --check`.

## 13. Final recommendation

Full private-file export is safe to implement next **only if** Stage 3C-B follows this design exactly and is validated against hosted Supabase storage/RLS behaviour before any production claim is made.
