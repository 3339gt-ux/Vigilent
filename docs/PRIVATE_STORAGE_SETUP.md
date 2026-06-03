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

`supabase/schema.sql` upserts this bucket when run in Supabase SQL Editor.

## Storage Path

All production evidence files must use:

```text
organisations/{organisation_id}/documents/{document_id}/{safe_filename}
```

The application generates `document_id`, sanitises the filename, uploads the private object, and then creates the `evidence_documents` row.

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

Apply the full `supabase/schema.sql` file. It is idempotent and includes:

- `evidence_documents` private storage metadata columns
- role-aware document RLS policies
- `evidence-documents` private bucket upsert
- storage object RLS policies for organisation-scoped paths

## Verification

- Upload succeeds for Owner/Admin/Editor users.
- Viewer users can read/open documents but cannot upload, edit, or soft-delete.
- Owners/Admins can soft-delete document rows without deleting storage objects.
- No evidence file public URLs are produced or stored.
- Signed URLs expire after `NEXT_PUBLIC_VIGILEN_SIGNED_URL_TTL_SECONDS`.
