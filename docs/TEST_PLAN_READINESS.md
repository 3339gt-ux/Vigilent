# Readiness Test Plan

Run these checks in demo mode and production mode after applying the current schema.

## Automated Checks

1. Run `npm run lint`.
2. Run `npm run build`.

## Manual Checks

1. Open `/dashboard`.
2. Confirm the Overall Readiness widget displays a percentage.
3. Confirm the score explanation states Green=100, Amber=50, Red=0 and Grey excluded.
4. Confirm Category Scores appear when requirements exist.
5. Confirm Risk Scores appear when requirements have risk levels.
6. Create or import requirements with no linked evidence.
7. Confirm those requirements appear in Missing Evidence and Top 10 Risks.
8. Link valid evidence to a requirement.
9. Confirm the requirement score reason changes and readiness updates.
10. Set a requirement `next_due_date` inside 30 days.
11. Confirm it appears in Upcoming Due and becomes Amber unless a Red reason exists.
12. Set a requirement `next_due_date` in the past.
13. Confirm it appears in Overdue Reviews and becomes Red.
14. Link an open action to a requirement.
15. Confirm it appears in Open Actions and affects the requirement explanation.
16. Set the linked action due date in the past.
17. Confirm the requirement becomes Red.
18. Confirm Grey requirements are excluded from scoring when not assessed.
19. Confirm no public document URLs appear in readiness widgets.
20. Confirm switching organisations only shows readiness data for the active organisation.

## Regression Checks

1. Evidence Vault still uploads and edits documents.
2. Requirements page still lists requirements and linked evidence.
3. Audit Pack Builder still opens from `/dashboard/audit-packs`.
4. Existing audit packs still display on the dashboard.
