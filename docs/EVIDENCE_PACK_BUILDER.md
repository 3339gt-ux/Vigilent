# Evidence Pack Builder - Stage 3B Metadata ZIP Export

LUMEN now includes a local Evidence Pack Builder workspace that lets users collect requirements, teammates, assets, evidence metadata, and actions into a scoped draft pack.

Stage 3B adds a real downloadable ZIP export, but it is intentionally **metadata only**.

## Scope and boundaries

The current implementation is designed to prove pack structure, traceability, and export honesty before any private file export is attempted.

What Stage 3B includes:

- local draft pack builder sidebar
- add/remove actions from supported modules
- item-level include/exclude child options
- manifest/folder preview modal
- metadata-only ZIP export
- traceability map
- deferred file log
- clear export limitation notes

What Stage 3B does **not** include:

- private evidence file export
- image file export
- signed URL generation
- public URL generation
- raw storage path export
- cloud persistence for pack drafts
- hosted Supabase migration changes
- storage, auth, or RLS changes

## Local draft behaviour

Pack drafts are stored locally in the browser and scoped by user and organisation:

`lumen_pack_builder_draft_{userId}_{orgId}`

This keeps the draft isolated for local testing while avoiding production persistence work in this stage.

## Supported item types

- Requirements
- Teammates (People)
- Assets
- Evidence documents
- Actions

Each item can be included or excluded from the pack, and its child metadata sections can be toggled individually.

`Include files` remains visibly disabled for every item type.

## Metadata ZIP export

The sidebar now provides two export actions:

1. `Export metadata pack (.zip)` - enabled
2. `Export full pack with files` - disabled and deferred

The metadata ZIP contains record summaries and traceability files only. It does not fetch or package private files from Supabase Storage.

### ZIP root folder

```text
LUMEN-Audit-Pack-{safe-pack-name}-{YYYY-MM-DD}/
```

### ZIP folder structure

```text
LUMEN-Audit-Pack-{safe-pack-name}-{YYYY-MM-DD}/
|-- 00-Pack-Index/
|   |-- pack-summary.json
|   |-- pack-summary.csv
|   |-- included-items.json
|   |-- traceability-map.csv
|   `-- export-notes.txt
|-- 01-Requirements/
|-- 02-People/
|-- 03-Assets/
|-- 04-Actions/
|-- 05-Evidence-Metadata/
`-- 99-Export-Logs/
    |-- deferred-files.csv
    `-- export-limitations.txt
```

### Per-item summary files

- Requirement folders contain `requirement-summary.json`
- Person folders contain `person-summary.json`
- Asset folders contain `asset-summary.json`
- Action folders contain `action-summary.json`
- Evidence folders contain `evidence-metadata.json`

Only safe metadata already available in app state is exported. Missing fields are left unavailable rather than fabricated.

## Traceability and honesty files

### `traceability-map.csv`

This file records:

- pack item id
- item type
- title/name
- source module
- source entity id
- parent item id where relevant
- child section name
- whether that child section was included
- child section status (`included`, `excluded`, `deferred`, `unavailable`)
- export timestamp
- note

File-related child sections are explicitly marked `deferred`.

### `deferred-files.csv`

This file records where a future full export would include private files and explains why they were not included in Stage 3B.

Reason text:

`Private file export deferred until signed URL/private file export hardening is complete.`

### `export-notes.txt`

This file explains that:

- the export is metadata only
- no private evidence or image files are included
- private file export is deferred
- the pack is for structure, metadata, and traceability review
- it does not certify compliance
- it does not replace professional judgement

### `export-limitations.txt`

This file explains that:

- no private files are included
- no signed URLs are included
- no public URLs are generated
- no raw storage paths are exported
- the export is generated from the current local pack draft
- future full export work requires separate security review

## Security boundaries

Stage 3B keeps the original security boundary intact:

- no `createSignedUrl` or `createSignedUrls`
- no `getPublicUrl`
- no `storage.from(...)` file retrieval for export
- no service-role usage
- no local machine paths in the ZIP
- no private bucket paths in the ZIP

This stage only packages safe metadata already present in client state.

## Preview modal

`Preview Pack Manifest` now previews the same metadata-only ZIP structure that the real export produces. It no longer implies HTML index output or file bundling.

## What remains for Stage 3C

Before any full private-file export is enabled, the next stage still needs:

- dedicated security review of file export design
- signed URL retrieval hardening
- export-time permission checks
- short-lived file access handling
- clear audit logging
- hosted Supabase verification
- regression testing against Evidence Vault, image workflows, and import drag/drop behaviour

Until then, Stage 3B should be treated as a safe structure-and-traceability export only.
