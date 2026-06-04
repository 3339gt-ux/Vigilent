# Evidence Vault

The Evidence Vault stores private organisation-scoped evidence records. Files are uploaded to the private Supabase Storage bucket and opened only through temporary signed URLs.

## Uploads

The Vault supports:

- click-to-upload through the existing upload modal
- drag-and-drop upload through the shared `EvidenceDropzone`
- multi-file upload
- per-file validation and upload status
- post-upload bulk configuration

Bulk uploads default to category `General`. Users can edit metadata and links immediately after upload.

## Links

Uploaded documents can be linked to existing:

- Requirements
- Evidence Criteria
- Action Records
- Competency Records

Action and competency-specific upload areas automatically create the correct link after upload. If linking fails after the document is created, the Evidence Vault document remains available for manual linking.

## Security

No public URLs are generated. The client does not use service-role keys. Storage and database access continue to rely on Supabase Auth, organisation membership, RLS, and signed URL checks.
