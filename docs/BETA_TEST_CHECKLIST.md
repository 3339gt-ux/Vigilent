# Beta Test Checklist

Run this checklist before a beta demo.

## Environment

- [ ] `npm install` has been run.
- [ ] `npm run build` passes.
- [ ] `npm run lint` passes with no errors.
- [ ] Demo mode is only enabled with `NEXT_PUBLIC_VIGILEN_APP_MODE=demo`.
- [ ] Production mode has Supabase variables configured.

## Authentication and Onboarding

- [ ] Login works in demo mode.
- [ ] Register works in demo mode.
- [ ] Production login uses Supabase Auth.
- [ ] Authenticated users without an organisation are sent to onboarding.
- [ ] Onboarding explains what the organisation workspace is for.

## Demo Data

- [ ] `Reset Demo Data` appears only in demo mode.
- [ ] Reset restores sample organisation, requirements, evidence, reviews, actions and audit packs.
- [ ] Reset does not appear in production mode.

## Dashboard

- [ ] First-run checklist is visible.
- [ ] Overall readiness score is visible.
- [ ] Readiness scoring explanation is visible.
- [ ] Top 10 Risks widget shows clear reasons.
- [ ] Missing Evidence widget handles empty and populated states.
- [ ] Overdue Reviews widget handles empty and populated states.
- [ ] Open Actions widget handles empty and populated states.

## Requirements

- [ ] Requirements page explains template pack import.
- [ ] Template pack preview works.
- [ ] Individual template requirements can be selected and deselected.
- [ ] Duplicate template requirements are skipped.
- [ ] Empty requirements state tells users to import a template pack.
- [ ] Requirement detail explains how to link evidence.

## Evidence Vault

- [ ] Vault explains upload and linking flow.
- [ ] Upload accepts supported file types.
- [ ] Upload errors are readable.
- [ ] Metadata save success and errors are visible.
- [ ] Evidence can be linked to requirements.
- [ ] Evidence can be unlinked from requirements.
- [ ] Private file opens through a signed URL only.

## Audit Pack Builder

- [ ] Builder explains how to create a pack.
- [ ] Empty requirement state points users to Requirements.
- [ ] Requirements can be selected.
- [ ] Missing evidence warnings appear.
- [ ] Due and expiry warnings appear.
- [ ] Open actions appear.
- [ ] Draft pack can be saved.
- [ ] Pack status can be changed to Ready, Sent or Archived.
- [ ] CSV export works.
- [ ] Print/PDF summary works.
- [ ] Exports do not include public evidence links.

## Product Boundaries

- [ ] No AI features are present.
- [ ] No OCR features are present.
- [ ] No Stripe work was added.
- [ ] No standards mapping was added.
- [ ] No legal, safety, certification or audit-success claims were added.
