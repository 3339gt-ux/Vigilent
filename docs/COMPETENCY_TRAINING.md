# Competency & Training Management

Overview360 now treats competency as part of the evidence operating model:

`Person -> Competency Requirement -> Competency Record -> Evidence Document -> Requirement -> Readiness`

The module is generic and reusable across employees, contractors, agency staff, drivers, temporary staff, consultants, visitors, and future industries.

## Core Objects

- `people`: organisation-scoped people records.
- `competency_types`: configurable competency requirements such as Forklift, Manual Handling, Driver CPC, Data Protection, or Internal Auditor.
- `competency_records`: dated completion and expiry records for one person and one competency type.
- `competency_record_documents`: links private Evidence Vault documents to competency records.
- `requirement_competency_types`: links competency types to generic requirements.

Evidence uploaded from the Competency Matrix is stored as a normal private Evidence Vault document in category `Training & Competency`. Files still use the private Supabase Storage bucket and signed URL flow.

## Template Packs

The Competency Matrix can import generic starter competency packs:

- Safety
- Equipment & Vehicle
- Transport
- Security
- Quality & Compliance
- Environmental
- Operational
- Professional
- Industry Certification

Template packs are starter data only. They do not certify compliance, copy standards text, or provide legal or safety advice.

## UI

The `Dashboard -> Competency Matrix` page includes:

- people rows and competency type columns
- Green/Amber/Red/Grey-style status coding through competency statuses
- add person with suggested department and role values while still allowing custom text
- edit person details from a person drawer
- deactivate/reactivate people instead of deleting history
- review all active competency types for one person from the person drawer
- edit a person's competency record directly from the person drawer
- remove a competency from a person with history-safe controls
- add competency type with labelled validity/refresher/risk fields
- edit or deactivate/reactivate competency types
- preview template packs before import
- select or clear individual template competencies
- edit competency record
- mark a competency record as `Not Required`
- clear a competency record back to `Missing` without removing evidence history
- link existing Evidence Vault document
- upload new private evidence
- create action from competency gap

Inactive people and inactive competency types are hidden from the matrix by default. Use the Active/Inactive/All filters to inspect retired people or inactive type definitions.

## Person Detail Management

Clicking a person name opens a person detail drawer. The drawer shows the person profile, active/inactive state, saved competency records, missing competency rows, linked evidence, and related actions.

Profile edits are saved through `people` and remain organisation-scoped. Deactivation uses `active = false` and an end date rather than deleting the person.

Each competency row can be edited in place. Editable fields are status, completed date, expiry date, trainer, provider, certificate number, and notes. Saving uses the existing `competency_records` upsert flow in production and demo modes.

Removal is intentionally conservative:

- If the record has linked evidence or related actions, the UI archives it by marking it `Not Required` and keeps history intact.
- If the record has no linked evidence and no related actions, the UI can delete the record after confirmation.
- Missing competencies can be marked `Not Required` without first opening a matrix cell.

Evidence operations in the person drawer reuse the private Evidence Vault:

- link existing Evidence Vault documents
- upload a new private Evidence Vault document in category `Training & Competency`
- drag and drop one or many competency evidence files through the shared upload dropzone
- open evidence through a signed URL
- unlink evidence from the competency record

Competency upload surfaces use the compact shared dropzone. The compact layout preserves duplicate checks, validation, signed URL security, and queue status while stacking link/upload controls in drawers so long filenames and helper text do not overlap action controls.

Action operations reuse Action Records. A user can create a gap action from a person competency row or open an existing linked action in the shared action detail drawer, including the action timeline and attachments.

## Security

All competency tables are organisation-scoped and protected by RLS. Users can only read or write competency data for organisations they belong to. Evidence remains private and must be opened through signed URLs.
