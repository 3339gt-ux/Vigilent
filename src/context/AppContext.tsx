'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  matrixCells: MatrixCell[];
  auditPacks: AuditPack[];
  auditLogs: AuditLog[];

  uploadDocument: (title: string, file_name: string, category: string, file_size_bytes: number, expiry_date: string | null, issue_date: string | null, metadata: Record<string, any>) => Promise<EvidenceDocument>;
  updateDocumentMetadata: (docId: string, updates: Partial<EvidenceDocument>) => Promise<EvidenceDocument>;
  deleteDocument: (docId: string) => Promise<void>;
  createRequirement: (title: string, description: string, category: 'Vehicle' | 'Driver' | 'Facility' | 'General', frequency_months?: number, is_mandatory?: boolean) => Promise<ComplianceRequirement>;
  createPack: (name: string, description: string, docIds: string[], pinCode: string | null) => Promise<AuditPack>;
  updatePackStatus: (packId: string, status: 'Draft' | 'Active' | 'Archived') => Promise<void>;
  updateCellMapping: (cellId: string, docId: string | null, status: CellStatus) => Promise<void>;

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

const emptyStats = {
  totalRequirements: 0,
  compliantCount: 0,
  expiringSoonCount: 0,
  expiredCount: 0,
  missingCount: 0,
  unclassifiedCount: 0
};

const emptyCollections = {
  requirements: [] as ComplianceRequirement[],
  documents: [] as EvidenceDocument[],
  matrixCells: [] as MatrixCell[],
  auditPacks: [] as AuditPack[],
  auditLogs: [] as AuditLog[]
};

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

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [documents, setDocuments] = useState<EvidenceDocument[]>([]);
  const [matrixCells, setMatrixCells] = useState<MatrixCell[]>([]);
  const [auditPacks, setAuditPacks] = useState<AuditPack[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [readinessScore, setReadinessScore] = useState<number>(0);
  const [stats, setStats] = useState(emptyStats);

  const clearWorkspaceState = () => {
    setOrganization(null);
    setRequirements([]);
    setDocuments([]);
    setMatrixCells([]);
    setAuditPacks([]);
    setAuditLogs([]);
    setReadinessScore(0);
    setStats(emptyStats);
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
    const [reqs, docs, cells, packs, logs] = await Promise.all([
      dbService.getRequirements(),
      dbService.getDocuments(),
      dbService.getMatrixCells(),
      dbService.getAuditPacks(),
      dbService.getAuditLogs()
    ]);

    setRequirements(reqs);
    setDocuments(docs);
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

  useEffect(() => {
    if (matrixCells.length === 0) {
      setReadinessScore(0);
      setStats(emptyStats);
      return;
    }

    const totalCells = matrixCells.length;
    const compliant = matrixCells.filter(c => c.status === 'Compliant').length;
    const expiringSoon = matrixCells.filter(c => c.status === 'Expiring Soon').length;
    const expired = matrixCells.filter(c => c.status === 'Expired').length;
    const missing = matrixCells.filter(c => c.status === 'Missing').length;
    const unclassified = documents.filter(d => d.status === 'Unclassified').length;
    const calculatedScore = Math.round(((compliant + expiringSoon * 0.5) / totalCells) * 100);

    setReadinessScore(calculatedScore);
    setStats({
      totalRequirements: totalCells,
      compliantCount: compliant,
      expiringSoonCount: expiringSoon,
      expiredCount: expired,
      missingCount: missing,
      unclassifiedCount: unclassified
    });
  }, [matrixCells, documents]);

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

  const uploadDocument = async (
    title: string,
    file_name: string,
    category: string,
    file_size_bytes: number,
    expiry_date: string | null,
    issue_date: string | null,
    metadata: Record<string, any>
  ): Promise<EvidenceDocument> => {
    let initialStatus: DocumentStatus = 'Active';
    if (expiry_date) {
      const exp = new Date(expiry_date).getTime();
      const now = Date.now();
      const warningLimit = 30 * 24 * 60 * 60 * 1000;
      if (exp <= now) initialStatus = 'Expired';
      else if (exp - now <= warningLimit) initialStatus = 'Expiring Soon';
    } else {
      initialStatus = 'Unclassified';
    }

    const doc = await dbService.addDocument({
      title,
      file_name,
      file_size_bytes,
      category,
      uploaded_by: user?.id || null,
      file_url: null,
      status: initialStatus,
      expiry_date,
      issue_date,
      metadata
    });

    await loadWorkspaceCollections();
    return doc;
  };

  const updateDocumentMetadata = async (docId: string, updates: Partial<EvidenceDocument>): Promise<EvidenceDocument> => {
    if (updates.expiry_date !== undefined) {
      if (updates.expiry_date === null) {
        updates.status = 'Unclassified';
      } else {
        const exp = new Date(updates.expiry_date).getTime();
        const now = Date.now();
        const warningLimit = 30 * 24 * 60 * 60 * 1000;
        if (exp <= now) updates.status = 'Expired';
        else if (exp - now <= warningLimit) updates.status = 'Expiring Soon';
        else updates.status = 'Active';
      }
    }

    const updated = await dbService.updateDocument(docId, updates);
    await loadWorkspaceCollections();
    return updated;
  };

  const deleteDocument = async (docId: string) => {
    await dbService.deleteDocument(docId);
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

  const createPack = async (name: string, description: string, docIds: string[], pinCode: string | null): Promise<AuditPack> => {
    const newPack = await dbService.addAuditPack({
      name,
      description,
      status: 'Draft',
      share_token: null,
      share_expires_at: null,
      pin_code: pinCode,
      documents: docIds,
      created_by: user?.id || null
    });

    await loadWorkspaceCollections();
    return newPack;
  };

  const updatePackStatus = async (packId: string, status: 'Draft' | 'Active' | 'Archived') => {
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
        matrixCells,
        auditPacks,
        auditLogs,
        uploadDocument,
        updateDocumentMetadata,
        deleteDocument,
        createRequirement,
        createPack,
        updatePackStatus,
        updateCellMapping,
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
