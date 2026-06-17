import JSZip from 'jszip';
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
  EvidenceDocument,
  Person,
  RecordImageAttachment,
  Requirement,
  RequirementDocument,
  RequirementEvidenceCriterion,
  RequirementEvidenceCriterionMatch,
  RequirementAction,
  Review,
  CompetencyRecord,
  CompetencyRecordDocument,
  CompetencyType
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

type ChildSectionStatus = 'included' | 'excluded' | 'deferred' | 'unavailable';

interface TraceabilityRow extends ExportRow {
  pack_item_id: string;
  item_type: string;
  item_title: string;
  source_module: string;
  source_entity_id: string;
  parent_item_id: string;
  child_section_name: string;
  child_section_included: string;
  child_section_status: ChildSectionStatus;
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

const FILE_EXPORT_DEFERRED_REASON =
  'Private file export deferred until signed URL/private file export hardening is complete.';

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

const safeDocumentMetadata = (document: EvidenceDocument) => ({
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
  file_included: false,
  file_export_status: 'deferred'
});

const safeImageMetadata = (attachment: RecordImageAttachment) => ({
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
  file_included: false,
  file_export_status: 'deferred'
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

const addTraceabilityRow = (
  rows: TraceabilityRow[],
  exportedAt: string,
  item: PackDraftItem,
  childSectionName: string,
  status: ChildSectionStatus,
  note: string
) => {
  rows.push({
    pack_item_id: `${item.type}:${item.id}`,
    item_type: item.type,
    item_title: item.title,
    source_module: sourceModuleFromRoute(item.sourceRoute),
    source_entity_id: item.id,
    parent_item_id: `${item.type}:${item.id}`,
    child_section_name: childSectionName,
    child_section_included: item.options[childSectionName] === undefined ? '' : String(Boolean(item.options[childSectionName])),
    child_section_status: status,
    export_timestamp: exportedAt,
    note
  });
};

const addDeferredRow = (rows: DeferredFileRow[], item: PackDraftItem) => {
  rows.push({
    pack_item_id: `${item.type}:${item.id}`,
    item_type: item.type,
    item_title: item.title,
    child_section: 'files',
    reason: FILE_EXPORT_DEFERRED_REASON,
    status: 'deferred'
  });
};

export const buildEvidencePackMetadataZip = async (data: ExportContextData) => {
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
    export_scope: 'metadata-only',
    total_draft_items: data.items.length,
    included_items: includedItems.length,
    excluded_items: data.items.length - includedItems.length,
    counts_by_type: countsByType,
    security: {
      includes_private_files: false,
      includes_signed_urls: false,
      includes_public_urls: false,
      includes_raw_storage_paths: false,
      full_private_file_export_deferred: true
    }
  };

  const packSummaryCsv: ExportRow[] = [{
    pack_name: data.packName,
    organisation_name: data.organisationName,
    exported_by: data.exportedBy,
    exported_at: exportedAt,
    export_scope: 'metadata-only',
    total_draft_items: data.items.length,
    included_items: includedItems.length,
    excluded_items: data.items.length - includedItems.length,
    requirements: countsByType.requirement,
    people: countsByType.person,
    assets: countsByType.asset,
    evidence: countsByType.evidence,
    actions: countsByType.action,
    includes_private_files: 'no',
    private_file_export: 'deferred'
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
      status: key === 'includeFiles' ? 'deferred' : enabled ? 'included' : 'excluded'
    }))
  }));

  const indexFolder = rootFolder.folder('00-Pack-Index');
  const requirementsFolder = rootFolder.folder('01-Requirements');
  const peopleFolder = rootFolder.folder('02-People');
  const assetsFolder = rootFolder.folder('03-Assets');
  const actionsFolder = rootFolder.folder('04-Actions');
  const evidenceFolder = rootFolder.folder('05-Evidence-Metadata');
  const logsFolder = rootFolder.folder('99-Export-Logs');

  for (const item of includedItems) {
    addDeferredRow(deferredRows, item);

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
        .map(safeImageMetadata);

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
                documents: linkedRequirementDocs.map(safeDocumentMetadata),
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
          files: { status: 'deferred', note: FILE_EXPORT_DEFERRED_REASON }
        }
      };

      const folder = requirementsFolder?.folder(itemFolderName(item.title, item.id));
      folder?.file('requirement-summary.json', asJson(requirementSummary));

      for (const [optionKey, enabled] of Object.entries(item.options)) {
        const sectionName = optionLabels[optionKey] || optionKey;
        const status: ChildSectionStatus = optionKey === 'includeFiles' ? 'deferred' : enabled ? 'included' : 'excluded';
        const note = optionKey === 'includeFiles'
          ? 'Private file export is deferred for security review. No evidence files are included in this metadata ZIP.'
          : '';
        addTraceabilityRow(traceabilityRows, exportedAt, item, optionKey, status, note || `${sectionName} ${status}.`);
      }
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
        .map(safeImageMetadata);

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
            ? { status: 'included', documents: personDocuments.map(safeDocumentMetadata) }
            : { status: 'excluded' },
          images_metadata: item.options.includeImages
            ? { status: 'included', images: personImages }
            : { status: 'excluded' },
          linked_actions: item.options.includeActions
            ? { status: 'included', actions: personActions.map(safeActionSummary) }
            : { status: 'excluded' },
          files: { status: 'deferred', note: FILE_EXPORT_DEFERRED_REASON }
        }
      };

      const folder = peopleFolder?.folder(itemFolderName(item.title, item.id));
      folder?.file('person-summary.json', asJson(personSummary));

      for (const [optionKey, enabled] of Object.entries(item.options)) {
        const status: ChildSectionStatus = optionKey === 'includeFiles' ? 'deferred' : enabled ? 'included' : 'excluded';
        addTraceabilityRow(
          traceabilityRows,
          exportedAt,
          item,
          optionKey,
          status,
          optionKey === 'includeFiles'
            ? 'Private file export is deferred for security review. No evidence files are included in this metadata ZIP.'
            : `${optionLabels[optionKey] || optionKey} ${status}.`
        );
      }
    }

    if (item.type === 'asset') {
      const asset = data.assets.find(entry => entry.id === item.id);
      const assignments = data.assetCheckAssignments.filter(assignment => assignment.asset_id === item.id);
      const linkedActions = data.actions.filter(action =>
        data.actionObjectLinks.some(link => link.action_id === action.id && link.object_type === 'asset' && link.object_id === item.id)
      );
      const assetImages = data.imageAttachments.filter(attachment => attachment.entity_type === 'asset' && attachment.entity_id === item.id);
      const primaryImage = assetImages.find(image => image.image_role === 'primary') || null;
      const galleryImages = assetImages.filter(image => image.image_role !== 'primary');

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
            ? { status: 'included', image: primaryImage ? safeImageMetadata(primaryImage) : null }
            : { status: 'excluded' },
          gallery_metadata: item.options.includeGallery
            ? { status: 'included', images: galleryImages.map(safeImageMetadata) }
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
          files: { status: 'deferred', note: FILE_EXPORT_DEFERRED_REASON }
        }
      };

      const folder = assetsFolder?.folder(itemFolderName(item.title, item.id));
      folder?.file('asset-summary.json', asJson(assetSummary));

      for (const [optionKey, enabled] of Object.entries(item.options)) {
        const status: ChildSectionStatus = optionKey === 'includeFiles' ? 'deferred' : enabled ? 'included' : 'excluded';
        addTraceabilityRow(
          traceabilityRows,
          exportedAt,
          item,
          optionKey,
          status,
          optionKey === 'includeFiles'
            ? 'Private file export is deferred for security review. No evidence files are included in this metadata ZIP.'
            : `${optionLabels[optionKey] || optionKey} ${status}.`
        );
      }
    }

    if (item.type === 'action') {
      const action = data.actions.find(entry => entry.id === item.id);
      const actionEvidence = data.actionDocuments
        .filter(link => link.action_id === item.id)
        .map(link => data.documents.find(document => document.id === link.document_id))
        .filter((document): document is EvidenceDocument => Boolean(document));
      const actionImages = data.imageAttachments
        .filter(attachment => attachment.entity_type === 'action' && attachment.entity_id === item.id)
        .map(safeImageMetadata);
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
            ? { status: 'included', documents: actionEvidence.map(safeDocumentMetadata) }
            : { status: 'excluded' },
          images_metadata: item.options.includeImages
            ? { status: 'included', images: actionImages }
            : { status: 'excluded' },
          notes_updates: item.options.includeNotes
            ? { status: 'included', updates }
            : { status: 'excluded' },
          files: { status: 'deferred', note: FILE_EXPORT_DEFERRED_REASON }
        }
      };

      const folder = actionsFolder?.folder(itemFolderName(item.title, item.id));
      folder?.file('action-summary.json', asJson(actionSummary));

      for (const [optionKey, enabled] of Object.entries(item.options)) {
        const status: ChildSectionStatus = optionKey === 'includeFiles' ? 'deferred' : enabled ? 'included' : 'excluded';
        addTraceabilityRow(
          traceabilityRows,
          exportedAt,
          item,
          optionKey,
          status,
          optionKey === 'includeFiles'
            ? 'Private file export is deferred for security review. No evidence files are included in this metadata ZIP.'
            : `${optionLabels[optionKey] || optionKey} ${status}.`
        );
      }
    }

    if (item.type === 'evidence') {
      const document = data.documents.find(entry => entry.id === item.id);
      const linkedRequirementIds = data.requirementDocuments.filter(link => link.document_id === item.id).map(link => link.requirement_id);
      const linkedCompetencyRecordIds = data.competencyRecordDocuments.filter(link => link.document_id === item.id).map(link => link.competency_record_id);
      const linkedActionIds = data.actionDocuments.filter(link => link.document_id === item.id).map(link => link.action_id);
      const linkedAssetCheckIds = data.assetCheckEvidenceLinks.filter(link => link.document_id === item.id).map(link => link.asset_check_assignment_id || link.asset_check_record_id || '');

      const evidenceSummary = {
        pack_item: {
          id: item.id,
          title: item.title,
          source_module: sourceModuleFromRoute(item.sourceRoute)
        },
        evidence_document: document
          ? safeDocumentMetadata(document)
          : { unavailable: true, note: 'Evidence document not found in current local state.' },
        child_sections: {
          document_metadata: item.options.includeMetadata
            ? { status: 'included', data: document ? safeDocumentMetadata(document) : null }
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
                competency_records: linkedCompetencyRecordIds.map(id => data.competencyRecords.find(entry => entry.id === id)).filter(Boolean).map(record => {
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
                asset_checks: linkedAssetCheckIds.filter(Boolean)
              }
            : { status: 'excluded' },
          files: { status: 'deferred', note: FILE_EXPORT_DEFERRED_REASON }
        }
      };

      const folder = evidenceFolder?.folder(itemFolderName(item.title, item.id));
      folder?.file('evidence-metadata.json', asJson(evidenceSummary));

      for (const [optionKey, enabled] of Object.entries(item.options)) {
        const status: ChildSectionStatus = optionKey === 'includeFiles' ? 'deferred' : enabled ? 'included' : 'excluded';
        addTraceabilityRow(
          traceabilityRows,
          exportedAt,
          item,
          optionKey,
          status,
          optionKey === 'includeFiles'
            ? 'Private file export is deferred for security review. No evidence files are included in this metadata ZIP.'
            : `${optionLabels[optionKey] || optionKey} ${status}.`
        );
      }
    }
  }

  indexFolder?.file('pack-summary.json', asJson(packSummary));
  indexFolder?.file('pack-summary.csv', rowsToCsv(packSummaryCsv));
  indexFolder?.file('included-items.json', asJson(safeIncludedItems));
  indexFolder?.file('traceability-map.csv', rowsToCsv(traceabilityRows));
  indexFolder?.file(
    'export-notes.txt',
    [
      `LUMÉN Evidence Pack Export`,
      ``,
      `Pack: ${data.packName}`,
      `Organisation: ${data.organisationName}`,
      `Exported: ${exportedAt}`,
      ``,
      `This is a metadata-only export.`,
      `No private evidence files or image files are included.`,
      `Private file export is deferred.`,
      `This ZIP is intended for review of structure, selection, metadata and traceability.`,
      `It does not certify compliance and does not replace professional judgement.`
    ].join('\n')
  );

  logsFolder?.file('deferred-files.csv', rowsToCsv(deferredRows));
  logsFolder?.file(
    'export-limitations.txt',
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

  const blob = await zip.generateAsync({ type: 'blob' });
  return {
    blob,
    filename: `${root}.zip`,
    rootFolderName: root,
    includedCount: includedItems.length
  };
};
