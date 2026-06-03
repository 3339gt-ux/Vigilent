# Requirements Engine

## Purpose

The Requirements Framework is the standards-agnostic foundation for Vigilen. It models operational things that must exist, be maintained, checked, or demonstrated without making any external framework the primary object.

Future framework mapping can add tables such as:

- `standard_frameworks`
- `framework_requirements`
- `requirement_framework_mappings`

Those mappings should point to requirements, not replace them.

## Core Objects

Requirement: a thing that must exist, be maintained, or be demonstrated.

Evidence: the kind of proof expected for a requirement.

Record: an uploaded document in the evidence vault.

Review: a point-in-time check of a requirement.

Action: a corrective or follow-up activity.

## Database Tables

- `requirements`
- `requirement_evidence_types`
- `requirement_documents`
- `reviews`
- `actions`
- `requirement_actions`

All tables are scoped by `organisation_id` and protected by RLS. Document security remains handled by private Supabase Storage and the existing evidence document policies.

## Status Engine

Requirement status is calculated from evidence links and review timing:

- `GREEN`: requirement has valid linked evidence and is not due soon.
- `AMBER`: requirement has valid linked evidence, but the review is due within the threshold.
- `RED`: requirement has no linked evidence, expired evidence, or an overdue review.
- `GREY`: requirement has not yet been assessed or is newly created before the first calculation.

The app currently uses a 30-day review warning threshold.

## Evidence Mapping

Documents and requirements are many-to-many:

- One requirement can have many records.
- One record can support many requirements.
- Links live in `requirement_documents`.

The Evidence Vault can link an uploaded record to requirements. The Requirements page can link requirements to existing records.

## Reviews And Actions

Reviews record status, notes, review date, and next due date.

Actions are standalone follow-up items that can be linked to requirements through `requirement_actions`.

## Design Boundary

Core logic must remain generic. Do not hard-code named external standards, clauses, copied requirement text, legal advice, safety advice, certification claims, or audit success guarantees into the requirements engine.
