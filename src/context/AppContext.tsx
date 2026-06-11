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
import { buildCompetencySummary, CompetencySummary } from '@/lib/competencyEngine';
import {
  Profile,
  Organization,
  ComplianceRequirement,
  EvidenceDocument,
  MatrixCell,
  AuditPack,
  AuditLog,
  WorkspaceNotification,
  CellStatus,
  DocumentStatus,
  EvidenceUploadInput,
  Requirement,
  RequirementAction,
  RequirementEvidenceCriterion,
  RequirementEvidenceCriterionMatch,
  RequirementDocument,
  RequirementEvidenceType,
  Review,
  Action,
  ActionDocument,
  ActionObjectLink,
  ActionUpdate,
  ActionUpdateType,
  ActionStatus,
  CompetencyRecord,
  CompetencyRecordDocument,
  CompetencyTemplateItem,
  CompetencyType,
  ManagedCategory,
  Person,
  RequirementCompetencyType,
  RequirementTemplateItem,
  Asset,
  AssetCheckType,
  AssetCheckAssignment,
  AssetCheckRecord,
  AssetCheckEvidenceLink,
  AssetRequirementLink,
  AssetHistoryEvent
} from '@/lib/types';
export type ThemePreference = 'light' | 'midtone' | 'dark';
export type VygilenceTheme = 'sentinel' | 'obsidian' | 'emerald-watch' | 'amber-beacon' | 'arc-reactor' | 'iron-ledger' | 'vanguard';
export type InterfaceStyle = 'focused' | 'balanced' | 'command-centre' | 'executive';
export type InterfaceDetailLevel = 'focused' | 'advanced';

interface AppContextType {
  theme: ThemePreference;
  themePreference: ThemePreference;
  vygilenceTheme: VygilenceTheme;
  interfaceStyle: InterfaceStyle;
  interfaceDetailLevel: InterfaceDetailLevel;
  toggleTheme: () => void;
  setThemePreference: (pref: ThemePreference) => void;
  setVygilenceTheme: (theme: VygilenceTheme) => void;
  setInterfaceStyle: (style: InterfaceStyle) => void;
  setInterfaceDetailLevel: (level: InterfaceDetailLevel) => void;

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
  resetDemoData: () => Promise<void>;
  updateOrgProfile: (updates: Partial<Organization>) => Promise<void>;

  requirements: ComplianceRequirement[];
  documents: EvidenceDocument[];
  archivedDocuments: EvidenceDocument[];
  frameworkRequirements: Requirement[];
  requirementEvidenceTypes: RequirementEvidenceType[];
  requirementDocuments: RequirementDocument[];
  requirementEvidenceCriteria: RequirementEvidenceCriterion[];
  requirementEvidenceCriterionMatches: RequirementEvidenceCriterionMatch[];
  reviews: Review[];
  actions: Action[];
  requirementActions: RequirementAction[];
  actionUpdates: ActionUpdate[];
  actionDocuments: ActionDocument[];
  actionObjectLinks: ActionObjectLink[];
  people: Person[];
  competencyTypes: CompetencyType[];
  competencyRecords: CompetencyRecord[];
  competencyRecordDocuments: CompetencyRecordDocument[];
  requirementCompetencyTypes: RequirementCompetencyType[];
  requirementCategories: ManagedCategory[];
  evidenceCategories: ManagedCategory[];
  matrixCells: MatrixCell[];
  auditPacks: AuditPack[];
  auditLogs: AuditLog[];
  notifications: WorkspaceNotification[];

  uploadDocument: (input: EvidenceUploadInput) => Promise<EvidenceDocument>;
  updateDocumentMetadata: (docId: string, updates: Partial<EvidenceDocument>) => Promise<EvidenceDocument>;
  getDocumentSignedUrl: (docId: string) => Promise<string>;
  deleteDocument: (docId: string) => Promise<void>;
  restoreDocument: (docId: string) => Promise<EvidenceDocument>;
  permanentlyDeleteDocument: (docId: string) => Promise<void>;
  findPossibleDuplicateDocuments: (file: File, fileHash?: string | null) => Promise<EvidenceDocument[]>;
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
  archiveFrameworkRequirement: (requirementId: string) => Promise<Requirement>;
  restoreFrameworkRequirement: (requirementId: string) => Promise<Requirement>;
  deactivateFrameworkRequirement: (requirementId: string) => Promise<Requirement>;
  deleteFrameworkRequirement: (requirementId: string) => Promise<void>;
  upsertRequirementCategory: (input: Partial<ManagedCategory> & Pick<ManagedCategory, 'name'>) => Promise<ManagedCategory>;
  archiveRequirementCategory: (categoryId: string) => Promise<ManagedCategory>;
  upsertEvidenceCategory: (input: Partial<ManagedCategory> & Pick<ManagedCategory, 'name'>) => Promise<ManagedCategory>;
  archiveEvidenceCategory: (categoryId: string) => Promise<ManagedCategory>;
  importRequirementTemplateItems: (items: RequirementTemplateItem[]) => Promise<Requirement[]>;
  linkDocumentToRequirement: (requirementId: string, documentId: string) => Promise<void>;
  unlinkDocumentFromRequirement: (requirementId: string, documentId: string) => Promise<void>;
  upsertRequirementEvidenceCriterion: (input: Partial<RequirementEvidenceCriterion> & Pick<RequirementEvidenceCriterion, 'requirement_id' | 'title'>) => Promise<RequirementEvidenceCriterion>;
  deleteRequirementEvidenceCriterion: (criterionId: string) => Promise<void>;
  linkDocumentToEvidenceCriterion: (criterionId: string, documentId: string, notes?: string | null) => Promise<void>;
  unlinkDocumentFromEvidenceCriterion: (criterionId: string, documentId: string) => Promise<void>;
  uploadEvidenceForCriterion: (criterionId: string, file: File, category?: string) => Promise<EvidenceDocument>;
  createActionForRequirement: (
    requirementId: string,
    actionInput: {
      title: string;
      description: string | null;
      owner: string | null;
      due_date: string | null;
      status: ActionStatus;
    }
  ) => Promise<void>;
  updateAction: (actionId: string, updates: Partial<Action>) => Promise<Action>;
  addActionUpdate: (actionId: string, updateType: ActionUpdateType, note: string) => Promise<ActionUpdate>;
  linkDocumentToAction: (actionId: string, documentId: string) => Promise<void>;
  unlinkDocumentFromAction: (actionId: string, documentId: string) => Promise<void>;
  uploadActionAttachment: (actionId: string, file: File) => Promise<EvidenceDocument>;
  upsertPerson: (input: Partial<Person> & Pick<Person, 'first_name' | 'last_name' | 'person_type'>) => Promise<Person>;
  upsertCompetencyType: (input: Partial<CompetencyType> & Pick<CompetencyType, 'title' | 'category'>) => Promise<CompetencyType>;
  importCompetencyTemplateItems: (items: CompetencyTemplateItem[]) => Promise<CompetencyType[]>;
  upsertCompetencyRecord: (input: Partial<CompetencyRecord> & Pick<CompetencyRecord, 'person_id' | 'competency_type_id'>) => Promise<CompetencyRecord>;
  linkDocumentToCompetencyRecord: (recordId: string, documentId: string) => Promise<void>;
  unlinkDocumentFromCompetencyRecord: (recordId: string, documentId: string) => Promise<void>;
  uploadCompetencyEvidence: (recordId: string, file: File) => Promise<EvidenceDocument>;
  linkCompetencyTypeToRequirement: (requirementId: string, competencyTypeId: string) => Promise<void>;
  unlinkCompetencyTypeFromRequirement: (requirementId: string, competencyTypeId: string) => Promise<void>;
  createActionForCompetencyGap: (input: {
    personId: string;
    competencyTypeId: string;
    competencyRecordId?: string | null;
    title: string;
    dueDate?: string | null;
  }) => Promise<Action>;
  createRequirement: (title: string, description: string, category: 'Vehicle' | 'Driver' | 'Facility' | 'General', frequency_months?: number, is_mandatory?: boolean) => Promise<ComplianceRequirement>;
  createPack: (name: string, description: string, requirementIds: string[], docIds: string[]) => Promise<AuditPack>;
  updatePackStatus: (packId: string, status: 'Draft' | 'Ready' | 'Sent' | 'Archived') => Promise<void>;
  updateCellMapping: (cellId: string, docId: string | null, status: CellStatus) => Promise<void>;
  markNotificationRead: (notificationId: string, read?: boolean) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  
  // Asset Assurance System State & Operations
  assets: Asset[];
  assetCheckTypes: AssetCheckType[];
  assetCheckAssignments: AssetCheckAssignment[];
  assetCheckRecords: AssetCheckRecord[];
  assetCheckEvidenceLinks: AssetCheckEvidenceLink[];
  assetRequirementLinks: AssetRequirementLink[];
  assetHistoryEvents: AssetHistoryEvent[];
  createAsset: (asset: Omit<Asset, 'id' | 'created_at' | 'updated_at'>) => Promise<Asset>;
  updateAsset: (assetId: string, updates: Partial<Asset>) => Promise<Asset>;
  deleteAsset: (assetId: string) => Promise<void>;
  createAssetCheckType: (checkType: Omit<AssetCheckType, 'id' | 'created_at' | 'updated_at'>) => Promise<AssetCheckType>;
  createAssetCheckAssignment: (assignment: Omit<AssetCheckAssignment, 'id' | 'created_at' | 'updated_at'>) => Promise<AssetCheckAssignment>;
  updateAssetCheckAssignment: (assignmentId: string, updates: Partial<AssetCheckAssignment>) => Promise<AssetCheckAssignment>;
  createAssetCheckRecord: (record: Omit<AssetCheckRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<AssetCheckRecord>;
  linkAssetCheckEvidence: (assignmentId: string, recordId: string, documentId: string, assetId: string) => Promise<AssetCheckEvidenceLink>;
  createAssetHistoryEvent: (event: Omit<AssetHistoryEvent, 'id' | 'created_at' | 'updated_at'>) => Promise<AssetHistoryEvent>;

  readinessReport: ReadinessReport;
  competencySummary: CompetencySummary;
  readinessScore: number;
  stats: {
    totalRequirements: number;
    compliantCount: number;
    expiringSoonCount: number;
    expiredCount: number;
    missingCount: number;
    unclassifiedCount: number;
    activeRequirements: number;
    archivedRequirements: number;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const emptyCollections = {
  requirements: [] as ComplianceRequirement[],
  documents: [] as EvidenceDocument[],
  archivedDocuments: [] as EvidenceDocument[],
  frameworkRequirements: [] as Requirement[],
  requirementEvidenceTypes: [] as RequirementEvidenceType[],
  requirementDocuments: [] as RequirementDocument[],
  requirementEvidenceCriteria: [] as RequirementEvidenceCriterion[],
  requirementEvidenceCriterionMatches: [] as RequirementEvidenceCriterionMatch[],
  reviews: [] as Review[],
  actions: [] as Action[],
  requirementActions: [] as RequirementAction[],
  actionUpdates: [] as ActionUpdate[],
  actionDocuments: [] as ActionDocument[],
  actionObjectLinks: [] as ActionObjectLink[],
  people: [] as Person[],
  competencyTypes: [] as CompetencyType[],
  competencyRecords: [] as CompetencyRecord[],
  competencyRecordDocuments: [] as CompetencyRecordDocument[],
  requirementCompetencyTypes: [] as RequirementCompetencyType[],
  requirementCategories: [] as ManagedCategory[],
  evidenceCategories: [] as ManagedCategory[],
  matrixCells: [] as MatrixCell[],
  auditPacks: [] as AuditPack[],
  auditLogs: [] as AuditLog[],
  notifications: [] as WorkspaceNotification[]
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
      : authUser.email || 'Vygilence User',
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
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('dark');
  const [vygilenceTheme, setVygilenceThemeState] = useState<VygilenceTheme>('sentinel');
  const [interfaceStyle, setInterfaceStyleState] = useState<InterfaceStyle>('balanced');
  const [interfaceDetailLevel, setInterfaceDetailLevelState] = useState<InterfaceDetailLevel>('advanced');
  const theme = themePreference;
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [documents, setDocuments] = useState<EvidenceDocument[]>([]);
  const [archivedDocuments, setArchivedDocuments] = useState<EvidenceDocument[]>([]);
  const [frameworkRequirements, setFrameworkRequirements] = useState<Requirement[]>([]);
  const [requirementEvidenceTypes, setRequirementEvidenceTypes] = useState<RequirementEvidenceType[]>([]);
  const [requirementDocuments, setRequirementDocuments] = useState<RequirementDocument[]>([]);
  const [requirementEvidenceCriteria, setRequirementEvidenceCriteria] = useState<RequirementEvidenceCriterion[]>([]);
  const [requirementEvidenceCriterionMatches, setRequirementEvidenceCriterionMatches] = useState<RequirementEvidenceCriterionMatch[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [requirementActions, setRequirementActions] = useState<RequirementAction[]>([]);
  const [actionUpdates, setActionUpdates] = useState<ActionUpdate[]>([]);
  const [actionDocuments, setActionDocuments] = useState<ActionDocument[]>([]);
  const [actionObjectLinks, setActionObjectLinks] = useState<ActionObjectLink[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [competencyTypes, setCompetencyTypes] = useState<CompetencyType[]>([]);
  const [competencyRecords, setCompetencyRecords] = useState<CompetencyRecord[]>([]);
  const [competencyRecordDocuments, setCompetencyRecordDocuments] = useState<CompetencyRecordDocument[]>([]);
  const [requirementCompetencyTypes, setRequirementCompetencyTypes] = useState<RequirementCompetencyType[]>([]);
  const [requirementCategories, setRequirementCategories] = useState<ManagedCategory[]>([]);
  const [evidenceCategories, setEvidenceCategories] = useState<ManagedCategory[]>([]);
  const [matrixCells, setMatrixCells] = useState<MatrixCell[]>([]);
  const [auditPacks, setAuditPacks] = useState<AuditPack[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);
  
  // Asset state hooks
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetCheckTypes, setAssetCheckTypes] = useState<AssetCheckType[]>([]);
  const [assetCheckAssignments, setAssetCheckAssignments] = useState<AssetCheckAssignment[]>([]);
  const [assetCheckRecords, setAssetCheckRecords] = useState<AssetCheckRecord[]>([]);
  const [assetCheckEvidenceLinks, setAssetCheckEvidenceLinks] = useState<AssetCheckEvidenceLink[]>([]);
  const [assetRequirementLinks, setAssetRequirementLinks] = useState<AssetRequirementLink[]>([]);
  const [assetHistoryEvents, setAssetHistoryEvents] = useState<AssetHistoryEvent[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const readinessReport = useMemo(() => buildReadinessReport({
    requirements: frameworkRequirements,
    documents,
    requirementDocuments,
    reviews,
    actions,
    requirementActions,
    requirementEvidenceCriteria,
    requirementEvidenceCriterionMatches,
    competencyTypes,
    competencyRecords,
    requirementCompetencyTypes,
    people
  }), [actions, competencyRecords, competencyTypes, documents, frameworkRequirements, people, requirementActions, requirementCompetencyTypes, requirementDocuments, requirementEvidenceCriteria, requirementEvidenceCriterionMatches, reviews]);

  const competencySummary = useMemo(
    () => buildCompetencySummary(people, competencyTypes, competencyRecords),
    [competencyRecords, competencyTypes, people]
  );

  const readinessScore = readinessReport.overallScore || 0;
  const stats = useMemo(() => ({
    totalRequirements: readinessReport.requirements.length,
    compliantCount: readinessReport.requirements.filter(item => item.status === 'GREEN').length,
    expiringSoonCount: readinessReport.requirements.filter(item => item.status === 'AMBER').length,
    expiredCount: readinessReport.requirements.filter(item => item.status === 'RED').length,
    missingCount: readinessReport.missingEvidence.length,
    unclassifiedCount: documents.filter(d => d.status === 'Unclassified').length,
    activeRequirements: frameworkRequirements.filter(requirement => (requirement.lifecycle_status || 'ACTIVE') === 'ACTIVE').length,
    archivedRequirements: frameworkRequirements.filter(requirement => requirement.lifecycle_status === 'ARCHIVED').length
  }), [documents, frameworkRequirements, readinessReport]);

  const clearWorkspaceState = () => {
    setOrganization(null);
    setRequirements([]);
    setDocuments([]);
    setArchivedDocuments([]);
    setFrameworkRequirements([]);
    setRequirementEvidenceTypes([]);
    setRequirementDocuments([]);
    setRequirementEvidenceCriteria([]);
    setRequirementEvidenceCriterionMatches([]);
    setReviews([]);
    setActions([]);
    setRequirementActions([]);
    setActionUpdates([]);
    setActionDocuments([]);
    setActionObjectLinks([]);
    setPeople([]);
    setCompetencyTypes([]);
    setCompetencyRecords([]);
    setCompetencyRecordDocuments([]);
    setRequirementCompetencyTypes([]);
    setRequirementCategories([]);
    setEvidenceCategories([]);
    setMatrixCells([]);
    setAuditPacks([]);
    setAuditLogs([]);
    setNotifications([]);
    setAssets([]);
    setAssetCheckTypes([]);
    setAssetCheckAssignments([]);
    setAssetCheckRecords([]);
    setAssetCheckEvidenceLinks([]);
    setAssetRequirementLinks([]);
    setAssetHistoryEvents([]);
  };

  // Load appearance preferences per user and organisation.
  useEffect(() => {
    if (typeof window === 'undefined' || !user || !organization) return;
    const appearanceKey = `vygilence_appearance_${user.id}_${organization.id}`;

    try {
      const legacyPreference = localStorage.getItem(`vygilence_theme_pref_${user.id}`) || localStorage.getItem('vigilen_theme');
      const storedAppearance = localStorage.getItem(appearanceKey) || legacyPreference;
      const normalizedAppearance: ThemePreference =
        storedAppearance === 'light' || storedAppearance === 'midtone' || storedAppearance === 'dark'
          ? storedAppearance
          : storedAppearance === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : 'dark';
      setThemePreferenceState(normalizedAppearance);

      const storedTheme = localStorage.getItem(`vygilence_active_theme_${user.id}`) || 'sentinel';
      setVygilenceThemeState(storedTheme as VygilenceTheme);

      const storedStyle = localStorage.getItem(`vygilence_interface_style_${user.id}`) || 'balanced';
      setInterfaceStyleState(storedStyle as InterfaceStyle);

      const detailLevelKey = `vygilence_detail_level_${user.id}_${organization.id}`;
      const storedDetailLevel = localStorage.getItem(detailLevelKey);
      if (storedDetailLevel === 'focused' || storedDetailLevel === 'advanced') {
        setInterfaceDetailLevelState(storedDetailLevel as InterfaceDetailLevel);
      } else {
        setInterfaceDetailLevelState('advanced');
      }
    } catch (error) {
      console.warn('Unable to load local appearance preferences.', error);
      setThemePreferenceState('dark');
      setInterfaceDetailLevelState('advanced');
    }
  }, [organization, user]);

  // Sync theme and style variables to root DOM element dataset
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;

    root.classList.remove('light', 'midtone', 'dark');
    root.classList.add(theme);

    root.dataset.theme = vygilenceTheme;
    root.dataset.style = interfaceStyle;
    root.dataset.detailLevel = interfaceDetailLevel;
  }, [theme, vygilenceTheme, interfaceStyle, interfaceDetailLevel]);

  const loadWorkspaceCollections = async () => {
    const [
      reqs,
      docs,
      archivedDocs,
      frameworkReqs,
      evidenceTypes,
      requirementDocLinks,
      evidenceCriteriaRows,
      criterionMatchRows,
      reviewRows,
      actionRows,
      reqActionLinks,
      actionUpdateRows,
      actionDocumentRows,
      actionObjectRows,
      peopleRows,
      competencyTypeRows,
      competencyRecordRows,
      competencyRecordDocumentRows,
      requirementCompetencyTypeRows,
      requirementCategoryRows,
      evidenceCategoryRows,
      cells,
      packs,
      logs,
      notificationRows
    ] = await Promise.all([
      dbService.getRequirements(),
      dbService.getDocuments(),
      dbService.getArchivedDocuments(),
      dbService.getFrameworkRequirements(),
      dbService.getRequirementEvidenceTypes(),
      dbService.getRequirementDocuments(),
      dbService.getRequirementEvidenceCriteria(),
      dbService.getRequirementEvidenceCriterionMatches(),
      dbService.getReviews(),
      dbService.getActions(),
      dbService.getRequirementActions(),
      dbService.getActionUpdates(),
      dbService.getActionDocuments(),
      dbService.getActionObjectLinks(),
      dbService.getPeople(),
      dbService.getCompetencyTypes(),
      dbService.getCompetencyRecords(),
      dbService.getCompetencyRecordDocuments(),
      dbService.getRequirementCompetencyTypes(),
      dbService.getRequirementCategories(),
      dbService.getEvidenceCategories(),
      dbService.getMatrixCells(),
      dbService.getAuditPacks(),
      dbService.getAuditLogs(),
      dbService.getWorkspaceNotifications()
    ]);

    let assetRows: Asset[] = [];
    let checkTypeRows: AssetCheckType[] = [];
    let assignmentRows: AssetCheckAssignment[] = [];
    let recordRows: AssetCheckRecord[] = [];
    let evidenceLinkRows: AssetCheckEvidenceLink[] = [];
    let requirementLinkRows: AssetRequirementLink[] = [];
    let historyEventRows: AssetHistoryEvent[] = [];
    try {
      [
        assetRows,
        checkTypeRows,
        assignmentRows,
        recordRows,
        evidenceLinkRows,
        requirementLinkRows,
        historyEventRows
      ] = await Promise.all([
        dbService.getAssets(),
        dbService.getAssetCheckTypes(),
        dbService.getAssetCheckAssignments(),
        dbService.getAssetCheckRecords(),
        dbService.getAssetCheckEvidenceLinks(),
        dbService.getAssetRequirementLinks(),
        dbService.getAssetHistoryEvents()
      ]);
    } catch (error) {
      console.error('Asset Matrix data is unavailable. Core workspace data will continue loading.', error);
    }

    setRequirements(reqs);
    setDocuments(docs);
    setArchivedDocuments(archivedDocs);
    setFrameworkRequirements(frameworkReqs);
    setRequirementEvidenceTypes(evidenceTypes);
    setRequirementDocuments(requirementDocLinks);
    setRequirementEvidenceCriteria(evidenceCriteriaRows);
    setRequirementEvidenceCriterionMatches(criterionMatchRows);
    setReviews(reviewRows);
    setActions(actionRows);
    setRequirementActions(reqActionLinks);
    setActionUpdates(actionUpdateRows);
    setActionDocuments(actionDocumentRows);
    setActionObjectLinks(actionObjectRows);
    setPeople(peopleRows);
    setCompetencyTypes(competencyTypeRows);
    setCompetencyRecords(competencyRecordRows);
    setCompetencyRecordDocuments(competencyRecordDocumentRows);
    setRequirementCompetencyTypes(requirementCompetencyTypeRows);
    setRequirementCategories(requirementCategoryRows);
    setEvidenceCategories(evidenceCategoryRows);
    setMatrixCells(cells);
    setAuditPacks(packs);
    setAuditLogs(logs);
    setNotifications(notificationRows);
    // Assets
    setAssets(assetRows);
    setAssetCheckTypes(checkTypeRows);
    setAssetCheckAssignments(assignmentRows);
    setAssetCheckRecords(recordRows);
    setAssetCheckEvidenceLinks(evidenceLinkRows);
    setAssetRequirementLinks(requirementLinkRows);
    setAssetHistoryEvents(historyEventRows);
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
      setArchivedDocuments(emptyCollections.archivedDocuments);
      setFrameworkRequirements(emptyCollections.frameworkRequirements);
      setRequirementEvidenceTypes(emptyCollections.requirementEvidenceTypes);
      setRequirementDocuments(emptyCollections.requirementDocuments);
      setRequirementEvidenceCriteria(emptyCollections.requirementEvidenceCriteria);
      setRequirementEvidenceCriterionMatches(emptyCollections.requirementEvidenceCriterionMatches);
      setReviews(emptyCollections.reviews);
      setActions(emptyCollections.actions);
      setRequirementActions(emptyCollections.requirementActions);
      setActionUpdates(emptyCollections.actionUpdates);
      setActionDocuments(emptyCollections.actionDocuments);
      setActionObjectLinks(emptyCollections.actionObjectLinks);
      setPeople(emptyCollections.people);
      setCompetencyTypes(emptyCollections.competencyTypes);
      setCompetencyRecords(emptyCollections.competencyRecords);
      setCompetencyRecordDocuments(emptyCollections.competencyRecordDocuments);
      setRequirementCompetencyTypes(emptyCollections.requirementCompetencyTypes);
      setRequirementCategories(emptyCollections.requirementCategories);
      setEvidenceCategories(emptyCollections.evidenceCategories);
      setMatrixCells(emptyCollections.matrixCells);
      setAuditPacks(emptyCollections.auditPacks);
      setAuditLogs(emptyCollections.auditLogs);
      setNotifications(emptyCollections.notifications);
      setAssets([]);
      setAssetCheckTypes([]);
      setAssetCheckAssignments([]);
      setAssetCheckRecords([]);
      setAssetCheckEvidenceLinks([]);
      setAssetRequirementLinks([]);
      setAssetHistoryEvents([]);
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

    if (isDemoMode) return;

    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void loadData();
    });

    return () => subscription.unsubscribe();
  }, []);

  const setThemePreference = (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    if (typeof window === 'undefined' || !user || !organization) return;
    try {
      localStorage.setItem(`vygilence_appearance_${user.id}_${organization.id}`, pref);
    } catch (error) {
      console.warn('Unable to persist appearance preference.', error);
    }
  };

  const setVygilenceTheme = (t: VygilenceTheme) => {
    setVygilenceThemeState(t);
    const userId = user?.id || 'guest';
    localStorage.setItem(`vygilence_active_theme_${userId}`, t);
  };

  const setInterfaceStyle = (s: InterfaceStyle) => {
    setInterfaceStyleState(s);
    const userId = user?.id || 'guest';
    localStorage.setItem(`vygilence_interface_style_${userId}`, s);
  };

  const setInterfaceDetailLevel = (level: InterfaceDetailLevel) => {
    setInterfaceDetailLevelState(level);
    if (typeof window === 'undefined' || !user || !organization) return;
    try {
      localStorage.setItem(`vygilence_detail_level_${user.id}_${organization.id}`, level);
    } catch (error) {
      console.warn('Unable to persist interface detail level preference.', error);
    }
  };

  const toggleTheme = () => {
    const nextTheme: ThemePreference = theme === 'light' ? 'midtone' : theme === 'midtone' ? 'dark' : 'light';
    setThemePreference(nextTheme);
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

  const resetDemoData = async () => {
    if (!isDemoMode) {
      throw new Error('Sample data reset is only available when NEXT_PUBLIC_VIGILEN_APP_MODE=demo.');
    }

    [
      'vigilen_initialized',
      'vigilen_org',
      'vigilen_profile',
      'vigilen_requirements',
      'vigilen_documents',
      'vigilen_cells',
      'vigilen_audit_packs',
      'vigilen_logs',
      'vigilen_framework_requirements',
      'vigilen_requirement_evidence_types',
      'vigilen_requirement_documents',
      'vigilen_requirement_evidence_criteria',
      'vigilen_requirement_evidence_criterion_matches',
      'vigilen_reviews',
      'vigilen_actions',
      'vigilen_requirement_actions',
      'vigilen_action_updates',
      'vigilen_action_documents',
      'vigilen_action_object_links',
      'vigilen_people',
      'vigilen_competency_types',
      'vigilen_competency_records',
      'vigilen_competency_record_documents',
      'vigilen_requirement_competency_types',
      'vigilen_requirement_categories',
      'vigilen_evidence_categories'
    ].forEach(key => localStorage.removeItem(key));

    initMockDb();
    await loadDemoData();
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

  const restoreDocument = async (docId: string): Promise<EvidenceDocument> => {
    const restored = await dbService.restoreDocument(docId);
    await loadWorkspaceCollections();
    return restored;
  };

  const permanentlyDeleteDocument = async (docId: string): Promise<void> => {
    await dbService.permanentlyDeleteDocument(docId);
    await loadWorkspaceCollections();
  };

  const findPossibleDuplicateDocuments = async (file: File, fileHash?: string | null): Promise<EvidenceDocument[]> => {
    return dbService.findPossibleDuplicateDocuments(file, fileHash);
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

  const archiveFrameworkRequirement = async (requirementId: string): Promise<Requirement> => {
    const updated = await dbService.archiveFrameworkRequirement(requirementId);
    await loadWorkspaceCollections();
    return updated;
  };

  const restoreFrameworkRequirement = async (requirementId: string): Promise<Requirement> => {
    const updated = await dbService.restoreFrameworkRequirement(requirementId);
    await loadWorkspaceCollections();
    return updated;
  };

  const deactivateFrameworkRequirement = async (requirementId: string): Promise<Requirement> => {
    const updated = await dbService.deactivateFrameworkRequirement(requirementId);
    await loadWorkspaceCollections();
    return updated;
  };

  const deleteFrameworkRequirement = async (requirementId: string): Promise<void> => {
    await dbService.deleteFrameworkRequirement(requirementId);
    await loadWorkspaceCollections();
  };

  const upsertRequirementCategory: AppContextType['upsertRequirementCategory'] = async (input) => {
    const category = await dbService.upsertRequirementCategory(input);
    await loadWorkspaceCollections();
    return category;
  };

  const archiveRequirementCategory = async (categoryId: string): Promise<ManagedCategory> => {
    const category = await dbService.archiveRequirementCategory(categoryId);
    await loadWorkspaceCollections();
    return category;
  };

  const upsertEvidenceCategory: AppContextType['upsertEvidenceCategory'] = async (input) => {
    const category = await dbService.upsertEvidenceCategory(input);
    await loadWorkspaceCollections();
    return category;
  };

  const archiveEvidenceCategory = async (categoryId: string): Promise<ManagedCategory> => {
    const category = await dbService.archiveEvidenceCategory(categoryId);
    await loadWorkspaceCollections();
    return category;
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
      const starterCriteria: NonNullable<RequirementTemplateItem['suggested_criteria']> = item.suggested_criteria?.length
        ? item.suggested_criteria
        : item.suggested_evidence_types.map(name => ({
            title: name,
            description: undefined,
            evidence_type: name,
            is_required: true,
            weight: 1,
            minimum_count: 1,
            frequency: item.review_frequency,
            validity_required: true
          }));
      for (const criterion of starterCriteria) {
        await dbService.upsertRequirementEvidenceCriterion({
          requirement_id: created.id,
          title: criterion.title,
          description: criterion.description || null,
          evidence_type: criterion.evidence_type || criterion.title,
          is_required: criterion.is_required ?? true,
          weight: criterion.weight ?? 1,
          minimum_count: criterion.minimum_count ?? 1,
          frequency: criterion.frequency || item.review_frequency,
          coverage_period: null,
          validity_required: criterion.validity_required ?? true
        });
      }
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

  const upsertRequirementEvidenceCriterion: AppContextType['upsertRequirementEvidenceCriterion'] = async (input) => {
    const criterion = await dbService.upsertRequirementEvidenceCriterion(input);
    await loadWorkspaceCollections();
    return criterion;
  };

  const deleteRequirementEvidenceCriterion = async (criterionId: string): Promise<void> => {
    await dbService.deleteRequirementEvidenceCriterion(criterionId);
    await loadWorkspaceCollections();
  };

  const linkDocumentToEvidenceCriterion = async (criterionId: string, documentId: string, notes: string | null = null): Promise<void> => {
    await dbService.linkDocumentToEvidenceCriterion(criterionId, documentId, notes);
    await loadWorkspaceCollections();
  };

  const unlinkDocumentFromEvidenceCriterion = async (criterionId: string, documentId: string): Promise<void> => {
    await dbService.unlinkDocumentFromEvidenceCriterion(criterionId, documentId);
    await loadWorkspaceCollections();
  };

  const uploadEvidenceForCriterion = async (criterionId: string, file: File, category: string = 'Evidence'): Promise<EvidenceDocument> => {
    const document = await dbService.uploadEvidenceForCriterion(criterionId, file, category);
    await loadWorkspaceCollections();
    return document;
  };

  const createActionForRequirement = async (
    requirementId: string,
    actionInput: {
      title: string;
      description: string | null;
      owner: string | null;
      due_date: string | null;
      status: ActionStatus;
    }
  ): Promise<void> => {
    const action = await dbService.createAction({
      title: actionInput.title.trim(),
      description: actionInput.description || null,
      owner: actionInput.owner || null,
      status: actionInput.status,
      due_date: actionInput.due_date || null
    });
    await dbService.linkActionToRequirement(requirementId, action.id);
    await loadWorkspaceCollections();
  };

  const updateAction = async (actionId: string, updates: Partial<Action>): Promise<Action> => {
    const updated = await dbService.updateAction(actionId, updates);
    await loadWorkspaceCollections();
    return updated;
  };

  const addActionUpdate = async (actionId: string, updateType: ActionUpdateType, note: string): Promise<ActionUpdate> => {
    const update = await dbService.addActionUpdate(actionId, updateType, note);
    await loadWorkspaceCollections();
    return update;
  };

  const linkDocumentToAction = async (actionId: string, documentId: string): Promise<void> => {
    await dbService.linkDocumentToAction(actionId, documentId);
    await loadWorkspaceCollections();
  };

  const unlinkDocumentFromAction = async (actionId: string, documentId: string): Promise<void> => {
    await dbService.unlinkDocumentFromAction(actionId, documentId);
    await loadWorkspaceCollections();
  };

  const uploadActionAttachment = async (actionId: string, file: File): Promise<EvidenceDocument> => {
    const title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim() || file.name;
    const doc = await dbService.uploadDocumentFile({
      file,
      title,
      category: 'Actions',
      expiry_date: null,
      issue_date: new Date().toISOString().split('T')[0],
      metadata: {
        source: 'action_attachment',
        action_id: actionId
      },
      tags: ['action-attachment'],
      status: 'Unclassified'
    });
    await dbService.linkDocumentToAction(actionId, doc.id, `Uploaded attachment: ${doc.original_file_name || file.name}`);
    await loadWorkspaceCollections();
    return doc;
  };

  const upsertPerson: AppContextType['upsertPerson'] = async (input) => {
    const person = await dbService.upsertPerson(input);
    await loadWorkspaceCollections();
    return person;
  };

  const upsertCompetencyType: AppContextType['upsertCompetencyType'] = async (input) => {
    const competencyType = await dbService.upsertCompetencyType(input);
    await loadWorkspaceCollections();
    return competencyType;
  };

  const importCompetencyTemplateItems: AppContextType['importCompetencyTemplateItems'] = async (items) => {
    const existingKeys = new Set(
      competencyTypes.map(type => `${type.title.trim().toLowerCase()}::${type.category.trim().toLowerCase()}`)
    );
    const imported = await dbService.importCompetencyTemplateItems(
      items.filter(item => !existingKeys.has(`${item.title.trim().toLowerCase()}::${item.category.trim().toLowerCase()}`))
    );
    await loadWorkspaceCollections();
    return imported;
  };

  const upsertCompetencyRecord: AppContextType['upsertCompetencyRecord'] = async (input) => {
    const record = await dbService.upsertCompetencyRecord(input);
    await loadWorkspaceCollections();
    return record;
  };

  const linkDocumentToCompetencyRecord = async (recordId: string, documentId: string): Promise<void> => {
    await dbService.linkDocumentToCompetencyRecord(recordId, documentId);
    await loadWorkspaceCollections();
  };

  const unlinkDocumentFromCompetencyRecord = async (recordId: string, documentId: string): Promise<void> => {
    await dbService.unlinkDocumentFromCompetencyRecord(recordId, documentId);
    await loadWorkspaceCollections();
  };

  const uploadCompetencyEvidence = async (recordId: string, file: File): Promise<EvidenceDocument> => {
    const document = await dbService.uploadCompetencyEvidence(recordId, file);
    await loadWorkspaceCollections();
    return document;
  };

  const linkCompetencyTypeToRequirement = async (requirementId: string, competencyTypeId: string): Promise<void> => {
    await dbService.linkCompetencyTypeToRequirement(requirementId, competencyTypeId);
    await loadWorkspaceCollections();
  };

  const unlinkCompetencyTypeFromRequirement = async (requirementId: string, competencyTypeId: string): Promise<void> => {
    await dbService.unlinkCompetencyTypeFromRequirement(requirementId, competencyTypeId);
    await loadWorkspaceCollections();
  };

  const createActionForCompetencyGap: AppContextType['createActionForCompetencyGap'] = async (input) => {
    const action = await dbService.createActionForCompetencyGap(input);
    await loadWorkspaceCollections();
    return action;
  };

  const markNotificationRead: AppContextType['markNotificationRead'] = async (notificationId, read = true) => {
    await dbService.markNotificationRead(notificationId, read);
    setNotifications(await dbService.getWorkspaceNotifications());
  };

  const markAllNotificationsRead: AppContextType['markAllNotificationsRead'] = async () => {
    await dbService.markAllNotificationsRead();
    setNotifications(await dbService.getWorkspaceNotifications());
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
    const activeRequirementIds = requirementIds.filter(requirementId =>
      frameworkRequirements.some(requirement => requirement.id === requirementId && (requirement.lifecycle_status || 'ACTIVE') === 'ACTIVE')
    );
    const newPack = await dbService.addAuditPack({
      name,
      description,
      status: 'Draft',
      share_token: null,
      share_expires_at: null,
      pin_code: null,
      requirements: activeRequirementIds,
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

  // Asset assurance functions
  const createAsset: AppContextType['createAsset'] = async (asset) => {
    const res = await dbService.createAsset(asset);
    const updated = await dbService.getAssets();
    setAssets(updated);
    const logs = await dbService.getAuditLogs();
    setAuditLogs(logs);
    return res;
  };

  const updateAsset: AppContextType['updateAsset'] = async (assetId, updates) => {
    const res = await dbService.updateAsset(assetId, updates);
    const updated = await dbService.getAssets();
    setAssets(updated);
    const logs = await dbService.getAuditLogs();
    setAuditLogs(logs);
    return res;
  };

  const deleteAsset: AppContextType['deleteAsset'] = async (assetId) => {
    await dbService.deleteAsset(assetId);
    const updated = await dbService.getAssets();
    setAssets(updated);
    const logs = await dbService.getAuditLogs();
    setAuditLogs(logs);
  };

  const createAssetCheckType: AppContextType['createAssetCheckType'] = async (checkType) => {
    const res = await dbService.createAssetCheckType(checkType);
    const updated = await dbService.getAssetCheckTypes();
    setAssetCheckTypes(updated);
    return res;
  };

  const createAssetCheckAssignment: AppContextType['createAssetCheckAssignment'] = async (assignment) => {
    const res = await dbService.createAssetCheckAssignment(assignment);
    const updated = await dbService.getAssetCheckAssignments();
    setAssetCheckAssignments(updated);
    return res;
  };

  const updateAssetCheckAssignment: AppContextType['updateAssetCheckAssignment'] = async (assignmentId, updates) => {
    const res = await dbService.updateAssetCheckAssignment(assignmentId, updates);
    const updated = await dbService.getAssetCheckAssignments();
    setAssetCheckAssignments(updated);
    return res;
  };

  const createAssetCheckRecord: AppContextType['createAssetCheckRecord'] = async (record) => {
    const res = await dbService.createAssetCheckRecord(record);
    const updated = await dbService.getAssetCheckRecords();
    setAssetCheckRecords(updated);
    return res;
  };

  const linkAssetCheckEvidence: AppContextType['linkAssetCheckEvidence'] = async (
    assignmentId,
    recordId,
    documentId,
    assetId
  ) => {
    const res = await dbService.linkAssetCheckEvidence(assignmentId, recordId, documentId, assetId);
    const updated = await dbService.getAssetCheckEvidenceLinks();
    setAssetCheckEvidenceLinks(updated);
    return res;
  };

  const createAssetHistoryEvent: AppContextType['createAssetHistoryEvent'] = async (event) => {
    const res = await dbService.createAssetHistoryEvent(event);
    const updated = await dbService.getAssetHistoryEvents();
    setAssetHistoryEvents(updated);
    return res;
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        themePreference,
        vygilenceTheme,
        interfaceStyle,
        interfaceDetailLevel,
        toggleTheme,
        setThemePreference,
        setVygilenceTheme,
        setInterfaceStyle,
        setInterfaceDetailLevel,
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
        resetDemoData,
        updateOrgProfile,
        requirements,
        documents,
        archivedDocuments,
        frameworkRequirements,
        requirementEvidenceTypes,
        requirementDocuments,
        requirementEvidenceCriteria,
        requirementEvidenceCriterionMatches,
        reviews,
        actions,
        requirementActions,
        actionUpdates,
        actionDocuments,
        actionObjectLinks,
        people,
        competencyTypes,
        competencyRecords,
        competencyRecordDocuments,
        requirementCompetencyTypes,
        requirementCategories,
        evidenceCategories,
        matrixCells,
        auditPacks,
        auditLogs,
        notifications,
        uploadDocument,
        updateDocumentMetadata,
        getDocumentSignedUrl,
        deleteDocument,
        restoreDocument,
        permanentlyDeleteDocument,
        findPossibleDuplicateDocuments,
        createFrameworkRequirement,
        updateFrameworkRequirement,
        archiveFrameworkRequirement,
        restoreFrameworkRequirement,
        deactivateFrameworkRequirement,
        deleteFrameworkRequirement,
        upsertRequirementCategory,
        archiveRequirementCategory,
        upsertEvidenceCategory,
        archiveEvidenceCategory,
        importRequirementTemplateItems,
        linkDocumentToRequirement,
        unlinkDocumentFromRequirement,
        upsertRequirementEvidenceCriterion,
        deleteRequirementEvidenceCriterion,
        linkDocumentToEvidenceCriterion,
        unlinkDocumentFromEvidenceCriterion,
        uploadEvidenceForCriterion,
        createActionForRequirement,
        updateAction,
        addActionUpdate,
        linkDocumentToAction,
        unlinkDocumentFromAction,
        uploadActionAttachment,
        upsertPerson,
        upsertCompetencyType,
        importCompetencyTemplateItems,
        upsertCompetencyRecord,
        linkDocumentToCompetencyRecord,
        unlinkDocumentFromCompetencyRecord,
        uploadCompetencyEvidence,
        linkCompetencyTypeToRequirement,
        unlinkCompetencyTypeFromRequirement,
        createActionForCompetencyGap,
        createRequirement,
        createPack,
        updatePackStatus,
        updateCellMapping,
        markNotificationRead,
        markAllNotificationsRead,

        // Asset Assurance System
        assets,
        assetCheckTypes,
        assetCheckAssignments,
        assetCheckRecords,
        assetCheckEvidenceLinks,
        assetRequirementLinks,
        assetHistoryEvents,
        createAsset,
        updateAsset,
        deleteAsset,
        createAssetCheckType,
        createAssetCheckAssignment,
        updateAssetCheckAssignment,
        createAssetCheckRecord,
        linkAssetCheckEvidence,
        createAssetHistoryEvent,

        readinessReport: readinessReport || emptyReadinessReport,
        competencySummary,
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

export function useInterfaceDetailLevel() {
  const { interfaceDetailLevel, setInterfaceDetailLevel } = useApp();
  return {
    interfaceDetailLevel,
    setInterfaceDetailLevel
  };
}
