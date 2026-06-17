# Evidence Pack Builder - Stage 3C-B Private File Export

LUMEN now includes a local Evidence Pack Builder workspace that lets users collect requirements, teammates, assets, evidence metadata, and actions into a scoped draft pack.

Stage 3C-B keeps the existing metadata ZIP export and adds a **full private-file ZIP export for local testing**.

## Scope and boundaries

What Stage 3C-B includes:

- local draft pack builder sidebar
- add/remove actions from supported modules
- item-level include/exclude child options
- manifest/folder preview modal
- metadata-only ZIP export
- full ZIP export with selected private evidence and image files
- traceability map
- included, failed, and deferred file logs
- conservative file count and size limits
- summary-only export audit events where the existing audit helper can log them safely

What Stage 3C-B does **not** include:

- public file sharing
- permanent export history persistence
- remote/background export jobs
- hosted Supabase migration changes
- storage, auth, or RLS changes
- compliance or certification claims

Production and pilot use still require hosted Supabase verification of storage policies, RLS behaviour, file access, and operational monitoring.

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

`Include files` remains a derived option. Full export follows the enabled evidence/image sections for each item rather than letting users bypass those section controls.

## Export actions

The sidebar now provides two export actions:

1. `Export metadata pack (.zip)`
2. `Export full pack with files (.zip)` - local testing only

### Metadata ZIP

The metadata ZIP contains record summaries and traceability files only. It does not fetch or package private files from Supabase Storage.

### Full ZIP

The full ZIP preserves the metadata structure and adds selected, permitted private files only when:

- the pack item is explicitly included
- the relevant child section is enabled
- the source record still belongs to the active organisation
- the underlying document or image attachment passes export-time validation
- the file stays within the current export limits

No signed URLs, public URLs, or raw storage paths are written into the ZIP, CSV logs, JSON manifests, local draft state, or audit metadata.

## Supported private file sources

Stage 3C-B can include private files from:

- Evidence Vault documents
- requirement-linked evidence documents
- action-linked evidence documents
- competency-record evidence documents
- asset check evidence documents
- asset history evidence documents
- record image attachments for assets, people, requirements, actions, and evidence records
- asset primary images and asset gallery/supporting images

Sources that still rely on external placeholder URLs or unsupported external storage remain logged as failed or deferred rather than silently included.

## Export-time limits

Current hard limits:

- maximum 100 files per full export
- maximum 250 MB total fetched file size
- warning threshold at 50 files
- warning threshold at 100 MB
- maximum 25 MB per individual file
- short-lived signed URL TTL of 60 seconds

If a file exceeds a limit or cannot be verified, it is excluded and recorded in the export logs.

## ZIP root folder

```text
LUMEN-Audit-Pack-{safe-pack-name}-{YYYY-MM-DD}/
```

## ZIP folder structure

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
|-- 06-Evidence-Files/
|-- 07-Image-Attachments/
`-- 99-Export-Logs/
    |-- included-files.csv
    |-- failed-files.csv
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

## Traceability and export honesty

### `traceability-map.csv`

This file records:

- pack item id
- item type
- title/name
- source module
- source entity id
- source record type and record id where applicable
- child section name
- whether that child section was included
- child section status (`included`, `excluded`, `deferred`, `unavailable`, `failed`)
- ZIP-relative file path where applicable
- failure reason where applicable
- export timestamp
- note

### `included-files.csv`

This file records each private file that was actually bundled, including:

- pack item id
- source record id and type
- original filename
- exported filename
- ZIP-relative path
- MIME type
- file size
- child section
- export timestamp

### `failed-files.csv`

This file records files that were selected but could not be included, for example because:

- the record could not be revalidated
- signed URL creation failed
- the fetch timed out
- the file exceeded a size limit
- the source depended on an external placeholder URL in demo mode

### `deferred-files.csv`

This file records intentionally deferred sources or sections.

### `export-notes.txt`

This file explains:

- whether the ZIP is metadata-only or full
- that the export is for review and traceability
- that no compliance or certification claim is made
- that private file export still depends on the selected, permitted current records only

### `export-limitations.txt`

This file explains:

- no signed URLs are included
- no public URLs are generated
- no raw storage paths are exported
- the export is generated from the current local pack draft
- hosted Supabase verification is still required before production use

## Security boundaries

Stage 3C-B keeps the main security boundary intact:

- no service-role usage in browser code
- no signed URL persistence
- no public URL generation
- no raw storage path export
- no local machine paths in the ZIP
- no cross-organisation export by draft state alone

Each full export revalidates the active organisation and the current source records before fetching any file, then relies on existing Supabase RLS and storage policy enforcement as the final boundary.

## Audit logging

Where the existing audit helper is available, full export emits summary-only audit events for:

- export started
- export completed
- export failed
- export cancelled

These events include counts and byte totals only. They do not include signed URLs, storage paths, tokens, or local paths.

## Preview modal

`Preview Pack Manifest` previews the folder layout and log files that the export produces. Actual file inclusion still depends on active organisation, linked records, and successful permission checks at export time.

## What still remains before production

Before any production or pilot claim, the next stage still needs:

- hosted Supabase verification of storage and RLS behaviour
- multi-user organisation-isolation testing
- larger-pack browser memory testing
- operational monitoring and support runbooks
- staged verification that every supported file source behaves correctly outside demo/local mode

For the approved design baseline, see [docs/EVIDENCE_PACK_BUILDER_PRIVATE_EXPORT_DESIGN.md](C:/Vigilen/docs/EVIDENCE_PACK_BUILDER_PRIVATE_EXPORT_DESIGN.md).
