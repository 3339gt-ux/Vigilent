# Competency Personas Foundation

LUMÉN now includes a competency personas/templates foundation for local testing.

Personas define the competencies a type of person would normally be expected to hold. They are reusable expectation templates, not destructive automation. Assigning or removing a persona does not delete person competency records, linked evidence, or competency history.

## What a persona is

A persona is a reusable competency template such as:

- Articulated Truck Driver
- Warehouse Operative
- Forklift Operator
- Transport Planner
- Maintenance Technician
- Supervisor / Manager

Each persona can contain multiple competency items. Each item can be marked as:

- `required`
- `optional`
- `conditional`

## How personas combine

A person can have more than one persona.

When multiple personas are assigned:

- expected competencies are merged;
- duplicate competency types are collapsed into one expectation;
- the strongest requirement level wins:
  - `required` beats `conditional`
  - `conditional` beats `optional`
- existing manual competency records remain intact.

## Per-person overrides

Users can still work person-by-person when reality does not match the template.

Supported override patterns in this foundation:

- assign one or more personas to a person;
- add an individual manual competency outside any persona;
- suppress a persona-driven competency for one person with a reason;
- restore a suppressed expectation later.

Suppressing a persona expectation does not delete:

- competency records;
- evidence links;
- actions;
- audit/activity history.

## Current UI coverage

The current foundation includes:

- a `Personas & Templates` area in Competencies;
- create/edit/archive/restore persona support;
- persona competency items with required/optional/conditional levels;
- bulk apply by role/department preview;
- person workspace persona assignment;
- person expectation summary;
- manual competency add flow;
- suppression/restore controls for persona expectations;
- matrix filtering by persona and missing required persona gaps.

## What is still deferred

This foundation does not yet include:

- a full dedicated persona import template in Bulk Import Centre;
- automatic silent role-based inheritance on save;
- hosted Supabase production persistence unless the pending migration is applied;
- remote staging verification of RLS and relationship guards;
- richer per-item conditional logic rules.

## Supabase migration status

Hosted Supabase support for personas requires the draft migration:

- `supabase/migrations/20260618000000_competency_personas.sql`

That migration has been added to the repository as a draft only. It has not been run remotely in this task.

Until that migration is provisioned and verified:

- demo/local mode persists persona data locally;
- production-mode writes should fail clearly rather than silently falling back.

## Recommended usage

1. Create or review competency types first.
2. Create a persona.
3. Add required, optional, and conditional competency items.
4. Assign one or more personas to a person.
5. Review the merged expectation view in the person workspace.
6. Add manual competencies only where the person genuinely needs an extra competency outside the persona.
7. Suppress persona expectations only with a clear reason.

## Example

An Articulated Truck Driver persona might include:

- required: Driving Licence Category CE
- required: Driver CPC Licence / Certificate
- required: Digital Tachograph Driver Card
- optional: ADR / Hazardous Goods
- optional: Manual Handling

If one driver also needs a warehouse-specific certification, that extra competency can be added manually without changing the shared persona.
