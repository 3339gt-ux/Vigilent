# Upload Test Plan

Run these checks in demo mode and Supabase mode.

## Evidence Vault

- [ ] Drag one PDF onto the Evidence Vault dropzone.
- [ ] Drag five mixed supported files onto the Evidence Vault dropzone.
- [ ] Confirm one Evidence Vault document is created per file.
- [ ] Confirm the bulk configuration panel opens after successful upload.
- [ ] Update title, category, tags, issue date, expiry date, review date, training date, calibration date, and notes.
- [ ] Link an uploaded file to a requirement.
- [ ] Link an uploaded file to an evidence criterion.
- [ ] Link an uploaded file to an action record.
- [ ] Link an uploaded file to a competency record.
- [ ] Refresh the browser and confirm uploaded records persist.

## Requirement Criteria

- [ ] Drop one supported file onto a requirement evidence criterion upload area.
- [ ] Drop multiple supported files onto the same criterion.
- [ ] Confirm files are uploaded as private Evidence Vault records.
- [ ] Confirm files are automatically linked to the selected criterion.
- [ ] Confirm a linking failure shows a readable error and the Evidence Vault document remains available.

## Action Attachments

- [ ] Open an action detail drawer.
- [ ] Drop one file into action attachments.
- [ ] Drop multiple files into action attachments.
- [ ] Confirm uploaded documents use category `Actions`.
- [ ] Confirm documents are linked through `action_documents`.
- [ ] Confirm the action timeline records `Uploaded attachment: {filename}`.
- [ ] Open an attachment and confirm it uses a signed URL.

## Competency Records

- [ ] Open a competency record drawer and drop one supported evidence file.
- [ ] Open a person detail drawer and drop multiple files onto a competency record.
- [ ] Confirm uploaded documents use category `Training & Competency`.
- [ ] Confirm documents are linked through `competency_record_documents`.
- [ ] Confirm uploads are disabled until a competency record exists.

## Dashboard Quick Upload

- [ ] Choose a category and optional expiry date.
- [ ] Drop multiple files into the quick upload dropzone.
- [ ] Confirm every file uses the selected category and expiry date.

## Error Handling

- [ ] Drop an unsupported file such as `.exe` or `.js` and confirm a clear per-file error.
- [ ] Drop an oversized file and confirm a clear per-file error.
- [ ] Mix supported and unsupported files and confirm supported files still upload.
- [ ] Confirm RLS or permission errors are readable.
- [ ] Drag the same PDF twice and confirm the possible duplicate modal appears.
- [ ] Cancel a possible duplicate and confirm it is not uploaded.
- [ ] Upload a possible duplicate anyway and confirm it creates a separate record.
- [ ] Drag five files including two possible duplicates and confirm non-duplicates continue.

## Archive And Preview

- [ ] Archive one document and confirm it appears in the Evidence Vault Archive tab.
- [ ] Restore the archived document and confirm it returns to Active Evidence.
- [ ] Archive multiple documents and bulk restore them.
- [ ] Archive multiple documents and bulk permanently delete them.
- [ ] Hover or focus an image evidence row and confirm a signed preview appears.
- [ ] Hover or focus a PDF evidence row and confirm a preview or fallback appears.
- [ ] Hover or focus a DOCX/XLSX evidence row and confirm a file card fallback appears.
- [ ] Confirm the hover preview appears beside the hovered row/icon instead of fixed over unrelated UI.
- [ ] Move the pointer from the row to the preview and confirm the preview remains available long enough to click Expand.
- [ ] Click preview and confirm the larger preview modal opens.
- [ ] Confirm the larger preview modal shows the file preview on the left and metadata, linked requirements, criteria, actions, competency records, and archive actions on the right.
- [ ] Open from the preview modal and confirm it uses a signed URL.

## Validation Commands

- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `git diff --check`
