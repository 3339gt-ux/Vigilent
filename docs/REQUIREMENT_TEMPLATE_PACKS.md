# Requirement Template Packs

## Purpose

Template packs provide practical starter requirements for an organisation. They are standards-agnostic and do not map to named external frameworks. Imported items become normal `requirements` rows scoped to the current organisation.

## Available Packs

- Transport Operations Pack
- Warehouse Operations Pack
- Training Records Pack
- Document Control Pack
- Security Records Pack
- Fleet Records Pack
- Contractor & Supplier Pack
- Audit Readiness Pack

Each requirement includes:

- title
- category
- suggested owner
- review frequency
- risk level
- suggested evidence types

## Import Behaviour

Users import packs from Requirements > Import Template Pack.

The import flow:

- previews all requirements in the selected pack
- allows selecting and deselecting individual requirements
- marks likely duplicates as already present
- imports only selected, non-duplicate requirements
- creates suggested evidence types for each imported requirement

Duplicate prevention uses a practical title/category match within the active organisation. It avoids most accidental repeat imports while keeping the model simple.

## Design Boundary

Template names and core logic must stay generic. Do not add named standards, regulator names, clause references, copied standards text, legal advice, safety advice, or certification claims to template packs.

Future standards mapping should reference existing requirements through mapping tables rather than changing template pack records.
