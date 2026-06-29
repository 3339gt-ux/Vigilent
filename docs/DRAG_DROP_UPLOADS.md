# Drag-And-Drop Evidence Uploads

Overview360 uses a shared `EvidenceDropzone` component for drag-and-drop and multi-file upload surfaces. The component is a UI and queue layer only; it does not create a separate upload backend.

## Supported Surfaces

- Evidence Vault page: bulk upload to private Evidence Vault records, default category `General`, followed by bulk configuration.
- Requirement evidence criteria: upload one or many files directly to a criterion; each document is automatically linked to that criterion.
- Action Detail drawer: upload one or many attachments; each document is saved under category `Actions` and linked to the action record.
- Competency record drawer and person detail drawer: upload one or many evidence files under category `Training & Competency` and link to the competency record.
- Dashboard quick upload: supports drag/drop multi-file upload using the selected category and expiry date.

## Validation

All uploads use the existing Evidence Vault validation rules:

- PDF
- DOCX
- XLSX
- PNG
- JPG/JPEG

Unsupported executable, script, empty, oversized, or MIME-mismatched files are rejected per file. A failed file does not block the rest of the queue.

## Queue States

The dropzone shows staged statuses:

- `validating`
- `uploading`
- `saving record`
- `linking`
- `complete`
- `failed`

Supabase upload progress is not exposed consistently by the current client flow, so the UI shows reliable staged progress rather than a fake percentage.

## Duplicate Warnings

The dropzone checks possible duplicates before upload. Duplicate lookup includes active and archived Evidence Vault records in the current organisation. A SHA-256 hash match is shown separately from metadata-only matches. Users can skip one file, cancel remaining duplicate files, or upload anyway.

Production duplicate lookup uses ordinary organisation-scoped Supabase filters for hash matches and metadata matches. It avoids raw `or(...)` filter strings so filenames with spaces, punctuation, or PDF metadata do not bypass duplicate warnings.

## Compact Surfaces

The shared dropzone has a compact mode for drawers and matrix cells. Compact mode keeps the same validation, duplicate detection, queue states, and private upload flow, but reduces padding and stacks controls so competency drawers do not overlap or push action controls off-screen.

## Bulk Configuration

After Evidence Vault bulk upload, Overview360 opens a configuration panel where uploaded documents can be updated with:

- title
- category
- tags
- issue date
- expiry date
- review date
- training date
- calibration date
- notes

The panel can also link uploaded files to existing:

- Requirements
- Evidence Criteria
- Action Records
- Competency Records

Asset links are reserved for a future asset register. No asset module is added in this version.

## Security

Uploads continue to use private Evidence Vault storage, organisation-scoped document records, existing RLS policies, and signed URLs. No public URLs or service-role keys are used in client code.
