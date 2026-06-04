# Private Storage Setup

## Bucket

Create or verify a private Supabase Storage bucket:

- Name: `evidence-documents`
- Public: `false`
- Max file size: match `NEXT_PUBLIC_VIGILEN_MAX_UPLOAD_BYTES` and `supabase/schema.sql`
- Allowed MIME types:
  - `application/pdf`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `image/png`
  - `image/jpeg`

`supabase/storage_setup.sql` upserts this bucket when run in Supabase SQL Editor.

## Storage Path

All production evidence files must use:

```text
organisations/{organisation_id}/documents/{document_id}/{safe_filename}
```

The application generates `document_id`, sanitises the filename, uploads the private object, and then creates the `evidence_documents` row.

Action Record uploads use the same path and bucket. A file uploaded inside an Action Detail drawer is still a normal `evidence_documents` record with category `Actions`; the app then links it to the action via `action_documents`.

## Required Environment

```env
NEXT_PUBLIC_VIGILEN_APP_MODE=production
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=evidence-documents
NEXT_PUBLIC_VIGILEN_MAX_UPLOAD_BYTES=10485760
NEXT_PUBLIC_VIGILEN_SIGNED_URL_TTL_SECONDS=300
```

## Required SQL

Apply the SQL files in this order:

1. `supabase/schema.sql`
2. `supabase/storage_setup.sql`

`supabase/schema.sql` is idempotent and includes:

- `evidence_documents` private storage metadata columns
- role-aware document RLS policies

`supabase/storage_setup.sql` is idempotent and includes:

- `evidence-documents` private bucket upsert
- storage object RLS policies for organisation-scoped paths
- no `DROP POLICY` statements against `storage.objects`

## Verification

- Upload succeeds for Owner/Admin/Editor users.
- Viewer users can read/open documents but cannot upload, edit, or soft-delete.
- Owners/Admins can soft-delete document rows without deleting storage objects.
- No evidence file public URLs are produced or stored.
- Signed URLs expire after `NEXT_PUBLIC_VIGILEN_SIGNED_URL_TTL_SECONDS`.
- Files uploaded from Action Records appear in Evidence Vault under category `Actions`.
- Drag-and-drop and multi-file uploads use the same private bucket, document rows, RLS policies and signed URL flow as standard uploads. No separate attachment bucket or public upload path is required.
- Duplicate detection stores a client-side SHA-256 hash in `evidence_documents.file_hash` when available.
- Archive metadata is stored on `evidence_documents` using `archived_at`, `archived_by`, `deleted_at`, `deleted_by`, and `permanently_deleted_at`.
- Permanent delete in v1 marks `permanently_deleted_at`, removes known document links, removes audit-pack document references, and attempts private storage object removal.
