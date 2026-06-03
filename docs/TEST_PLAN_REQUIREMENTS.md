# Requirements Framework Test Plan

## Schema

- Run `supabase/schema.sql`.
- Confirm these tables exist: `requirements`, `requirement_evidence_types`, `requirement_documents`, `reviews`, `actions`, `requirement_actions`.
- Confirm each table has `organisation_id`.
- Confirm RLS is enabled on each table.

## Multi-Tenant Security

- Create two organisations with separate users.
- Create requirements in Organisation A and Organisation B.
- Confirm each user can see only their own organisation requirements.
- Confirm a user cannot link a document from another organisation.
- Confirm Viewer can read framework rows but cannot create, update, or link records.
- Confirm Owner/Admin/Editor can create requirements and link documents.

## Requirements Dashboard

- Visit `/dashboard`.
- Confirm widgets show:
  - Requirements Overview
  - Green Requirements
  - Amber Requirements
  - Red Requirements
  - Overdue Reviews
  - Open Actions
  - Upcoming Reviews

## Requirements Page

- Visit `/dashboard/requirements`.
- Confirm table columns show Title, Category, Owner, Status, Next Due Date, Linked Evidence, Actions, and Last Review.
- Create a new generic requirement.
- Confirm it appears with `GREY` or calculated status.
- Filter by status and search by title/category/owner.

## Detail Drawer

- Open a requirement.
- Confirm details, linked documents, open actions, review history, status history, and notes sections render.
- Link an existing document.
- Confirm linked evidence count increases.
- Unlink the document.
- Confirm linked evidence count decreases.

## Evidence Vault Linking

- Open `/dashboard/vault`.
- Select a document.
- Link it to an existing requirement.
- Open `/dashboard/requirements`.
- Confirm the requirement shows the linked document.

## Status Engine

- Requirement with no linked documents should calculate `RED`.
- Requirement with valid evidence and no near due date should calculate `GREEN`.
- Requirement with valid evidence due within 30 days should calculate `AMBER`.
- Requirement with overdue review should calculate `RED`.

## Regression

- Run `npm run build`.
- Run `npm run lint`.
