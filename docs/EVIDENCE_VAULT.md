# Evidence Vault

The Evidence Vault stores private organisation-scoped evidence records. Files are uploaded to the private Supabase Storage bucket and opened only through temporary signed URLs.

## Uploads

The Vault supports:

- click-to-upload through the existing upload modal
- drag-and-drop upload through the shared `EvidenceDropzone`
- multi-file upload
- per-file validation and upload status
- possible duplicate warnings before upload
- post-upload bulk configuration
- hover/focus preview using temporary signed URLs
- full private preview panel with metadata and linked records
- archive, restore and permanent-delete workflows

Bulk uploads default to category `General`. Users can edit metadata and links immediately after upload.

## Duplicate Detection

AssureCore calculates a client-side SHA-256 hash where available and stores it on `evidence_documents.file_hash`. Before a file is uploaded, the UI searches the active organisation, including archived records, for:

- matching SHA-256 hash
- matching original filename
- matching file size
- matching MIME type

The UI labels these as `Possible duplicate` unless there is a hash match. Users can cancel the file, cancel remaining duplicates, or upload anyway. Non-duplicate files in the same batch continue.

## Archive

Archive uses the existing `status = deleted` compatibility state plus archive metadata:

- `archived_at`
- `archived_by`
- `deleted_at`
- `deleted_by`

Archived evidence is hidden from normal active views and appears in the Evidence Vault Archive tab. Users can restore one or many archived records.

Permanent delete in v1 marks `permanently_deleted_at`, cleans known link tables, removes the document from audit packs, and attempts to remove the private storage object. If the storage object is already missing, the record is still marked permanently deleted.

## Links

Uploaded documents can be linked to existing:

- Requirements
- Evidence Criteria
- Action Records
- Competency Records

Action and competency-specific upload areas automatically create the correct link after upload. If linking fails after the document is created, the Evidence Vault document remains available for manual linking.

The preview panel shows linked requirements, evidence criteria, action records, and competency records for the selected document. Action links can be opened from the panel. File access still uses a temporary signed URL; no public preview URL is stored.

## Security

No public URLs are generated. The client does not use service-role keys. Storage and database access continue to rely on Supabase Auth, organisation membership, RLS, and signed URL checks.
