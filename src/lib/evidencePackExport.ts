import JSZip from 'jszip';
import { dbService, getCurrentSupabaseOrganizationId } from './db';
import { isDemoMode } from './env';
import { exportDateStamp, rowsToCsv, type ExportRow } from './exportData';
import type {
  Action,
  ActionDocument,
  ActionObjectLink,
  ActionUpdate,
  Asset,
  AssetCheckAssignment,
  AssetCheckEvidenceLink,
  AssetCheckRecord,
  AssetHistoryEvent,
  CompetencyRecord,
  CompetencyRecordDocument,
  CompetencyType,
  EvidenceDocument,
  Person,
  RecordImageAttachment,
  Requirement,
  RequirementAction,
  RequirementDocument,
  RequirementEvidenceCriterion,
  RequirementEvidenceCriterionMatch,
  Review
} from './types';

export type PackItemType = 'requirement' | 'person' | 'asset' | 'evidence' | 'action';

export interface PackDraftItem {
  id: string;
  type: PackItemType;
  title: string;
  sourceRoute: string;
  added_at: string;
  added_by?: string;
  included: boolean;
  options: Record<string, boolean>;
}

interface ExportContextData {
  packName: string;
  packDescription: string;
  exportedBy: string;
  exportedByUserId?: string | null;
  organisationId: string;
  organisationName: string;
  items: PackDraftItem[];
  requirements: Requirement[];
  requirementDocuments: RequirementDocument[];
  requirementEvidenceCriteria: RequirementEvidenceCriterion[];
  requirementEvidenceCriterionMatches: RequirementEvidenceCriterionMatch[];
  reviews: Review[];
  requirementActions: RequirementAction[];
  people: Person[];
  competencyRecords: CompetencyRecord[];
  competencyTypes: CompetencyType[];
  competencyRecordDocuments: CompetencyRecordDocument[];
  documents: EvidenceDocument[];
  actions: Action[];
  actionDocuments: ActionDocument[];
  actionObjectLinks: ActionObjectLink[];
  actionUpdates: ActionUpdate[];
  assets: Asset[];
  assetCheckAssignments: AssetCheckAssignment[];
  assetCheckRecords: AssetCheckRecord[];
  assetCheckEvidenceLinks: AssetCheckEvidenceLink[];
  assetHistoryEvents: AssetHistoryEvent[];
  imageAttachments: RecordImageAttachment[];
}

type ChildSectionStatus = 'included' | 'excluded' | 'deferred' | 'unavailable' | 'failed';
type FileCandidateKind = 'document' | 'image';
type ProgressPhase =
  | 'collecting-metadata'
  | 'checking-permissions'
  | 'fetching-files'
  | 'building-zip'
  | 'complete'
  | 'failed'
  | 'cancelled';

interface TraceabilityRow extends ExportRow {
  pack_item_id: string;
  item_type: string;
  item_title: string;
  source_module: string;
  source_entity_id: string;
  source_record_type: string;
  source_record_id: string;
  parent_item_id: string;
  child_section_name: string;
  child_section_included: string;
  child_section_status: ChildSectionStatus;
  zip_relative_path: string;
  failure_reason: string;
  export_timestamp: string;
  note: string;
}

interface DeferredFileRow extends ExportRow {
  pack_item_id: string;
  item_type: string;
  item_title: string;
  child_section: string;
  reason: string;
  status: string;
}

interface IncludedFileRow extends ExportRow {
  pack_item_id: string;
  item_type: string;
  source_record_id: string;
  source_record_type: string;
  display_title: string;
  original_filename: string;
  exported_filename: string;
  zip_relative_path: string;
  mime_type: string;
  size_bytes: string;
  child_section: string;
  export_timestamp: string;
}

interface FailedFileRow extends ExportRow {
  pack_item_id: string;
  item_type: string;
  source_record_id: string;
  source_record_type: string;
  display_title: string;
  child_section: string;
  failure_stage: string;
  reason: string;
  export_timestamp: string;
}

interface PackFileCandidate {
  candidateKey: string;
  physicalSourceKey: string;
  kind: FileCandidateKind;
  packItemId: string;
  packItemType: PackItemType;
  packItemTitle: string;
  sourceRecordId: string;
  sourceRecordType: 'evidence_document' | 'record_image_attachment';
  sourceEntityId: string;
  sourceEntityType: string;
  displayTitle: string;
  originalFilename: string;
  safeExportFilename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  organisationId: string;
  childSection: string;
  childSectionIncluded: boolean;
  zipRootFolder: '06-Evidence-Files' | '07-Image-Attachments';
  zipCategoryFolder: string;
}

interface PackFileFailure {
  candidate: PackFileCandidate;
  failureStage: string;
  reason: string;
}

interface PackFileFetchResult {
  candidate: PackFileCandidate;
  blob: Blob;
  data: Uint8Array;
  originalFilename: string;
  safeFileName: string;
  mimeType: string | null;
  sizeBytes: number;
}

interface FullPackExportResult {
  blob: Blob;
  filename: string;
  rootFolderName: string;
  includedCount: number;
  includedFileCount: number;
  failedFileCount: number;
  deferredFileCount: number;
  totalBytes: number;
}

export interface PackExportProgress {
  phase: ProgressPhase;
  message: string;
  totalCandidates: number;
  processedCandidates: number;
  includedFiles: number;
  failedFiles: number;
  deferredFiles: number;
  totalBytes: number;
}

interface FullExportOptions {
  signal?: AbortSignal;
  onProgress?: (progress: PackExportProgress) => void;
}

export interface FullPackExportPreview {
  candidateCount: number;
  estimatedBytes: number;
  warningThresholdReached: boolean;
  limitExceeded: boolean;
  missingSizeCount: number;
  reasons: string[];
}

interface BuildPackArtifactsOptions {
  exportMode: 'metadata-only' | 'full-private-files';
  fileStatusMode: 'deferred' | 'available';
}

interface BuildPackArtifactsResult {
  zip: JSZip;
  rootFolderName: string;
  includedItems: PackDraftItem[];
  exportedAt: string;
  traceabilityRows: TraceabilityRow[];
  deferredRows: DeferredFileRow[];
  packSummary: Record<string, unknown>;
}

const FILE_EXPORT_DEFERRED_REASON =
  'Private file export deferred until signed URL/private file export hardening is complete.';

const FULL_EXPORT_DEFERRED_REASON =
  'This source remains deferred until full private-file export support is added for that record type.';

const FULL_EXPORT_SIGNED_URL_TTL_SECONDS = 60;
const MAX_FULL_EXPORT_FILES = 100;
const MAX_FULL_EXPORT_TOTAL_BYTES = 250 * 1024 * 1024;
const WARN_FULL_EXPORT_FILES = 50;
const WARN_FULL_EXPORT_TOTAL_BYTES = 100 * 1024 * 1024;
const MAX_FULL_EXPORT_FILE_BYTES = 25 * 1024 * 1024;
const PER_FILE_TIMEOUT_MS = 20_000;

const optionLabels: Record<string, string> = {
  includeDetails: 'summary/details',
  includeEvidence: 'linked evidence metadata',
  includeActions: 'linked actions',
  includeReviews: 'reviews',
  includeImages: 'images metadata',
  includeProfile: 'profile summary',
  includeCompetencies: 'assigned competencies',
  includePrimaryImage: 'primary image metadata',
  includeGallery: 'gallery metadata',
  includeChecks: 'check records',
  includeMetadata: 'document metadata',
  includeLinkedRecords: 'linked records',
  includeNotes: 'notes/updates',
  includeFiles: 'files'
};

const sanitizeSegment = (value: string, fallback: string) => {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-zA-Z0-9._ -]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .toLowerCase();
  return normalized || fallback;
};

const sanitizeZipPathSegment = (value: string, fallback: string) =>
  sanitizeSegment(value, fallback).replace(/[\\/]/g, '-');

const itemFolderName = (title: string, id: string) =>
  `${sanitizeSegment(title, 'item')}-${id.slice(0, 8)}`;

const sourceModuleFromRoute = (route: string) => {
  if (route.includes('/requirements')) return 'Requirements';
  if (route.includes('/competencies')) return 'Competencies';
  if (route.includes('/matrix')) return 'Asset Matrix';
  if (route.includes('/vault')) return 'Evidence Vault';
  if (route.includes('/dashboard')) return 'Dashboard';
  return 'Unknown';
};

const safeDocumentMetadata = (document: EvidenceDocument, fileExportStatus: 'deferred' | 'available' = 'deferred') => ({
  id: document.id,
  title: document.title,
  file_name: document.file_name,
  original_file_name: document.original_file_name || null,
  safe_file_name: document.safe_file_name || null,
  mime_type: document.mime_type || null,
  file_size_bytes: document.file_size_bytes,
  category: document.category,
  status: document.status,
  issue_date: document.issue_date || null,
  expiry_date: document.expiry_date || null,
  review_date: document.review_date || null,
  training_date: document.training_date || null,
  calibration_date: document.calibration_date || null,
  tags: document.tags || [],
  metadata: document.metadata || {},
  created_at: document.created_at,
  updated_at: document.updated_at,
  file_included: fileExportStatus === 'available',
  file_export_status: fileExportStatus
});

const safeImageMetadata = (attachment: RecordImageAttachment, fileExportStatus: 'deferred' | 'available' = 'deferred') => ({
  id: attachment.id,
  entity_type: attachment.entity_type,
  entity_id: attachment.entity_id,
  document_id: attachment.document_id,
  file_name: attachment.file_name,
  mime_type: attachment.mime_type,
  file_size_bytes: attachment.file_size_bytes,
  width: attachment.width,
  height: attachment.height,
  image_role: attachment.image_role,
  caption: attachment.caption,
  alt_text: attachment.alt_text,
  created_at: attachment.created_at,
  file_included: fileExportStatus === 'available',
  file_export_status: fileExportStatus
});

const safeActionSummary = (action: Action) => ({
  id: action.id,
  title: action.title,
  description: action.description,
  owner: action.owner,
  status: action.status,
  due_date: action.target_due_date || action.due_date || null,
  opened_at: action.opened_at || action.created_at,
  closed_at: action.closed_at || action.completed_at || action.cancelled_at || null,
  completion_note: action.completion_note || null,
  cancellation_note: action.cancellation_note || null,
  created_at: action.created_at,
  updated_at: action.updated_at
});

const safePersonSummary = (person: Person) => ({
  id: person.id,
  display_name: person.display_name,
  employee_number: person.employee_number,
  email: person.email,
  department: person.department,
  role: person.role,
  person_type: person.person_type,
  status: person.person_status || (person.active ? 'Active' : 'Inactive'),
  start_date: person.start_date,
  end_date: person.end_date,
  notes: person.notes,
  created_at: person.created_at,
  updated_at: person.updated_at
});

const safeAssetSummary = (asset: Asset) => ({
  id: asset.id,
  name: asset.name,
  asset_number: asset.asset_number,
  asset_type: asset.asset_type,
  category: asset.category,
  registration_number: asset.registration_number,
  serial_number: asset.serial_number,
  make: asset.make,
  model: asset.model,
  location: asset.location,
  department: asset.department,
  owner: asset.owner,
  status: asset.status,
  notes: asset.notes,
  created_at: asset.created_at,
  updated_at: asset.updated_at
});

const safeRequirementSummary = (requirement: Requirement) => ({
  id: requirement.id,
  title: requirement.title,
  description: requirement.description,
  owner: requirement.owner,
  category: requirement.category,
  status: requirement.status,
  review_frequency: requirement.review_frequency,
  review_date: requirement.review_date,
  next_due_date: requirement.next_due_date,
  risk_level: requirement.risk_level,
  lifecycle_status: requirement.lifecycle_status || 'active',
  notes: requirement.notes || null,
  created_at: requirement.created_at,
  updated_at: requirement.updated_at
});

const safeCompetencyRecordSummary = (record: CompetencyRecord, type: CompetencyType | undefined) => ({
  id: record.id,
  competency_type_id: record.competency_type_id,
  competency_title: type?.title || 'Unknown competency',
  category: type?.category || null,
  status: record.status,
  completed_date: record.completed_date,
  expiry_date: record.expiry_date,
  trainer: record.trainer,
  provider: record.provider,
  certificate_number: record.certificate_number,
  notes: record.notes,
  created_at: record.created_at,
  updated_at: record.updated_at
});

const safeAssignmentSummary = (assignment: AssetCheckAssignment, latestRecord?: AssetCheckRecord | null) => ({
  id: assignment.id,
  asset_check_type_id: assignment.asset_check_type_id,
  required: assignment.required,
  frequency_value: assignment.frequency_value,
  frequency_unit: assignment.frequency_unit,
  warning_days: assignment.warning_days,
  first_due_date: assignment.first_due_date,
  next_due_date: assignment.next_due_date,
  last_completed_date: assignment.last_completed_date,
  last_expiry_date: assignment.last_expiry_date,
  status: assignment.status,
  active: assignment.active,
  notes: assignment.notes,
  latest_record: latestRecord
    ? {
        id: latestRecord.id,
        completed_at: latestRecord.completed_at,
        valid_from: latestRecord.valid_from,
        valid_until: latestRecord.valid_until,
        result_status: latestRecord.result_status,
        performed_by: latestRecord.performed_by,
        reference: latestRecord.reference,
        notes: latestRecord.notes
      }
    : null
});

const asJson = (value: unknown) => JSON.stringify(value, null, 2);

const buildInitialProgress = (): PackExportProgress => ({
  phase: 'collecting-metadata',
  message: 'Collecting metadata',
  totalCandidates: 0,
  processedCandidates: 0,
  includedFiles: 0,
  failedFiles: 0,
  deferredFiles: 0,
  totalBytes: 0
});

const updateProgress = (
  onProgress: FullExportOptions['onProgress'] | undefined,
  base: PackExportProgress,
  patch: Partial<PackExportProgress>
) => {
  if (!onProgress) return;
  onProgress({ ...base, ...patch });
};

const addTraceabilityRow = (
  rows: TraceabilityRow[],
  exportedAt: string,
  item: PackDraftItem,
  childSectionKey: string,
  status: ChildSectionStatus,
  note: string,
  extras?: Partial<TraceabilityRow>
) => {
  rows.push({
    pack_item_id: `${item.type}:${item.id}`,
    item_type: item.type,
    item_title: item.title,
    source_module: sourceModuleFromRoute(item.sourceRoute),
    source_entity_id: item.id,
    source_record_type: extras?.source_record_type || '',
    source_record_id: extras?.source_record_id || '',
    parent_item_id: `${item.type}:${item.id}`,
    child_section_name: childSectionKey,
    child_section_included: item.options[childSectionKey] === undefined ? '' : String(Boolean(item.options[childSectionKey])),
    child_section_status: status,
    zip_relative_path: extras?.zip_relative_path || '',
    failure_reason: extras?.failure_reason || '',
    export_timestamp: exportedAt,
    note
  });
};

const addDeferredRow = (
  rows: DeferredFileRow[],
  item: PackDraftItem,
  childSection: string,
  reason = FILE_EXPORT_DEFERRED_REASON,
  status = 'deferred'
) => {
  rows.push({
    pack_item_id: `${item.type}:${item.id}`,
    item_type: item.type,
    item_title: item.title,
    child_section: childSection,
    reason,
    status
  });
};

const formatBytes = (value: number) => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const ensureNotAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new DOMException('Export cancelled by user.', 'AbortError');
  }
};

const isRetryableExportError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('timeout') ||
    message.includes('temporarily') ||
    message.includes('503') ||
    message.includes('504')
  );
};

const withOneRetry = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (!isRetryableExportError(error)) throw error;
    return operation();
  }
};

const timeoutSignal = (parent: AbortSignal | undefined, timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('Timed out while fetching private file.', 'AbortError')), timeoutMs);
  const onAbort = () => controller.abort(parent?.reason);
  if (parent) {
    if (parent.aborted) controller.abort(parent.reason);
    else parent.addEventListener('abort', onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      if (parent) parent.removeEventListener('abort', onAbort);
    }
  };
};

const makeUniqueZipPath = (desiredPath: string, usedPaths: Set<string>) => {
  if (!usedPaths.has(desiredPath)) {
    usedPaths.add(desiredPath);
    return desiredPath;
  }

  const lastSlash = desiredPath.lastIndexOf('/');
  const folder = lastSlash >= 0 ? desiredPath.slice(0, lastSlash + 1) : '';
  const fileName = lastSlash >= 0 ? desiredPath.slice(lastSlash + 1) : desiredPath;
  const dot = fileName.lastIndexOf('.');
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot) : '';

  let counter = 2;
  while (true) {
    const next = `${folder}${base}-${counter}${ext}`;
    if (!usedPaths.has(next)) {
      usedPaths.add(next);
      return next;
    }
    counter += 1;
  }
};

const getFileExtension = (filename: string, mimeType: string | null) => {
  const trimmed = filename.trim();
  const dot = trimmed.lastIndexOf('.');
  if (dot > -1 && dot < trimmed.length - 1) {
    return trimmed.slice(dot).replace(/[^a-zA-Z0-9.]/g, '').toLowerCase();
  }
  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return '.docx';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return '.xlsx';
  return '';
};

const buildSafeExportFilename = (
  preferredName: string,
  fallbackBase: string,
  mimeType: string | null,
  sourceId: string
) => {
  const extension = getFileExtension(preferredName, mimeType);
  const baseSource = preferredName.replace(/\.[^.]+$/, '');
  const safeBase = sanitizeZipPathSegment(baseSource, fallbackBase);
  const ext = extension || '';
  return `${safeBase || fallbackBase}-${sourceId.slice(0, 8)}${ext}`;
};

const isDocumentExportableFromState = (document: EvidenceDocument) =>
  document.status !== 'deleted' && !document.archived_at && !document.deleted_at && !document.permanently_deleted_at;

const isImageExportableFromState = (attachment: RecordImageAttachment) => !attachment.archived_at;

const pushDocumentCandidate = (
  list: PackFileCandidate[],
  item: PackDraftItem,
  document: EvidenceDocument,
  childSection: string,
  zipCategoryFolder: string,
  organisationId: string
) => {
  if (document.organization_id !== organisationId) return;
  if (!isDocumentExportableFromState(document)) return;

  list.push({
    candidateKey: `${item.type}:${item.id}:document:${document.id}:${childSection}`,
    physicalSourceKey: `document:${document.id}`,
    kind: 'document',
    packItemId: item.id,
    packItemType: item.type,
    packItemTitle: item.title,
    sourceRecordId: document.id,
    sourceRecordType: 'evidence_document',
    sourceEntityId: document.id,
    sourceEntityType: 'evidence_document',
    displayTitle: document.title,
    originalFilename: document.original_file_name || document.file_name,
    safeExportFilename: buildSafeExportFilename(
      document.safe_file_name || document.original_file_name || document.file_name,
      sanitizeZipPathSegment(document.title || 'document', 'document'),
      document.mime_type || null,
      document.id
    ),
    mimeType: document.mime_type || null,
    sizeBytes: document.file_size_bytes ?? null,
    organisationId,
    childSection,
    childSectionIncluded: true,
    zipRootFolder: '06-Evidence-Files',
    zipCategoryFolder
  });
};

const pushImageCandidate = (
  list: PackFileCandidate[],
  item: PackDraftItem,
  attachment: RecordImageAttachment,
  childSection: string,
  zipCategoryFolder: string,
  organisationId: string
) => {
  if (attachment.organisation_id !== organisationId) return;
  if (!isImageExportableFromState(attachment)) return;

  const preferredName = attachment.file_name || `${attachment.entity_type}-${attachment.image_role || 'image'}`;
  list.push({
    candidateKey: `${item.type}:${item.id}:image:${attachment.id}:${childSection}`,
    physicalSourceKey: attachment.document_id && !attachment.storage_path ? `image-document:${attachment.document_id}` : `image:${attachment.id}`,
    kind: 'image',
    packItemId: item.id,
    packItemType: item.type,
    packItemTitle: item.title,
    sourceRecordId: attachment.id,
    sourceRecordType: 'record_image_attachment',
    sourceEntityId: attachment.entity_id,
    sourceEntityType: attachment.entity_type,
    displayTitle: attachment.caption || attachment.file_name || `${attachment.entity_type} image`,
    originalFilename: preferredName,
    safeExportFilename: buildSafeExportFilename(
      preferredName,
      sanitizeZipPathSegment(`${attachment.entity_type}-${attachment.image_role || 'image'}`, 'image'),
      attachment.mime_type || null,
      attachment.id
    ),
    mimeType: attachment.mime_type || null,
    sizeBytes: attachment.file_size_bytes ?? null,
    organisationId,
    childSection,
    childSectionIncluded: true,
    zipRootFolder: '07-Image-Attachments',
    zipCategoryFolder
  });
};

const collectPackFileCandidates = (data: ExportContextData) => {
  const includedItems = data.items.filter(item => item.included);
  const candidates: PackFileCandidate[] = [];
  const deferredRows: DeferredFileRow[] = [];
  const documentMap = new Map(data.documents.map(document => [document.id, document]));

  for (const item of includedItems) {
    if (item.type === 'requirement') {
      if (item.options.includeEvidence) {
        const requirementDocs = data.requirementDocuments
          .filter(link => link.requirement_id === item.id)
          .map(link => documentMap.get(link.document_id))
          .filter((document): document is EvidenceDocument => Boolean(document));
        const criterionDocs = data.requirementEvidenceCriterionMatches
          .filter(match =>
            match.document_id &&
            data.requirementEvidenceCriteria.some(criteria => criteria.id === match.criterion_id && criteria.requirement_id === item.id)
          )
          .map(match => documentMap.get(match.document_id!))
          .filter((document): document is EvidenceDocument => Boolean(document));

        const seen = new Set<string>();
        [...requirementDocs, ...criterionDocs].forEach(document => {
          if (seen.has(document.id)) return;
          seen.add(document.id);
          pushDocumentCandidate(candidates, item, document, 'includeEvidence', 'requirements', data.organisationId);
        });
      }

      if (item.options.includeImages) {
        data.imageAttachments
          .filter(attachment => attachment.entity_type === 'requirement' && attachment.entity_id === item.id)
          .forEach(attachment => pushImageCandidate(candidates, item, attachment, 'includeImages', 'requirements', data.organisationId));
      }
    }

    if (item.type === 'person') {
      const recordIds = data.competencyRecords.filter(record => record.person_id === item.id).map(record => record.id);
      if (item.options.includeEvidence) {
        const seen = new Set<string>();
        data.competencyRecordDocuments
          .filter(link => recordIds.includes(link.competency_record_id))
          .forEach(link => {
            const document = documentMap.get(link.document_id);
            if (!document || seen.has(document.id)) return;
            seen.add(document.id);
            pushDocumentCandidate(candidates, item, document, 'includeEvidence', 'people', data.organisationId);
          });
      }

      if (item.options.includeImages) {
        data.imageAttachments
          .filter(attachment => attachment.entity_type === 'person' && attachment.entity_id === item.id)
          .forEach(attachment => pushImageCandidate(candidates, item, attachment, 'includeImages', 'people', data.organisationId));
      }
    }

    if (item.type === 'asset') {
      if (item.options.includeChecks) {
        const seen = new Set<string>();
        data.assetCheckEvidenceLinks
          .filter(link => link.asset_id === item.id)
          .forEach(link => {
            const document = documentMap.get(link.document_id);
            if (!document || seen.has(document.id)) return;
            seen.add(document.id);
            pushDocumentCandidate(candidates, item, document, 'includeChecks', 'assets', data.organisationId);
          });

        data.assetHistoryEvents
          .filter(event => event.asset_id === item.id && event.evidence_document_id)
          .forEach(event => {
            const document = documentMap.get(event.evidence_document_id!);
            if (!document || seen.has(document.id)) return;
            seen.add(document.id);
            pushDocumentCandidate(candidates, item, document, 'includeChecks', 'assets', data.organisationId);
          });
      }

      if (item.options.includePrimaryImage) {
        data.imageAttachments
          .filter(attachment =>
            attachment.entity_type === 'asset' &&
            attachment.entity_id === item.id &&
            (attachment.is_primary || attachment.image_role === 'primary')
          )
          .forEach(attachment => pushImageCandidate(candidates, item, attachment, 'includePrimaryImage', 'assets', data.organisationId));
      }

      if (item.options.includeGallery) {
        data.imageAttachments
          .filter(attachment =>
            attachment.entity_type === 'asset' &&
            attachment.entity_id === item.id &&
            !(attachment.is_primary || attachment.image_role === 'primary')
          )
          .forEach(attachment => pushImageCandidate(candidates, item, attachment, 'includeGallery', 'assets', data.organisationId));
      }
    }

    if (item.type === 'action') {
      if (item.options.includeEvidence) {
        const seen = new Set<string>();
        data.actionDocuments
          .filter(link => link.action_id === item.id)
          .forEach(link => {
            const document = documentMap.get(link.document_id);
            if (!document || seen.has(document.id)) return;
            seen.add(document.id);
            pushDocumentCandidate(candidates, item, document, 'includeEvidence', 'actions', data.organisationId);
          });
      }

      if (item.options.includeImages) {
        data.imageAttachments
          .filter(attachment => attachment.entity_type === 'action' && attachment.entity_id === item.id)
          .forEach(attachment => pushImageCandidate(candidates, item, attachment, 'includeImages', 'actions', data.organisationId));
      }
    }

    if (item.type === 'evidence' && item.options.includeMetadata) {
      const document = documentMap.get(item.id);
      if (document) {
        pushDocumentCandidate(candidates, item, document, 'includeMetadata', 'documents', data.organisationId);
      }
    }

    if (item.type === 'evidence' && item.options.includeLinkedRecords) {
      data.imageAttachments
        .filter(attachment => attachment.entity_type === 'evidence_document' && attachment.entity_id === item.id)
        .forEach(attachment => pushImageCandidate(candidates, item, attachment, 'includeLinkedRecords', 'documents', data.organisationId));
    }

    if (item.options.includeFiles === false && !item.options.includeEvidence && !item.options.includeImages && !item.options.includePrimaryImage && !item.options.includeGallery && item.type !== 'evidence') {
      addDeferredRow(deferredRows, item, 'files', FULL_EXPORT_DEFERRED_REASON);
    }
  }

  return { includedItems, candidates, deferredRows };
};

export const previewFullEvidencePackExport = (data: ExportContextData): FullPackExportPreview => {
  const { candidates } = collectPackFileCandidates(data);
  const knownBytes = candidates.reduce((total, candidate) => total + (candidate.sizeBytes || 0), 0);
  const missingSizeCount = candidates.filter(candidate => candidate.sizeBytes == null).length;
  const reasons: string[] = [];

  if (candidates.length > MAX_FULL_EXPORT_FILES) {
    reasons.push(`Selected file count exceeds the current limit of ${MAX_FULL_EXPORT_FILES} files.`);
  } else if (candidates.length >= WARN_FULL_EXPORT_FILES) {
    reasons.push(`Large export: ${candidates.length} files selected. Review before exporting.`);
  }

  if (knownBytes > MAX_FULL_EXPORT_TOTAL_BYTES) {
    reasons.push(`Estimated file size exceeds the current limit of ${formatBytes(MAX_FULL_EXPORT_TOTAL_BYTES)}.`);
  } else if (knownBytes >= WARN_FULL_EXPORT_TOTAL_BYTES) {
    reasons.push(`Large export: estimated size is ${formatBytes(knownBytes)}.`);
  }

  if (missingSizeCount > 0) {
    reasons.push(`${missingSizeCount} file${missingSizeCount === 1 ? '' : 's'} do not expose size metadata before fetch.`);
  }

  return {
    candidateCount: candidates.length,
    estimatedBytes: knownBytes,
    warningThresholdReached: candidates.length >= WARN_FULL_EXPORT_FILES || knownBytes >= WARN_FULL_EXPORT_TOTAL_BYTES,
    limitExceeded: candidates.length > MAX_FULL_EXPORT_FILES || knownBytes > MAX_FULL_EXPORT_TOTAL_BYTES,
    missingSizeCount,
    reasons
  };
};

const buildPackArtifacts = (data: ExportContextData, options: BuildPackArtifactsOptions): BuildPackArtifactsResult => {
  const zip = new JSZip();
  const today = exportDateStamp();
  const safePackName = sanitizeSegment(data.packName, 'audit-pack');
  const root = `LUMEN-Audit-Pack-${safePackName}-${today}`;
  const rootFolder = zip.folder(root);
  if (!rootFolder) {
    throw new Error('Unable to create the ZIP root folder.');
  }

  const includedItems = data.items.filter(item => item.included);
  const exportedAt = new Date().toISOString();
  const traceabilityRows: TraceabilityRow[] = [];
  const deferredRows: DeferredFileRow[] = [];
  const competencyRecordMap = new Map(data.competencyRecords.map(record => [record.id, record]));

  const countsByType = includedItems.reduce<Record<PackItemType, number>>(
    (acc, item) => {
      acc[item.type] += 1;
      return acc;
    },
    { requirement: 0, person: 0, asset: 0, evidence: 0, action: 0 }
  );

  const packSummary = {
    pack_name: data.packName,
    pack_description: data.packDescription,
    organisation_name: data.organisationName,
    exported_by: data.exportedBy,
    exported_at: exportedAt,
    export_scope: options.exportMode,
    total_draft_items: data.items.length,
    included_items: includedItems.length,
    excluded_items: data.items.length - includedItems.length,
    counts_by_type: countsByType,
    security: {
      includes_private_files: options.exportMode === 'full-private-files',
      includes_signed_urls: false,
      includes_public_urls: false,
      includes_raw_storage_paths: false,
      full_private_file_export_deferred: options.exportMode !== 'full-private-files'
    }
  };

  const packSummaryCsv: ExportRow[] = [{
    pack_name: data.packName,
    organisation_name: data.organisationName,
    exported_by: data.exportedBy,
    exported_at: exportedAt,
    export_scope: options.exportMode,
    total_draft_items: data.items.length,
    included_items: includedItems.length,
    excluded_items: data.items.length - includedItems.length,
    requirements: countsByType.requirement,
    people: countsByType.person,
    assets: countsByType.asset,
    evidence: countsByType.evidence,
    actions: countsByType.action,
    includes_private_files: options.exportMode === 'full-private-files' ? 'yes' : 'no',
    private_file_export: options.exportMode === 'full-private-files' ? 'enabled' : 'deferred'
  }];

  const safeIncludedItems = includedItems.map(item => ({
    id: item.id,
    type: item.type,
    title: item.title,
    source_route: item.sourceRoute,
    source_module: sourceModuleFromRoute(item.sourceRoute),
    added_at: item.added_at,
    added_by: item.added_by || null,
    child_sections: Object.entries(item.options).map(([key, enabled]) => ({
      key,
      label: optionLabels[key] || key,
      enabled,
      status: key === 'includeFiles'
        ? options.fileStatusMode
        : enabled
          ? 'included'
          : 'excluded'
    }))
  }));

  const indexFolder = rootFolder.folder('00-Pack-Index');
  const requirementsFolder = rootFolder.folder('01-Requirements');
  const peopleFolder = rootFolder.folder('02-People');
  const assetsFolder = rootFolder.folder('03-Assets');
  const actionsFolder = rootFolder.folder('04-Actions');
  const evidenceFolder = rootFolder.folder('05-Evidence-Metadata');
  if (options.exportMode === 'full-private-files') {
    rootFolder.folder('06-Evidence-Files');
    rootFolder.folder('07-Image-Attachments');
  }
  rootFolder.folder('99-Export-Logs');

  for (const item of includedItems) {
    if (options.exportMode === 'metadata-only') {
      addDeferredRow(deferredRows, item, 'files', FILE_EXPORT_DEFERRED_REASON);
    }

    if (item.type === 'requirement') {
      const requirement = data.requirements.find(entry => entry.id === item.id);
      const linkedRequirementDocs = data.requirementDocuments
        .filter(link => link.requirement_id === item.id)
        .map(link => data.documents.find(document => document.id === link.document_id))
        .filter((document): document is EvidenceDocument => Boolean(document));
      const relatedCriteria = data.requirementEvidenceCriteria.filter(criteria => criteria.requirement_id === item.id);
      const relatedReviews = data.reviews.filter(review => review.requirement_id === item.id);
      const relatedActions = data.requirementActions
        .filter(link => link.requirement_id === item.id)
        .map(link => data.actions.find(action => action.id === link.action_id))
        .filter((action): action is Action => Boolean(action));
      const linkedImages = data.imageAttachments
        .filter(attachment => attachment.entity_type === 'requirement' && attachment.entity_id === item.id)
        .map(attachment => safeImageMetadata(attachment, options.fileStatusMode));

      const requirementSummary = {
        pack_item: {
          id: item.id,
          title: item.title,
          source_module: sourceModuleFromRoute(item.sourceRoute)
        },
        requirement: requirement ? safeRequirementSummary(requirement) : { unavailable: true, note: 'Requirement not found in current local state.' },
        child_sections: {
          summary_details: item.options.includeDetails
            ? { status: 'included', data: requirement ? safeRequirementSummary(requirement) : null }
            : { status: 'excluded' },
          linked_evidence_metadata: item.options.includeEvidence
            ? {
                status: 'included',
                documents: linkedRequirementDocs.map(document => safeDocumentMetadata(document, options.fileStatusMode)),
                criteria: relatedCriteria.map(criteria => ({
                  id: criteria.id,
                  title: criteria.title,
                  evidence_type: criteria.evidence_type,
                  is_required: criteria.is_required,
                  minimum_count: criteria.minimum_count,
                  match_count: data.requirementEvidenceCriterionMatches.filter(match => match.criterion_id === criteria.id).length
                }))
              }
            : { status: 'excluded' },
          linked_actions: item.options.includeActions
            ? { status: 'included', actions: relatedActions.map(safeActionSummary) }
            : { status: 'excluded' },
          reviews: item.options.includeReviews
            ? { status: 'included', reviews: relatedReviews }
            : { status: 'excluded' },
          images_metadata: item.options.includeImages
            ? { status: 'included', images: linkedImages }
            : { status: 'excluded' },
          files: {
            status: options.fileStatusMode,
            note: options.exportMode === 'full-private-files'
              ? 'Private file export is enabled for selected and permitted requirement-linked evidence and images.'
              : FILE_EXPORT_DEFERRED_REASON
          }
        }
      };

      const folder = requirementsFolder?.folder(itemFolderName(item.title, item.id));
      folder?.file('requirement-summary.json', asJson(requirementSummary));
    }

    if (item.type === 'person') {
      const person = data.people.find(entry => entry.id === item.id);
      const personRecords = data.competencyRecords.filter(record => record.person_id === item.id);
      const personDocuments = data.competencyRecordDocuments
        .filter(link => personRecords.some(record => record.id === link.competency_record_id))
        .map(link => data.documents.find(document => document.id === link.document_id))
        .filter((document): document is EvidenceDocument => Boolean(document));
      const personActions = data.actions.filter(action =>
        data.actionObjectLinks.some(link => link.action_id === action.id && link.object_type === 'person' && link.object_id === item.id)
      );
      const personImages = data.imageAttachments
        .filter(attachment => attachment.entity_type === 'person' && attachment.entity_id === item.id)
        .map(attachment => safeImageMetadata(attachment, options.fileStatusMode));

      const personSummary = {
        pack_item: {
          id: item.id,
          title: item.title,
          source_module: sourceModuleFromRoute(item.sourceRoute)
        },
        person: person ? safePersonSummary(person) : { unavailable: true, note: 'Person not found in current local state.' },
        child_sections: {
          profile_summary: item.options.includeProfile
            ? { status: 'included', data: person ? safePersonSummary(person) : null }
            : { status: 'excluded' },
          competencies: item.options.includeCompetencies
            ? {
                status: 'included',
                records: personRecords.map(record =>
                  safeCompetencyRecordSummary(record, data.competencyTypes.find(type => type.id === record.competency_type_id))
                )
              }
            : { status: 'excluded' },
          linked_evidence_metadata: item.options.includeEvidence
            ? { status: 'included', documents: personDocuments.map(document => safeDocumentMetadata(document, options.fileStatusMode)) }
            : { status: 'excluded' },
          images_metadata: item.options.includeImages
            ? { status: 'included', images: personImages }
            : { status: 'excluded' },
          linked_actions: item.options.includeActions
            ? { status: 'included', actions: personActions.map(safeActionSummary) }
            : { status: 'excluded' },
          files: {
            status: options.fileStatusMode,
            note: options.exportMode === 'full-private-files'
              ? 'Private file export is enabled for selected and permitted competency evidence and person images.'
              : FILE_EXPORT_DEFERRED_REASON
          }
        }
      };

      const folder = peopleFolder?.folder(itemFolderName(item.title, item.id));
      folder?.file('person-summary.json', asJson(personSummary));
    }

    if (item.type === 'asset') {
      const asset = data.assets.find(entry => entry.id === item.id);
      const assignments = data.assetCheckAssignments.filter(assignment => assignment.asset_id === item.id);
      const linkedActions = data.actions.filter(action =>
        data.actionObjectLinks.some(link => link.action_id === action.id && link.object_type === 'asset' && link.object_id === item.id)
      );
      const assetImages = data.imageAttachments.filter(attachment => attachment.entity_type === 'asset' && attachment.entity_id === item.id);
      const primaryImage = assetImages.find(image => image.image_role === 'primary' || image.is_primary) || null;
      const galleryImages = assetImages.filter(image => !(image.image_role === 'primary' || image.is_primary));

      const assetSummary = {
        pack_item: {
          id: item.id,
          title: item.title,
          source_module: sourceModuleFromRoute(item.sourceRoute)
        },
        asset: asset ? safeAssetSummary(asset) : { unavailable: true, note: 'Asset not found in current local state.' },
        child_sections: {
          profile_summary: item.options.includeProfile
            ? { status: 'included', data: asset ? safeAssetSummary(asset) : null }
            : { status: 'excluded' },
          primary_image_metadata: item.options.includePrimaryImage
            ? { status: 'included', image: primaryImage ? safeImageMetadata(primaryImage, options.fileStatusMode) : null }
            : { status: 'excluded' },
          gallery_metadata: item.options.includeGallery
            ? { status: 'included', images: galleryImages.map(image => safeImageMetadata(image, options.fileStatusMode)) }
            : { status: 'excluded' },
          checks: item.options.includeChecks
            ? {
                status: 'included',
                assignments: assignments.map(assignment =>
                  safeAssignmentSummary(
                    assignment,
                    data.assetCheckRecords
                      .filter(record => record.asset_check_assignment_id === assignment.id)
                      .sort((a, b) => b.completed_at.localeCompare(a.completed_at))[0] || null
                  )
                ),
                history: data.assetHistoryEvents
                  .filter(event => event.asset_id === item.id)
                  .map(event => ({
                    id: event.id,
                    event_type: event.event_type,
                    event_date: event.event_date,
                    title: event.title,
                    status: event.status
                  }))
              }
            : { status: 'excluded' },
          linked_actions: item.options.includeActions
            ? { status: 'included', actions: linkedActions.map(safeActionSummary) }
            : { status: 'excluded' },
          files: {
            status: options.fileStatusMode,
            note: options.exportMode === 'full-private-files'
              ? 'Private file export is enabled for selected and permitted asset evidence and images.'
              : FILE_EXPORT_DEFERRED_REASON
          }
        }
      };

      const folder = assetsFolder?.folder(itemFolderName(item.title, item.id));
      folder?.file('asset-summary.json', asJson(assetSummary));
    }

    if (item.type === 'action') {
      const action = data.actions.find(entry => entry.id === item.id);
      const actionEvidence = data.actionDocuments
        .filter(link => link.action_id === item.id)
        .map(link => data.documents.find(document => document.id === link.document_id))
        .filter((document): document is EvidenceDocument => Boolean(document));
      const actionImages = data.imageAttachments
        .filter(attachment => attachment.entity_type === 'action' && attachment.entity_id === item.id)
        .map(attachment => safeImageMetadata(attachment, options.fileStatusMode));
      const updates = data.actionUpdates
        .filter(update => update.action_id === item.id)
        .map(update => ({
          id: update.id,
          update_type: update.update_type,
          note: update.note,
          created_at: update.created_at
        }));

      const actionSummary = {
        pack_item: {
          id: item.id,
          title: item.title,
          source_module: sourceModuleFromRoute(item.sourceRoute)
        },
        action: action ? safeActionSummary(action) : { unavailable: true, note: 'Action not found in current local state.' },
        child_sections: {
          summary_details: item.options.includeDetails
            ? { status: 'included', data: action ? safeActionSummary(action) : null }
            : { status: 'excluded' },
          linked_evidence_metadata: item.options.includeEvidence
            ? { status: 'included', documents: actionEvidence.map(document => safeDocumentMetadata(document, options.fileStatusMode)) }
            : { status: 'excluded' },
          images_metadata: item.options.includeImages
            ? { status: 'included', images: actionImages }
            : { status: 'excluded' },
          notes_updates: item.options.includeNotes
            ? { status: 'included', updates }
            : { status: 'excluded' },
          files: {
            status: options.fileStatusMode,
            note: options.exportMode === 'full-private-files'
              ? 'Private file export is enabled for selected and permitted action evidence and images.'
              : FILE_EXPORT_DEFERRED_REASON
          }
        }
      };

      const folder = actionsFolder?.folder(itemFolderName(item.title, item.id));
      folder?.file('action-summary.json', asJson(actionSummary));
    }

    if (item.type === 'evidence') {
      const document = data.documents.find(entry => entry.id === item.id);
      const linkedRequirementIds = data.requirementDocuments.filter(link => link.document_id === item.id).map(link => link.requirement_id);
      const linkedCompetencyRecordIds = data.competencyRecordDocuments.filter(link => link.document_id === item.id).map(link => link.competency_record_id);
      const linkedActionIds = data.actionDocuments.filter(link => link.document_id === item.id).map(link => link.action_id);
      const linkedAssetCheckIds = data.assetCheckEvidenceLinks.filter(link => link.document_id === item.id).map(link => link.asset_check_assignment_id || link.asset_check_record_id || '');
      const attachedImages = data.imageAttachments
        .filter(attachment => attachment.entity_type === 'evidence_document' && attachment.entity_id === item.id)
        .map(attachment => safeImageMetadata(attachment, options.fileStatusMode));

      const evidenceSummary = {
        pack_item: {
          id: item.id,
          title: item.title,
          source_module: sourceModuleFromRoute(item.sourceRoute)
        },
        evidence_document: document
          ? safeDocumentMetadata(document, options.fileStatusMode)
          : { unavailable: true, note: 'Evidence document not found in current local state.' },
        child_sections: {
          document_metadata: item.options.includeMetadata
            ? { status: 'included', data: document ? safeDocumentMetadata(document, options.fileStatusMode) : null }
            : { status: 'excluded' },
          linked_records: item.options.includeLinkedRecords
            ? {
                status: 'included',
                requirements: linkedRequirementIds.map(id => data.requirements.find(entry => entry.id === id)).filter(Boolean).map(entry => ({
                  id: entry!.id,
                  title: entry!.title,
                  category: entry!.category,
                  status: entry!.status
                })),
                competency_records: linkedCompetencyRecordIds.map(id => competencyRecordMap.get(id)).filter(Boolean).map(record => {
                  const type = data.competencyTypes.find(entry => entry.id === record!.competency_type_id);
                  const person = data.people.find(entry => entry.id === record!.person_id);
                  return {
                    id: record!.id,
                    status: record!.status,
                    competency_title: type?.title || 'Unknown competency',
                    person_name: person?.display_name || 'Unknown person'
                  };
                }),
                actions: linkedActionIds.map(id => data.actions.find(entry => entry.id === id)).filter(Boolean).map(action => ({
                  id: action!.id,
                  title: action!.title,
                  status: action!.status
                })),
                asset_checks: linkedAssetCheckIds.filter(Boolean),
                images: attachedImages
              }
            : { status: 'excluded' },
          files: {
            status: options.fileStatusMode,
            note: options.exportMode === 'full-private-files'
              ? 'Private file export is enabled for selected and permitted evidence records.'
              : FILE_EXPORT_DEFERRED_REASON
          }
        }
      };

      const folder = evidenceFolder?.folder(itemFolderName(item.title, item.id));
      folder?.file('evidence-metadata.json', asJson(evidenceSummary));
    }

    for (const [optionKey, enabled] of Object.entries(item.options)) {
      const status: ChildSectionStatus =
        optionKey === 'includeFiles'
          ? options.fileStatusMode === 'available' ? 'included' : 'deferred'
          : enabled
            ? 'included'
            : 'excluded';

      addTraceabilityRow(
        traceabilityRows,
        exportedAt,
        item,
        optionKey,
        status,
        optionKey === 'includeFiles'
          ? options.exportMode === 'full-private-files'
            ? 'Private file export is enabled for selected and permitted sources in this full ZIP export.'
            : 'Private file export is deferred for security review. No evidence files are included in this metadata ZIP.'
          : `${optionLabels[optionKey] || optionKey} ${status}.`
      );
    }
  }

  indexFolder?.file('pack-summary.json', asJson(packSummary));
  indexFolder?.file('pack-summary.csv', rowsToCsv(packSummaryCsv));
  indexFolder?.file('included-items.json', asJson(safeIncludedItems));

  return {
    zip,
    rootFolderName: root,
    includedItems,
    exportedAt,
    traceabilityRows,
    deferredRows,
    packSummary
  };
};

const writeMetadataZipIndexes = (
  artifacts: BuildPackArtifactsResult,
  exportNotes: string,
  exportLimitations: string
) => {
  const rootFolder = artifacts.zip.folder(artifacts.rootFolderName);
  const indexFolder = rootFolder?.folder('00-Pack-Index');
  const logsFolder = rootFolder?.folder('99-Export-Logs');

  indexFolder?.file('traceability-map.csv', rowsToCsv(artifacts.traceabilityRows));
  indexFolder?.file('export-notes.txt', exportNotes);
  logsFolder?.file('deferred-files.csv', rowsToCsv(artifacts.deferredRows));
  logsFolder?.file('export-limitations.txt', exportLimitations);
};

export const buildEvidencePackMetadataZip = async (data: ExportContextData) => {
  const artifacts = buildPackArtifacts(data, {
    exportMode: 'metadata-only',
    fileStatusMode: 'deferred'
  });

  writeMetadataZipIndexes(
    artifacts,
    [
      `LUMÉN Evidence Pack Export`,
      ``,
      `Pack: ${data.packName}`,
      `Organisation: ${data.organisationName}`,
      `Exported: ${artifacts.exportedAt}`,
      ``,
      `This is a metadata-only export.`,
      `No private evidence files or image files are included.`,
      `Private file export is deferred.`,
      `This ZIP is intended for review of structure, selection, metadata and traceability.`,
      `It does not certify compliance and does not replace professional judgement.`
    ].join('\n'),
    [
      `Export limitations`,
      ``,
      `- No private files are included.`,
      `- No signed URLs are included.`,
      `- No public URLs are generated.`,
      `- No raw storage paths are included.`,
      `- This export is generated from the current local Pack Builder draft state.`,
      `- Future full private-file export must be security reviewed before release.`
    ].join('\n')
  );

  const blob = await artifacts.zip.generateAsync({ type: 'blob' });
  return {
    blob,
    filename: `${artifacts.rootFolderName}.zip`,
    rootFolderName: artifacts.rootFolderName,
    includedCount: artifacts.includedItems.length
  };
};

const validateActiveOrganisation = async (expectedOrganisationId: string) => {
  if (isDemoMode) return;
  const activeOrgId = await getCurrentSupabaseOrganizationId();
  if (!activeOrgId || activeOrgId !== expectedOrganisationId) {
    throw new Error('Active organisation could not be verified for this export.');
  }
};

const validateEphemeralFileUrl = (url: string) => {
  if (url.startsWith('data:')) {
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Export file fetch URL is invalid.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Export file fetch URL used an unsupported protocol.');
  }

  if (isDemoMode) {
    throw new Error('Demo export can only include directly embedded file data. External placeholder URLs are not allowed.');
  }

  const looksLikeSupabaseSignedObject =
    parsed.hostname.endsWith('.supabase.co') &&
    parsed.pathname.includes('/storage/v1/object/sign/');

  if (!looksLikeSupabaseSignedObject) {
    throw new Error('Export file fetch URL did not pass the signed storage URL safety check.');
  }
};

const fetchCandidateBlob = async (
  candidate: PackFileCandidate,
  signal: AbortSignal | undefined
): Promise<PackFileFetchResult> => {
  const { signal: scopedSignal, cleanup } = timeoutSignal(signal, PER_FILE_TIMEOUT_MS);
  try {
    let signedUrl: string;
    if (candidate.kind === 'document') {
      signedUrl = await dbService.getDocumentSignedUrl(candidate.sourceRecordId, FULL_EXPORT_SIGNED_URL_TTL_SECONDS);
    } else {
      signedUrl = await dbService.getImageAttachmentSignedUrl(candidate.sourceRecordId, FULL_EXPORT_SIGNED_URL_TTL_SECONDS);
    }

    validateEphemeralFileUrl(signedUrl);

    const response = await fetch(signedUrl, { signal: scopedSignal, cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Private file fetch failed with HTTP ${response.status}.`);
    }
    const blob = await response.blob();
    const data = new Uint8Array(await blob.arrayBuffer());
    const sizeBytes = blob.size || candidate.sizeBytes || 0;
    return {
      candidate,
      blob,
      data,
      originalFilename: candidate.originalFilename,
      safeFileName: candidate.safeExportFilename,
      mimeType: candidate.mimeType || blob.type || null,
      sizeBytes
    };
  } finally {
    cleanup();
  }
};

const toIncludedFileRow = (candidate: PackFileCandidate, zipRelativePath: string, sizeBytes: number, exportedAt: string): IncludedFileRow => ({
  pack_item_id: `${candidate.packItemType}:${candidate.packItemId}`,
  item_type: candidate.packItemType,
  source_record_id: candidate.sourceRecordId,
  source_record_type: candidate.sourceRecordType,
  display_title: candidate.displayTitle,
  original_filename: candidate.originalFilename,
  exported_filename: candidate.safeExportFilename,
  zip_relative_path: zipRelativePath,
  mime_type: candidate.mimeType || '',
  size_bytes: String(sizeBytes),
  child_section: candidate.childSection,
  export_timestamp: exportedAt
});

const toFailedFileRow = (failure: PackFileFailure, exportedAt: string): FailedFileRow => ({
  pack_item_id: `${failure.candidate.packItemType}:${failure.candidate.packItemId}`,
  item_type: failure.candidate.packItemType,
  source_record_id: failure.candidate.sourceRecordId,
  source_record_type: failure.candidate.sourceRecordType,
  display_title: failure.candidate.displayTitle,
  child_section: failure.candidate.childSection,
  failure_stage: failure.failureStage,
  reason: failure.reason,
  export_timestamp: exportedAt
});

const recordFailure = (
  failures: PackFileFailure[],
  failure: PackFileFailure,
  traceabilityRows: TraceabilityRow[],
  exportedAt: string
) => {
  failures.push(failure);
  addTraceabilityRow(
    traceabilityRows,
    exportedAt,
    {
      id: failure.candidate.packItemId,
      type: failure.candidate.packItemType,
      title: failure.candidate.packItemTitle,
      sourceRoute: '',
      added_at: exportedAt,
      included: true,
      options: { [failure.candidate.childSection]: true }
    },
    failure.candidate.childSection,
    'failed',
    failure.reason,
    {
      source_record_type: failure.candidate.sourceRecordType,
      source_record_id: failure.candidate.sourceRecordId,
      failure_reason: failure.reason
    }
  );
};

const maybeLogExportAuditEvent = async (input: {
  phase: 'started' | 'completed' | 'failed' | 'cancelled';
  packName: string;
  packDescription: string;
  itemCount: number;
  candidateCount: number;
  includedFileCount: number;
  failedFileCount: number;
  deferredFileCount: number;
  totalBytes: number;
}) => {
  try {
    const { logAuditEvent } = await import('./auditTrail');
    await logAuditEvent({
      actionCategory: 'Audit Packs',
      actionType: `evidence_pack_full_export_${input.phase}`,
      entityType: 'evidence_pack_export',
      entityId: null,
      entityLabel: input.packName,
      description:
        input.phase === 'started'
          ? `Started full private-file evidence pack export "${input.packName}".`
          : input.phase === 'completed'
            ? `Completed full private-file evidence pack export "${input.packName}".`
            : input.phase === 'cancelled'
              ? `Cancelled full private-file evidence pack export "${input.packName}".`
              : `Failed full private-file evidence pack export "${input.packName}".`,
      metadata: {
        export_mode: 'full-private-files',
        pack_name: input.packName,
        pack_description: input.packDescription,
        item_count: input.itemCount,
        candidate_file_count: input.candidateCount,
        included_file_count: input.includedFileCount,
        failed_file_count: input.failedFileCount,
        deferred_file_count: input.deferredFileCount,
        total_exported_bytes: input.totalBytes
      },
      severity: input.phase === 'failed' ? 'warning' : 'info',
      source: 'pack_builder'
    });
  } catch {
    // Audit logging is helpful but non-blocking for local export.
  }
};

export const buildFullEvidencePackZip = async (
  data: ExportContextData,
  options: FullExportOptions = {}
): Promise<FullPackExportResult> => {
  const progress = buildInitialProgress();
  updateProgress(options.onProgress, progress, progress);

  ensureNotAborted(options.signal);
  if (!data.exportedByUserId && !isDemoMode) {
    throw new Error('A signed-in user is required for full private-file export.');
  }

  await validateActiveOrganisation(data.organisationId);

  const artifacts = buildPackArtifacts(data, {
    exportMode: 'full-private-files',
    fileStatusMode: 'available'
  });

  updateProgress(options.onProgress, progress, {
    phase: 'collecting-metadata',
    message: 'Collecting metadata',
    totalCandidates: 0,
    deferredFiles: artifacts.deferredRows.length
  });

  const { candidates } = collectPackFileCandidates(data);
  const estimatedBytes = candidates.reduce((total, candidate) => total + (candidate.sizeBytes || 0), 0);

  if (candidates.length === 0) {
    throw new Error('No eligible private files are available for this pack. Export metadata only, or include evidence/image sections that have accessible files.');
  }
  if (candidates.length > MAX_FULL_EXPORT_FILES) {
    throw new Error(`Full export is limited to ${MAX_FULL_EXPORT_FILES} files per pack. Reduce the current selection before exporting.`);
  }
  if (estimatedBytes > MAX_FULL_EXPORT_TOTAL_BYTES) {
    throw new Error(`Estimated export size ${formatBytes(estimatedBytes)} exceeds the current limit of ${formatBytes(MAX_FULL_EXPORT_TOTAL_BYTES)}.`);
  }

  await maybeLogExportAuditEvent({
    phase: 'started',
    packName: data.packName,
    packDescription: data.packDescription,
    itemCount: artifacts.includedItems.length,
    candidateCount: candidates.length,
    includedFileCount: 0,
    failedFileCount: 0,
    deferredFileCount: artifacts.deferredRows.length,
    totalBytes: 0
  });

  const rootFolder = artifacts.zip.folder(artifacts.rootFolderName);
  const evidenceFilesFolder = rootFolder?.folder('06-Evidence-Files');
  const imageFilesFolder = rootFolder?.folder('07-Image-Attachments');
  const logsFolder = rootFolder?.folder('99-Export-Logs');

  const usedZipPaths = new Set<string>();
  const includedRows: IncludedFileRow[] = [];
  const failedRows: FailedFileRow[] = [];
  const failures: PackFileFailure[] = [];
  const fetchedBySource = new Map<string, { zipRelativePath: string; sizeBytes: number }>();

  let processedCandidates = 0;
  let includedFiles = 0;
  let totalBytes = 0;
  const totalCandidates = candidates.length;

  updateProgress(options.onProgress, progress, {
    phase: 'checking-permissions',
    message: 'Checking permissions',
    totalCandidates,
    processedCandidates,
    includedFiles,
    failedFiles: failures.length,
    deferredFiles: artifacts.deferredRows.length,
    totalBytes
  });

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    ensureNotAborted(options.signal);

    updateProgress(options.onProgress, progress, {
      phase: 'fetching-files',
      message: `Fetching private files (${index + 1}/${totalCandidates})`,
      totalCandidates,
      processedCandidates,
      includedFiles,
      failedFiles: failures.length,
      deferredFiles: artifacts.deferredRows.length,
      totalBytes
    });

    if (candidate.organisationId !== data.organisationId) {
      recordFailure(failures, {
        candidate,
        failureStage: 'permission-check',
        reason: 'Candidate organisation does not match the active organisation.'
      }, artifacts.traceabilityRows, artifacts.exportedAt);
      continue;
    }

    if (candidate.sizeBytes != null && candidate.sizeBytes > MAX_FULL_EXPORT_FILE_BYTES) {
      recordFailure(failures, {
        candidate,
        failureStage: 'preflight',
        reason: `File exceeds the per-file limit of ${formatBytes(MAX_FULL_EXPORT_FILE_BYTES)}.`
      }, artifacts.traceabilityRows, artifacts.exportedAt);
      continue;
    }

    const existing = fetchedBySource.get(candidate.physicalSourceKey);
    if (existing) {
      processedCandidates += 1;
      includedRows.push(toIncludedFileRow(candidate, existing.zipRelativePath, existing.sizeBytes, artifacts.exportedAt));
      addTraceabilityRow(
        artifacts.traceabilityRows,
        artifacts.exportedAt,
        {
          id: candidate.packItemId,
          type: candidate.packItemType,
          title: candidate.packItemTitle,
          sourceRoute: '',
          added_at: artifacts.exportedAt,
          included: true,
          options: { [candidate.childSection]: true }
        },
        candidate.childSection,
        'included',
        'Included via shared export file.',
        {
          source_record_type: candidate.sourceRecordType,
          source_record_id: candidate.sourceRecordId,
          zip_relative_path: existing.zipRelativePath
        }
      );
      continue;
    }

    try {
      const fetchResult = await withOneRetry(() => fetchCandidateBlob(candidate, options.signal));

      if (fetchResult.sizeBytes > MAX_FULL_EXPORT_FILE_BYTES) {
        recordFailure(failures, {
          candidate,
          failureStage: 'post-fetch-size-check',
          reason: `Fetched file exceeds the per-file limit of ${formatBytes(MAX_FULL_EXPORT_FILE_BYTES)}.`
        }, artifacts.traceabilityRows, artifacts.exportedAt);
        continue;
      }

      if (totalBytes + fetchResult.sizeBytes > MAX_FULL_EXPORT_TOTAL_BYTES) {
        recordFailure(failures, {
          candidate,
          failureStage: 'export-limit',
          reason: `Adding this file would exceed the total export limit of ${formatBytes(MAX_FULL_EXPORT_TOTAL_BYTES)}.`
        }, artifacts.traceabilityRows, artifacts.exportedAt);

        for (let remainingIndex = index + 1; remainingIndex < candidates.length; remainingIndex += 1) {
          const remaining = candidates[remainingIndex];
          recordFailure(failures, {
            candidate: remaining,
            failureStage: 'export-limit',
            reason: `Skipped because the pack had already reached the total export limit of ${formatBytes(MAX_FULL_EXPORT_TOTAL_BYTES)}.`
          }, artifacts.traceabilityRows, artifacts.exportedAt);
        }
        break;
      }

      const safeCategory = sanitizeZipPathSegment(candidate.zipCategoryFolder, candidate.kind);
      const desiredRelativePath = `${candidate.zipRootFolder}/${safeCategory}/${fetchResult.safeFileName}`;
      const zipRelativePath = makeUniqueZipPath(desiredRelativePath, usedZipPaths);

      if (candidate.kind === 'document') {
        evidenceFilesFolder?.file(zipRelativePath.replace('06-Evidence-Files/', ''), fetchResult.data);
      } else {
        imageFilesFolder?.file(zipRelativePath.replace('07-Image-Attachments/', ''), fetchResult.data);
      }

      fetchedBySource.set(candidate.physicalSourceKey, {
        zipRelativePath,
        sizeBytes: fetchResult.sizeBytes
      });

      totalBytes += fetchResult.sizeBytes;
      processedCandidates += 1;
      includedFiles += 1;

      includedRows.push(toIncludedFileRow(candidate, zipRelativePath, fetchResult.sizeBytes, artifacts.exportedAt));
      addTraceabilityRow(
        artifacts.traceabilityRows,
        artifacts.exportedAt,
        {
          id: candidate.packItemId,
          type: candidate.packItemType,
          title: candidate.packItemTitle,
          sourceRoute: '',
          added_at: artifacts.exportedAt,
          included: true,
          options: { [candidate.childSection]: true }
        },
        candidate.childSection,
        'included',
        'Private file included in full export.',
        {
          source_record_type: candidate.sourceRecordType,
          source_record_id: candidate.sourceRecordId,
          zip_relative_path: zipRelativePath
        }
      );
    } catch (error) {
      const reason =
        error instanceof DOMException && error.name === 'AbortError'
          ? 'File fetch was cancelled or timed out.'
          : error instanceof Error
            ? error.message
            : 'Unknown file export failure.';
      recordFailure(failures, {
        candidate,
        failureStage: 'fetch',
        reason
      }, artifacts.traceabilityRows, artifacts.exportedAt);
    }
  }

  if (options.signal?.aborted) {
    await maybeLogExportAuditEvent({
      phase: 'cancelled',
      packName: data.packName,
      packDescription: data.packDescription,
      itemCount: artifacts.includedItems.length,
      candidateCount: totalCandidates,
      includedFileCount: includedFiles,
      failedFileCount: failures.length,
      deferredFileCount: artifacts.deferredRows.length,
      totalBytes
    });
    throw new DOMException('Export cancelled by user.', 'AbortError');
  }

  failures.forEach(failure => failedRows.push(toFailedFileRow(failure, artifacts.exportedAt)));

  updateProgress(options.onProgress, progress, {
    phase: 'building-zip',
    message: 'Building ZIP',
    totalCandidates,
    processedCandidates: totalCandidates,
    includedFiles,
    failedFiles: failures.length,
    deferredFiles: artifacts.deferredRows.length,
    totalBytes
  });

  logsFolder?.file('included-files.csv', rowsToCsv(includedRows));
  logsFolder?.file('failed-files.csv', rowsToCsv(failedRows));

  writeMetadataZipIndexes(
    artifacts,
    [
      `LUMÉN Evidence Pack Export`,
      ``,
      `Pack: ${data.packName}`,
      `Organisation: ${data.organisationName}`,
      `Exported: ${artifacts.exportedAt}`,
      ``,
      `This is a full private-file export for local testing only.`,
      `Only currently selected, permitted and accessible private files are included.`,
      `Missing or inaccessible files are recorded in failed-files.csv.`,
      `No signed URLs, public URLs or raw storage paths are included in this ZIP.`,
      `This export does not certify compliance and does not replace professional judgement.`,
      ``,
      `Included files: ${includedFiles}`,
      `Failed files: ${failures.length}`,
      `Deferred files: ${artifacts.deferredRows.length}`,
      `Total exported bytes: ${totalBytes}`
    ].join('\n'),
    [
      `Export limitations`,
      ``,
      `- No signed URLs are included.`,
      `- No public URLs are generated.`,
      `- No raw storage paths are included.`,
      `- Full export uses temporary in-memory file access only.`,
      `- Current hard limits: ${MAX_FULL_EXPORT_FILES} files, ${formatBytes(MAX_FULL_EXPORT_TOTAL_BYTES)} total, ${formatBytes(MAX_FULL_EXPORT_FILE_BYTES)} per file.`,
      `- Production use still requires hosted Supabase storage/RLS verification.`
    ].join('\n')
  );

  const blob = await artifacts.zip.generateAsync({ type: 'blob' });

  await maybeLogExportAuditEvent({
    phase: 'completed',
    packName: data.packName,
    packDescription: data.packDescription,
    itemCount: artifacts.includedItems.length,
    candidateCount: totalCandidates,
    includedFileCount: includedFiles,
    failedFileCount: failures.length,
    deferredFileCount: artifacts.deferredRows.length,
    totalBytes
  });

  updateProgress(options.onProgress, progress, {
    phase: 'complete',
    message: 'Export complete',
    totalCandidates,
    processedCandidates: totalCandidates,
    includedFiles,
    failedFiles: failures.length,
    deferredFiles: artifacts.deferredRows.length,
    totalBytes
  });

  return {
    blob,
    filename: `${artifacts.rootFolderName}.zip`,
    rootFolderName: artifacts.rootFolderName,
    includedCount: artifacts.includedItems.length,
    includedFileCount: includedFiles,
    failedFileCount: failures.length,
    deferredFileCount: artifacts.deferredRows.length,
    totalBytes
  };
};

export const FULL_PACK_EXPORT_LIMITS = {
  maxFiles: MAX_FULL_EXPORT_FILES,
  maxTotalBytes: MAX_FULL_EXPORT_TOTAL_BYTES,
  warningFiles: WARN_FULL_EXPORT_FILES,
  warningTotalBytes: WARN_FULL_EXPORT_TOTAL_BYTES,
  maxFileBytes: MAX_FULL_EXPORT_FILE_BYTES,
  signedUrlTtlSeconds: FULL_EXPORT_SIGNED_URL_TTL_SECONDS
};
