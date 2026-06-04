# Competency & Training Test Plan

Run these checks in demo mode and production mode.

## Matrix Setup

- [ ] Open `Dashboard -> Competency Matrix`.
- [ ] Confirm demo people and competency types appear.
- [ ] Add a person with suggested department, suggested role, and person type.
- [ ] Confirm custom department and role text can still be entered.
- [ ] Add a competency type with category, labelled risk, validity period, and refresher period.
- [ ] Confirm validity/refresher helper text is visible.
- [ ] Preview a template pack before import.
- [ ] Select and clear individual template competencies.
- [ ] Confirm duplicates are labelled and cannot be selected.
- [ ] Import selected non-duplicate competencies only.
- [ ] Use Active/Inactive/All filters for people and competency types.

## People And Types

- [ ] Click a person name and confirm the person detail drawer opens.
- [ ] Confirm the drawer shows employee number, email, department, role, person type, active state, start date, end date, and notes.
- [ ] Edit department, role, type, email, active status, notes, start date, and end date.
- [ ] Deactivate a person and confirm they disappear from the Active matrix view.
- [ ] Reactivate the person from the Inactive or All view.
- [ ] Confirm the person drawer shows saved records and missing active competency rows.
- [ ] Edit a competency record directly from the person drawer.
- [ ] Confirm status, completed date, expiry date, trainer, provider, certificate number, and notes save.
- [ ] Mark a missing person competency as `Not Required` from the person drawer.
- [ ] Remove a clean competency record and confirm deletion requires confirmation.
- [ ] Try to remove a record with linked evidence or actions and confirm it is archived/marked `Not Required` instead of hard-deleted.
- [ ] Open a competency type from the column header or management list.
- [ ] Edit title, category, description, validity period, refresher period, evidence required, default risk, and active status.
- [ ] Deactivate a competency type and confirm it disappears from the Active matrix view.
- [ ] Reactivate the type from the Inactive or All view.

## Records

- [ ] Open a matrix cell.
- [ ] Save a valid competency record with completed date and expiry date.
- [ ] Save an expiring record and confirm Amber status.
- [ ] Save an expired record and confirm Red status.
- [ ] Save `Not Required` and confirm it is excluded from compliance scoring.
- [ ] Use Mark Not Required in the record drawer.
- [ ] Use Clear Record and confirm the record returns to Missing without deleting linked evidence.

## Evidence

- [ ] Link an existing Evidence Vault document to a competency record.
- [ ] Upload a new evidence file from the competency drawer.
- [ ] Link an existing Evidence Vault document from a person competency row.
- [ ] Upload a new evidence file from a person competency row.
- [ ] Confirm compact upload areas do not overlap link buttons, action controls, or long helper text in the person drawer.
- [ ] Confirm the uploaded file appears in Evidence Vault as `Training & Competency`.
- [ ] Open linked evidence and confirm it uses a signed URL.
- [ ] Unlink evidence from the competency record.

## Requirements And Readiness

- [ ] Open a requirement detail drawer.
- [ ] Link a competency type to the requirement.
- [ ] Confirm the readiness explanation includes competency status.
- [ ] Confirm competency gaps appear as Red or Amber readiness reasons.

## Actions

- [ ] Create an action from a competency gap.
- [ ] Create an action from a person competency row.
- [ ] Open a linked action from the person drawer and confirm the Action Detail drawer opens.
- [ ] Confirm the action appears in open actions.
- [ ] Confirm the action has object links for person, competency type, and record when a record exists.

## Security

- [ ] Confirm users cannot see competency records for another organisation.
- [ ] Confirm Evidence Vault files remain private and no public URLs are generated.

## Validation Commands

- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `git diff --check`
