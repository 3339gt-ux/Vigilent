# Evidence Pack Builder — Stage 3A Foundation UX

LUMÉN now includes the **Evidence Pack Builder Sidebar** Stage 3A foundation. This workspace allows users to assemble, configure, and preview evidence packs dynamically while navigating other compliance modules.

## Stage 3A Scope & Boundaries

The current implementation provides a highly polished client-side user experience, local state persistence, and manifest/folder tree preview. 

To maintain security, tenancy, and evidence privacy boundaries:
- **No Private File Export:** Generating a physical ZIP export of private documents is **deferred** pending Codex/security and file-retrieval review.
- **No Cloud Persistence:** Production database persistence for draft packs is **deferred**. Drafts are stored in browser local storage.
- **No Public/Signed URLs:** We do not generate or store permanent signed URLs or public links. Files remain fully encrypted and protected under the core organisation tenancy policies.
- **Drag and Drop:** Drag-and-drop file additions directly to the builder sidebar are **deferred** to avoid interfering with the Evidence Vault's upload zones, guided import centre dropzones, or the image manager crop areas. Adding records is performed safely via details drawers.

---

## How It Works

### 1. Persistent Sidebar
- Toggle the builder on/off via the **regulatory portfolio briefcase icon** in the top dashboard navigation header (on desktop and mobile layouts).
- Use the **Collapse** button (`>`) to hide the sidebar into a thin vertical strip on the right edge of the screen, keeping the pack active without cluttering the screen. Click the strip to expand it again.

### 2. Supported Item Types
- **Requirements:** Added from the Requirement Details drawer.
- **Teammates (People):** Added from the Person Detail drawer under their profile workspace.
- **Assets:** Added from the Asset details slide-out drawer.
- **Evidence Documents:** Added from the Evidence Vault Metadata Profile drawer.
- **Actions:** Added from the Action Details drawer.

### 3. Add / Remove Workflow
- Open any drawer profile/details view.
- Click **Add to pack** in the header. The button will toggle to **Added to pack**.
- Hover over the button and click **Remove from pack** or click the **Trash** icon directly inside the sidebar list to remove the item.
- Click **Clear All** inside the sidebar to reset the pack draft.

### 4. Scoped Local Draft Persistence
- Pack drafts (including item selections, options, pack name, and description) are automatically saved to `localStorage` on any modification.
- Drafts are strictly scoped by **User ID** and **Organisation ID** (`lumen_pack_builder_draft_{userId}_{orgId}`) to guarantee organization isolation and prevent multi-tenant cross-contamination.

### 5. Child Include/Exclude Options
Each item inside the sidebar is expandable, presenting checkboxes to configure what metadata or related details would be included:
- **Requirement:** Include Details, Include Evidence, Include Actions, Include Reviews, Include Images.
- **Teammate:** Include Profile, Include Competencies, Include Evidence, Include Images, Include Actions.
- **Asset:** Include Profile, Include Primary Image, Include Gallery, Include Checks, Include Actions.
- **Evidence Document:** Include Metadata, Include Linked Records.
- **Action:** Include Details, Include Evidence, Include Images, Include Notes.
- *Note:* The **Include Files** checkbox is permanently disabled with a warning: *File export is deferred until ZIP/private file export review.*

### 6. Manifest / Folder Tree Preview
Click **Preview Pack Manifest** at the bottom of the sidebar to view a premium modal showing the virtual folder layout that would be exported:
```
LUMEN-Audit-Pack-[Pack-Name]/
├── 00-Pack-Index/
│   ├── manifest.json
│   └── index.html
├── 01-Requirements/
│   └── [Requirement-Title]/
├── 02-People/
│   └── [Teammate-Name]/
├── 03-Assets/
│   └── [Asset-Name]/
├── 04-Actions/
│   └── [Action-Title]/
├── 05-Evidence-Metadata/
│   └── [Evidence-Title]/
└── 99-Export-Logs/
    └── export-trail.json
```
- A prominent amber alert banner reminds the user that actual document downloads are disabled in this preview pass.

---

## Stage 3A UX Polish Pass (June 2026)

Following a manual browser QA and visual review, a targeted UX polish pass was executed:
- **Local Draft Status & Safety Banner:** A dedicated warning banner was added to the sidebar explaining that drafts are local-only and no files are uploaded or exported.
- **Readable Checklists:** Child checklists are mapped from technical keys to highly descriptive text labels (e.g., `Include summary/details`, `Include linked evidence metadata`, `Include images metadata`).
- **File Export Deferral:** Staged the deferred `Include files` option with line-through text decoration and a specific sub-caption highlighting that files are deferred pending export safety review.
- **Manifest Preview Empty States:** The Planned Export folder structure modal remains accessible even when no items are included, rendering a guide directing users on how to populate and preview their pack.
- **Sidebar Empty State:** Updated instructions to clearly direct users: `Open a requirement, person, asset, evidence record or action, then choose "Add to pack".`
- **Navigation Action Tooltips:** Added descriptive standard browser tooltips on `PackBuilderAddButton` actions to clarify their dynamic behavior on hover.
