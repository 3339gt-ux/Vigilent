import { supabase, isSupabaseConfigured } from './supabaseClient';
import { evidenceStorageBucket, isDemoMode, requireDemoMode, requireProductionEnv, signedUrlTtlSeconds } from './env';
import { throwSupabaseError } from './supabaseDiagnostics';
import {
  buildEvidenceStoragePath,
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
  RequirementDocument,
  RequirementEvidenceType,
  Review,
  Action,
  MatrixCell,
  AuditPack,
  AuditLog,
  CellStatus,
  DocumentStatus
} from './types';

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
    status: 'Active',
    share_token: 'vig-share-q2-audit-887162',
    share_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    pin_code: '4821',
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
    localStorage.setItem('vigilen_reviews', JSON.stringify(MOCK_REVIEWS));
    localStorage.setItem('vigilen_actions', JSON.stringify(MOCK_ACTIONS));
    localStorage.setItem('vigilen_requirement_actions', JSON.stringify(MOCK_REQUIREMENT_ACTIONS));
    localStorage.setItem('vigilen_initialized', 'true');
  }
};

const shouldUseSupabase = () => {
  requireProductionEnv(isSupabaseConfigured);
  return !isDemoMode;
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
      const { data, error } = await supabase!
        .from('requirements')
        .update(updates)
        .eq('id', requirementId)
        .eq('organisation_id', orgId)
        .select()
        .single();
      if (error) throwSupabaseError('requirements.update active organisation', error);
      return data;
    }

    const requirements = getStorageItem('vigilen_framework_requirements', MOCK_FRAMEWORK_REQUIREMENTS);
    const idx = requirements.findIndex((item: Requirement) => item.id === requirementId);
    if (idx === -1) throw new Error('Requirement not found');
    const updated = { ...requirements[idx], ...updates, updated_at: new Date().toISOString() };
    requirements[idx] = updated;
    setStorageItem('vigilen_framework_requirements', requirements);
    return updated;
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
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throwSupabaseError('actions.select active organisation', error);
      return data || [];
    }

    initMockDb();
    return getStorageItem('vigilen_actions', MOCK_ACTIONS);
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

  // Evidence Documents (Vault)
  async getDocuments(): Promise<EvidenceDocument[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!
        .from('evidence_documents')
        .select('*')
        .eq('organization_id', orgId)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });
      if (error) throwSupabaseError('evidence_documents.select active organization', error);
      return data || [];
    } else {
      initMockDb();
      return getStorageItem('vigilen_documents', MOCK_DOCUMENTS).filter((doc: EvidenceDocument) => doc.status !== 'deleted');
    }
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

    if (error) throwSupabaseError('evidence_documents.insert private storage record', error);

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
      .neq('status', 'deleted')
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
        .neq('status', 'deleted')
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
      const { error } = await supabase!
        .from('evidence_documents')
        .update({ status: 'deleted', updated_at: new Date().toISOString() })
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
      const updatedDocs = docs.map((d: EvidenceDocument) =>
        d.id === docId ? { ...d, status: 'deleted' as DocumentStatus, updated_at: new Date().toISOString() } : d
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
      return data || [];
    } else {
      initMockDb();
      return getStorageItem('vigilen_audit_packs', MOCK_AUDIT_PACKS);
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
      const shareToken = `vig-share-${Math.random().toString(36).substr(2, 9)}`;
      const newPack: AuditPack = {
        ...pack,
        id: `pack-${Math.random().toString(36).substr(2, 9)}`,
        organization_id: orgId,
        share_token: shareToken,
        share_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      packs.push(newPack);
      setStorageItem('vigilen_audit_packs', packs);
      await this.logActivity('Audit Pack Created', `Assembled and shared audit pack "${newPack.name}"`);
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
