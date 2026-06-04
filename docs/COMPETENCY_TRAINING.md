# Competency & Training Management

Vygilence now treats competency as part of the evidence operating model:

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

## Security

All competency tables are organisation-scoped and protected by RLS. Users can only read or write competency data for organisations they belong to. Evidence remains private and must be opened through signed URLs.
