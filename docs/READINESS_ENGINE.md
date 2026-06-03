# Readiness Engine

The Readiness Engine calculates organisation readiness from the generic Requirements Framework. It is standards-agnostic and does not claim compliance, certify an organisation, or provide legal or safety advice.

## Inputs

- `requirements`: the things the organisation must maintain or demonstrate.
- `requirement_documents`: links between requirements and private evidence records.
- `evidence_documents`: uploaded records, including status and expiry metadata.
- `reviews`: review history and due dates.
- `actions`: open, in-progress, and closed follow-up work.
- `requirement_actions`: links between requirements and actions.

All inputs are already scoped to the active organisation by the app data layer and Supabase RLS.

## Outputs

- Overall readiness score.
- Category scores.
- Risk-level scores.
- Missing evidence analysis.
- Upcoming due analysis.
- Overdue review analysis.
- Open action analysis.
- Top 10 risks.
- Readiness trend placeholder for future stored snapshots.

## Status Rules

- `GREEN`: requirement has linked evidence and no due, expiry or open-action warnings.
- `AMBER`: requirement has a warning, such as review due soon, evidence expiring soon, or an unresolved linked action.
- `RED`: requirement is missing evidence, has overdue review work, expired evidence, or an overdue linked action.
- `GREY`: requirement is not yet assessed and is excluded from scoring.

## Transparency

Each scored requirement includes reasons explaining why the score changed, for example:

- No evidence documents are linked.
- A linked document is expired.
- A review is overdue.
- A review is due within the warning window.
- A linked action remains unresolved.

The dashboard shows these reasons in the Top 10 Risks list.

## Implementation

Core code lives in:

- `src/lib/readinessEngine.ts`
- `src/context/AppContext.tsx`
- `src/app/dashboard/page.tsx`

The dashboard consumes one report object from `AppContext`: `readinessReport`.
