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
  Person,
  ManagedCategory,
  CellStatus,
  DocumentStatus
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
    name: 'Q2 DVSA Safety Audit Pack',
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
    details: 'Shared "Q2 DVSA Safety Audit Pack" with external auditors with PIN security enabled.',
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

const getCurrentSupabaseOrganizationId = async (): Promise<string> => {
  const org = await getCurrentSupabaseOrganization();
  if (!org) throw new Error('Authenticated user is not linked to an organization.');
  return org.id;
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
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!.from('organizations').update(updates).eq('id', orgId).select().single();
      if (error) throwSupabaseError('organizations.update by id', error);
      return data;
    } else {
      const org = getStorageItem('vigilen_org', MOCK_ORG);
      const updated = { ...org, ...updates, updated_at: new Date().toISOString() };
      setStorageItem('vigilen_org', updated);
      return updated;
    }
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

    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('requirements')
        .insert([{ ...requirement, organisation_id: orgId, created_by: userId }])
        .select()
        .single();
      if (error) throwSupabaseError('requirements.insert active organisation', error);
      return data;
    }

    const requirements = getStorageItem('vigilen_framework_requirements', MOCK_FRAMEWORK_REQUIREMENTS);
    const newRequirement: Requirement = {
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
    return newRequirement;
  },

  async updateFrameworkRequirement(requirementId: string, updates: Partial<Requirement>): Promise<Requirement> {
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
      return data;
    }

    const requirements = getStorageItem('vigilen_framework_requirements', MOCK_FRAMEWORK_REQUIREMENTS);
    const idx = requirements.findIndex((item: Requirement) => item.id === requirementId);
    if (idx === -1) throw new Error('Requirement not found');
    const previous = requirements[idx];
    const updated = { ...requirements[idx], ...updates, updated_at: new Date().toISOString() };
    requirements[idx] = updated;
    setStorageItem('vigilen_framework_requirements', requirements);
    await this.logActivity('Requirement Updated', `Updated requirement "${updated.title}" by user ${MOCK_PROFILE.id}. ${describeChangedFields(previous, updated)}`);
    return updated;
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

    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('requirement_documents')
        .insert([{ requirement_id: requirementId, document_id: documentId, organisation_id: orgId, linked_by: userId }])
        .select()
        .single();
      if (error) throwSupabaseError('requirement_documents.insert active organisation', error);
      return data;
    }

    const links = getStorageItem('vigilen_requirement_documents', MOCK_REQUIREMENT_DOCUMENTS);
    const existing = links.find((link: RequirementDocument) => link.requirement_id === requirementId && link.document_id === documentId);
    if (existing) return existing;
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
    return newLink;
  },

  async unlinkDocumentFromRequirement(requirementId: string, documentId: string): Promise<void> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;

    if (shouldUseSupabase()) {
      const { error } = await supabase!
        .from('requirement_documents')
        .delete()
        .eq('requirement_id', requirementId)
        .eq('document_id', documentId)
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('requirement_documents.delete active organisation', error);
      return;
    }

    const links = getStorageItem('vigilen_requirement_documents', MOCK_REQUIREMENT_DOCUMENTS);
    setStorageItem(
      'vigilen_requirement_documents',
      links.filter((link: RequirementDocument) => !(link.requirement_id === requirementId && link.document_id === documentId))
    );
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

    if (shouldUseSupabase()) {
      const query = input.id
        ? supabase!.from('requirement_evidence_criteria').update(payload).eq('id', input.id).eq('organisation_id', orgId)
        : supabase!.from('requirement_evidence_criteria').insert([payload]);
      const { data, error } = await query.select().single();
      if (error) throwSupabaseError('requirement_evidence_criteria.upsert active organisation', error);
      await this.logActivity('Evidence Criterion Saved', `Saved evidence criterion "${data.title}".`);
      return data;
    }

    const criteria = getStorageItem('vigilen_requirement_evidence_criteria', MOCK_REQUIREMENT_EVIDENCE_CRITERIA);
    if (input.id) {
      const idx = criteria.findIndex((criterion: RequirementEvidenceCriterion) => criterion.id === input.id);
      if (idx !== -1) {
        const updated = { ...criteria[idx], ...payload };
        criteria[idx] = updated;
        setStorageItem('vigilen_requirement_evidence_criteria', criteria);
        await this.logActivity('Evidence Criterion Saved', `Saved evidence criterion "${updated.title}".`);
        return updated;
      }
    }
    const created: RequirementEvidenceCriterion = {
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
    criteria.push(created);
    setStorageItem('vigilen_requirement_evidence_criteria', criteria);
    await this.logActivity('Evidence Criterion Created', `Created evidence criterion "${created.title}".`);
    return created;
  },

  async deleteRequirementEvidenceCriterion(criterionId: string): Promise<void> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    if (shouldUseSupabase()) {
      const { error } = await supabase!
        .from('requirement_evidence_criteria')
        .delete()
        .eq('id', criterionId)
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('requirement_evidence_criteria.delete active organisation', error);
      await this.logActivity('Evidence Criterion Deleted', `Deleted evidence criterion ${criterionId}.`);
      return;
    }

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

    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('requirement_evidence_criterion_matches')
        .upsert([payload], { onConflict: 'criterion_id,document_id' })
        .select()
        .single();
      if (error) throwSupabaseError('requirement_evidence_criterion_matches.upsert document', error);
      await this.logActivity('Evidence Criterion Matched', `Linked document ${documentId} to evidence criterion ${criterionId}.`);
      return data;
    }

    const matches = getStorageItem('vigilen_requirement_evidence_criterion_matches', MOCK_REQUIREMENT_EVIDENCE_CRITERION_MATCHES);
    const existing = matches.find((match: RequirementEvidenceCriterionMatch) => match.criterion_id === criterionId && match.document_id === documentId);
    if (existing) return existing;
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
    return created;
  },

  async unlinkDocumentFromEvidenceCriterion(criterionId: string, documentId: string): Promise<void> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    if (shouldUseSupabase()) {
      const { error } = await supabase!
        .from('requirement_evidence_criterion_matches')
        .delete()
        .eq('criterion_id', criterionId)
        .eq('document_id', documentId)
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('requirement_evidence_criterion_matches.delete document', error);
      await this.logActivity('Evidence Criterion Unlinked', `Unlinked document ${documentId} from evidence criterion ${criterionId}.`);
      return;
    }

    setStorageItem(
      'vigilen_requirement_evidence_criterion_matches',
      getStorageItem('vigilen_requirement_evidence_criterion_matches', MOCK_REQUIREMENT_EVIDENCE_CRITERION_MATCHES)
        .filter((match: RequirementEvidenceCriterionMatch) => !(match.criterion_id === criterionId && match.document_id === documentId))
    );
    await this.logActivity('Evidence Criterion Unlinked', `Unlinked document ${documentId} from evidence criterion ${criterionId}.`);
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

    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('actions')
        .insert([{ ...patch, organisation_id: orgId, created_by: userId }])
        .select()
        .single();
      if (error) throwSupabaseError('actions.insert active organisation', error);
      await this.addActionUpdate(data.id, 'Status Change', buildStatusNote(null, data.status || 'Open', 'Action opened.'));
      await this.logActivity('Action Opened', `Opened action "${data.title}"`);
      return data;
    }

    const actions = getStorageItem('vigilen_actions', MOCK_ACTIONS);
    const newAction: Action = {
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
    return newAction;
  },

  async updateAction(actionId: string, updates: Partial<Action>): Promise<Action> {
    const userId = shouldUseSupabase() ? await getCurrentSupabaseUserId() : MOCK_PROFILE.id;

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
      return data;
    }

    const actions = getStorageItem('vigilen_actions', MOCK_ACTIONS);
    const idx = actions.findIndex((item: Action) => item.id === actionId);
    if (idx === -1) throw new Error('Action not found');
    const prepared = prepareActionLifecycleUpdate(actions[idx], updates, userId);
    const updated = { ...actions[idx], ...prepared.patch, updated_at: nowIso() };
    actions[idx] = updated;
    setStorageItem('vigilen_actions', actions);
    if (prepared.timeline) {
      await this.addActionUpdate(actionId, prepared.timeline.update_type, prepared.timeline.note);
      await this.logActivity(prepared.timeline.action, prepared.timeline.details);
    }
    return updated;
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

    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('action_documents')
        .insert([{ organisation_id: orgId, action_id: actionId, document_id: documentId, linked_by: userId }])
        .select()
        .single();
      if (error) throwSupabaseError('action_documents.insert active organisation', error);
      await this.addActionUpdate(actionId, 'Evidence Added', note);
      await this.logActivity('Action Evidence Linked', `Linked evidence document ${documentId} to action ${actionId}.`);
      return data;
    }

    const links = getStorageItem('vigilen_action_documents', MOCK_ACTION_DOCUMENTS);
    const existing = links.find((link: ActionDocument) => link.action_id === actionId && link.document_id === documentId);
    if (existing) return existing;
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
    return newLink;
  },

  async unlinkDocumentFromAction(actionId: string, documentId: string): Promise<void> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;

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
      return;
    }

    const links = getStorageItem('vigilen_action_documents', MOCK_ACTION_DOCUMENTS);
    setStorageItem(
      'vigilen_action_documents',
      links.filter((link: ActionDocument) => !(link.action_id === actionId && link.document_id === documentId))
    );
    await this.addActionUpdate(actionId, 'Evidence Added', `Evidence document ${documentId} unlinked from action.`);
    await this.logActivity('Action Evidence Unlinked', `Unlinked evidence document ${documentId} from action ${actionId}.`);
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

    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('people')
        .upsert([payload])
        .select()
        .single();
      if (error) throwSupabaseError('people.upsert active organisation', error);
      await this.logActivity('Person Saved', `Saved person "${data.display_name}".`);
      return data;
    }

    const people = getStorageItem('vigilen_people', MOCK_PEOPLE);
    if (input.id) {
      const idx = people.findIndex((person: Person) => person.id === input.id);
      if (idx !== -1) {
        const updated = { ...people[idx], ...payload };
        people[idx] = updated;
        setStorageItem('vigilen_people', people);
        await this.logActivity('Person Saved', `Saved person "${updated.display_name}".`);
        return updated;
      }
    }

    const created: Person = {
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
    people.unshift(created);
    setStorageItem('vigilen_people', people);
    await this.logActivity('Person Added', `Created person "${created.display_name}".`);
    return created;
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
      updated_at: nowIso()
    };

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

      const query = existingId
        ? supabase!.from('competency_types').update(payload).eq('id', existingId).eq('organisation_id', orgId)
        : supabase!.from('competency_types').insert([payload]);
      const { data, error } = await query.select().single();
      if (error) throwSupabaseError('competency_types.upsert active organisation', error);
      await this.logActivity('Competency Type Saved', `Saved competency type "${data.title}".`);
      return data;
    }

    const types = getStorageItem('vigilen_competency_types', MOCK_COMPETENCY_TYPES);
    const idx = types.findIndex((type: CompetencyType) =>
      input.id ? type.id === input.id : type.title.toLowerCase() === input.title.toLowerCase() && type.category === input.category
    );
    if (idx !== -1) {
      const updated = { ...types[idx], ...payload };
      types[idx] = updated;
      setStorageItem('vigilen_competency_types', types);
      await this.logActivity('Competency Type Saved', `Saved competency type "${updated.title}".`);
      return updated;
    }

    const created: CompetencyType = {
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
      created_at: nowIso(),
      updated_at: nowIso()
    };
    types.unshift(created);
    setStorageItem('vigilen_competency_types', types);
    await this.logActivity('Competency Type Added', `Created competency type "${created.title}".`);
    return created;
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

    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('competency_records')
        .upsert([supabasePayload], { onConflict: 'organisation_id,person_id,competency_type_id' })
        .select()
        .single();
      if (error) throwSupabaseError('competency_records.upsert active organisation', error);
      await this.logActivity('Competency Record Saved', `Saved competency record ${data.id}.`);
      return data;
    }

    const records = getStorageItem('vigilen_competency_records', MOCK_COMPETENCY_RECORDS);
    const idx = records.findIndex((record: CompetencyRecord) =>
      recordId
        ? record.id === recordId
        : record.person_id === input.person_id && record.competency_type_id === input.competency_type_id
    );
    if (idx !== -1) {
      const updated = { ...records[idx], ...payload };
      records[idx] = updated;
      setStorageItem('vigilen_competency_records', records);
      await this.logActivity('Competency Record Saved', `Saved competency record ${updated.id}.`);
      return updated;
    }

    const created: CompetencyRecord = {
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
    records.unshift(created);
    setStorageItem('vigilen_competency_records', records);
    await this.logActivity('Competency Record Added', `Created competency record ${created.id}.`);
    return created;
  },

  async deleteCompetencyRecord(recordId: string): Promise<void> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;

    if (shouldUseSupabase()) {
      const { error } = await supabase!
        .from('competency_records')
        .delete()
        .eq('id', recordId)
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('competency_records.delete active organisation', error);
      await this.logActivity('Competency Record Deleted', `Deleted competency record ${recordId}.`);
      return;
    }

    const records = getStorageItem('vigilen_competency_records', MOCK_COMPETENCY_RECORDS);
    setStorageItem(
      'vigilen_competency_records',
      records.filter((record: CompetencyRecord) => record.id !== recordId)
    );
    await this.logActivity('Competency Record Deleted', `Deleted competency record ${recordId}.`);
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

    if (shouldUseSupabase()) {
      const { data, error } = await supabase!
        .from('competency_record_documents')
        .upsert([{ organisation_id: orgId, competency_record_id: recordId, document_id: documentId, linked_by: userId }], {
          onConflict: 'competency_record_id,document_id'
        })
        .select()
        .single();
      if (error) throwSupabaseError('competency_record_documents.insert active organisation', error);
      await this.logActivity('Competency Evidence Linked', `Linked evidence document ${documentId} to competency record ${recordId}.`);
      return data;
    }

    const links = getStorageItem('vigilen_competency_record_documents', MOCK_COMPETENCY_RECORD_DOCUMENTS);
    const existing = links.find((link: CompetencyRecordDocument) => link.competency_record_id === recordId && link.document_id === documentId);
    if (existing) return existing;
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
    return newLink;
  },

  async unlinkDocumentFromCompetencyRecord(recordId: string, documentId: string): Promise<void> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    if (shouldUseSupabase()) {
      const { error } = await supabase!
        .from('competency_record_documents')
        .delete()
        .eq('competency_record_id', recordId)
        .eq('document_id', documentId)
        .eq('organisation_id', orgId);
      if (error) throwSupabaseError('competency_record_documents.delete active organisation', error);
      await this.logActivity('Competency Evidence Unlinked', `Unlinked evidence document ${documentId} from competency record ${recordId}.`);
      return;
    }

    const links = getStorageItem('vigilen_competency_record_documents', MOCK_COMPETENCY_RECORD_DOCUMENTS);
    setStorageItem(
      'vigilen_competency_record_documents',
      links.filter((link: CompetencyRecordDocument) => !(link.competency_record_id === recordId && link.document_id === documentId))
    );
    await this.logActivity('Competency Evidence Unlinked', `Unlinked evidence document ${documentId} from competency record ${recordId}.`);
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
      return data;
    } else {
      const docs = getStorageItem('vigilen_documents', MOCK_DOCUMENTS);
      const idx = docs.findIndex((d: any) => d.id === docId);
      if (idx === -1) throw new Error('Document not found');
      const updated = { ...docs[idx], ...updates, updated_at: new Date().toISOString() };
      docs[idx] = updated;
      setStorageItem('vigilen_documents', docs);

      // Check if status changed, and update corresponding matrix cells
      const cells = getStorageItem('vigilen_cells', MOCK_CELLS);
      let cellUpdated = false;
      const updatedCells = cells.map((cell: MatrixCell) => {
        if (cell.document_id === docId) {
          cellUpdated = true;
          let cellStatus: CellStatus = 'Compliant';
          if (updated.status === 'Expired') cellStatus = 'Expired';
          else if (updated.status === 'Expiring Soon') cellStatus = 'Expiring Soon';
          return { ...cell, status: cellStatus, last_checked_at: new Date().toISOString() };
        }
        return cell;
      });
      if (cellUpdated) {
        setStorageItem('vigilen_cells', updatedCells);
      }

      await this.logActivity('Document Updated', `Modified metadata or status for "${updated.title}"`);
      return updated;
    }
  },

  async deleteDocument(docId: string): Promise<void> {
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
  },

  async restoreDocument(docId: string): Promise<EvidenceDocument> {
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
      return data;
    }

    const docs = getStorageItem('vigilen_documents', MOCK_DOCUMENTS);
    const idx = docs.findIndex((doc: EvidenceDocument) => doc.id === docId);
    if (idx === -1) throw new Error('Document not found.');
    docs[idx] = { ...docs[idx], status: 'Active', archived_at: null, archived_by: null, deleted_at: null, deleted_by: null, updated_at: new Date().toISOString() };
    setStorageItem('vigilen_documents', docs);
    await this.logActivity('Document Restored', `Restored evidence document ${docId}.`);
    return docs[idx];
  },

  async permanentlyDeleteDocument(docId: string): Promise<void> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const now = new Date().toISOString();
      const { data: doc, error: docError } = await supabase!
        .from('evidence_documents')
        .select('id, storage_path')
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
      return;
    }

    const docs = getStorageItem('vigilen_documents', MOCK_DOCUMENTS);
    setStorageItem(
      'vigilen_documents',
      docs.map((doc: EvidenceDocument) => doc.id === docId ? { ...doc, permanently_deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() } : doc)
    );
    await this.logActivity('Document Permanently Deleted', `Marked evidence document ${docId} as permanently deleted.`);
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
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!.from('audit_packs').insert([{ ...pack, organization_id: orgId }]).select().single();
      if (error) throwSupabaseError('audit_packs.insert active organization', error);
      return data;
    } else {
      const packs = getStorageItem('vigilen_audit_packs', MOCK_AUDIT_PACKS);
      const newPack: AuditPack = {
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
      return newPack;
    }
  },

  async updateAuditPack(packId: string, updates: Partial<AuditPack>): Promise<AuditPack> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!.from('audit_packs').update(updates).eq('id', packId).eq('organization_id', orgId).select().single();
      if (error) throwSupabaseError('audit_packs.update active organization', error);
      return data;
    } else {
      const packs = getStorageItem('vigilen_audit_packs', MOCK_AUDIT_PACKS);
      const idx = packs.findIndex((p: any) => p.id === packId);
      if (idx === -1) throw new Error('Audit pack not found');
      const updated = { ...packs[idx], ...updates, updated_at: new Date().toISOString() };
      packs[idx] = updated;
      setStorageItem('vigilen_audit_packs', packs);
      return updated;
    }
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
