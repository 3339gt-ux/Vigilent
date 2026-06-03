# Action Records Test Plan

Run in demo mode and production mode where Supabase is configured.

## Schema

- Re-run `supabase/schema.sql` in Supabase SQL Editor.
- Confirm it does not drop tables or fail on existing policies.
- Confirm `actions` includes opened, due, status changed, closed, completion, and cancellation fields.
- Confirm `action_updates`, `action_documents`, and `action_object_links` exist with RLS enabled.

## Requirement Detail

- Open Requirements.
- Select a requirement with no actions and confirm the empty state appears.
- Add an action.
- Confirm the action appears as a clickable row.
- Open the action and confirm title, status, assignee, opened date, opened by, due date, related requirement, attachments, and timeline are visible.

## Lifecycle

- Start an open action and confirm status becomes `In Progress`.
- Confirm an `action_updates` row records previous and new status.
- Try to complete without a completion note and confirm it is blocked.
- Complete with a completion note and confirm `closed_at`, `closed_by`, and `completion_note` are populated.
- Reopen the action and confirm closed fields are cleared and a reopen history entry exists.
- Cancel an action and confirm `closed_at`, `closed_by`, and cancellation history are recorded.

## Updates

- Add a `Note`.
- Add a `Progress Update`.
- Confirm both appear in the action timeline with timestamp and user id.

## Attachments

- Upload an evidence document to the Evidence Vault.
- Open an action and link the existing evidence document.
- Confirm the attachment appears in the drawer.
- Open the attachment and confirm it uses a temporary signed URL.
- Unlink the attachment and confirm it disappears from the action.
- Open an action and use `Upload Attachment` to select a PDF, DOCX, XLSX, PNG, JPG, or JPEG.
- Confirm unsupported type and oversized file validation uses the existing Evidence Vault rules.
- Confirm the upload creates a private Evidence Vault document with category `Actions`.
- Confirm the new document is automatically linked through `action_documents`.
- Confirm the action timeline contains `Evidence Added` with `Uploaded attachment: {filename}`.
- Open Evidence Vault, filter category `Actions`, and confirm the uploaded document appears.

## Evidence Vault Action Links

- Select a document that is linked to one action.
- Confirm the detail panel shows linked action title, status, due date, owner, and related requirement.
- Click `Open linked action` and confirm the Action Record drawer opens.
- Link the same document to a second action and confirm both linked actions are shown.

## Dashboard

- Open Dashboard.
- Click an item in Open Actions and confirm the Action Record drawer opens.
- Find a Top Risk with an open action and confirm the related action link opens the drawer.

## Security

- As a viewer, confirm action records and timelines are readable but create/update/link controls fail under RLS.
- As a member/admin/owner, confirm actions can be updated.
- Confirm Organisation A cannot query or link Organisation B action updates, action documents, or evidence records.

## Build

- Run `npm run lint`.
- Run `npm run build`.
