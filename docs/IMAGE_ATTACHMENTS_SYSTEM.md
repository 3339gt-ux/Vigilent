# LUMÉN Universal Image Attachments System

> [!IMPORTANT]
> **Local Testing Foundation & Remote Migration Requirements**
> This system is built to fail-safe and run in local/demo mode (with `NEXT_PUBLIC_VIGILEN_APP_MODE=demo`) using `localStorage` metadata and base64/object URLs.
> For production deployment, the database migration (`supabase/migrations/20260617000000_universal_image_attachments.sql`) must be applied to the remote Supabase database, and the private storage bucket `evidence-documents` must be configured. If these are not configured on the remote database, production uploads will gracefully fail-closed with a clear notification to contact an administrator.

This document describes the design, implementation, and security architecture of the Universal Image Attachments system in LUMÉN.

## Supported Entities & UI Status
The database schema (`record_image_attachments`) is designed to support a wide range of entity attachments, but the UI integrations are rolled out incrementally:
* **People / Contractors**: **Implemented** (Avatars/profile photos with 1:1 ratio cropping).
* **Assets / Equipment**: **Implemented for local testing** (separate primary asset photo area, supporting gallery, primary photo select, replacement/crop-on-upload, remove/archive, 4:3 ratio cropping, fullscreen lightbox).
* **Requirements**: **Implemented for supporting images** (Gallery mode for supporting screenshots, instruction sheets, and diagrams).
* **Actions / Defects / Repairs**: **Implemented for supporting images** (Gallery mode supporting `before`, `after`, `supporting` roles, fullscreen lightbox).
* **Evidence Vault**: **Implemented for image evidence preview** (Secure lightbox integration for previewing image evidence documents directly within the vault).
* **Asset Checks / Check Records**: **Deferred / Partial** (Database schema supports `'asset_check_record'`, but UI upload integration is deferred).
* **Competencies / Person Competency Records**: **Deferred / Partial** (Database schema supports `'competency_record'`, but UI upload integration is deferred).
* **Reviews**: **Deferred / Partial** (Database schema supports `'review'`, but UI upload integration is deferred).

## Supported Formats & Validation
* **Supported formats**: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.avif`.
* **HEIC / HEIF**: Rejected with a clear notification advising the user to export as JPEG or PNG first.
* **SVG Safety**: SVG files are **rejected by default** for inline rendering because they can contain embedded malicious scripts (XSS). SVG previews are disabled.
* **Size Limit**: Maximum file size is enforced at **10MB** by default to prevent browser memory crashes and reduce bandwidth usage.

## Data Model & Migration
If schema updates are needed, the database schema draft is defined in `supabase/migrations/20260617000000_universal_image_attachments.sql`.

### Table structure: `record_image_attachments`
* `id` uuid (primary key)
* `organisation_id` uuid (not null, scopes the attachment to the tenant organization)
* `entity_type` text (e.g., `'person'`, `'asset'`, `'requirement'`, `'action'`)
* `entity_id` uuid (points to the target record ID)
* `document_id` uuid (optional, links the image to a formal evidence document if needed)
* `storage_bucket` text (default `'evidence-documents'`)
* `storage_path` text (relative path inside the private bucket)
* `file_name` text (sanitized file name)
* `mime_type` text (MIME type of the image)
* `file_size_bytes` integer (size of the file)
* `width` integer (calculated width of the image)
* `height` integer (calculated height of the image)
* `image_role` text (e.g. `'avatar'`, `'primary'`, `'gallery'`, `'before'`, `'after'`, `'supporting'`)
* `caption` text (user-provided description)
* `alt_text` text (accessibility alternative text)
* `crop_data` jsonb (records zoom, crop coordinates, rotate, and aspect ratio metadata)
* `is_primary` boolean (indicates whether the image is the primary photo for the parent entity)
* `uploaded_by` uuid (creator)
* `created_at` timestamptz (timestamp)
* `updated_at` timestamptz (timestamp)
* `archived_at` timestamptz (soft-delete indicator)
* `archived_by` uuid (soft-delete creator)

The migration draft also includes a partial unique index for one active primary image per organisation/entity/entity ID. This safeguard still requires hosted Supabase migration and RLS verification before production use.

## Storage Model & Security Rules
All images must follow private Evidence Vault security principles.
1. **Private Storage Only**: Images are stored in the private `'evidence-documents'` bucket. No public bucket/link exposure is permitted.
2. **Organization Path Isolation**: Files are structured under organisation-specific folders:
   `organisations/{orgId}/documents/{attachmentId}/{safeFilename}`
   This ensures that bucket security rules limit access exclusively to active users in the same organization.
3. **Short-Lived Signed URLs**: The client never receives or stores a permanent url. Access is mediated by **short-lived signed URLs** generated on-the-fly via the API.
4. **No Service-Role Key in Browser**: Row Level Security (RLS) is strictly enforced. No service-role bypasses are allowed in client code.
5. **Soft-Delete Only**: Removal of an attachment sets the `archived_at` and `archived_by` fields. Hard-deletes are restricted to database administration roles.

## Crop & Edit Capability
LUMÉN provides an interactive cropping modal via HTML Canvas:
* **Aspect Ratio Presets**:
  * `1:1` Square: Default for People avatars.
  * `4:3` Landscape: Default for Assets & checks.
  * `16:9` Widescreen: Supporting diagrams & banners.
  * `Free`: Flexible custom crop size.
* **Rotate**: 90-degree increments rotation (tracked as metadata, allowing rotation resets).
* **Zoom/Scale**: Smooth slider for cropping adjustments.
* **Original Asset Preservation**: Editing does not mutate the original file; the crop configuration is saved in the `crop_data` metadata field, and the canvas performs a client-side resize upload.

## Drag / Drop Upload Isolation
* **Universal Component Drag/Drop**: Drag and drop is fully supported inside the component bounds.
* **Page-Level Isolation**:
  * Evidence Vault global dropzone is disabled on `/dashboard/imports`.
  * The Bulk Import Centre's CSV-only dropzone is isolated, preventing image uploads from interfering with import queues.

## Asset Image UX

Asset images are intentionally split into two visible areas:

* **Primary asset photo**: Shown in asset details and asset card contexts. This area is used to add, replace, crop-on-upload, remove, or view the main asset image.
* **Asset gallery**: Used for supporting photos, labels, serial plates, defects, before/after images, inspection context, and general asset photos.

Gallery uploads do not silently replace the primary asset photo. A gallery image must be explicitly selected with **Set as primary** before it becomes the main asset photo.

## Production Boundary

This branch does not run remote migrations and does not make the feature production-ready by itself. Production use still requires:

* applying and verifying the image attachments migration in hosted Supabase;
* verifying storage policies for the private `evidence-documents` bucket;
* verifying RLS with multiple organisations and roles;
* confirming image upload, signed preview, archive/remove, and primary selection in staging;
* confirming demo/local base64 previews are not confused with production persistence.
