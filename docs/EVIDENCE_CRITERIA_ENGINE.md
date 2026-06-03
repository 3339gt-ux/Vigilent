# Evidence Criteria Engine

The Evidence Criteria Engine prevents a requirement from being treated as covered just because any document is linked.

## Model

`Requirement -> Evidence Criteria -> Criterion Matches -> Coverage % -> Calculated Status`

Evidence criteria are the specific evidence items that must exist for a requirement. A broad legacy requirement-document link is not enough to prove coverage.

## Tables

- `requirement_evidence_criteria`: requirement-specific evidence criteria.
- `requirement_evidence_criterion_matches`: explicit matches between a criterion and a document, competency record, or action.

One document may support multiple criteria only when it is explicitly linked to each criterion.

## Coverage Rules

- Required criteria determine required coverage.
- Optional criteria add context but do not block coverage.
- Coverage percentage is based on satisfied required criteria.
- Weight is supported through `weight`.
- `minimum_count` controls how many matches a criterion needs.
- `validity_required` means a matched record must have a future expiry, review, training, or calibration date.
- Expiring evidence remains covered but creates an Amber warning.
- Expired evidence does not satisfy the criterion.

## Status Labels

- Green: `Fully Covered`
- Amber: `Partially Covered` or due soon
- Red: `Not Covered`, expired evidence, or critical gap
- Grey: `Not Assessed`

## Legacy Links

If a requirement has no criteria, legacy linked documents are shown as:

`Legacy evidence link - criteria not configured`

They do not automatically make the requirement Green.

## Private Evidence

Uploads from a criterion use the existing private Evidence Vault storage flow. No public URLs are created.
