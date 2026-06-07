# Vygilence UI/UX Remediation Roadmap

This roadmap structures the issues found in the Vygilence visual audit into actionable development packages. 

---

## Task Size Guidelines
* **Quick Win**: Under 1 hour. Low-risk change with immediate high visual benefit.
* **Short Task**: Approximately half a day of development/refactoring.
* **Medium Task**: 1 to 2 days of work, affecting complex interactions.
* **Structural Task**: Larger changes that require global theme or component adjustments.

---

## Phase 1: Immediate Critical Fixes
Focus: Resolve visual overlap, unreadable text, keyboard locks, and security-compromising visual elements.

| Issue ID | Affected Module | Task Details | Sizing | Expected Benefit | Risk / Complexity | Scope |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RM-001** | App Shell Shell | Fix mobile view header menu toggle z-index layout wrapping. | Quick Win | Smooth drawer slide-over without layout jumps. | Low | Local |
| **RM-002** | Evidence Matrix | Set sticky column shadow color to adapt dynamically in Dark Mode. | Quick Win | Keep grid borders readable under dark and midtone themes. | Low | Local |
| **RM-003** | Favourites Hub | Add click-outside dismiss handlers for favourites remove modal. | Quick Win | Prevent UI lockout if user clicks off-modal. | Low | Local |
| **RM-004** | Reports Detail | Adjust long text wrapping in details tables for small screens. | Short Task | Eliminates page-level horizontal overflow. | Low | Local |

---

## Phase 2: High-Priority Polish
Focus: Standardize typography margins, border shadows, and component spacing variables.

| Issue ID | Affected Module | Task Details | Sizing | Expected Benefit | Risk / Complexity | Scope |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RM-005** | Global Themes | Polish Midtone card and elevated surface CSS overrides in `globals.css`. | Short Task | Separates dashboard cards from page backgrounds in Midtone. | Medium | Global |
| **RM-006** | Competencies | Add sticky names column in Teammates list on Competency Matrix. | Medium Task | Preserves row orientation when scrolling matrix grids. | Medium | Local |
| **RM-007** | Dashboard Overview | Standardize quick actions modal inputs focus outline styles. | Short Task | Clean visual focus indicators. | Low | Local |
| **RM-008** | Reports Home | Ensure unavailable features (scheduling, email) show clean disclaimed overlay. | Short Task | Calm presentation of deferred items. | Low | Local |

---

## Phase 3: Medium-Priority Improvements
Focus: Refine microcopy, terminology matching, and hover feedback mechanisms.

| Issue ID | Affected Module | Task Details | Sizing | Expected Benefit | Risk / Complexity | Scope |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RM-009** | Global Copy | Rename all instances of "Starred" to "Favourite" in filter dropdowns. | Short Task | Enforces terminology consistency guidelines. | Low | Global |
| **RM-010** | Favourites Hub | Optimize empty-state graphics when no favourites are selected. | Short Task | Professional first-impression. | Low | Local |
| **RM-011** | Audit Packs | Refactor CSV and PDF download buttons to state "Print / Save as PDF". | Quick Win | Matches actual action executed by the system. | Low | Local |
| **RM-012** | Settings Page | Sync seed loader text metrics to represent correct database cells count. | Quick Win | Clear information reporting. | Low | Local |

---

## Phase 4: Low-Priority Refinements
Focus: Visual adjustments, minor alignment fixes, and micro-interactions.

| Issue ID | Affected Module | Task Details | Sizing | Expected Benefit | Risk / Complexity | Scope |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RM-013** | App Shell Shell | Add micro-hover tilt effect to collapsed sidebar icons. | Short Task | Delights user on hover. | Low | Local |
| **RM-014** | Reports Home | Refine chart tooltip styles inside the dashboard overview panel. | Short Task | Clean representation of analytical data metrics. | Low | Local |
| **RM-015** | Billing Page | Smooth pricing card selected transition scaling animations. | Short Task | Premium look-and-feel. | Low | Local |
| **RM-016** | Global Tables | Standardize pagination dropdown spacing limits. | Short Task | Better density in footer. | Low | Global |
