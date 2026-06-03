# Storage Bucket Setup

## Run Order

1. Run `supabase/schema.sql`.
2. Run `supabase/storage_setup.sql`.

The core schema intentionally does not create or drop `storage.objects` policies. Hosted Supabase projects can reject repeated policy drops on `storage.objects` with `must be owner of table objects`.

## Bucket

- Bucket name: `evidence-documents`
- Visibility: private, not public
- Expected UI setting: Public bucket toggle off
- File size limit: `10 MB` unless you intentionally change both `supabase/storage_setup.sql` and `NEXT_PUBLIC_VIGILEN_MAX_UPLOAD_BYTES`
- Allowed MIME types:
  - `application/pdf`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `image/png`
  - `image/jpeg`

## Object Path

Vygilence writes files only under:

```text
organisations/{organisation_id}/documents/{document_id}/{safe_filename}
```

The application creates `document_id`, sanitises the filename, uploads the file, and then inserts the `evidence_documents` row.

## Required Storage Policies

`supabase/storage_setup.sql` creates these policies on `storage.objects` only when they are missing:

The policy names still use the original `Vigilen` prefix for compatibility with existing Supabase projects. Do not rename them unless you plan a deliberate policy migration.

- `Vigilen evidence read by organization members`
  - Command: `SELECT`
  - Role: `authenticated`
  - Allows reads for objects in `evidence-documents` where the path organisation id belongs to the current user.

- `Vigilen evidence upload by organization editors`
  - Command: `INSERT`
  - Role: `authenticated`
  - Allows uploads only to `organisations/{organisation_id}/documents/...` when the user has Owner, Admin, or Editor role for that organisation.

- `Vigilen evidence update by organization editors`
  - Command: `UPDATE`
  - Role: `authenticated`
  - Allows object updates only inside the user's writable organisation path.

No storage delete policy is required for MVP. Vygilence soft-deletes document records and leaves files in the private bucket.

## Supabase UI Checks

In Storage > Buckets:

- Confirm `evidence-documents` exists.
- Confirm it is private.
- Confirm allowed MIME types match this document.
- Confirm file size limit matches the application environment.

In Storage > Policies:

- Confirm the three `Vigilen evidence ...` policies exist on `storage.objects`.
- Do not create broad public read policies.
- Do not create anonymous upload policies.
- Do not create delete policies for MVP evidence files.

## Re-running The Script

`supabase/storage_setup.sql` is designed to be safe to paste into Supabase SQL Editor multiple times. It:

- upserts the bucket
- creates missing policies by name
- does not drop policies
- does not recreate or alter `storage.objects`

If a policy already exists but needs to change, update it deliberately through the Supabase dashboard or manually drop that specific policy before re-running the setup script.
