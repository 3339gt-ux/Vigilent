# Action Records

Vygilence actions are auditable records attached to operational objects. The current UI attaches actions to requirements, while the schema also includes `action_object_links` so later modules can attach the same action model to audit findings, CAPAs, non-conformances, training gaps, document reviews, risk register entries, and customer audit findings.

## Current Tables

- `actions`: canonical action record and lifecycle fields.
- `requirement_actions`: current production relationship between requirements and actions.
- `action_object_links`: future-compatible generic relationship table.
- `action_updates`: user-facing action timeline.
- `action_documents`: links private Evidence Vault documents to actions.
- `audit_logs`: existing system activity log.

## Lifecycle Fields

- `opened_at` and `opened_by`: set when an action is created/opened.
- `target_due_date`: canonical due date for action records; `due_date` remains for compatibility.
- `status_changed_at` and `status_changed_by`: updated on every status transition.
- `closed_at` and `closed_by`: set when an action is completed or cancelled.
- `completion_note`: required when completing an action.
- `cancellation_note`: optional but encouraged when cancelling.

Existing `completed_at`, `completed_by`, `cancelled_at`, and `cancelled_by` remain populated for backwards compatibility.

## Timeline

Every lifecycle event writes to `action_updates` with:

- user id
- timestamp
- previous status
- new status
- note or reason where supplied

Manual updates support `Note` and `Progress Update`. System lifecycle events use `Status Change`, `Completion Note`, `Cancellation Note`, `Reopen Note`, and `Evidence Added`.

## Attachments

Action attachments use existing private Evidence Vault records only. Files are not uploaded to a separate action storage system. Opening an attachment uses the existing signed URL flow after the document record is confirmed inside the active organisation.

Users can attach evidence in two ways:

- Link an existing Evidence Vault document.
- Upload a new file directly inside the Action Record drawer.

Direct action uploads create a normal private Evidence Vault document with category `Actions`, then create an `action_documents` link to the action. The action timeline records `Evidence Added` with `Uploaded attachment: {filename}`. The uploaded document remains visible in Evidence Vault and can be filtered by the `Actions` category.

When a user opens a document in Evidence Vault, any linked actions are shown with title, status, due date, owner, related requirement, and an `Open linked action` button.

## Security

RLS keeps action records, timeline updates, attachments, and generic links organisation-scoped. Viewers can read records for their organisation. Write access uses the existing organisation write helper so viewer roles remain read-only.

## UI Entry Points

- Requirement detail action rows open the Action Record drawer.
- Dashboard Open Actions opens the same drawer.
- Dashboard Top Risks links to the related open action when one exists.
