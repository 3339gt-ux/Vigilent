import { supabase, isSupabaseConfigured } from './supabaseClient';
import { evidenceStorageBucket, isDemoMode, requireDemoMode, requireProductionEnv, signedUrlTtlSeconds } from './env';
import { throwSupabaseError } from './supabaseDiagnostics';
import {
  buildEvidenceStoragePath,
  calculateEvidenceFileHash,
  sanitizeEvidenceFilename,
  validateEvidenceFile
} from './evidenceStorage';
import {
  Profile,
  Organization,
  ComplianceRequirement,
  EvidenceDocument,
  EvidenceUploadInput,
  Requirement,
  RequirementAction,
  RequirementCompetencyType,
  RequirementDocument,
  RequirementEvidenceCriterion,
  RequirementEvidenceCriterionMatch,
  RequirementEvidenceType,
  Review,
  Action,
  ActionDocument,
  ActionObjectLink,
  ActionStatus,
  ActionUpdate,
  ActionUpdateType,
  CompetencyRecord,
  CompetencyRecordDocument,
  CompetencyTemplateItem,
  CompetencyType,
  MatrixCell,
  AuditPack,
  AuditLog,
  AuditTrailEvent,
  WorkspaceNotification,
  Person,
  ManagedCategory,
  CellStatus,
  DocumentStatus,
  SavedReport,
  Asset,
  AssetCategory,
  AssetCheckType,
  AssetCheckAssignment,
  AssetCheckRecord,
  AssetCheckEvidenceLink,
  AssetRequirementLink,
  AssetHistoryEvent
} from './types';
import { calculateCompetencyStatus } from './competencyEngine';

// Pre-seeded mock data
export const MOCK_ORG: Organization = {
  id: 'org-apex-101',
  name: 'Apex Logistics Ltd',
  compliance_profile: 'Transport & Warehousing',
  industry: 'Transport & Warehousing',
  country: 'Ireland',
  created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString()
};

export const MOCK_PROFILE: Profile = {
  id: 'usr-jane-doe',
  organization_id: 'org-apex-101',
  full_name: 'Jane Doe',
  role: 'Admin',
  created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString()
};

const MOCK_WORKSPACE_NOTIFICATIONS: WorkspaceNotification[] = [
  {
    id: 'notif-demo-action',
    organisation_id: MOCK_ORG.id,
    recipient_user_id: MOCK_PROFILE.id,
    recipient_role: null,
    actor_user_id: null,
    title: 'Welcome to Vygilence notifications',
    body: 'Workspace updates, action changes and evidence link activity will appear here.',
    type: 'system',
    severity: 'info',
    entity_type: null,
    entity_id: null,
    entity_label: null,
    action_url: '/dashboard',
    metadata: { source: 'demo_seed' },
    read_at: null,
    created_at: new Date().toISOString()
  }
];

const MOCK_REQUIREMENTS: ComplianceRequirement[] = [
  {
    id: 'req-hgv-mot',
    organization_id: 'org-apex-101',
    title: 'HGV MOT & Safety Inspection',
    description: 'Statutory 12-month vehicle safety testing certificate for heavy goods vehicles.',
    category: 'Vehicle',
    frequency_months: 12,
    is_mandatory: true,
    created_at: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'req-cpc',
    organization_id: 'org-apex-101',
    title: 'Driver CPC Qualification Card',
    description: 'Driver Certificate of Professional Competence required for professional driving.',
    category: 'Driver',
    frequency_months: 60,
    is_mandatory: true,
    created_at: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'req-olicence',
    organization_id: 'org-apex-101',
    title: 'Operator Licence (O-Licence)',
    description: 'National/International operator licence authorizing goods vehicle transport.',
    category: 'General',
    frequency_months: 60,
    is_mandatory: true,
    created_at: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'req-loler',
    organization_id: 'org-apex-101',
    title: 'LOLER Forklift Certificate',
    description: 'Lifting Operations and Lifting Equipment Regulations certificate for warehouse machinery.',
    category: 'Facility',
    frequency_months: 12,
    is_mandatory: true,
    created_at: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'req-insurance',
    organization_id: 'org-apex-101',
    title: 'Goods In Transit Insurance',
    description: 'Public liability and comprehensive logistics transit coverage validation.',
    category: 'General',
    frequency_months: 12,
    is_mandatory: true,
    created_at: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'req-fire-audit',
    organization_id: 'org-apex-101',
    title: 'Warehouse Fire Risk Assessment',
    description: 'Mandatory safety report on storage facilities and assembly areas.',
    category: 'Facility',
    frequency_months: 12,
    is_mandatory: true,
    created_at: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const MOCK_DOCUMENTS: EvidenceDocument[] = [
  {
    id: 'doc-mot-998',
    organization_id: 'org-apex-101',
    uploaded_by: 'usr-jane-doe',
    title: 'MOT Test Cert - HGV-998',
    file_url: null,
    file_name: 'mot_hgv_998_2026.pdf',
    file_size_bytes: 1450000,
    category: 'Vehicle',
    status: 'Active',
    expiry_date: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 8 months out
    issue_date: new Date(Date.now() - 125 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    metadata: { vehicle_reg: 'HGV-998', garage: 'Apex Logistics Garage' },
    created_at: new Date(Date.now() - 125 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 125 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'doc-cpc-jane',
    organization_id: 'org-apex-101',
    uploaded_by: 'usr-jane-doe',
    title: 'Driver CPC Card - Jane Doe',
    file_url: null,
    file_name: 'cpc_jane_doe_expires_2028.pdf',
    file_size_bytes: 840000,
    category: 'Driver',
    status: 'Active',
    expiry_date: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 years out
    issue_date: new Date(Date.now() - 1000 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    metadata: { driver_license_no: 'JDOE998127391' },
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'doc-olicence-annex',
    organization_id: 'org-apex-101',
    uploaded_by: 'usr-jane-doe',
    title: 'Operator Licence - Annex 2',
    file_url: null,
    file_name: 'operator_licence_annex2.pdf',
    file_size_bytes: 4200000,
    category: 'General',
    status: 'Expiring Soon',
    expiry_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 20 days out
    issue_date: new Date(Date.now() - 1800 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    metadata: { licence_no: 'OF-1002931-B' },
    created_at: new Date(Date.now() - 360 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 360 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'doc-loler-flt3',
    organization_id: 'org-apex-101',
    uploaded_by: 'usr-jane-doe',
    title: 'LOLER Cert - Forklift #03',
    file_url: null,
    file_name: 'loler_forklift_flt3_expired.pdf',
    file_size_bytes: 1890000,
    category: 'Facility',
    status: 'Expired',
    expiry_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Expired 15 days ago
    issue_date: new Date(Date.now() - 380 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    metadata: { machinery_id: 'FLT-03', auditor_agency: 'SafeLift Certifiers' },
    created_at: new Date(Date.now() - 380 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'doc-insurance-2026',
    organization_id: 'org-apex-101',
    uploaded_by: 'usr-jane-doe',
    title: 'Goods In Transit Policy 2026',
    file_url: null,
    file_name: 'goods_transit_insurance_signed.pdf',
    file_size_bytes: 3100000,
    category: 'General',
    status: 'Active',
    expiry_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months out
    issue_date: new Date(Date.now() - 185 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    metadata: { insurer: 'Zurich Cargo UK', policy_ref: 'GIT-7761-0028' },
    created_at: new Date(Date.now() - 185 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 185 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'doc-unclassified-fire',
    organization_id: 'org-apex-101',
    uploaded_by: 'usr-jane-doe',
    title: 'Fire Exit Log & Drill Sheet',
    file_url: null,
    file_name: 'fire_exit_log_raw.png',
    file_size_bytes: 870000,
    category: 'Facility',
    status: 'Unclassified',
    expiry_date: null,
    issue_date: null,
    metadata: {},
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const MOCK_CELLS: MatrixCell[] = [
  {
    id: 'cell-1',
    organization_id: 'org-apex-101',
    requirement_id: 'req-hgv-mot',
    target_name: 'HGV Truck - HGV-998',
    target_type: 'Vehicle',
    document_id: 'doc-mot-998',
    status: 'Compliant',
    last_checked_at: new Date().toISOString()
  },
  {
    id: 'cell-2',
    organization_id: 'org-apex-101',
    requirement_id: 'req-hgv-mot',
    target_name: 'HGV Truck - HGV-204',
    target_type: 'Vehicle',
    document_id: null,
    status: 'Missing',
    last_checked_at: new Date().toISOString()
  },
  {
    id: 'cell-3',
    organization_id: 'org-apex-101',
    requirement_id: 'req-cpc',
    target_name: 'Driver - Jane Doe',
    target_type: 'Personnel',
    document_id: 'doc-cpc-jane',
    status: 'Compliant',
    last_checked_at: new Date().toISOString()
  },
  {
    id: 'cell-4',
    organization_id: 'org-apex-101',
    requirement_id: 'req-cpc',
    target_name: 'Driver - Marcus Vance',
    target_type: 'Personnel',
    document_id: null,
    status: 'Missing',
    last_checked_at: new Date().toISOString()
  },
  {
    id: 'cell-5',
    organization_id: 'org-apex-101',
    requirement_id: 'req-olicence',
    target_name: 'Apex HQ & Operations',
    target_type: 'Facility',
    document_id: 'doc-olicence-annex',
    status: 'Expiring Soon',
    last_checked_at: new Date().toISOString()
  },
  {
    id: 'cell-6',
    organization_id: 'org-apex-101',
    requirement_id: 'req-loler',
    target_name: 'FLT Forklift #03',
    target_type: 'Vehicle',
    document_id: 'doc-loler-flt3',
    status: 'Expired',
    last_checked_at: new Date().toISOString()
  },
  {
    id: 'cell-7',
    organization_id: 'org-apex-101',
    requirement_id: 'req-insurance',
    target_name: 'Apex HQ & Operations',
    target_type: 'Facility',
    document_id: 'doc-insurance-2026',
    status: 'Compliant',
    last_checked_at: new Date().toISOString()
  },
  {
    id: 'cell-8',
    organization_id: 'org-apex-101',
    requirement_id: 'req-fire-audit',
    target_name: 'Apex HQ & Operations',
    target_type: 'Facility',
    document_id: null,
    status: 'Missing',
    last_checked_at: new Date().toISOString()
  }
];

const MOCK_AUDIT_PACKS: AuditPack[] = [
  {
    id: 'pack-q2-readiness',
    organization_id: 'org-apex-101',
    created_by: 'usr-jane-doe',
    name: 'Q2 Fleet Readiness Audit Pack',
    description: 'Compiled documentation bundle for driver certifications, core operator license compliance, and vehicle testing policies.',
    status: 'Ready',
    share_token: null,
    share_expires_at: null,
    pin_code: null,
    requirements: ['fw-req-forklift-training', 'fw-req-vehicle-insurance'],
    documents: ['doc-mot-998', 'doc-cpc-jane', 'doc-insurance-2026'],
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

const MOCK_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    organization_id: 'org-apex-101',
    profile_id: 'usr-jane-doe',
    action: 'Document Uploaded',
    details: 'Jane Doe uploaded "MOT Test Cert - HGV-998" for vehicle compliance.',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'log-2',
    organization_id: 'org-apex-101',
    profile_id: 'usr-jane-doe',
    action: 'Audit Pack Share Link Created',
    details: 'Shared "Q2 Fleet Readiness Audit Pack" with external auditors with PIN security enabled.',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'log-3',
    organization_id: 'org-apex-101',
    profile_id: 'usr-jane-doe',
    action: 'LOLER Check Expired',
    details: 'System flagged Forklift #03 LOLER certification as expired.',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const MOCK_AUDIT_TRAIL_EVENTS: AuditTrailEvent[] = [
  {
    id: 'evt-1',
    organization_id: 'org-apex-101',
    actor_user_id: 'usr-jane-doe',
    actor_name: 'Jane Doe',
    actor_email: 'jane.doe@apexlogistics.com',
    actor_role: 'Admin',
    action_type: 'evidence_uploaded',
    action_category: 'Evidence',
    entity_type: 'evidence_document',
    entity_id: 'doc-mot-998',
    entity_label: 'MOT Test Cert - HGV-998',
    description: 'Uploaded evidence document "MOT Test Cert - HGV-998"',
    before_snapshot: null,
    after_snapshot: { id: 'doc-mot-998', title: 'MOT Test Cert - HGV-998', category: 'Vehicle', status: 'Active' },
    changed_fields: null,
    metadata: { vehicle_reg: 'HGV-998' },
    undo_available: false,
    undo_action_type: null,
    undo_expires_at: null,
    undone_at: null,
    undone_by: null,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    severity: 'info',
    source: 'app'
  },
  {
    id: 'evt-2',
    organization_id: 'org-apex-101',
    actor_user_id: 'usr-jane-doe',
    actor_name: 'Jane Doe',
    actor_email: 'jane.doe@apexlogistics.com',
    actor_role: 'Admin',
    action_type: 'audit_pack_created',
    action_category: 'Audit Packs',
    entity_type: 'audit_pack',
    entity_id: 'pack-q2-readiness',
    entity_label: 'Q2 Fleet Readiness Audit Pack',
    description: 'Created audit pack "Q2 Fleet Readiness Audit Pack"',
    before_snapshot: null,
    after_snapshot: { id: 'pack-q2-readiness', name: 'Q2 Fleet Readiness Audit Pack', status: 'Draft' },
    changed_fields: null,
    metadata: {},
    undo_available: true,
    undo_action_type: 'restore_audit_pack',
    undo_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    undone_at: null,
    undone_by: null,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    severity: 'info',
    source: 'app'
  },
  {
    id: 'evt-3',
    organization_id: 'org-apex-101',
    actor_user_id: 'usr-jane-doe',
    actor_name: 'Jane Doe',
    actor_email: 'jane.doe@apexlogistics.com',
    actor_role: 'Admin',
    action_type: 'requirement_edited',
    action_category: 'Requirements',
    entity_type: 'requirement',
    entity_id: 'fw-req-forklift-training',
    entity_label: 'Forklift Training',
    description: 'Modified risk level to High on requirement "Forklift Training"',
    before_snapshot: { id: 'fw-req-forklift-training', title: 'Forklift Training', risk_level: 'Medium' },
    after_snapshot: { id: 'fw-req-forklift-training', title: 'Forklift Training', risk_level: 'High' },
    changed_fields: { risk_level: 'High' },
    metadata: {},
    undo_available: false,
    undo_action_type: null,
    undo_expires_at: null,
    undone_at: null,
    undone_by: null,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    severity: 'info',
    source: 'app'
  }
];

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

const MOCK_FRAMEWORK_REQUIREMENTS: Requirement[] = [
  {
    id: 'fw-req-forklift-training',
    title: 'Forklift Training',
    description: 'Operators must have current training evidence before operating lifting equipment.',
    owner: 'Operations',
    category: 'Training',
    status: 'GREEN',
    review_frequency: 'Annually',
    review_date: daysFromNow(-45),
    next_due_date: daysFromNow(320),
    risk_level: 'High',
    organisation_id: MOCK_ORG.id,
    created_by: MOCK_PROFILE.id,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'fw-req-fire-training',
    title: 'Fire Training',
    description: 'Personnel must receive periodic fire response training.',
    owner: 'Facilities',
    category: 'Training',
    status: 'AMBER',
    review_frequency: 'Annually',
    review_date: daysFromNow(-320),
    next_due_date: daysFromNow(20),
    risk_level: 'High',
    organisation_id: MOCK_ORG.id,
    created_by: MOCK_PROFILE.id,
    created_at: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'fw-req-pest-control',
    title: 'Pest Control',
    description: 'Site controls must be monitored and recorded on a recurring schedule.',
    owner: 'Facilities',
    category: 'Site Controls',
    status: 'RED',
    review_frequency: 'Monthly',
    review_date: daysFromNow(-45),
    next_due_date: daysFromNow(-10),
    risk_level: 'Medium',
    organisation_id: MOCK_ORG.id,
    created_by: MOCK_PROFILE.id,
    created_at: new Date(Date.now() - 220 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'fw-req-management-review',
    title: 'Management Review',
    description: 'Leadership review records must be maintained and checked at the defined interval.',
    owner: 'Leadership',
    category: 'Governance',
    status: 'GREY',
    review_frequency: 'Quarterly',
    review_date: null,
    next_due_date: null,
    risk_level: 'Medium',
    organisation_id: MOCK_ORG.id,
    created_by: MOCK_PROFILE.id,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'fw-req-vehicle-insurance',
    title: 'Vehicle Insurance',
    description: 'Insurance cover must be evidenced for active vehicle operations.',
    owner: 'Fleet',
    category: 'Assets',
    status: 'GREEN',
    review_frequency: 'Annually',
    review_date: daysFromNow(-185),
    next_due_date: daysFromNow(180),
    risk_level: 'Critical',
    organisation_id: MOCK_ORG.id,
    created_by: MOCK_PROFILE.id,
    created_at: new Date(Date.now() - 185 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

const MOCK_REQUIREMENT_EVIDENCE_TYPES: RequirementEvidenceType[] = [
  {
    id: 'fw-ev-training-cert',
    requirement_id: 'fw-req-forklift-training',
    organisation_id: MOCK_ORG.id,
    name: 'Training Certificate',
    description: 'Certificate or training record showing current competency.',
    created_at: new Date().toISOString()
  },
  {
    id: 'fw-ev-meeting-minutes',
    requirement_id: 'fw-req-management-review',
    organisation_id: MOCK_ORG.id,
    name: 'Meeting Minutes',
    description: 'Minutes or notes showing the review took place.',
    created_at: new Date().toISOString()
  }
];

const MOCK_REQUIREMENT_DOCUMENTS: RequirementDocument[] = [
  {
    id: 'fw-link-forklift-doc',
    requirement_id: 'fw-req-forklift-training',
    document_id: 'doc-loler-flt3',
    organisation_id: MOCK_ORG.id,
    linked_by: MOCK_PROFILE.id,
    created_at: new Date().toISOString()
  },
  {
    id: 'fw-link-insurance-doc',
    requirement_id: 'fw-req-vehicle-insurance',
    document_id: 'doc-insurance-2026',
    organisation_id: MOCK_ORG.id,
    linked_by: MOCK_PROFILE.id,
    created_at: new Date().toISOString()
  }
];

const MOCK_REQUIREMENT_EVIDENCE_CRITERIA: RequirementEvidenceCriterion[] = [
  {
    id: 'crit-forklift-cert',
    organisation_id: MOCK_ORG.id,
    requirement_id: 'fw-req-forklift-training',
    title: 'Valid training certificate',
    description: 'Current certificate or training evidence for the relevant person.',
    evidence_type: 'Training Certificate',
    is_required: true,
    weight: 1,
    minimum_count: 1,
    frequency: 'Annually',
    coverage_period: null,
    validity_required: true,
    created_by: MOCK_PROFILE.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'crit-forklift-competency',
    organisation_id: MOCK_ORG.id,
    requirement_id: 'fw-req-forklift-training',
    title: 'Person competency record',
    description: 'Competency record showing person-level coverage.',
    evidence_type: 'Competency Record',
    is_required: true,
    weight: 1,
    minimum_count: 1,
    frequency: 'Annually',
    coverage_period: null,
    validity_required: true,
    created_by: MOCK_PROFILE.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'crit-insurance-cert',
    organisation_id: MOCK_ORG.id,
    requirement_id: 'fw-req-vehicle-insurance',
    title: 'Valid insurance certificate',
    description: 'Current certificate or policy record for fleet coverage.',
    evidence_type: 'Insurance Certificate',
    is_required: true,
    weight: 1,
    minimum_count: 1,
    frequency: 'Annually',
    coverage_period: null,
    validity_required: true,
    created_by: MOCK_PROFILE.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const MOCK_REQUIREMENT_EVIDENCE_CRITERION_MATCHES: RequirementEvidenceCriterionMatch[] = [
  {
    id: 'crit-match-forklift-cert',
    organisation_id: MOCK_ORG.id,
    criterion_id: 'crit-forklift-cert',
    document_id: 'doc-loler-flt3',
    competency_record_id: null,
    action_id: null,
    match_status: 'Matched',
    matched_by: MOCK_PROFILE.id,
    matched_at: new Date().toISOString(),
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'crit-match-forklift-competency',
    organisation_id: MOCK_ORG.id,
    criterion_id: 'crit-forklift-competency',
    document_id: null,
    competency_record_id: 'comp-rec-john-forklift',
    action_id: null,
    match_status: 'Matched',
    matched_by: MOCK_PROFILE.id,
    matched_at: new Date().toISOString(),
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'crit-match-insurance-cert',
    organisation_id: MOCK_ORG.id,
    criterion_id: 'crit-insurance-cert',
    document_id: 'doc-insurance-2026',
    competency_record_id: null,
    action_id: null,
    match_status: 'Matched',
    matched_by: MOCK_PROFILE.id,
    matched_at: new Date().toISOString(),
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const MOCK_REVIEWS: Review[] = [
  {
    id: 'fw-review-fire',
    requirement_id: 'fw-req-fire-training',
    organisation_id: MOCK_ORG.id,
    reviewed_by: MOCK_PROFILE.id,
    review_date: daysFromNow(-320),
    next_due_date: daysFromNow(20),
    status: 'AMBER',
    notes: 'Next check is due soon.',
    created_at: new Date().toISOString()
  }
];

const MOCK_ACTIONS: Action[] = [
  {
    id: 'fw-action-renew-fire',
    organisation_id: MOCK_ORG.id,
    title: 'Renew Training',
    description: 'Schedule the next training session and attach the record when complete.',
    owner: 'Facilities',
    status: 'Open',
    due_date: daysFromNow(14),
    target_due_date: daysFromNow(14),
    opened_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    opened_by: MOCK_PROFILE.id,
    closed_at: null,
    closed_by: null,
    status_changed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status_changed_by: MOCK_PROFILE.id,
    created_by: MOCK_PROFILE.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const MOCK_REQUIREMENT_ACTIONS: RequirementAction[] = [
  {
    id: 'fw-req-action-fire',
    requirement_id: 'fw-req-fire-training',
    action_id: 'fw-action-renew-fire',
    organisation_id: MOCK_ORG.id,
    created_at: new Date().toISOString()
  }
];

const MOCK_ACTION_UPDATES: ActionUpdate[] = [
  {
    id: 'fw-action-update-open-fire',
    organisation_id: MOCK_ORG.id,
    action_id: 'fw-action-renew-fire',
    user_id: MOCK_PROFILE.id,
    update_type: 'Status Change',
    note: 'Action opened. Previous status: none. New status: Open.',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const MOCK_ACTION_DOCUMENTS: ActionDocument[] = [];

const MOCK_ACTION_OBJECT_LINKS: ActionObjectLink[] = [
  {
    id: 'fw-action-object-fire',
    organisation_id: MOCK_ORG.id,
    action_id: 'fw-action-renew-fire',
    object_type: 'requirement',
    object_id: 'fw-req-fire-training',
    linked_by: MOCK_PROFILE.id,
    linked_at: new Date().toISOString()
  }
];

const MOCK_PEOPLE: Person[] = [
  {
    id: 'person-john-smith',
    organisation_id: MOCK_ORG.id,
    employee_number: 'EMP-1001',
    first_name: 'John',
    last_name: 'Smith',
    display_name: 'John Smith',
    email: 'john.smith@example.com',
    department: 'Warehouse',
    role: 'Forklift Operator',
    person_type: 'Employee',
    start_date: daysFromNow(-900),
    end_date: null,
    active: true,
    notes: 'Primary warehouse operator.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'person-maria-byrne',
    organisation_id: MOCK_ORG.id,
    employee_number: 'DRV-204',
    first_name: 'Maria',
    last_name: 'Byrne',
    display_name: 'Maria Byrne',
    email: 'maria.byrne@example.com',
    department: 'Transport',
    role: 'Driver',
    person_type: 'Driver',
    start_date: daysFromNow(-500),
    end_date: null,
    active: true,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'person-ali-khan',
    organisation_id: MOCK_ORG.id,
    employee_number: 'CON-087',
    first_name: 'Ali',
    last_name: 'Khan',
    display_name: 'Ali Khan',
    email: 'ali.khan@example.com',
    department: 'Facilities',
    role: 'Maintenance Contractor',
    person_type: 'Contractor',
    start_date: daysFromNow(-120),
    end_date: null,
    active: true,
    notes: 'Contractor inducted for site works.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'person-emma-ryan',
    organisation_id: MOCK_ORG.id,
    employee_number: 'TMP-332',
    first_name: 'Emma',
    last_name: 'Ryan',
    display_name: 'Emma Ryan',
    email: null,
    department: 'Quality',
    role: 'Agency Operative',
    person_type: 'Agency',
    start_date: daysFromNow(-45),
    end_date: null,
    active: true,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'person-sarah-lee',
    organisation_id: MOCK_ORG.id,
    employee_number: 'VIS-010',
    first_name: 'Sarah',
    last_name: 'Lee',
    display_name: 'Sarah Lee',
    email: 'sarah.lee@example.com',
    department: 'Security',
    role: 'Consultant',
    person_type: 'Consultant',
    start_date: daysFromNow(-20),
    end_date: null,
    active: true,
    notes: 'External improvement consultant.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const MOCK_COMPETENCY_TYPES: CompetencyType[] = [
  {
    id: 'comp-type-forklift',
    organisation_id: MOCK_ORG.id,
    title: 'Forklift',
    category: 'Equipment & Vehicle',
    description: 'Configurable competency for operating forklift equipment.',
    validity_period_months: 36,
    refresher_period_months: 12,
    evidence_required: true,
    default_risk_level: 'High',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'comp-type-manual-handling',
    organisation_id: MOCK_ORG.id,
    title: 'Manual Handling',
    category: 'Safety',
    description: 'Configurable manual handling competency.',
    validity_period_months: 36,
    refresher_period_months: 12,
    evidence_required: true,
    default_risk_level: 'Medium',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'comp-type-driver-cpc',
    organisation_id: MOCK_ORG.id,
    title: 'Driver CPC',
    category: 'Transport',
    description: 'Configurable driver competency record.',
    validity_period_months: 60,
    refresher_period_months: 12,
    evidence_required: true,
    default_risk_level: 'High',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'comp-type-data-protection',
    organisation_id: MOCK_ORG.id,
    title: 'Data Protection',
    category: 'Security',
    description: 'Configurable information handling competency.',
    validity_period_months: 24,
    refresher_period_months: 12,
    evidence_required: true,
    default_risk_level: 'Medium',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'comp-type-customer-service',
    organisation_id: MOCK_ORG.id,
    title: 'Customer Service',
    category: 'Professional',
    description: 'Configurable professional competency.',
    validity_period_months: null,
    refresher_period_months: 12,
    evidence_required: false,
    default_risk_level: 'Low',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const MOCK_COMPETENCY_RECORDS: CompetencyRecord[] = [
  {
    id: 'comp-rec-john-forklift',
    organisation_id: MOCK_ORG.id,
    person_id: 'person-john-smith',
    competency_type_id: 'comp-type-forklift',
    completed_date: daysFromNow(-180),
    expiry_date: daysFromNow(820),
    trainer: 'Apex Trainer',
    provider: 'Internal',
    certificate_number: 'FLT-JS-2026',
    status: 'Valid',
    notes: 'Practical sign-off complete.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'comp-rec-john-manual',
    organisation_id: MOCK_ORG.id,
    person_id: 'person-john-smith',
    competency_type_id: 'comp-type-manual-handling',
    completed_date: daysFromNow(-700),
    expiry_date: daysFromNow(18),
    trainer: 'Apex Trainer',
    provider: 'Internal',
    certificate_number: 'MH-JS-2024',
    status: 'Expiring Soon',
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'comp-rec-maria-cpc',
    organisation_id: MOCK_ORG.id,
    person_id: 'person-maria-byrne',
    competency_type_id: 'comp-type-driver-cpc',
    completed_date: daysFromNow(-1200),
    expiry_date: daysFromNow(260),
    trainer: null,
    provider: 'External Provider',
    certificate_number: 'CPC-MB-998',
    status: 'Valid',
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'comp-rec-ali-data',
    organisation_id: MOCK_ORG.id,
    person_id: 'person-ali-khan',
    competency_type_id: 'comp-type-data-protection',
    completed_date: daysFromNow(-800),
    expiry_date: daysFromNow(-35),
    trainer: null,
    provider: 'External Provider',
    certificate_number: 'DP-AK-2023',
    status: 'Expired',
    notes: 'Needs refresher before next data-handling task.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'comp-rec-sarah-service',
    organisation_id: MOCK_ORG.id,
    person_id: 'person-sarah-lee',
    competency_type_id: 'comp-type-customer-service',
    completed_date: daysFromNow(-30),
    expiry_date: null,
    trainer: 'Line Manager',
    provider: 'Internal',
    certificate_number: null,
    status: 'Valid',
    notes: 'Consultant onboarding competency.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const MOCK_COMPETENCY_RECORD_DOCUMENTS: CompetencyRecordDocument[] = [
  {
    id: 'comp-doc-john-forklift',
    organisation_id: MOCK_ORG.id,
    competency_record_id: 'comp-rec-john-forklift',
    document_id: 'doc-loler-flt3',
    linked_by: MOCK_PROFILE.id,
    linked_at: new Date().toISOString()
  },
  {
    id: 'comp-doc-maria-cpc',
    organisation_id: MOCK_ORG.id,
    competency_record_id: 'comp-rec-maria-cpc',
    document_id: 'doc-cpc-jane',
    linked_by: MOCK_PROFILE.id,
    linked_at: new Date().toISOString()
  }
];

const MOCK_REQUIREMENT_COMPETENCY_TYPES: RequirementCompetencyType[] = [
  {
    id: 'req-comp-forklift-type',
    organisation_id: MOCK_ORG.id,
    requirement_id: 'fw-req-forklift-training',
    competency_type_id: 'comp-type-forklift',
    linked_by: MOCK_PROFILE.id,
    linked_at: new Date().toISOString()
  },
  {
    id: 'req-comp-manual-type',
    organisation_id: MOCK_ORG.id,
    requirement_id: 'fw-req-forklift-training',
    competency_type_id: 'comp-type-manual-handling',
    linked_by: MOCK_PROFILE.id,
    linked_at: new Date().toISOString()
  }
];

const MOCK_ASSETS: Asset[] = [
  {
    id: 'asset-truck-261',
    organisation_id: MOCK_ORG.id,
    category_id: 'cat-vehicle-tractor',
    asset_number: 'AST-V-01',
    name: 'Scania HGV Truck - Reg: 261-D-998',
    asset_type: 'Vehicle',
    category: 'Heavy Goods Vehicle',
    registration_number: '261-D-998',
    serial_number: 'SCN88172639102',
    make: 'Scania',
    model: 'R450 Streamline',
    location: 'Dublin Depot',
    department: 'Transport',
    owner: 'Marcus Vance',
    status: 'active',
    notes: 'Main fleet transport unit.',
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  },
  {
    id: 'asset-trailer-402',
    organisation_id: MOCK_ORG.id,
    category_id: 'cat-trailer-refrigerated',
    asset_number: 'AST-T-02',
    name: 'Krone Refrigerated Trailer - Ref: T-402',
    asset_type: 'Trailer',
    category: 'Refrigerated Trailer',
    registration_number: '261-D-402',
    serial_number: 'KRN7726381',
    make: 'Krone',
    model: 'Cool Liner',
    location: 'Dublin Depot',
    department: 'Transport',
    owner: 'Marcus Vance',
    status: 'active',
    notes: 'Requires annual refrigeration calibration.',
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  },
  {
    id: 'asset-forklift-03',
    organisation_id: MOCK_ORG.id,
    category_id: 'cat-forklift-electric',
    asset_number: 'AST-E-03',
    name: 'Toyota Electric Forklift - Ref: FLT-03',
    asset_type: 'Equipment',
    category: 'Forklift',
    registration_number: null,
    serial_number: 'TYT1129381',
    make: 'Toyota',
    model: '8FBE15',
    location: 'Warehouse A',
    department: 'Operations',
    owner: 'John Smith',
    status: 'active',
    notes: 'Needs daily driver checklist validation.',
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  },
  {
    id: 'asset-racking-hq',
    organisation_id: MOCK_ORG.id,
    category_id: 'cat-facility-wh1',
    asset_number: 'AST-F-04',
    name: 'Pallet Racking System - HQ Warehouse',
    asset_type: 'Facility',
    category: 'Storage Infrastructure',
    registration_number: null,
    serial_number: 'RCK-HQ-001',
    make: 'Dexion',
    model: 'Speedlock P90',
    location: 'HQ Warehouse',
    department: 'Operations',
    owner: 'Jane Doe',
    status: 'active',
    notes: 'Requires annual professional structural safety inspection.',
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  }
];

const MOCK_ASSET_CATEGORIES: AssetCategory[] = [
  // Parent Facility
  {
    id: 'cat-facility',
    organisation_id: MOCK_ORG.id,
    parent_id: null,
    name: 'Facility',
    description: 'Infrastructure, warehouses, garages and offices.',
    sort_order: 1,
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  },
  {
    id: 'cat-facility-wh1',
    organisation_id: MOCK_ORG.id,
    parent_id: 'cat-facility',
    name: 'Warehouse 1',
    description: 'Main storage warehouse.',
    sort_order: 1,
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  },
  {
    id: 'cat-facility-wh2',
    organisation_id: MOCK_ORG.id,
    parent_id: 'cat-facility',
    name: 'Warehouse 2',
    description: 'Secondary storage warehouse.',
    sort_order: 2,
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  },
  {
    id: 'cat-facility-garage',
    organisation_id: MOCK_ORG.id,
    parent_id: 'cat-facility',
    name: 'Garage',
    description: 'Maintenance garage workshop.',
    sort_order: 3,
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  },
  {
    id: 'cat-facility-offices',
    organisation_id: MOCK_ORG.id,
    parent_id: 'cat-facility',
    name: 'Offices',
    description: 'HQ administration offices.',
    sort_order: 4,
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  },

  // Parent Vehicle
  {
    id: 'cat-vehicle',
    organisation_id: MOCK_ORG.id,
    parent_id: null,
    name: 'Vehicle',
    description: 'Transport fleet vehicles, tractors and vans.',
    sort_order: 2,
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  },
  {
    id: 'cat-vehicle-rigid',
    organisation_id: MOCK_ORG.id,
    parent_id: 'cat-vehicle',
    name: 'Rigid',
    description: 'Rigid trucks.',
    sort_order: 1,
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  },
  {
    id: 'cat-vehicle-tractor',
    organisation_id: MOCK_ORG.id,
    parent_id: 'cat-vehicle',
    name: 'Tractor Unit',
    description: 'Heavy duty road tractor units.',
    sort_order: 2,
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  },
  {
    id: 'cat-vehicle-van',
    organisation_id: MOCK_ORG.id,
    parent_id: 'cat-vehicle',
    name: 'Van',
    description: 'Light commercial delivery vans.',
    sort_order: 3,
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  },

  // Parent Trailer
  {
    id: 'cat-trailer',
    organisation_id: MOCK_ORG.id,
    parent_id: null,
    name: 'Trailer',
    description: 'Haulage trailers, skeletal and refrigerated.',
    sort_order: 3,
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  },
  {
    id: 'cat-trailer-refrigerated',
    organisation_id: MOCK_ORG.id,
    parent_id: 'cat-trailer',
    name: 'Refrigerated',
    description: 'Temperature-controlled trailers.',
    sort_order: 1,
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  },
  {
    id: 'cat-trailer-curtainsider',
    organisation_id: MOCK_ORG.id,
    parent_id: 'cat-trailer',
    name: 'Curtainsider',
    description: 'Curtainsider cargo trailers.',
    sort_order: 2,
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  },
  {
    id: 'cat-trailer-box',
    organisation_id: MOCK_ORG.id,
    parent_id: 'cat-trailer',
    name: 'Box',
    description: 'Secure dry box trailers.',
    sort_order: 3,
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  },
  {
    id: 'cat-trailer-skeletal',
    organisation_id: MOCK_ORG.id,
    parent_id: 'cat-trailer',
    name: 'Skeletal',
    description: 'Container transport skeletal trailers.',
    sort_order: 4,
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  },

  // Parent Forklift
  {
    id: 'cat-forklift',
    organisation_id: MOCK_ORG.id,
    parent_id: null,
    name: 'Forklift',
    description: 'Material handling equipment and lifts.',
    sort_order: 4,
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  },
  {
    id: 'cat-forklift-electric',
    organisation_id: MOCK_ORG.id,
    parent_id: 'cat-forklift',
    name: 'Electric',
    description: 'Electric counterbalanced forklifts.',
    sort_order: 1,
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  },
  {
    id: 'cat-forklift-diesel',
    organisation_id: MOCK_ORG.id,
    parent_id: 'cat-forklift',
    name: 'Diesel',
    description: 'Diesel outdoor yard forklifts.',
    sort_order: 2,
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  },
  {
    id: 'cat-forklift-reach',
    organisation_id: MOCK_ORG.id,
    parent_id: 'cat-forklift',
    name: 'Reach Truck',
    description: 'Narrow aisle reach warehouse trucks.',
    sort_order: 3,
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  },
  {
    id: 'cat-forklift-vna',
    organisation_id: MOCK_ORG.id,
    parent_id: 'cat-forklift',
    name: 'VNA',
    description: 'Very Narrow Aisle high racks man-up lifts.',
    sort_order: 4,
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  }
];

const MOCK_ASSET_CHECK_TYPES: AssetCheckType[] = [
  {
    id: 'check-type-cvrt',
    organisation_id: MOCK_ORG.id,
    title: 'DOE / CVRT Safety Test',
    category: 'Inspection',
    description: 'Statutory 12-month heavy vehicle roadworthiness certification.',
    default_frequency_value: 1,
    default_frequency_unit: 'years',
    default_warning_days: 30,
    evidence_required: true,
    risk_level: 'Critical',
    default_status: 'Missing',
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'check-type-roadtax',
    organisation_id: MOCK_ORG.id,
    title: 'Annual Road Tax',
    category: 'Tax',
    description: 'Commercial motor tax renewal and confirmation.',
    default_frequency_value: 1,
    default_frequency_unit: 'years',
    default_warning_days: 14,
    evidence_required: true,
    risk_level: 'Medium',
    default_status: 'Missing',
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'check-type-calib',
    organisation_id: MOCK_ORG.id,
    title: 'Tachograph Calibration',
    category: 'Calibration',
    description: 'Statutory 2-year calibration and sealing of vehicle tachograph units.',
    default_frequency_value: 2,
    default_frequency_unit: 'years',
    default_warning_days: 60,
    evidence_required: true,
    risk_level: 'High',
    default_status: 'Missing',
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'check-type-fridge',
    organisation_id: MOCK_ORG.id,
    title: 'Refrigeration Calibration',
    category: 'Calibration',
    description: 'Annual temperature sensor and cooling system check for refrigerated units.',
    default_frequency_value: 1,
    default_frequency_unit: 'years',
    default_warning_days: 30,
    evidence_required: true,
    risk_level: 'High',
    default_status: 'Missing',
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'check-type-loler',
    organisation_id: MOCK_ORG.id,
    title: 'Lifting Thorough Examination',
    category: 'Inspection',
    description: 'Statutory lifting accessories and forklift mechanical safety inspection.',
    default_frequency_value: 1,
    default_frequency_unit: 'years',
    default_warning_days: 30,
    evidence_required: true,
    risk_level: 'Critical',
    default_status: 'Missing',
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'check-type-daily',
    organisation_id: MOCK_ORG.id,
    title: 'Operator Daily Checklist',
    category: 'Safety',
    description: 'Daily inspection walkaround checklist verified by operator.',
    default_frequency_value: 1,
    default_frequency_unit: 'days',
    default_warning_days: 0,
    evidence_required: false,
    risk_level: 'Low',
    default_status: 'Missing',
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'check-type-racking',
    organisation_id: MOCK_ORG.id,
    title: 'Racking Safety Audit',
    category: 'Inspection',
    description: 'Professional structural assessment of storage racking systems.',
    default_frequency_value: 1,
    default_frequency_unit: 'years',
    default_warning_days: 30,
    evidence_required: true,
    risk_level: 'High',
    default_status: 'Missing',
    active: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

const MOCK_ASSET_CHECK_ASSIGNMENTS: AssetCheckAssignment[] = [
  {
    id: 'asg-truck-cvrt',
    organisation_id: MOCK_ORG.id,
    asset_id: 'asset-truck-261',
    asset_check_type_id: 'check-type-cvrt',
    required: true,
    frequency_value: 1,
    frequency_unit: 'years',
    warning_days: 30,
    first_due_date: null,
    next_due_date: daysFromNow(240),
    last_completed_date: daysFromNow(-125),
    last_expiry_date: daysFromNow(240),
    status: 'valid',
    notes: 'CVRT check successfully mapped to active document.',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'asg-truck-tax',
    organisation_id: MOCK_ORG.id,
    asset_id: 'asset-truck-261',
    asset_check_type_id: 'check-type-roadtax',
    required: true,
    frequency_value: 1,
    frequency_unit: 'years',
    warning_days: 14,
    first_due_date: null,
    next_due_date: daysFromNow(10),
    last_completed_date: daysFromNow(-355),
    last_expiry_date: daysFromNow(10),
    status: 'due_soon',
    notes: 'Road tax renewal due soon.',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'asg-truck-calib',
    organisation_id: MOCK_ORG.id,
    asset_id: 'asset-truck-261',
    asset_check_type_id: 'check-type-calib',
    required: true,
    frequency_value: 2,
    frequency_unit: 'years',
    warning_days: 60,
    first_due_date: null,
    next_due_date: daysFromNow(-30),
    last_completed_date: daysFromNow(-760),
    last_expiry_date: daysFromNow(-30),
    status: 'expired',
    notes: 'Tachograph calibration expired.',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'asg-trailer-fridge',
    organisation_id: MOCK_ORG.id,
    asset_id: 'asset-trailer-402',
    asset_check_type_id: 'check-type-fridge',
    required: true,
    frequency_value: 1,
    frequency_unit: 'years',
    warning_days: 30,
    first_due_date: null,
    next_due_date: daysFromNow(200),
    last_completed_date: daysFromNow(-165),
    last_expiry_date: daysFromNow(200),
    status: 'valid',
    notes: null,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'asg-forklift-loler',
    organisation_id: MOCK_ORG.id,
    asset_id: 'asset-forklift-03',
    asset_check_type_id: 'check-type-loler',
    required: true,
    frequency_value: 1,
    frequency_unit: 'years',
    warning_days: 30,
    first_due_date: null,
    next_due_date: daysFromNow(-15),
    last_completed_date: daysFromNow(-380),
    last_expiry_date: daysFromNow(-15),
    status: 'overdue',
    notes: 'Thorough examination past due date.',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'asg-forklift-daily',
    organisation_id: MOCK_ORG.id,
    asset_id: 'asset-forklift-03',
    asset_check_type_id: 'check-type-daily',
    required: true,
    frequency_value: 1,
    frequency_unit: 'days',
    warning_days: 0,
    first_due_date: null,
    next_due_date: daysFromNow(1),
    last_completed_date: daysFromNow(0),
    last_expiry_date: daysFromNow(1),
    status: 'valid',
    notes: 'No evidence upload required for daily checks.',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'asg-racking-audit',
    organisation_id: MOCK_ORG.id,
    asset_id: 'asset-racking-hq',
    asset_check_type_id: 'check-type-racking',
    required: true,
    frequency_value: 1,
    frequency_unit: 'years',
    warning_days: 30,
    first_due_date: daysFromNow(-10),
    next_due_date: daysFromNow(-10),
    last_completed_date: null,
    last_expiry_date: null,
    status: 'missing',
    notes: 'Required check with no completed records or linked evidence.',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const MOCK_ASSET_CHECK_RECORDS: AssetCheckRecord[] = [
  {
    id: 'rec-truck-cvrt-2026',
    organisation_id: MOCK_ORG.id,
    asset_id: 'asset-truck-261',
    asset_check_assignment_id: 'asg-truck-cvrt',
    asset_check_type_id: 'check-type-cvrt',
    completed_at: daysFromNow(-125),
    valid_from: daysFromNow(-125),
    valid_until: daysFromNow(240),
    result_status: 'Pass',
    performed_by: 'Dublin Test Centre',
    reference: 'CVRT-Dublin-998',
    notes: 'Vehicle in excellent condition, brake pads replaced.',
    created_at: new Date(Date.now() - 125 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 125 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'rec-truck-tax-2025',
    organisation_id: MOCK_ORG.id,
    asset_id: 'asset-truck-261',
    asset_check_assignment_id: 'asg-truck-tax',
    asset_check_type_id: 'check-type-roadtax',
    completed_at: daysFromNow(-355),
    valid_from: daysFromNow(-355),
    valid_until: daysFromNow(10),
    result_status: 'Taxed',
    performed_by: 'Motortax.ie Online',
    reference: 'TAX-881766',
    notes: 'Paid standard annual commercial rate.',
    created_at: new Date(Date.now() - 355 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 355 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'rec-truck-calib-2024',
    organisation_id: MOCK_ORG.id,
    asset_id: 'asset-truck-261',
    asset_check_assignment_id: 'asg-truck-calib',
    asset_check_type_id: 'check-type-calib',
    completed_at: daysFromNow(-760),
    valid_from: daysFromNow(-760),
    valid_until: daysFromNow(-30),
    result_status: 'Calibrated',
    performed_by: 'Tacho Calibration Services Ltd',
    reference: 'CAL-T-8827',
    notes: 'Calibration sealed, next due in 24 months.',
    created_at: new Date(Date.now() - 760 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 760 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'rec-trailer-fridge-2025',
    organisation_id: MOCK_ORG.id,
    asset_id: 'asset-trailer-402',
    asset_check_assignment_id: 'asg-trailer-fridge',
    asset_check_type_id: 'check-type-fridge',
    completed_at: daysFromNow(-165),
    valid_from: daysFromNow(-165),
    valid_until: daysFromNow(200),
    result_status: 'Certified',
    performed_by: 'ThermoKing Service Centre',
    reference: 'TK-REFR-4412',
    notes: 'Refrigeration temperature variance within limit.',
    created_at: new Date(Date.now() - 165 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 165 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'rec-forklift-loler-2025',
    organisation_id: MOCK_ORG.id,
    asset_id: 'asset-forklift-03',
    asset_check_assignment_id: 'asg-forklift-loler',
    asset_check_type_id: 'check-type-loler',
    completed_at: daysFromNow(-380),
    valid_from: daysFromNow(-380),
    valid_until: daysFromNow(-15),
    result_status: 'Defects Resolved',
    performed_by: 'Apex Materials Handling',
    reference: 'LOLER-FLT3-2025',
    notes: 'Lifting chains replaced and certified.',
    created_at: new Date(Date.now() - 380 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 380 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'rec-forklift-daily-today',
    organisation_id: MOCK_ORG.id,
    asset_id: 'asset-forklift-03',
    asset_check_assignment_id: 'asg-forklift-daily',
    asset_check_type_id: 'check-type-daily',
    completed_at: daysFromNow(0),
    valid_from: daysFromNow(0),
    valid_until: daysFromNow(1),
    result_status: 'All Checked - Good',
    performed_by: 'John Smith',
    reference: 'CHK-FLT03-DAILY',
    notes: 'Checked and verified clean.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const MOCK_ASSET_CHECK_EVIDENCE_LINKS: AssetCheckEvidenceLink[] = [
  {
    id: 'link-truck-cvrt-doc',
    organisation_id: MOCK_ORG.id,
    asset_id: 'asset-truck-261',
    asset_check_assignment_id: 'asg-truck-cvrt',
    asset_check_record_id: 'rec-truck-cvrt-2026',
    document_id: 'doc-mot-998',
    created_by: MOCK_PROFILE.id,
    created_at: new Date().toISOString()
  },
  {
    id: 'link-forklift-loler-doc',
    organisation_id: MOCK_ORG.id,
    asset_id: 'asset-forklift-03',
    asset_check_assignment_id: 'asg-forklift-loler',
    asset_check_record_id: 'rec-forklift-loler-2025',
    document_id: 'doc-loler-flt3',
    created_by: MOCK_PROFILE.id,
    created_at: new Date().toISOString()
  }
];

const MOCK_ASSET_REQUIREMENT_LINKS: AssetRequirementLink[] = [
  {
    id: 'link-cvrt-req-mot',
    organisation_id: MOCK_ORG.id,
    asset_check_type_id: 'check-type-cvrt',
    requirement_id: 'req-hgv-mot',
    created_at: new Date().toISOString()
  },
  {
    id: 'link-loler-req-loler',
    organisation_id: MOCK_ORG.id,
    asset_check_type_id: 'check-type-loler',
    requirement_id: 'req-loler',
    created_at: new Date().toISOString()
  }
];

const MOCK_ASSET_HISTORY_EVENTS: AssetHistoryEvent[] = [
  {
    id: 'evt-asset-scania-tax',
    organisation_id: MOCK_ORG.id,
    asset_id: 'asset-scania-01',
    asset_check_assignment_id: 'asg-scania-tax',
    asset_check_record_id: 'rec-scania-tax-2025',
    event_type: 'check_completed',
    event_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'Road Tax Checked',
    description: 'Road Tax recorded as complete for Scania R450 (181-D-12345). Expiry 2026-06-30.',
    status: 'Completed',
    cost: null,
    performed_by: MOCK_PROFILE.full_name,
    supplier: null,
    odometer_or_hours: null,
    evidence_document_id: null,
    created_by: MOCK_PROFILE.id,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    archived_at: null
  },
  {
    id: 'evt-asset-scania-tax-asg',
    organisation_id: MOCK_ORG.id,
    asset_id: 'asset-scania-01',
    asset_check_assignment_id: 'asg-scania-tax',
    asset_check_record_id: null,
    event_type: 'general',
    event_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'Road Tax Check Assigned',
    description: 'Road Tax check assigned to Scania R450 (181-D-12345). Warning window: 30 days.',
    status: 'Active',
    cost: null,
    performed_by: MOCK_PROFILE.full_name,
    supplier: null,
    odometer_or_hours: null,
    evidence_document_id: null,
    created_by: MOCK_PROFILE.id,
    created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    archived_at: null
  },
  {
    id: 'evt-asset-forklift-loler',
    organisation_id: MOCK_ORG.id,
    asset_id: 'asset-forklift-03',
    asset_check_assignment_id: 'asg-forklift-loler',
    asset_check_record_id: 'rec-forklift-loler-2025',
    event_type: 'inspection',
    event_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'LOLER Inspection Logged',
    description: 'LOLER Forklift Certificate logged as complete for Toyota 2.5T Forklift (#FLT-03). Expiry 2026-05-30 (Expired).',
    status: 'Expired',
    cost: null,
    performed_by: 'External Safety Inspector',
    supplier: 'SafeLift Certifiers',
    odometer_or_hours: null,
    evidence_document_id: 'doc-loler-flt3',
    created_by: MOCK_PROFILE.id,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    archived_at: null
  }
];

// Helper to check localStorage browser availability
export const getStorageItem = (key: string, defaultVal: any) => {
  requireDemoMode();
  if (typeof window === 'undefined') return defaultVal;
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : defaultVal;
};

export const setStorageItem = (key: string, val: any) => {
  requireDemoMode();
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(val));
  }
};

// Initialize Mock database structure
export const initMockDb = () => {
  requireDemoMode();
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem('vigilen_initialized')) {
    localStorage.setItem('vigilen_org', JSON.stringify(MOCK_ORG));
    localStorage.setItem('vigilen_profile', JSON.stringify(MOCK_PROFILE));
    localStorage.setItem('vigilen_requirements', JSON.stringify(MOCK_REQUIREMENTS));
    localStorage.setItem('vigilen_documents', JSON.stringify(MOCK_DOCUMENTS));
    localStorage.setItem('vigilen_cells', JSON.stringify(MOCK_CELLS));
    localStorage.setItem('vigilen_audit_packs', JSON.stringify(MOCK_AUDIT_PACKS));
    localStorage.setItem('vigilen_logs', JSON.stringify(MOCK_LOGS));
    localStorage.setItem('vigilen_framework_requirements', JSON.stringify(MOCK_FRAMEWORK_REQUIREMENTS));
    localStorage.setItem('vigilen_requirement_evidence_types', JSON.stringify(MOCK_REQUIREMENT_EVIDENCE_TYPES));
    localStorage.setItem('vigilen_requirement_documents', JSON.stringify(MOCK_REQUIREMENT_DOCUMENTS));
    localStorage.setItem('vigilen_requirement_evidence_criteria', JSON.stringify(MOCK_REQUIREMENT_EVIDENCE_CRITERIA));
    localStorage.setItem('vigilen_requirement_evidence_criterion_matches', JSON.stringify(MOCK_REQUIREMENT_EVIDENCE_CRITERION_MATCHES));
    localStorage.setItem('vigilen_reviews', JSON.stringify(MOCK_REVIEWS));
    localStorage.setItem('vigilen_actions', JSON.stringify(MOCK_ACTIONS));
    localStorage.setItem('vigilen_requirement_actions', JSON.stringify(MOCK_REQUIREMENT_ACTIONS));
    localStorage.setItem('vigilen_action_updates', JSON.stringify(MOCK_ACTION_UPDATES));
    localStorage.setItem('vigilen_action_documents', JSON.stringify(MOCK_ACTION_DOCUMENTS));
    localStorage.setItem('vigilen_action_object_links', JSON.stringify(MOCK_ACTION_OBJECT_LINKS));
    localStorage.setItem('vigilen_people', JSON.stringify(MOCK_PEOPLE));
    localStorage.setItem('vigilen_competency_types', JSON.stringify(MOCK_COMPETENCY_TYPES));
    localStorage.setItem('vigilen_competency_records', JSON.stringify(MOCK_COMPETENCY_RECORDS));
    localStorage.setItem('vigilen_competency_record_documents', JSON.stringify(MOCK_COMPETENCY_RECORD_DOCUMENTS));
    localStorage.setItem('vigilen_requirement_competency_types', JSON.stringify(MOCK_REQUIREMENT_COMPETENCY_TYPES));
    localStorage.setItem('vigilen_audit_trail_events', JSON.stringify(MOCK_AUDIT_TRAIL_EVENTS));
    localStorage.setItem('vygilence_workspace_notifications', JSON.stringify(MOCK_WORKSPACE_NOTIFICATIONS));
    
    // Seed new asset system tables
    localStorage.setItem('vigilen_asset_categories', JSON.stringify(MOCK_ASSET_CATEGORIES));
    localStorage.setItem('vigilen_assets', JSON.stringify(MOCK_ASSETS));
    localStorage.setItem('vigilen_asset_check_types', JSON.stringify(MOCK_ASSET_CHECK_TYPES));
    localStorage.setItem('vigilen_asset_check_assignments', JSON.stringify(MOCK_ASSET_CHECK_ASSIGNMENTS));
    localStorage.setItem('vigilen_asset_check_records', JSON.stringify(MOCK_ASSET_CHECK_RECORDS));
    localStorage.setItem('vigilen_asset_check_evidence_links', JSON.stringify(MOCK_ASSET_CHECK_EVIDENCE_LINKS));
    localStorage.setItem('vigilen_asset_requirement_links', JSON.stringify(MOCK_ASSET_REQUIREMENT_LINKS));
    localStorage.setItem('vigilen_asset_history_events', JSON.stringify(MOCK_ASSET_HISTORY_EVENTS));
    
    localStorage.setItem('vigilen_initialized', 'true');
  }
};

const shouldUseSupabase = () => {
  requireProductionEnv(isSupabaseConfigured);
  return !isDemoMode;
};

const nowIso = () => new Date().toISOString();

const categoryStorageKey = (type: 'requirement' | 'evidence') =>
  type === 'requirement' ? 'vigilen_requirement_categories' : 'vigilen_evidence_categories';

const categoryTableName = (type: 'requirement' | 'evidence') =>
  type === 'requirement' ? 'requirement_categories' : 'evidence_categories';

const buildStatusNote = (previousStatus: string | null, newStatus: string, note?: string | null) => {
  const statusLine = `Previous status: ${previousStatus || 'none'}. New status: ${newStatus}.`;
  return note?.trim() ? `${statusLine} ${note.trim()}` : statusLine;
};

const getActionUpdateTypeForStatus = (previous: Action | null, nextStatus: ActionStatus): ActionUpdateType => {
  if (nextStatus === 'Complete') return 'Completion Note';
  if (nextStatus === 'Cancelled') return 'Cancellation Note';
  if (previous && (previous.status === 'Complete' || previous.status === 'Cancelled') && nextStatus === 'Open') return 'Reopen Note';
  return 'Status Change';
};

const prepareActionLifecycleUpdate = (
  previous: Action | null,
  updates: Partial<Action>,
  userId: string
): { patch: Partial<Action>; timeline?: { update_type: ActionUpdateType; note: string; action: string; details: string } } => {
  const patch: Partial<Action> = { ...updates };
  const timestamp = nowIso();
  const nextStatus = updates.status || previous?.status || 'Open';

  if (!previous && !patch.opened_at) patch.opened_at = timestamp;
  if (!previous && !patch.opened_by) patch.opened_by = userId;
  if (patch.due_date && !patch.target_due_date) patch.target_due_date = patch.due_date;

  if (!previous || (updates.status && updates.status !== previous.status)) {
    patch.status_changed_at = timestamp;
    patch.status_changed_by = userId;
  }

  if (updates.status === 'Complete') {
    if (!updates.completion_note?.trim()) {
      throw new Error('Completion note is required before an action can be completed.');
    }
    patch.closed_at = updates.closed_at || updates.completed_at || timestamp;
    patch.closed_by = updates.closed_by || updates.completed_by || userId;
    patch.completed_at = patch.closed_at;
    patch.completed_by = patch.closed_by;
  }

  if (updates.status === 'Cancelled') {
    patch.closed_at = updates.closed_at || updates.cancelled_at || timestamp;
    patch.closed_by = updates.closed_by || updates.cancelled_by || userId;
    patch.cancelled_at = patch.closed_at;
    patch.cancelled_by = patch.closed_by;
  }

  if (previous && (previous.status === 'Complete' || previous.status === 'Cancelled') && updates.status === 'Open') {
    patch.closed_at = null;
    patch.closed_by = null;
    patch.completed_at = null;
    patch.completed_by = null;
    patch.completion_note = null;
    patch.cancelled_at = null;
    patch.cancelled_by = null;
    patch.cancellation_note = null;
  }

  if (!previous || (updates.status && updates.status !== previous.status)) {
    const note =
      updates.status === 'Complete'
        ? updates.completion_note
        : updates.status === 'Cancelled'
          ? updates.cancellation_note
          : updates.status === 'Open' && previous
            ? updates.completion_note || updates.cancellation_note || 'Action reopened.'
            : null;
    const updateType = getActionUpdateTypeForStatus(previous, nextStatus);
    return {
      patch,
      timeline: {
        update_type: updateType,
        note: buildStatusNote(previous?.status || null, nextStatus, note),
        action: `Action ${nextStatus}`,
        details: `Action "${previous?.title || updates.title || 'Untitled'}" changed from ${previous?.status || 'none'} to ${nextStatus}.`
      }
    };
  }

  return { patch };
};

const describeChangedFields = (before: Partial<Requirement>, after: Partial<Requirement>) => {
  const changed = Object.keys(after)
    .filter(key => before[key as keyof Requirement] !== after[key as keyof Requirement])
    .filter(key => !['updated_at'].includes(key));

  if (changed.length === 0) return 'No field changes detected.';
  return `Changed fields: ${changed.join(', ')}.`;
};

export const getCurrentSupabaseUserId = async (): Promise<string> => {
  if (!supabase) throw new Error('Supabase client is not configured.');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');
  return user.id;
};

export const getCurrentSupabaseProfile = async (): Promise<Profile | null> => {
  if (!supabase) throw new Error('Supabase client is not configured.');

  const userId = await getCurrentSupabaseUserId();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throwSupabaseError('profiles.select current user profile', error);
  return data;
};

export const getCurrentSupabaseOrganization = async (): Promise<Organization | null> => {
  if (!supabase) throw new Error('Supabase client is not configured.');

  const userId = await getCurrentSupabaseUserId();
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberError) throwSupabaseError('organization_members.select current user membership', memberError);
  if (!membership?.organization_id) return null;

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', membership.organization_id)
    .single();
  if (error) throwSupabaseError('organizations.select current membership organization', error);
  return data;
};

export const getCurrentSupabaseOrganizationId = async (): Promise<string> => {
  const org = await getCurrentSupabaseOrganization();
  if (!org) throw new Error('Authenticated user is not linked to an organization.');
  return org.id;
};

let _isSavedReportsTableAvailable: boolean | null = null;

export const checkSavedReportsTableAvailable = async (): Promise<boolean> => {
  if (!shouldUseSupabase()) return false;
  if (_isSavedReportsTableAvailable !== null) return _isSavedReportsTableAvailable;
  try {
    const { error } = await supabase!
      .from('saved_reports')
      .select('id')
      .limit(1);
    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('saved_reports')) {
        _isSavedReportsTableAvailable = false;
        return false;
      }
      console.warn('Saved reports database availability check failed:', {
        code: error.code,
        message: error.message
      });
      _isSavedReportsTableAvailable = false;
      return false;
    }
    _isSavedReportsTableAvailable = true;
    return true;
  } catch {
    _isSavedReportsTableAvailable = false;
    return false;
  }
};

export const getSavedReportsStorageKey = async (): Promise<string> => {
  const SAVED_REPORTS_KEY = 'vygilence_saved_reports';
  if (shouldUseSupabase()) {
    const orgId = await getCurrentSupabaseOrganizationId();
    const profile = await getCurrentSupabaseProfile();
    if (!profile?.id) {
      throw new Error('Cannot scope browser reports without an authenticated profile.');
    }
    return `${SAVED_REPORTS_KEY}_${profile.id}_${orgId}`;
  }
  return `${SAVED_REPORTS_KEY}_${MOCK_PROFILE.id}_${MOCK_ORG.id}`;
};

const fetchRecordById = async (table: string, id: string): Promise<any> => {
  if (shouldUseSupabase()) {
    const { data } = await supabase!.from(table).select('*').eq('id', id).maybeSingle();
    return data;
  } else {
    let key = '';
    let mockList: any[] = [];
    if (table === 'organizations') { key = 'vigilen_org'; mockList = [MOCK_ORG]; }
    else if (table === 'evidence_documents') { key = 'vigilen_documents'; mockList = MOCK_DOCUMENTS; }
    else if (table === 'requirements') { key = 'vigilen_framework_requirements'; mockList = MOCK_FRAMEWORK_REQUIREMENTS; }
    else if (table === 'actions') { key = 'vigilen_actions'; mockList = MOCK_ACTIONS; }
    else if (table === 'people') { key = 'vigilen_people'; mockList = MOCK_PEOPLE; }
    else if (table === 'competency_types') { key = 'vigilen_competency_types'; mockList = MOCK_COMPETENCY_TYPES; }
    else if (table === 'competency_records') { key = 'vigilen_competency_records'; mockList = MOCK_COMPETENCY_RECORDS; }
    else if (table === 'requirement_evidence_criteria') { key = 'vigilen_requirement_evidence_criteria'; mockList = MOCK_REQUIREMENT_EVIDENCE_CRITERIA; }
    else if (table === 'audit_packs') { key = 'vigilen_audit_packs'; mockList = MOCK_AUDIT_PACKS; }

    if (!key) return null;
    const items = getStorageItem(key, mockList);
    return items.find((item: any) => item.id === id) || null;
  }
};

const getChangedFields = (before: any, after: any): Record<string, any> | null => {
  if (!before || !after) return null;
  const changed: Record<string, any> = {};
  let hasChanges = false;
  for (const key of Object.keys(after)) {
    if (key === 'updated_at') continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changed[key] = after[key];
      hasChanges = true;
    }
  }
  return hasChanges ? changed : null;
};

const safeLogAuditEvent = async (input: any) => {
  try {
    const { logAuditEvent } = await import('./auditTrail');
    await logAuditEvent(input);
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
};

const requireAssetOrganizationId = (profile: { organization_id: string | null }): string => {
  if (!profile.organization_id) {
    throw new Error('Asset operations require an active organisation.');
  }
  return profile.organization_id;
};

// Database Service Implementation
export const dbService = {
  // Current Org & Profile Info
  async getProfile(): Promise<Profile> {
    if (shouldUseSupabase()) {
      const profile = await getCurrentSupabaseProfile();
      if (!profile) throw new Error('Authenticated user profile has not been created.');
      return profile;
    } else {
      initMockDb();
      return getStorageItem('vigilen_profile', MOCK_PROFILE);
    }
  },

  async getOrganization(orgId: string): Promise<Organization> {
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!.from('organizations').select('*').eq('id', orgId).single();
      if (error) throwSupabaseError('organizations.select by id', error);
      return data;
    } else {
      initMockDb();
      return getStorageItem('vigilen_org', MOCK_ORG);
    }
  },

  async updateOrganization(orgId: string, updates: Partial<Organization>): Promise<Organization> {
    const before = await fetchRecordById('organizations', orgId);
    let after: Organization;
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!.from('organizations').update(updates).eq('id', orgId).select().single();
      if (error) throwSupabaseError('organizations.update by id', error);
      after = data;
    } else {
      const org = getStorageItem('vigilen_org', MOCK_ORG);
      after = { ...org, ...updates, updated_at: new Date().toISOString() };
      setStorageItem('vigilen_org', after);
    }
    await safeLogAuditEvent({
      actionCategory: 'Users & Admin',
      actionType: 'organisation_settings_changed',
      entityType: 'organisation',
      entityId: orgId,
      entityLabel: after.name,
      description: `Changed organisation settings (e.g. name or compliance profile).`,
      beforeSnapshot: before,
      afterSnapshot: after,
      changedFields: getChangedFields(before, after),
      severity: 'warning'
    });
    return after;
  },

  // Compliance Requirements
  async getRequirements(): Promise<ComplianceRequirement[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!.from('compliance_requirements').select('*').eq('organization_id', orgId);
      if (error) throwSupabaseError('compliance_requirements.select active organization', error);
      return data || [];
    } else {
      initMockDb();
      return getStorageItem('vigilen_requirements', MOCK_REQUIREMENTS);
    }
  },

  async addRequirement(req: Omit<ComplianceRequirement, 'id' | 'created_at'>): Promise<ComplianceRequirement> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!.from('compliance_requirements').insert([{ ...req, organization_id: orgId }]).select().single();
      if (error) throwSupabaseError('compliance_requirements.insert active organization', error);
      return data;
    } else {
      const reqs = getStorageItem('vigilen_requirements', MOCK_REQUIREMENTS);
      const newReq: ComplianceRequirement = {
        ...req,
        id: `req-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString()
      };
      reqs.push(newReq);
      setStorageItem('vigilen_requirements', reqs);
      await this.logActivity('Requirement Added', `Created new requirement "${newReq.title}"`);
      return newReq;
    }
  },

  async getManagedCategories(type: 'requirement' | 'evidence'): Promise<ManagedCategory[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from(categoryTableName(type))
        .select('*')
        .eq('organisation_id', orgId)
        .order('category_group', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });
      if (error && (error as { code?: string }).code === 'PGRST205') return [];
      if (error) throwSupabaseError(`${categoryTableName(type)}.select active organisation`, error);
      return data || [];
    }

    initMockDb();
    return getStorageItem(categoryStorageKey(type), []);
  },

  async getRequirementCategories(): Promise<ManagedCategory[]> {
    return this.getManagedCategories('requirement');
  },

  async getEvidenceCategories(): Promise<ManagedCategory[]> {
    return this.getManagedCategories('evidence');
  },

  async upsertManagedCategory(
    type: 'requirement' | 'evidence',
    input: Partial<ManagedCategory> & Pick<ManagedCategory, 'name'>
  ): Promise<ManagedCategory> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const cleanName = input.name.trim();
    if (!cleanName) throw new Error('Category name is required.');

    const payload = {
      name: cleanName,
      description: input.description || null,
      category_group: input.category_group || 'Custom',
      is_system: input.is_system ?? false,
      active: input.active ?? true,
      organisation_id: orgId,
      updated_at: nowIso()
    };

    if (shouldUseSupabase()) {
      let existingId = input.id || null;
      if (!existingId) {
        const { data: existing, error: existingError } = await supabase!
          .from(categoryTableName(type))
          .select('id')
          .eq('organisation_id', orgId)
          .ilike('name', cleanName)
          .maybeSingle();
        if (existingError) throwSupabaseError(`${categoryTableName(type)}.select before upsert`, existingError);
        existingId = existing?.id || null;
      }

      const query = existingId
        ? supabase!.from(categoryTableName(type)).update(payload).eq('id', existingId).eq('organisation_id', orgId)
        : supabase!.from(categoryTableName(type)).insert([payload]);
      const { data, error } = await query.select().single();
      if (error) throwSupabaseError(`${categoryTableName(type)}.upsert active organisation`, error);
      await this.logActivity(`${type === 'requirement' ? 'Requirement' : 'Evidence'} Category Saved`, `Saved category "${data.name}".`);
      return data;
    }

    const categories = getStorageItem(categoryStorageKey(type), []);
    const idx = categories.findIndex((category: ManagedCategory) =>
      input.id ? category.id === input.id : category.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (idx !== -1) {
      const updated = { ...categories[idx], ...payload };
      categories[idx] = updated;
      setStorageItem(categoryStorageKey(type), categories);
      await this.logActivity(`${type === 'requirement' ? 'Requirement' : 'Evidence'} Category Saved`, `Saved category "${updated.name}".`);
      return updated;
    }

    const created: ManagedCategory = {
      id: `${type}-cat-${Math.random().toString(36).substr(2, 9)}`,
      ...payload,
      created_at: nowIso(),
      updated_at: nowIso()
    };
    categories.unshift(created);
    setStorageItem(categoryStorageKey(type), categories);
    await this.logActivity(`${type === 'requirement' ? 'Requirement' : 'Evidence'} Category Added`, `Created category "${created.name}".`);
    return created;
  },

  async upsertRequirementCategory(input: Partial<ManagedCategory> & Pick<ManagedCategory, 'name'>): Promise<ManagedCategory> {
    return this.upsertManagedCategory('requirement', input);
  },

  async upsertEvidenceCategory(input: Partial<ManagedCategory> & Pick<ManagedCategory, 'name'>): Promise<ManagedCategory> {
    return this.upsertManagedCategory('evidence', input);
  },

  async archiveManagedCategory(type: 'requirement' | 'evidence', categoryId: string): Promise<ManagedCategory> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;

    if (shouldUseSupabase()) {
      const { data: existing, error: existingError } = await supabase!
        .from(categoryTableName(type))
        .select('*')
        .eq('id', categoryId)
        .eq('organisation_id', orgId)
        .single();
      if (existingError) throwSupabaseError(`${categoryTableName(type)}.select before archive`, existingError);
      if (existing.is_system) throw new Error('Preset categories cannot be archived.');

      const { data, error } = await supabase!
        .from(categoryTableName(type))
        .update({ active: false, updated_at: nowIso() })
        .eq('id', categoryId)
        .eq('organisation_id', orgId)
        .select()
        .single();
      if (error) throwSupabaseError(`${categoryTableName(type)}.archive active organisation`, error);
      await this.logActivity(`${type === 'requirement' ? 'Requirement' : 'Evidence'} Category Archived`, `Archived category "${data.name}".`);
      return data;
    }

    const categories = getStorageItem(categoryStorageKey(type), []);
    const idx = categories.findIndex((category: ManagedCategory) => category.id === categoryId);
    if (idx === -1) throw new Error('Category not found.');
    if (categories[idx].is_system) throw new Error('Preset categories cannot be archived.');
    const updated = { ...categories[idx], active: false, updated_at: nowIso() };
    categories[idx] = updated;
    setStorageItem(categoryStorageKey(type), categories);
    await this.logActivity(`${type === 'requirement' ? 'Requirement' : 'Evidence'} Category Archived`, `Archived category "${updated.name}".`);
    return updated;
  },

  async archiveRequirementCategory(categoryId: string): Promise<ManagedCategory> {
    return this.archiveManagedCategory('requirement', categoryId);
  },

  async archiveEvidenceCategory(categoryId: string): Promise<ManagedCategory> {
    return this.archiveManagedCategory('evidence', categoryId);
  },

  // Standards-agnostic Requirements Framework
  async getFrameworkRequirements(): Promise<Requirement[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('requirements')
        .select('*')
        .eq('organisation_id', orgId)
        .order('next_due_date', { ascending: true, nullsFirst: false });
      if (error) throwSupabaseError('requirements.select active organisation', error);
      return data || [];
    }

    initMockDb();
    return getStorageItem('vigilen_framework_requirements', MOCK_FRAMEWORK_REQUIREMENTS);
  },

  async addFrameworkRequirement(
    requirement: Omit<Requirement, 'id' | 'organisation_id' | 'created_by' | 'created_at' | 'updated_at'>
  ): Promise<Requirement> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const userId = shouldUseSupabase() ? await getCurrentSupabaseUserId() : MOCK_PROFILE.id;

    let newRequirement: Requirement;
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('requirements')
        .insert([{ ...requirement, organisation_id: orgId, created_by: userId }])
        .select()
        .single();
      if (error) throwSupabaseError('requirements.insert active organisation', error);
      newRequirement = data;
    } else {
      const requirements = getStorageItem('vigilen_framework_requirements', MOCK_FRAMEWORK_REQUIREMENTS);
      newRequirement = {
        ...requirement,
        id: `fw-req-${Math.random().toString(36).substr(2, 9)}`,
        organisation_id: orgId,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      requirements.unshift(newRequirement);
      setStorageItem('vigilen_framework_requirements', requirements);
      await this.logActivity('Requirement Added', `Created requirement "${newRequirement.title}"`);
    }

    await safeLogAuditEvent({
      actionCategory: 'Requirements',
      actionType: 'requirement_created',
      entityType: 'requirement',
      entityId: newRequirement.id,
      entityLabel: newRequirement.title,
      description: `Created requirement "${newRequirement.title}"`,
      afterSnapshot: newRequirement,
      severity: 'info'
    });

    return newRequirement;
  },

  async updateFrameworkRequirement(requirementId: string, updates: Partial<Requirement>): Promise<Requirement> {
    const before = await fetchRecordById('requirements', requirementId);
    let after: Requirement;
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const userId = await getCurrentSupabaseUserId();
      const { data: existing, error: existingError } = await supabase!
        .from('requirements')
        .select('*')
        .eq('id', requirementId)
        .eq('organisation_id', orgId)
        .single();
      if (existingError) throwSupabaseError('requirements.select before update', existingError);

      const { data, error } = await supabase!
        .from('requirements')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', requirementId)
        .eq('organisation_id', orgId)
        .select()
        .single();
      if (error) throwSupabaseError('requirements.update active organisation', error);
      await this.logActivity('Requirement Updated', `Updated requirement "${data.title}" by user ${userId}. ${describeChangedFields(existing, data)}`);
      after = data;
    } else {
      const requirements = getStorageItem('vigilen_framework_requirements', MOCK_FRAMEWORK_REQUIREMENTS);
      const idx = requirements.findIndex((item: Requirement) => item.id === requirementId);
      if (idx === -1) throw new Error('Requirement not found');
      const previous = requirements[idx];
      after = { ...requirements[idx], ...updates, updated_at: new Date().toISOString() };
      requirements[idx] = after;
      setStorageItem('vigilen_framework_requirements', requirements);
      await this.logActivity('Requirement Updated', `Updated requirement "${after.title}" by user ${MOCK_PROFILE.id}. ${describeChangedFields(previous, after)}`);
    }

    // Work out event type and metadata
    let actionType = 'requirement_edited';
    let undoAvailable = false;
    let undoActionType: string | null = null;
    let undoExpiresAt: string | null = null;
    let description = `Edited requirement "${after.title}"`;
    let severity: 'info' | 'warning' | 'critical' = 'info';

    if (updates.lifecycle_status === 'ARCHIVED') {
      actionType = 'requirement_archived';
      undoAvailable = true;
      undoActionType = 'restore_requirement';
      undoExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      description = `Archived requirement "${after.title}"`;
      severity = 'warning';
    } else if (updates.lifecycle_status === 'DEACTIVATED') {
      actionType = 'requirement_deactivated';
      description = `Deactivated requirement "${after.title}"`;
      severity = 'warning';
    } else if (updates.lifecycle_status === 'DELETED') {
      actionType = 'requirement_soft_deleted';
      undoAvailable = true;
      undoActionType = 'restore_requirement';
      undoExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      description = `Soft-deleted requirement "${after.title}"`;
      severity = 'critical';
    } else if (updates.lifecycle_status === 'ACTIVE' && before?.lifecycle_status === 'ARCHIVED') {
      actionType = 'requirement_restored';
      description = `Restored archived requirement "${after.title}"`;
    } else if (updates.review_date && updates.review_date !== before?.review_date) {
      actionType = 'requirement_review_completed';
      description = `Completed requirement review for "${after.title}". New review date: ${updates.review_date}`;
    } else if (
      (updates.owner && updates.owner !== before?.owner) ||
      (updates.category && updates.category !== before?.category) ||
      (updates.risk_level && updates.risk_level !== before?.risk_level) ||
      (updates.review_frequency && updates.review_frequency !== before?.review_frequency)
    ) {
      actionType = 'requirement_settings_changed';
      description = `Changed settings (owner/category/risk/frequency) on requirement "${after.title}"`;
    }

    await safeLogAuditEvent({
      actionCategory: 'Requirements',
      actionType,
      entityType: 'requirement',
      entityId: requirementId,
      entityLabel: after.title,
      description,
      beforeSnapshot: before,
      afterSnapshot: after,
      changedFields: getChangedFields(before, after),
      undoAvailable,
      undoActionType,
      undoExpiresAt,
      severity
    });

    void this.createWorkspaceNotification({
      recipient_role: 'Owner',
      title: `Requirement updated: ${after.title}`,
      body: description,
      type: 'requirement',
      severity,
      entity_type: 'requirement',
      entity_id: requirementId,
      entity_label: after.title,
      action_url: `/dashboard/requirements?id=${requirementId}`,
      metadata: { action_type: actionType, changed_fields: getChangedFields(before, after) }
    }).catch(error => console.warn('Notification creation failed after requirement update.', error));

    return after;
  },

  async requirementHasLinkedHistory(requirementId: string): Promise<boolean> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const checks = await Promise.all([
        supabase!.from('requirement_documents').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('requirement_id', requirementId),
        supabase!.from('requirement_evidence_criteria').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('requirement_id', requirementId),
        supabase!.from('reviews').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('requirement_id', requirementId),
        supabase!.from('requirement_actions').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('requirement_id', requirementId),
        supabase!.from('requirement_competency_types').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('requirement_id', requirementId)
      ]);
      checks.forEach((result, index) => {
        if (result.error) throwSupabaseError(`requirements.lifecycle linked history check ${index}`, result.error);
      });
      return checks.some(result => (result.count || 0) > 0);
    }

    return (
      getStorageItem('vigilen_requirement_documents', MOCK_REQUIREMENT_DOCUMENTS).some((link: RequirementDocument) => link.requirement_id === requirementId) ||
      getStorageItem('vigilen_requirement_evidence_criteria', MOCK_REQUIREMENT_EVIDENCE_CRITERIA).some((criterion: RequirementEvidenceCriterion) => criterion.requirement_id === requirementId) ||
      getStorageItem('vigilen_reviews', MOCK_REVIEWS).some((review: Review) => review.requirement_id === requirementId) ||
      getStorageItem('vigilen_requirement_actions', MOCK_REQUIREMENT_ACTIONS).some((link: RequirementAction) => link.requirement_id === requirementId) ||
      getStorageItem('vigilen_requirement_competency_types', MOCK_REQUIREMENT_COMPETENCY_TYPES).some((link: RequirementCompetencyType) => link.requirement_id === requirementId)
    );
  },

  async archiveFrameworkRequirement(requirementId: string): Promise<Requirement> {
    const userId = shouldUseSupabase() ? await getCurrentSupabaseUserId() : MOCK_PROFILE.id;
    const updated = await this.updateFrameworkRequirement(requirementId, {
      lifecycle_status: 'ARCHIVED',
      archived_at: new Date().toISOString(),
      archived_by: userId
    });
    await this.logActivity('Requirement Archived', `Archived requirement "${updated.title}" by user ${userId}`);
    return updated;
  },

  async restoreFrameworkRequirement(requirementId: string): Promise<Requirement> {
    const userId = shouldUseSupabase() ? await getCurrentSupabaseUserId() : MOCK_PROFILE.id;
    const updated = await this.updateFrameworkRequirement(requirementId, {
      lifecycle_status: 'ACTIVE',
      archived_at: null,
      archived_by: null,
      deactivated_at: null,
      deactivated_by: null,
      deleted_at: null,
      deleted_by: null
    });
    await this.logActivity('Requirement Restored', `Restored requirement "${updated.title}" by user ${userId}`);
    return updated;
  },

  async deactivateFrameworkRequirement(requirementId: string): Promise<Requirement> {
    const userId = shouldUseSupabase() ? await getCurrentSupabaseUserId() : MOCK_PROFILE.id;
    const updated = await this.updateFrameworkRequirement(requirementId, {
      lifecycle_status: 'DEACTIVATED',
      deactivated_at: new Date().toISOString(),
      deactivated_by: userId
    });
    await this.logActivity('Requirement Deactivated', `Deactivated requirement "${updated.title}" by user ${userId}`);
    return updated;
  },

  async deleteFrameworkRequirement(requirementId: string): Promise<void> {
    const hasHistory = await this.requirementHasLinkedHistory(requirementId);
    if (hasHistory) {
      throw new Error('This requirement has linked evidence, criteria, reviews, actions, or competency history. Archive it instead to preserve history.');
    }
    const userId = shouldUseSupabase() ? await getCurrentSupabaseUserId() : MOCK_PROFILE.id;
    const updated = await this.updateFrameworkRequirement(requirementId, {
      lifecycle_status: 'DELETED',
      deleted_at: new Date().toISOString(),
      deleted_by: userId
    });
    await this.logActivity('Requirement Deleted', `Deleted requirement "${updated.title}" by user ${userId}`);
  },

  async getRequirementEvidenceTypes(): Promise<RequirementEvidenceType[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('requirement_evidence_types')
        .select('*')
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('requirement_evidence_types.select active organisation', error);
      return data || [];
    }

    initMockDb();
    return getStorageItem('vigilen_requirement_evidence_types', MOCK_REQUIREMENT_EVIDENCE_TYPES);
  },

  async addRequirementEvidenceTypes(
    requirementId: string,
    evidenceTypeNames: string[]
  ): Promise<RequirementEvidenceType[]> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const uniqueNames = Array.from(new Set(evidenceTypeNames.map(name => name.trim()).filter(Boolean)));
    if (uniqueNames.length === 0) return [];

    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('requirement_evidence_types')
        .insert(uniqueNames.map(name => ({
          requirement_id: requirementId,
          organisation_id: orgId,
          name,
          description: null
        })))
        .select();
      if (error) throwSupabaseError('requirement_evidence_types.insert template import', error);
      return data || [];
    }

    const evidenceTypes = getStorageItem('vigilen_requirement_evidence_types', MOCK_REQUIREMENT_EVIDENCE_TYPES);
    const newEvidenceTypes: RequirementEvidenceType[] = uniqueNames.map(name => ({
      id: `fw-ev-${Math.random().toString(36).substr(2, 9)}`,
      requirement_id: requirementId,
      organisation_id: orgId,
      name,
      description: null,
      created_at: new Date().toISOString()
    }));
    setStorageItem('vigilen_requirement_evidence_types', [...evidenceTypes, ...newEvidenceTypes]);
    return newEvidenceTypes;
  },

  async getRequirementDocuments(): Promise<RequirementDocument[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('requirement_documents')
        .select('*')
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('requirement_documents.select active organisation', error);
      return data || [];
    }

    initMockDb();
    return getStorageItem('vigilen_requirement_documents', MOCK_REQUIREMENT_DOCUMENTS);
  },

  async linkDocumentToRequirement(requirementId: string, documentId: string): Promise<RequirementDocument> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const userId = shouldUseSupabase() ? await getCurrentSupabaseUserId() : MOCK_PROFILE.id;

    const doc = await fetchRecordById('evidence_documents', documentId);
    const req = await fetchRecordById('requirements', requirementId);

    let data: RequirementDocument;
    if (shouldUseSupabase()) {
      const { data: res, error } = await supabase!
        .from('requirement_documents')
        .insert([{ requirement_id: requirementId, document_id: documentId, organisation_id: orgId, linked_by: userId }])
        .select()
        .single();
      if (error) throwSupabaseError('requirement_documents.insert active organisation', error);
      data = res;
    } else {
      const links = getStorageItem('vigilen_requirement_documents', MOCK_REQUIREMENT_DOCUMENTS);
      const existing = links.find((link: RequirementDocument) => link.requirement_id === requirementId && link.document_id === documentId);
      if (existing) {
        data = existing;
      } else {
        const newLink: RequirementDocument = {
          id: `fw-link-${Math.random().toString(36).substr(2, 9)}`,
          requirement_id: requirementId,
          document_id: documentId,
          organisation_id: orgId,
          linked_by: userId,
          created_at: new Date().toISOString()
        };
        links.push(newLink);
        setStorageItem('vigilen_requirement_documents', links);
        data = newLink;
      }
    }

    await safeLogAuditEvent({
      actionCategory: 'Evidence',
      actionType: 'evidence_linked',
      entityType: 'evidence_document',
      entityId: documentId,
      entityLabel: doc?.title || 'Unknown Document',
      description: `Linked evidence document "${doc?.title || ''}" to requirement "${req?.title || ''}"`,
      metadata: {
        requirement_id: requirementId,
        requirement_title: req?.title
      },
      severity: 'info'
    });

    void this.createWorkspaceNotification({
      recipient_role: 'Owner',
      title: `Evidence linked: ${doc?.title || 'Document'}`,
      body: `Linked to requirement "${req?.title || 'Unknown requirement'}".`,
      type: 'evidence',
      severity: 'info',
      entity_type: 'evidence_document',
      entity_id: documentId,
      entity_label: doc?.title || 'Unknown Document',
      action_url: `/dashboard/vault?id=${documentId}`,
      metadata: { requirement_id: requirementId, requirement_title: req?.title }
    }).catch(error => console.warn('Notification creation failed after evidence link.', error));

    return data;
  },

  async unlinkDocumentFromRequirement(requirementId: string, documentId: string): Promise<void> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const doc = await fetchRecordById('evidence_documents', documentId);
    const req = await fetchRecordById('requirements', requirementId);

    if (shouldUseSupabase()) {
      const { error } = await supabase!
        .from('requirement_documents')
        .delete()
        .eq('requirement_id', requirementId)
        .eq('document_id', documentId)
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('requirement_documents.delete active organisation', error);
    } else {
      const links = getStorageItem('vigilen_requirement_documents', MOCK_REQUIREMENT_DOCUMENTS);
      setStorageItem(
        'vigilen_requirement_documents',
        links.filter((link: RequirementDocument) => !(link.requirement_id === requirementId && link.document_id === documentId))
      );
    }

    await safeLogAuditEvent({
      actionCategory: 'Evidence',
      actionType: 'evidence_unlinked',
      entityType: 'evidence_document',
      entityId: documentId,
      entityLabel: doc?.title || 'Unknown Document',
      description: `Unlinked evidence document "${doc?.title || ''}" from requirement "${req?.title || ''}"`,
      metadata: {
        requirement_id: requirementId,
        requirement_title: req?.title
      },
      severity: 'info'
    });

    void this.createWorkspaceNotification({
      recipient_role: 'Owner',
      title: `Evidence unlinked: ${doc?.title || 'Document'}`,
      body: `Removed from requirement "${req?.title || 'Unknown requirement'}".`,
      type: 'evidence',
      severity: 'warning',
      entity_type: 'evidence_document',
      entity_id: documentId,
      entity_label: doc?.title || 'Unknown Document',
      action_url: `/dashboard/requirements?id=${requirementId}`,
      metadata: { requirement_id: requirementId, requirement_title: req?.title }
    }).catch(error => console.warn('Notification creation failed after evidence unlink.', error));
  },

  async getRequirementEvidenceCriteria(): Promise<RequirementEvidenceCriterion[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('requirement_evidence_criteria')
        .select('*')
        .eq('organisation_id', orgId)
        .order('created_at', { ascending: true });
      if (error) throwSupabaseError('requirement_evidence_criteria.select active organisation', error);
      return data || [];
    }

    initMockDb();
    return getStorageItem('vigilen_requirement_evidence_criteria', MOCK_REQUIREMENT_EVIDENCE_CRITERIA);
  },

  async upsertRequirementEvidenceCriterion(
    input: Partial<RequirementEvidenceCriterion> & Pick<RequirementEvidenceCriterion, 'requirement_id' | 'title'>
  ): Promise<RequirementEvidenceCriterion> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const userId = shouldUseSupabase() ? await getCurrentSupabaseUserId() : MOCK_PROFILE.id;
    const payload = {
      ...input,
      organisation_id: orgId,
      description: input.description || null,
      evidence_type: input.evidence_type || null,
      is_required: input.is_required ?? true,
      weight: input.weight ?? 1,
      minimum_count: input.minimum_count ?? 1,
      frequency: input.frequency || null,
      coverage_period: input.coverage_period || null,
      validity_required: input.validity_required ?? true,
      created_by: input.created_by || userId,
      updated_at: nowIso()
    };

    const before = input.id ? await fetchRecordById('requirement_evidence_criteria', input.id) : null;
    let after: RequirementEvidenceCriterion;

    if (shouldUseSupabase()) {
      const query = input.id
        ? supabase!.from('requirement_evidence_criteria').update(payload).eq('id', input.id).eq('organisation_id', orgId)
        : supabase!.from('requirement_evidence_criteria').insert([payload]);
      const { data, error } = await query.select().single();
      if (error) throwSupabaseError('requirement_evidence_criteria.upsert active organisation', error);
      await this.logActivity('Evidence Criterion Saved', `Saved evidence criterion "${data.title}".`);
      after = data;
    } else {
      const criteria = getStorageItem('vigilen_requirement_evidence_criteria', MOCK_REQUIREMENT_EVIDENCE_CRITERIA);
      if (input.id) {
        const idx = criteria.findIndex((criterion: RequirementEvidenceCriterion) => criterion.id === input.id);
        if (idx !== -1) {
          after = { ...criteria[idx], ...payload };
          criteria[idx] = after;
          setStorageItem('vigilen_requirement_evidence_criteria', criteria);
          await this.logActivity('Evidence Criterion Saved', `Saved evidence criterion "${after.title}".`);
        } else {
          throw new Error('Criterion not found');
        }
      } else {
        after = {
          id: `crit-${Math.random().toString(36).substr(2, 9)}`,
          organisation_id: orgId,
          requirement_id: input.requirement_id,
          title: input.title,
          description: input.description || null,
          evidence_type: input.evidence_type || null,
          is_required: input.is_required ?? true,
          weight: input.weight ?? 1,
          minimum_count: input.minimum_count ?? 1,
          frequency: input.frequency || null,
          coverage_period: input.coverage_period || null,
          validity_required: input.validity_required ?? true,
          created_by: userId,
          created_at: nowIso(),
          updated_at: nowIso()
        };
        criteria.push(after);
        setStorageItem('vigilen_requirement_evidence_criteria', criteria);
        await this.logActivity('Evidence Criterion Created', `Created evidence criterion "${after.title}".`);
      }
    }

    await safeLogAuditEvent({
      actionCategory: 'Requirements',
      actionType: before ? 'evidence_criteria_edited' : 'evidence_criteria_created',
      entityType: 'evidence_criterion',
      entityId: after.id,
      entityLabel: after.title,
      description: before
        ? `Edited evidence criterion "${after.title}" under requirement "${after.requirement_id}"`
        : `Created evidence criterion "${after.title}" under requirement "${after.requirement_id}"`,
      beforeSnapshot: before,
      afterSnapshot: after,
      changedFields: before ? getChangedFields(before, after) : null,
      severity: 'info'
    });

    return after;
  },

  async deleteRequirementEvidenceCriterion(criterionId: string): Promise<void> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const before = await fetchRecordById('requirement_evidence_criteria', criterionId);
    if (shouldUseSupabase()) {
      const { error } = await supabase!
        .from('requirement_evidence_criteria')
        .delete()
        .eq('id', criterionId)
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('requirement_evidence_criteria.delete active organisation', error);
      await this.logActivity('Evidence Criterion Deleted', `Deleted evidence criterion ${criterionId}.`);
    } else {
      setStorageItem(
        'vigilen_requirement_evidence_criteria',
        getStorageItem('vigilen_requirement_evidence_criteria', MOCK_REQUIREMENT_EVIDENCE_CRITERIA)
          .filter((criterion: RequirementEvidenceCriterion) => criterion.id !== criterionId)
      );
      setStorageItem(
        'vigilen_requirement_evidence_criterion_matches',
        getStorageItem('vigilen_requirement_evidence_criterion_matches', MOCK_REQUIREMENT_EVIDENCE_CRITERION_MATCHES)
          .filter((match: RequirementEvidenceCriterionMatch) => match.criterion_id !== criterionId)
      );
      await this.logActivity('Evidence Criterion Deleted', `Deleted evidence criterion ${criterionId}.`);
    }

    await safeLogAuditEvent({
      actionCategory: 'Requirements',
      actionType: 'evidence_criteria_deleted',
      entityType: 'evidence_criterion',
      entityId: criterionId,
      entityLabel: before?.title || 'Unknown Criterion',
      description: `Deleted evidence criterion "${before?.title || ''}"`,
      beforeSnapshot: before,
      severity: 'info'
    });
  },

  async getRequirementEvidenceCriterionMatches(): Promise<RequirementEvidenceCriterionMatch[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('requirement_evidence_criterion_matches')
        .select('*')
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('requirement_evidence_criterion_matches.select active organisation', error);
      return data || [];
    }

    initMockDb();
    return getStorageItem('vigilen_requirement_evidence_criterion_matches', MOCK_REQUIREMENT_EVIDENCE_CRITERION_MATCHES);
  },

  async linkDocumentToEvidenceCriterion(criterionId: string, documentId: string, notes: string | null = null): Promise<RequirementEvidenceCriterionMatch> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const userId = shouldUseSupabase() ? await getCurrentSupabaseUserId() : MOCK_PROFILE.id;
    const payload = {
      organisation_id: orgId,
      criterion_id: criterionId,
      document_id: documentId,
      competency_record_id: null,
      action_id: null,
      match_status: 'Matched',
      matched_by: userId,
      matched_at: nowIso(),
      notes
    };

    const doc = await fetchRecordById('evidence_documents', documentId);
    const crit = await fetchRecordById('requirement_evidence_criteria', criterionId);

    let data: RequirementEvidenceCriterionMatch;
    if (shouldUseSupabase()) {
      const { data: res, error } = await supabase!
        .from('requirement_evidence_criterion_matches')
        .upsert([payload], { onConflict: 'criterion_id,document_id' })
        .select()
        .single();
      if (error) throwSupabaseError('requirement_evidence_criterion_matches.upsert document', error);
      await this.logActivity('Evidence Criterion Matched', `Linked document ${documentId} to evidence criterion ${criterionId}.`);
      data = res;
    } else {
      const matches = getStorageItem('vigilen_requirement_evidence_criterion_matches', MOCK_REQUIREMENT_EVIDENCE_CRITERION_MATCHES);
      const existing = matches.find((match: RequirementEvidenceCriterionMatch) => match.criterion_id === criterionId && match.document_id === documentId);
      if (existing) {
        data = existing;
      } else {
        const created: RequirementEvidenceCriterionMatch = {
          id: `crit-match-${Math.random().toString(36).substr(2, 9)}`,
          ...payload,
          match_status: 'Matched',
          created_at: nowIso(),
          updated_at: nowIso()
        };
        matches.push(created);
        setStorageItem('vigilen_requirement_evidence_criterion_matches', matches);
        await this.logActivity('Evidence Criterion Matched', `Linked document ${documentId} to evidence criterion ${criterionId}.`);
        data = created;
      }
    }

    await safeLogAuditEvent({
      actionCategory: 'Evidence',
      actionType: 'evidence_linked',
      entityType: 'evidence_document',
      entityId: documentId,
      entityLabel: doc?.title || 'Unknown Document',
      description: `Linked evidence document "${doc?.title || ''}" to evidence criterion "${crit?.title || ''}"`,
      metadata: {
        criterion_id: criterionId,
        criterion_title: crit?.title,
        requirement_id: crit?.requirement_id
      },
      severity: 'info'
    });

    void this.createWorkspaceNotification({
      recipient_role: 'Owner',
      title: `Evidence matched to criterion: ${crit?.title || 'Evidence Criterion'}`,
      body: doc?.title ? `Linked document "${doc.title}".` : 'Evidence was linked to an evidence criterion.',
      type: 'evidence',
      severity: 'info',
      entity_type: 'evidence_criterion',
      entity_id: criterionId,
      entity_label: crit?.title || 'Unknown Evidence Criterion',
      action_url: `/dashboard/requirements?filter=criteria`,
      metadata: { document_id: documentId, document_title: doc?.title, requirement_id: crit?.requirement_id }
    }).catch(error => console.warn('Notification creation failed after criterion evidence match.', error));

    return data;
  },

  async unlinkDocumentFromEvidenceCriterion(criterionId: string, documentId: string): Promise<void> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const doc = await fetchRecordById('evidence_documents', documentId);
    const crit = await fetchRecordById('requirement_evidence_criteria', criterionId);

    if (shouldUseSupabase()) {
      const { error } = await supabase!
        .from('requirement_evidence_criterion_matches')
        .delete()
        .eq('criterion_id', criterionId)
        .eq('document_id', documentId)
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('requirement_evidence_criterion_matches.delete document', error);
      await this.logActivity('Evidence Criterion Unlinked', `Unlinked document ${documentId} from evidence criterion ${criterionId}.`);
    } else {
      setStorageItem(
        'vigilen_requirement_evidence_criterion_matches',
        getStorageItem('vigilen_requirement_evidence_criterion_matches', MOCK_REQUIREMENT_EVIDENCE_CRITERION_MATCHES)
          .filter((match: RequirementEvidenceCriterionMatch) => !(match.criterion_id === criterionId && match.document_id === documentId))
      );
      await this.logActivity('Evidence Criterion Unlinked', `Unlinked document ${documentId} from evidence criterion ${criterionId}.`);
    }

    await safeLogAuditEvent({
      actionCategory: 'Evidence',
      actionType: 'evidence_unlinked',
      entityType: 'evidence_document',
      entityId: documentId,
      entityLabel: doc?.title || 'Unknown Document',
      description: `Unlinked evidence document "${doc?.title || ''}" from evidence criterion "${crit?.title || ''}"`,
      metadata: {
        criterion_id: criterionId,
        criterion_title: crit?.title,
        requirement_id: crit?.requirement_id
      },
      severity: 'info'
    });

    void this.createWorkspaceNotification({
      recipient_role: 'Owner',
      title: `Evidence removed from criterion: ${crit?.title || 'Evidence Criterion'}`,
      body: doc?.title ? `Unlinked document "${doc.title}".` : 'Evidence was unlinked from an evidence criterion.',
      type: 'evidence',
      severity: 'warning',
      entity_type: 'evidence_criterion',
      entity_id: criterionId,
      entity_label: crit?.title || 'Unknown Evidence Criterion',
      action_url: `/dashboard/requirements?filter=criteria`,
      metadata: { document_id: documentId, document_title: doc?.title, requirement_id: crit?.requirement_id }
    }).catch(error => console.warn('Notification creation failed after criterion evidence unlink.', error));
  },

  async uploadEvidenceForCriterion(criterionId: string, file: File, category: string = 'Evidence'): Promise<EvidenceDocument> {
    const title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim() || file.name;
    const document = await this.uploadDocumentFile({
      file,
      title,
      category,
      expiry_date: null,
      issue_date: new Date().toISOString().split('T')[0],
      metadata: { source: 'evidence_criterion', criterion_id: criterionId },
      tags: ['evidence-criteria'],
      status: 'Unclassified'
    });
    await this.linkDocumentToEvidenceCriterion(criterionId, document.id, `Uploaded for criterion: ${title}`);
    return document;
  },

  async getReviews(): Promise<Review[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('reviews')
        .select('*')
        .eq('organisation_id', orgId)
        .order('review_date', { ascending: false });
      if (error) throwSupabaseError('reviews.select active organisation', error);
      return data || [];
    }

    initMockDb();
    return getStorageItem('vigilen_reviews', MOCK_REVIEWS);
  },

  async getActions(): Promise<Action[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('actions')
        .select('*')
        .eq('organisation_id', orgId)
        .order('target_due_date', { ascending: true, nullsFirst: false });
      if (error) throwSupabaseError('actions.select active organisation', error);
      return data || [];
    }

    initMockDb();
    return getStorageItem('vigilen_actions', MOCK_ACTIONS);
  },

  async getActionUpdates(): Promise<ActionUpdate[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('action_updates')
        .select('*')
        .eq('organisation_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throwSupabaseError('action_updates.select active organisation', error);
      return data || [];
    }

    initMockDb();
    return getStorageItem('vigilen_action_updates', MOCK_ACTION_UPDATES);
  },

  async getActionDocuments(): Promise<ActionDocument[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('action_documents')
        .select('*')
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('action_documents.select active organisation', error);
      return data || [];
    }

    initMockDb();
    return getStorageItem('vigilen_action_documents', MOCK_ACTION_DOCUMENTS);
  },

  async getActionObjectLinks(): Promise<ActionObjectLink[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('action_object_links')
        .select('*')
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('action_object_links.select active organisation', error);
      return data || [];
    }

    initMockDb();
    return getStorageItem('vigilen_action_object_links', MOCK_ACTION_OBJECT_LINKS);
  },

  async getWorkspaceNotifications(): Promise<WorkspaceNotification[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('workspace_notifications')
        .select('*')
        .eq('organisation_id', orgId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throwSupabaseError('workspace_notifications.select active organisation', error);
      return data || [];
    }

    initMockDb();
    return getStorageItem('vygilence_workspace_notifications', MOCK_WORKSPACE_NOTIFICATIONS);
  },

  async createWorkspaceNotification(input: Partial<WorkspaceNotification> & Pick<WorkspaceNotification, 'title' | 'type'>): Promise<WorkspaceNotification> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const actorUserId = shouldUseSupabase() ? await getCurrentSupabaseUserId() : MOCK_PROFILE.id;
    const payload = {
      organisation_id: orgId,
      recipient_user_id: input.recipient_user_id ?? null,
      recipient_role: input.recipient_role ?? null,
      actor_user_id: input.actor_user_id ?? actorUserId,
      title: input.title,
      body: input.body ?? null,
      type: input.type,
      severity: input.severity ?? 'info',
      entity_type: input.entity_type ?? null,
      entity_id: input.entity_id ?? null,
      entity_label: input.entity_label ?? null,
      action_url: input.action_url ?? null,
      metadata: input.metadata ?? {}
    };

    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('workspace_notifications')
        .insert([payload])
        .select()
        .single();
      if (error) throwSupabaseError('workspace_notifications.insert active organisation', error);
      return data;
    }

    const notifications = getStorageItem('vygilence_workspace_notifications', MOCK_WORKSPACE_NOTIFICATIONS);
    const notification: WorkspaceNotification = {
      ...payload,
      id: `notif-${Math.random().toString(36).slice(2, 10)}`,
      read_at: null,
      created_at: nowIso()
    };
    notifications.unshift(notification);
    setStorageItem('vygilence_workspace_notifications', notifications);
    return notification;
  },

  async markNotificationRead(notificationId: string, read = true): Promise<WorkspaceNotification> {
    const readAt = read ? nowIso() : null;

    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('workspace_notifications')
        .update({ read_at: readAt })
        .eq('id', notificationId)
        .eq('organisation_id', orgId)
        .select()
        .single();
      if (error) throwSupabaseError('workspace_notifications.update read state', error);
      return data;
    }

    const notifications = getStorageItem('vygilence_workspace_notifications', MOCK_WORKSPACE_NOTIFICATIONS);
    const idx = notifications.findIndex((notification: WorkspaceNotification) => notification.id === notificationId);
    if (idx === -1) throw new Error('Notification not found.');
    notifications[idx] = { ...notifications[idx], read_at: readAt };
    setStorageItem('vygilence_workspace_notifications', notifications);
    return notifications[idx];
  },

  async markAllNotificationsRead(): Promise<void> {
    const readAt = nowIso();

    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { error } = await supabase!
        .from('workspace_notifications')
        .update({ read_at: readAt })
        .eq('organisation_id', orgId)
        .is('read_at', null);
      if (error) throwSupabaseError('workspace_notifications.update all read', error);
      return;
    }

    const notifications = getStorageItem('vygilence_workspace_notifications', MOCK_WORKSPACE_NOTIFICATIONS);
    setStorageItem(
      'vygilence_workspace_notifications',
      notifications.map((notification: WorkspaceNotification) => ({ ...notification, read_at: notification.read_at || readAt }))
    );
  },

  async getRequirementActions(): Promise<RequirementAction[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('requirement_actions')
        .select('*')
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('requirement_actions.select active organisation', error);
      return data || [];
    }

    initMockDb();
    return getStorageItem('vigilen_requirement_actions', MOCK_REQUIREMENT_ACTIONS);
  },

  async createAction(
    action: Omit<Action, 'id' | 'created_at' | 'updated_at' | 'organisation_id' | 'created_by'>
  ): Promise<Action> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const userId = shouldUseSupabase() ? await getCurrentSupabaseUserId() : MOCK_PROFILE.id;
    const { patch } = prepareActionLifecycleUpdate(null, action, userId);

    let newAction: Action;
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('actions')
        .insert([{ ...patch, organisation_id: orgId, created_by: userId }])
        .select()
        .single();
      if (error) throwSupabaseError('actions.insert active organisation', error);
      await this.addActionUpdate(data.id, 'Status Change', buildStatusNote(null, data.status || 'Open', 'Action opened.'));
      await this.logActivity('Action Opened', `Opened action "${data.title}"`);
      newAction = data;
    } else {
      const actions = getStorageItem('vigilen_actions', MOCK_ACTIONS);
      newAction = {
        ...action,
        ...patch,
        id: `fw-action-${Math.random().toString(36).substr(2, 9)}`,
        organisation_id: orgId,
        created_by: userId,
        created_at: nowIso(),
        updated_at: nowIso()
      };
      actions.unshift(newAction);
      setStorageItem('vigilen_actions', actions);
      await this.addActionUpdate(newAction.id, 'Status Change', buildStatusNote(null, newAction.status, 'Action opened.'));
      await this.logActivity('Action Opened', `Opened action "${newAction.title}"`);
    }

    await safeLogAuditEvent({
      actionCategory: 'Actions',
      actionType: 'action_created',
      entityType: 'action',
      entityId: newAction.id,
      entityLabel: newAction.title,
      description: `Created action "${newAction.title}"`,
      afterSnapshot: newAction,
      severity: 'info'
    });

    void this.createWorkspaceNotification({
      recipient_role: 'Owner',
      title: `Action opened: ${newAction.title}`,
      body: newAction.owner ? `Owner/assignee: ${newAction.owner}` : 'A new action record was opened.',
      type: 'action',
      severity: newAction.due_date ? 'warning' : 'info',
      entity_type: 'action',
      entity_id: newAction.id,
      entity_label: newAction.title,
      action_url: `/dashboard/requirements?filter=actions`,
      metadata: { status: newAction.status, due_date: newAction.due_date }
    }).catch(error => console.warn('Notification creation failed after action create.', error));

    return newAction;
  },

  async updateAction(actionId: string, updates: Partial<Action>): Promise<Action> {
    const userId = shouldUseSupabase() ? await getCurrentSupabaseUserId() : MOCK_PROFILE.id;
    const before = await fetchRecordById('actions', actionId);
    let after: Action;

    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data: existing, error: existingError } = await supabase!
        .from('actions')
        .select('*')
        .eq('id', actionId)
        .eq('organisation_id', orgId)
        .single();
      if (existingError) throwSupabaseError('actions.select before lifecycle update', existingError);

      const prepared = prepareActionLifecycleUpdate(existing, updates, userId);
      const { data, error } = await supabase!
        .from('actions')
        .update({ ...prepared.patch, updated_at: nowIso() })
        .eq('id', actionId)
        .eq('organisation_id', orgId)
        .select()
        .single();
      if (error) throwSupabaseError('actions.update active organisation', error);
      if (prepared.timeline) {
        await this.addActionUpdate(actionId, prepared.timeline.update_type, prepared.timeline.note);
        await this.logActivity(prepared.timeline.action, prepared.timeline.details);
      }
      after = data;
    } else {
      const actions = getStorageItem('vigilen_actions', MOCK_ACTIONS);
      const idx = actions.findIndex((item: Action) => item.id === actionId);
      if (idx === -1) throw new Error('Action not found');
      const prepared = prepareActionLifecycleUpdate(actions[idx], updates, userId);
      after = { ...actions[idx], ...prepared.patch, updated_at: nowIso() };
      actions[idx] = after;
      setStorageItem('vigilen_actions', actions);
      if (prepared.timeline) {
        await this.addActionUpdate(actionId, prepared.timeline.update_type, prepared.timeline.note);
        await this.logActivity(prepared.timeline.action, prepared.timeline.details);
      }
    }

    let actionType = 'action_updated';
    let undoAvailable = false;
    let undoActionType: string | null = null;
    let undoExpiresAt: string | null = null;
    let description = `Updated action "${after.title}"`;
    const severity = 'info';

    if (updates.status && updates.status !== before?.status) {
      if (updates.status === 'Complete') {
        actionType = 'action_completed';
        description = `Completed action "${after.title}"`;
        undoAvailable = true;
        undoActionType = 'restore_action';
        undoExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
      } else if (updates.status === 'Cancelled') {
        actionType = 'action_cancelled';
        description = `Cancelled action "${after.title}"`;
        undoAvailable = true;
        undoActionType = 'restore_action';
        undoExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (updates.status === 'Open' && (before?.status === 'Complete' || before?.status === 'Cancelled')) {
        actionType = 'action_reopened';
        description = `Reopened action "${after.title}"`;
      } else {
        actionType = 'action_status_changed';
        description = `Changed status of action "${after.title}" to "${updates.status}"`;
      }
    }

    await safeLogAuditEvent({
      actionCategory: 'Actions',
      actionType,
      entityType: 'action',
      entityId: actionId,
      entityLabel: after.title,
      description,
      beforeSnapshot: before,
      afterSnapshot: after,
      changedFields: getChangedFields(before, after),
      undoAvailable,
      undoActionType,
      undoExpiresAt,
      severity
    });

    void this.createWorkspaceNotification({
      recipient_role: 'Owner',
      title: updates.status && updates.status !== before?.status ? `Action status changed: ${after.title}` : `Action updated: ${after.title}`,
      body: updates.status && updates.status !== before?.status
        ? `Status changed from ${before?.status || 'Unknown'} to ${after.status}.`
        : 'An action record was updated.',
      type: 'action',
      severity: after.status === 'Complete' || after.status === 'Cancelled' ? 'info' : 'warning',
      entity_type: 'action',
      entity_id: actionId,
      entity_label: after.title,
      action_url: `/dashboard/requirements?filter=actions`,
      metadata: { previous_status: before?.status, status: after.status, changed_fields: getChangedFields(before, after) }
    }).catch(error => console.warn('Notification creation failed after action update.', error));

    return after;
  },

  async addActionUpdate(actionId: string, updateType: ActionUpdateType, note: string): Promise<ActionUpdate> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const userId = shouldUseSupabase() ? await getCurrentSupabaseUserId() : MOCK_PROFILE.id;
    const cleanNote = note.trim();
    if (!cleanNote) throw new Error('Action update note is required.');

    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('action_updates')
        .insert([{ organisation_id: orgId, action_id: actionId, user_id: userId, update_type: updateType, note: cleanNote }])
        .select()
        .single();
      if (error) throwSupabaseError('action_updates.insert active organisation', error);
      return data;
    }

    const updates = getStorageItem('vigilen_action_updates', MOCK_ACTION_UPDATES);
    const newUpdate: ActionUpdate = {
      id: `fw-action-update-${Math.random().toString(36).substr(2, 9)}`,
      organisation_id: orgId,
      action_id: actionId,
      user_id: userId,
      update_type: updateType,
      note: cleanNote,
      created_at: nowIso()
    };
    updates.unshift(newUpdate);
    setStorageItem('vigilen_action_updates', updates);
    return newUpdate;
  },

  async linkDocumentToAction(actionId: string, documentId: string, timelineNote?: string): Promise<ActionDocument> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const userId = shouldUseSupabase() ? await getCurrentSupabaseUserId() : MOCK_PROFILE.id;
    const note = timelineNote?.trim() || `Evidence document ${documentId} linked to action.`;

    const doc = await fetchRecordById('evidence_documents', documentId);
    const action = await fetchRecordById('actions', actionId);

    let data: ActionDocument;
    if (shouldUseSupabase()) {
      const { data: res, error } = await supabase!
        .from('action_documents')
        .insert([{ organisation_id: orgId, action_id: actionId, document_id: documentId, linked_by: userId }])
        .select()
        .single();
      if (error) throwSupabaseError('action_documents.insert active organisation', error);
      await this.addActionUpdate(actionId, 'Evidence Added', note);
      await this.logActivity('Action Evidence Linked', `Linked evidence document ${documentId} to action ${actionId}.`);
      data = res;
    } else {
      const links = getStorageItem('vigilen_action_documents', MOCK_ACTION_DOCUMENTS);
      const existing = links.find((link: ActionDocument) => link.action_id === actionId && link.document_id === documentId);
      if (existing) {
        data = existing;
      } else {
        const newLink: ActionDocument = {
          id: `fw-action-doc-${Math.random().toString(36).substr(2, 9)}`,
          organisation_id: orgId,
          action_id: actionId,
          document_id: documentId,
          linked_by: userId,
          linked_at: nowIso()
        };
        links.push(newLink);
        setStorageItem('vigilen_action_documents', links);
        await this.addActionUpdate(actionId, 'Evidence Added', note);
        await this.logActivity('Action Evidence Linked', `Linked evidence document ${documentId} to action ${actionId}.`);
        data = newLink;
      }
    }

    await safeLogAuditEvent({
      actionCategory: 'Evidence',
      actionType: 'evidence_linked',
      entityType: 'evidence_document',
      entityId: documentId,
      entityLabel: doc?.title || 'Unknown Document',
      description: `Linked evidence document "${doc?.title || ''}" to action "${action?.title || ''}"`,
      metadata: {
        action_id: actionId,
        action_title: action?.title
      },
      severity: 'info'
    });

    return data;
  },

  async unlinkDocumentFromAction(actionId: string, documentId: string): Promise<void> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const doc = await fetchRecordById('evidence_documents', documentId);
    const action = await fetchRecordById('actions', actionId);

    if (shouldUseSupabase()) {
      const { error } = await supabase!
        .from('action_documents')
        .delete()
        .eq('action_id', actionId)
        .eq('document_id', documentId)
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('action_documents.delete active organisation', error);
      await this.addActionUpdate(actionId, 'Evidence Added', `Evidence document ${documentId} unlinked from action.`);
      await this.logActivity('Action Evidence Unlinked', `Unlinked evidence document ${documentId} from action ${actionId}.`);
    } else {
      const links = getStorageItem('vigilen_action_documents', MOCK_ACTION_DOCUMENTS);
      setStorageItem(
        'vigilen_action_documents',
        links.filter((link: ActionDocument) => !(link.action_id === actionId && link.document_id === documentId))
      );
      await this.addActionUpdate(actionId, 'Evidence Added', `Evidence document ${documentId} unlinked from action.`);
      await this.logActivity('Action Evidence Unlinked', `Unlinked evidence document ${documentId} from action ${actionId}.`);
    }

    await safeLogAuditEvent({
      actionCategory: 'Evidence',
      actionType: 'evidence_unlinked',
      entityType: 'evidence_document',
      entityId: documentId,
      entityLabel: doc?.title || 'Unknown Document',
      description: `Unlinked evidence document "${doc?.title || ''}" from action "${action?.title || ''}"`,
      metadata: {
        action_id: actionId,
        action_title: action?.title
      },
      severity: 'info'
    });
  },


  async linkActionToRequirement(requirementId: string, actionId: string): Promise<RequirementAction> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const userId = shouldUseSupabase() ? await getCurrentSupabaseUserId() : MOCK_PROFILE.id;

    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('requirement_actions')
        .insert([{ requirement_id: requirementId, action_id: actionId, organisation_id: orgId }])
        .select()
        .single();
      if (error) throwSupabaseError('requirement_actions.insert link', error);
      const { error: objectLinkError } = await supabase!
        .from('action_object_links')
        .upsert([{ organisation_id: orgId, action_id: actionId, object_type: 'requirement', object_id: requirementId, linked_by: userId }], {
          onConflict: 'organisation_id,action_id,object_type,object_id'
        });
      if (objectLinkError) throwSupabaseError('action_object_links.upsert requirement link', objectLinkError);
      return data;
    }

    const links = getStorageItem('vigilen_requirement_actions', MOCK_REQUIREMENT_ACTIONS);
    const newLink: RequirementAction = {
      id: `fw-req-action-${Math.random().toString(36).substr(2, 9)}`,
      requirement_id: requirementId,
      action_id: actionId,
      organisation_id: orgId,
      created_at: new Date().toISOString()
    };
    links.push(newLink);
    setStorageItem('vigilen_requirement_actions', links);
    const objectLinks = getStorageItem('vigilen_action_object_links', MOCK_ACTION_OBJECT_LINKS);
    if (!objectLinks.some((link: ActionObjectLink) => link.action_id === actionId && link.object_type === 'requirement' && link.object_id === requirementId)) {
      objectLinks.push({
        id: `fw-action-object-${Math.random().toString(36).substr(2, 9)}`,
        organisation_id: orgId,
        action_id: actionId,
        object_type: 'requirement',
        object_id: requirementId,
        linked_by: userId,
        linked_at: nowIso()
      });
      setStorageItem('vigilen_action_object_links', objectLinks);
    }
    return newLink;
  },

  async getPeople(): Promise<Person[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('people')
        .select('*')
        .eq('organisation_id', orgId)
        .order('display_name', { ascending: true });
      if (error) throwSupabaseError('people.select active organisation', error);
      return data || [];
    }

    initMockDb();
    return getStorageItem('vigilen_people', MOCK_PEOPLE);
  },

  async upsertPerson(input: Partial<Person> & Pick<Person, 'first_name' | 'last_name' | 'person_type'>): Promise<Person> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const displayName = input.display_name || `${input.first_name} ${input.last_name}`.trim();
    const payload = {
      ...input,
      organisation_id: orgId,
      display_name: displayName,
      active: input.active ?? true,
      updated_at: nowIso()
    };

    const before = input.id ? await fetchRecordById('people', input.id) : null;
    let after: Person;

    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('people')
        .upsert([payload])
        .select()
        .single();
      if (error) throwSupabaseError('people.upsert active organisation', error);
      await this.logActivity('Person Saved', `Saved person "${data.display_name}".`);
      after = data;
    } else {
      const people = getStorageItem('vigilen_people', MOCK_PEOPLE);
      if (input.id) {
        const idx = people.findIndex((person: Person) => person.id === input.id);
        if (idx !== -1) {
          after = { ...people[idx], ...payload };
          people[idx] = after;
          setStorageItem('vigilen_people', people);
          await this.logActivity('Person Saved', `Saved person "${after.display_name}".`);
        } else {
          throw new Error('Person not found');
        }
      } else {
        after = {
          id: `person-${Math.random().toString(36).substr(2, 9)}`,
          organisation_id: orgId,
          employee_number: input.employee_number || null,
          first_name: input.first_name,
          last_name: input.last_name,
          display_name: displayName,
          email: input.email || null,
          department: input.department || null,
          role: input.role || null,
          person_type: input.person_type,
          start_date: input.start_date || null,
          end_date: input.end_date || null,
          active: input.active ?? true,
          notes: input.notes || null,
          created_at: nowIso(),
          updated_at: nowIso()
        };
        people.unshift(after);
        setStorageItem('vigilen_people', people);
        await this.logActivity('Person Added', `Created person "${after.display_name}".`);
      }
    }

    let actionType = 'person_edited';
    let undoAvailable = false;
    let undoActionType: string | null = null;
    let undoExpiresAt: string | null = null;
    let description = `Edited person details for "${after.display_name}"`;
    let severity: 'info' | 'warning' | 'critical' = 'info';

    if (!before) {
      actionType = 'person_created';
      description = `Added person "${after.display_name}"`;
    } else if (input.active === false && before.active === true) {
      actionType = 'person_archived';
      undoAvailable = true;
      undoActionType = 'restore_person';
      undoExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      description = `Archived person "${after.display_name}"`;
      severity = 'warning';
    } else if (input.active === true && before.active === false) {
      actionType = 'person_restored';
      description = `Restored person "${after.display_name}"`;
    }

    await safeLogAuditEvent({
      actionCategory: 'Competency',
      actionType,
      entityType: 'person',
      entityId: after.id,
      entityLabel: after.display_name,
      description,
      beforeSnapshot: before,
      afterSnapshot: after,
      changedFields: before ? getChangedFields(before, after) : null,
      undoAvailable,
      undoActionType,
      undoExpiresAt,
      severity
    });

    return after;
  },

  async getCompetencyTypes(): Promise<CompetencyType[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('competency_types')
        .select('*')
        .eq('organisation_id', orgId)
        .order('category')
        .order('title');
      if (error) throwSupabaseError('competency_types.select active organisation', error);
      return data || [];
    }

    initMockDb();
    return getStorageItem('vigilen_competency_types', MOCK_COMPETENCY_TYPES);
  },

  async upsertCompetencyType(input: Partial<CompetencyType> & Pick<CompetencyType, 'title' | 'category'>): Promise<CompetencyType> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const payload = {
      ...input,
      organisation_id: orgId,
      description: input.description || null,
      validity_period_months: input.validity_period_months ?? null,
      refresher_period_months: input.refresher_period_months ?? null,
      evidence_required: input.evidence_required ?? true,
      default_risk_level: input.default_risk_level || 'Medium',
      active: input.active ?? true,
      review_period_months: input.review_period_months ?? null,
      warning_days: input.warning_days ?? null,
      updated_at: nowIso()
    };

    let before: CompetencyType | null = null;
    let after: CompetencyType;

    if (shouldUseSupabase()) {
      let existingId = input.id || null;
      if (!existingId) {
        const { data: existing, error: existingError } = await supabase!
          .from('competency_types')
          .select('id')
          .eq('organisation_id', orgId)
          .eq('title', input.title)
          .eq('category', input.category)
          .maybeSingle();
        if (existingError) throwSupabaseError('competency_types.select before upsert', existingError);
        existingId = existing?.id || null;
      }
      if (existingId) {
        before = await fetchRecordById('competency_types', existingId);
      }

      const cleanPayload = {
        title: payload.title,
        category: payload.category,
        organisation_id: payload.organisation_id,
        description: payload.description,
        validity_period_months: payload.validity_period_months,
        refresher_period_months: payload.refresher_period_months,
        evidence_required: payload.evidence_required,
        default_risk_level: payload.default_risk_level,
        active: payload.active,
        updated_at: payload.updated_at
      };

      const query = existingId
        ? supabase!.from('competency_types').update(cleanPayload).eq('id', existingId).eq('organisation_id', orgId)
        : supabase!.from('competency_types').insert([cleanPayload]);
      const { data, error } = await query.select().single();
      if (error) throwSupabaseError('competency_types.upsert active organisation', error);
      await this.logActivity('Competency Type Saved', `Saved competency type "${data.title}".`);
      after = data;
    } else {
      const types = getStorageItem('vigilen_competency_types', MOCK_COMPETENCY_TYPES);
      const idx = types.findIndex((type: CompetencyType) =>
        input.id ? type.id === input.id : type.title.toLowerCase() === input.title.toLowerCase() && type.category === input.category
      );
      if (idx !== -1) {
        before = types[idx];
        after = { ...types[idx], ...payload };
        types[idx] = after;
        setStorageItem('vigilen_competency_types', types);
        await this.logActivity('Competency Type Saved', `Saved competency type "${after.title}".`);
      } else {
        after = {
          id: `comp-type-${Math.random().toString(36).substr(2, 9)}`,
          organisation_id: orgId,
          title: input.title,
          category: input.category,
          description: input.description || null,
          validity_period_months: input.validity_period_months ?? null,
          refresher_period_months: input.refresher_period_months ?? null,
          evidence_required: input.evidence_required ?? true,
          default_risk_level: input.default_risk_level || 'Medium',
          active: input.active ?? true,
          review_period_months: input.review_period_months ?? null,
          warning_days: input.warning_days ?? null,
          created_at: nowIso(),
          updated_at: nowIso()
        };
        types.push(after);
        setStorageItem('vigilen_competency_types', types);
        await this.logActivity('Competency Type Saved', `Saved competency type "${after.title}".`);
      }
    }

    let actionType = 'competency_type_edited';
    let undoAvailable = false;
    let undoActionType: string | null = null;
    let undoExpiresAt: string | null = null;
    let description = `Edited competency type "${after.title}"`;
    let severity: 'info' | 'warning' | 'critical' = 'info';

    if (!before) {
      actionType = 'competency_type_created';
      description = `Created competency type "${after.title}"`;
    } else if (input.active === false && before.active === true) {
      actionType = 'competency_type_archived';
      undoAvailable = true;
      undoActionType = 'restore_competency_type';
      undoExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      description = `Archived competency type "${after.title}"`;
      severity = 'warning';
    } else if (input.active === true && before.active === false) {
      actionType = 'competency_type_restored';
      description = `Restored competency type "${after.title}"`;
    }

    await safeLogAuditEvent({
      actionCategory: 'Competency',
      actionType,
      entityType: 'competency_type',
      entityId: after.id,
      entityLabel: after.title,
      description,
      beforeSnapshot: before,
      afterSnapshot: after,
      changedFields: before ? getChangedFields(before, after) : null,
      undoAvailable,
      undoActionType,
      undoExpiresAt,
      severity
    });

    return after;
  },

  async importCompetencyTemplateItems(items: CompetencyTemplateItem[]): Promise<CompetencyType[]> {
    const created: CompetencyType[] = [];
    for (const item of items) {
      const competencyType = await this.upsertCompetencyType({
        title: item.title,
        category: item.category,
        description: item.description || null,
        validity_period_months: item.validity_period_months ?? 36,
        refresher_period_months: item.refresher_period_months ?? 12,
        evidence_required: item.evidence_required ?? true,
        default_risk_level: item.default_risk_level || 'Medium',
        active: true
      });
      created.push(competencyType);
    }
    await this.logActivity('Competency Templates Imported', `Imported ${created.length} competency type${created.length === 1 ? '' : 's'}.`);
    return created;
  },

  async getCompetencyRecords(): Promise<CompetencyRecord[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('competency_records')
        .select('*')
        .eq('organisation_id', orgId)
        .order('expiry_date', { ascending: true, nullsFirst: false });
      if (error) throwSupabaseError('competency_records.select active organisation', error);
      return data || [];
    }

    initMockDb();
    return getStorageItem('vigilen_competency_records', MOCK_COMPETENCY_RECORDS);
  },

  async upsertCompetencyRecord(input: Partial<CompetencyRecord> & Pick<CompetencyRecord, 'person_id' | 'competency_type_id'>): Promise<CompetencyRecord> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const status = input.status || calculateCompetencyStatus({
      completed_date: input.completed_date || null,
      expiry_date: input.expiry_date || null,
      status: 'Missing'
    });
    const recordId = input.id || null;
    const payload = {
      organisation_id: orgId,
      person_id: input.person_id,
      competency_type_id: input.competency_type_id,
      completed_date: input.completed_date || null,
      expiry_date: input.expiry_date || null,
      trainer: input.trainer || null,
      provider: input.provider || null,
      certificate_number: input.certificate_number || null,
      status,
      notes: input.notes || null,
      updated_at: nowIso()
    };
    const supabasePayload = recordId ? { id: recordId, ...payload } : payload;

    let before: CompetencyRecord | null = null;
    if (recordId) {
      before = await fetchRecordById('competency_records', recordId);
    } else {
      if (shouldUseSupabase()) {
        const { data } = await supabase!
          .from('competency_records')
          .select('*')
          .eq('person_id', input.person_id)
          .eq('competency_type_id', input.competency_type_id)
          .maybeSingle();
        before = data;
      } else {
        const records = getStorageItem('vigilen_competency_records', MOCK_COMPETENCY_RECORDS);
        before = records.find((r: CompetencyRecord) => r.person_id === input.person_id && r.competency_type_id === input.competency_type_id) || null;
      }
    }

    let after: CompetencyRecord;
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('competency_records')
        .upsert([supabasePayload], { onConflict: 'organisation_id,person_id,competency_type_id' })
        .select()
        .single();
      if (error) throwSupabaseError('competency_records.upsert active organisation', error);
      await this.logActivity('Competency Record Saved', `Saved competency record ${data.id}.`);
      after = data;
    } else {
      const records = getStorageItem('vigilen_competency_records', MOCK_COMPETENCY_RECORDS);
      const idx = records.findIndex((record: CompetencyRecord) =>
        recordId
          ? record.id === recordId
          : record.person_id === input.person_id && record.competency_type_id === input.competency_type_id
      );
      if (idx !== -1) {
        after = { ...records[idx], ...payload };
        records[idx] = after;
        setStorageItem('vigilen_competency_records', records);
        await this.logActivity('Competency Record Saved', `Saved competency record ${after.id}.`);
      } else {
        after = {
          id: `comp-rec-${Math.random().toString(36).substr(2, 9)}`,
          organisation_id: orgId,
          person_id: input.person_id,
          competency_type_id: input.competency_type_id,
          completed_date: input.completed_date || null,
          expiry_date: input.expiry_date || null,
          trainer: input.trainer || null,
          provider: input.provider || null,
          certificate_number: input.certificate_number || null,
          status,
          notes: input.notes || null,
          created_at: nowIso(),
          updated_at: nowIso()
        };
        records.unshift(after);
        setStorageItem('vigilen_competency_records', records);
        await this.logActivity('Competency Record Added', `Created competency record ${after.id}.`);
      }
    }

    let actionType = 'competency_record_edited';
    let description = `Edited competency record (ID: ${after.id})`;
    if (!before) {
      actionType = 'competency_record_created';
      description = `Created competency record (ID: ${after.id})`;
    } else if (input.status && input.status !== before.status) {
      actionType = 'competency_record_status_changed';
      description = `Changed status of competency record (ID: ${after.id}) to "${after.status}"`;
    }

    await safeLogAuditEvent({
      actionCategory: 'Competency',
      actionType,
      entityType: 'competency_record',
      entityId: after.id,
      entityLabel: 'Competency Record',
      description,
      beforeSnapshot: before,
      afterSnapshot: after,
      changedFields: before ? getChangedFields(before, after) : null,
      severity: 'info'
    });

    void this.createWorkspaceNotification({
      recipient_role: 'Owner',
      title: !before ? 'Competency record created' : 'Competency record updated',
      body: `Status: ${after.status}.`,
      type: 'competency',
      severity: after.status === 'Expired' || after.status === 'Missing' ? 'warning' : 'info',
      entity_type: 'competency_record',
      entity_id: after.id,
      entity_label: 'Competency Record',
      action_url: `/dashboard/competencies`,
      metadata: { person_id: after.person_id, competency_type_id: after.competency_type_id, status: after.status }
    }).catch(error => console.warn('Notification creation failed after competency record save.', error));

    return after;
  },

  async deleteCompetencyRecord(recordId: string): Promise<void> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const before = await fetchRecordById('competency_records', recordId);

    if (shouldUseSupabase()) {
      const { error } = await supabase!
        .from('competency_records')
        .delete()
        .eq('id', recordId)
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('competency_records.delete active organisation', error);
      await this.logActivity('Competency Record Deleted', `Deleted competency record ${recordId}.`);
    } else {
      const records = getStorageItem('vigilen_competency_records', MOCK_COMPETENCY_RECORDS);
      setStorageItem(
        'vigilen_competency_records',
        records.filter((record: CompetencyRecord) => record.id !== recordId)
      );
      await this.logActivity('Competency Record Deleted', `Deleted competency record ${recordId}.`);
    }

    await safeLogAuditEvent({
      actionCategory: 'Competency',
      actionType: 'competency_record_deleted',
      entityType: 'competency_record',
      entityId: recordId,
      entityLabel: 'Competency Record',
      description: `Deleted competency record (ID: ${recordId})`,
      beforeSnapshot: before,
      undoAvailable: true,
      undoActionType: 'restore_competency_record',
      undoExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      severity: 'warning'
    });
  },

  async getCompetencyRecordDocuments(): Promise<CompetencyRecordDocument[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('competency_record_documents')
        .select('*')
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('competency_record_documents.select active organisation', error);
      return data || [];
    }

    initMockDb();
    return getStorageItem('vigilen_competency_record_documents', MOCK_COMPETENCY_RECORD_DOCUMENTS);
  },

  async linkDocumentToCompetencyRecord(recordId: string, documentId: string): Promise<CompetencyRecordDocument> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const userId = shouldUseSupabase() ? await getCurrentSupabaseUserId() : MOCK_PROFILE.id;

    const doc = await fetchRecordById('evidence_documents', documentId);
    const record = await fetchRecordById('competency_records', recordId);

    let data: CompetencyRecordDocument;
    if (shouldUseSupabase()) {
      const { data: res, error } = await supabase!
        .from('competency_record_documents')
        .upsert([{ organisation_id: orgId, competency_record_id: recordId, document_id: documentId, linked_by: userId }], {
          onConflict: 'competency_record_id,document_id'
        })
        .select()
        .single();
      if (error) throwSupabaseError('competency_record_documents.insert active organisation', error);
      await this.logActivity('Competency Evidence Linked', `Linked evidence document ${documentId} to competency record ${recordId}.`);
      data = res;
    } else {
      const links = getStorageItem('vigilen_competency_record_documents', MOCK_COMPETENCY_RECORD_DOCUMENTS);
      const existing = links.find((link: CompetencyRecordDocument) => link.competency_record_id === recordId && link.document_id === documentId);
      if (existing) {
        data = existing;
      } else {
        const newLink: CompetencyRecordDocument = {
          id: `comp-doc-${Math.random().toString(36).substr(2, 9)}`,
          organisation_id: orgId,
          competency_record_id: recordId,
          document_id: documentId,
          linked_by: userId,
          linked_at: nowIso()
        };
        links.push(newLink);
        setStorageItem('vigilen_competency_record_documents', links);
        await this.logActivity('Competency Evidence Linked', `Linked evidence document ${documentId} to competency record ${recordId}.`);
        data = newLink;
      }
    }

    await safeLogAuditEvent({
      actionCategory: 'Evidence',
      actionType: 'evidence_linked',
      entityType: 'evidence_document',
      entityId: documentId,
      entityLabel: doc?.title || 'Unknown Document',
      description: `Linked evidence document "${doc?.title || ''}" to competency record (ID: ${recordId})`,
      metadata: {
        competency_record_id: recordId,
        person_id: record?.person_id
      },
      severity: 'info'
    });

    return data;
  },

  async unlinkDocumentFromCompetencyRecord(recordId: string, documentId: string): Promise<void> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const doc = await fetchRecordById('evidence_documents', documentId);
    const record = await fetchRecordById('competency_records', recordId);

    if (shouldUseSupabase()) {
      const { error } = await supabase!
        .from('competency_record_documents')
        .delete()
        .eq('competency_record_id', recordId)
        .eq('document_id', documentId)
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('competency_record_documents.delete active organisation', error);
      await this.logActivity('Competency Evidence Unlinked', `Unlinked evidence document ${documentId} from competency record ${recordId}.`);
    } else {
      const links = getStorageItem('vigilen_competency_record_documents', MOCK_COMPETENCY_RECORD_DOCUMENTS);
      setStorageItem(
        'vigilen_competency_record_documents',
        links.filter((link: CompetencyRecordDocument) => !(link.competency_record_id === recordId && link.document_id === documentId))
      );
      await this.logActivity('Competency Evidence Unlinked', `Unlinked evidence document ${documentId} from competency record ${recordId}.`);
    }

    await safeLogAuditEvent({
      actionCategory: 'Evidence',
      actionType: 'evidence_unlinked',
      entityType: 'evidence_document',
      entityId: documentId,
      entityLabel: doc?.title || 'Unknown Document',
      description: `Unlinked evidence document "${doc?.title || ''}" from competency record (ID: ${recordId})`,
      metadata: {
        competency_record_id: recordId,
        person_id: record?.person_id
      },
      severity: 'info'
    });
  },

  async uploadCompetencyEvidence(recordId: string, file: File): Promise<EvidenceDocument> {
    const title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim() || file.name;
    const doc = await this.uploadDocumentFile({
      file,
      title,
      category: 'Training & Competency',
      expiry_date: null,
      issue_date: new Date().toISOString().split('T')[0],
      metadata: {
        source: 'competency_record',
        competency_record_id: recordId
      },
      tags: ['competency'],
      status: 'Unclassified'
    });
    await this.linkDocumentToCompetencyRecord(recordId, doc.id);
    return doc;
  },

  async getRequirementCompetencyTypes(): Promise<RequirementCompetencyType[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('requirement_competency_types')
        .select('*')
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('requirement_competency_types.select active organisation', error);
      return data || [];
    }

    initMockDb();
    return getStorageItem('vigilen_requirement_competency_types', MOCK_REQUIREMENT_COMPETENCY_TYPES);
  },

  async linkCompetencyTypeToRequirement(requirementId: string, competencyTypeId: string): Promise<RequirementCompetencyType> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const userId = shouldUseSupabase() ? await getCurrentSupabaseUserId() : MOCK_PROFILE.id;

    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('requirement_competency_types')
        .upsert([{ organisation_id: orgId, requirement_id: requirementId, competency_type_id: competencyTypeId, linked_by: userId }], {
          onConflict: 'requirement_id,competency_type_id'
        })
        .select()
        .single();
      if (error) throwSupabaseError('requirement_competency_types.insert active organisation', error);
      return data;
    }

    const links = getStorageItem('vigilen_requirement_competency_types', MOCK_REQUIREMENT_COMPETENCY_TYPES);
    const existing = links.find((link: RequirementCompetencyType) => link.requirement_id === requirementId && link.competency_type_id === competencyTypeId);
    if (existing) return existing;
    const newLink: RequirementCompetencyType = {
      id: `req-comp-${Math.random().toString(36).substr(2, 9)}`,
      organisation_id: orgId,
      requirement_id: requirementId,
      competency_type_id: competencyTypeId,
      linked_by: userId,
      linked_at: nowIso()
    };
    links.push(newLink);
    setStorageItem('vigilen_requirement_competency_types', links);
    return newLink;
  },

  async unlinkCompetencyTypeFromRequirement(requirementId: string, competencyTypeId: string): Promise<void> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    if (shouldUseSupabase()) {
      const { error } = await supabase!
        .from('requirement_competency_types')
        .delete()
        .eq('requirement_id', requirementId)
        .eq('competency_type_id', competencyTypeId)
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('requirement_competency_types.delete active organisation', error);
      return;
    }

    const links = getStorageItem('vigilen_requirement_competency_types', MOCK_REQUIREMENT_COMPETENCY_TYPES);
    setStorageItem(
      'vigilen_requirement_competency_types',
      links.filter((link: RequirementCompetencyType) => !(link.requirement_id === requirementId && link.competency_type_id === competencyTypeId))
    );
  },

  async createActionForCompetencyGap(input: {
    personId: string;
    competencyTypeId: string;
    competencyRecordId?: string | null;
    title: string;
    dueDate?: string | null;
  }): Promise<Action> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const userId = shouldUseSupabase() ? await getCurrentSupabaseUserId() : MOCK_PROFILE.id;
    const action = await this.createAction({
      title: input.title,
      description: 'Created from a competency gap.',
      owner: null,
      status: 'Open',
      due_date: input.dueDate || null
    });
    const objectLinks = [
      { organisation_id: orgId, action_id: action.id, object_type: 'person', object_id: input.personId, linked_by: userId },
      { organisation_id: orgId, action_id: action.id, object_type: 'competency_type', object_id: input.competencyTypeId, linked_by: userId },
      ...(input.competencyRecordId ? [{ organisation_id: orgId, action_id: action.id, object_type: 'competency_record', object_id: input.competencyRecordId, linked_by: userId }] : [])
    ];

    if (shouldUseSupabase()) {
      const { error } = await supabase!
        .from('action_object_links')
        .upsert(objectLinks, { onConflict: 'organisation_id,action_id,object_type,object_id' });
      if (error) throwSupabaseError('action_object_links.upsert competency gap links', error);
    } else {
      const links = getStorageItem('vigilen_action_object_links', MOCK_ACTION_OBJECT_LINKS);
      objectLinks.forEach(link => {
        if (!links.some((existing: ActionObjectLink) =>
          existing.action_id === link.action_id &&
          existing.object_type === link.object_type &&
          existing.object_id === link.object_id
        )) {
          links.push({
            id: `fw-action-object-${Math.random().toString(36).substr(2, 9)}`,
            ...link,
            linked_at: nowIso()
          });
        }
      });
      setStorageItem('vigilen_action_object_links', links);
    }

    await this.addActionUpdate(action.id, 'Note', 'Action created from competency gap.');
    return action;
  },


  // Evidence Documents (Vault)
  async getDocuments(): Promise<EvidenceDocument[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('evidence_documents')
        .select('*')
        .eq('organization_id', orgId)
        .neq('status', 'deleted')
        .is('permanently_deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throwSupabaseError('evidence_documents.select active organization', error);
      return data || [];
    } else {
      initMockDb();
      return getStorageItem('vigilen_documents', MOCK_DOCUMENTS).filter((doc: EvidenceDocument) => doc.status !== 'deleted' && !doc.permanently_deleted_at);
    }
  },

  async getArchivedDocuments(): Promise<EvidenceDocument[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('evidence_documents')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'deleted')
        .is('permanently_deleted_at', null)
        .order('archived_at', { ascending: false, nullsFirst: false });
      if (error) throwSupabaseError('evidence_documents.select archived organization', error);
      return data || [];
    }

    initMockDb();
    return getStorageItem('vigilen_documents', MOCK_DOCUMENTS).filter((doc: EvidenceDocument) => doc.status === 'deleted' && !doc.permanently_deleted_at);
  },

  async findPossibleDuplicateDocuments(file: File, fileHash?: string | null): Promise<EvidenceDocument[]> {
    const hash = fileHash || await calculateEvidenceFileHash(file);
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const matches = new Map<string, EvidenceDocument>();

      if (hash) {
        const { data, error } = await supabase!
          .from('evidence_documents')
          .select('*')
          .eq('organization_id', orgId)
          .is('permanently_deleted_at', null)
          .eq('file_hash', hash)
          .order('created_at', { ascending: false });
        if (error) throwSupabaseError('evidence_documents.select duplicate hash candidates', error);
        (data || []).forEach(document => matches.set(document.id, document));
      }

      const { data: metadataMatches, error: metadataError } = await supabase!
        .from('evidence_documents')
        .select('*')
        .eq('organization_id', orgId)
        .is('permanently_deleted_at', null)
        .eq('original_file_name', file.name)
        .eq('file_size_bytes', file.size)
        .eq('mime_type', file.type || '')
        .order('created_at', { ascending: false });
      if (metadataError) throwSupabaseError('evidence_documents.select duplicate metadata candidates', metadataError);
      (metadataMatches || []).forEach(document => matches.set(document.id, document));

      return Array.from(matches.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    initMockDb();
    return getStorageItem('vigilen_documents', MOCK_DOCUMENTS).filter((doc: EvidenceDocument) =>
      !doc.permanently_deleted_at &&
      (doc.file_hash === hash ||
        ((doc.original_file_name || doc.file_name) === file.name &&
          doc.file_size_bytes === file.size &&
          (doc.mime_type || '') === file.type))
    );
  },

  async addDocument(doc: Omit<EvidenceDocument, 'id' | 'created_at' | 'updated_at' | 'organization_id'>): Promise<EvidenceDocument> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    if (shouldUseSupabase()) {
      throw new Error('Production uploads must use private Supabase Storage.');
    } else {
      const docs = getStorageItem('vigilen_documents', MOCK_DOCUMENTS);
      const newDoc: EvidenceDocument = {
        ...doc,
        id: `doc-${Math.random().toString(36).substr(2, 9)}`,
        organization_id: orgId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      docs.unshift(newDoc);
      setStorageItem('vigilen_documents', docs);
      
      // Auto register log
      await this.logActivity('Document Uploaded', `Uploaded document "${newDoc.title}" (${newDoc.file_name})`);
      
      // Attempt to map to Matrix cell if we find matching category/keywords
      await this.autoMapCell(newDoc);

      await safeLogAuditEvent({
        actionCategory: 'Evidence',
        actionType: 'evidence_uploaded',
        entityType: 'evidence_document',
        entityId: newDoc.id,
        entityLabel: newDoc.title,
        description: `Uploaded evidence document "${newDoc.title}"`,
        afterSnapshot: newDoc,
        severity: 'info'
      });
      
      return newDoc;
    }
  },

  async uploadDocumentFile(input: EvidenceUploadInput & { status: DocumentStatus }): Promise<EvidenceDocument> {
    if (!shouldUseSupabase()) {
      return this.addDocument({
        title: input.title,
        file_url: null,
        file_name: input.file.name,
        original_file_name: input.file.name,
        safe_file_name: sanitizeEvidenceFilename(input.file.name),
        storage_path: null,
        mime_type: input.file.type,
        file_hash: input.file_hash || await calculateEvidenceFileHash(input.file),
        file_size_bytes: input.file.size,
        category: input.category,
        status: input.status,
        expiry_date: input.expiry_date,
        issue_date: input.issue_date,
        review_date: input.review_date || null,
        training_date: input.training_date || null,
        calibration_date: input.calibration_date || null,
        tags: input.tags || [],
        metadata: input.metadata || {},
        uploaded_by: MOCK_PROFILE.id
      });
    }

    if (!supabase) throw new Error('Supabase client is not configured.');

    validateEvidenceFile(input.file);

    const orgId = await getCurrentSupabaseOrganizationId();
    const userId = await getCurrentSupabaseUserId();
    const fileHash = input.file_hash || await calculateEvidenceFileHash(input.file);
    const documentId = crypto.randomUUID();
    const originalFilename = input.file.name;
    const safeFilename = sanitizeEvidenceFilename(originalFilename);
    const storagePath = buildEvidenceStoragePath(orgId, documentId, safeFilename);

    const { error: uploadError } = await supabase.storage
      .from(evidenceStorageBucket)
      .upload(storagePath, input.file, {
        contentType: input.file.type,
        upsert: false
      });

    if (uploadError) throwSupabaseError('storage.objects.upload evidence document', uploadError);

    const insertPayload = {
      id: documentId,
      organization_id: orgId,
      uploaded_by: userId,
      title: input.title.trim(),
      file_url: null,
      file_name: safeFilename,
      original_file_name: originalFilename,
      safe_file_name: safeFilename,
      storage_path: storagePath,
      mime_type: input.file.type,
      file_hash: fileHash,
      file_size_bytes: input.file.size,
      category: input.category,
      status: input.status,
      expiry_date: input.expiry_date,
      issue_date: input.issue_date,
      review_date: input.review_date || null,
      training_date: input.training_date || null,
      calibration_date: input.calibration_date || null,
      tags: input.tags || [],
      metadata: input.metadata || {}
    };

    const { data, error } = await supabase
      .from('evidence_documents')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      await supabase.storage.from(evidenceStorageBucket).remove([storagePath]);
      throwSupabaseError('evidence_documents.insert private storage record', error);
    }

    await this.logActivity('Document Uploaded', `Uploaded document "${data.title}" (${data.original_file_name || data.file_name})`);

    await safeLogAuditEvent({
      actionCategory: 'Evidence',
      actionType: 'evidence_uploaded',
      entityType: 'evidence_document',
      entityId: data.id,
      entityLabel: data.title,
      description: `Uploaded evidence document "${data.title}"`,
      afterSnapshot: data,
      severity: 'info'
    });

    return data;
  },

  async getDocumentSignedUrl(docId: string): Promise<string> {
    if (!shouldUseSupabase()) {
      const doc = getStorageItem('vigilen_documents', MOCK_DOCUMENTS).find((item: EvidenceDocument) => item.id === docId);
      if (!doc) throw new Error('Document not found.');
      if (doc.file_url) return doc.file_url;
      throw new Error('Demo document has no private file attached.');
    }

    if (!supabase) throw new Error('Supabase client is not configured.');

    const orgId = await getCurrentSupabaseOrganizationId();
    const { data: doc, error: docError } = await supabase
      .from('evidence_documents')
      .select('id, organization_id, status, storage_path')
      .eq('id', docId)
      .eq('organization_id', orgId)
      .is('permanently_deleted_at', null)
      .maybeSingle();

    if (docError) throwSupabaseError('evidence_documents.select signed url target', docError);
    if (!doc) throw new Error('Document not found or no longer available.');
    if (!doc.storage_path) throw new Error('Document record has no private storage path.');

    const { data, error } = await supabase.storage
      .from(evidenceStorageBucket)
      .createSignedUrl(doc.storage_path, signedUrlTtlSeconds);

    if (error) throwSupabaseError('storage.objects.createSignedUrl evidence document', error);
    if (!data?.signedUrl) throw new Error('Supabase did not return a signed URL.');
    return data.signedUrl;
  },

  async updateDocument(docId: string, updates: Partial<EvidenceDocument>): Promise<EvidenceDocument> {
    const before = await fetchRecordById('evidence_documents', docId);
    let after: EvidenceDocument;
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('evidence_documents')
        .update(updates)
        .eq('id', docId)
        .eq('organization_id', orgId)
        .is('permanently_deleted_at', null)
        .select()
        .single();
      if (error) throwSupabaseError('evidence_documents.update active organization', error);
      after = data;
    } else {
      const docs = getStorageItem('vigilen_documents', MOCK_DOCUMENTS);
      const idx = docs.findIndex((d: any) => d.id === docId);
      if (idx === -1) throw new Error('Document not found');
      after = { ...docs[idx], ...updates, updated_at: new Date().toISOString() };
      docs[idx] = after;
      setStorageItem('vigilen_documents', docs);

      // Check if status changed, and update corresponding matrix cells
      const cells = getStorageItem('vigilen_cells', MOCK_CELLS);
      let cellUpdated = false;
      const updatedCells = cells.map((cell: MatrixCell) => {
        if (cell.document_id === docId) {
          cellUpdated = true;
          let cellStatus: CellStatus = 'Compliant';
          if (after.status === 'Expired') cellStatus = 'Expired';
          else if (after.status === 'Expiring Soon') cellStatus = 'Expiring Soon';
          return { ...cell, status: cellStatus, last_checked_at: new Date().toISOString() };
        }
        return cell;
      });
      if (cellUpdated) {
        setStorageItem('vigilen_cells', updatedCells);
      }

      await this.logActivity('Document Updated', `Modified metadata or status for "${after.title}"`);
    }

    await safeLogAuditEvent({
      actionCategory: 'Evidence',
      actionType: 'evidence_metadata_edited',
      entityType: 'evidence_document',
      entityId: docId,
      entityLabel: after.title,
      description: `Updated metadata for evidence document "${after.title}"`,
      beforeSnapshot: before,
      afterSnapshot: after,
      changedFields: getChangedFields(before, after),
      severity: 'info'
    });

    return after;
  },

  async deleteDocument(docId: string): Promise<void> {
    const before = await fetchRecordById('evidence_documents', docId);
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const userId = await getCurrentSupabaseUserId();
      const archivedAt = new Date().toISOString();
      const { error } = await supabase!
        .from('evidence_documents')
        .update({ status: 'deleted', archived_at: archivedAt, archived_by: userId, deleted_at: archivedAt, deleted_by: userId, updated_at: archivedAt })
        .eq('id', docId)
        .eq('organization_id', orgId)
        .select('id')
        .single();
      if (error) throwSupabaseError('evidence_documents.soft-delete active organization', error);

      const { error: matrixError } = await supabase!
        .from('matrix_cells')
        .update({
          document_id: null,
          status: 'Missing',
          last_checked_at: new Date().toISOString()
        })
        .eq('organization_id', orgId)
        .eq('document_id', docId);
      if (matrixError) throwSupabaseError('matrix_cells.unlink soft-deleted document', matrixError);

      const { data: packs, error: packsError } = await supabase!
        .from('audit_packs')
        .select('id, documents')
        .eq('organization_id', orgId);
      if (packsError) throwSupabaseError('audit_packs.select for soft-deleted document cleanup', packsError);

      await Promise.all(
        (packs || [])
          .filter((pack: Pick<AuditPack, 'id' | 'documents'>) => pack.documents.includes(docId))
          .map((pack: Pick<AuditPack, 'id' | 'documents'>) =>
            supabase!
              .from('audit_packs')
              .update({
                documents: pack.documents.filter(id => id !== docId),
                updated_at: new Date().toISOString()
              })
              .eq('id', pack.id)
              .eq('organization_id', orgId)
              .then(({ error: packError }) => {
                if (packError) throwSupabaseError('audit_packs.unlink soft-deleted document', packError);
              })
          )
      );
    } else {
      const docs = getStorageItem('vigilen_documents', MOCK_DOCUMENTS);
      const archivedAt = new Date().toISOString();
      const updatedDocs = docs.map((d: EvidenceDocument) =>
        d.id === docId ? { ...d, status: 'deleted' as DocumentStatus, archived_at: archivedAt, archived_by: MOCK_PROFILE.id, deleted_at: archivedAt, deleted_by: MOCK_PROFILE.id, updated_at: archivedAt } : d
      );
      setStorageItem('vigilen_documents', updatedDocs);

      // Unlink cells
      const cells = getStorageItem('vigilen_cells', MOCK_CELLS);
      const updatedCells = cells.map((cell: MatrixCell) => {
        if (cell.document_id === docId) {
          return { ...cell, document_id: null, status: 'Missing' as CellStatus, last_checked_at: new Date().toISOString() };
        }
        return cell;
      });
      setStorageItem('vigilen_cells', updatedCells);
      await this.logActivity('Document Removed', `Deleted document with ID ${docId}`);
    }

    await safeLogAuditEvent({
      actionCategory: 'Evidence',
      actionType: 'evidence_archived',
      entityType: 'evidence_document',
      entityId: docId,
      entityLabel: before?.title || 'Unknown Document',
      description: `Archived/soft-deleted evidence document "${before?.title || ''}"`,
      beforeSnapshot: before,
      undoAvailable: true,
      undoActionType: 'restore_evidence',
      undoExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      severity: 'warning'
    });
  },

  async restoreDocument(docId: string): Promise<EvidenceDocument> {
    const before = await fetchRecordById('evidence_documents', docId);
    let after: EvidenceDocument;
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('evidence_documents')
        .update({ status: 'Active', archived_at: null, archived_by: null, deleted_at: null, deleted_by: null, updated_at: new Date().toISOString() })
        .eq('id', docId)
        .eq('organization_id', orgId)
        .is('permanently_deleted_at', null)
        .select()
        .single();
      if (error) throwSupabaseError('evidence_documents.restore archived document', error);
      await this.logActivity('Document Restored', `Restored evidence document ${docId}.`);
      after = data;
    } else {
      const docs = getStorageItem('vigilen_documents', MOCK_DOCUMENTS);
      const idx = docs.findIndex((doc: EvidenceDocument) => doc.id === docId);
      if (idx === -1) throw new Error('Document not found.');
      after = { ...docs[idx], status: 'Active', archived_at: null, archived_by: null, deleted_at: null, deleted_by: null, updated_at: new Date().toISOString() };
      docs[idx] = after;
      setStorageItem('vigilen_documents', docs);
      await this.logActivity('Document Restored', `Restored evidence document ${docId}.`);
    }

    await safeLogAuditEvent({
      actionCategory: 'Evidence',
      actionType: 'evidence_restored',
      entityType: 'evidence_document',
      entityId: docId,
      entityLabel: after.title,
      description: `Restored archived/soft-deleted evidence document "${after.title}"`,
      beforeSnapshot: before,
      afterSnapshot: after,
      severity: 'info'
    });

    return after;
  },

  async permanentlyDeleteDocument(docId: string): Promise<void> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const now = new Date().toISOString();
      const { data: doc, error: docError } = await supabase!
        .from('evidence_documents')
        .select('*')
        .eq('id', docId)
        .eq('organization_id', orgId)
        .maybeSingle();
      if (docError) throwSupabaseError('evidence_documents.select permanent delete target', docError);

      await Promise.all([
        supabase!.from('requirement_documents').delete().eq('organisation_id', orgId).eq('document_id', docId),
        supabase!.from('requirement_evidence_criterion_matches').delete().eq('organisation_id', orgId).eq('document_id', docId),
        supabase!.from('action_documents').delete().eq('organisation_id', orgId).eq('document_id', docId),
        supabase!.from('competency_record_documents').delete().eq('organisation_id', orgId).eq('document_id', docId)
      ].map(promise => promise.then(({ error }) => {
        if (error) throwSupabaseError('document link cleanup permanent delete', error);
      })));

      const { data: packs, error: packsError } = await supabase!
        .from('audit_packs')
        .select('id, documents')
        .eq('organization_id', orgId);
      if (packsError) throwSupabaseError('audit_packs.select for permanent document cleanup', packsError);
      await Promise.all((packs || [])
        .filter((pack: Pick<AuditPack, 'id' | 'documents'>) => pack.documents.includes(docId))
        .map((pack: Pick<AuditPack, 'id' | 'documents'>) =>
          supabase!.from('audit_packs')
            .update({ documents: pack.documents.filter(id => id !== docId), updated_at: now })
            .eq('id', pack.id)
            .eq('organization_id', orgId)
            .then(({ error }) => {
              if (error) throwSupabaseError('audit_packs.unlink permanently deleted document', error);
            })
        ));

      if (doc?.storage_path) {
        const { error: removeError } = await supabase!.storage.from(evidenceStorageBucket).remove([doc.storage_path]);
        if (removeError) console.warn('Could not remove storage object during permanent delete:', removeError);
      }

      const { error } = await supabase!
        .from('evidence_documents')
        .update({ permanently_deleted_at: now, updated_at: now })
        .eq('id', docId)
        .eq('organization_id', orgId);
      if (error) throwSupabaseError('evidence_documents.mark permanently deleted', error);
      await this.logActivity('Document Permanently Deleted', `Marked evidence document ${docId} as permanently deleted.`);

      await safeLogAuditEvent({
        actionCategory: 'Evidence',
        actionType: 'evidence_permanently_deleted',
        entityType: 'evidence_document',
        entityId: docId,
        entityLabel: doc?.title || 'Unknown Document',
        description: `Permanently deleted evidence document "${doc?.title || ''}"`,
        beforeSnapshot: doc,
        severity: 'critical'
      });
      return;
    }

    const docs = getStorageItem('vigilen_documents', MOCK_DOCUMENTS);
    const before = docs.find((d: EvidenceDocument) => d.id === docId);
    setStorageItem(
      'vigilen_documents',
      docs.map((doc: EvidenceDocument) => doc.id === docId ? { ...doc, permanently_deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() } : doc)
    );
    await this.logActivity('Document Permanently Deleted', `Marked evidence document ${docId} as permanently deleted.`);

    await safeLogAuditEvent({
      actionCategory: 'Evidence',
      actionType: 'evidence_permanently_deleted',
      entityType: 'evidence_document',
      entityId: docId,
      entityLabel: before?.title || 'Unknown Document',
      description: `Permanently deleted evidence document "${before?.title || ''}"`,
      beforeSnapshot: before,
      severity: 'critical'
    });
  },

  // Matrix Cells
  async getMatrixCells(): Promise<MatrixCell[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!.from('matrix_cells').select('*').eq('organization_id', orgId);
      if (error) throwSupabaseError('matrix_cells.select active organization', error);
      return data || [];
    } else {
      initMockDb();
      return getStorageItem('vigilen_cells', MOCK_CELLS);
    }
  },

  async updateMatrixCell(cellId: string, updates: Partial<MatrixCell>): Promise<MatrixCell> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!.from('matrix_cells').update(updates).eq('id', cellId).eq('organization_id', orgId).select().single();
      if (error) throwSupabaseError('matrix_cells.update active organization', error);
      return data;
    } else {
      const cells = getStorageItem('vigilen_cells', MOCK_CELLS);
      const idx = cells.findIndex((c: any) => c.id === cellId);
      if (idx === -1) throw new Error('Cell not found');
      const updated = { ...cells[idx], ...updates, last_checked_at: new Date().toISOString() };
      cells[idx] = updated;
      setStorageItem('vigilen_cells', cells);
      return updated;
    }
  },

  // Audit Packs
  async getAuditPacks(): Promise<AuditPack[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!.from('audit_packs').select('*').eq('organization_id', orgId);
      if (error) throwSupabaseError('audit_packs.select active organization', error);
      return (data || []).map(pack => ({
        ...pack,
        requirements: Array.isArray(pack.requirements) ? pack.requirements : [],
        documents: Array.isArray(pack.documents) ? pack.documents : []
      }));
    } else {
      initMockDb();
      return getStorageItem('vigilen_audit_packs', MOCK_AUDIT_PACKS).map((pack: AuditPack) => ({
        ...pack,
        requirements: Array.isArray(pack.requirements) ? pack.requirements : [],
        documents: Array.isArray(pack.documents) ? pack.documents : []
      }));
    }
  },

  async addAuditPack(pack: Omit<AuditPack, 'id' | 'created_at' | 'updated_at' | 'organization_id'>): Promise<AuditPack> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    let newPack: AuditPack;
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!.from('audit_packs').insert([{ ...pack, organization_id: orgId }]).select().single();
      if (error) throwSupabaseError('audit_packs.insert active organization', error);
      newPack = data;
    } else {
      const packs = getStorageItem('vigilen_audit_packs', MOCK_AUDIT_PACKS);
      newPack = {
        ...pack,
        id: `pack-${Math.random().toString(36).substr(2, 9)}`,
        organization_id: orgId,
        share_token: null,
        share_expires_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      packs.push(newPack);
      setStorageItem('vigilen_audit_packs', packs);
      await this.logActivity('Audit Pack Created', `Created audit pack "${newPack.name}"`);
    }

    await safeLogAuditEvent({
      actionCategory: 'Audit Packs',
      actionType: 'audit_pack_created',
      entityType: 'audit_pack',
      entityId: newPack.id,
      entityLabel: newPack.name,
      description: `Created audit pack "${newPack.name}"`,
      afterSnapshot: newPack,
      severity: 'info'
    });

    return newPack;
  },

  async updateAuditPack(packId: string, updates: Partial<AuditPack>): Promise<AuditPack> {
    const before = await fetchRecordById('audit_packs', packId);
    let after: AuditPack;
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!.from('audit_packs').update(updates).eq('id', packId).eq('organization_id', orgId).select().single();
      if (error) throwSupabaseError('audit_packs.update active organization', error);
      after = data;
    } else {
      const packs = getStorageItem('vigilen_audit_packs', MOCK_AUDIT_PACKS);
      const idx = packs.findIndex((p: any) => p.id === packId);
      if (idx === -1) throw new Error('Audit pack not found');
      after = { ...packs[idx], ...updates, updated_at: new Date().toISOString() };
      packs[idx] = after;
      setStorageItem('vigilen_audit_packs', packs);
    }

    let actionType = 'audit_pack_updated';
    let undoAvailable = false;
    let undoActionType: string | null = null;
    let undoExpiresAt: string | null = null;
    let description = `Updated audit pack "${after.name}"`;
    let severity: 'info' | 'warning' | 'critical' = 'info';

    if (updates.status && updates.status !== before?.status) {
      if (updates.status === 'Archived') {
        actionType = 'audit_pack_archived';
        undoAvailable = true;
        undoActionType = 'restore_audit_pack';
        undoExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        description = `Archived audit pack "${after.name}"`;
        severity = 'warning';
      } else {
        actionType = 'audit_pack_status_changed';
        description = `Changed status of audit pack "${after.name}" to "${updates.status}"`;
      }
    }

    await safeLogAuditEvent({
      actionCategory: 'Audit Packs',
      actionType,
      entityType: 'audit_pack',
      entityId: packId,
      entityLabel: after.name,
      description,
      beforeSnapshot: before,
      afterSnapshot: after,
      changedFields: getChangedFields(before, after),
      undoAvailable,
      undoActionType,
      undoExpiresAt,
      severity
    });

    return after;
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!.from('audit_logs').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
      if (error) throwSupabaseError('audit_logs.select active organization', error);
      return data || [];
    } else {
      initMockDb();
      return getStorageItem('vigilen_logs', MOCK_LOGS).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  },

  async getAuditTrailEvents(): Promise<AuditTrailEvent[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('audit_trail_events')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throwSupabaseError('audit_trail_events.select active organization', error);
      return data || [];
    } else {
      initMockDb();
      return getStorageItem('vigilen_audit_trail_events', MOCK_AUDIT_TRAIL_EVENTS);
    }
  },

  async triggerUndoAction(eventId: string): Promise<boolean> {
    const userId = shouldUseSupabase() ? await getCurrentSupabaseUserId() : MOCK_PROFILE.id;
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const now = new Date().toISOString();
    const { logAuditEvent } = await import('./auditTrail');

    let event: AuditTrailEvent | null = null;

    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('audit_trail_events')
        .select('*')
        .eq('id', eventId)
        .eq('organization_id', orgId)
        .maybeSingle();
      if (error) throwSupabaseError('audit_trail_events.select for undo', error);
      event = data;
    } else {
      const events = getStorageItem('vigilen_audit_trail_events', MOCK_AUDIT_TRAIL_EVENTS);
      event = events.find((e: AuditTrailEvent) => e.id === eventId) || null;
    }

    if (!event) {
      throw new Error('Audit trail event not found.');
    }

    if (!event.undo_available) {
      throw new Error('Undo is not available for this event.');
    }

    if (event.undone_at) {
      throw new Error('This action has already been undone.');
    }

    if (event.undo_expires_at && new Date(event.undo_expires_at) < new Date()) {
      throw new Error('Undo capability for this event has expired.');
    }

    const entityId = event.entity_id;
    if (!entityId) {
      throw new Error('Cannot undo action without entity ID.');
    }

    const beforeSnapshot = event.before_snapshot;
    switch (event.undo_action_type) {
      case 'restore_evidence':
        await this.restoreDocument(entityId);
        break;
      case 'restore_requirement':
        await this.restoreFrameworkRequirement(entityId);
        break;
      case 'restore_action':
        if (shouldUseSupabase()) {
          const { error } = await supabase!
            .from('actions')
            .update({ status: beforeSnapshot?.status || 'Open', updated_at: now })
            .eq('id', entityId)
            .eq('organisation_id', orgId);
          if (error) throwSupabaseError('actions.restore for undo', error);
        } else {
          const actions = getStorageItem('vigilen_actions', MOCK_ACTIONS);
          const idx = actions.findIndex((a: any) => a.id === entityId);
          if (idx !== -1) {
            actions[idx] = { ...actions[idx], status: beforeSnapshot?.status || 'Open', updated_at: now };
            setStorageItem('vigilen_actions', actions);
          }
        }
        break;
      case 'restore_person':
        if (shouldUseSupabase()) {
          const { error } = await supabase!
            .from('people')
            .update({ active: true, updated_at: now })
            .eq('id', entityId)
            .eq('organisation_id', orgId);
          if (error) throwSupabaseError('people.restore for undo', error);
        } else {
          const people = getStorageItem('vigilen_people', MOCK_PEOPLE);
          const idx = people.findIndex((p: any) => p.id === entityId);
          if (idx !== -1) {
            people[idx] = { ...people[idx], active: true, updated_at: now };
            setStorageItem('vigilen_people', people);
          }
        }
        break;
      case 'restore_competency_type':
        if (shouldUseSupabase()) {
          const { error } = await supabase!
            .from('competency_types')
            .update({ active: true, updated_at: now })
            .eq('id', entityId)
            .eq('organisation_id', orgId);
          if (error) throwSupabaseError('competency_types.restore for undo', error);
        } else {
          const types = getStorageItem('vigilen_competency_types', MOCK_COMPETENCY_TYPES);
          const idx = types.findIndex((t: any) => t.id === entityId);
          if (idx !== -1) {
            types[idx] = { ...types[idx], active: true, updated_at: now };
            setStorageItem('vigilen_competency_types', types);
          }
        }
        break;
      case 'restore_competency_record':
        if (shouldUseSupabase()) {
          const { data: existingRecord } = await supabase!
            .from('competency_records')
            .select('id')
            .eq('id', entityId)
            .maybeSingle();
          if (existingRecord) {
            const { error } = await supabase!
              .from('competency_records')
              .update({ ...beforeSnapshot, updated_at: now })
              .eq('id', entityId);
            if (error) throwSupabaseError('competency_records.update for undo', error);
          } else if (beforeSnapshot) {
            const { error } = await supabase!
              .from('competency_records')
              .insert([beforeSnapshot]);
            if (error) throwSupabaseError('competency_records.insert for undo', error);
          }
        } else {
          const records = getStorageItem('vigilen_competency_records', MOCK_COMPETENCY_RECORDS);
          const idx = records.findIndex((r: any) => r.id === entityId);
          if (idx !== -1) {
            records[idx] = { ...records[idx], ...beforeSnapshot, updated_at: now };
          } else if (beforeSnapshot) {
            records.push(beforeSnapshot as any);
          }
          setStorageItem('vigilen_competency_records', records);
        }
        break;
      case 'restore_audit_pack':
        if (shouldUseSupabase()) {
          const { error } = await supabase!
            .from('audit_packs')
            .update({ status: beforeSnapshot?.status || 'Draft', updated_at: now })
            .eq('id', entityId)
            .eq('organization_id', orgId);
          if (error) throwSupabaseError('audit_packs.restore for undo', error);
        } else {
          const packs = getStorageItem('vigilen_audit_packs', MOCK_AUDIT_PACKS);
          const idx = packs.findIndex((p: any) => p.id === entityId);
          if (idx !== -1) {
            packs[idx] = { ...packs[idx], status: beforeSnapshot?.status || 'Draft', updated_at: now };
            setStorageItem('vigilen_audit_packs', packs);
          }
        }
        break;
      default:
        throw new Error(`Unsupported undo action type: ${event.undo_action_type}`);
    }

    // Mark event as undone
    if (shouldUseSupabase()) {
      const { error } = await supabase!
        .from('audit_trail_events')
        .update({
          undone_at: now,
          undone_by: userId,
          undo_available: false
        })
        .eq('id', eventId);
      if (error) throwSupabaseError('audit_trail_events.update status for undo', error);
    } else {
      const events = getStorageItem('vigilen_audit_trail_events', MOCK_AUDIT_TRAIL_EVENTS);
      const idx = events.findIndex((e: AuditTrailEvent) => e.id === eventId);
      if (idx !== -1) {
        events[idx] = {
          ...events[idx],
          undone_at: now,
          undone_by: userId,
          undo_available: false
        };
        setStorageItem('vigilen_audit_trail_events', events);
      }
    }

    // Log the undo action itself
    try {
      await logAuditEvent({
        actionCategory: 'System',
        actionType: 'undo_executed',
        entityType: event.entity_type,
        entityId: event.entity_id,
        entityLabel: event.entity_label,
        description: `Undid action "${event.description}" (originally performed by ${event.actor_name || 'unknown user'}).`,
        metadata: {
          original_event_id: eventId,
          undone_action_type: event.undo_action_type
        },
        severity: 'info',
        source: 'app'
      });
    } catch (logErr) {
      console.warn('Failed to log undo audit event:', logErr);
    }

    return true;
  },

  async logActivity(action: string, details: string): Promise<AuditLog> {
    const profile = shouldUseSupabase() ? await getCurrentSupabaseProfile() : null;
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const profileId = profile?.id || MOCK_PROFILE.id;
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!.from('audit_logs').insert([{
        organization_id: orgId,
        profile_id: profileId,
        action,
        details
      }]).select().single();
      if (error) throwSupabaseError('audit_logs.insert active organization', error);
      return data;
    } else {
      const logs = getStorageItem('vigilen_logs', MOCK_LOGS);
      const newLog: AuditLog = {
        id: `log-${Math.random().toString(36).substr(2, 9)}`,
        organization_id: orgId,
        profile_id: profileId,
        action,
        details,
        created_at: new Date().toISOString()
      };
      logs.unshift(newLog);
      setStorageItem('vigilen_logs', logs.slice(0, 100)); // cap at 100
      return newLog;
    }
  },

  // Saved Reports
  async getSavedReports(): Promise<SavedReport[]> {
    const localReports = await this.getLocalSavedReports();
    if (shouldUseSupabase() && await checkSavedReportsTableAvailable()) {
      try {
        const orgId = await getCurrentSupabaseOrganizationId();
        const { data, error } = await supabase!
          .from('saved_reports')
          .select(`
            *,
            owner_profile:owner_user_id (
              full_name,
              role
            )
          `)
          .eq('organization_id', orgId);

        if (error) throwSupabaseError('saved_reports.select active organization', error);

        const dbReports = (data || []).map((item: any) => ({
          ...item,
          is_local: false
        }));
        return [...dbReports, ...localReports];
      } catch (e) {
        console.warn('Failed to load database reports, returning local reports only', e);
        return localReports;
      }
    } else {
      return localReports;
    }
  },

  async getLocalSavedReports(): Promise<SavedReport[]> {
    initMockDb();
    const key = await getSavedReportsStorageKey();
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed.map((item: any) => ({
              ...item,
              is_local: true,
              owner_profile: item.owner_profile || { full_name: 'You (Local)', role: 'Owner' }
            }));
          }
        } catch (e) {
          console.error('Failed to parse local reports', e);
        }
      }
    }
    return [];
  },

  async addSavedReport(
    report: Omit<SavedReport, 'id' | 'created_at' | 'updated_at' | 'organization_id' | 'owner_user_id'>,
    options?: { forceLocal?: boolean }
  ): Promise<SavedReport> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    const userId = shouldUseSupabase() ? (await getCurrentSupabaseProfile())?.id : MOCK_PROFILE.id;
    let newReport: SavedReport;

    const useLocal = options?.forceLocal || !shouldUseSupabase();

    if (!useLocal) {
      const tableAvailable = await checkSavedReportsTableAvailable();
      if (!tableAvailable) {
        throw new Error('Database table saved_reports is not available in this environment. Personal Account and Organisation reports cannot be saved.');
      }

      const { data, error } = await supabase!
        .from('saved_reports')
        .insert([{
          organization_id: orgId,
          owner_user_id: userId,
          name: report.name,
          description: report.description,
          report_type: report.report_type,
          data_source: report.data_source,
          configuration: report.configuration,
          visibility: report.visibility,
          is_favourite: report.is_favourite || false
        }])
        .select(`
          *,
          owner_profile:owner_user_id (
            full_name,
            role
          )
        `)
        .single();

      if (error) throwSupabaseError('saved_reports.insert', error);
      newReport = { ...data, is_local: false };
    } else {
      const key = await getSavedReportsStorageKey();
      const list = await this.getLocalSavedReports();
      newReport = {
        ...report,
        id: 'local_' + Math.random().toString(36).substr(2, 9),
        organization_id: orgId,
        owner_user_id: userId || 'usr-jane-doe',
        is_favourite: report.is_favourite || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        owner_profile: { full_name: 'You (Local)', role: 'Owner' },
        is_local: true
      };
      const cleanedList = list.map(item => {
        const copy = { ...item };
        delete (copy as any).owner_profile;
        return copy;
      });
      const toPersist = { ...newReport };
      delete (toPersist as any).owner_profile;

      localStorage.setItem(key, JSON.stringify([...cleanedList, toPersist]));
    }

    await safeLogAuditEvent({
      actionCategory: 'Users & Admin',
      actionType: 'saved_report_created',
      entityType: 'saved_report',
      entityId: newReport.id,
      entityLabel: newReport.name,
      description: `Created ${newReport.is_local ? 'local' : newReport.visibility} saved report "${newReport.name}".`,
      afterSnapshot: newReport,
      severity: 'info'
    });

    return newReport;
  },

  async updateSavedReport(reportId: string, updates: Partial<SavedReport>): Promise<SavedReport> {
    const localList = await this.getLocalSavedReports();
    const isLocal = localList.some(r => r.id === reportId);
    let before: any = null;
    let after: SavedReport;

    if (isLocal) {
      const key = await getSavedReportsStorageKey();
      const idx = localList.findIndex(r => r.id === reportId);
      if (idx === -1) throw new Error('Local saved report not found');
      before = { ...localList[idx] };
      after = {
        ...localList[idx],
        ...updates,
        updated_at: new Date().toISOString()
      };
      localList[idx] = after;
      const toPersist = localList.map(item => {
        const copy = { ...item };
        delete (copy as any).owner_profile;
        return copy;
      });
      localStorage.setItem(key, JSON.stringify(toPersist));
    } else {
      const tableAvailable = await checkSavedReportsTableAvailable();
      if (!tableAvailable) {
        throw new Error('Database table saved_reports is not available. Cannot update database report.');
      }

      const orgId = await getCurrentSupabaseOrganizationId();

      const { data: beforeData } = await supabase!
        .from('saved_reports')
        .select('*')
        .eq('id', reportId)
        .eq('organization_id', orgId)
        .single();
      before = beforeData;

      const { data, error } = await supabase!
        .from('saved_reports')
        .update({
          name: updates.name,
          description: updates.description,
          configuration: updates.configuration,
          visibility: updates.visibility,
          is_favourite: updates.is_favourite,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId)
        .eq('organization_id', orgId)
        .select(`
          *,
          owner_profile:owner_user_id (
            full_name,
            role
          )
        `)
        .single();

      if (error) throwSupabaseError('saved_reports.update', error);
      after = { ...data, is_local: false };
    }

    await safeLogAuditEvent({
      actionCategory: 'Users & Admin',
      actionType: 'saved_report_updated',
      entityType: 'saved_report',
      entityId: after.id,
      entityLabel: after.name,
      description: `Updated saved report "${after.name}".`,
      beforeSnapshot: before,
      afterSnapshot: after,
      changedFields: getChangedFields(before, after),
      severity: 'info'
    });

    return after;
  },

  async deleteSavedReport(reportId: string): Promise<void> {
    const localList = await this.getLocalSavedReports();
    const isLocal = localList.some(r => r.id === reportId);
    let before: any = null;

    if (isLocal) {
      const key = await getSavedReportsStorageKey();
      const idx = localList.findIndex(r => r.id === reportId);
      if (idx !== -1) {
        before = { ...localList[idx] };
        const updated = localList.filter(r => r.id !== reportId);
        const toPersist = updated.map(item => {
          const copy = { ...item };
          delete (copy as any).owner_profile;
          return copy;
        });
        localStorage.setItem(key, JSON.stringify(toPersist));
      }
    } else {
      const tableAvailable = await checkSavedReportsTableAvailable();
      if (!tableAvailable) {
        throw new Error('Database table saved_reports is not available. Cannot delete database report.');
      }

      const orgId = await getCurrentSupabaseOrganizationId();

      const { data: beforeData } = await supabase!
        .from('saved_reports')
        .select('*')
        .eq('id', reportId)
        .eq('organization_id', orgId)
        .single();
      before = beforeData;

      const { error } = await supabase!
        .from('saved_reports')
        .delete()
        .eq('id', reportId)
        .eq('organization_id', orgId);
      if (error) throwSupabaseError('saved_reports.delete', error);
    }

    if (before) {
      await safeLogAuditEvent({
        actionCategory: 'Users & Admin',
        actionType: 'saved_report_deleted',
        entityType: 'saved_report',
        entityId: reportId,
        entityLabel: before.name,
        description: `Deleted saved report "${before.name}".`,
        beforeSnapshot: before,
        severity: 'warning'
      });
    }
  },

  async logReportActivity(input: {
    actionType: string;
    entityId?: string;
    entityLabel: string;
    description: string;
    metadata?: Record<string, any>;
    severity?: 'info' | 'warning' | 'critical';
  }): Promise<void> {
    await safeLogAuditEvent({
      actionCategory: 'System',
      source: 'app',
      ...input,
      entityType: 'saved_report'
    });
  },

  async checkSavedReportsTableAvailable(): Promise<boolean> {
    return checkSavedReportsTableAvailable();
  },

  // --- ASSETS ASSURANCE SYSTEM ---

  async getAssets(): Promise<Asset[]> {
    const profile = await this.getProfile();
    const orgId = requireAssetOrganizationId(profile);
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('assets')
        .select('*')
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('assets.select', error);
      return data || [];
    } else {
      initMockDb();
      const assets = getStorageItem('vigilen_assets', MOCK_ASSETS);
      return assets.filter((a: Asset) => a.organisation_id === orgId);
    }
  },

  async createAsset(asset: Omit<Asset, 'id' | 'created_at' | 'updated_at'>): Promise<Asset> {
    const profile = await this.getProfile();
    const orgId = requireAssetOrganizationId(profile);
    if (asset.category_id) {
      const categories = await this.getAssetCategories();
      if (!categories.some((category: AssetCategory) => category.id === asset.category_id && category.active)) {
        throw new Error('Asset category is not available in the active organisation.');
      }
    }
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('assets')
        .insert([{ ...asset, organisation_id: orgId }])
        .select()
        .single();
      if (error) throwSupabaseError('assets.insert', error);
      await this.logActivity('Asset Management', `Created asset "${asset.name}"`);
      return data;
    } else {
      initMockDb();
      const assets = getStorageItem('vigilen_assets', MOCK_ASSETS);
      const newAsset: Asset = {
        ...asset,
        id: `asset-${Math.random().toString(36).substr(2, 9)}`,
        organisation_id: orgId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      assets.push(newAsset);
      setStorageItem('vigilen_assets', assets);
      await this.logActivity('Asset Management', `Created asset "${asset.name}"`);
      return newAsset;
    }
  },

  async updateAsset(assetId: string, updates: Partial<Asset>): Promise<Asset> {
    const profile = await this.getProfile();
    const orgId = requireAssetOrganizationId(profile);
    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.organisation_id;
    if (safeUpdates.category_id) {
      const categories = await this.getAssetCategories();
      if (!categories.some((category: AssetCategory) => category.id === safeUpdates.category_id && category.active)) {
        throw new Error('Asset category is not available in the active organisation.');
      }
    }
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('assets')
        .update(safeUpdates)
        .eq('id', assetId)
        .eq('organisation_id', orgId)
        .select()
        .single();
      if (error) throwSupabaseError('assets.update', error);
      await this.logActivity('Asset Management', `Updated asset "${data.name}"`);
      return data;
    } else {
      initMockDb();
      const assets = getStorageItem('vigilen_assets', MOCK_ASSETS);
      const idx = assets.findIndex((a: Asset) => a.id === assetId && a.organisation_id === orgId);
      if (idx === -1) throw new Error('Asset not found');
      const updated = {
        ...assets[idx],
        ...safeUpdates,
        updated_at: new Date().toISOString()
      };
      assets[idx] = updated;
      setStorageItem('vigilen_assets', assets);
      await this.logActivity('Asset Management', `Updated asset "${updated.name}"`);
      return updated;
    }
  },

  async deleteAsset(assetId: string): Promise<void> {
    await this.updateAsset(assetId, {
      status: 'archived',
      archived_at: new Date().toISOString()
    });
  },

  async getAssetCheckTypes(): Promise<AssetCheckType[]> {
    const profile = await this.getProfile();
    const orgId = requireAssetOrganizationId(profile);
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('asset_check_types')
        .select('*')
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('asset_check_types.select', error);
      return data || [];
    } else {
      initMockDb();
      const types = getStorageItem('vigilen_asset_check_types', MOCK_ASSET_CHECK_TYPES);
      return types.filter((t: AssetCheckType) => t.organisation_id === orgId);
    }
  },

  async createAssetCheckType(checkType: Omit<AssetCheckType, 'id' | 'created_at' | 'updated_at'>): Promise<AssetCheckType> {
    const profile = await this.getProfile();
    const orgId = requireAssetOrganizationId(profile);
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('asset_check_types')
        .insert([{ ...checkType, organisation_id: orgId }])
        .select()
        .single();
      if (error) throwSupabaseError('asset_check_types.insert', error);
      return data;
    } else {
      initMockDb();
      const types = getStorageItem('vigilen_asset_check_types', MOCK_ASSET_CHECK_TYPES);
      const newType: AssetCheckType = {
        ...checkType,
        id: `check-type-${Math.random().toString(36).substr(2, 9)}`,
        organisation_id: orgId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      types.push(newType);
      setStorageItem('vigilen_asset_check_types', types);
      return newType;
    }
  },

  async getAssetCheckAssignments(assetId?: string): Promise<AssetCheckAssignment[]> {
    const profile = await this.getProfile();
    const orgId = requireAssetOrganizationId(profile);
    if (shouldUseSupabase()) {
      let query = supabase!.from('asset_check_assignments').select('*').eq('organisation_id', orgId);
      if (assetId) {
        query = query.eq('asset_id', assetId);
      }
      const { data, error } = await query;
      if (error) throwSupabaseError('asset_check_assignments.select', error);
      return data || [];
    } else {
      initMockDb();
      const assignments = getStorageItem('vigilen_asset_check_assignments', MOCK_ASSET_CHECK_ASSIGNMENTS);
      let filtered = assignments.filter((a: AssetCheckAssignment) => a.organisation_id === orgId);
      if (assetId) {
        filtered = filtered.filter((a: AssetCheckAssignment) => a.asset_id === assetId);
      }
      return filtered;
    }
  },

  async createAssetCheckAssignment(assignment: Omit<AssetCheckAssignment, 'id' | 'created_at' | 'updated_at'>): Promise<AssetCheckAssignment> {
    const profile = await this.getProfile();
    const orgId = requireAssetOrganizationId(profile);
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('asset_check_assignments')
        .insert([{ ...assignment, organisation_id: orgId }])
        .select()
        .single();
      if (error) throwSupabaseError('asset_check_assignments.insert', error);
      return data;
    } else {
      initMockDb();
      const assignments = getStorageItem('vigilen_asset_check_assignments', MOCK_ASSET_CHECK_ASSIGNMENTS);
      const newAssignment: AssetCheckAssignment = {
        ...assignment,
        id: `asg-${Math.random().toString(36).substr(2, 9)}`,
        organisation_id: orgId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      assignments.push(newAssignment);
      setStorageItem('vigilen_asset_check_assignments', assignments);
      return newAssignment;
    }
  },

  async updateAssetCheckAssignment(assignmentId: string, updates: Partial<AssetCheckAssignment>): Promise<AssetCheckAssignment> {
    const profile = await this.getProfile();
    const orgId = requireAssetOrganizationId(profile);
    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.organisation_id;
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('asset_check_assignments')
        .update(safeUpdates)
        .eq('id', assignmentId)
        .eq('organisation_id', orgId)
        .select()
        .single();
      if (error) throwSupabaseError('asset_check_assignments.update', error);
      return data;
    } else {
      initMockDb();
      const assignments = getStorageItem('vigilen_asset_check_assignments', MOCK_ASSET_CHECK_ASSIGNMENTS);
      const idx = assignments.findIndex((a: AssetCheckAssignment) => a.id === assignmentId && a.organisation_id === orgId);
      if (idx === -1) throw new Error('Assignment not found');
      const updated = {
        ...assignments[idx],
        ...safeUpdates,
        updated_at: new Date().toISOString()
      };
      assignments[idx] = updated;
      setStorageItem('vigilen_asset_check_assignments', assignments);
      return updated;
    }
  },

  async getAssetCheckRecords(assetId?: string): Promise<AssetCheckRecord[]> {
    const profile = await this.getProfile();
    const orgId = requireAssetOrganizationId(profile);
    if (shouldUseSupabase()) {
      let query = supabase!.from('asset_check_records').select('*').eq('organisation_id', orgId);
      if (assetId) {
        query = query.eq('asset_id', assetId);
      }
      const { data, error } = await query;
      if (error) throwSupabaseError('asset_check_records.select', error);
      return data || [];
    } else {
      initMockDb();
      const records = getStorageItem('vigilen_asset_check_records', MOCK_ASSET_CHECK_RECORDS);
      let filtered = records.filter((r: AssetCheckRecord) => r.organisation_id === orgId);
      if (assetId) {
        filtered = filtered.filter((r: AssetCheckRecord) => r.asset_id === assetId);
      }
      return filtered;
    }
  },

  async createAssetCheckRecord(record: Omit<AssetCheckRecord, 'id' | 'created_at' | 'updated_at'>): Promise<AssetCheckRecord> {
    const profile = await this.getProfile();
    const orgId = requireAssetOrganizationId(profile);
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('asset_check_records')
        .insert([{ ...record, organisation_id: orgId }])
        .select()
        .single();
      if (error) throwSupabaseError('asset_check_records.insert', error);
      return data;
    } else {
      initMockDb();
      const records = getStorageItem('vigilen_asset_check_records', MOCK_ASSET_CHECK_RECORDS);
      const newRecord: AssetCheckRecord = {
        ...record,
        id: `rec-${Math.random().toString(36).substr(2, 9)}`,
        organisation_id: orgId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      records.push(newRecord);
      setStorageItem('vigilen_asset_check_records', records);
      return newRecord;
    }
  },

  async getAssetCheckEvidenceLinks(): Promise<AssetCheckEvidenceLink[]> {
    const profile = await this.getProfile();
    const orgId = requireAssetOrganizationId(profile);
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('asset_check_evidence_links')
        .select('*')
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('asset_check_evidence_links.select', error);
      return data || [];
    } else {
      initMockDb();
      const links = getStorageItem('vigilen_asset_check_evidence_links', MOCK_ASSET_CHECK_EVIDENCE_LINKS);
      return links.filter((l: AssetCheckEvidenceLink) => l.organisation_id === orgId);
    }
  },

  async linkAssetCheckEvidence(
    assignmentId: string | null,
    recordId: string | null,
    documentId: string,
    assetId: string
  ): Promise<AssetCheckEvidenceLink> {
    const profile = await this.getProfile();
    const orgId = requireAssetOrganizationId(profile);
    const [assetRows, documentRows] = await Promise.all([this.getAssets(), this.getDocuments()]);
    if (!assetRows.some((asset: Asset) => asset.id === assetId)) {
      throw new Error('Asset is not available in the active organisation.');
    }
    if (!documentRows.some((document: EvidenceDocument) => document.id === documentId)) {
      throw new Error('Evidence document is not available in the active organisation.');
    }
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('asset_check_evidence_links')
        .insert([{
          organisation_id: orgId,
          asset_id: assetId,
          asset_check_assignment_id: assignmentId,
          asset_check_record_id: recordId,
          document_id: documentId,
          created_by: profile.id
        }])
        .select()
        .single();
      if (error) throwSupabaseError('asset_check_evidence_links.insert', error);
      return data;
    } else {
      initMockDb();
      const links = getStorageItem('vigilen_asset_check_evidence_links', MOCK_ASSET_CHECK_EVIDENCE_LINKS);
      const newLink: AssetCheckEvidenceLink = {
        id: `link-${Math.random().toString(36).substr(2, 9)}`,
        organisation_id: orgId,
        asset_id: assetId,
        asset_check_assignment_id: assignmentId,
        asset_check_record_id: recordId,
        document_id: documentId,
        created_by: profile.id,
        created_at: new Date().toISOString()
      };
      links.push(newLink);
      setStorageItem('vigilen_asset_check_evidence_links', links);
      return newLink;
    }
  },

  async unlinkAssetCheckEvidence(linkId: string): Promise<void> {
    const profile = await this.getProfile();
    const orgId = requireAssetOrganizationId(profile);
    if (shouldUseSupabase()) {
      const { error } = await supabase!
        .from('asset_check_evidence_links')
        .delete()
        .eq('id', linkId)
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('asset_check_evidence_links.delete', error);
    } else {
      initMockDb();
      const links = getStorageItem('vigilen_asset_check_evidence_links', MOCK_ASSET_CHECK_EVIDENCE_LINKS);
      setStorageItem(
        'vigilen_asset_check_evidence_links',
        links.filter((l: AssetCheckEvidenceLink) => !(l.id === linkId && l.organisation_id === orgId))
      );
    }
  },

  async uploadAssetEvidence(assetId: string, assignmentId: string | null, recordId: string | null, file: File): Promise<EvidenceDocument> {
    const assetRows = await this.getAssets();
    if (!assetRows.some((asset: Asset) => asset.id === assetId)) {
      throw new Error('Asset is not available in the active organisation.');
    }
    const title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim() || file.name;
    const doc = await this.uploadDocumentFile({
      file,
      title,
      category: 'Assets',
      expiry_date: null,
      issue_date: new Date().toISOString().split('T')[0],
      metadata: {
        source: 'asset_assurance',
        asset_id: assetId,
        assignment_id: assignmentId || undefined
      },
      tags: ['asset'],
      status: 'Unclassified'
    });
    await this.linkAssetCheckEvidence(assignmentId, recordId, doc.id, assetId);
    return doc;
  },

  async getAssetRequirementLinks(): Promise<AssetRequirementLink[]> {
    const profile = await this.getProfile();
    const orgId = requireAssetOrganizationId(profile);
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('asset_requirement_links')
        .select('*')
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('asset_requirement_links.select', error);
      return data || [];
    } else {
      initMockDb();
      const links = getStorageItem('vigilen_asset_requirement_links', MOCK_ASSET_REQUIREMENT_LINKS);
      return links.filter((l: AssetRequirementLink) => l.organisation_id === orgId);
    }
  },

  async getAssetHistoryEvents(assetId?: string): Promise<AssetHistoryEvent[]> {
    const profile = await this.getProfile();
    const orgId = requireAssetOrganizationId(profile);
    if (shouldUseSupabase()) {
      let query = supabase!.from('asset_history_events').select('*').eq('organisation_id', orgId);
      if (assetId) {
        query = query.eq('asset_id', assetId);
      }
      query = query.order('event_date', { ascending: false });
      const { data, error } = await query;
      if (error) throwSupabaseError('asset_history_events.select', error);
      return data || [];
    } else {
      initMockDb();
      const events = getStorageItem('vigilen_asset_history_events', MOCK_ASSET_HISTORY_EVENTS);
      let filtered = events.filter((e: AssetHistoryEvent) => e.organisation_id === orgId);
      if (assetId) {
        filtered = filtered.filter((e: AssetHistoryEvent) => e.asset_id === assetId);
      }
      return filtered.sort((a: AssetHistoryEvent, b: AssetHistoryEvent) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
    }
  },

  async createAssetHistoryEvent(
    event: Omit<AssetHistoryEvent, 'id' | 'organisation_id' | 'created_by' | 'created_at' | 'updated_at' | 'archived_at'>
  ): Promise<AssetHistoryEvent> {
    const profile = await this.getProfile();
    const orgId = requireAssetOrganizationId(profile);
    const assetRows = await this.getAssets();
    if (!assetRows.some((asset: Asset) => asset.id === event.asset_id)) {
      throw new Error('Asset is not available in the active organisation.');
    }
    const scopedEvent = {
      ...event,
      organisation_id: orgId,
      created_by: profile.id,
      archived_at: null
    };
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('asset_history_events')
        .insert([scopedEvent])
        .select()
        .single();
      if (error) throwSupabaseError('asset_history_events.insert', error);
      return data;
    } else {
      initMockDb();
      const events = getStorageItem('vigilen_asset_history_events', MOCK_ASSET_HISTORY_EVENTS);
      const newEvent: AssetHistoryEvent = {
        ...scopedEvent,
        id: `evt-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      events.push(newEvent);
      setStorageItem('vigilen_asset_history_events', events);
      return newEvent;
    }
  },

  async getAssetCategories(): Promise<AssetCategory[]> {
    const profile = await this.getProfile();
    const orgId = requireAssetOrganizationId(profile);
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('asset_categories')
        .select('*')
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('asset_categories.select', error);
      return data || [];
    } else {
      initMockDb();
      const categories = getStorageItem('vigilen_asset_categories', MOCK_ASSET_CATEGORIES);
      return categories.filter((c: AssetCategory) => c.organisation_id === orgId);
    }
  },

  async createAssetCategory(category: Omit<AssetCategory, 'id' | 'created_at' | 'updated_at'>): Promise<AssetCategory> {
    const profile = await this.getProfile();
    const orgId = requireAssetOrganizationId(profile);
    if (category.parent_id) {
      const categories = await this.getAssetCategories();
      if (!categories.some((parent: AssetCategory) => parent.id === category.parent_id && parent.active && !parent.parent_id)) {
        throw new Error('Parent category is not available in the active organisation.');
      }
    }
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('asset_categories')
        .insert([{ ...category, organisation_id: orgId }])
        .select()
        .single();
      if (error) throwSupabaseError('asset_categories.insert', error);
      return data;
    } else {
      initMockDb();
      const categories = getStorageItem('vigilen_asset_categories', MOCK_ASSET_CATEGORIES);
      const newCategory: AssetCategory = {
        ...category,
        id: `cat-${Math.random().toString(36).substr(2, 9)}`,
        organisation_id: orgId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      categories.push(newCategory);
      setStorageItem('vigilen_asset_categories', categories);
      return newCategory;
    }
  },

  async updateAssetCategory(id: string, updates: Partial<AssetCategory>): Promise<AssetCategory> {
    const profile = await this.getProfile();
    const orgId = requireAssetOrganizationId(profile);
    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.organisation_id;
    if (safeUpdates.parent_id) {
      const categories = await this.getAssetCategories();
      if (!categories.some((parent: AssetCategory) => parent.id === safeUpdates.parent_id && parent.active && !parent.parent_id)) {
        throw new Error('Parent category is not available in the active organisation.');
      }
    }
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('asset_categories')
        .update(safeUpdates)
        .eq('id', id)
        .eq('organisation_id', orgId)
        .select()
        .single();
      if (error) throwSupabaseError('asset_categories.update', error);
      return data;
    } else {
      initMockDb();
      const categories = getStorageItem('vigilen_asset_categories', MOCK_ASSET_CATEGORIES);
      const idx = categories.findIndex((c: AssetCategory) => c.id === id && c.organisation_id === orgId);
      if (idx === -1) throw new Error('Asset category not found');
      const updated = {
        ...categories[idx],
        ...safeUpdates,
        updated_at: new Date().toISOString()
      };
      categories[idx] = updated;
      setStorageItem('vigilen_asset_categories', categories);
      return updated;
    }
  },

  async deleteAssetCategory(id: string): Promise<void> {
    await this.updateAssetCategory(id, {
      active: false,
      archived_at: new Date().toISOString()
    });
  },

  async restoreAssetCategory(id: string): Promise<AssetCategory> {
    return this.updateAssetCategory(id, {
      active: true,
      archived_at: null
    });
  },

  async updateAssetHistoryEvent(eventId: string, updates: Partial<AssetHistoryEvent>): Promise<AssetHistoryEvent> {
    const profile = await this.getProfile();
    const orgId = requireAssetOrganizationId(profile);
    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.organisation_id;
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('asset_history_events')
        .update(safeUpdates)
        .eq('id', eventId)
        .eq('organisation_id', orgId)
        .select()
        .single();
      if (error) throwSupabaseError('asset_history_events.update', error);
      return data;
    } else {
      initMockDb();
      const events = getStorageItem('vigilen_asset_history_events', MOCK_ASSET_HISTORY_EVENTS);
      const idx = events.findIndex((e: AssetHistoryEvent) => e.id === eventId && e.organisation_id === orgId);
      if (idx === -1) throw new Error('Asset history event not found');
      const updated = {
        ...events[idx],
        ...safeUpdates,
        updated_at: new Date().toISOString()
      };
      events[idx] = updated;
      setStorageItem('vigilen_asset_history_events', events);
      return updated;
    }
  },

  // Private helper to automatically map a uploaded document to a matrix cell if it fits requirements
  async autoMapCell(doc: EvidenceDocument): Promise<void> {
    requireDemoMode();
    const cells = getStorageItem('vigilen_cells', MOCK_CELLS);
    const reqs = getStorageItem('vigilen_requirements', MOCK_REQUIREMENTS);

    // Simple heuristic: match category
    const matchingReq = reqs.find((r: ComplianceRequirement) => r.category === doc.category);
    if (!matchingReq) return;

    // Find any cell for this requirement that is 'Missing' or has no document
    const cellIdx = cells.findIndex((c: MatrixCell) => c.requirement_id === matchingReq.id && !c.document_id);
    if (cellIdx !== -1) {
      let cellStatus: CellStatus = 'Compliant';
      if (doc.status === 'Expired') cellStatus = 'Expired';
      else if (doc.status === 'Expiring Soon') cellStatus = 'Expiring Soon';

      cells[cellIdx] = {
         ...cells[cellIdx],
         document_id: doc.id,
         status: cellStatus,
         last_checked_at: new Date().toISOString()
      };
      setStorageItem('vigilen_cells', cells);
      await this.logActivity('Matrix Mapping', `Linked "${doc.title}" to target "${cells[cellIdx].target_name}"`);
    }
  }
};
