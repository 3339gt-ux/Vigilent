# Storage Test Plan

## Setup

- Apply `supabase/schema.sql` in the Supabase SQL Editor.
- Apply `supabase/storage_setup.sql` in the Supabase SQL Editor.
- Confirm the `evidence-documents` bucket exists, is private, and has the allowed MIME types from the schema.
- Set `NEXT_PUBLIC_VIGILEN_APP_MODE=production`.
- Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=evidence-documents`, `NEXT_PUBLIC_VIGILEN_MAX_UPLOAD_BYTES`, and `NEXT_PUBLIC_VIGILEN_SIGNED_URL_TTL_SECONDS`.

## Upload Tests

- Sign in as an Owner/Admin/Editor user with an organisation.
- Upload one valid PDF, DOCX, XLSX, PNG, and JPG/JPEG through Evidence Vault.
- Confirm each file is stored under `organisations/{organisation_id}/documents/{document_id}/{safe_filename}`.
- Confirm each `evidence_documents` row includes original filename, safe filename, storage path, MIME type, file size, uploaded by, organisation id, category, status, and timestamps.
- Try an unsupported file extension and confirm the UI shows a clear error.
- Try a file above `NEXT_PUBLIC_VIGILEN_MAX_UPLOAD_BYTES` and confirm the UI blocks it.

## Signed URL Tests

- Open a document from the detail drawer and confirm the app opens a temporary signed URL.
- Confirm no public URL is stored in `evidence_documents.file_url`.
- Wait past `NEXT_PUBLIC_VIGILEN_SIGNED_URL_TTL_SECONDS` and confirm the old URL expires.
- Confirm a fresh click creates a new signed URL.

## Multi-Tenant Tests

- Create two organisations with separate users.
- Confirm Organisation A can upload, list, edit, and open only Organisation A documents.
- Confirm Organisation A cannot create signed URLs for Organisation B document ids.
- Confirm Organisation A cannot upload storage objects under Organisation B paths.

## Role Tests

- Owner/Admin/Editor can upload and edit active document metadata.
- Viewer can list and open documents but cannot upload or edit metadata.
- Owner/Admin can soft-delete documents.
- Viewer/Editor cannot soft-delete documents.

## Soft Delete Tests

- Soft-delete a document as Owner/Admin.
- Confirm the row status is `deleted`.
- Confirm the file remains in the private bucket.
- Confirm the document no longer appears in Evidence Vault, Matrix views, dashboard lists, or Audit Pack selection.

## Regression Tests

- Run `npm run build`.
- Run `npm run lint`.
- Re-run `supabase/schema.sql` and confirm it does not touch `storage.objects` policies.
- Re-run `supabase/storage_setup.sql` and confirm it does not fail on existing buckets or policies.
