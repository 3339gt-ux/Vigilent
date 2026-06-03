import { supabase, isSupabaseConfigured } from './supabaseClient';
import { isDemoMode, requireDemoMode, requireProductionEnv } from './env';
import { throwSupabaseError } from './supabaseDiagnostics';
import {
  Profile,
  Organization,
  ComplianceRequirement,
  EvidenceDocument,
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

  // Evidence Documents (Vault)
  async getDocuments(): Promise<EvidenceDocument[]> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!.from('evidence_documents').select('*').eq('organization_id', orgId);
      if (error) throwSupabaseError('evidence_documents.select active organization', error);
      return data || [];
    } else {
      initMockDb();
      return getStorageItem('vigilen_documents', MOCK_DOCUMENTS);
    }
  },

  async addDocument(doc: Omit<EvidenceDocument, 'id' | 'created_at' | 'updated_at' | 'organization_id'>): Promise<EvidenceDocument> {
    const orgId = shouldUseSupabase() ? await getCurrentSupabaseOrganizationId() : MOCK_ORG.id;
    if (shouldUseSupabase()) {
      const { data, error } = await supabase!.from('evidence_documents').insert([{ ...doc, organization_id: orgId }]).select().single();
      if (error) throwSupabaseError('evidence_documents.insert active organization', error);
      return data;
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

  async updateDocument(docId: string, updates: Partial<EvidenceDocument>): Promise<EvidenceDocument> {
    if (shouldUseSupabase()) {
      const orgId = await getCurrentSupabaseOrganizationId();
      const { data, error } = await supabase!.from('evidence_documents').update(updates).eq('id', docId).eq('organization_id', orgId).select().single();
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
      const { error } = await supabase!.from('evidence_documents').delete().eq('id', docId).eq('organization_id', orgId);
      if (error) throwSupabaseError('evidence_documents.delete active organization', error);
    } else {
      const docs = getStorageItem('vigilen_documents', MOCK_DOCUMENTS);
      const filtered = docs.filter((d: any) => d.id !== docId);
      setStorageItem('vigilen_documents', filtered);

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
