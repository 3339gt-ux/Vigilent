# Competency Readiness

Competency records feed the existing Readiness Engine. They do not replace requirements, evidence documents, reviews, or actions.

## Status Rules

- `Valid` records contribute Green.
- `Expiring Soon` records contribute Amber.
- `Expired` and `Missing` records contribute Red.
- `Not Required` records are excluded from competency compliance scoring.

When a requirement is linked to one or more competency types, the requirement readiness explanation includes competency signals. Example:

- Green: required competency is currently valid.
- Amber: required competency has records expiring soon.
- Red: required competency is expired, missing, or has no records.

Open overdue actions still force Red at the requirement level. Open unresolved actions still contribute Amber unless overdue.

## Dashboard Metrics

The dashboard shows:

- Competency Compliance percentage
- Expiring competency records
- Expired competency records
- Missing competency records
- Upcoming renewals

The competency percentage uses the same transparent scoring pattern:

- Valid = 100
- Expiring Soon = 50
- Expired/Missing = 0
- Not Required = excluded

This score is an internal readiness indicator only. It is not a compliance guarantee.
