'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { dbService, initMockDb, MOCK_ORG, MOCK_CELLS, getStorageItem, setStorageItem } from '@/lib/db';
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
  
  // Auth & Org
  user: Profile | null;
  organization: Organization | null;
  isLoading: boolean;
  login: (email: string) => Promise<boolean>;
  register: (name: string, orgName: string, complianceProfile: string) => Promise<boolean>;
  logout: () => void;
  updateOrgProfile: (updates: Partial<Organization>) => Promise<void>;

  // Data State
  requirements: ComplianceRequirement[];
  documents: EvidenceDocument[];
  matrixCells: MatrixCell[];
  auditPacks: AuditPack[];
  auditLogs: AuditLog[];

  // Actions
  uploadDocument: (title: string, file_name: string, category: string, file_size_bytes: number, expiry_date: string | null, issue_date: string | null, metadata: Record<string, any>) => Promise<EvidenceDocument>;
  updateDocumentMetadata: (docId: string, updates: Partial<EvidenceDocument>) => Promise<EvidenceDocument>;
  deleteDocument: (docId: string) => Promise<void>;
  createRequirement: (title: string, description: string, category: 'Vehicle' | 'Driver' | 'Facility' | 'General', frequency_months?: number, is_mandatory?: boolean) => Promise<ComplianceRequirement>;
  createPack: (name: string, description: string, docIds: string[], pinCode: string | null) => Promise<AuditPack>;
  updatePackStatus: (packId: string, status: 'Draft' | 'Active' | 'Archived') => Promise<void>;
  updateCellMapping: (cellId: string, docId: string | null, status: CellStatus) => Promise<void>;

  // Metrics
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [user, setUser] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [documents, setDocuments] = useState<EvidenceDocument[]>([]);
  const [matrixCells, setMatrixCells] = useState<MatrixCell[]>([]);
  const [auditPacks, setAuditPacks] = useState<AuditPack[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Stats / Metrics
  const [readinessScore, setReadinessScore] = useState<number>(0);
  const [stats, setStats] = useState({
    totalRequirements: 0,
    compliantCount: 0,
    expiringSoonCount: 0,
    expiredCount: 0,
    missingCount: 0,
    unclassifiedCount: 0
  });

  // Handle dark mode DOM modifications
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

  // Load Initial Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      initMockDb();
      // Check if session is stored in localStorage
      const cachedUser = localStorage.getItem('vigilen_session_user');
      const cachedOrg = localStorage.getItem('vigilen_session_org');

      if (cachedUser && cachedOrg) {
        setUser(JSON.parse(cachedUser));
        setOrganization(JSON.parse(cachedOrg));
      } else {
        // Default seed setup
        const profile = await dbService.getProfile();
        const org = await dbService.getOrganization(profile.organization_id || '');
        setUser(profile);
        setOrganization(org);
        localStorage.setItem('vigilen_session_user', JSON.stringify(profile));
        localStorage.setItem('vigilen_session_org', JSON.stringify(org));
      }

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
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Fetch theme preference
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('vigilen_theme') as 'light' | 'dark';
      if (storedTheme) setTheme(storedTheme);
    }
  }, []);

  // Recalculate Compliance Metrics whenever cells or docs change
  useEffect(() => {
    if (matrixCells.length === 0) return;

    const totalCells = matrixCells.length;
    const compliant = matrixCells.filter(c => c.status === 'Compliant').length;
    const expiringSoon = matrixCells.filter(c => c.status === 'Expiring Soon').length;
    const expired = matrixCells.filter(c => c.status === 'Expired').length;
    const missing = matrixCells.filter(c => c.status === 'Missing').length;

    // Unclassified documents are files in Vault that have status 'Unclassified'
    const unclassified = documents.filter(d => d.status === 'Unclassified').length;

    // Score = (Compliant + (ExpiringSoon * 0.5)) / Total Cells * 100
    const calculatedScore = totalCells > 0
      ? Math.round(((compliant + expiringSoon * 0.5) / totalCells) * 100)
      : 0;

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
    localStorage.setItem('vigilen_theme', nextTheme);
  };

  // Auth Operations
  const login = async (email: string): Promise<boolean> => {
    // Normalizing email to set profile
    const name = email.split('@')[0];
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
    
    const mockProfile: Profile = {
      id: 'usr-jane-doe',
      organization_id: 'org-apex-101',
      full_name: formattedName || 'Jane Doe',
      role: 'Admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setUser(mockProfile);
    setOrganization(MOCK_ORG);
    localStorage.setItem('vigilen_session_user', JSON.stringify(mockProfile));
    localStorage.setItem('vigilen_session_org', JSON.stringify(MOCK_ORG));
    await loadData();
    return true;
  };

  const register = async (name: string, orgName: string, complianceProfile: string): Promise<boolean> => {
    const newOrg: Organization = {
      id: `org-${Math.random().toString(36).substr(2, 9)}`,
      name: orgName,
      compliance_profile: complianceProfile,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const newProfile: Profile = {
      id: `usr-${Math.random().toString(36).substr(2, 9)}`,
      organization_id: newOrg.id,
      full_name: name,
      role: 'Admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Override local storage settings
    localStorage.setItem('vigilen_org', JSON.stringify(newOrg));
    localStorage.setItem('vigilen_profile', JSON.stringify(newProfile));
    
    // Seed fresh template requirements and columns
    const initialReqs: ComplianceRequirement[] = [
      {
        id: 'req-lic',
        organization_id: newOrg.id,
        title: 'Core Business Operating License',
        description: 'Mandatory governmental authorization to operate transport or logistics service.',
        category: 'General',
        frequency_months: 12,
        is_mandatory: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'req-veh-mot',
        organization_id: newOrg.id,
        title: 'Vehicle Roadworthiness MOT',
        description: 'Annual safety inspection compliance document.',
        category: 'Vehicle',
        frequency_months: 12,
        is_mandatory: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'req-drv-ins',
        organization_id: newOrg.id,
        title: 'Operator Liability Insurance',
        description: 'Transit and goods vehicle legal liability certificate.',
        category: 'General',
        frequency_months: 12,
        is_mandatory: true,
        created_at: new Date().toISOString()
      }
    ];

    const initialCells: MatrixCell[] = [
      {
        id: 'c-1',
        organization_id: newOrg.id,
        requirement_id: 'req-lic',
        target_name: 'HQ Operations',
        target_type: 'Facility',
        document_id: null,
        status: 'Missing',
        last_checked_at: new Date().toISOString()
      },
      {
        id: 'c-2',
        organization_id: newOrg.id,
        requirement_id: 'req-veh-mot',
        target_name: 'Fleet Vehicle - Truck 01',
        target_type: 'Vehicle',
        document_id: null,
        status: 'Missing',
        last_checked_at: new Date().toISOString()
      },
      {
        id: 'c-3',
        organization_id: newOrg.id,
        requirement_id: 'req-drv-ins',
        target_name: 'HQ Operations',
        target_type: 'Facility',
        document_id: null,
        status: 'Missing',
        last_checked_at: new Date().toISOString()
      }
    ];

    localStorage.setItem('vigilen_requirements', JSON.stringify(initialReqs));
    localStorage.setItem('vigilen_documents', JSON.stringify([]));
    localStorage.setItem('vigilen_cells', JSON.stringify(initialCells));
    localStorage.setItem('vigilen_audit_packs', JSON.stringify([]));
    localStorage.setItem('vigilen_logs', JSON.stringify([
      {
        id: 'log-welcome',
        organization_id: newOrg.id,
        profile_id: newProfile.id,
        action: 'Account Created',
        details: `Organization "${orgName}" initialized under compliance profile "${complianceProfile}".`,
        created_at: new Date().toISOString()
      }
    ]));
    localStorage.setItem('vigilen_initialized', 'true');

    // Establish session
    setUser(newProfile);
    setOrganization(newOrg);
    localStorage.setItem('vigilen_session_user', JSON.stringify(newProfile));
    localStorage.setItem('vigilen_session_org', JSON.stringify(newOrg));

    await loadData();
    return true;
  };

  const logout = () => {
    setUser(null);
    setOrganization(null);
    localStorage.removeItem('vigilen_session_user');
    localStorage.removeItem('vigilen_session_org');
  };

  const updateOrgProfile = async (updates: Partial<Organization>) => {
    if (!organization) return;
    const updated = await dbService.updateOrganization(organization.id, updates);
    setOrganization(updated);
    localStorage.setItem('vigilen_session_org', JSON.stringify(updated));
    const logs = await dbService.getAuditLogs();
    setAuditLogs(logs);
  };

  // Documents
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
      const warningLimit = 30 * 24 * 60 * 60 * 1000; // 30 days
      if (exp <= now) {
        initialStatus = 'Expired';
      } else if (exp - now <= warningLimit) {
        initialStatus = 'Expiring Soon';
      }
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

    // Refresh state
    const docs = await dbService.getDocuments();
    const cells = await dbService.getMatrixCells();
    const logs = await dbService.getAuditLogs();

    setDocuments(docs);
    setMatrixCells(cells);
    setAuditLogs(logs);

    return doc;
  };

  const updateDocumentMetadata = async (docId: string, updates: Partial<EvidenceDocument>): Promise<EvidenceDocument> => {
    // If updating expiry date, recalculate document status
    if (updates.expiry_date !== undefined) {
      if (updates.expiry_date === null) {
        updates.status = 'Unclassified';
      } else {
        const exp = new Date(updates.expiry_date).getTime();
        const now = Date.now();
        const warningLimit = 30 * 24 * 60 * 60 * 1000;
        if (exp <= now) {
          updates.status = 'Expired';
        } else if (exp - now <= warningLimit) {
          updates.status = 'Expiring Soon';
        } else {
          updates.status = 'Active';
        }
      }
    }

    const updated = await dbService.updateDocument(docId, updates);
    
    // Refresh states
    const docs = await dbService.getDocuments();
    const cells = await dbService.getMatrixCells();
    const logs = await dbService.getAuditLogs();

    setDocuments(docs);
    setMatrixCells(cells);
    setAuditLogs(logs);

    return updated;
  };

  const deleteDocument = async (docId: string) => {
    await dbService.deleteDocument(docId);
    
    const docs = await dbService.getDocuments();
    const cells = await dbService.getMatrixCells();
    const logs = await dbService.getAuditLogs();

    setDocuments(docs);
    setMatrixCells(cells);
    setAuditLogs(logs);
  };

  // Requirements
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

    // Auto seed blank matrix cell for at least one target of this type to maintain grid structure
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
    
    const refreshedCells = await dbService.getMatrixCells();
    setMatrixCells(refreshedCells);
    
    const logs = await dbService.getAuditLogs();
    setAuditLogs(logs);

    return newReq;
  };

  // Audit Packs
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

    const packs = await dbService.getAuditPacks();
    setAuditPacks(packs);

    const logs = await dbService.getAuditLogs();
    setAuditLogs(logs);

    return newPack;
  };

  const updatePackStatus = async (packId: string, status: 'Draft' | 'Active' | 'Archived') => {
    await dbService.updateAuditPack(packId, { status });
    const packs = await dbService.getAuditPacks();
    setAuditPacks(packs);
  };

  // Matrix Cell updates
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
        user,
        organization,
        isLoading,
        login,
        register,
        logout,
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
