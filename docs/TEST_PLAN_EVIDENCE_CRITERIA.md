# Evidence Criteria Test Plan

## Requirements Table

- [ ] Import a requirement template pack.
- [ ] Confirm Evidence Coverage shows counts such as `2/3 covered`.
- [ ] Confirm a requirement with legacy linked documents but no criteria is `Not Assessed`.
- [ ] Confirm one linked document does not make all criteria covered.

## Requirement Detail

- [ ] Add a required evidence criterion.
- [ ] Add an optional evidence criterion.
- [ ] Link an existing Evidence Vault document to one criterion.
- [ ] Confirm only that criterion changes status.
- [ ] Upload evidence from a criterion.
- [ ] Confirm the upload creates a normal private Evidence Vault document.
- [ ] Unlink evidence from a criterion.
- [ ] Delete a criterion.

## Validity

- [ ] Link evidence with a future expiry/review/training/calibration date and confirm Fully Covered.
- [ ] Link evidence expiring within the warning threshold and confirm Partially Covered.
- [ ] Link expired evidence and confirm Not Covered.
- [ ] Require dated evidence and confirm undated evidence does not satisfy the criterion.

## Readiness

- [ ] Confirm criteria coverage drives requirement readiness before legacy requirement-document links.
- [ ] Confirm Missing Evidence counts reflect uncovered required criteria.
- [ ] Confirm open overdue actions still force Red readiness.

## Evidence Vault

- [ ] Open a document linked to criteria.
- [ ] Confirm linked criteria and related requirements are visible.
- [ ] Confirm no public file URL is shown.

## Audit Packs

- [ ] Build a pack containing fully and partially covered requirements.
- [ ] Confirm coverage summary and missing criteria appear.
- [ ] Export CSV and confirm coverage fields are present.

## Validation

- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `git diff --check`
