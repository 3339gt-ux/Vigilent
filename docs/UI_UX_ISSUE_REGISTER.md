# Vygilence UI/UX Issue Register

This register catalogues all visual, spacing, layout, microcopy, accessibility, compliance, and consistency issues identified during the UI/UX source audit of the Vygilence application.

## Severity Level Definitions
* **Critical**: Prevents module use, breaks core workflow, causes unreadable content, or bypasses regulatory disclaimer/security boundaries.
* **High**: Obstructs navigation/comprehension, makes a module look broken/unfinished, or causes visual overlaps and clipping on standard viewports.
* **Medium**: Causes user friction, styling inconsistencies across themes, weak typography hierarchy, or poor microcopy.
* **Low**: Cosmetic issues, minor alignment tweaks, or optional hover animations.

---

## Detailed Issue Register

### IS-001: Matrix Row Titles Sticky Shadow Contrast
* **Route**: `/dashboard/matrix`
* **Exact Location**: [matrix/page.tsx:L955](file:///c:/Vigilen/src/app/dashboard/matrix/page.tsx#L955)
* **Screenshot Reference**: `matrix_midtone_desktop_grid_IS001.png` (Blocked - Env Limitation)
* **Theme**: Dark, Midtone
* **Viewport**: Tablet / Desktop
* **User Role / State**: All Roles
* **Severity**: **Medium**
* **Category**: Colour
* **Observed Problem**: The sticky row titles shadow uses hardcoded black shadow borders (`rgba(0,0,0,0.15)`), which look muddy and clip visually in Dark and Midtone modes against dark card backgrounds.
* **Why it Matters**: In dark themes, black shadows blend with backgrounds, losing the spatial separation they are meant to provide.
* **User Impact**: Difficulty distinguishing the sticky column boundary from scrollable columns when scrolling horizontally.
* **Business Impact**: Diminished perceived value of the premium grid interface.
* **Recommended Fix**: Switch shadow class to adapt to theme borders: `shadow-[4px_0_8px_-4px_var(--card-shadow)]` and use custom css border-r.
* **Expected Benefit**: Clean, theme-adaptive boundaries.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-002: Favourites Cards Mobile Grid Layout Text Clipping
* **Route**: `/dashboard/favourites`
* **Exact Location**: [favourites/page.tsx:L794](file:///c:/Vigilen/src/app/dashboard/favourites/page.tsx#L794)
* **Screenshot Reference**: `favourites_light_mobile_list_IS002.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: Mobile / Tablet
* **User Role / State**: All Roles
* **Severity**: **Medium**
* **Category**: Responsive
* **Observed Problem**: The grid layout on mobile doesn't collapse layout borders cleanly, causing long titles to clip or bleed out of card borders.
* **Why it Matters**: Broken borders and clipped text give the application an amateur, unpolished feel.
* **User Impact**: Clipped text makes it impossible to read the full bookmark title without clicking.
* **Business Impact**: Reduces user trust in the quality of the application.
* **Recommended Fix**: Wrap items in a responsive flex structure or apply text truncation limits (`truncate` / `line-clamp-2`) at standard mobile breakpoints.
* **Expected Benefit**: Clean, readable card structures across all devices.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-003: Custom Report Builder Dropdown Raw Keys
* **Route**: `/dashboard/reports`
* **Exact Location**: [reports/page.tsx:L3495](file:///c:/Vigilen/src/app/dashboard/reports/page.tsx#L3495)
* **Screenshot Reference**: `reports_midtone_desktop_home_IS003.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: All Viewports
* **User Role / State**: Owner / Admin
* **Severity**: **High**
* **Category**: Trust
* **Observed Problem**: Dropdown lists for selecting data dimensions/measures display raw database keys (e.g., `requirement_title`, `organization_id`) instead of user-friendly names.
* **Why it Matters**: Exposing raw database schemas makes the platform feel technical, unfinished, and intimidating for operational managers.
* **User Impact**: Users must guess what variables mean, leading to potential reporting configuration errors.
* **Business Impact**: Negatively affects enterprise readiness and pilot UAT perception.
* **Recommended Fix**: Map display names (e.g. `Requirement Title`, `Organization`) inside the selector mappings instead of rendering raw DB keys.
* **Expected Benefit**: A clean, user-friendly builder suitable for non-technical users.
* **Implementation Effort / Risk**: Medium / Low
* **Scope**: Page-specific
* **Quick Win**: No

### IS-004: Midtone Theme Card/Background Merging
* **Route**: Global Shell
* **Exact Location**: [globals.css:L382](file:///c:/Vigilen/src/app/globals.css#L382)
* **Screenshot Reference**: `shell_midtone_laptop_collapsed_IS004.png` (Blocked - Env Limitation)
* **Theme**: Midtone
* **Viewport**: All Viewports
* **User Role / State**: All Roles
* **Severity**: **High**
* **Category**: Colour
* **Observed Problem**: Background (`--background`: `218 15% 30%`) and Card (`--card`: `218 14% 36%`) HSL color variables are too close, causing surfaces to merge visually and eliminating shadow contrast.
* **Why it Matters**: Flat layouts without elevation structure increase cognitive load and make details bleed together.
* **User Impact**: Pages feel like one giant gray sheet, making cards and panels indistinguishable.
* **Business Impact**: Visually unappealing demo states.
* **Recommended Fix**: Darken the Midtone background token (`--background: 218 15% 22%`) or lighten card surfaces to create contrast.
* **Expected Benefit**: Restored spatial layout hierarchy and premium appearance.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Global
* **Quick Win**: Yes

### IS-005: Audit Expiry Warning Foreground Color Noise
* **Route**: `/dashboard/audit-packs`
* **Exact Location**: [audit-packs/page.tsx:L603](file:///c:/Vigilen/src/app/dashboard/audit-packs/page.tsx#L603)
* **Screenshot Reference**: `auditpacks_light_desktop_wizard_IS005.png` (Blocked - Env Limitation)
* **Theme**: Dark
* **Viewport**: All Viewports
* **User Role / State**: All Roles
* **Severity**: **Medium**
* **Category**: Accessibility
* **Observed Problem**: Expiry warnings (amber/red badges) use highly saturated foreground colors, causing visual vibration and poor text contrast on dark backgrounds.
* **Why it Matters**: Badge text must be readable and comfortable to view.
* **User Impact**: Eye strain and poor readability of critical compliance status alerts.
* **Business Impact**: Negative assessment on accessibility UAT criteria.
* **Recommended Fix**: Reduce badge color saturation; use lighter borders and lower foreground contrast adjustments.
* **Expected Benefit**: Professional, balanced status alerts.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-006: Settings Page API Token Input Overflow
* **Route**: `/dashboard/settings`
* **Exact Location**: [settings/page.tsx:L330](file:///c:/Vigilen/src/app/dashboard/settings/page.tsx#L330)
* **Screenshot Reference**: `settings_dark_mobile_keys_IS006.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: Mobile (360px)
* **User Role / State**: All Roles
* **Severity**: **High**
* **Category**: Responsive
* **Observed Problem**: The API credentials token input field overflows its card bounds on narrow screen widths, clipping the copy action button.
* **Why it Matters**: Forms must remain functional on all mobile breakpoints to support operational on-the-go checks.
* **User Impact**: Users cannot copy their tokens or view the field controls on mobile.
* **Business Impact**: Poor mobile usability rating during audits.
* **Recommended Fix**: Add `w-full max-w-full overflow-hidden` classes or wrapping structure on the input field container.
* **Expected Benefit**: Restored mobile page containment.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-007: Dashboard Obligation Forecast Tooltip Lag
* **Route**: `/dashboard`
* **Exact Location**: [dashboard/page.tsx:L1396](file:///c:/Vigilen/src/app/dashboard/page.tsx#L1396)
* **Screenshot Reference**: `dashboard_light_desktop_overview_IS007.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: All Viewports
* **User Role / State**: All Roles
* **Severity**: **Medium**
* **Category**: Interaction
* **Observed Problem**: Radar/Forecast chart items dismiss instantly when the user attempts to move the mouse pointer over the tooltip box, blocking secondary selections.
* **Why it Matters**: Interactive tooltips must be accessible to allow clicking on details or copy options.
* **User Impact**: Frustration when trying to interact with forecast details.
* **Business Impact**: Reduced dashboard usability score.
* **Recommended Fix**: Add a mouseleave delay (hover lag) of 150ms to allow smooth mouse transit to the tooltip canvas.
* **Expected Benefit**: Smooth, natural interaction.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-008: Competency Matrix Name Column Border Loss
* **Route**: `/dashboard/competencies`
* **Exact Location**: [competencies/page.tsx:L1250](file:///c:/Vigilen/src/app/dashboard/competencies/page.tsx#L1250)
* **Screenshot Reference**: `competencies_dark_desktop_list_IS008.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: Tablet / Mobile
* **User Role / State**: All Roles
* **Severity**: **High**
* **Category**: Layout
* **Observed Problem**: When scrolling the competency matrix grid horizontally, the sticky teammate name column loses its right border, blending names directly into date cells.
* **Why it Matters**: Tables containing large numbers of fields must lock column dividers to maintain line-of-sight cell alignment.
* **User Impact**: Users misalign cells when reading across rows, mistaking one team member's record for another.
* **Business Impact**: Severe UAT risk due to operational data misinterpretation.
* **Recommended Fix**: Add an explicit, hardcoded right border (`border-r border-border`) to the sticky employee name cell container.
* **Expected Benefit**: Visual alignment locked during horizontal scroll.
* **Implementation Effort / Risk**: Medium / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-009: Evidence Vault Preview Drawer Contrast
* **Route**: `/dashboard/vault`
* **Exact Location**: [vault/page.tsx:L950](file:///c:/Vigilen/src/app/dashboard/vault/page.tsx#L950)
* **Screenshot Reference**: `vault_dark_desktop_grid_IS054.png` (Blocked - Env Limitation)
* **Theme**: Midtone
* **Viewport**: All Viewports
* **User Role / State**: All Roles
* **Severity**: **Medium**
* **Category**: Colour
* **Observed Problem**: The document preview canvas in the vault details slide-out drawer has a weak border outline against the Midtone background, making it look washed out.
* **Why it Matters**: Large media canvas components require high contrast borders to look distinct from form fields.
* **User Impact**: Visual muddying of document content bounds.
* **Business Impact**: Diminished graphical design polish.
* **Recommended Fix**: Apply a solid, contrasting border outline around the preview bounding box.
* **Expected Benefit**: Crisp layout definitions in all modes.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-010: App Shell Sidebar Bottom Padding
* **Route**: Global Shell
* **Exact Location**: [layout.tsx:L392](file:///c:/Vigilen/src/app/dashboard/layout.tsx#L392)
* **Screenshot Reference**: `shell_light_desktop_expanded_IS010.png` (Blocked - Env Limitation)
* **Theme**: Light
* **Viewport**: Desktop
* **User Role / State**: All Roles
* **Severity**: **Low**
* **Category**: Spacing
* **Observed Problem**: The user avatar card and Sign Out buttons sit too close to the bottom border of the sidebar container, lacking balanced padding.
* **Why it Matters**: Premium enterprise platforms must respect margins and spacing ratios across all core layout regions.
* **User Impact**: A squished footer layout that looks unaligned.
* **Business Impact**: Tiny visual polish gap.
* **Recommended Fix**: Add `pb-6` padding to the sidebar footer element wrapper.
* **Expected Benefit**: Balanced vertical margins.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Global
* **Quick Win**: Yes

### IS-011: Audit Trail Mobile Drawer JSON Overflow
* **Route**: `/dashboard/audit-trail`
* **Exact Location**: [audit-trail/page.tsx:L1240](file:///c:/Vigilen/src/app/dashboard/audit-trail/page.tsx#L1240)
* **Screenshot Reference**: `audittrail_light_mobile_drawer_IS011.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: Tablet / Mobile
* **User Role / State**: Admin
* **Severity**: **High**
* **Category**: Responsive
* **Observed Problem**: The log detail drawer splits the Before and After JSON snapshots into a 2-column grid. On narrow mobile viewports, this grid squishes each JSON pre-formatted text box into a tiny width, causing severe character wrapping.
* **Why it Matters**: Code or JSON data logs must render in a readable format.
* **User Impact**: JSON logs become unreadable as single characters wrap onto new lines.
* **Business Impact**: Inability for administrators to perform diagnostic audits on mobile devices.
* **Recommended Fix**: Refactor the grid column layout from `grid-cols-2` to responsive `grid-cols-1 md:grid-cols-2`.
* **Expected Benefit**: Stacked JSON structures on mobile screens, preserving line length.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-012: Billing Page Selected Plan Accent Contrast
* **Route**: `/dashboard/billing`
* **Exact Location**: [billing/page.tsx:L144](file:///c:/Vigilen/src/app/dashboard/billing/page.tsx#L144)
* **Screenshot Reference**: `billing_midtone_desktop_plans_IS012.png` (Blocked - Env Limitation)
* **Theme**: Midtone
* **Viewport**: All Viewports
* **User Role / State**: Owner
* **Severity**: **Medium**
* **Category**: Colour
* **Observed Problem**: The active/selected pricing plan card uses a solid indigo block accent style which loses contrast against the midtone gray card boundaries.
* **Why it Matters**: Interactive states must look distinct.
* **User Impact**: Difficulty distinguishing which plan is currently selected.
* **Business Impact**: Reduced checkout conversion clarity.
* **Recommended Fix**: Use a thick border highlight (`border-2 border-indigo-500`) instead of a background block overlay.
* **Expected Benefit**: Distinct selected card identification.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-013: Onboarding Raw PGRST Error Leak
* **Route**: `/onboarding`
* **Exact Location**: [onboarding/page.tsx:L93](file:///c:/Vigilen/src/app/onboarding/page.tsx#L93)
* **Screenshot Reference**: `onboarding_midtone_desktop_form_IS013.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: All Viewports
* **User Role / State**: Owner
* **Severity**: **High**
* **Category**: Trust
* **Observed Problem**: Onboarding validation failures print raw Supabase Postgres error messages (e.g. PGRST connection failures or RLS constraint violations) directly to the user.
* **Why it Matters**: Technical database errors expose internal systems, look unprofessional, and confuse users.
* **User Impact**: User faces intimidating warning alerts without clear recovery steps.
* **Business Impact**: Security risk and damaged trust.
* **Recommended Fix**: Map error codes through user-friendly messages (e.g. "We could not link your workspace, please check your network connection.").
* **Expected Benefit**: Secure, user-friendly error banners.
* **Implementation Effort / Risk**: Medium / Low
* **Scope**: Page-specific
* **Quick Win**: No

### IS-014: Favourites Hub Technical View Labeling
* **Route**: `/dashboard/favourites`
* **Exact Location**: [favourites/page.tsx:L418](file:///c:/Vigilen/src/app/dashboard/favourites/page.tsx#L418)
* **Screenshot Reference**: `favourites_light_mobile_list_IS002.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: All Viewports
* **User Role / State**: All Roles
* **Severity**: **Medium**
* **Category**: Microcopy
* **Observed Problem**: Saved view bookmarks list items with descriptions containing technical text like "Starred View Filter Config".
* **Why it Matters**: The naming is inconsistent with "Favourites" and looks like a database dump field.
* **User Impact**: Confusing UI descriptions.
* **Business Impact**: Reduced system polish.
* **Recommended Fix**: Simplify description text to "Saved view configuration" or match the view category label.
* **Expected Benefit**: Human-readable bookmark descriptions.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-015: Reports Detail Export Buttons Mobile Overlap
* **Route**: `/dashboard/reports/detail`
* **Exact Location**: [reports/detail/page.tsx:L520](file:///c:/Vigilen/src/app/dashboard/reports/detail/page.tsx#L520)
* **Screenshot Reference**: `reports_detail_light_mobile_list_IS015.png` (Blocked - Env Limitation)
* **Theme**: Light
* **Viewport**: Mobile
* **User Role / State**: All Roles
* **Severity**: **High**
* **Category**: Layout
* **Observed Problem**: On mobile views, the CSV and PDF export triggers stack on top of the search bar, overlapping input borders and preventing clicks.
* **Why it Matters**: Actions must have sufficient separation to avoid blocking sibling inputs.
* **User Impact**: Inability to search or filter detail reports on mobile screens.
* **Business Impact**: Broken mobile reporting dashboard UAT evaluation.
* **Recommended Fix**: Reposition export buttons below the search input field container inside a wrap-flex structure on mobile views.
* **Expected Benefit**: Accessible input fields and actions on all screen widths.
* **Implementation Effort / Risk**: Medium / Low
* **Scope**: Page-specific
* **Quick Win**: No

### IS-016: Favourites Hub Close-Outside Modal Lock
* **Route**: `/dashboard/favourites`
* **Exact Location**: [favourites/page.tsx:L683](file:///c:/Vigilen/src/app/dashboard/favourites/page.tsx#L683)
* **Screenshot Reference**: `favourites_dark_desktop_list_IS016.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: All Viewports
* **User Role / State**: All Roles
* **Severity**: **Medium**
* **Category**: Interaction
* **Observed Problem**: The Favourites removal confirmation modal does not dismiss if clicking outside the modal boundary box.
* **Why it Matters**: Users expect to dismiss light confirmations by clicking the backdrop.
* **User Impact**: Unnecessary friction forcing users to search for the small close cross or cancel button.
* **Business Impact**: Clunky interaction ratings.
* **Recommended Fix**: Add a backdrop click listener to call `setConfirmItem(null)` or trigger close.
* **Expected Benefit**: Standard modal interactions aligned.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-017: Dashboard Quick Actions Modal Close-Outside Lock
* **Route**: `/dashboard`
* **Exact Location**: [dashboard/page.tsx:L1690](file:///c:/Vigilen/src/app/dashboard/page.tsx#L1690)
* **Screenshot Reference**: `dashboard_light_desktop_overview_IS007.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: All Viewports
* **User Role / State**: Editor / Admin / Owner
* **Severity**: **Medium**
* **Category**: Interaction
* **Observed Problem**: The Quick Actions modal overlay does not support backdrop clicking to exit, requiring the user to click the small cross.
* **Why it Matters**: Leads to click-fatigue when users want to discard quick additions.
* **User Impact**: Trapped feeling inside forms if users click outside.
* **Business Impact**: Usability friction.
* **Recommended Fix**: Add backdrop mouse click handler to exit the modal cleanly.
* **Expected Benefit**: Fast, standard overlay interactions.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-018: Dashboard Upload Evidence Modal Close-Outside Lock
* **Route**: `/dashboard`
* **Exact Location**: [dashboard/page.tsx:L1548](file:///c:/Vigilen/src/app/dashboard/page.tsx#L1548)
* **Screenshot Reference**: `dashboard_light_desktop_overview_IS007.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: All Viewports
* **User Role / State**: Editor / Admin / Owner
* **Severity**: **Medium**
* **Category**: Interaction
* **Observed Problem**: The Upload Evidence modal does not close when clicking the dark backdrop.
* **Why it Matters**: Consistent overlay exit patterns build navigation flow confidence.
* **User Impact**: Blocked navigation layout.
* **Business Impact**: Usability friction.
* **Recommended Fix**: Implement click-outside backdrop handlers on the modal backdrop container.
* **Expected Benefit**: Intuitive overlay control.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-019: Dashboard Activity Log Modal Close-Outside Lock
* **Route**: `/dashboard`
* **Exact Location**: [dashboard/page.tsx:L1815](file:///c:/Vigilen/src/app/dashboard/page.tsx#L1815)
* **Screenshot Reference**: `dashboard_light_desktop_overview_IS007.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: All Viewports
* **User Role / State**: Owner / Admin
* **Severity**: **Medium**
* **Category**: Interaction
* **Observed Problem**: The full Activity Log overlay dialog lacks click-outside dismiss listeners.
* **Why it Matters**: Large information overlays should easily toggle off by clicking the backdrop.
* **User Impact**: Annoyance when users click empty space expecting to return to the dashboard overview.
* **Business Impact**: Usability friction.
* **Recommended Fix**: Attach a click event listener on the modal overlay backdrop to trigger close.
* **Expected Benefit**: Modern modal behavior.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-020: Login Disclaimer pre-checked operational bypass
* **Route**: `/login`
* **Exact Location**: [login/page.tsx:L18](file:///c:/Vigilen/src/app/login/page.tsx#L18)
* **Screenshot Reference**: `login_light_desktop_form_IS038.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: All Viewports
* **User Role / State**: Guest
* **Severity**: **Critical**
* **Category**: Trust
* **Observed Problem**: The operational disclaimer checkbox ("I acknowledge Vygilence does not generate legal advice...") is initialized to `true` (`agreedDisclaimers` state is true on mount).
* **Why it Matters**: Compliance disclaimers must require active confirmation to protect the business from liability.
* **User Impact**: Users can bypass the warning without reading, failing the compliance check.
* **Business Impact**: Legal liability risk.
* **Recommended Fix**: Set initial checkbox state `agreedDisclaimers` to `false` in the state hook.
* **Expected Benefit**: Users are forced to actively check the box, shielding the company from liability.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-021: Register Disclaimer pre-checked operational bypass
* **Route**: `/register`
* **Exact Location**: [register/page.tsx:L20](file:///c:/Vigilen/src/app/register/page.tsx#L20)
* **Screenshot Reference**: `register_dark_desktop_form_IS039.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: All Viewports
* **User Role / State**: Guest
* **Severity**: **Critical**
* **Category**: Trust
* **Observed Problem**: The registration disclaimer checkbox is pre-checked by default on page load.
* **Why it Matters**: A pre-checked box is legally ineffective at proving the user consented to liability waivers.
* **User Impact**: User registers without reading operational warnings.
* **Business Impact**: High legal risk.
* **Recommended Fix**: Initialize `agreedDisclaimers` to `false` in [register/page.tsx](file:///c:/Vigilen/src/app/register/page.tsx).
* **Expected Benefit**: Legally binding consent to platform limitations.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-022: Onboarding Default Country Field Hardcoded
* **Route**: `/onboarding`
* **Exact Location**: [onboarding/page.tsx:L23](file:///c:/Vigilen/src/app/onboarding/page.tsx#L23)
* **Screenshot Reference**: `onboarding_midtone_desktop_form_IS013.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: All Viewports
* **User Role / State**: Owner
* **Severity**: **Medium**
* **Category**: Spacing
* **Observed Problem**: The country field is hardcoded to "Ireland" without rendering a selection list or input guidelines.
* **Why it Matters**: An onboarding system must cater to global or cross-border UK/EU transport operations.
* **User Impact**: Users from other countries must type over the default without knowing if their region is supported.
* **Business Impact**: App looks locally restricted.
* **Recommended Fix**: Convert the input to a standard dropdown mapping valid EU/UK country strings.
* **Expected Benefit**: High-quality onboarding experience.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-023: Settings Page Static Seeding Success text
* **Route**: `/dashboard/settings`
* **Exact Location**: [settings/page.tsx:L608](file:///c:/Vigilen/src/app/dashboard/settings/page.tsx#L608)
* **Screenshot Reference**: `settings_dark_mobile_keys_IS006.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: All Viewports
* **User Role / State**: All Roles
* **Severity**: **Medium**
* **Category**: Microcopy
* **Observed Problem**: Seeding loader displays static text: "Seeding complete! 1,800+ demo compliance logs successfully loaded." which does not match actual seeded counts (1000 competencies + 750 events + 350 docs).
* **Why it Matters**: Accuracy in reporting database transactions is essential to maintain audit readiness trust.
* **User Impact**: Discrepancy between reported records and the actual counts shown on database screens.
* **Business Impact**: Loss of trust in dashboard status logs.
* **Recommended Fix**: Update text to match actual seed logs: "Seeding complete! 2,100+ database records successfully loaded."
* **Expected Benefit**: Accurate progress messages.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-024: Reports Focus Modal Missing Close Button
* **Route**: `/dashboard/reports/detail`
* **Exact Location**: [reports/detail/page.tsx:L750](file:///c:/Vigilen/src/app/dashboard/reports/detail/page.tsx#L750)
* **Screenshot Reference**: `reports_detail_light_mobile_list_IS015.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: All Viewports
* **User Role / State**: All Roles
* **Severity**: **High**
* **Category**: Layout
* **Observed Problem**: The focus overlay modal for full-screen chart analysis lacks a close button overlay, forcing users to click off-canvas to close.
* **Why it Matters**: Modals must always display an explicit escape mechanism for accessibility compliance.
* **User Impact**: Keyboard and screen reader users get locked in focus states.
* **Business Impact**: Accessibility violation risk.
* **Recommended Fix**: Render a prominent close button (`X` icon) at the top-right of the focus modal canvas.
* **Expected Benefit**: Accessible exit hooks on modals.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-025: Reports Pivot Grid Percentages Rounding Error
* **Route**: `/dashboard/reports`
* **Exact Location**: [reports/page.tsx:L1230](file:///c:/Vigilen/src/app/dashboard/reports/page.tsx#L1230)
* **Screenshot Reference**: `reports_midtone_desktop_home_IS003.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: All Viewports
* **User Role / State**: All Roles
* **Severity**: **High**
* **Category**: Trust
* **Observed Problem**: Rounding calculations inside reports pivot grid cells can result in a column sum exceeding or falling short of 100% (e.g. showing 100.1%).
* **Why it Matters**: Enterprise managers use compliance figures for board meetings; mathematical errors damage credibility.
* **User Impact**: Rounding errors create confusion during UAT evaluations.
* **Business Impact**: Trust risk for evidence intelligence applications.
* **Recommended Fix**: Use a standard largest-remainder rounding algorithm to adjust percentages dynamically to ensure totals sum exactly to 100%.
* **Expected Benefit**: Flawless, UAT-ready reports math.
* **Implementation Effort / Risk**: Medium / Low
* **Scope**: Page-specific
* **Quick Win**: No

### IS-026: Audit Pack PDF Export Button Naming Inconsistency
* **Route**: `/dashboard/audit-packs`
* **Exact Location**: [audit-packs/page.tsx:L688](file:///c:/Vigilen/src/app/dashboard/audit-packs/page.tsx#L688)
* **Screenshot Reference**: `auditpacks_light_desktop_wizard_IS005.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: All Viewports
* **User Role / State**: Editor / Admin
* **Severity**: **Medium**
* **Category**: Consistency
* **Observed Problem**: Audit Pack export buttons use simple labels like "PDF" or "Print / PDF", which conflicts with Reports module nomenclature.
* **Why it Matters**: Inconsistent vocabulary confuses users about whether the file is generated on the server or printed via the browser.
* **User Impact**: Inconsistent expectations for the export experience.
* **Business Impact**: Reduced application cohesion.
* **Recommended Fix**: Rename the action buttons to "Print / Save as PDF" in [audit-packs/page.tsx](file:///c:/Vigilen/src/app/dashboard/audit-packs/page.tsx).
* **Expected Benefit**: Standardized export labeling.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-027: Audit Trail Event Undo Alert Conflict
* **Route**: `/dashboard/audit-trail`
* **Exact Location**: [audit-trail/page.tsx:L55](file:///c:/Vigilen/src/app/dashboard/audit-trail/page.tsx#L55)
* **Screenshot Reference**: `audittrail_dark_desktop_list_IS059.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: All Viewports
* **User Role / State**: Admin
* **Severity**: **High**
* **Category**: Trust
* **Observed Problem**: Event recovery alerts and descriptions claim the log is mutable by allowing "undos" of delete operations. This conflicts with immutability claims in the same audit module.
* **Why it Matters**: Audit trails must look completely immutable. Mutability warnings damage security compliance.
* **User Impact**: Users are confused by whether logs can actually be altered by users.
* **Business Impact**: Fails basic DVSA/ISO certification requirements.
* **Recommended Fix**: Frame the "Undo" action as an append-only "Recovery Transaction" that records a reversing entry, rather than implying the original record was erased.
* **Expected Benefit**: Compliant, trust-oriented audit log architecture.
* **Implementation Effort / Risk**: Medium / Low
* **Scope**: Page-specific
* **Quick Win**: No

### IS-028: Global CSS Missing Print Media Queries
* **Route**: Global Application
* **Exact Location**: [globals.css](file:///c:/Vigilen/src/app/globals.css)
* **Screenshot Reference**: N/A
* **Theme**: All Themes
* **Viewport**: Print Layout
* **User Role / State**: All Roles
* **Severity**: **High**
* **Category**: Spacing
* **Observed Problem**: There are no print media rules defined in the CSS, meaning background colors, borders, and margins look distorted when using standard browser printing.
* **Why it Matters**: Audits often require physical paper packets; print output must look clean and conserve paper.
* **User Impact**: Distorted print output with card backgrounds printing as black blocks.
* **Business Impact**: Fails audit-readiness UAT.
* **Recommended Fix**: Add a comprehensive `@media print` style block to standardise text to black on white and hide UI controls.
* **Expected Benefit**: High-quality printable matrices.
* **Implementation Effort / Risk**: Medium / Low
* **Scope**: Global
* **Quick Win**: No

### IS-029: Collapsed Sidebar Tooltip Hover Scaling
* **Route**: Global Shell
* **Exact Location**: [layout.tsx:L381](file:///c:/Vigilen/src/app/dashboard/layout.tsx#L381)
* **Screenshot Reference**: `shell_midtone_laptop_collapsed_IS004.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: Laptop / Desktop
* **User Role / State**: All Roles
* **Severity**: **Low**
* **Category**: Layout
* **Observed Problem**: Tooltips on collapsed sidebar hover do not transition smoothly, popping in and out abruptly.
* **Why it Matters**: Modern design systems expect micro-animations to feel premium.
* **User Impact**: A slightly jerky feel on navigation.
* **Business Impact**: Tiny visual polish gap.
* **Recommended Fix**: Apply subtle transition classes (`transition-all duration-150 scale-95 hover:scale-100`) to tooltip overlays.
* **Expected Benefit**: Premium sidebar interactions.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Global
* **Quick Win**: Yes

### IS-030: Mobile Menu Toggle Z-Index Wrapping
* **Route**: Global Shell
* **Exact Location**: [layout.tsx:L457](file:///c:/Vigilen/src/app/dashboard/layout.tsx#L457)
* **Screenshot Reference**: `shell_dark_mobile_menu_IS043.png` (Blocked - Env Limitation)
* **Theme**: Dark
* **Viewport**: Mobile
* **User Role / State**: All Roles
* **Severity**: **High**
* **Category**: Responsive
* **Observed Problem**: The mobile menu toggle button is positioned at `z-30`, which matches the mobile navigation panel. On certain pages, scrolling causes content elements to slide over the menu toggle.
* **Why it Matters**: Navigation buttons must always sit on top of all other elements to prevent locks.
* **User Impact**: Users cannot close the menu once open on scroll.
* **Business Impact**: Severe usability blockers on mobile views.
* **Recommended Fix**: Set z-index of the mobile toggle button wrapper explicitly to `z-50`.
* **Expected Benefit**: Locked toggle positioning.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Global
* **Quick Win**: Yes

### IS-031: Mobile Menu Dropdown Clipping
* **Route**: Global Shell
* **Exact Location**: [layout.tsx:L428](file:///c:/Vigilen/src/app/dashboard/layout.tsx#L428)
* **Screenshot Reference**: `shell_dark_mobile_menu_IS043.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: Mobile
* **User Role / State**: All Roles
* **Severity**: **High**
* **Category**: Responsive
* **Observed Problem**: The mobile navigation dropdown sits at `z-30` but the mobile header is at `z-40`. Elements in deep pages with custom z-indexes slide under the header but over the dropdown menu.
* **Why it Matters**: Prevents overlaps and visual bugs.
* **User Impact**: Menu list is covered by content on scroll.
* **Business Impact**: Broken mobile shell interface.
* **Recommended Fix**: Align mobile navigation panel z-index to `z-40` or higher, matching the header wrapper.
* **Expected Benefit**: Consistent mobile overlays.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Global
* **Quick Win**: Yes

### IS-032: Notification Bell Dropdown Scroll Limits
* **Route**: Global Shell
* **Exact Location**: [NotificationBell.tsx:L121](file:///c:/Vigilen/src/components/NotificationBell.tsx#L121)
* **Screenshot Reference**: `shell_dark_desktop_bell_IS045.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: All Viewports
* **User Role / State**: All Roles
* **Severity**: **High**
* **Category**: Spacing
* **Observed Problem**: Under a high volume of unread notifications, the notification dropdown grows beyond the viewport height, pushing actions off-screen.
* **Why it Matters**: Lists must implement scroll container caps to maintain interface boundaries.
* **User Impact**: Users cannot scroll down to read older notifications or access clear button actions.
* **Business Impact**: Bad high-volume review rating.
* **Recommended Fix**: Set a strict CSS height limit (`max-h-[70vh] overflow-y-auto`) on the notification list block wrapper.
* **Expected Benefit**: Contained notification panel.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Global
* **Quick Win**: Yes

### IS-033: Notification Badge Count Truncation
* **Route**: Global Shell
* **Exact Location**: [NotificationBell.tsx:L75](file:///c:/Vigilen/src/components/NotificationBell.tsx#L75)
* **Screenshot Reference**: `shell_dark_desktop_bell_IS045.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: All Viewports
* **User Role / State**: All Roles
* **Severity**: **Medium**
* **Category**: Spacing
* **Observed Problem**: The red notification badge count truncates text to "9+" if unread counts exceed 9, which is too low for high-volume seeded states where counts can exceed 50.
* **Why it Matters**: Low truncation limits make the system look like it cannot handle enterprise scaling.
* **User Impact**: Loss of precise statistics.
* **Business Impact**: Minor polish issue.
* **Recommended Fix**: Increase the truncation threshold to `unreadCount > 99 ? '99+' : unreadCount` and use dynamic padding.
* **Expected Benefit**: Better representation of high-volume data.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Global
* **Quick Win**: Yes

### IS-034: Appearance Selector Accessibility Labels
* **Route**: Global Shell
* **Exact Location**: [layout.tsx:L37](file:///c:/Vigilen/src/app/dashboard/layout.tsx#L37)
* **Screenshot Reference**: `shell_midtone_desktop_theme_IS047.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: All Viewports
* **User Role / State**: All Roles
* **Severity**: **Medium**
* **Category**: Accessibility
* **Observed Problem**: The theme toggles use icons (Sun, Moon, Dot) without rendering accessible textual descriptions, which screen readers skip.
* **Why it Matters**: Accessibility standards require all interactive controls to offer text equivalents.
* **User Impact**: Blind or visually impaired users cannot identify theme buttons.
* **Business Impact**: Fails accessibility compliance (WCAG 2.1).
* **Recommended Fix**: Add explicit `aria-label` text to each theme toggle button (e.g. `aria-label="Set theme to Dark Mode"`).
* **Expected Benefit**: Compliant accessibility markup.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Global
* **Quick Win**: Yes

### IS-035: Dashboard Layout Sizing Shift on Load
* **Route**: `/dashboard`
* **Exact Location**: [dashboard/page.tsx:L300](file:///c:/Vigilen/src/app/dashboard/page.tsx#L300)
* **Screenshot Reference**: `dashboard_light_desktop_overview_IS007.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: Desktop
* **User Role / State**: All Roles
* **Severity**: **Medium**
* **Category**: Layout
* **Observed Problem**: The central summary card containers expand dynamically when database statistics load on mount, causing a visible layout shift.
* **Why it Matters**: Layout stability prevents accidental clicks and feels smoother.
* **User Impact**: Awkward jump on page load.
* **Business Impact**: Poor performance perception.
* **Recommended Fix**: Set a fixed height or min-height on summary cards to reserve layout space during data fetch.
* **Expected Benefit**: Pristine page entry stability.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-036: Compliance Radar Popover Desktop Bleeding
* **Route**: `/dashboard`
* **Exact Location**: [dashboard/page.tsx:L1413](file:///c:/Vigilen/src/app/dashboard/page.tsx#L1413)
* **Screenshot Reference**: `dashboard_dark_laptop_radar_IS049.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: Laptop / Tablet
* **User Role / State**: All Roles
* **Severity**: **High**
* **Category**: Layout
* **Observed Problem**: The Compliance Radar popover uses `right-full mr-3` to open to the left. On laptop viewports (1280px), this pushes the popover container off the screen bounds if the sidebar is expanded.
* **Why it Matters**: Controls must sit within viewports to remain usable.
* **User Impact**: Text inside the popover is cut off, making it unusable.
* **Business Impact**: Poor responsive rating during UAT.
* **Recommended Fix**: Use responsive positioning classes or check container bounds using JavaScript before rendering.
* **Expected Benefit**: Popover contained within all standard screen dimensions.
* **Implementation Effort / Risk**: Medium / Low
* **Scope**: Page-specific
* **Quick Win**: No

### IS-037: Dashboard Activity Log empty state illustration
* **Route**: `/dashboard`
* **Exact Location**: [dashboard/page.tsx:L1830](file:///c:/Vigilen/src/app/dashboard/page.tsx#L1830)
* **Screenshot Reference**: `dashboard_midtone_desktop_empty_IS050.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: All Viewports
* **User Role / State**: Owner / Admin
* **Severity**: **Medium**
* **Category**: Layout
* **Observed Problem**: When there are no audit logs loaded in the dashboard activity log drawer, it shows a blank container instead of a friendly empty state.
* **Why it Matters**: Empty states must guide users towards next steps to prevent confusion.
* **User Impact**: Users think the database connection failed.
* **Business Impact**: Negative operational review.
* **Recommended Fix**: Add a friendly empty illustration with description: "No compliance events recorded yet. Perform actions to start logs."
* **Expected Benefit**: Clear onboarding guidance.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-038: Requirements Column Visibility dropdown overlap
* **Route**: `/dashboard/requirements`
* **Exact Location**: [requirements/page.tsx:L135](file:///c:/Vigilen/src/app/dashboard/requirements/page.tsx#L135)
* **Screenshot Reference**: `requirements_light_desktop_list_IS051.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: Desktop
* **User Role / State**: All Roles
* **Severity**: **Medium**
* **Category**: Layout
* **Observed Problem**: The column visibility dropdown has no explicit container boundaries, overlapping page pagination headers on scroll.
* **Why it Matters**: Layer elements must respect boundary limits.
* **User Impact**: Elements merge visually, causing click confusion.
* **Business Impact**: Diminished layout quality.
* **Recommended Fix**: Set explicit CSS layering properties (`z-index: 50`) on the column selector overlay box.
* **Expected Benefit**: Correct layout borders.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-039: Matrix Cell N/A Text Contrast
* **Route**: `/dashboard/matrix`
* **Exact Location**: [matrix/page.tsx:L999](file:///c:/Vigilen/src/app/dashboard/matrix/page.tsx#L999)
* **Screenshot Reference**: `matrix_light_mobile_grid_IS056.png` (Blocked - Env Limitation)
* **Theme**: Light
* **Viewport**: All Viewports
* **User Role / State**: All Roles
* **Severity**: **Medium**
* **Category**: Accessibility
* **Observed Problem**: Unlinked cell placeholders render a faint italicized `N/A` text (`text-muted-foreground/45`), which fails WCAG color contrast guidelines in Light mode.
* **Why it Matters**: Low contrast text cannot be read by visually impaired users.
* **User Impact**: Users miss mapping gaps because placeholders blend into grid borders.
* **Business Impact**: Fails basic WCAG accessibility compliance check.
* **Recommended Fix**: Increase cell contrast to `text-muted-foreground/70` in Light mode classes.
* **Expected Benefit**: Clear visibility of unmapped requirements.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-040: Competency Drawer Toast Overlapping
* **Route**: `/dashboard/competencies`
* **Exact Location**: [competencies/page.tsx:L450](file:///c:/Vigilen/src/app/dashboard/competencies/page.tsx#L450)
* **Screenshot Reference**: `competencies_dark_desktop_list_IS008.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: Desktop
* **User Role / State**: All Roles
* **Severity**: **Medium**
* **Category**: Layout
* **Observed Problem**: When the person details drawer is open, system toasts appear directly on top of the drawer action header, covering close buttons.
* **Why it Matters**: Overlay toast messages should never block functional buttons.
* **User Impact**: Users must wait for the toast to fade out before they can exit the drawer.
* **Business Impact**: Interaction friction.
* **Recommended Fix**: Shift Toast rendering stack to avoid drawer coordinates or adjust toast z-index placement.
* **Expected Benefit**: Accessible exit actions.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Global
* **Quick Win**: Yes

### IS-041: Billing Page Mobile Stack headers
* **Route**: `/dashboard/billing`
* **Exact Location**: [billing/page.tsx:L250](file:///c:/Vigilen/src/app/dashboard/billing/page.tsx#L250)
* **Screenshot Reference**: `billing_dark_mobile_plans_IS069.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: Mobile
* **User Role / State**: Owner
* **Severity**: **Medium**
* **Category**: Layout
* **Observed Problem**: On mobile devices, subscription tier cards collapse into a long vertical stack that lacks clear section headers or divider graphics.
* **Why it Matters**: Long scrolling lists without section headers increase cognitive load.
* **User Impact**: Users scroll endlessly without knowing when they enter checkout links.
* **Business Impact**: Reduces checkout clarity.
* **Recommended Fix**: Introduce explicit division titles ("Starter Tier", "Professional Tier") above plan cards on mobile widths.
* **Expected Benefit**: Better structured mobile checkout routes.
* **Implementation Effort / Risk**: Low / Low
* **Scope**: Page-specific
* **Quick Win**: Yes

### IS-042: Member Edit Modal Tab Focus Leak
* **Route**: `/dashboard/organisation`
* **Exact Location**: [organisation/page.tsx:L50](file:///c:/Vigilen/src/app/dashboard/organisation/page.tsx#L50)
* **Screenshot Reference**: `organisation_light_desktop_list_IS065.png` (Blocked - Env Limitation)
* **Theme**: All Themes
* **Viewport**: All Viewports
* **User Role / State**: Admin / Owner
* **Severity**: **High**
* **Category**: Accessibility
* **Observed Problem**: The member edit modal does not trap keyboard tab focus, allowing users to tab out of the modal container into main layout elements.
* **Why it Matters**: Accessibility standards require modals to trap focus to prevent screen reader errors and cursor loss.
* **User Impact**: Visually impaired users lose tracking cursor and get stuck in page footer blocks.
* **Business Impact**: Accessibility audit blocker (WCAG compliance violation).
* **Recommended Fix**: Use standard React focus trap hooks or native modal elements.
* **Expected Benefit**: Standard-compliant focus containment.
* **Implementation Effort / Risk**: Medium / Low
* **Scope**: Page-specific
* **Quick Win**: No
