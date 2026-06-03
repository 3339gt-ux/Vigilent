'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  dbService,
  initMockDb,
  MOCK_ORG,
  MOCK_CELLS,
  MOCK_PROFILE,
  getStorageItem,
  setStorageItem,
  getCurrentSupabaseProfile,
  getCurrentSupabaseOrganization
} from '@/lib/db';
import { isDemoMode, requireProductionEnv } from '@/lib/env';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { formatSupabaseError, logSupabaseError } from '@/lib/supabaseDiagnostics';
import { buildReadinessReport, ReadinessReport } from '@/lib/readinessEngine';
import {
  Profile,
  Organization,
  ComplianceRequirement,
  EvidenceDocument,
  MatrixCell,
  AuditPack,
  AuditLog,
  CellStatus,
  DocumentStatus,
  EvidenceUploadInput,
  Requirement,
  RequirementAction,
  RequirementDocument,
  RequirementEvidenceType,
  Review,
  Action,
  RequirementTemplateItem
} from '@/lib/types';

interface AppContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  authUser: User | null;
  user: Profile | null;
  organization: Organization | null;
  isLoading: boolean;
  authError: string | null;
  isAuthenticated: boolean;
  hasOrganization: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  createOrganization: (name: string, industry?: string | null, country?: string) => Promise<Organization>;
  refreshSession: () => Promise<void>;
  updateOrgProfile: (updates: Partial<Organization>) => Promise<void>;

  requirements: ComplianceRequirement[];
  documents: EvidenceDocument[];
  frameworkRequirements: Requirement[];
  requirementEvidenceTypes: RequirementEvidenceType[];
  requirementDocuments: RequirementDocument[];
  reviews: Review[];
  actions: Action[];
  requirementActions: RequirementAction[];
  matrixCells: MatrixCell[];
  auditPacks: AuditPack[];
  auditLogs: AuditLog[];

  uploadDocument: (input: EvidenceUploadInput) => Promise<EvidenceDocument>;
  updateDocumentMetadata: (docId: string, updates: Partial<EvidenceDocument>) => Promise<EvidenceDocument>;
  getDocumentSignedUrl: (docId: string) => Promise<string>;
  deleteDocument: (docId: string) => Promise<void>;
  createFrameworkRequirement: (input: {
    title: string;
    description?: string | null;
    owner?: string | null;
    category: string;
    review_frequency: Requirement['review_frequency'];
    review_date?: string | null;
    next_due_date?: string | null;
    risk_level: Requirement['risk_level'];
  }) => Promise<Requirement>;
  updateFrameworkRequirement: (requirementId: string, updates: Partial<Requirement>) => Promise<Requirement>;
  importRequirementTemplateItems: (items: RequirementTemplateItem[]) => Promise<Requirement[]>;
  linkDocumentToRequirement: (requirementId: string, documentId: string) => Promise<void>;
  unlinkDocumentFromRequirement: (requirementId: string, documentId: string) => Promise<void>;
  createRequirement: (title: string, description: string, category: 'Vehicle' | 'Driver' | 'Facility' | 'General', frequency_months?: number, is_mandatory?: boolean) => Promise<ComplianceRequirement>;
  createPack: (name: string, description: string, requirementIds: string[], docIds: string[]) => Promise<AuditPack>;
  updatePackStatus: (packId: string, status: 'Draft' | 'Ready' | 'Sent' | 'Archived') => Promise<void>;
  updateCellMapping: (cellId: string, docId: string | null, status: CellStatus) => Promise<void>;

  readinessReport: ReadinessReport;
  readinessScore: number;
  stats: {
    totalRequirements: number;
    compliantCount: number;
    expiringSoonCount: number;
    expiredCount: number;
    missingCount: number;
    unclassifiedCount: number;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const emptyCollections = {
  requirements: [] as ComplianceRequirement[],
  documents: [] as EvidenceDocument[],
  frameworkRequirements: [] as Requirement[],
  requirementEvidenceTypes: [] as RequirementEvidenceType[],
  requirementDocuments: [] as RequirementDocument[],
  reviews: [] as Review[],
  actions: [] as Action[],
  requirementActions: [] as RequirementAction[],
  matrixCells: [] as MatrixCell[],
  auditPacks: [] as AuditPack[],
  auditLogs: [] as AuditLog[]
};

const emptyReadinessReport = buildReadinessReport({
  requirements: [],
  documents: [],
  requirementDocuments: [],
  reviews: [],
  actions: [],
  requirementActions: []
});

const profileFromAuthUser = (authUser: User): Profile => ({
  id: authUser.id,
  organization_id: null,
  full_name:
    typeof authUser.user_metadata?.full_name === 'string' && authUser.user_metadata.full_name
      ? authUser.user_metadata.full_name
      : authUser.email || 'Vigilen User',
  role: 'Viewer',
  created_at: authUser.created_at || new Date().toISOString(),
  updated_at: new Date().toISOString()
});

const calculateDocumentStatus = (expiryDate: string | null): DocumentStatus => {
  if (!expiryDate) return 'Unclassified';

  const expiry = new Date(expiryDate).getTime();
  const now = Date.now();
  const warningLimit = 30 * 24 * 60 * 60 * 1000;

  if (expiry <= now) return 'Expired';
  if (expiry - now <= warningLimit) return 'Expiring Soon';
  return 'Active';
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [documents, setDocuments] = useState<EvidenceDocument[]>([]);
  const [frameworkRequirements, setFrameworkRequirements] = useState<Requirement[]>([]);
  const [requirementEvidenceTypes, setRequirementEvidenceTypes] = useState<RequirementEvidenceType[]>([]);
  const [requirementDocuments, setRequirementDocuments] = useState<RequirementDocument[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [requirementActions, setRequirementActions] = useState<RequirementAction[]>([]);
  const [matrixCells, setMatrixCells] = useState<MatrixCell[]>([]);
  const [auditPacks, setAuditPacks] = useState<AuditPack[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const readinessReport = useMemo(() => buildReadinessReport({
    requirements: frameworkRequirements,
    documents,
    requirementDocuments,
    reviews,
    actions,
    requirementActions
  }), [actions, documents, frameworkRequirements, requirementActions, requirementDocuments, reviews]);

  const readinessScore = readinessReport.overallScore || 0;
  const stats = useMemo(() => ({
    totalRequirements: readinessReport.requirements.length,
    compliantCount: readinessReport.requirements.filter(item => item.status === 'GREEN').length,
    expiringSoonCount: readinessReport.requirements.filter(item => item.status === 'AMBER').length,
    expiredCount: readinessReport.requirements.filter(item => item.status === 'RED').length,
    missingCount: readinessReport.missingEvidence.length,
    unclassifiedCount: documents.filter(d => d.status === 'Unclassified').length
  }), [documents, readinessReport]);

  const clearWorkspaceState = () => {
    setOrganization(null);
    setRequirements([]);
    setDocuments([]);
    setFrameworkRequirements([]);
    setRequirementEvidenceTypes([]);
    setRequirementDocuments([]);
    setReviews([]);
    setActions([]);
    setRequirementActions([]);
    setMatrixCells([]);
    setAuditPacks([]);
    setAuditLogs([]);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  const loadWorkspaceCollections = async () => {
    const [reqs, docs, frameworkReqs, evidenceTypes, requirementDocLinks, reviewRows, actionRows, reqActionLinks, cells, packs, logs] = await Promise.all([
      dbService.getRequirements(),
      dbService.getDocuments(),
      dbService.getFrameworkRequirements(),
      dbService.getRequirementEvidenceTypes(),
      dbService.getRequirementDocuments(),
      dbService.getReviews(),
      dbService.getActions(),
      dbService.getRequirementActions(),
      dbService.getMatrixCells(),
      dbService.getAuditPacks(),
      dbService.getAuditLogs()
    ]);

    setRequirements(reqs);
    setDocuments(docs);
    setFrameworkRequirements(frameworkReqs);
    setRequirementEvidenceTypes(evidenceTypes);
    setRequirementDocuments(requirementDocLinks);
    setReviews(reviewRows);
    setActions(actionRows);
    setRequirementActions(reqActionLinks);
    setMatrixCells(cells);
    setAuditPacks(packs);
    setAuditLogs(logs);
  };

  const loadDemoData = async () => {
    initMockDb();
    const cachedUser = localStorage.getItem('vigilen_session_user');
    const cachedOrg = localStorage.getItem('vigilen_session_org');

    if (cachedUser && cachedOrg) {
      setUser(JSON.parse(cachedUser));
      setOrganization(JSON.parse(cachedOrg));
    } else {
      const profile = await dbService.getProfile();
      const org = await dbService.getOrganization(profile.organization_id || '');
      setUser(profile);
      setOrganization(org);
      localStorage.setItem('vigilen_session_user', JSON.stringify(profile));
      localStorage.setItem('vigilen_session_org', JSON.stringify(org));
    }

    await loadWorkspaceCollections();
  };

  const loadProductionData = async () => {
    requireProductionEnv(isSupabaseConfigured);
    if (!supabase) throw new Error('Supabase client is not configured.');

    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      const diagnostics = logSupabaseError('auth.getSession', error);
      throw new Error(formatSupabaseError(diagnostics));
    }

    const currentAuthUser = session?.user || null;
    setAuthUser(currentAuthUser);

    if (!currentAuthUser) {
      setUser(null);
      clearWorkspaceState();
      return;
    }

    const fallbackProfile = profileFromAuthUser(currentAuthUser);
    setUser(fallbackProfile);

    const profile = await getCurrentSupabaseProfile();
    setUser(profile || fallbackProfile);

    const org = await getCurrentSupabaseOrganization();
    setOrganization(org);

    if (!org) {
      setRequirements(emptyCollections.requirements);
      setDocuments(emptyCollections.documents);
      setFrameworkRequirements(emptyCollections.frameworkRequirements);
      setRequirementEvidenceTypes(emptyCollections.requirementEvidenceTypes);
      setRequirementDocuments(emptyCollections.requirementDocuments);
      setReviews(emptyCollections.reviews);
      setActions(emptyCollections.actions);
      setRequirementActions(emptyCollections.requirementActions);
      setMatrixCells(emptyCollections.matrixCells);
      setAuditPacks(emptyCollections.auditPacks);
      setAuditLogs(emptyCollections.auditLogs);
      return;
    }

    await loadWorkspaceCollections();
  };

  const loadData = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      if (isDemoMode) {
        await loadDemoData();
      } else {
        await loadProductionData();
      }
    } catch (err) {
      const diagnostics = logSupabaseError('AppContext.loadData', err);
      const message = formatSupabaseError(diagnostics);
      setAuthError(message);
      const currentSessionUser = !isDemoMode && supabase
        ? (await supabase.auth.getSession()).data.session?.user || null
        : null;
      if (currentSessionUser) {
        setAuthUser(currentSessionUser);
        setUser(profileFromAuthUser(currentSessionUser));
      } else if (!authUser) {
        setUser(null);
      }
      clearWorkspaceState();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    if (isDemoMode) {
      const storedTheme = localStorage.getItem('vigilen_theme') as 'light' | 'dark';
      if (storedTheme) setTheme(storedTheme);
      return;
    }

    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void loadData();
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (isDemoMode) {
      localStorage.setItem('vigilen_theme', nextTheme);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthError(null);

    if (isDemoMode) {
      const name = email.split('@')[0];
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
      const mockProfile: Profile = {
        ...MOCK_PROFILE,
        full_name: formattedName || MOCK_PROFILE.full_name,
        updated_at: new Date().toISOString()
      };

      setUser(mockProfile);
      setOrganization(MOCK_ORG);
      localStorage.setItem('vigilen_session_user', JSON.stringify(mockProfile));
      localStorage.setItem('vigilen_session_org', JSON.stringify(MOCK_ORG));
      await loadData();
      return true;
    }

    requireProductionEnv(isSupabaseConfigured);
    if (!supabase) throw new Error('Supabase client is not configured.');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      throw new Error(error.message);
    }

    await loadData();
    return true;
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setAuthError(null);

    if (isDemoMode) {
      const newProfile: Profile = {
        ...MOCK_PROFILE,
        full_name: name || MOCK_PROFILE.full_name,
        updated_at: new Date().toISOString()
      };
      setUser(newProfile);
      setOrganization(MOCK_ORG);
      localStorage.setItem('vigilen_session_user', JSON.stringify(newProfile));
      localStorage.setItem('vigilen_session_org', JSON.stringify(MOCK_ORG));
      await loadData();
      return true;
    }

    requireProductionEnv(isSupabaseConfigured);
    if (!supabase) throw new Error('Supabase client is not configured.');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name
        }
      }
    });

    if (error) {
      const diagnostics = logSupabaseError('rpc.create_organization_for_current_user', error);
      const message = formatSupabaseError(diagnostics);
      setAuthError(message);
      throw new Error(message);
    }

    await loadData();
    return true;
  };

  const resetPassword = async (email: string): Promise<void> => {
    setAuthError(null);
    if (isDemoMode) return;
    requireProductionEnv(isSupabaseConfigured);
    if (!supabase) throw new Error('Supabase client is not configured.');

    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      setAuthError(error.message);
      throw new Error(error.message);
    }
  };

  const createOrganization = async (
    name: string,
    industry: string | null = null,
    country: string = 'Ireland'
  ): Promise<Organization> => {
    if (!name.trim()) throw new Error('Organisation name is required.');

    if (isDemoMode) {
      const newOrg: Organization = {
        id: `org-${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        compliance_profile: industry || 'Standard',
        industry,
        country: country || 'Ireland',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      localStorage.setItem('vigilen_org', JSON.stringify(newOrg));
      localStorage.setItem('vigilen_session_org', JSON.stringify(newOrg));
      setOrganization(newOrg);
      return newOrg;
    }

    requireProductionEnv(isSupabaseConfigured);
    if (!supabase) throw new Error('Supabase client is not configured.');

    const { data, error } = await supabase.rpc('create_organization_for_current_user', {
      org_name: name.trim(),
      org_industry: industry || null,
      org_country: country || 'Ireland',
      profile_full_name: user?.full_name || authUser?.user_metadata?.full_name || null
    });

    if (error) {
      setAuthError(error.message);
      throw new Error(error.message);
    }

    const organizationId = Array.isArray(data) ? data[0]?.organization_id : null;
    if (!organizationId) throw new Error('Organisation onboarding did not return an organization id.');

    await loadData();
    const org = await dbService.getOrganization(organizationId);
    setOrganization(org);
    return org;
  };

  const logout = async () => {
    setAuthError(null);
    setAuthUser(null);
    setUser(null);
    clearWorkspaceState();

    if (isDemoMode) {
      localStorage.removeItem('vigilen_session_user');
      localStorage.removeItem('vigilen_session_org');
      return;
    }

    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
    }
  };

  const updateOrgProfile = async (updates: Partial<Organization>) => {
    if (!organization) return;
    const updated = await dbService.updateOrganization(organization.id, updates);
    setOrganization(updated);
    if (isDemoMode) {
      localStorage.setItem('vigilen_session_org', JSON.stringify(updated));
    }
    const logs = await dbService.getAuditLogs();
    setAuditLogs(logs);
  };

  const uploadDocument = async (input: EvidenceUploadInput): Promise<EvidenceDocument> => {
    const status = calculateDocumentStatus(input.expiry_date);
    const doc = await dbService.uploadDocumentFile({
      ...input,
      title: input.title.trim(),
      metadata: input.metadata || {},
      tags: input.tags || [],
      status
    });

    await loadWorkspaceCollections();
    return doc;
  };

  const updateDocumentMetadata = async (docId: string, updates: Partial<EvidenceDocument>): Promise<EvidenceDocument> => {
    if (updates.expiry_date !== undefined) {
      updates.status = calculateDocumentStatus(updates.expiry_date);
    }

    const updated = await dbService.updateDocument(docId, updates);
    await loadWorkspaceCollections();
    return updated;
  };

  const getDocumentSignedUrl = async (docId: string): Promise<string> => {
    return dbService.getDocumentSignedUrl(docId);
  };

  const deleteDocument = async (docId: string) => {
    await dbService.deleteDocument(docId);
    await loadWorkspaceCollections();
  };

  const createFrameworkRequirement: AppContextType['createFrameworkRequirement'] = async (input) => {
    const created = await dbService.addFrameworkRequirement({
      title: input.title.trim(),
      description: input.description || null,
      owner: input.owner || null,
      category: input.category,
      status: 'GREY',
      review_frequency: input.review_frequency,
      review_date: input.review_date || null,
      next_due_date: input.next_due_date || null,
      risk_level: input.risk_level
    });
    await loadWorkspaceCollections();
    return created;
  };

  const updateFrameworkRequirement = async (requirementId: string, updates: Partial<Requirement>): Promise<Requirement> => {
    const updated = await dbService.updateFrameworkRequirement(requirementId, updates);
    await loadWorkspaceCollections();
    return updated;
  };

  const importRequirementTemplateItems = async (items: RequirementTemplateItem[]): Promise<Requirement[]> => {
    const existingKeys = new Set(
      frameworkRequirements.map(requirement => `${requirement.title.trim().toLowerCase()}::${requirement.category.trim().toLowerCase()}`)
    );
    const createdRequirements: Requirement[] = [];

    for (const item of items) {
      const key = `${item.title.trim().toLowerCase()}::${item.category.trim().toLowerCase()}`;
      if (existingKeys.has(key)) continue;

      const created = await dbService.addFrameworkRequirement({
        title: item.title.trim(),
        description: item.description || null,
        owner: item.suggested_owner || null,
        category: item.category,
        status: 'GREY',
        review_frequency: item.review_frequency,
        review_date: null,
        next_due_date: null,
        risk_level: item.risk_level
      });
      await dbService.addRequirementEvidenceTypes(created.id, item.suggested_evidence_types);
      existingKeys.add(key);
      createdRequirements.push(created);
    }

    await loadWorkspaceCollections();
    return createdRequirements;
  };

  const linkDocumentToRequirement = async (requirementId: string, documentId: string): Promise<void> => {
    await dbService.linkDocumentToRequirement(requirementId, documentId);
    await loadWorkspaceCollections();
  };

  const unlinkDocumentFromRequirement = async (requirementId: string, documentId: string): Promise<void> => {
    await dbService.unlinkDocumentFromRequirement(requirementId, documentId);
    await loadWorkspaceCollections();
  };

  const createRequirement = async (
    title: string,
    description: string,
    category: 'Vehicle' | 'Driver' | 'Facility' | 'General',
    frequency_months?: number,
    is_mandatory: boolean = true
  ): Promise<ComplianceRequirement> => {
    if (!organization) throw new Error('No active organization');
    const newReq = await dbService.addRequirement({
      organization_id: organization.id,
      title,
      description,
      category,
      frequency_months,
      is_mandatory
    });

    const reqs = await dbService.getRequirements();
    setRequirements(reqs);

    if (!isDemoMode) return newReq;

    const cells = getStorageItem('vigilen_cells', MOCK_CELLS);
    const targetType = category === 'Driver' ? 'Personnel' : category === 'General' ? 'Facility' : category;
    const uniqueTargets = Array.from(new Set(cells.filter((c: any) => c.target_type === targetType).map((c: any) => c.target_name)));
    const sampleTarget = uniqueTargets.length > 0 ? uniqueTargets[0] as string : 'HQ Operations';
    const cellTargetType = targetType as 'Vehicle' | 'Facility' | 'Personnel';

    const newCell: MatrixCell = {
      id: `cell-${Math.random().toString(36).substr(2, 9)}`,
      organization_id: organization.id,
      requirement_id: newReq.id,
      target_name: sampleTarget,
      target_type: cellTargetType,
      document_id: null,
      status: 'Missing',
      last_checked_at: new Date().toISOString()
    };
    cells.push(newCell);
    setStorageItem('vigilen_cells', cells);
    await loadWorkspaceCollections();
    return newReq;
  };

  const createPack = async (name: string, description: string, requirementIds: string[], docIds: string[]): Promise<AuditPack> => {
    const newPack = await dbService.addAuditPack({
      name,
      description,
      status: 'Draft',
      share_token: null,
      share_expires_at: null,
      pin_code: null,
      requirements: requirementIds,
      documents: docIds,
      created_by: user?.id || null
    });

    await loadWorkspaceCollections();
    return newPack;
  };

  const updatePackStatus = async (packId: string, status: 'Draft' | 'Ready' | 'Sent' | 'Archived') => {
    await dbService.updateAuditPack(packId, { status });
    const packs = await dbService.getAuditPacks();
    setAuditPacks(packs);
  };

  const updateCellMapping = async (cellId: string, docId: string | null, status: CellStatus) => {
    await dbService.updateMatrixCell(cellId, {
      document_id: docId,
      status,
      last_checked_at: new Date().toISOString()
    });

    const cells = await dbService.getMatrixCells();
    setMatrixCells(cells);

    const targetCell = cells.find(c => c.id === cellId);
    if (targetCell) {
      await dbService.logActivity('Matrix Updated', `Updated compliance link for "${targetCell.target_name}" -> Status: ${status}`);
      const logs = await dbService.getAuditLogs();
      setAuditLogs(logs);
    }
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        authUser,
        user,
        organization,
        isLoading,
        authError,
        isAuthenticated: !!user,
        hasOrganization: !!organization,
        login,
        register,
        resetPassword,
        logout,
        createOrganization,
        refreshSession: loadData,
        updateOrgProfile,
        requirements,
        documents,
        frameworkRequirements,
        requirementEvidenceTypes,
        requirementDocuments,
        reviews,
        actions,
        requirementActions,
        matrixCells,
        auditPacks,
        auditLogs,
        uploadDocument,
        updateDocumentMetadata,
        getDocumentSignedUrl,
        deleteDocument,
        createFrameworkRequirement,
        updateFrameworkRequirement,
        importRequirementTemplateItems,
        linkDocumentToRequirement,
        unlinkDocumentFromRequirement,
        createRequirement,
        createPack,
        updatePackStatus,
        updateCellMapping,
        readinessReport: readinessReport || emptyReadinessReport,
        readinessScore,
        stats
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export function useCurrentOrganization() {
  const { organization, hasOrganization, isLoading } = useApp();
  return {
    organization,
    hasOrganization,
    isLoading
  };
}
