# Requirement Template Packs Test Plan

## Setup

- Sign in to a production-mode organisation or explicit demo mode workspace.
- Visit `/dashboard/requirements`.

## Import Modal

- Click `Import Template Pack`.
- Confirm all eight packs are visible.
- Select each pack and confirm the preview list changes.
- Confirm each preview item shows title, category, suggested owner, review frequency, risk level, and suggested evidence types.

## Selection

- Deselect one requirement.
- Use `Clear` and confirm no requirements are selected.
- Use `Select All` and confirm all non-duplicate requirements are selected.
- Confirm duplicate requirements are marked and cannot be selected.

## Import

- Import a subset of requirements.
- Confirm imported requirements appear in the Requirements table.
- Confirm dashboard Requirements Overview count updates.
- Open an imported requirement and confirm it behaves like a normal requirement.

## Duplicate Prevention

- Re-open the same pack.
- Confirm imported title/category combinations are marked as already present.
- Attempt another import and confirm duplicates are not recreated.

## Evidence Types

- After import, inspect `requirement_evidence_types`.
- Confirm suggested evidence types were created for imported requirements.
- Confirm evidence type rows are scoped to the active organisation.

## Security

- Confirm Organisation A cannot see Organisation B imported requirements.
- Confirm Organisation A cannot import rows into Organisation B.
- Confirm Viewer can read requirements but cannot import if RLS blocks writes.

## Regression

- Run `npm run build`.
- Run `npm run lint`.
