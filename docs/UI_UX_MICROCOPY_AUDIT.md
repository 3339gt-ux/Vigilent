# Vygilence UI/UX Microcopy Audit

This document identifies user-facing text, button labels, titles, and explanations across the Vygilence codebase that require alignment for spelling consistency, semantic clarity, or policy adherence.

## Enforced Vocabulary
1. **Favourite** (not "Starred" or "Bookmark").
2. **Organisation** (British English spelling, unless referring to a technical database field like `organization_id`).
3. **Print / Save as PDF** (for browser print layouts, avoiding automated / server-generated terminology).
4. **Personal Browser Report** / **Personal Account Report** / **Organisation Report** / **Scheduling** (correct labeling of active vs. unavailable features).

---

## Copy Audit Table

| Issue ID | Location / Route | Component / File | Current Wording | Recommended Wording | Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MC-001** | Evidence Matrix | `FilterControls.tsx` (line 120-135) | `Starred` / `StarredFilterSelect` | `Favourite` / `FavouriteFilterSelect` | Maintain consistency with the sidebar branding and the Favourites Hub. |
| **MC-002** | Evidence Matrix | `matrix/page.tsx` (line 398-408) | `Starred Requirements only` | `Favourite Requirements only` | Enforce vocabulary rule: "Favourite, not Starred". |
| **MC-003** | Evidence Matrix | `matrix/page.tsx` (line 781) | `Starred Requirements only` | `Favourite Requirements only` | Match checkbox input labels to user expectation. |
| **MC-004** | Audit Packs | `audit-packs/page.tsx` (line 358) | `Generated PDF` | `Print / Save as PDF` | Correctly represent browser-based printing capabilities. |
| **MC-005** | Audit Packs | `audit-packs/page.tsx` (line 687, 744, 839) | `PDF` / `Print / PDF` | `Print / Save as PDF` | Label button exactly as defined by the browser print affordance. |
| **MC-006** | Reports Home | `reports/page.tsx` (line 310) | `Personal Account Report (Not Configured)` | `Personal Account Report (Unavailable)` | Clearly mark this deferred tier feature as "unavailable" per the product definition. |
| **MC-007** | Reports Home | `reports/page.tsx` (line 320) | `Organisation Report (Not Configured)` | `Organisation Report (Unavailable)` | Mark organization reports as unavailable. |
| **MC-008** | Reports Home | `reports/page.tsx` (line 330) | `Scheduling (Not Configured)` | `Scheduling (Unavailable)` | Clearly display scheduling status as unavailable rather than a configuration defect. |
| **MC-009** | Reports Detail | `reports/detail/page.tsx` (line 315) | `Local Report` | `Personal Browser Report` | Use the specific nomenclature "Personal Browser Report" to distinguish local query logs. |
| **MC-010** | Settings Page | `settings/page.tsx` (line 403) | `Vygilence Theme Palette` | `Vygilence Theme Palette` | Capitalization is correct, but ensure "Vygilence" is spelled correctly (not Vigilent). |
| **MC-011** | Organisation Page | `organisation/page.tsx` (line 453) | `Organisation Management` | `Organisation Management` | Confirm British English "s" spelling is used throughout user interface text. |
| **MC-012** | App Shell Header | `layout.tsx` (line 303) | `Vygilence is an evidence repository. It does not generate...` | `Vygilence is an evidence repository. It does not generate...` | Ensure warning banner strictly contains the Vygilence spelling. |
| **MC-013** | Settings Page | `settings/page.tsx` (line 608) | `Seeding complete! 1,800+ demo compliance logs successfully loaded.` | `Seeding complete! 1,000+ competency cells and compliance logs successfully loaded.` | Match actual seeded counts (1000 competencies + 750 events + 350 docs). |
| **MC-014** | Favourites Hub | `favourites/page.tsx` (line 428) | `Saved View Filter Config` | `Saved View Configuration` | Standardize views labeling to keep titles clear and short. |

---

## Detailed Rationale

> [!IMPORTANT]
> - **Spelling Integrity**: Any user-facing copy must read `Vygilence` (not `Vigilent`). A global scan confirms all public routes have been rebranded, but developer debug lines or alerts might occasionally slip.
> - **Trust-Focused Disclaimers**: Disclaimers should always sound professional and calm. Terms like `Not Configured` in the reports section could imply a misconfiguration or server crash, whereas `Unavailable` or `Scheduling not configured` maintains trust.
> - **Actionable Microcopy**: Helper texts in forms (e.g. `audit-packs/page.tsx:411-413`) must describe what the user can do and what is restricted, ensuring safety policies (no legal or compliance guarantees) are upheld.
