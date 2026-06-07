'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { dbService } from '@/lib/db';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Briefcase,
  FileSpreadsheet,
  FolderArchive,
  Building2,
  Settings,
  Download,
  Calendar,
  AlertTriangle,
  FileText,
  RefreshCw,
  Plus,
  Activity,
  ChevronDown,
  SlidersHorizontal,
  Bookmark,
  Copy,
  Edit,
  Link2,
  History,
  Search,
  Clock,
  Lock,
  HelpCircle
} from 'lucide-react';
import {
  Requirement,
  AuditTrailEvent,
  SavedReport
} from '@/lib/types';
import { ConfirmDialog, ConfirmRequest, InlineToast, ToastState } from '@/components/AppFeedback';
import { REPORT_CAPABILITIES, BuilderSource } from '@/lib/reportCapabilities';
import { calculateCompetencyStatus } from '@/lib/competencyEngine';
import { isDemoMode } from '@/lib/env';

// Local storage key for saved custom reports
const SAVED_REPORTS_KEY = 'vygilence_saved_reports';
const DAY_MS = 24 * 60 * 60 * 1000;

const endOfDay = (value: string) => new Date(`${value}T23:59:59.999`);

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const PREBUILT_REPORTS = [
  {
    id: 'prebuilt_executive',
    name: 'Executive Readiness Overview',
    description: 'High-level compliance summary of all requirement statuses, readiness scores, and critical alerts.',
    category: 'Executive',
    sourceModule: 'Requirements',
    filters: 'Category, Status, Owner, Risk',
    exports: 'CSV, Print/PDF',
    permission: 'All Members',
    tab: 'executive'
  },
  {
    id: 'prebuilt_requirements',
    name: 'Framework Requirements Breakdown',
    description: 'Granular assessment of active compliance requirements, mapping status, and risk categories.',
    category: 'Requirements',
    sourceModule: 'Requirements',
    filters: 'Category, Status, Owner, Risk',
    exports: 'CSV, Print/PDF',
    permission: 'All Members',
    tab: 'requirements'
  },
  {
    id: 'prebuilt_evidence',
    name: 'Evidence Vault Status & Expiry',
    description: 'Deep inspector of uploaded verification documents, approval status, and upcoming expiries.',
    category: 'Evidence',
    sourceModule: 'Evidence',
    filters: 'Category, Status, Expiry Range',
    exports: 'CSV, Print/PDF',
    permission: 'All Members',
    tab: 'evidence'
  },
  {
    id: 'prebuilt_competencies',
    name: 'Competency Matrix Compliance',
    description: 'Assessment of team competency fulfillment, required training types, and expiry tracking.',
    category: 'Competencies',
    sourceModule: 'Competencies',
    filters: 'Category, Status, Person',
    exports: 'CSV, Print/PDF',
    permission: 'All Members',
    tab: 'competencies'
  },
  {
    id: 'prebuilt_actions',
    name: 'Corrective Actions Registry',
    description: 'List of assigned task actions, completion statistics, overdue status, and requirement links.',
    category: 'Actions',
    sourceModule: 'Actions',
    filters: 'Status, Owner, Risk, Overdue',
    exports: 'CSV, Print/PDF',
    permission: 'All Members',
    tab: 'actions'
  },
  {
    id: 'prebuilt_audits',
    name: 'Audit Packs Registry',
    description: 'Review compiled evidence packs, share status, and reviewer responses.',
    category: 'Audit',
    sourceModule: 'Audits',
    filters: 'Status',
    exports: 'CSV, Print/PDF',
    permission: 'All Members',
    tab: 'audits'
  },
  {
    id: 'prebuilt_history',
    name: 'System Audit Trail Log',
    description: 'Immutable timeline of system mutations, access events, and export operations.',
    category: 'Administration',
    sourceModule: 'Audit Trail',
    filters: 'None',
    exports: 'CSV',
    permission: 'Owner / Admin Only',
    tab: 'history'
  },
  {
    id: 'prebuilt_upcoming',
    name: 'Upcoming Compliance Obligations',
    description: 'Forecast of evidence expirations and action item deadlines due in the next 30, 60, or 90 days.',
    category: 'Upcoming',
    sourceModule: 'Requirements',
    filters: 'Time Horizon',
    exports: 'CSV, Print/PDF',
    permission: 'All Members',
    tab: 'executive'
  },
  {
    id: 'prebuilt_builder',
    name: 'Interactive Custom Report Builder',
    description: 'Custom query engine to aggregate compliance data across different models, dimensions, and measures.',
    category: 'Custom',
    sourceModule: 'Custom Builder',
    filters: 'Dynamic',
    exports: 'CSV',
    permission: 'All Members',
    tab: 'builder'
  },
  {
    id: 'prebuilt_pivot',
    name: 'Pivot Matrix Report Builder',
    description: 'Cross-tabulation tool to summarize readiness scores, competencies, and actions by row and column variables.',
    category: 'Pivot',
    sourceModule: 'Pivot Builder',
    filters: 'Row, Column, Measure',
    exports: 'CSV',
    permission: 'All Members',
    tab: 'builder'
  }
];

type TabType =
  | 'executive'
  | 'requirements'
  | 'evidence'
  | 'competencies'
  | 'actions'
  | 'audits'
  | 'locations-assets'
  | 'administration'
  | 'builder'
  | 'saved'
  | 'history';

export interface PrebuiltReportDefinition {
  kind: 'prebuilt';
  id: string;
  name: string;
  description: string;
  category: string;
  sourceModule: string;
  filters: string;
  exports: string;
  permission: string;
  tab: TabType;
}

export interface SavedReportWrapper {
  kind: 'saved';
  id: string;
  name: string;
  description: string;
  category: string;
  sourceModule: string;
  filters: string;
  exports: string;
  permission: string;
  tab: TabType;
  savedReport: SavedReport;
}

export type CatalogueReport = PrebuiltReportDefinition | SavedReportWrapper;

export function isPrebuiltReport(report: CatalogueReport): report is PrebuiltReportDefinition {
  return report.kind === 'prebuilt';
}

export function isSavedReport(report: CatalogueReport): report is SavedReportWrapper {
  return report.kind === 'saved';
}

export interface RecentReportView {
  id: string;
  name: string;
  category: string;
  sourceModule: string;
  tab: TabType;
  openedAt: string;
}

export const METRIC_GLOSSARIES = [
  {
    name: 'Overall Readiness',
    measures: 'Workspace overall compliance health and audit readiness level.',
    calculation: 'Average compliance score: Green = 100%, Amber = 50%, Red = 0%. Excluded items are omitted from both numerator and denominator.',
    included: 'Active compliance requirements matching current filters.',
    excluded: 'Deactivated, archived, deleted, and unassessed (GREY) requirements.',
    dateField: 'None (derived dynamically from the active requirement status list).',
    missing: 'Excluded from both the numerator and the denominator of the percentage calculation.',
    sourceModule: 'Requirements Framework / Readiness Engine'
  },
  {
    name: 'Requirement Compliance',
    measures: 'Individual compliance readiness status for assigned obligations.',
    calculation: 'Evaluated into GREEN (100% compliant), AMBER (50% warning / due soon), RED (0% gap / non-compliant), or GREY (exempt/unassessed).',
    included: 'Active workspace compliance obligations.',
    excluded: 'Archived, deactivated, or deleted requirements.',
    dateField: 'Derived from linked document expiry dates and review schedules.',
    missing: 'Defaults to RED (0%) if no evidence is linked or matching criteria fail.',
    sourceModule: 'Requirements Framework'
  },
  {
    name: 'Critical Gap',
    measures: 'Urgent compliance gaps and failures that pose an active audit risk.',
    calculation: 'Total count of requirements with RED status or Critical/High risk with open actions.',
    included: 'Active framework requirements with RED status or outstanding critical actions.',
    excluded: 'GREEN, AMBER, or GREY requirements without active critical actions.',
    dateField: 'Requirement next review date or overdue action due date.',
    missing: 'Categorized as a RED gap if compliance evidence is missing.',
    sourceModule: 'Requirements Framework'
  },
  {
    name: 'Evidence Coverage',
    measures: 'Proportion of active requirements backed by valid, current evidence.',
    calculation: '(Requirements with linked valid documents) / (Total active requirements).',
    included: 'Active compliance requirements and active linked evidence documents.',
    excluded: 'Exempt/unassessed (GREY) requirements and unlinked files.',
    dateField: 'Evidence document expiry date.',
    missing: 'Treated as missing (0% coverage), dragging down readiness.',
    sourceModule: 'Evidence Vault / Readiness Engine'
  },
  {
    name: 'Linked Evidence',
    measures: 'Evidence documents successfully mapped to framework requirements or actions.',
    calculation: 'Count of unique evidence documents mapped in RequirementDocument or linked to criteria matches.',
    included: 'Uploaded files mapped to requirements, actions, or competency records.',
    excluded: 'Unmapped documents, archived/trashed documents.',
    dateField: 'Mapping link creation timestamp.',
    missing: 'Empty linkages place documents into the Unlinked status category.',
    sourceModule: 'Evidence Vault'
  },
  {
    name: 'Unlinked Evidence',
    measures: 'Uploaded evidence files that are unassigned and lack requirement mapping.',
    calculation: 'Distinct count of documents with no active linkages (status is Unclassified).',
    included: 'Active evidence documents with no links to requirements or actions.',
    excluded: 'Linked files, archived files.',
    dateField: 'Document upload date.',
    missing: 'Defaults to Unclassified/Unlinked until mapped by a compliance officer.',
    sourceModule: 'Evidence Vault'
  },
  {
    name: 'Expiring Evidence',
    measures: 'Documents whose validity is about to expire shortly.',
    calculation: 'Count of active documents with status Expiring Soon (expiry within 30 days).',
    included: 'Active evidence documents.',
    excluded: 'Expired documents, unclassified or undated documents.',
    dateField: 'Document expiry date.',
    missing: 'Treated as unclassified (no expiry date specified).',
    sourceModule: 'Evidence Vault'
  },
  {
    name: 'Competency Gap',
    measures: 'Outstanding training deficiencies or expired employee certificates.',
    calculation: 'Count of assigned required competency types that are expired or missing a record.',
    included: 'Active employee training requirements.',
    excluded: 'Exempt (N/A) qualifications, archived staff profiles.',
    dateField: 'Competency record expiry date.',
    missing: 'Marked as an active gap for the employee.',
    sourceModule: 'Competency Matrix'
  },
  {
    name: 'People with Gaps',
    measures: 'Employees with one or more missing or expired training items.',
    calculation: 'Count of unique active personnel with at least one active Competency Gap.',
    included: 'Active tracked personnel.',
    excluded: 'Deactivated staff or historical personnel records.',
    dateField: 'Competency record expiry date.',
    missing: 'Missing required training counts as an active gap.',
    sourceModule: 'Competency Matrix'
  },
  {
    name: 'Action Completion Rate',
    measures: 'Proportion of resolved corrective actions against all non-cancelled actions.',
    calculation: '(Completed Actions) / (Total Actions - Cancelled Actions).',
    included: 'All logged corrective actions.',
    excluded: 'Actions with status Cancelled.',
    dateField: 'Action completion timestamp.',
    missing: 'Uncompleted actions count as Open/Uncompleted.',
    sourceModule: 'Actions Registry'
  },
  {
    name: 'Overdue Action',
    measures: 'Corrective actions remaining unresolved past their target due date.',
    calculation: 'Count of Open or In Progress actions where due_date < current_date.',
    included: 'Actions with status Open or In Progress.',
    excluded: 'Completed or cancelled corrective actions.',
    dateField: 'Action due date.',
    missing: 'Excluded from overdue checks if no due date is specified.',
    sourceModule: 'Actions Registry'
  },
  {
    name: 'Average Days Overdue',
    measures: 'Mean duration that outstanding overdue actions have remained unresolved.',
    calculation: 'Sum(current_date - due_date) / (Total Overdue Actions).',
    included: 'Active open overdue corrective actions.',
    excluded: 'Completed, cancelled, or future-due actions.',
    dateField: 'Action due date.',
    missing: 'Omitted from the average calculation.',
    sourceModule: 'Actions Registry'
  },
  {
    name: 'Audit Pack Readiness',
    measures: 'Proportion of valid, current evidence within a compiled audit package.',
    calculation: '(Active Valid Documents in Pack) / (Total Documents in Pack).',
    included: 'Documents mapped to the selected audit pack.',
    excluded: 'Omitted or empty requirement sections.',
    dateField: 'Document expiry date.',
    missing: 'Missing or expired documents count as invalid (0% readiness).',
    sourceModule: 'Audit Packs'
  }
];

export default function ReportsPage() {
  const {
    user,
    organization,
    frameworkRequirements,
    documents,
    actions,
    people,
    competencyTypes,
    competencyRecords,
    requirementDocuments,
    auditPacks,
    readinessReport,
    readinessScore
  } = useApp();

  const router = useRouter();

  // Loading admin trail logs
  const [auditTrailEvents, setAuditTrailEvents] = useState<AuditTrailEvent[]>([]);
  const isOwnerOrAdmin = user?.role === 'Owner' || user?.role === 'Admin';

  // State Management
  const [activeTab, setActiveTab] = useState<TabType>('executive');
  const [freshnessTime, setFreshnessTime] = useState<string>('');
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [glossarySearchQuery, setGlossarySearchQuery] = useState('');

  // Global Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedRisk, setSelectedRisk] = useState('All');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [includeDeactivated, setIncludeDeactivated] = useState(false);
  const [comparePeriod, setComparePeriod] = useState(false);

  // Custom Report Builder States
  const [builderSource, setBuilderSource] = useState<BuilderSource>('Requirements');
  const [builderDimension, setBuilderDimension] = useState('category');
  const [builderMeasure, setBuilderMeasure] = useState('count');
  const [builderVisual, setBuilderVisual] = useState('bar');
  const [builderReportName, setBuilderReportName] = useState('');
  const [builderReportDesc, setBuilderReportDesc] = useState('');
  const [builderReportVisibility, setBuilderReportVisibility] = useState<'personal_local' | 'personal' | 'organisation'>('personal');

  // Saved Reports List
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [savedSearchQuery, setSavedSearchQuery] = useState('');
  const [savedVisibilityFilter, setSavedVisibilityFilter] = useState<'all' | 'personal' | 'organisation'>('all');
  const [savedShowOnlyFavs, setSavedShowOnlyFavs] = useState(false);
  const [savedSourceFilter, setSavedSourceFilter] = useState('all');
  const [selectedScheduledReport, setSelectedScheduledReport] = useState<SavedReport | null>(null);

  const [isSharedTableAvailable, setIsSharedTableAvailable] = useState<boolean>(false);
  const [favReportIds, setFavReportIds] = useState<string[]>([]);
  const [recentViews, setRecentViews] = useState<RecentReportView[]>([]);
  const [editingReport, setEditingReport] = useState<SavedReport | null>(null);
  const [editReportName, setEditReportName] = useState('');
  const [editReportDesc, setEditReportDesc] = useState('');

  // Pivot View States
  const [pivotRow, setPivotRow] = useState('category');
  const [pivotCol, setPivotCol] = useState('status');
  const [pivotAggregation, setPivotAggregation] = useState('count');

  // Interactive Chart States
  const [hoveredDonutSegment, setHoveredDonutSegment] = useState<Record<string, { label: string; value: number; color: string; percent: number } | null>>({});
  const [hoveredSparklinePoint, setHoveredSparklinePoint] = useState<Record<string, { label: string; value: number; index: number } | null>>({});
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
  const [focusedChartId, setFocusedChartId] = useState<string | null>(null);


  const comparisonData = useMemo(() => {
    if (!comparePeriod) return null;

    let currentStart: Date;
    let currentEnd: Date;
    let prevStart: Date;
    let prevEnd: Date;
    let label = '';

    const today = new Date();
    if (startDate && endDate) {
      currentStart = new Date(startDate);
      currentEnd = endOfDay(endDate);
      const diffMs = currentEnd.getTime() - currentStart.getTime();
      prevStart = new Date(currentStart.getTime() - diffMs);
      prevEnd = new Date(currentStart.getTime() - 1);
      label = `vs. previous equivalent period (${prevStart.toLocaleDateString()} - ${prevEnd.toLocaleDateString()})`;
    } else {
      // Default: current month vs previous month
      currentStart = new Date(today.getFullYear(), today.getMonth(), 1);
      currentEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      prevEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      label = 'vs. previous month';
    }

    const calcPct = (curr: number, prev: number) => {
      if (prev === 0) return curr === 0 ? 0 : 100;
      return Math.round(((curr - prev) / prev) * 100);
    };

    // 1. Evidence uploaded
    const currDocs = documents.filter(d => d.created_at && new Date(d.created_at) >= currentStart && new Date(d.created_at) <= currentEnd).length;
    const prevDocs = documents.filter(d => d.created_at && new Date(d.created_at) >= prevStart && new Date(d.created_at) <= prevEnd).length;
    const docsDiff = currDocs - prevDocs;
    const docsPct = calcPct(currDocs, prevDocs);
    const docLabel = `New uploads: ${currDocs} (current) vs ${prevDocs} (previous)`;

    // 2. Actions opened
    const currActionsOpen = actions.filter(a => a.created_at && new Date(a.created_at) >= currentStart && new Date(a.created_at) <= currentEnd).length;
    const prevActionsOpen = actions.filter(a => a.created_at && new Date(a.created_at) >= prevStart && new Date(a.created_at) <= prevEnd).length;
    const actionsOpenDiff = currActionsOpen - prevActionsOpen;
    const actionsOpenPct = calcPct(currActionsOpen, prevActionsOpen);
    const actionsOpenLabel = `New actions opened: ${currActionsOpen} (current) vs ${prevActionsOpen} (previous)`;

    // 3. Actions completed
    const getCompDate = (a: any) => a.completed_at || a.closed_at;
    const currActionsComp = actions.filter(a => a.status === 'Complete' && getCompDate(a) && new Date(getCompDate(a)) >= currentStart && new Date(getCompDate(a)) <= currentEnd).length;
    const prevActionsComp = actions.filter(a => a.status === 'Complete' && getCompDate(a) && new Date(getCompDate(a)) >= prevStart && new Date(getCompDate(a)) <= prevEnd).length;
    const actionsCompDiff = currActionsComp - prevActionsComp;
    const actionsCompPct = calcPct(currActionsComp, prevActionsComp);
    const actionsCompLabel = `Actions completed: ${currActionsComp} (current) vs ${prevActionsComp} (previous)`;

    // 4. Competency gaps resolved / records updated
    const currComps = competencyRecords.filter(r => r.updated_at && new Date(r.updated_at) >= currentStart && new Date(r.updated_at) <= currentEnd).length;
    const prevComps = competencyRecords.filter(r => r.updated_at && new Date(r.updated_at) >= prevStart && new Date(r.updated_at) <= prevEnd).length;
    const compsDiff = currComps - prevComps;
    const compsPct = calcPct(currComps, prevComps);
    const compsLabel = `Competencies updated: ${currComps} (current) vs ${prevComps} (previous)`;

    // 5. Audit packs generated
    const currPacks = auditPacks.filter(p => p.created_at && new Date(p.created_at) >= currentStart && new Date(p.created_at) <= currentEnd).length;
    const prevPacks = auditPacks.filter(p => p.created_at && new Date(p.created_at) >= prevStart && new Date(p.created_at) <= prevEnd).length;
    const packsDiff = currPacks - prevPacks;
    const packsPct = calcPct(currPacks, prevPacks);
    const packsLabel = `Audit packs created: ${currPacks} (current) vs ${prevPacks} (previous)`;

    // 6. Audit activities
    const currAudits = auditTrailEvents.filter(e => new Date(e.created_at) >= currentStart && new Date(e.created_at) <= currentEnd).length;
    const prevAudits = auditTrailEvents.filter(e => new Date(e.created_at) >= prevStart && new Date(e.created_at) <= prevEnd).length;
    const auditsDiff = currAudits - prevAudits;
    const auditsPct = calcPct(currAudits, prevAudits);
    const auditsLabel = `Audit events logged: ${currAudits} (current) vs ${prevAudits} (previous)`;

    return {
      label,
      docs: { current: currDocs, previous: prevDocs, diff: docsDiff, pct: docsPct, label: docLabel },
      actionsOpen: { current: currActionsOpen, previous: prevActionsOpen, diff: actionsOpenDiff, pct: actionsOpenPct, label: actionsOpenLabel },
      actionsComp: { current: currActionsComp, previous: prevActionsComp, diff: actionsCompDiff, pct: actionsCompPct, label: actionsCompLabel },
      comps: { current: currComps, previous: prevComps, diff: compsDiff, pct: compsPct, label: compsLabel },
      packs: { current: currPacks, previous: prevPacks, diff: packsDiff, pct: packsPct, label: packsLabel },
      audits: { current: currAudits, previous: prevAudits, diff: auditsDiff, pct: auditsPct, label: auditsLabel }
    };
  }, [comparePeriod, startDate, endDate, documents, actions, competencyRecords, auditPacks, auditTrailEvents]);

  const renderComparisonBadge = (data: { diff: number; pct: number; label: string } | undefined, tone: 'positive' | 'negative' | 'neutral' = 'neutral') => {
    if (!comparePeriod || !data) return null;
    const isPositive = data.diff > 0;
    const isZero = data.diff === 0;

    let colorClass = 'bg-zinc-500/10 text-zinc-500';
    if (!isZero) {
      if (tone === 'positive') {
        colorClass = isPositive ? 'bg-emerald-500/10 text-emerald-650' : 'bg-rose-500/10 text-rose-600';
      } else if (tone === 'negative') {
        colorClass = isPositive ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-650';
      } else {
        colorClass = 'bg-zinc-500/10 text-zinc-650 dark:text-zinc-400';
      }
    }

    return (
      <span
        title={`${data.label} (${comparisonData?.label || ''})`}
        className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ml-2 ${colorClass}`}
      >
        {isZero ? '' : isPositive ? '+' : ''}{data.pct}% ({isZero ? 'no change' : `${isPositive ? '+' : ''}${data.diff}`})
      </span>
    );
  };

  const getReportFavourites = useCallback((): string[] => {
    if (typeof window === 'undefined' || !user || !organization) return [];
    const key = `vygilence_fav_reports_${user.id}_${organization.id}`;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to load favourites', e);
      return [];
    }
  }, [user, organization]);

  const saveReportFavourites = useCallback((favs: string[]) => {
    if (typeof window === 'undefined' || !user || !organization) return;
    const key = `vygilence_fav_reports_${user.id}_${organization.id}`;
    localStorage.setItem(key, JSON.stringify(favs));
  }, [user, organization]);

  const getRecentReports = useCallback((): RecentReportView[] => {
    if (typeof window === 'undefined' || !user || !organization) return [];
    const key = `vygilence_recent_reports_${user.id}_${organization.id}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((item: any) =>
            item && typeof item === 'object' && typeof item.id === 'string' && typeof item.name === 'string'
          ) as RecentReportView[];
        }
      }
      return [];
    } catch (e) {
      console.error('Failed to load recents', e);
      return [];
    }
  }, [user, organization]);

  const saveRecentReports = useCallback((recents: RecentReportView[]) => {
    if (typeof window === 'undefined' || !user || !organization) return;
    const key = `vygilence_recent_reports_${user.id}_${organization.id}`;
    localStorage.setItem(key, JSON.stringify(recents));
  }, [user, organization]);

  const recordView = useCallback((id: string, name: string, category: string, sourceModule: string, tab: TabType) => {
    if (typeof window === 'undefined' || !user || !organization) return;
    const current = getRecentReports();
    const filtered = current.filter(r => r.id !== id);
    const updated = [
      { id, name, category, sourceModule, tab, openedAt: new Date().toISOString() },
      ...filtered
    ].slice(0, 10);
    setRecentViews(updated);
    saveRecentReports(updated);
  }, [user, organization, getRecentReports, saveRecentReports]);

  // Load saved reports helper function
  const loadSavedReports = () => {
    dbService.getSavedReports()
      .then(data => {
        setSavedReports(data);
      })
      .catch(e => {
        console.error('Failed to load saved reports', e);
      });
  };

  const getReportDataSource = (rep: any) => rep.data_source || rep.dataSource || 'Requirements';
  const getReportDimension = (rep: any) => rep.configuration?.dimension || rep.dimension || 'category';
  const getReportMeasure = (rep: any) => rep.configuration?.measure || rep.measure || 'count';
  const getReportVisualType = (rep: any) => rep.configuration?.visualType || rep.visualType || 'bar';
  const getReportFilters = (rep: any) => rep.configuration?.filters || rep.filters || {};

  const filteredSavedReports = useMemo(() => {
    return savedReports.filter(rep => {
      const dataSource = getReportDataSource(rep);
      const nameMatch = rep.name.toLowerCase().includes(savedSearchQuery.toLowerCase());
      const descMatch = (rep.description || '').toLowerCase().includes(savedSearchQuery.toLowerCase());
      const matchesSearch = nameMatch || descMatch;

      const matchesVisibility = savedVisibilityFilter === 'all' || rep.visibility === savedVisibilityFilter;
      const matchesFav = !savedShowOnlyFavs || rep.is_favourite;
      const matchesSource = savedSourceFilter === 'all' || dataSource === savedSourceFilter;

      return matchesSearch && matchesVisibility && matchesFav && matchesSource;
    });
  }, [savedReports, savedSearchQuery, savedVisibilityFilter, savedShowOnlyFavs, savedSourceFilter]);

  // Set freshness timestamp on load and parse reportId query param
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFreshnessTime(new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    dbService.checkSavedReportsTableAvailable().then(avail => {
      setIsSharedTableAvailable(avail);
      if (!avail) {
        setBuilderReportVisibility('personal_local');
      } else {
        setBuilderReportVisibility('personal');
      }
    });

    if (user && organization) {
      loadSavedReports();
      setFavReportIds(getReportFavourites());
      setRecentViews(getRecentReports());

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab') as TabType | null;
        const allowedTabs: TabType[] = [
          'executive',
          'requirements',
          'evidence',
          'competencies',
          'actions',
          'audits',
          'locations-assets',
          'builder',
          'saved'
        ];
        if (isOwnerOrAdmin) {
          allowedTabs.push('administration', 'history');
        }
        if (tabParam && allowedTabs.includes(tabParam)) {
          setActiveTab(tabParam);
        }
        const reportIdParam = params.get('reportId');
        if (reportIdParam) {
          dbService.getSavedReports().then(reports => {
            const match = reports.find(r => r.id === reportIdParam);
            if (match) {
              const allowedSource = getReportDataSource(match) === 'Audit Trail' && !isOwnerOrAdmin ? 'Requirements' : getReportDataSource(match);
              setBuilderSource(allowedSource);
              setBuilderDimension(allowedSource === getReportDataSource(match) ? getReportDimension(match) : 'category');
              setBuilderMeasure(getReportMeasure(match));
              setBuilderVisual(allowedSource === 'Requirements' ? getReportVisualType(match) : getReportVisualType(match) === 'pivot' ? 'table' : getReportVisualType(match));
              const filters = getReportFilters(match);
              setSelectedCategory(filters.category || 'All');
              setSelectedStatus(filters.status || 'All');
              setSelectedRisk(filters.risk || 'All');
              setActiveTab('builder');
              setToast({ type: 'info', message: `Loaded shared report: "${match.name}"` });
            }
          }).catch(err => {
            console.error('Failed to parse query reportId', err);
          });
        }
      }
    }
  }, [user, organization, isOwnerOrAdmin]);

  // Audit data is fetched only for authorised users when an audit-backed tab needs it.
  useEffect(() => {
    const needsAuditData = activeTab === 'executive' || activeTab === 'audits' || activeTab === 'administration' || activeTab === 'history' || (activeTab === 'builder' && builderSource === 'Audit Trail');
    if (!isOwnerOrAdmin || !needsAuditData) {
      return;
    }

    let cancelled = false;
    dbService.getAuditTrailEvents()
      .then(data => {
        if (!cancelled) setAuditTrailEvents(data);
      })
      .catch(err => {
        console.error('Failed to fetch audit trail events:', err);
        if (!cancelled) setAuditTrailEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, builderSource, isOwnerOrAdmin]);

  // Record view of prebuilt tabs when activeTab changes
  useEffect(() => {
    if (activeTab === 'executive') recordView('prebuilt_executive', 'Executive Readiness Overview', 'Executive', 'Requirements', 'executive');
    else if (activeTab === 'requirements') recordView('prebuilt_requirements', 'Framework Requirements Breakdown', 'Requirements', 'Requirements', 'requirements');
    else if (activeTab === 'evidence') recordView('prebuilt_evidence', 'Evidence Vault Status & Expiry', 'Evidence', 'Evidence', 'evidence');
    else if (activeTab === 'competencies') recordView('prebuilt_competencies', 'Competency Matrix Compliance', 'Competencies', 'Competencies', 'competencies');
    else if (activeTab === 'actions') recordView('prebuilt_actions', 'Corrective Actions Registry', 'Actions', 'Actions', 'actions');
    else if (activeTab === 'audits') recordView('prebuilt_audits', 'Audit Packs Registry', 'Audit', 'Audits', 'audits');
    else if (activeTab === 'history' && isOwnerOrAdmin) recordView('prebuilt_history', 'System Audit Trail Log', 'Administration', 'Audit Trail', 'history');
    else if (activeTab === 'administration' && isOwnerOrAdmin) recordView('prebuilt_admin', 'System Activity & Admin', 'Administration', 'Audit Trail', 'administration');
  }, [activeTab, isOwnerOrAdmin, recordView]);

  // Helper to resolve supported aggregations for pivot grid based on measure
  const getSupportedPivotAggregations = useCallback((measure: string) => {
    if (measure === 'avg_days_overdue') {
      return [
        { value: 'avg_days_overdue', label: 'Average Days Overdue' },
        { value: 'max_days_overdue', label: 'Maximum Days Overdue' },
        { value: 'min_days_overdue', label: 'Minimum Days Overdue' }
      ];
    }
    if (measure === 'completion_rate') {
      return [
        { value: 'readiness_rate', label: 'Readiness Rate (%)' }
      ];
    }
    return [
      { value: 'count', label: 'Count of Requirements' },
      { value: 'row_pct', label: 'Row Percentage (%)' },
      { value: 'col_pct', label: 'Column Percentage (%)' },
      { value: 'total_pct', label: 'Total Grid Percentage (%)' }
    ];
  }, []);

  // Safely reset dimension, measure, visualType when builderSource changes
  useEffect(() => {
    const caps = REPORT_CAPABILITIES[builderSource];
    if (caps) {
      const validDims = caps.supportedDimensions.map(d => d.value);
      const validMeas = caps.supportedMeasures.map(m => m.value);
      const validVisuals = caps.supportedVisualTypes.map(v => v.value);

      if (!validDims.includes(builderDimension)) {
        setBuilderDimension(caps.defaultDimension);
      }
      if (!validMeas.includes(builderMeasure)) {
        setBuilderMeasure(caps.defaultMeasure);
      }
      if (!validVisuals.includes(builderVisual)) {
        setBuilderVisual(caps.defaultVisual);
      }
    }
  }, [builderSource, builderDimension, builderMeasure, builderVisual]);

  // Safely reset pivotAggregation when builderMeasure changes
  useEffect(() => {
    const validAggs = getSupportedPivotAggregations(builderMeasure).map(a => a.value);
    if (!validAggs.includes(pivotAggregation)) {
      setPivotAggregation(validAggs[0]);
    }
  }, [builderMeasure, pivotAggregation, getSupportedPivotAggregations]);

  // Reset Filters
  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedOwner('All');
    setSelectedCategory('All');
    setSelectedStatus('All');
    setSelectedRisk('All');
    setIncludeInactive(false);
    setIncludeArchived(false);
    setIncludeDeactivated(false);
    setToast({ type: 'info', message: 'Global filters reset successfully.' });
  };

  // Freshness Manual Refresh
  const handleRefreshData = () => {
    setFreshnessTime(new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setToast({ type: 'success', message: 'Report data refreshed successfully.' });
  };

  // Dynamic filter arrays
  const uniqueOwners = useMemo(() => {
    const owners = new Set<string>();
    frameworkRequirements.forEach(r => { if (r.owner) owners.add(r.owner); });
    actions.forEach(a => { if (a.owner) owners.add(a.owner); });
    return Array.from(owners);
  }, [frameworkRequirements, actions]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    frameworkRequirements.forEach(r => { if (r.category) cats.add(r.category); });
    documents.forEach(d => { if (d.category) cats.add(d.category); });
    return Array.from(cats);
  }, [frameworkRequirements, documents]);

  const readinessByRequirementId = useMemo(
    () => new Map(readinessReport.requirements.map(item => [item.requirement.id, item])),
    [readinessReport.requirements]
  );

  // Scoped / Filtered datasets
  const filteredReqs = useMemo(() => {
    return frameworkRequirements.filter(r => {
      const lifecycle = r.lifecycle_status || 'ACTIVE';
      if (lifecycle === 'DELETED') return false;
      if (!includeArchived && lifecycle === 'ARCHIVED') return false;
      if (!includeDeactivated && lifecycle === 'DEACTIVATED') return false;
      if (selectedCategory !== 'All' && r.category !== selectedCategory) return false;
      if (selectedOwner !== 'All' && r.owner !== selectedOwner) return false;
      if (selectedRisk !== 'All' && r.risk_level !== selectedRisk) return false;
      if (selectedStatus !== 'All' && readinessByRequirementId.get(r.id)?.status !== selectedStatus) return false;
      if (startDate && new Date(r.created_at) < new Date(startDate)) return false;
      if (endDate && new Date(r.created_at) > endOfDay(endDate)) return false;
      return true;
    });
  }, [frameworkRequirements, selectedCategory, selectedOwner, selectedRisk, selectedStatus, startDate, endDate, includeArchived, includeDeactivated, readinessByRequirementId]);

  const filteredDocs = useMemo(() => {
    return documents.filter(d => {
      if (selectedCategory !== 'All' && d.category !== selectedCategory) return false;
      if (startDate && d.created_at && new Date(d.created_at) < new Date(startDate)) return false;
      if (endDate && d.created_at && new Date(d.created_at) > endOfDay(endDate)) return false;
      return true;
    });
  }, [documents, selectedCategory, startDate, endDate]);

  const filteredPeople = useMemo(() => {
    return people.filter(p => {
      if (!includeInactive && !p.active) return false;
      return true;
    });
  }, [people, includeInactive]);

  const filteredActions = useMemo(() => {
    return actions.filter(a => {
      if (selectedOwner !== 'All' && a.owner !== selectedOwner) return false;
      if (startDate && a.created_at && new Date(a.created_at) < new Date(startDate)) return false;
      if (endDate && a.created_at && new Date(a.created_at) > endOfDay(endDate)) return false;
      return true;
    });
  }, [actions, selectedOwner, startDate, endDate]);

  const filteredRequirementIds = useMemo(() => new Set(filteredReqs.map(requirement => requirement.id)), [filteredReqs]);
  const filteredReadinessRequirements = useMemo(
    () => readinessReport.requirements.filter(item => filteredRequirementIds.has(item.requirement.id)),
    [filteredRequirementIds, readinessReport.requirements]
  );
  const attentionRequirements = useMemo(
    () => filteredReadinessRequirements.filter(item =>
      (item.requirement.risk_level === 'High' || item.requirement.risk_level === 'Critical') &&
      (item.status === 'AMBER' || item.status === 'RED')
    ),
    [filteredReadinessRequirements]
  );
  const activeCompetencyTypeIds = useMemo(
    () => new Set(competencyTypes.filter(type => type.active).map(type => type.id)),
    [competencyTypes]
  );
  const filteredPersonIds = useMemo(() => new Set(filteredPeople.map(person => person.id)), [filteredPeople]);
  const filteredCompetencyRecords = useMemo(
    () => competencyRecords.filter(record =>
      filteredPersonIds.has(record.person_id) &&
      activeCompetencyTypeIds.has(record.competency_type_id)
    ),
    [activeCompetencyTypeIds, competencyRecords, filteredPersonIds]
  );
  const filteredCompetencySummary = useMemo(() => {
    const recordsByCell = new Map(
      filteredCompetencyRecords.map(record => [`${record.person_id}:${record.competency_type_id}`, record])
    );
    const counts = { valid: 0, expiringSoon: 0, expired: 0, missing: 0, notRequired: 0 };
    filteredPeople.forEach(person => {
      competencyTypes.filter(type => type.active).forEach(type => {
        const status = calculateCompetencyStatus(recordsByCell.get(`${person.id}:${type.id}`) || null);
        if (status === 'Valid') counts.valid += 1;
        else if (status === 'Expiring Soon') counts.expiringSoon += 1;
        else if (status === 'Expired') counts.expired += 1;
        else if (status === 'Missing') counts.missing += 1;
        else counts.notRequired += 1;
      });
    });
    const scored = counts.valid + counts.expiringSoon + counts.expired + counts.missing;
    return {
      ...counts,
      compliancePercent: scored > 0 ? Math.round((counts.valid / scored) * 100) : 0
    };
  }, [competencyTypes, filteredCompetencyRecords, filteredPeople]);

  const evidenceLinkMetrics = useMemo(() => {
    const linkedDocumentIds = new Set(requirementDocuments.map(link => link.document_id));
    const linked = filteredDocs.filter(document => linkedDocumentIds.has(document.id)).length;
    return { linked, unlinked: filteredDocs.length - linked };
  }, [filteredDocs, requirementDocuments]);

  const actionMetrics = useMemo(() => {
    const today = new Date();
    const open = filteredActions.filter(action => action.status === 'Open' || action.status === 'In Progress');
    const overdue = open.filter(action => {
      const dueDate = action.target_due_date || action.due_date;
      return Boolean(dueDate && new Date(dueDate) < today);
    }).length;
    const completed = filteredActions.filter(action => action.status === 'Complete').length;
    const eligible = filteredActions.filter(action => action.status !== 'Cancelled').length;
    return {
      open: open.length,
      overdue,
      completed,
      completionRate: eligible > 0 ? Math.round((completed / eligible) * 100) : 0
    };
  }, [filteredActions]);

  const documentUploadTrend = useMemo(() => {
    const months = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      date.setMonth(date.getMonth() - (6 - index));
      return date;
    });
    const points = months.map(month => filteredDocs.filter(document => {
      if (!document.created_at) return false;
      const created = new Date(document.created_at);
      return created.getFullYear() === month.getFullYear() && created.getMonth() === month.getMonth();
    }).length);
    const labels = months.map(month => month.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }));
    return { points, labels };
  }, [filteredDocs]);

  // ---------------- CUSTOM SVG CHARTING GENERATORS ----------------

  const handleDrillDown = (source: string, extraFilters: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    params.set('source', source);

    if (selectedCategory !== 'All') params.set('category', selectedCategory);
    if (selectedOwner !== 'All') params.set('owner', selectedOwner);
    if (selectedStatus !== 'All') params.set('status', selectedStatus);
    if (selectedRisk !== 'All') params.set('risk', selectedRisk);

    Object.entries(extraFilters).forEach(([key, val]) => {
      if (val === 'All') {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    router.push(`/dashboard/reports/detail?${params.toString()}`);
  };

  const handleDonutSegmentClick = (source: string, label: string) => {
    let status = 'All';
    if (source === 'Requirements') {
      if (label.includes('Green') || label.includes('Compliant')) status = 'GREEN';
      else if (label.includes('Soon') || label.includes('Warning') || label.includes('AMBER')) status = 'AMBER';
      else if (label.includes('Overdue') || label.includes('Gap') || label.includes('RED')) status = 'RED';
      else if (label.includes('Excluded') || label.includes('GREY')) status = 'GREY';
    } else if (source === 'Evidence') {
      if (label.includes('Active') || label.includes('Current')) status = 'Active';
      else if (label.includes('Soon')) status = 'Expiring Soon';
      else if (label.includes('Expired')) status = 'Expired';
      else if (label.includes('Unclassified')) status = 'Unclassified';
    } else if (source === 'Actions') {
      if (label.includes('Complete')) status = 'Complete';
      else if (label.includes('Progress')) status = 'In Progress';
      else if (label.includes('Open')) status = 'Open';
      else if (label.includes('Cancelled')) status = 'Cancelled';
    } else if (source === 'Audits') {
      if (label.includes('Ready')) status = 'Ready';
      else if (label.includes('Draft')) status = 'Draft';
      else if (label.includes('Sent')) status = 'Sent';
      else if (label.includes('Archived')) status = 'Archived';
    }
    handleDrillDown(source, { status });
  };

  const handleBarRowClick = (source: string, item: any) => {
    if (source === 'Competencies' && item.id) {
      router.push(`/dashboard/competencies?id=${item.id}`);
    } else if (source === 'Requirements') {
      handleDrillDown('Requirements', { category: item.label });
    } else if (source === 'Actions') {
      handleDrillDown('Actions', { owner: item.label });
    }
  };

  // Donut segment math with click handlers and interactive overlays
  const renderSVDonut = (data: Array<{ value: number; color: string; label: string }>, sourceName?: string, chartId?: string) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
      return (
        <div className="flex items-center justify-center h-44 text-xs text-muted-foreground border border-dashed border-border/80 rounded-xl bg-muted/10">
          No records matching criteria.
        </div>
      );
    }

    let accumulatedPercentage = 0;
    const segments = data.map(item => {
      const percentage = total > 0 ? (item.value / total) * 100 : 0;
      const strokeDash = `${percentage} ${100 - percentage}`;
      const strokeOffset = 100 - accumulatedPercentage + 25; // start from 12 o'clock
      accumulatedPercentage += percentage;
      return { strokeDash, strokeOffset, color: item.color, label: item.label, value: item.value, percent: Math.round(percentage) };
    });

    const hovered = chartId ? hoveredDonutSegment[chartId] : null;

    return (
      <div className="flex flex-col gap-4 py-2">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <div className="relative w-36 h-36 shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="hsl(var(--border))" strokeWidth="3" opacity="0.25" />
              {segments.map((seg, i) => (
                <circle
                  key={i}
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={hovered && hovered.label === seg.label ? "4.2" : "3.2"}
                  strokeDasharray={seg.strokeDash}
                  strokeDashoffset={seg.strokeOffset}
                  onClick={() => sourceName && handleDonutSegmentClick(sourceName, seg.label)}
                  onMouseEnter={() => {
                    if (chartId) {
                      setHoveredDonutSegment(prev => ({
                        ...prev,
                        [chartId]: { label: seg.label, value: seg.value, color: seg.color, percent: seg.percent }
                      }));
                    }
                  }}
                  onMouseLeave={() => {
                    if (chartId) {
                      setHoveredDonutSegment(prev => ({ ...prev, [chartId]: null }));
                    }
                  }}
                  className={`transition-all duration-200 ${sourceName ? 'cursor-pointer' : ''}`}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
              {hovered ? (
                <>
                  <span className="text-[9px] font-black uppercase tracking-wider truncate max-w-[80px]" style={{ color: hovered.color }}>{hovered.label}</span>
                  <span className="text-lg font-black text-foreground">{hovered.value}</span>
                  <span className="text-[10px] text-muted-foreground font-bold">{hovered.percent}%</span>
                </>
              ) : (
                <>
                  <span className="text-xl font-black text-foreground">{total}</span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-extrabold">total</span>
                </>
              )}
            </div>
          </div>
          <div className="flex-1 space-y-1.5 text-xs w-full max-w-[200px]">
            {segments.map((seg, i) => (
              <div
                key={i}
                onClick={() => sourceName && handleDonutSegmentClick(sourceName, seg.label)}
                onMouseEnter={() => {
                  if (chartId) {
                    setHoveredDonutSegment(prev => ({
                      ...prev,
                      [chartId]: { label: seg.label, value: seg.value, color: seg.color, percent: seg.percent }
                    }));
                  }
                }}
                onMouseLeave={() => {
                  if (chartId) {
                    setHoveredDonutSegment(prev => ({ ...prev, [chartId]: null }));
                  }
                }}
                className={`flex items-center justify-between border-b border-border/40 pb-1 ${
                  hovered && hovered.label === seg.label ? 'bg-muted/50 font-bold' : ''
                } ${sourceName ? 'cursor-pointer hover:bg-muted/30 px-1 rounded transition-all' : ''}`}
              >
                <span className="flex items-center gap-2 text-muted-foreground font-semibold truncate max-w-[130px]">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                  {seg.label}
                </span>
                <span className="font-extrabold text-foreground shrink-0">{seg.value} ({seg.percent}%)</span>
              </div>
            ))}
          </div>
        </div>

        {chartId && (
          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px] font-bold">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setExpandedTables(prev => ({ ...prev, [chartId]: !prev[chartId] }))}
                className="text-indigo-650 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> {expandedTables[chartId] ? 'Hide Grid' : 'View Data'}
              </button>
              <button
                type="button"
                onClick={() => setFocusedChartId(chartId)}
                className="text-muted-foreground hover:text-foreground hover:underline cursor-pointer flex items-center gap-1"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> Focus View
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                const headers = ['Label', 'Value', 'Percentage'];
                const rows = data.map(item => [item.label, String(item.value), `${Math.round((item.value / total) * 100)}%`]);
                handleExportCSV(sourceName ? `${sourceName} distribution` : 'Chart summary', headers, rows);
              }}
              className="text-muted-foreground hover:text-foreground hover:underline cursor-pointer flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        )}

        {chartId && expandedTables[chartId] && (
          <div className="overflow-hidden border border-border/60 rounded-xl text-[10px] bg-card animate-fadeIn">
            <table className="min-w-full divide-y divide-border/60">
              <thead className="bg-muted/50 font-bold text-muted-foreground uppercase text-[9px]">
                <tr>
                  <th className="px-2 py-1.5 text-left">Label</th>
                  <th className="px-2 py-1.5 text-center">Value</th>
                  <th className="px-2 py-1.5 text-center">Proportion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/10">
                    <td className="px-2 py-1 text-left font-semibold text-muted-foreground flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      {item.label}
                    </td>
                    <td className="px-2 py-1 text-center text-foreground font-extrabold">{item.value}</td>
                    <td className="px-2 py-1 text-center text-muted-foreground">{total > 0 ? Math.round((item.value / total) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Sparkline Chart (Area/Line SVG with Interactive Hover Tooltips and View Data Option)
  const renderSVGSparkline = (dataPoints: number[], labels: string[], areaColor = 'rgba(79, 70, 229, 0.15)', strokeColor = '#4f46e5', sourceName?: string, chartId?: string) => {
    if (dataPoints.length === 0) return null;
    const maxVal = Math.max(...dataPoints, 5); // ensure we don't divide by 0
    const height = 80;
    const width = 280;
    const pointsCount = dataPoints.length;
    const stepX = width / (pointsCount - 1 || 1);

    const svgPoints = dataPoints.map((val, idx) => {
      const x = idx * stepX;
      const y = height - (val / maxVal) * (height - 10) - 5;
      return { x, y };
    });

    const linePath = svgPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${svgPoints[svgPoints.length - 1].x} ${height} L 0 ${height} Z`;

    const hovered = chartId ? hoveredSparklinePoint[chartId] : null;

    return (
      <div className="space-y-4 py-2">
        <div className="relative">
          <div className="h-6 flex justify-between items-center text-[10px] font-bold text-muted-foreground px-1 pointer-events-none">
            {hovered ? (
              <span className="text-indigo-650 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/25">
                {hovered.label}: <span className="font-extrabold text-foreground">{hovered.value} docs</span>
              </span>
            ) : (
              <span>Hover points for detail</span>
            )}
          </div>
          <div className={`relative ${sourceName ? 'cursor-pointer' : ''}`}>
            <svg className="w-full h-20" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
              <path d={areaPath} fill={areaColor} />
              <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {svgPoints.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={hovered && hovered.index === i ? 5 : 3.5}
                  fill="hsl(var(--card))"
                  stroke={strokeColor}
                  strokeWidth="2"
                  onMouseEnter={() => {
                    if (chartId) {
                      setHoveredSparklinePoint(prev => ({
                        ...prev,
                        [chartId]: { label: labels[i], value: dataPoints[i], index: i }
                      }));
                    }
                  }}
                  onMouseLeave={() => {
                    if (chartId) {
                      setHoveredSparklinePoint(prev => ({ ...prev, [chartId]: null }));
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (sourceName) handleDrillDown(sourceName);
                  }}
                  className="cursor-pointer transition-all duration-150"
                />
              ))}
            </svg>
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground uppercase font-bold tracking-wider pt-2 border-t border-border/40 mt-1">
            <span>{labels[0]}</span>
            <span>{labels[labels.length - 1]}</span>
          </div>
        </div>

        {chartId && (
          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px] font-bold">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setExpandedTables(prev => ({ ...prev, [chartId]: !prev[chartId] }))}
                className="text-indigo-650 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> {expandedTables[chartId] ? 'Hide Grid' : 'View Data'}
              </button>
              <button
                type="button"
                onClick={() => setFocusedChartId(chartId)}
                className="text-muted-foreground hover:text-foreground hover:underline cursor-pointer flex items-center gap-1"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> Focus View
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                const headers = ['Month', 'Upload Count'];
                const rows = labels.map((l, i) => [l, String(dataPoints[i])]);
                handleExportCSV('Evidence Upload Trend', headers, rows);
              }}
              className="text-muted-foreground hover:text-foreground hover:underline cursor-pointer flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        )}

        {chartId && expandedTables[chartId] && (
          <div className="overflow-hidden border border-border/60 rounded-xl text-[10px] bg-card animate-fadeIn">
            <table className="min-w-full divide-y divide-border/60">
              <thead className="bg-muted/50 font-bold text-muted-foreground uppercase text-[9px]">
                <tr>
                  <th className="px-2 py-1.5 text-left">Month</th>
                  <th className="px-2 py-1.5 text-center">Document Uploads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {labels.map((l, i) => (
                  <tr key={i} className="hover:bg-muted/10">
                    <td className="px-2 py-1 text-left font-semibold text-muted-foreground">{l}</td>
                    <td className="px-2 py-1 text-center text-foreground font-extrabold">{dataPoints[i]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Horizontal bar progress lists
  const renderHorizontalBarList = (list: Array<{ label: string; count: number; colorClass: string; total: number; id?: string }>, sourceName?: string) => {
    return (
      <div className="space-y-3">
        {list.slice(0, 6).map((item, idx) => {
          const percentage = item.total > 0 ? (item.count / item.total) * 100 : 0;
          return (
            <div
              key={idx}
              onClick={() => sourceName && handleBarRowClick(sourceName, item)}
              className={`space-y-1.5 ${sourceName ? 'cursor-pointer hover:bg-muted/30 p-1 rounded-lg transition-all' : ''}`}
            >
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-foreground truncate max-w-[180px] font-bold">{item.label}</span>
                <span className="text-muted-foreground">{item.count} / {item.total} ({Math.round(percentage)}%)</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${item.colorClass}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ---------------- EXPORTS GENERATORS ----------------

  // Export Filtered Table as CSV
  const handleExportCSV = (reportName: string, headers: string[], rows: string[][]) => {
    setConfirmRequest({
      title: 'Export Report Data?',
      description: `You are about to export "${reportName}" data as a CSV spreadsheet. Do you want to download this file?`,
      confirmLabel: 'Export CSV',
      tone: 'primary',
      onConfirm: () => {
        try {
          const csvContent = [
            [`Vygilence Compliance Report - ${reportName}`],
            [`Workspace: ${organization?.name || 'Vygilence Demo'}`],
            [`Generated At: ${new Date().toLocaleString()}`],
            [],
            headers,
            ...rows
          ]
            .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\r\n');

          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `vygilence-report-${reportName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          setToast({ type: 'success', message: 'Report data exported successfully.' });

          // Log the activity to audit trail
          dbService.logReportActivity({
            actionType: 'report_exported_csv',
            entityLabel: reportName,
            description: `Exported report data for "${reportName}" as CSV.`,
            metadata: { headers, rowCount: rows.length }
          }).catch(err => console.error('Failed to log audit activity:', err));

        } catch {
          setToast({ type: 'error', message: 'Failed to export report CSV.' });
        }
      }
    });
  };

  // Print Report PDF
  const handlePrintReport = (reportName: string, selectorId: string) => {
    const printContent = document.getElementById(selectorId)?.innerHTML;
    if (!printContent) {
      setToast({ type: 'error', message: 'Could not generate print preview.' });
      return;
    }

    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      setToast({ type: 'error', message: 'Unable to open print preview. Check browser popups.' });
      return;
    }

    // Log the activity to audit trail
    dbService.logReportActivity({
      actionType: 'report_printed_pdf',
      entityLabel: reportName,
      description: `Opened print/PDF rendering for report "${reportName}".`
    }).catch(err => console.error('Failed to log audit activity:', err));

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Vygilence Report - ${escapeHtml(reportName)}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; margin: 32px; background: #fff; }
            h1 { font-size: 24px; margin-bottom: 2px; }
            h2 { font-size: 16px; color: #4b5563; margin-top: 0; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 24px; }
            .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #fff; }
            .card-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; margin-bottom: 8px; }
            .metric { font-size: 28px; font-weight: 850; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
            th { background: #f3f4f6; text-transform: uppercase; font-size: 10px; font-weight: 800; color: #374151; }
            .disclaimer { font-size: 10px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <h1>Vygilence Readiness and Evidence Report</h1>
          <h2>Report: ${escapeHtml(reportName)} | Workspace: ${escapeHtml(organization?.name || 'Vygilence Workspace')}</h2>
          <p style="font-size: 11px; color: #6b7280;">
            Generated: ${escapeHtml(new Date().toLocaleString())}<br />
            Filters: category=${escapeHtml(selectedCategory)}, owner=${escapeHtml(selectedOwner)}, requirement status=${escapeHtml(selectedStatus)},
            risk=${escapeHtml(selectedRisk)}, date=${escapeHtml(startDate || 'any')} to ${escapeHtml(endDate || 'any')}
          </p>
          <div>${printContent}</div>
          <div class="disclaimer">
            Reports reflect the records currently held in Vygilence and depend on the completeness and accuracy of the underlying data.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // ---------------- PIVOT DATA CALCULATIONS ----------------

  const getRequirementDimensionValue = useCallback((requirement: Requirement, field: string) => {
    if (field === 'status') {
      return readinessByRequirementId.get(requirement.id)?.status || 'GREY';
    }
    return String(requirement[field as keyof Requirement] || 'Unassigned');
  }, [readinessByRequirementId]);

  const getRequirementsReadinessScore = useCallback((requirements: Requirement[]) => {
    const scores = requirements
      .map(requirement => readinessByRequirementId.get(requirement.id)?.score)
      .filter((score): score is number => score !== null && score !== undefined);
    return scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0;
  }, [readinessByRequirementId]);

  const pivotGridData = useMemo(() => {
    const rowValues = new Set<string>();
    const colValues = new Set<string>();

    filteredReqs.forEach(r => {
      const rVal = getRequirementDimensionValue(r, pivotRow);
      const cVal = getRequirementDimensionValue(r, pivotCol);
      rowValues.add(rVal);
      colValues.add(cVal);
    });

    const rowArr = Array.from(rowValues).sort();
    const colArr = Array.from(colValues).sort();

    // Group requirements per cell
    const cellReqs: Record<string, Record<string, Requirement[]>> = {};
    rowArr.forEach(r => {
      cellReqs[r] = {};
      colArr.forEach(c => {
        cellReqs[r][c] = [];
      });
    });

    filteredReqs.forEach(r => {
      const rVal = getRequirementDimensionValue(r, pivotRow);
      const cVal = getRequirementDimensionValue(r, pivotCol);
      cellReqs[rVal][cVal].push(r);
    });

    const rowCounts: Record<string, number> = {};
    const colCounts: Record<string, number> = {};
    let totalCount = 0;

    rowArr.forEach(r => {
      rowCounts[r] = 0;
      colArr.forEach(c => {
        const cnt = cellReqs[r][c].length;
        rowCounts[r] += cnt;
        colCounts[c] = (colCounts[c] || 0) + cnt;
        totalCount += cnt;
      });
    });

    const matrix: Record<string, Record<string, number>> = {};
    const now = new Date();

    const getDaysOverdue = (req: Requirement) => {
      if (req.next_due_date && new Date(req.next_due_date) < now) {
        const due = new Date(req.next_due_date);
        const diffTime = now.getTime() - due.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      return 0;
    };

    rowArr.forEach(r => {
      matrix[r] = {};
      colArr.forEach(c => {
        const reqs = cellReqs[r][c];
        if (pivotAggregation === 'count') {
          matrix[r][c] = reqs.length;
        } else if (pivotAggregation === 'readiness_rate') {
          matrix[r][c] = getRequirementsReadinessScore(reqs);
        } else if (pivotAggregation === 'avg_days_overdue') {
          const overdueReqs = reqs.filter(req => getDaysOverdue(req) > 0);
          const sum = overdueReqs.reduce((acc, req) => acc + getDaysOverdue(req), 0);
          matrix[r][c] = overdueReqs.length > 0 ? Math.round(sum / overdueReqs.length) : 0;
        } else if (pivotAggregation === 'max_days_overdue') {
          const overdueReqs = reqs.filter(req => getDaysOverdue(req) > 0);
          matrix[r][c] = overdueReqs.length > 0 ? Math.max(...overdueReqs.map(getDaysOverdue)) : 0;
        } else if (pivotAggregation === 'min_days_overdue') {
          const overdueReqs = reqs.filter(req => getDaysOverdue(req) > 0);
          matrix[r][c] = overdueReqs.length > 0 ? Math.min(...overdueReqs.map(getDaysOverdue)) : 0;
        } else if (pivotAggregation === 'row_pct') {
          const rowTotal = rowCounts[r];
          matrix[r][c] = rowTotal > 0 ? Math.round((reqs.length / rowTotal) * 100) : 0;
        } else if (pivotAggregation === 'col_pct') {
          const colTotal = colCounts[c] || 0;
          matrix[r][c] = colTotal > 0 ? Math.round((reqs.length / colTotal) * 100) : 0;
        } else if (pivotAggregation === 'total_pct') {
          matrix[r][c] = totalCount > 0 ? Math.round((reqs.length / totalCount) * 100) : 0;
        }
      });
    });

    return { rowArr, colArr, matrix, cellReqs, rowCounts, colCounts, totalCount };
  }, [filteredReqs, pivotRow, pivotCol, pivotAggregation, getRequirementDimensionValue, getRequirementsReadinessScore]);

  // ---------------- CUSTOM BUILDER DATA PREVIEW ----------------

  const getMeasureLabel = (measure: string) => {
    switch (measure) {
      case 'count': return 'Count of Records';
      case 'completion_rate': return 'Completion/Readiness Rate (%)';
      case 'overdue': return 'Overdue Count';
      case 'expiring': return 'Expiring Soon Count';
      case 'expired': return 'Expired Count';
      case 'missing': return 'Missing Count';
      case 'avg_days_overdue': return 'Average Days Overdue';
      case 'critical': return 'Critical Event Count';
      case 'warning': return 'Warning Event Count';
      default: return 'Value';
    }
  };

  const getPivotRowColTotal = (key: string, type: 'row' | 'col' | 'grand') => {
    let reqs: Requirement[] = [];
    if (type === 'row') {
      reqs = filteredReqs.filter(r => getRequirementDimensionValue(r, pivotRow) === key);
    } else if (type === 'col') {
      reqs = filteredReqs.filter(r => getRequirementDimensionValue(r, pivotCol) === key);
    } else {
      reqs = filteredReqs;
    }

    if (reqs.length === 0) return 0;
    if (pivotAggregation === 'count') {
      return reqs.length;
    }
    const now = new Date();
    const getDaysOverdue = (req: Requirement) => {
      if (req.next_due_date && new Date(req.next_due_date) < now) {
        const due = new Date(req.next_due_date);
        const diffTime = now.getTime() - due.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      return 0;
    };

    if (pivotAggregation === 'readiness_rate') {
      return getRequirementsReadinessScore(reqs);
    }
    if (pivotAggregation === 'avg_days_overdue') {
      const overdueReqs = reqs.filter(req => getDaysOverdue(req) > 0);
      const sum = overdueReqs.reduce((acc, req) => acc + getDaysOverdue(req), 0);
      return overdueReqs.length > 0 ? Math.round(sum / overdueReqs.length) : 0;
    }
    if (pivotAggregation === 'max_days_overdue') {
      const overdueReqs = reqs.filter(req => getDaysOverdue(req) > 0);
      return overdueReqs.length > 0 ? Math.max(...overdueReqs.map(getDaysOverdue)) : 0;
    }
    if (pivotAggregation === 'min_days_overdue') {
      const overdueReqs = reqs.filter(req => getDaysOverdue(req) > 0);
      return overdueReqs.length > 0 ? Math.min(...overdueReqs.map(getDaysOverdue)) : 0;
    }
    if (pivotAggregation === 'row_pct') {
      if (type === 'row') return 100;
      if (type === 'col') return filteredReqs.length > 0 ? Math.round((reqs.length / filteredReqs.length) * 100) : 0;
      return 100;
    }
    if (pivotAggregation === 'col_pct') {
      if (type === 'row') return filteredReqs.length > 0 ? Math.round((reqs.length / filteredReqs.length) * 100) : 0;
      if (type === 'col') return 100;
      return 100;
    }
    if (pivotAggregation === 'total_pct') {
      return filteredReqs.length > 0 ? Math.round((reqs.length / filteredReqs.length) * 100) : 0;
    }
    return 0;
  };

  const builderReportData = useMemo(() => {
    let sourceData: Array<Record<string, any>> = [];
    if (builderSource === 'Requirements') {
      sourceData = filteredReqs.map(requirement => ({
        ...requirement,
        status: readinessByRequirementId.get(requirement.id)?.status || 'GREY'
      }));
    }
    else if (builderSource === 'Evidence') sourceData = filteredDocs.map(document => ({ ...document }));
    else if (builderSource === 'Competencies') {
      sourceData = filteredCompetencyRecords.map(record => ({
        ...record,
        status: calculateCompetencyStatus(record)
      }));
    }
    else if (builderSource === 'Actions') sourceData = filteredActions.map(action => ({ ...action }));
    else if (builderSource === 'Audit Trail' && isOwnerOrAdmin) sourceData = auditTrailEvents.map(event => ({ ...event }));

    const getValAsDateStr = (item: any, bucketType: string) => {
      let dateVal: string | null = null;
      if (builderSource === 'Requirements') {
        dateVal = item.next_due_date || item.created_at;
      } else if (builderSource === 'Evidence') {
        dateVal = item.expiry_date || item.created_at;
      } else if (builderSource === 'Competencies') {
        dateVal = item.expiry_date || item.completed_date || item.created_at;
      } else if (builderSource === 'Actions') {
        dateVal = item.target_due_date || item.due_date || item.created_at;
      } else if (builderSource === 'Audit Trail') {
        dateVal = item.created_at;
      }
      if (!dateVal) return 'No Date';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return 'Invalid Date';

      if (bucketType === 'date_day') {
        return d.toISOString().split('T')[0];
      }
      if (bucketType === 'date_week') {
        const tempDate = new Date(d.getTime());
        tempDate.setHours(0, 0, 0, 0);
        tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
        const week1 = new Date(tempDate.getFullYear(), 0, 4);
        const weekNum = 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        return `${tempDate.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      }
      if (bucketType === 'date_month') {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      if (bucketType === 'date_year') {
        return `${d.getFullYear()}`;
      }
      return 'Unknown';
    };

    const groupedItems = new Map<string, any[]>();
    sourceData.forEach(item => {
      let key = 'Unknown';
      if (builderDimension.startsWith('date_')) {
        key = getValAsDateStr(item, builderDimension);
      } else {
        key = String(item[builderDimension as keyof typeof item] || 'Unknown/Other');
      }
      if (!groupedItems.has(key)) {
        groupedItems.set(key, []);
      }
      groupedItems.get(key)!.push(item);
    });

    const result: Array<{ label: string; value: number }> = [];
    const now = new Date();

    const getDaysOverdue = (req: any) => {
      const dueStr = req.next_due_date || req.target_due_date || req.due_date;
      if (!dueStr) return 0;
      const due = new Date(dueStr);
      const diffTime = Math.max(0, now.getTime() - due.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    groupedItems.forEach((items, key) => {
      let val = 0;
      if (builderMeasure === 'count') {
        val = items.length;
      } else if (builderMeasure === 'completion_rate') {
        if (builderSource === 'Requirements') {
          val = getRequirementsReadinessScore(items as Requirement[]);
        } else if (builderSource === 'Competencies') {
          const valid = items.filter(item => item.status === 'Valid').length;
          val = items.length > 0 ? Math.round((valid / items.length) * 100) : 0;
        } else if (builderSource === 'Actions') {
          const complete = items.filter(item => item.status === 'Complete').length;
          val = items.length > 0 ? Math.round((complete / items.length) * 100) : 0;
        } else {
          val = items.length;
        }
      } else if (builderMeasure === 'overdue') {
        if (builderSource === 'Requirements') {
          val = items.filter(item => {
            const status = readinessByRequirementId.get(item.id)?.status || 'GREY';
            return status === 'RED';
          }).length;
        } else if (builderSource === 'Actions') {
          val = items.filter(item => {
            const dueDate = item.target_due_date || item.due_date;
            return item.status !== 'Complete' && item.status !== 'Cancelled' && dueDate && new Date(dueDate) < now;
          }).length;
        } else {
          val = items.length;
        }
      } else if (builderMeasure === 'expiring') {
        if (builderSource === 'Evidence') {
          val = items.filter(item => item.status === 'Expiring Soon').length;
        } else {
          val = items.length;
        }
      } else if (builderMeasure === 'expired') {
        if (builderSource === 'Evidence') {
          val = items.filter(item => item.status === 'Expired').length;
        } else if (builderSource === 'Competencies') {
          val = items.filter(item => item.status === 'Expired').length;
        } else {
          val = items.length;
        }
      } else if (builderMeasure === 'missing') {
        if (builderSource === 'Competencies') {
          val = items.filter(item => item.status === 'Missing').length;
        } else {
          val = items.length;
        }
      } else if (builderMeasure === 'avg_days_overdue') {
        let sumDays = 0;
        let countOverdue = 0;
        if (builderSource === 'Requirements') {
          items.forEach(item => {
            const status = readinessByRequirementId.get(item.id)?.status || 'GREY';
            if (status === 'RED' && item.next_due_date) {
              sumDays += getDaysOverdue(item);
              countOverdue++;
            }
          });
          val = countOverdue > 0 ? Math.round(sumDays / countOverdue) : 0;
        } else if (builderSource === 'Actions') {
          items.forEach(item => {
            const dueDate = item.target_due_date || item.due_date;
            if (item.status !== 'Complete' && item.status !== 'Cancelled' && dueDate) {
              const due = new Date(dueDate);
              if (due < now) {
                sumDays += getDaysOverdue(item);
                countOverdue++;
              }
            }
          });
          val = countOverdue > 0 ? Math.round(sumDays / countOverdue) : 0;
        } else {
          val = 0;
        }
      } else if (builderMeasure === 'critical') {
        if (builderSource === 'Audit Trail') {
          val = items.filter(item => item.severity === 'critical').length;
        } else {
          val = items.length;
        }
      } else if (builderMeasure === 'warning') {
        if (builderSource === 'Audit Trail') {
          val = items.filter(item => item.severity === 'warning').length;
        } else {
          val = items.length;
        }
      } else {
        val = items.length;
      }
      result.push({ label: key, value: val });
    });

    return result.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' }));
  }, [builderSource, builderDimension, builderMeasure, filteredReqs, filteredDocs, filteredCompetencyRecords, filteredActions, auditTrailEvents, readinessByRequirementId, isOwnerOrAdmin, getRequirementsReadinessScore]);

  const handleExportBuilderCSV = () => {
    const reportName = builderReportName.trim() || `${builderSource} by ${builderDimension}`;
    if (builderVisual === 'pivot' && builderSource === 'Requirements') {
      const headers = [pivotRow, ...pivotGridData.colArr, 'Grand Total'];
      const rows = pivotGridData.rowArr.map(row => {
        const values = pivotGridData.colArr.map(column => {
          const val = pivotGridData.matrix[row][column] || 0;
          return ['readiness_rate', 'row_pct', 'col_pct', 'total_pct'].includes(pivotAggregation) ? `${val}%` : String(val);
        });
        const rTotalVal = getPivotRowColTotal(row, 'row');
        const rowTotalStr = pivotAggregation === 'col_pct' ? 'N/A' : ['readiness_rate', 'row_pct', 'col_pct', 'total_pct'].includes(pivotAggregation) ? `${rTotalVal}%` : String(rTotalVal);
        return [row, ...values, rowTotalStr];
      });
      const colTotals = [
        'Grand Total',
        ...pivotGridData.colArr.map(col => {
          const cTotalVal = getPivotRowColTotal(col, 'col');
          return pivotAggregation === 'row_pct' ? 'N/A' : ['readiness_rate', 'row_pct', 'col_pct', 'total_pct'].includes(pivotAggregation) ? `${cTotalVal}%` : String(cTotalVal);
        }),
        (() => {
          const gTotalVal = getPivotRowColTotal('', 'grand');
          return ['readiness_rate', 'row_pct', 'col_pct', 'total_pct'].includes(pivotAggregation) ? `${gTotalVal}%` : String(gTotalVal);
        })()
      ];
      handleExportCSV(reportName, headers, [...rows, colTotals]);

      dbService.logReportActivity({
        actionType: 'report_exported_csv',
        entityLabel: reportName,
        description: `Exported pivot report "${reportName}" configuration data as CSV.`
      });
      return;
    }

    const measureLabel = getMeasureLabel(builderMeasure);
    handleExportCSV(
      reportName,
      [builderDimension, measureLabel],
      builderReportData.map(item => [item.label, String(item.value)])
    );

    dbService.logReportActivity({
      actionType: 'report_exported_csv',
      entityLabel: reportName,
      description: `Exported custom report "${reportName}" data as CSV (${builderReportData.length} records).`
    });
  };

  // Save Custom Report Config
  const handleSaveCustomReport = async () => {
    const finalReportName = builderReportName.trim() || `${builderSource} by ${builderDimension.replace('date_', 'Date ')}`;
    const finalReportDesc = builderReportDesc.trim() || `Summary of ${getMeasureLabel(builderMeasure)} grouped by ${builderDimension.replace('date_', 'Date ')} from ${builderSource} compliance module.`;

    if (builderReportVisibility === 'organisation' && !isOwnerOrAdmin) {
      setToast({ type: 'error', message: 'Only Owners or Admins can save organisation-shared reports.' });
      return;
    }

    if ((builderReportVisibility === 'organisation' || builderReportVisibility === 'personal') && !isSharedTableAvailable) {
      setToast({ type: 'error', message: 'Database storage is currently unavailable. Organisation and Personal Account reports cannot be saved.' });
      return;
    }

    try {
      const isLocal = builderReportVisibility === 'personal_local';
      await dbService.addSavedReport({
        name: finalReportName,
        description: finalReportDesc,
        report_type: 'custom',
        data_source: builderSource,
        configuration: {
          dimension: builderDimension,
          measure: builderMeasure,
          visualType: builderVisual,
          filters: {
            category: selectedCategory,
            status: selectedStatus,
            risk: selectedRisk
          }
        },
        visibility: isLocal ? 'personal' : (builderReportVisibility as 'personal' | 'organisation'),
        is_favourite: false
      }, { forceLocal: isLocal });

      loadSavedReports();
      setBuilderReportName('');
      setBuilderReportDesc('');
      setToast({ type: 'success', message: `Report "${finalReportName}" saved successfully.` });
      setActiveTab('saved');
    } catch (e) {
      console.error('Failed to save report', e);
      setToast({ type: 'error', message: 'Failed to save the report configuration. Database storage is currently unavailable.' });
    }
  };

  // Delete Saved Report
  const handleDeleteSavedReport = (id: string, name: string) => {
    setConfirmRequest({
      title: 'Delete Saved Report?',
      description: `Are you sure you want to delete the report "${name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      onConfirm: async () => {
        try {
          await dbService.deleteSavedReport(id);
          loadSavedReports();
          setToast({ type: 'success', message: 'Saved report deleted successfully.' });
        } catch (e) {
          console.error('Failed to delete report', e);
          setToast({ type: 'error', message: 'Failed to delete the report.' });
        }
      }
    });
  };

  const handleToggleFavouriteReport = async (id: string, isFav: boolean) => {
    setConfirmRequest({
      title: isFav ? 'Remove from Favourites?' : 'Add to Favourites?',
      description: isFav
        ? 'Are you sure you want to remove this report from your Favourites list?'
        : 'Are you sure you want to add this report to your Favourites list?',
      confirmLabel: isFav ? 'Remove' : 'Add',
      tone: 'primary',
      onConfirm: async () => {
        try {
          const nextFavs = isFav
            ? favReportIds.filter(fid => fid !== id)
            : [...favReportIds, id];
          setFavReportIds(nextFavs);
          saveReportFavourites(nextFavs);

          if (!id.startsWith('prebuilt_')) {
            await dbService.updateSavedReport(id, { is_favourite: !isFav });
            loadSavedReports();
          }
          setToast({ type: 'success', message: !isFav ? 'Report added to favourites.' : 'Report removed from favourites.' });
        } catch (e) {
          console.error('Failed to toggle favourite', e);
          setToast({ type: 'error', message: 'Failed to update report favourites.' });
        }
      }
    });
  };

  const handleRenameReport = (rep: SavedReport) => {
    setEditingReport(rep);
    setEditReportName(rep.name);
    setEditReportDesc(rep.description || '');
  };

  const handleSaveRename = async () => {
    if (!editingReport) return;
    if (!editReportName.trim()) {
      setToast({ type: 'error', message: 'Name cannot be empty.' });
      return;
    }
    try {
      await dbService.updateSavedReport(editingReport.id, {
        name: editReportName.trim(),
        description: editReportDesc.trim() || null
      });
      loadSavedReports();
      setEditingReport(null);
      setToast({ type: 'success', message: 'Report updated successfully.' });
    } catch (e) {
      console.error('Failed to update report', e);
      setToast({ type: 'error', message: 'Failed to update report.' });
    }
  };

  const handleClearRecents = () => {
    setConfirmRequest({
      title: 'Clear Recently Viewed?',
      description: 'Are you sure you want to clear your recently viewed reports history? This cannot be undone.',
      confirmLabel: 'Clear History',
      tone: 'danger',
      onConfirm: async () => {
        setRecentViews([]);
        saveRecentReports([]);
        setToast({ type: 'success', message: 'Recently viewed history cleared.' });
      }
    });
  };

  const handleDuplicatePrebuiltReport = async (rep: any) => {
    try {
      await dbService.addSavedReport({
        name: `${rep.name} (Custom Copy)`,
        description: `Customized copy of ${rep.name}.`,
        report_type: 'custom',
        data_source: rep.sourceModule,
        configuration: {
          dimension: 'category',
          measure: 'count',
          visualType: 'bar',
          filters: {
            category: 'All',
            status: 'All',
            risk: 'All'
          }
        },
        visibility: 'personal',
        is_favourite: false
      }, { forceLocal: true });
      loadSavedReports();
      setToast({ type: 'success', message: `Prebuilt report duplicated as Personal Browser Report.` });
    } catch (e) {
      console.error('Failed to duplicate prebuilt report', e);
      setToast({ type: 'error', message: 'Failed to duplicate prebuilt report.' });
    }
  };

  const handleDuplicateReport = async (rep: SavedReport) => {
    try {
      await dbService.addSavedReport({
        name: `${rep.name} (Copy)`,
        description: rep.description,
        report_type: rep.report_type || 'custom',
        data_source: getReportDataSource(rep),
        configuration: rep.configuration || {
          dimension: getReportDimension(rep),
          measure: getReportMeasure(rep),
          visualType: getReportVisualType(rep),
          filters: getReportFilters(rep)
        },
        visibility: 'personal',
        is_favourite: false
      }, { forceLocal: !!rep.is_local });
      loadSavedReports();
      setToast({ type: 'success', message: `Report "${rep.name}" duplicated.` });
    } catch (e) {
      console.error('Failed to duplicate report', e);
      setToast({ type: 'error', message: 'Failed to duplicate report.' });
    }
  };

  const handleCopyDeepLink = (id: string) => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/dashboard/reports?reportId=${id}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        setToast({ type: 'success', message: 'Report deep link copied to clipboard.' });
      })
      .catch(() => {
        setToast({ type: 'error', message: 'Failed to copy deep link.' });
      });
  };

  const handleImportLocalReports = async () => {
    if (typeof window === 'undefined' || !user || !organization) return;
    const key = `${SAVED_REPORTS_KEY}_${user.id}_${organization.id}`;
    const stored = localStorage.getItem(key);
    if (!stored) {
      setToast({ type: 'info', message: 'No local browser templates found to import.' });
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let count = 0;
        for (const item of parsed) {
          await dbService.addSavedReport({
            name: item.name || 'Untitled Local Report',
            description: item.description || 'Imported browser report',
            report_type: 'custom',
            data_source: item.dataSource || 'Requirements',
            configuration: {
              dimension: item.dimension || 'category',
              measure: item.measure || 'count',
              visualType: item.visualType || 'bar',
              filters: item.filters || {}
            },
            visibility: 'personal',
            is_favourite: false
          });
          count++;
        }
        localStorage.removeItem(key);
        loadSavedReports();
        setToast({ type: 'success', message: `Successfully imported ${count} personal reports into account storage.` });
      } else {
        setToast({ type: 'info', message: 'No valid local reports found.' });
      }
    } catch (e) {
      console.error('Failed to import local reports', e);
      setToast({ type: 'error', message: 'Failed to import local reports.' });
    }
  };

  // ---------------- UPCOMING SCHEDULED RECORDS ----------------

  const upcomingReviews = useMemo(() => {
    const result = { total: 0, undated: 0, w7: 0, w30: 0, w60: 0, w90: 0, items: [] as Requirement[] };
    const today = new Date();

    filteredReqs.forEach(req => {
      if (req.next_due_date) {
        const dueDate = new Date(req.next_due_date);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / DAY_MS);
        if (diffDays >= 0) {
          result.total += 1;
          result.items.push(req);
          if (diffDays <= 7) result.w7 += 1;
          else if (diffDays <= 30) result.w30 += 1;
          else if (diffDays <= 60) result.w60 += 1;
          else if (diffDays <= 90) result.w90 += 1;
        }
      } else {
        result.undated += 1;
      }
    });
    return result;
  }, [filteredReqs]);

  const upcomingEvidenceExpiries = useMemo(() => {
    const result = { total: 0, undated: 0, w7: 0, w30: 0, w60: 0, w90: 0 };
    const today = new Date();

    filteredDocs.forEach(doc => {
      if (doc.expiry_date) {
        const expDate = new Date(doc.expiry_date);
        const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / DAY_MS);
        if (diffDays >= 0) {
          result.total += 1;
          if (diffDays <= 7) result.w7 += 1;
          else if (diffDays <= 30) result.w30 += 1;
          else if (diffDays <= 60) result.w60 += 1;
          else if (diffDays <= 90) result.w90 += 1;
        }
      } else {
        result.undated += 1;
      }
    });
    return result;
  }, [filteredDocs]);

  const upcomingTrainingRenewals = useMemo(() => {
    const result = { total: 0, undated: 0, w7: 0, w30: 0, w60: 0, w90: 0 };
    const today = new Date();

    filteredCompetencyRecords.forEach(rec => {
      if (calculateCompetencyStatus(rec) === 'Not Required') return;
      if (rec.expiry_date) {
        const expDate = new Date(rec.expiry_date);
        const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / DAY_MS);
        if (diffDays >= 0) {
          result.total += 1;
          if (diffDays <= 7) result.w7 += 1;
          else if (diffDays <= 30) result.w30 += 1;
          else if (diffDays <= 60) result.w60 += 1;
          else if (diffDays <= 90) result.w90 += 1;
        }
      } else {
        result.undated += 1;
      }
    });
    return result;
  }, [filteredCompetencyRecords]);

  // Data Quality Metrics
  const dataQualityReport = useMemo(() => {
    const totalDocs = filteredDocs.length;
    if (totalDocs === 0) return { missingDatesPercent: 0, duplicateHashesCount: 0 };

    const missingDates = filteredDocs.filter(d => !d.expiry_date && !d.review_date).length;
    const fileHashes = new Map<string, number>();
    filteredDocs.forEach(d => {
      if (d.file_hash) {
        fileHashes.set(d.file_hash, (fileHashes.get(d.file_hash) || 0) + 1);
      }
    });

    let duplicateHashes = 0;
    fileHashes.forEach(count => {
      if (count > 1) duplicateHashes += (count - 1);
    });

    return {
      missingDatesPercent: Math.round((missingDates / totalDocs) * 100),
      duplicateHashesCount: duplicateHashes
    };
  }, [filteredDocs]);

  // Administrative / Activity Audit logs
  const adminEventsBreakdown = useMemo(() => {
    const stats = { critical: 0, warning: 0, info: 0 };
    auditTrailEvents.forEach(e => {
      if (e.severity === 'critical') stats.critical += 1;
      else if (e.severity === 'warning') stats.warning += 1;
      else stats.info += 1;
    });
    return stats;
  }, [auditTrailEvents]);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
            <Building2 className="w-3.5 h-3.5" /> {organization?.name || 'Workspace'}
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-1" id="reports-heading">Reports</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Interactive readiness, evidence, competency, and operational reporting across your workspace.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="text-[10px] text-muted-foreground font-bold px-2 py-1 bg-muted/50 rounded-lg border border-border/40">
            Updated: <span className="text-foreground">{freshnessTime}</span>
          </div>
          <button
            onClick={handleRefreshData}
            title="Refresh Data"
            className="p-2 bg-card hover:bg-muted border border-border rounded-lg text-muted-foreground hover:text-foreground cursor-pointer transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowGlossary(true)}
            className="px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-lg border border-border flex items-center gap-1.5 cursor-pointer transition-all print:hidden"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-650 dark:text-indigo-400" /> Metrics Glossary
          </button>
          <button
            onClick={() => handlePrintReport(activeTab.toUpperCase(), 'active-report-view')}
            className="px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-lg border border-border flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Print / Save as PDF
          </button>
          <button
            onClick={() => {
              setBuilderSource('Requirements');
              setActiveTab('builder');
            }}
            className="px-3.5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-md shadow-indigo-600/10 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> New Custom Report
          </button>
        </div>
      </div>

      {/* Filter Options Bar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowFilters(!showFilters)}>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-650 dark:text-indigo-400" />
            <span className="text-xs font-bold text-foreground">Global Report Filters</span>
            {(startDate || endDate || selectedCategory !== 'All' || selectedStatus !== 'All' || selectedOwner !== 'All' || selectedRisk !== 'All' || includeInactive || includeArchived || includeDeactivated) && (
              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-[9px] font-extrabold rounded-full">
                Active
              </span>
            )}
          </div>
          <button className="text-muted-foreground hover:text-foreground">
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 border-t border-border/40 text-xs animate-in fade-in duration-200">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Created date start</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-2 py-1.5 bg-muted rounded-lg border border-border/60 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Created date end</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-2 py-1.5 bg-muted rounded-lg border border-border/60 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Requirement / evidence category</label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full px-2 py-1.5 bg-muted rounded-lg border border-border/60 outline-none font-medium"
              >
                <option value="All">All Categories</option>
                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Requirement / action owner</label>
              <select
                value={selectedOwner}
                onChange={e => setSelectedOwner(e.target.value)}
                className="w-full px-2 py-1.5 bg-muted rounded-lg border border-border/60 outline-none font-medium"
              >
                <option value="All">All Users</option>
                {uniqueOwners.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Requirement RAG status</label>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full px-2 py-1.5 bg-muted rounded-lg border border-border/60 outline-none font-medium"
              >
                <option value="All">All Statuses</option>
                <option value="GREEN">Green (Current)</option>
                <option value="AMBER">Amber (Warning)</option>
                <option value="RED">Red (Overdue/Gap)</option>
                <option value="GREY">Grey (Excluded)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Requirement risk level</label>
              <select
                value={selectedRisk}
                onChange={e => setSelectedRisk(e.target.value)}
                className="w-full px-2 py-1.5 bg-muted rounded-lg border border-border/60 outline-none font-medium"
              >
                <option value="All">All Risks</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-4 col-span-2 md:col-span-3">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer font-semibold select-none">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={e => setIncludeInactive(e.target.checked)}
                  className="accent-indigo-650 rounded"
                />
                Include Inactive Staff
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer font-semibold select-none">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={e => setIncludeArchived(e.target.checked)}
                  className="accent-indigo-650 rounded"
                />
                Include Archived Reqs
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer font-semibold select-none">
                <input
                  type="checkbox"
                  checked={includeDeactivated}
                  onChange={e => setIncludeDeactivated(e.target.checked)}
                  className="accent-indigo-650 rounded"
                />
                Include Deactivated Reqs
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer font-bold select-none text-indigo-600 dark:text-indigo-400">
                <input
                  type="checkbox"
                  checked={comparePeriod}
                  onChange={e => setComparePeriod(e.target.checked)}
                  className="accent-indigo-650 rounded"
                />
                Compare Periods
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2 col-span-2 md:col-span-1 lg:col-span-3">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Primary Report Tabs List */}
      <div className="flex border-b border-border overflow-x-auto no-scrollbar gap-1 pt-1">
        {[
          { id: 'executive', name: 'Executive Overview', icon: Activity },
          { id: 'requirements', name: 'Requirements & Readiness', icon: ShieldCheck },
          { id: 'evidence', name: 'Evidence Vault', icon: FileText },
          { id: 'competencies', name: 'Competencies & People', icon: Briefcase },
          { id: 'actions', name: 'Actions Registry', icon: FileSpreadsheet },
          { id: 'audits', name: 'Audits & packs', icon: FolderArchive },
          { id: 'locations-assets', name: 'Locations & Assets', icon: Building2 },
          ...(isOwnerOrAdmin ? [{ id: 'administration', name: 'Activity & Admin', icon: Settings }] : []),
          ...(isOwnerOrAdmin ? [{ id: 'history', name: 'Report Audit History', icon: History }] : []),
          { id: 'builder', name: 'Report Builder', icon: SlidersHorizontal },
          { id: 'saved', name: 'Saved Reports Catalogue', icon: Bookmark }
        ].map(tab => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-3 text-xs font-bold shrink-0 border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
                selected
                  ? 'border-indigo-650 text-indigo-650 dark:text-indigo-400 dark:border-indigo-400 bg-indigo-500/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Main Active Report Panel View */}
      <div id="active-report-view" className="space-y-6">

        {/* Tab 1: Executive Overview */}
        {activeTab === 'executive' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div
                onClick={() => handleDrillDown('Requirements')}
                title="Workspace Overall Readiness&#10;Basis: Average score of assessed active compliance obligations (Green=100%, Amber=50%, Red=0%).&#10;Exclusions: Excludes unassessed (GREY) requirements.&#10;Missing Data: N/A counts."
                className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-xs cursor-pointer hover:bg-muted/30 transition-all group"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                    Workspace Overall Readiness
                    <span className="text-indigo-500 font-extrabold text-[9px] group-hover:underline">ⓘ</span>
                  </span>
                  <span className="text-3xl font-black text-foreground">{readinessScore}%</span>
                </div>
                <div className="relative w-12 h-12">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="hsl(var(--border))" strokeWidth="2" opacity="0.3" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="hsl(var(--indigo-600))"
                      strokeWidth="2.5"
                      strokeDasharray={`${readinessScore} 100`}
                    />
                  </svg>
                </div>
              </div>

              <div
                onClick={() => handleDrillDown('Requirements')}
                title="Framework Requirements&#10;Basis: Total count of active framework compliance obligations.&#10;Exclusions: Archived, deactivated, or deleted requirements are excluded."
                className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-xs cursor-pointer hover:bg-muted/30 transition-all group"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                    Requirements
                    <span className="text-indigo-500 font-extrabold text-[9px] group-hover:underline">ⓘ</span>
                  </span>
                  <span className="text-3xl font-black text-foreground">{filteredReqs.length}</span>
                </div>
                <span className="p-2.5 bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </span>
              </div>

              <div
                onClick={() => handleDrillDown('Evidence')}
                title="Evidence Files&#10;Basis: Active verification documents uploaded.&#10;Exclusions: Excludes permanently deleted files.&#10;Date Window: Active/Expiring status limits apply."
                className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-xs cursor-pointer hover:bg-muted/30 transition-all group"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                    Evidence Files
                    <span className="text-indigo-500 font-extrabold text-[9px] group-hover:underline">ⓘ</span>
                  </span>
                  <span className="text-3xl font-black text-foreground">{filteredDocs.length}{renderComparisonBadge(comparisonData?.docs)}</span>
                </div>
                <span className="p-2.5 bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </span>
              </div>

              <div
                onClick={() => handleDrillDown('Actions', { status: 'Open' })}
                title="Open Actions&#10;Basis: Count of corrective actions with status 'Open' or 'In Progress'.&#10;Exclusions: Cancelled or completed items."
                className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-xs cursor-pointer hover:bg-muted/30 transition-all group"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                    Open Actions
                    <span className="text-indigo-500 font-extrabold text-[9px] group-hover:underline">ⓘ</span>
                  </span>
                  <span className="text-3xl font-black text-foreground">{filteredActions.filter(a => a.status !== 'Complete' && a.status !== 'Cancelled').length}{renderComparisonBadge(comparisonData?.actionsOpen)}</span>
                </div>
                <span className="p-2.5 bg-rose-500/10 text-rose-650 dark:text-rose-400 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Card 1: RAG Distribution */}
              <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Requirements RAG Distribution</h3>
                {renderSVDonut([
                  { value: filteredReadinessRequirements.filter(r => r.status === 'GREEN').length, color: '#10b981', label: 'Green' },
                  { value: filteredReadinessRequirements.filter(r => r.status === 'AMBER').length, color: '#f59e0b', label: 'Due Soon' },
                  { value: filteredReadinessRequirements.filter(r => r.status === 'RED').length, color: '#ef4444', label: 'Overdue / Gap' },
                  { value: filteredReadinessRequirements.filter(r => r.status === 'GREY').length, color: '#71717a', label: 'Excluded' }
                ], 'Requirements', 'rag_distribution')}
              </div>

              {/* Card 2: Evidence upload activity */}
              <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Evidence Upload Activity</h3>
                <p className="text-[10px] text-muted-foreground">Actual document uploads by month. This is activity, not a historical readiness score.</p>
                <div className="pt-2">
                  {renderSVGSparkline(documentUploadTrend.points, documentUploadTrend.labels, undefined, undefined, 'Evidence', 'evidence_uploads')}
                </div>
              </div>

              {/* Card 3: Upcoming obligations forecast */}
              <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Upcoming Obligations Forecast</h3>
                <p className="text-[10px] text-muted-foreground">Exclusive windows; overdue records are not included.</p>
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-center p-2.5 bg-muted/20 rounded-xl border border-border/40 transition-all">
                    <span className="font-bold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-indigo-650 dark:text-indigo-400" /> 0-7 Days</span>
                    <span className="font-extrabold text-foreground">{upcomingReviews.w7 + upcomingEvidenceExpiries.w7 + upcomingTrainingRenewals.w7} items</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-muted/20 rounded-xl border border-border/40 transition-all">
                    <span className="font-bold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-indigo-650 dark:text-indigo-400" /> 8-30 Days</span>
                    <span className="font-extrabold text-foreground">{upcomingReviews.w30 + upcomingEvidenceExpiries.w30 + upcomingTrainingRenewals.w30} items</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-muted/20 rounded-xl border border-border/40 transition-all">
                    <span className="font-bold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-indigo-650 dark:text-indigo-400" /> 31-60 Days</span>
                    <span className="font-extrabold text-foreground">{upcomingReviews.w60 + upcomingEvidenceExpiries.w60 + upcomingTrainingRenewals.w60} items</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-muted/20 rounded-xl border border-border/40 transition-all">
                    <span className="font-bold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-indigo-650 dark:text-indigo-400" /> 61-90 Days</span>
                    <span className="font-extrabold text-foreground">{upcomingReviews.w90 + upcomingEvidenceExpiries.w90 + upcomingTrainingRenewals.w90} items</span>
                  </div>
                  <div className="flex justify-between items-center px-2.5 text-[10px] text-muted-foreground">
                    <span>Records without the relevant due/expiry date</span>
                    <span className="font-bold">{upcomingReviews.undated + upcomingEvidenceExpiries.undated + upcomingTrainingRenewals.undated}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent audit logs are restricted to Owner/Admin roles. */}
            {isOwnerOrAdmin && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Recent Compliance Logs</h3>
                <Link href="/dashboard/audit-trail" className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                  View full register
                </Link>
              </div>
              <div className="border border-border/70 rounded-xl overflow-hidden divide-y divide-border/60 text-xs">
                {auditTrailEvents.slice(0, 5).map(e => (
                  <div key={e.id} className="p-3 flex items-start justify-between gap-4 hover:bg-muted/20">
                    <div className="min-w-0">
                      <span className="font-bold block truncate text-foreground leading-normal">{e.description}</span>
                      <span className="text-[9px] text-muted-foreground block mt-0.5">{new Date(e.created_at).toLocaleString()} | Actor: {e.actor_name || 'System'}</span>
                    </div>
                    <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase border shrink-0 ${
                      e.severity === 'critical' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' :
                      e.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                      'bg-indigo-500/10 border-indigo-500/20 text-indigo-600'
                    }`}>
                      {e.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>
        )}

        {/* Tab 2: Requirements & Readiness */}
        {activeTab === 'requirements' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Readiness by Category</h3>
                {renderHorizontalBarList(
                  uniqueCategories.map(cat => {
                    const catReqs = filteredReadinessRequirements.filter(r => r.requirement.category === cat);
                    const compliant = catReqs.filter(r => r.status === 'GREEN').length;
                    return {
                      label: cat,
                      count: compliant,
                      total: catReqs.length,
                      colorClass: 'bg-indigo-600'
                    };
                  }).filter(item => item.total > 0),
                  'Requirements'
                )}
              </div>

              <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">High Risk Requirements Needing Attention</h3>
                  <button
                    onClick={() => {
                      const csvRows = attentionRequirements.map(item => [
                        item.requirement.title,
                        item.requirement.category,
                        item.requirement.risk_level,
                        item.status
                      ]);
                      handleExportCSV('High Risk Requirements', ['Requirement Title', 'Category', 'Risk Level', 'RAG Status'], csvRows);
                    }}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Export Table"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                <div className="border border-border/80 rounded-xl overflow-hidden divide-y divide-border/60 text-xs">
                  {attentionRequirements.slice(0, 5).map(item => (
                    <div key={item.requirement.id} className="p-3 flex items-start justify-between gap-3 hover:bg-muted/30">
                      <div className="min-w-0">
                        <Link href={`/dashboard/requirements?id=${item.requirement.id}`} className="font-bold block truncate hover:underline text-indigo-600 dark:text-indigo-400">
                          {item.requirement.title}
                        </Link>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">Category: {item.requirement.category} | Owner: {item.requirement.owner || 'Unassigned'}</span>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase border shrink-0 ${
                        item.status === 'AMBER' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                        'bg-rose-500/10 border-rose-500/20 text-rose-600'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                  {attentionRequirements.length === 0 && (
                    <div className="p-6 text-center text-xs text-muted-foreground">No high or critical risk requirement issues.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Evidence */}
        {activeTab === 'evidence' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div onClick={() => handleDrillDown('Evidence')} className="bg-card border border-border p-4 rounded-xl text-center space-y-1 cursor-pointer hover:bg-muted/30 transition-all">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Total Evidence Documents</span>
                <span className="text-3xl font-black text-foreground">{filteredDocs.length}{renderComparisonBadge(comparisonData?.docs)}</span>
              </div>
              <div onClick={() => handleDrillDown('Evidence', { status: 'Unclassified' })} className="bg-card border border-border p-4 rounded-xl text-center space-y-1 cursor-pointer hover:bg-muted/30 transition-all">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Missing Dates / Metadata Expiry</span>
                <span className="text-3xl font-black text-rose-500">{dataQualityReport.missingDatesPercent}%</span>
              </div>
              <div onClick={() => handleDrillDown('Evidence')} className="bg-card border border-border p-4 rounded-xl text-center space-y-1 cursor-pointer hover:bg-muted/30 transition-all">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Duplicate File Hashes Detected</span>
                <span className="text-3xl font-black text-amber-500">{dataQualityReport.duplicateHashesCount}</span>
              </div>
              <div onClick={() => handleDrillDown('Evidence', { status: 'Active' })} className="bg-card border border-border p-4 rounded-xl text-center space-y-1 cursor-pointer hover:bg-muted/30 transition-all">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Linked to Requirements</span>
                <span className="text-3xl font-black text-emerald-500">{evidenceLinkMetrics.linked}</span>
              </div>
              <div onClick={() => handleDrillDown('Evidence', { status: 'Unclassified' })} className="bg-card border border-border p-4 rounded-xl text-center space-y-1 cursor-pointer hover:bg-muted/30 transition-all">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Not Linked to Requirements</span>
                <span className="text-3xl font-black text-amber-500">{evidenceLinkMetrics.unlinked}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Evidence by Expiry Status</h3>
                {renderSVDonut([
                  { value: filteredDocs.filter(d => d.status === 'Active').length, color: '#10b981', label: 'Active / Current' },
                  { value: filteredDocs.filter(d => d.status === 'Expiring Soon').length, color: '#f59e0b', label: 'Expiring Soon' },
                  { value: filteredDocs.filter(d => d.status === 'Expired').length, color: '#ef4444', label: 'Expired' },
                  { value: filteredDocs.filter(d => d.status === 'Unclassified').length, color: '#71717a', label: 'Unclassified' }
                ], 'Evidence', 'evidence_status')}
              </div>

              <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Document Uploads Trend</h3>
                <p className="text-[10px] text-muted-foreground">Actual evidence documents uploaded in each month.</p>
                <div className="pt-2">
                  {renderSVGSparkline(documentUploadTrend.points, documentUploadTrend.labels, undefined, undefined, 'Evidence', 'evidence_trend')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Competencies & People */}
        {activeTab === 'competencies' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Roster Competency Status</h3>
                {renderHorizontalBarList(
                  filteredPeople.map(person => {
                    const records = filteredCompetencyRecords.filter(r => r.person_id === person.id);
                    const valid = records.filter(r => calculateCompetencyStatus(r) === 'Valid').length;
                    return {
                      label: person.display_name,
                      count: valid,
                      total: records.length,
                      colorClass: 'bg-emerald-500',
                      id: person.id
                    };
                  }),
                  'Competencies'
                )}
                {filteredPeople.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-6">No personnel records found.</div>
                )}
              </div>

              <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Competency Gaps by Risk Level</h3>
                <div className="space-y-3 text-xs">
                  <div onClick={() => handleDrillDown('Competencies', { status: 'Expired' })} className="flex justify-between items-center p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-xl cursor-pointer hover:bg-rose-500/20 transition-all">
                    <span className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> High Risk Competency Gaps</span>
                    <span className="font-extrabold">{filteredCompetencySummary.expired + filteredCompetencySummary.missing} records</span>
                  </div>
                  <div onClick={() => handleDrillDown('Competencies', { status: 'Expiring Soon' })} className="flex justify-between items-center p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl cursor-pointer hover:bg-amber-500/20 transition-all">
                    <span className="font-bold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Expiring Soon / Due Gaps</span>
                    <span className="font-extrabold">{filteredCompetencySummary.expiringSoon} records</span>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-xl border border-border/40 space-y-1.5 text-muted-foreground">
                    <div className="flex justify-between items-center font-bold">
                      <span>Total Assigned Competency Types:</span>
                      <span className="text-foreground">{activeCompetencyTypeIds.size}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold">
                      <span>Roster Compliance score:</span>
                      <span className="text-foreground">{filteredCompetencySummary.compliancePercent}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Actions Registry */}
        {activeTab === 'actions' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div onClick={() => handleDrillDown('Actions', { status: 'Open' })} className="bg-card border border-border p-4 rounded-xl text-center space-y-1 cursor-pointer hover:bg-muted/30 transition-all">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Open Actions</span>
                <span className="text-3xl font-black text-foreground">{actionMetrics.open}{renderComparisonBadge(comparisonData?.actionsOpen)}</span>
              </div>
              <div onClick={() => handleDrillDown('Actions', { status: 'Open' })} className="bg-card border border-border p-4 rounded-xl text-center space-y-1 cursor-pointer hover:bg-muted/30 transition-all">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Overdue Open Actions</span>
                <span className="text-3xl font-black text-rose-500">{actionMetrics.overdue}</span>
              </div>
              <div onClick={() => handleDrillDown('Actions', { status: 'Complete' })} className="bg-card border border-border p-4 rounded-xl text-center space-y-1 cursor-pointer hover:bg-muted/30 transition-all">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Completed Actions</span>
                <span className="text-3xl font-black text-emerald-500">{actionMetrics.completed}{renderComparisonBadge(comparisonData?.actionsComp)}</span>
              </div>
              <div onClick={() => handleDrillDown('Actions')} className="bg-card border border-border p-4 rounded-xl text-center space-y-1 cursor-pointer hover:bg-muted/30 transition-all">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Completion Rate</span>
                <span className="text-3xl font-black text-indigo-500">{actionMetrics.completionRate}%</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Corrective Actions Status</h3>
                {renderSVDonut([
                  { value: filteredActions.filter(a => a.status === 'Complete').length, color: '#10b981', label: 'Complete' },
                  { value: filteredActions.filter(a => a.status === 'In Progress').length, color: '#f59e0b', label: 'In Progress' },
                  { value: filteredActions.filter(a => a.status === 'Open').length, color: '#ef4444', label: 'Open' },
                  { value: filteredActions.filter(a => a.status === 'Cancelled').length, color: '#71717a', label: 'Cancelled' }
                ], 'Actions', 'actions_status')}
              </div>

              <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Action Assignments Workload</h3>
                {renderHorizontalBarList(
                  uniqueOwners.map(owner => {
                    const ownerActions = filteredActions.filter(a => a.owner === owner);
                    const completed = ownerActions.filter(a => a.status === 'Complete').length;
                    return {
                      label: owner,
                      count: completed,
                      total: ownerActions.length,
                      colorClass: 'bg-indigo-600'
                    };
                  }),
                  'Actions'
                )}
                {uniqueOwners.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-6">No action items assigned to users yet.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Audits & Packs */}
        {activeTab === 'audits' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-card border border-border p-4 rounded-xl text-center space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Audit Packs Generated</span>
                <span className="text-3xl font-black text-foreground">
                  {auditPacks.length}
                  {renderComparisonBadge(comparisonData?.packs)}
                </span>
              </div>
              {isOwnerOrAdmin ? (
                <div className="bg-card border border-border p-4 rounded-xl text-center space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Audit Trail Activity</span>
                  <span className="text-3xl font-black text-foreground">
                    {auditTrailEvents.length}
                    {renderComparisonBadge(comparisonData?.audits)}
                  </span>
                </div>
              ) : (
                <div className="bg-card border border-border p-4 rounded-xl text-center space-y-1 opacity-70">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Audit Trail Activity</span>
                  <span className="text-sm font-extrabold text-muted-foreground flex items-center justify-center gap-1 mt-2">
                    <Lock className="w-3.5 h-3.5" /> Restricted
                  </span>
                </div>
              )}
              <div className="bg-card border border-border p-4 rounded-xl text-center space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Active / Ready Packs</span>
                <span className="text-3xl font-black text-emerald-500">
                  {auditPacks.filter(p => p.status === 'Ready').length}
                </span>
              </div>
              <div className="bg-card border border-border p-4 rounded-xl text-center space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Draft Packs</span>
                <span className="text-3xl font-black text-amber-500">
                  {auditPacks.filter(p => p.status === 'Draft').length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Audit Packs Status</h3>
                {renderSVDonut([
                  { value: auditPacks.filter(p => p.status === 'Ready').length, color: '#10b981', label: 'Ready' },
                  { value: auditPacks.filter(p => p.status === 'Draft').length, color: '#f59e0b', label: 'Draft' },
                  { value: auditPacks.filter(p => p.status === 'Sent').length, color: '#4f46e5', label: 'Sent' },
                  { value: auditPacks.filter(p => p.status === 'Archived').length, color: '#71717a', label: 'Archived' }
                ], 'Audits', 'audits_status')}
              </div>

              {isOwnerOrAdmin ? (
              <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Audit Activity Event Volumes</h3>
                <p className="text-[10px] text-muted-foreground">Historical volume of logged events by compliance categories.</p>
                <div className="space-y-2.5 text-xs">
                  {['Evidence', 'Requirements', 'Actions', 'Competency', 'Audit Packs'].map(cat => {
                    const count = auditTrailEvents.filter(e => e.action_category === cat).length;
                    return (
                      <div key={cat} className="flex justify-between items-center p-2 bg-muted/40 border border-border/40 rounded-lg">
                        <span className="font-bold">{cat} Operations</span>
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{count} events</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              ) : (
                <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-center text-center">
                  <p className="text-xs text-muted-foreground">Audit event analytics are restricted to Owner and Admin roles. Audit pack status remains available.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 7: Locations & Assets */}
        {activeTab === 'locations-assets' && (
          <div className="bg-card border border-border p-8 rounded-2xl shadow-xs space-y-4 max-w-xl mx-auto text-center">
            <div className="w-14 h-14 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-black text-foreground">Locations & Assets Reporting Not Configured</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Vygilence&apos;s active database schema does not yet support dedicated <strong className="text-foreground">Locations</strong> or <strong className="text-foreground">Assets</strong> tables.
              </p>
            </div>
            <div className="bg-muted/45 border border-border/80 rounded-xl p-4 text-left text-[11px] space-y-2.5 leading-relaxed text-muted-foreground">
              <span className="font-bold text-foreground block text-xs">Recommended Schema Updates:</span>
              <div>
                <strong className="text-foreground">1. Locations Table</strong>: Define fields `id`, `name`, `address`, `manager_profile_id`, and `risk_rating` to map requirements to geographical nodes.
              </div>
              <div>
                <strong className="text-foreground">2. Assets Table</strong>: Define fields `id`, `name`, `type` (Vehicle/Facility/Gear), `last_inspected_at`, and `next_calibration_due` to track hardware evidence criteria.
              </div>
            </div>
          </div>
        )}

        {/* Tab 8: Activity & Administration */}
        {activeTab === 'administration' && (
          <div className="space-y-6">
            {!isOwnerOrAdmin ? (
              <div className="p-8 text-center text-xs text-rose-500 border border-rose-500/25 bg-rose-500/5 rounded-xl">
                Unauthorized access. This administrative reporting log is restricted to Owner and Admin profiles only.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-card border border-border p-4 rounded-xl text-center space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Critical Administration Events</span>
                    <span className="text-3xl font-black text-rose-500">{adminEventsBreakdown.critical}</span>
                  </div>
                  <div className="bg-card border border-border p-4 rounded-xl text-center space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Warnings & Expirations</span>
                    <span className="text-3xl font-black text-amber-500">{adminEventsBreakdown.warning}</span>
                  </div>
                  <div className="bg-card border border-border p-4 rounded-xl text-center space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Total Action Operations Logs</span>
                    <span className="text-3xl font-black text-indigo-500">{auditTrailEvents.length}</span>
                  </div>
                </div>

                <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Administrative Activities Timeline</h3>
                  <div className="border border-border/80 rounded-xl overflow-hidden divide-y divide-border/60 text-xs">
                    {auditTrailEvents.slice(0, 10).map(e => (
                      <div key={e.id} className="p-3 flex items-start justify-between gap-4 hover:bg-muted/10">
                        <div className="min-w-0">
                          <span className="font-bold block truncate text-foreground">{e.description}</span>
                          <span className="text-[9px] text-muted-foreground block mt-0.5">{new Date(e.created_at).toLocaleString()} | Actor: {e.actor_name || 'System'} ({e.actor_role})</span>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase border shrink-0 ${
                          e.severity === 'critical' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' :
                          e.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                          'bg-indigo-500/10 border-indigo-500/20 text-indigo-600'
                        }`}>
                          {e.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 9: Saved Reports */}
        {activeTab === 'saved' && (() => {
          const mappedPrebuilt: CatalogueReport[] = PREBUILT_REPORTS.map(r => ({
            kind: 'prebuilt',
            id: r.id,
            name: r.name,
            description: r.description,
            category: r.category,
            sourceModule: r.sourceModule,
            filters: r.filters,
            exports: r.exports,
            permission: r.permission,
            tab: r.tab as TabType
          }));

          const mappedSaved: CatalogueReport[] = savedReports.map(r => ({
            kind: 'saved',
            id: r.id,
            name: r.name,
            description: r.description || 'No description provided.',
            category: 'Custom Builder',
            sourceModule: getReportDataSource(r),
            filters: 'Saved Configuration',
            exports: 'CSV',
            permission: r.is_local ? 'Personal Browser Report' : (r.visibility === 'organisation' ? 'Organisation Members' : 'Personal Account (Private)'),
            tab: 'builder',
            savedReport: r
          }));

          const allCatalogueReports = [...mappedPrebuilt, ...mappedSaved];

          const filteredPrebuilt = allCatalogueReports.filter(rep => {
            if (rep.kind !== 'prebuilt') return false;
            if (rep.sourceModule === 'Audit Trail' && !isOwnerOrAdmin) return false;
            const nameMatch = rep.name.toLowerCase().includes(savedSearchQuery.toLowerCase());
            const descMatch = rep.description.toLowerCase().includes(savedSearchQuery.toLowerCase());
            const matchesSearch = nameMatch || descMatch;
            const matchesFav = !savedShowOnlyFavs || favReportIds.includes(rep.id);
            const matchesSource = savedSourceFilter === 'all' || rep.sourceModule === savedSourceFilter;
            return matchesSearch && matchesFav && matchesSource;
          }) as PrebuiltReportDefinition[];

          const filteredCustom = allCatalogueReports.filter(rep => {
            if (rep.kind !== 'saved') return false;
            const sr = rep.savedReport;
            const dataSource = getReportDataSource(sr);
            if (dataSource === 'Audit Trail' && !isOwnerOrAdmin) return false;
            const nameMatch = rep.name.toLowerCase().includes(savedSearchQuery.toLowerCase());
            const descMatch = rep.description.toLowerCase().includes(savedSearchQuery.toLowerCase());
            const matchesSearch = nameMatch || descMatch;

            let matchesVisibility = true;
            if (savedVisibilityFilter === 'personal') {
              matchesVisibility = sr.visibility === 'personal' || !!sr.is_local;
            } else if (savedVisibilityFilter === 'organisation') {
              matchesVisibility = sr.visibility === 'organisation' && !sr.is_local;
            }

            const matchesFav = !savedShowOnlyFavs || favReportIds.includes(rep.id);
            const matchesSource = savedSourceFilter === 'all' || dataSource === savedSourceFilter;
            return matchesSearch && matchesVisibility && matchesFav && matchesSource;
          }) as SavedReportWrapper[];

          const favouriteReports = allCatalogueReports.filter(r => favReportIds.includes(r.id))
            .filter(rep => {
              const src = rep.kind === 'prebuilt' ? rep.sourceModule : getReportDataSource(rep.savedReport);
              return isOwnerOrAdmin || src !== 'Audit Trail';
            });

          return (
            <div className="space-y-6">
              {/* Calm deferred organization-shared banner */}
              {!isSharedTableAvailable && (
                <div className="bg-amber-500/10 border border-amber-500/25 p-4 rounded-xl flex items-center gap-3 text-xs">
                  <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-amber-700 dark:text-amber-450">Organisation-shared reports are not enabled in this environment yet.</h4>
                    <p className="text-muted-foreground mt-0.5 font-medium">
                      You can build and save <strong className="text-foreground">Personal Browser Reports</strong>, which are stored locally in your browser workspace.
                    </p>
                  </div>
                </div>
              )}

              {/* Favourites Section (Pinned) */}
              {favouriteReports.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-amber-505 fill-amber-500 text-amber-500" /> Pinned Favourites
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favouriteReports.map(rep => {
                      const isPrebuilt = isPrebuiltReport(rep);
                      const dataSource = isPrebuilt ? rep.sourceModule : getReportDataSource(rep.savedReport);
                      const isOrg = !isPrebuilt && rep.savedReport.visibility === 'organisation' && !rep.savedReport.is_local;
                      const isLocal = !isPrebuilt && !!rep.savedReport.is_local;

                      const tagLabel = isPrebuilt
                        ? 'Vygilence Prebuilt'
                        : (isOrg ? 'Organisation Report' : (isLocal ? 'Personal Browser Report' : 'Personal Account Report'));

                      const tagStyle = isPrebuilt
                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                        : (isOrg
                            ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-650 dark:text-indigo-400 font-extrabold'
                            : (isLocal
                                ? 'bg-zinc-500/10 border-zinc-500/20 text-zinc-650 dark:text-zinc-400'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-650 dark:text-emerald-450'));

                      return (
                        <div key={rep.id} className="bg-card border border-border p-4 rounded-2xl flex flex-col justify-between shadow-xs hover:border-amber-500/30 transition-all">
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full border ${tagStyle}`}>
                                {tagLabel}
                              </span>
                              <button
                                onClick={() => handleToggleFavouriteReport(rep.id, true)}
                                className="p-1 text-amber-500 hover:text-muted-foreground transition-colors cursor-pointer"
                              >
                                <Bookmark className="w-4 h-4 fill-amber-500 text-amber-500" />
                              </button>
                            </div>
                            <h4 className="text-xs font-extrabold text-foreground">{rep.name}</h4>
                            <p className="text-[11px] text-muted-foreground leading-normal line-clamp-2">{rep.description}</p>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-3">
                            <button
                              onClick={() => {
                                if (isPrebuiltReport(rep)) {
                                  setActiveTab(rep.tab);
                                } else {
                                  const sr = rep.savedReport;
                                  const allowedSource = dataSource === 'Audit Trail' && !isOwnerOrAdmin ? 'Requirements' : dataSource;
                                  setBuilderSource(allowedSource);
                                  setBuilderDimension(allowedSource === dataSource ? getReportDimension(sr) : 'category');
                                  setBuilderMeasure(getReportMeasure(sr));
                                  setBuilderVisual(allowedSource === 'Requirements' ? getReportVisualType(sr) : getReportVisualType(sr) === 'pivot' ? 'table' : getReportVisualType(sr));
                                  const filters = getReportFilters(sr);
                                  setSelectedCategory(filters.category || 'All');
                                  setSelectedStatus(filters.status || 'All');
                                  setSelectedRisk(filters.risk || 'All');
                                  setActiveTab('builder');
                                }
                                recordView(rep.id, rep.name, isPrebuilt ? rep.category : 'Custom Builder', dataSource, isPrebuilt ? rep.tab : 'builder');
                              }}
                              className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-650 dark:text-indigo-300 font-extrabold text-[10px] rounded cursor-pointer"
                            >
                              Open
                            </button>
                            <span className="text-[9px] text-muted-foreground font-semibold">Source: {dataSource}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recently Viewed Section */}
              {recentViews.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Recently Viewed
                    </h3>
                    <button
                      onClick={handleClearRecents}
                      className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer font-semibold"
                    >
                      Clear History
                    </button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                    {recentViews.map(r => (
                      <div
                        key={r.id}
                        onClick={() => {
                          if (r.tab && r.tab !== 'builder') {
                            setActiveTab(r.tab as TabType);
                          } else {
                            dbService.getSavedReports().then(reports => {
                              const match = reports.find(item => item.id === r.id);
                              if (match) {
                                const dataSource = getReportDataSource(match);
                                const allowedSource = dataSource === 'Audit Trail' && !isOwnerOrAdmin ? 'Requirements' : dataSource;
                                setBuilderSource(allowedSource);
                                setBuilderDimension(allowedSource === dataSource ? getReportDimension(match) : 'category');
                                setBuilderMeasure(getReportMeasure(match));
                                setBuilderVisual(allowedSource === 'Requirements' ? getReportVisualType(match) : getReportVisualType(match) === 'pivot' ? 'table' : getReportVisualType(match));
                                const filters = getReportFilters(match);
                                setSelectedCategory(filters.category || 'All');
                                setSelectedStatus(filters.status || 'All');
                                setSelectedRisk(filters.risk || 'All');
                                setActiveTab('builder');
                              }
                            });
                          }
                        }}
                        className="bg-card border border-border p-3.5 rounded-xl min-w-[200px] max-w-[200px] shrink-0 space-y-1.5 cursor-pointer hover:border-indigo-500/30 transition-all text-xs"
                      >
                        <h4 className="font-extrabold text-foreground truncate">{r.name}</h4>
                        <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                          <span>{r.sourceModule}</span>
                          <span>{new Date(r.openedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Catalogue Enhancements Filters Bar */}
              <div className="bg-card border border-border p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between shadow-xs text-xs">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search saved reports..."
                      value={savedSearchQuery}
                      onChange={e => setSavedSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-muted rounded-xl border border-border outline-none text-xs text-foreground"
                    />
                  </div>

                  <select
                    value={savedVisibilityFilter}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'all' || val === 'personal' || val === 'organisation') {
                        setSavedVisibilityFilter(val);
                      }
                    }}
                    className="px-3 py-2 bg-muted rounded-xl border border-border outline-none font-semibold text-muted-foreground text-xs text-foreground"
                  >
                    <option value="all">All Visibilities</option>
                    <option value="personal">Personal browser/account reports</option>
                    <option value="organisation" disabled={!isSharedTableAvailable}>
                      Organisation reports {!isSharedTableAvailable ? '(Unavailable)' : ''}
                    </option>
                  </select>

                  <label className="flex items-center gap-1.5 font-semibold text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={savedShowOnlyFavs}
                      onChange={e => setSavedShowOnlyFavs(e.target.checked)}
                      className="rounded border-border text-indigo-650 focus:ring-0 cursor-pointer"
                    />
                    <span>Favourites only</span>
                  </label>
                </div>

                {/* Source tags */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Filter Source:</span>
                  {['all', 'Requirements', 'Evidence', 'Competencies', 'Actions', 'Audit Trail'].map(src => (
                    <button
                      key={src}
                      onClick={() => setSavedSourceFilter(src)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        savedSourceFilter === src
                          ? 'bg-indigo-550 border-indigo-550 text-white dark:bg-indigo-650'
                          : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {src === 'all' ? 'All' : src}
                    </button>
                  ))}
                </div>
              </div>

              {/* Combined Grid List */}
              <div className="space-y-6">
                {/* 1. Prebuilt Reports */}
                {filteredPrebuilt.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Vygilence Prebuilt Reports</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredPrebuilt.map(rep => {
                        const isFavourited = favReportIds.includes(rep.id);
                        return (
                          <div key={rep.id} className="bg-card border border-border p-5 rounded-2xl space-y-3 flex flex-col justify-between shadow-xs hover:border-indigo-550/20 transition-all animate-fade-in">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-full border bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                                  System Prebuilt Report
                                </span>
                                <button
                                  onClick={() => handleToggleFavouriteReport(rep.id, isFavourited)}
                                  className="p-1 text-muted-foreground hover:text-amber-500 transition-colors cursor-pointer"
                                  title={isFavourited ? "Remove from Favourites" : "Mark as Favourite"}
                                >
                                  <Bookmark className={`w-4 h-4 ${isFavourited ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`} />
                                </button>
                              </div>

                              <h3 className="text-sm font-extrabold text-foreground mt-1">{rep.name}</h3>
                              <p className="text-xs text-muted-foreground leading-normal">{rep.description}</p>

                              <div className="flex flex-wrap gap-1.5 pt-2 font-semibold">
                                <span className="px-2 py-0.5 bg-muted rounded text-[9px] text-muted-foreground">Category: {rep.category}</span>
                                <span className="px-2 py-0.5 bg-muted rounded text-[9px] text-muted-foreground">Source: {rep.sourceModule}</span>
                                <span className="px-2 py-0.5 bg-indigo-500/5 rounded text-[9px] text-indigo-600 dark:text-indigo-400">Filters: {rep.filters}</span>
                                <span className="px-2 py-0.5 bg-emerald-500/5 rounded text-[9px] text-emerald-600 dark:text-emerald-400">Exports: {rep.exports}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/40 mt-2">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setActiveTab(rep.tab as TabType);
                                    recordView(rep.id, rep.name, rep.category, rep.sourceModule, rep.tab);
                                  }}
                                  className="px-3 py-1.5 bg-indigo-500/10 text-indigo-650 dark:text-indigo-300 font-extrabold text-[11px] rounded-lg hover:bg-indigo-500/20 cursor-pointer"
                                >
                                  Open Report
                                </button>
                                <button
                                  onClick={() => handleDuplicatePrebuiltReport(rep)}
                                  className="p-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg border border-border cursor-pointer transition-all"
                                  title="Duplicate to Personal browser report"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                                <Lock className="w-3 h-3 text-muted-foreground/60" /> {rep.permission}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Custom Saved Reports */}
                {filteredCustom.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Personal & Shared Reports</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredCustom.map(rep => {
                        const sr = rep.savedReport;
                        const dataSource = getReportDataSource(sr);
                        const dimension = getReportDimension(sr);
                        const measure = getReportMeasure(sr);
                        const visualType = getReportVisualType(sr);
                        const filters = getReportFilters(sr);
                        const isOrg = !sr.is_local && sr.visibility === 'organisation';
                        const isLocal = !!sr.is_local;
                        const canManageReport = sr.owner_user_id === user?.id || isOwnerOrAdmin;
                        const isFavourited = favReportIds.includes(sr.id);

                        return (
                          <div key={sr.id} className="bg-card border border-border p-5 rounded-2xl space-y-3 flex flex-col justify-between shadow-xs hover:border-indigo-550/20 transition-all animate-fade-in">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full border ${
                                  isLocal ? 'bg-zinc-500/10 border-zinc-500/20 text-zinc-650 dark:text-zinc-400' : (isOrg ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-650 dark:text-indigo-400 font-extrabold' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-650 dark:text-emerald-450')
                                }`}>
                                  {isLocal ? 'Personal browser report' : (isOrg ? 'Organisation report' : 'Personal account report')}
                                </span>
                                <button
                                  onClick={() => handleToggleFavouriteReport(sr.id, isFavourited)}
                                  className="p-1 text-muted-foreground hover:text-amber-500 transition-colors cursor-pointer"
                                  title={isFavourited ? "Remove from Favourites" : "Mark as Favourite"}
                                >
                                  <Bookmark className={`w-4 h-4 ${isFavourited ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`} />
                                </button>
                              </div>

                              <h3 className="text-sm font-extrabold text-foreground mt-1">{sr.name}</h3>
                              <p className="text-xs text-muted-foreground leading-normal">{sr.description || 'No description provided.'}</p>

                              <div className="flex flex-wrap gap-2 pt-2 text-[10px] text-muted-foreground font-semibold">
                                <span>Source: {dataSource}</span>
                                <span>•</span>
                                <span>Dimension: {dimension}</span>
                                <span>•</span>
                                <span>Measure: {measure}</span>
                                <span>•</span>
                                <span>Visual: {visualType}</span>
                              </div>

                              <div className="text-[10px] text-muted-foreground pt-1 flex flex-wrap gap-2">
                                <span>Created by: <strong className="text-foreground">{sr.owner_profile?.full_name || (isLocal ? 'You (Local)' : 'You')}</strong></span>
                                <span>•</span>
                                <span>Modified: {new Date(sr.updated_at || sr.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/40 mt-2">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    const allowedSource = dataSource === 'Audit Trail' && !isOwnerOrAdmin ? 'Requirements' : dataSource;
                                    setBuilderSource(allowedSource);
                                    setBuilderDimension(allowedSource === dataSource ? dimension : 'category');
                                    setBuilderMeasure(measure);
                                    setBuilderVisual(allowedSource === 'Requirements' ? visualType : visualType === 'pivot' ? 'table' : visualType);
                                    setSelectedCategory(filters.category || 'All');
                                    setSelectedStatus(filters.status || 'All');
                                    setSelectedRisk(filters.risk || 'All');
                                    setActiveTab('builder');
                                    recordView(sr.id, sr.name, 'Custom Builder', dataSource, 'builder');
                                    setToast({ type: 'info', message: `Loaded report config: "${sr.name}"` });
                                  }}
                                  className="px-2.5 py-1.5 bg-indigo-500/10 text-indigo-650 dark:text-indigo-300 font-bold text-[11px] rounded-lg hover:bg-indigo-500/20 cursor-pointer"
                                >
                                  Open Builder
                                </button>
                                <button
                                  onClick={() => handleCopyDeepLink(sr.id)}
                                  className="p-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg border border-border cursor-pointer transition-all"
                                  title="Copy internal share link"
                                >
                                  <Link2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDuplicateReport(sr)}
                                  className="p-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg border border-border cursor-pointer transition-all"
                                  title="Duplicate configuration"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                {canManageReport && (
                                  <button
                                    onClick={() => handleRenameReport(sr)}
                                    className="p-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg border border-border cursor-pointer transition-all"
                                    title="Rename / Edit description"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  disabled
                                  className="p-1.5 bg-muted text-muted-foreground/40 rounded-lg border border-border cursor-not-allowed opacity-50"
                                  title="Scheduling not configured"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {canManageReport ? (
                                <button
                                  onClick={() => handleDeleteSavedReport(rep.id, rep.name)}
                                  className="px-2.5 py-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[11px] rounded-lg hover:bg-rose-500/20 cursor-pointer"
                                >
                                  Delete
                                </button>
                              ) : (
                                <span className="text-[10px] font-semibold text-muted-foreground">Read-only shared report</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Empty States */}
                {filteredPrebuilt.length === 0 && filteredCustom.length === 0 && (
                  <div className="p-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                    No reports match the selected search or filters in this catalogue.
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Tab 10: Report Audit History */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {!isOwnerOrAdmin ? (
              <div className="p-8 text-center text-xs text-rose-500 border border-rose-500/25 bg-rose-500/5 rounded-xl">
                Unauthorized access. This audit history log is restricted to Owner and Admin profiles only.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
                    <div>
                      <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Report Operation & Audit Logs</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Timeline of all spreadsheet exports, PDF printing, and report configuration updates.</p>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-bold px-2 py-0.5 bg-muted rounded-full">
                      Total: {auditTrailEvents.filter(e => e.action_type.startsWith('report_') || e.action_type.startsWith('saved_report_')).length} operations
                    </div>
                  </div>

                  <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
                    {auditTrailEvents
                      .filter(e => e.action_type.startsWith('report_') || e.action_type.startsWith('saved_report_'))
                      .map(event => {
                        const isExport = event.action_type.includes('export');
                        const isPrint = event.action_type.includes('print');

                        const Icon = isExport ? FileSpreadsheet : isPrint ? FileText : Bookmark;
                        const severityColor = event.severity === 'critical' ? 'text-rose-500 bg-rose-500/10' :
                                              event.severity === 'warning' ? 'text-amber-500 bg-amber-500/10' :
                                              'text-indigo-650 bg-indigo-500/10 dark:text-indigo-400';

                        return (
                          <div key={event.id} className="flex gap-3 text-xs items-start p-3 bg-muted/20 border border-border/40 rounded-xl hover:bg-muted/30 transition-all">
                            <div className={`p-2 rounded-lg ${severityColor} shrink-0`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="space-y-1 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-extrabold text-foreground">{event.description}</span>
                                <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {new Date(event.created_at).toLocaleString()}
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground flex flex-wrap gap-2 items-center">
                                <span>Actor: <strong className="text-foreground">{event.actor_name || event.actor_email || 'System'}</strong> ({event.actor_role || 'Member'})</span>
                                <span>•</span>
                                <span className="uppercase font-bold tracking-wider text-[8px] px-1.5 py-0.5 rounded bg-muted text-foreground">
                                  {event.action_type.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    {auditTrailEvents.filter(e => e.action_type.startsWith('report_') || e.action_type.startsWith('saved_report_')).length === 0 && (
                      <div className="text-center py-10 text-muted-foreground text-xs border border-dashed border-border rounded-xl">
                        No report generation, export, or saved templates logs recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 10: Custom Report Builder */}
        {activeTab === 'builder' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Configuration panel */}
              <div className="bg-card border border-border p-5 rounded-2xl space-y-4 shadow-sm text-xs">
                <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Configuration Builder</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-muted-foreground uppercase mb-1.5">Data Source</label>
                    <select
                      value={builderSource}
                      onChange={e => {
                        const source = e.target.value as BuilderSource;
                        setBuilderSource(source);
                        const caps = REPORT_CAPABILITIES[source];
                        if (caps) {
                          setBuilderDimension(caps.defaultDimension);
                          setBuilderMeasure(caps.defaultMeasure);
                          setBuilderVisual(caps.defaultVisual);
                        }
                      }}
                      className="w-full px-2.5 py-2 bg-muted rounded-xl border border-border/80 outline-none font-semibold text-foreground"
                    >
                      {Object.keys(REPORT_CAPABILITIES).map(key => {
                        const caps = REPORT_CAPABILITIES[key as BuilderSource];
                        if (caps.permissionRequirement === 'Owner/Admin only' && !isOwnerOrAdmin) return null;
                        return (
                          <option key={key} value={key}>
                            {caps.label}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-muted-foreground uppercase mb-1.5">Grouping Dimension</label>
                    <select
                      value={builderDimension}
                      onChange={e => setBuilderDimension(e.target.value)}
                      className="w-full px-2.5 py-2 bg-muted rounded-xl border border-border/80 outline-none font-semibold text-foreground"
                    >
                      {REPORT_CAPABILITIES[builderSource]?.supportedDimensions.map(dim => (
                        <option key={dim.value} value={dim.value}>
                          {dim.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-muted-foreground uppercase mb-1.5">Aggregation Measure</label>
                    <select
                      value={builderMeasure}
                      onChange={e => setBuilderMeasure(e.target.value)}
                      className="w-full px-2.5 py-2 bg-muted rounded-xl border border-border/80 outline-none font-semibold text-foreground"
                    >
                      {REPORT_CAPABILITIES[builderSource]?.supportedMeasures.map(meas => (
                        <option key={meas.value} value={meas.value}>
                          {meas.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-muted-foreground uppercase mb-1.5">Visualization Type</label>
                    <select
                      value={builderVisual}
                      onChange={e => setBuilderVisual(e.target.value)}
                      className="w-full px-2.5 py-2 bg-muted rounded-xl border border-border/80 outline-none font-semibold text-foreground"
                    >
                      {REPORT_CAPABILITIES[builderSource]?.supportedVisualTypes.map(vis => (
                        <option key={vis.value} value={vis.value}>
                          {vis.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-3 border-t border-border/60 space-y-3">
                    <span className="font-extrabold text-[10px] uppercase tracking-wider text-muted-foreground block">Save Report Configuration</span>
                    <div>
                      <input
                        type="text"
                        placeholder="e.g. Vehicles Compliance Summary"
                        value={builderReportName}
                        onChange={e => setBuilderReportName(e.target.value)}
                        className="w-full px-2.5 py-2 bg-muted rounded-xl border border-border/80 outline-none text-xs"
                      />
                    </div>
                    <div>
                      <textarea
                        rows={2}
                        placeholder="Brief purpose description"
                        value={builderReportDesc}
                        onChange={e => setBuilderReportDesc(e.target.value)}
                        className="w-full px-2.5 py-2 bg-muted rounded-xl border border-border/80 outline-none text-xs resize-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase">Visibility</label>
                      <select
                        value={builderReportVisibility}
                        onChange={e => setBuilderReportVisibility(e.target.value as 'personal_local' | 'personal' | 'organisation')}
                        className="w-full px-2 py-1.5 bg-muted rounded-lg border border-border outline-none font-semibold text-xs text-foreground"
                      >
                        <option value="personal_local">Personal browser report (Local storage)</option>
                        <option value="personal" disabled={!isSharedTableAvailable}>
                          Personal account report {!isSharedTableAvailable ? '(Unavailable)' : '(Private)'}
                        </option>
                        {isOwnerOrAdmin && (
                          <option value="organisation" disabled={!isSharedTableAvailable}>
                            Organisation report {!isSharedTableAvailable ? '(Unavailable)' : '(Shared with team)'}
                          </option>
                        )}
                      </select>
                      {!isSharedTableAvailable && (
                        <p className="text-[10px] text-amber-600 font-bold mt-1 leading-normal">
                          Organisation-shared reports are not enabled in this environment yet.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveCustomReport}
                      className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Save Configuration
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Live Preview Screen */}
              <div className="lg:col-span-2 bg-card border border-border p-5 rounded-2xl space-y-4 shadow-sm min-h-[300px]">
                <div className="flex justify-between items-center gap-3 border-b border-border/50 pb-3">
                  <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest truncate max-w-[280px]">
                    Preview: {getMeasureLabel(builderMeasure)} by {builderDimension.replace('date_', 'Date ')}
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] text-muted-foreground font-bold px-2 py-0.5 bg-muted rounded-full">
                      {builderReportData.length} groups (based on {(() => {
                        if (builderSource === 'Requirements') return filteredReqs.length;
                        if (builderSource === 'Evidence') return filteredDocs.length;
                        if (builderSource === 'Competencies') return filteredCompetencyRecords.length;
                        if (builderSource === 'Actions') return filteredActions.length;
                        if (builderSource === 'Audit Trail') return auditTrailEvents.length;
                        return 0;
                      })()} total records)
                    </div>
                    <button
                      type="button"
                      onClick={handleExportBuilderCSV}
                      disabled={builderReportData.length === 0}
                      className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Export displayed aggregate as CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Configuration validation summary card */}
                <div className="p-3 bg-muted/40 border border-border/60 rounded-xl flex flex-col gap-1 text-[11px] leading-normal text-muted-foreground text-left">
                  <div className="flex items-center justify-between font-bold text-foreground mb-1">
                    <span className="uppercase text-[9px] tracking-wider text-indigo-650 dark:text-indigo-400">Configuration Validation Status</span>
                    <span className="text-emerald-600 flex items-center gap-1 font-semibold">✓ Verified Compatible</span>
                  </div>
                  <p>Source: <strong className="text-foreground">{builderSource}</strong> | Dimension: <strong className="text-foreground">{builderDimension.replace('date_', 'Date ')}</strong> | Measure: <strong className="text-foreground">{getMeasureLabel(builderMeasure)}</strong> | Visual: <strong className="text-foreground">{builderVisual}</strong></p>
                  <p>Active Filters: Category=<strong className="text-foreground">{selectedCategory}</strong>, Status=<strong className="text-foreground">{selectedStatus}</strong>, Risk=<strong className="text-foreground">{selectedRisk}</strong></p>
                </div>

                {builderVisual === 'bar' && (
                  <div className="space-y-4 py-4">
                    {builderReportData.map((item, idx) => {
                      const totalVal = builderReportData.reduce((sum, i) => sum + i.value, 0);
                      const percent = totalVal > 0 ? (item.value / totalVal) * 100 : 0;
                      return (
                        <div key={idx} className="space-y-1.5 text-xs">
                          <div className="flex justify-between font-bold">
                            <span>{item.label}</span>
                            <span className="text-muted-foreground">{item.value} ({Math.round(percent)}%)</span>
                          </div>
                          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {builderVisual === 'donut' && renderSVDonut(
                  builderReportData.map(item => ({
                    value: item.value,
                    color: item.label.includes('GREEN') || item.label.includes('Compliant') || item.label.includes('Valid') ? '#10b981' :
                           item.label.includes('AMBER') || item.label.includes('Soon') || item.label.includes('Warning') ? '#f59e0b' :
                           item.label.includes('RED') || item.label.includes('Expired') || item.label.includes('Gap') || item.label.includes('Open') ? '#ef4444' :
                           '#4f46e5',
                    label: item.label
                  })),
                  undefined,
                  'builder_donut'
                )}

                {builderVisual === 'table' && (
                  <div className="border border-border rounded-xl overflow-hidden divide-y divide-border/60 text-xs">
                    <div className="grid grid-cols-2 bg-muted/65 p-2 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                      <span>Grouping Label</span>
                      <span>{getMeasureLabel(builderMeasure)}</span>
                    </div>
                    {builderReportData.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-2 p-2 hover:bg-muted/20">
                        <span className="font-bold">{item.label}</span>
                        <span className="font-semibold text-muted-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {builderVisual === 'pivot' && (
                  <div className="space-y-4">
                    <p className="text-[10px] text-muted-foreground">Pivot matrices aggregate requirements dynamically using configurable filters and dimensions.</p>
                    <div className="flex flex-wrap gap-4 text-xs font-semibold pb-3 border-b border-border/40">
                      <div>
                        <span className="text-muted-foreground block text-[9px] font-bold uppercase mb-1">Rows Field</span>
                        <select
                          value={pivotRow}
                          onChange={e => setPivotRow(e.target.value)}
                          className="px-2 py-1 bg-muted border border-border/60 rounded"
                        >
                          {REPORT_CAPABILITIES['Requirements'].supportedDimensions
                            .filter(dim => ['category', 'risk_level', 'owner', 'status'].includes(dim.value))
                            .map(dim => (
                              <option key={dim.value} value={dim.value}>{dim.label}</option>
                            ))
                          }
                        </select>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9px] font-bold uppercase mb-1">Columns Field</span>
                        <select
                          value={pivotCol}
                          onChange={e => setPivotCol(e.target.value)}
                          className="px-2 py-1 bg-muted border border-border/60 rounded"
                        >
                          {REPORT_CAPABILITIES['Requirements'].supportedDimensions
                            .filter(dim => ['category', 'risk_level', 'owner', 'status'].includes(dim.value))
                            .map(dim => (
                              <option key={dim.value} value={dim.value}>{dim.label}</option>
                            ))
                          }
                        </select>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9px] font-bold uppercase mb-1">Aggregation Metric</span>
                        <select
                          value={pivotAggregation}
                          onChange={e => setPivotAggregation(e.target.value)}
                          className="px-2 py-1 bg-muted border border-border/60 rounded"
                        >
                          {getSupportedPivotAggregations(builderMeasure).map(agg => (
                            <option key={agg.value} value={agg.value}>{agg.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs text-left border-collapse border border-border/60">
                        <thead>
                          <tr className="bg-muted/80 font-bold uppercase text-[9px] text-muted-foreground">
                            <th className="border border-border/60 p-2">{pivotRow}</th>
                            {pivotGridData.colArr.map(c => (
                              <th key={c} className="border border-border/60 p-2 text-center">{c}</th>
                            ))}
                            <th className="border border-border/60 p-2 text-center">Grand Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pivotGridData.rowArr.map(r => {
                            const rowTotal = getPivotRowColTotal(r, 'row');
                            return (
                              <tr key={r} className="hover:bg-muted/10">
                                <td className="border border-border/60 p-2 font-bold bg-muted/20">{r}</td>
                                {pivotGridData.colArr.map(c => {
                                  const val = pivotGridData.matrix[r][c] || 0;
                                  const cellStyle = (() => {
                                    let bgClass = 'bg-card text-muted-foreground';
                                    if (pivotAggregation === 'readiness_rate') {
                                      if (val < 50) bgClass = 'bg-rose-500/10 text-rose-700 dark:text-rose-450 font-extrabold';
                                      else if (val < 90) bgClass = 'bg-amber-500/10 text-amber-700 dark:text-amber-450 font-extrabold';
                                      else bgClass = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-450 font-extrabold';
                                    } else if (['avg_days_overdue', 'max_days_overdue', 'min_days_overdue'].includes(pivotAggregation)) {
                                      if (val > 30) bgClass = 'bg-rose-500/10 text-rose-700 dark:text-rose-450 font-extrabold';
                                      else if (val > 0) bgClass = 'bg-amber-500/10 text-amber-700 dark:text-amber-450 font-extrabold';
                                      else bgClass = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-450 font-extrabold';
                                    } else if (pivotCol === 'status') {
                                      if (c === 'RED' && val > 0) bgClass = 'bg-rose-500/10 text-rose-700 dark:text-rose-450 font-extrabold';
                                      else if (c === 'AMBER' && val > 0) bgClass = 'bg-amber-500/10 text-amber-700 dark:text-amber-450 font-extrabold';
                                      else if (c === 'GREEN' && val > 0) bgClass = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-450 font-extrabold';
                                    } else {
                                      if (val > 10) bgClass = 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-extrabold';
                                      else if (val > 0) bgClass = 'bg-indigo-500/5 text-indigo-650 dark:text-indigo-400 font-semibold';
                                    }
                                    return `${bgClass} border border-border/60 p-2 text-center transition-all`;
                                  })();
                                  return (
                                    <td key={c} className={cellStyle}>
                                      {val}
                                      {['readiness_rate', 'row_pct', 'col_pct', 'total_pct'].includes(pivotAggregation) ? '%' : ''}
                                    </td>
                                  );
                                })}
                                <td className="border border-border/60 p-2 text-center font-bold text-foreground bg-muted/20">
                                  {pivotAggregation === 'col_pct' ? 'N/A' : rowTotal}
                                  {['readiness_rate', 'row_pct', 'col_pct', 'total_pct'].includes(pivotAggregation) && pivotAggregation !== 'col_pct' ? '%' : ''}
                                </td>
                              </tr>
                            );
                          })}

                          <tr className="bg-muted/30 font-bold">
                            <td className="border border-border/60 p-2 font-bold uppercase text-[9px] text-muted-foreground">Grand Total</td>
                            {pivotGridData.colArr.map(c => {
                              const colTotal = getPivotRowColTotal(c, 'col');
                              return (
                                <td key={c} className="border border-border/60 p-2 text-center text-foreground">
                                  {pivotAggregation === 'row_pct' ? 'N/A' : colTotal}
                                  {['readiness_rate', 'row_pct', 'col_pct', 'total_pct'].includes(pivotAggregation) && pivotAggregation !== 'row_pct' ? '%' : ''}
                                </td>
                              );
                            })}
                            <td className="border border-border/60 p-2 text-center text-indigo-600 dark:text-indigo-400 font-extrabold bg-muted/40">
                              {getPivotRowColTotal('', 'grand')}
                              {['readiness_rate', 'row_pct', 'col_pct', 'total_pct'].includes(pivotAggregation) ? '%' : ''}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {selectedScheduledReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-sm font-extrabold text-foreground">Schedule Report Delivery</h3>
                <p className="text-xs text-indigo-650 dark:text-indigo-400 font-semibold">{selectedScheduledReport.name}</p>
              </div>
              <button
                onClick={() => setSelectedScheduledReport(null)}
                className="text-muted-foreground hover:text-foreground text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-2.5 text-xs text-muted-foreground leading-relaxed text-left">
              <span className="font-extrabold text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" /> Scheduling is not configured
              </span>
              <p>
                Automated report deliveries and email scheduling are currently not configured in the Vygilence platform database.
              </p>
              <p>
                To share this report configuration with your team, please use the <strong className="text-foreground">Copy Share Link</strong> option to copy a deep link to their workspace dashboard instead.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedScheduledReport(null)}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCopyDeepLink(selectedScheduledReport.id);
                  setSelectedScheduledReport(null);
                }}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Copy Share Link
              </button>
            </div>
          </div>
        </div>
      )}

      {focusedChartId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl relative animate-scaleIn">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">
                  Focused Chart View
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Detailed visualization and raw data grid inspection.
                </p>
              </div>
              <button
                onClick={() => setFocusedChartId(null)}
                className="text-muted-foreground hover:text-foreground text-xs font-bold p-1 bg-muted rounded-lg"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-4 bg-muted/20 border border-border/60 rounded-xl">
              {focusedChartId === 'rag_distribution' && (
                <>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Requirements RAG Distribution</h4>
                  {renderSVDonut([
                    { value: filteredReadinessRequirements.filter(r => r.status === 'GREEN').length, color: '#10b981', label: 'Green' },
                    { value: filteredReadinessRequirements.filter(r => r.status === 'AMBER').length, color: '#f59e0b', label: 'Due Soon' },
                    { value: filteredReadinessRequirements.filter(r => r.status === 'RED').length, color: '#ef4444', label: 'Overdue / Gap' },
                    { value: filteredReadinessRequirements.filter(r => r.status === 'GREY').length, color: '#71717a', label: 'Excluded' }
                  ], 'Requirements')}
                </>
              )}
              {focusedChartId === 'evidence_uploads' && (
                <>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Evidence Upload Activity</h4>
                  {renderSVGSparkline(documentUploadTrend.points, documentUploadTrend.labels, undefined, undefined, 'Evidence')}
                </>
              )}
              {focusedChartId === 'evidence_status' && (
                <>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Evidence by Expiry Status</h4>
                  {renderSVDonut([
                    { value: filteredDocs.filter(d => d.status === 'Active').length, color: '#10b981', label: 'Active / Current' },
                    { value: filteredDocs.filter(d => d.status === 'Expiring Soon').length, color: '#f59e0b', label: 'Expiring Soon' },
                    { value: filteredDocs.filter(d => d.status === 'Expired').length, color: '#ef4444', label: 'Expired' },
                    { value: filteredDocs.filter(d => d.status === 'Unclassified').length, color: '#71717a', label: 'Unclassified' }
                  ], 'Evidence')}
                </>
              )}
              {focusedChartId === 'evidence_trend' && (
                <>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Document Uploads Trend</h4>
                  {renderSVGSparkline(documentUploadTrend.points, documentUploadTrend.labels, undefined, undefined, 'Evidence')}
                </>
              )}
              {focusedChartId === 'actions_status' && (
                <>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Corrective Actions Status</h4>
                  {renderSVDonut([
                    { value: filteredActions.filter(a => a.status === 'Complete').length, color: '#10b981', label: 'Complete' },
                    { value: filteredActions.filter(a => a.status === 'In Progress').length, color: '#f59e0b', label: 'In Progress' },
                    { value: filteredActions.filter(a => a.status === 'Open').length, color: '#ef4444', label: 'Open' },
                    { value: filteredActions.filter(a => a.status === 'Cancelled').length, color: '#71717a', label: 'Cancelled' }
                  ], 'Actions')}
                </>
              )}
              {focusedChartId === 'audits_status' && (
                <>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Audit Packs Status</h4>
                  {renderSVDonut([
                    { value: auditPacks.filter(p => p.status === 'Ready').length, color: '#10b981', label: 'Ready' },
                    { value: auditPacks.filter(p => p.status === 'Draft').length, color: '#f59e0b', label: 'Draft' },
                    { value: auditPacks.filter(p => p.status === 'Sent').length, color: '#4f46e5', label: 'Sent' },
                    { value: auditPacks.filter(p => p.status === 'Archived').length, color: '#71717a', label: 'Archived' }
                  ], 'Audits')}
                </>
              )}
              {focusedChartId === 'builder_donut' && (
                <>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Custom Report Builder Aggregate</h4>
                  {renderSVDonut(
                    builderReportData.map(item => ({
                      value: item.value,
                      color: item.label.includes('GREEN') || item.label.includes('Compliant') || item.label.includes('Valid') ? '#10b981' :
                             item.label.includes('AMBER') || item.label.includes('Soon') || item.label.includes('Warning') ? '#f59e0b' :
                             item.label.includes('RED') || item.label.includes('Expired') || item.label.includes('Gap') || item.label.includes('Open') ? '#ef4444' :
                             '#4f46e5',
                      label: item.label
                    }))
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setFocusedChartId(null)}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showGlossary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col p-6 space-y-4 shadow-xl relative animate-scaleIn">
            <div className="flex justify-between items-start gap-4 shrink-0">
              <div>
                <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-indigo-650 dark:text-indigo-400" />
                  Metrics Glossary & Definitions
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Calculation logic, exclusions, boundaries, and source modules for all Vygilence metrics.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowGlossary(false);
                  setGlossarySearchQuery('');
                }}
                className="text-muted-foreground hover:text-foreground text-xs font-bold p-1 bg-muted rounded-lg cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Search glossary */}
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search metrics or modules..."
                value={glossarySearchQuery}
                onChange={e => setGlossarySearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-muted rounded-xl border border-border/60 outline-none text-xs font-medium focus:border-indigo-500"
              />
            </div>

            {/* Glossary definitions list */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 no-scrollbar">
              {METRIC_GLOSSARIES.filter(g =>
                g.name.toLowerCase().includes(glossarySearchQuery.toLowerCase()) ||
                g.measures.toLowerCase().includes(glossarySearchQuery.toLowerCase()) ||
                g.sourceModule.toLowerCase().includes(glossarySearchQuery.toLowerCase())
              ).map((m, idx) => (
                <div key={idx} className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
                  <div className="flex justify-between items-start border-b border-border/40 pb-2">
                    <h4 className="text-xs font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wide">
                      {m.name}
                    </h4>
                    <span className="text-[9px] font-extrabold px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 rounded-full">
                      {m.sourceModule}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
                    <div>
                      <span className="font-extrabold text-[10px] text-muted-foreground uppercase block">What it measures</span>
                      <p className="text-foreground font-medium mt-0.5">{m.measures}</p>
                    </div>
                    <div>
                      <span className="font-extrabold text-[10px] text-muted-foreground uppercase block">Calculation</span>
                      <p className="text-foreground font-medium mt-0.5">{m.calculation}</p>
                    </div>
                    <div>
                      <span className="font-extrabold text-[10px] text-muted-foreground uppercase block">Included records</span>
                      <p className="text-foreground font-medium mt-0.5">{m.included}</p>
                    </div>
                    <div>
                      <span className="font-extrabold text-[10px] text-muted-foreground uppercase block">Excluded records</span>
                      <p className="text-foreground font-medium mt-0.5">{m.excluded}</p>
                    </div>
                    <div>
                      <span className="font-extrabold text-[10px] text-muted-foreground uppercase block">Date field used</span>
                      <p className="text-foreground font-medium mt-0.5">{m.dateField}</p>
                    </div>
                    <div>
                      <span className="font-extrabold text-[10px] text-muted-foreground uppercase block">Missing data treatment</span>
                      <p className="text-foreground font-medium mt-0.5">{m.missing}</p>
                    </div>
                  </div>
                </div>
              ))}
              {METRIC_GLOSSARIES.filter(g =>
                g.name.toLowerCase().includes(glossarySearchQuery.toLowerCase()) ||
                g.measures.toLowerCase().includes(glossarySearchQuery.toLowerCase()) ||
                g.sourceModule.toLowerCase().includes(glossarySearchQuery.toLowerCase())
              ).length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No matching metric definitions found.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 shrink-0 border-t border-border/40">
              <button
                type="button"
                onClick={() => {
                  setShowGlossary(false);
                  setGlossarySearchQuery('');
                }}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Trust Note */}
      <div className="pt-6 border-t border-border/60 text-center text-[10px] text-muted-foreground leading-relaxed print:block mt-8">
        <span className="font-extrabold text-indigo-650 dark:text-indigo-400 block mb-1">REPORT TRUST NOTE</span>
        Reports reflect the records currently held in Vygilence and depend on the completeness and accuracy of the underlying data.
      </div>

      <ConfirmDialog request={confirmRequest} onCancel={() => setConfirmRequest(null)} />
      <InlineToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
