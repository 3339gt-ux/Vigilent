# Competency & Training Test Plan

Run these checks in demo mode and production mode.

## Matrix Setup

- [ ] Open `Dashboard -> Competency Matrix`.
- [ ] Confirm demo people and competency types appear.
- [ ] Add a person with department, role, and person type.
- [ ] Add a competency type with category, risk, validity period, and refresher period.
- [ ] Import a template pack and confirm duplicates are skipped.

## Records

- [ ] Open a matrix cell.
- [ ] Save a valid competency record with completed date and expiry date.
- [ ] Save an expiring record and confirm Amber status.
- [ ] Save an expired record and confirm Red status.
- [ ] Save `Not Required` and confirm it is excluded from compliance scoring.

## Evidence

- [ ] Link an existing Evidence Vault document to a competency record.
- [ ] Upload a new evidence file from the competency drawer.
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
- [ ] Confirm the action appears in open actions.
- [ ] Confirm the action has object links for person, competency type, and record when a record exists.

## Security

- [ ] Confirm users cannot see competency records for another organisation.
- [ ] Confirm Evidence Vault files remain private and no public URLs are generated.

## Validation Commands

- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `git diff --check`
