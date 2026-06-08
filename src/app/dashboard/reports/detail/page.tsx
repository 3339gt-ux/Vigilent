'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp, useInterfaceDetailLevel } from '@/context/AppContext';
import { FiltersAndToolsButton, AdvancedControlsPanel } from '@/components/InterfaceDetailControls';
import { dbService } from '@/lib/db';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Download,
  AlertTriangle,
  ChevronLeft,
  X,
  ExternalLink,
  Search,
  Calendar,
  CheckCircle2,
  Lock,
  Building2,
  FileSpreadsheet,
  Briefcase,
  FileText,
  Activity,
  SlidersHorizontal,
  Bookmark
} from 'lucide-react';
import {
  CompetencyRecord,
  Person,
  Requirement,
  EvidenceDocument,
  CompetencyType,
  Action,
  AuditPack
} from '@/lib/types';
import { ConfirmDialog, ConfirmRequest, InlineToast, ToastState } from '@/components/AppFeedback';
import { calculateCompetencyStatus } from '@/lib/competencyEngine';

export interface CompetencyDetail {
  person: Person;
  type: CompetencyType;
  status: string;
  record: CompetencyRecord | null;
}

export type DetailRecord =
  | Requirement
  | EvidenceDocument
  | CompetencyDetail
  | Action
  | AuditPack;

export interface RequirementsMetrics {
  total: number;
  compliant: number;
  warning: number;
  gaps: number;
}

export interface EvidenceMetrics {
  total: number;
  active: number;
  expiring: number;
  expired: number;
}

export interface CompetencyMetrics {
  total: number;
  valid: number;
  expiring: number;
  expired: number;
}

export interface ActionMetrics {
  total: number;
  completed: number;
  progress: number;
  open: number;
}

export interface AuditMetrics {
  total: number;
  ready: number;
  draft: number;
  sent: number;
}

export type MetricsSummary =
  | RequirementsMetrics
  | EvidenceMetrics
  | CompetencyMetrics
  | ActionMetrics
  | AuditMetrics;


export default function ReportDetailPage() {
  const {
    organization,
    frameworkRequirements,
    documents,
    actions,
    people,
    competencyTypes,
    competencyRecords,
    auditPacks,
    readinessReport,
    requirementActions
  } = useApp();

  const router = useRouter();

  // State
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Custom workspace options
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { interfaceDetailLevel } = useInterfaceDetailLevel();
  const [generatedAt, setGeneratedAt] = useState('');
  const [overdueFilter, setOverdueFilter] = useState('All');

  // Helper to find linked requirement risk
  const getLinkedRequirementRisk = useCallback((actionId: string) => {
    const link = requirementActions.find(la => la.action_id === actionId);
    if (!link) return 'Not recorded';
    const req = frameworkRequirements.find(r => r.id === link.requirement_id);
    return req?.risk_level || 'Not recorded';
  }, [requirementActions, frameworkRequirements]);

  // Filter overrides from query parameters
  const [source, setSource] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [ownerFilter, setOwnerFilter] = useState<string>('All');
  const [riskFilter, setRiskFilter] = useState<string>('All');

  // Visible columns defaults mapping
  const defaultVisibleColumns = useMemo<Record<string, Record<string, boolean>>>(() => ({
    Requirements: { category: true, status: true, risk: true, owner: true },
    Evidence: { category: true, status: true, expiry: true, uploaded_by: true },
    Competencies: { title: true, category: true, status: true, expiry: true },
    Actions: { risk: true, status: true, owner: true, due_date: true },
    Audits: { status: true, requirements: true, documents: true }
  }), []);

  // Fetch initial params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const requestedSource = params.get('source') || '';
      const supportedSources = ['Requirements', 'Evidence', 'Competencies', 'Actions', 'Audits'];
      const resolvedSource = supportedSources.includes(requestedSource) ? requestedSource : 'Unsupported';

      setSource(resolvedSource);
      setStatusFilter(params.get('status') || 'All');
      setCategoryFilter(params.get('category') || 'All');
      setOwnerFilter(params.get('owner') || 'All');
      setRiskFilter(params.get('risk') || 'All');
      setOverdueFilter(params.get('overdue') || 'All');
      setGeneratedAt(new Date().toLocaleString());

      if (resolvedSource && defaultVisibleColumns[resolvedSource]) {
        setVisibleColumns(defaultVisibleColumns[resolvedSource]);
      }
    }
  }, [defaultVisibleColumns]);

  // Back tab tracking (decides which parent reports tab to open when clicking Back)
  const parentTab = useMemo(() => {
    if (source === 'Requirements') return 'requirements';
    if (source === 'Evidence') return 'evidence';
    if (source === 'Competencies') return 'competencies';
    if (source === 'Actions') return 'actions';
    if (source === 'Audits') return 'audits';
    return 'executive';
  }, [source]);

  // Compute readiness mapping
  const readinessByRequirementId = useMemo(
    () => new Map(readinessReport.requirements.map(item => [item.requirement.id, item])),
    [readinessReport.requirements]
  );

  // Filtered lists
  const records = useMemo<DetailRecord[]>(() => {
    if (source === 'Requirements') {
      return frameworkRequirements.filter(r => {
        const lifecycle = r.lifecycle_status || 'ACTIVE';
        if (lifecycle !== 'ACTIVE') return false;
        if (categoryFilter !== 'All' && r.category !== categoryFilter) return false;
        if (ownerFilter !== 'All' && r.owner !== ownerFilter) return false;
        if (riskFilter !== 'All' && r.risk_level !== riskFilter) return false;

        const readiness = readinessByRequirementId.get(r.id);
        if (statusFilter !== 'All' && readiness?.status !== statusFilter) return false;
        return true;
      });
    }

    if (source === 'Evidence') {
      return documents.filter(d => {
        if (categoryFilter !== 'All' && d.category !== categoryFilter) return false;
        if (ownerFilter !== 'All' && d.uploaded_by !== ownerFilter) return false;
        if (statusFilter !== 'All' && d.status !== statusFilter) return false;
        return true;
      });
    }

    if (source === 'Competencies') {
      const recordsByCell = new Map(
        competencyRecords.map(record => [`${record.person_id}:${record.competency_type_id}`, record])
      );

      const list: CompetencyDetail[] = [];
      people.filter(p => p.active).forEach(person => {
        competencyTypes.filter(t => t.active).forEach(type => {
          const rec = recordsByCell.get(`${person.id}:${type.id}`) || null;
          const status = calculateCompetencyStatus(rec);

          if (categoryFilter !== 'All' && type.category !== categoryFilter) return;
          if (statusFilter !== 'All' && status !== statusFilter) return;
          if (ownerFilter !== 'All' && person.display_name !== ownerFilter) return;

          list.push({ person, type, status, record: rec });
        });
      });
      return list;
    }

    if (source === 'Actions') {
      return actions.filter(a => {
        if (ownerFilter !== 'All' && a.owner !== ownerFilter) return false;
        if (statusFilter !== 'All' && a.status !== statusFilter) return false;
        if (riskFilter !== 'All' && getLinkedRequirementRisk(a.id) !== riskFilter) return false;
        if (overdueFilter === 'true') {
          const now = new Date();
          const isOverdue = a.status !== 'Complete' && a.status !== 'Cancelled' && a.due_date && new Date(a.due_date) < now;
          if (!isOverdue) return false;
        }
        return true;
      });
    }

    if (source === 'Audits') {
      return auditPacks.filter(p => {
        if (statusFilter !== 'All' && p.status !== statusFilter) return false;
        return true;
      });
    }

    return [];
  }, [source, frameworkRequirements, documents, competencyRecords, competencyTypes, people, actions, auditPacks, categoryFilter, ownerFilter, riskFilter, statusFilter, overdueFilter, readinessByRequirementId, getLinkedRequirementRisk]);

  // Search filter
  const searchedRecords = useMemo<DetailRecord[]>(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return records;
    return records.filter((item) => {
      if (source === 'Requirements') {
        const req = item as Requirement;
        return (req.title || '').toLowerCase().includes(q) || (req.category || '').toLowerCase().includes(q) || (req.owner || '').toLowerCase().includes(q);
      }
      if (source === 'Evidence') {
        const doc = item as EvidenceDocument;
        return (doc.title || '').toLowerCase().includes(q) || (doc.category || '').toLowerCase().includes(q) || (doc.uploaded_by || '').toLowerCase().includes(q);
      }
      if (source === 'Competencies') {
        const comp = item as CompetencyDetail;
        return (comp.person?.display_name || '').toLowerCase().includes(q) || (comp.type?.title || '').toLowerCase().includes(q) || (comp.type?.category || '').toLowerCase().includes(q);
      }
      if (source === 'Actions') {
        const act = item as Action;
        return (act.description || '').toLowerCase().includes(q) || (act.owner || '').toLowerCase().includes(q);
      }
      if (source === 'Audits') {
        const aud = item as AuditPack;
        return (aud.name || '').toLowerCase().includes(q) || (aud.status || '').toLowerCase().includes(q);
      }
      return false;
    });
  }, [records, searchQuery, source]);

  // Sort records
  const sortedRecords = useMemo<DetailRecord[]>(() => {
    const list = [...searchedRecords];
    list.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (source === 'Requirements') {
        const reqA = a as Requirement;
        const reqB = b as Requirement;
        if (sortBy === 'name') { valA = reqA.title; valB = reqB.title; }
        else if (sortBy === 'category') { valA = reqA.category; valB = reqB.category; }
        else if (sortBy === 'status') { valA = readinessByRequirementId.get(reqA.id)?.status || ''; valB = readinessByRequirementId.get(reqB.id)?.status || ''; }
        else if (sortBy === 'risk') { valA = reqA.risk_level; valB = reqB.risk_level; }
      } else if (source === 'Evidence') {
        const docA = a as EvidenceDocument;
        const docB = b as EvidenceDocument;
        if (sortBy === 'name') { valA = docA.title; valB = docB.title; }
        else if (sortBy === 'category') { valA = docA.category; valB = docB.category; }
        else if (sortBy === 'status') { valA = docA.status; valB = docB.status; }
      } else if (source === 'Competencies') {
        const compA = a as CompetencyDetail;
        const compB = b as CompetencyDetail;
        if (sortBy === 'name') { valA = compA.person.display_name; valB = compB.person.display_name; }
        else if (sortBy === 'category') { valA = compA.type.category; valB = compB.type.category; }
        else if (sortBy === 'status') { valA = compA.status; valB = compB.status; }
      } else if (source === 'Actions') {
        const actA = a as Action;
        const actB = b as Action;
        if (sortBy === 'name') { valA = actA.description || ''; valB = actB.description || ''; }
        else if (sortBy === 'status') { valA = actA.status; valB = actB.status; }
        else if (sortBy === 'risk') { valA = getLinkedRequirementRisk(actA.id); valB = getLinkedRequirementRisk(actB.id); }
      } else if (source === 'Audits') {
        const audA = a as AuditPack;
        const audB = b as AuditPack;
        if (sortBy === 'name') { valA = audA.name; valB = audB.name; }
        else if (sortBy === 'status') { valA = audA.status; valB = audB.status; }
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [searchedRecords, sortBy, sortOrder, source, readinessByRequirementId, getLinkedRequirementRisk]);

  // Paginated records
  const paginatedRecords = useMemo<DetailRecord[]>(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;
  const isSupportedSource = ['Requirements', 'Evidence', 'Competencies', 'Actions', 'Audits'].includes(source);

  const metricsSummary = useMemo<MetricsSummary | null>(() => {
    if (source === 'Requirements') {
      const list = sortedRecords as Requirement[];
      const total = list.length;
      const compliant = list.filter(r => (readinessByRequirementId.get(r.id)?.status || 'GREY') === 'GREEN').length;
      const warning = list.filter(r => (readinessByRequirementId.get(r.id)?.status || 'GREY') === 'AMBER').length;
      const gaps = list.filter(r => (readinessByRequirementId.get(r.id)?.status || 'GREY') === 'RED').length;
      return { total, compliant, warning, gaps };
    }
    if (source === 'Evidence') {
      const list = sortedRecords as EvidenceDocument[];
      const total = list.length;
      const active = list.filter(d => d.status === 'Active').length;
      const expiring = list.filter(d => d.status === 'Expiring Soon').length;
      const expired = list.filter(d => d.status === 'Expired').length;
      return { total, active, expiring, expired };
    }
    if (source === 'Competencies') {
      const list = sortedRecords as CompetencyDetail[];
      const total = list.length;
      const valid = list.filter(c => c.status === 'Valid').length;
      const expiring = list.filter(c => c.status === 'Expiring Soon').length;
      const expired = list.filter(c => c.status === 'Expired' || c.status === 'Missing').length;
      return { total, valid, expiring, expired };
    }
    if (source === 'Actions') {
      const list = sortedRecords as Action[];
      const total = list.length;
      const completed = list.filter(a => a.status === 'Complete').length;
      const progress = list.filter(a => a.status === 'In Progress').length;
      const open = list.filter(a => a.status === 'Open').length;
      return { total, completed, progress, open };
    }
    if (source === 'Audits') {
      const list = sortedRecords as AuditPack[];
      const total = list.length;
      const ready = list.filter(p => p.status === 'Ready').length;
      const draft = list.filter(p => p.status === 'Draft').length;
      const sent = list.filter(p => p.status === 'Sent').length;
      return { total, ready, draft, sent };
    }
    return null;
  }, [source, sortedRecords, readinessByRequirementId]);

  const sourceModuleUrl = useMemo(() => {
    if (source === 'Requirements') return '/dashboard/requirements';
    if (source === 'Evidence') return '/dashboard/vault';
    if (source === 'Competencies') return '/dashboard/competencies';
    if (source === 'Actions') return '/dashboard/requirements?filter=actions';
    if (source === 'Audits') return '/dashboard/audit-packs';
    return '';
  }, [source]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // CSV Exporter
  const handleExportDetailCSV = () => {
    if (!isSupportedSource) {
      setToast({ type: 'error', message: 'Select a supported report source before exporting.' });
      return;
    }
    let headers: string[] = [];
    let rows: string[][] = [];

    if (source === 'Requirements') {
      headers = ['Requirement Title', 'Category', 'RAG Status', 'Risk Level', 'Owner'];
      rows = (sortedRecords as Requirement[]).map((r) => [
        r.title,
        r.category,
        readinessByRequirementId.get(r.id)?.status || 'GREY',
        r.risk_level || 'Low',
        r.owner || 'Unassigned'
      ]);
    } else if (source === 'Evidence') {
      headers = ['Document Name', 'Category', 'Status', 'Expiry Date', 'Uploaded By'];
      rows = (sortedRecords as EvidenceDocument[]).map((d) => [
        d.title,
        d.category,
        d.status,
        d.expiry_date || 'N/A',
        d.uploaded_by || 'Unknown'
      ]);
    } else if (source === 'Competencies') {
      headers = ['Teammate Name', 'Competency Title', 'Category', 'Compliance Status', 'Expiry Date'];
      rows = (sortedRecords as CompetencyDetail[]).map((c) => [
        c.person.display_name,
        c.type.title,
        c.type.category,
        c.status,
        c.record?.expiry_date || 'N/A'
      ]);
    } else if (source === 'Actions') {
      headers = ['Description', 'Linked Requirement Risk', 'Status', 'Owner', 'Due Date'];
      rows = (sortedRecords as Action[]).map((a) => [
        a.description || '',
        getLinkedRequirementRisk(a.id),
        a.status,
        a.owner || 'Unassigned',
        a.target_due_date || a.due_date || 'N/A'
      ]);
    } else if (source === 'Audits') {
      headers = ['Pack Name', 'Status', 'Requirements Count', 'Documents Count', 'Created At'];
      rows = (sortedRecords as AuditPack[]).map((p) => [
        p.name,
        p.status,
        (p.requirements || []).length.toString(),
        (p.documents || []).length.toString(),
        new Date(p.created_at).toLocaleDateString()
      ]);
    }

    setConfirmRequest({
      title: 'Export Detail Data?',
      description: `You are about to export "${source} Detail Report" with ${sortedRecords.length} records.`,
      confirmLabel: 'Export CSV',
      tone: 'primary',
      onConfirm: () => {
        const csvContent = [
          [`Vygilence Detail Report - ${source}`],
          [`Workspace: ${organization?.name || 'Vygilence Workspace'}`],
          [`Generated At: ${new Date().toLocaleString()}`],
          [`Filters: Status=${statusFilter}, Category=${categoryFilter}, Owner=${ownerFilter}, Risk=${riskFilter}`],
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
        link.setAttribute('download', `vygilence-${source.toLowerCase()}-detail-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setToast({ type: 'success', message: 'Report data exported successfully.' });

        // Log to audit trail
        dbService.logReportActivity({
          actionType: 'report_exported_csv',
          entityLabel: `${source} Detail Report`,
          description: `Exported ${source} Detail Report as CSV (${sortedRecords.length} records).`,
          metadata: { headers, rowCount: sortedRecords.length }
        }).catch(err => console.error('Failed to log audit activity:', err));
      }
    });
  };

  // Print Report PDF
  const handlePrintDetailPDF = () => {
    if (!isSupportedSource) {
      setToast({ type: 'error', message: 'Select a supported report source before printing.' });
      return;
    }
    // Log print activity to audit trail
    dbService.logReportActivity({
      actionType: 'report_printed_pdf',
      entityLabel: `${source} Detail Report`,
      description: `Opened print/PDF rendering for "${source} Detail Report".`
    }).catch(err => console.error('Failed to log audit activity:', err));

    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 print:p-0">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between border-b border-border/60 pb-4 print:hidden gap-4">
        <button
          onClick={() => router.push(`/dashboard/reports?tab=${parentTab}`)}
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Reports
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {sourceModuleUrl && (
            <Link
              href={sourceModuleUrl}
              className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-650 dark:text-indigo-400 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              Open source module <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
          <button
            onClick={handleExportDetailCSV}
            disabled={!isSupportedSource}
            className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-lg border border-border flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={handlePrintDetailPDF}
            disabled={!isSupportedSource}
            className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Report Summary Card */}
      <div className="bg-card border border-border p-6 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
              {organization?.name || 'Workspace'} | Detail Inspector
            </span>
            <h1 className="text-2xl font-black text-foreground tracking-tight mt-1">
              {isSupportedSource ? source : 'Unavailable'} Readiness Report
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {isSupportedSource
                ? 'Detailed breakdown of records matching the selected readiness and operational filters.'
                : 'This report source is missing, invalid, or unavailable to this route.'}
            </p>
            {generatedAt && (
              <span className="text-[10px] text-muted-foreground font-semibold block mt-1">
                Generated: {generatedAt}
              </span>
            )}
          </div>
        </div>

        {/* Filter Badges Summary */}
        <div className="flex flex-wrap gap-2 text-xs">
          {statusFilter !== 'All' && (
            <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg flex items-center gap-1">
              Status: {statusFilter}
              <X className="w-3.5 h-3.5 cursor-pointer print:hidden" onClick={() => setStatusFilter('All')} />
            </span>
          )}
          {categoryFilter !== 'All' && (
            <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg flex items-center gap-1">
              Category: {categoryFilter}
              <X className="w-3.5 h-3.5 cursor-pointer print:hidden" onClick={() => setCategoryFilter('All')} />
            </span>
          )}
          {ownerFilter !== 'All' && (
            <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg flex items-center gap-1">
              Owner/Person: {ownerFilter}
              <X className="w-3.5 h-3.5 cursor-pointer print:hidden" onClick={() => setOwnerFilter('All')} />
            </span>
          )}
          {riskFilter !== 'All' && (
            <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg flex items-center gap-1">
              Risk: {riskFilter}
              <X className="w-3.5 h-3.5 cursor-pointer print:hidden" onClick={() => setRiskFilter('All')} />
            </span>
          )}
          {overdueFilter !== 'All' && (
            <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg flex items-center gap-1">
              Overdue: {overdueFilter}
              <X className="w-3.5 h-3.5 cursor-pointer print:hidden" onClick={() => setOverdueFilter('All')} />
            </span>
          )}
          {(statusFilter !== 'All' || categoryFilter !== 'All' || ownerFilter !== 'All' || riskFilter !== 'All' || overdueFilter !== 'All') && (
            <button
              onClick={() => {
                setStatusFilter('All');
                setCategoryFilter('All');
                setOwnerFilter('All');
                setRiskFilter('All');
                setOverdueFilter('All');
              }}
              className="text-xs text-indigo-650 dark:text-indigo-400 hover:underline font-bold print:hidden"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* KPI Summaries Block */}
        {isSupportedSource && metricsSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/40">
            {source === 'Requirements' && (() => {
              const s = metricsSummary as RequirementsMetrics;
              return (
                <>
                  <div className="bg-muted/30 p-3 rounded-xl border border-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Total Requirements</span>
                    <span className="text-lg font-black text-foreground">{s.total}</span>
                  </div>
                  <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                    <span className="text-[10px] font-bold text-emerald-600 block">Compliant</span>
                    <span className="text-lg font-black text-emerald-600">{s.compliant}</span>
                  </div>
                  <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                    <span className="text-[10px] font-bold text-amber-600 block">Warning</span>
                    <span className="text-lg font-black text-amber-600">{s.warning}</span>
                  </div>
                  <div className="bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                    <span className="text-[10px] font-bold text-rose-600 block">Gaps</span>
                    <span className="text-lg font-black text-rose-600">{s.gaps}</span>
                  </div>
                </>
              );
            })()}
            {source === 'Evidence' && (() => {
              const s = metricsSummary as EvidenceMetrics;
              return (
                <>
                  <div className="bg-muted/30 p-3 rounded-xl border border-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Total Evidence</span>
                    <span className="text-lg font-black text-foreground">{s.total}</span>
                  </div>
                  <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                    <span className="text-[10px] font-bold text-emerald-600 block">Active</span>
                    <span className="text-lg font-black text-emerald-600">{s.active}</span>
                  </div>
                  <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                    <span className="text-[10px] font-bold text-amber-600 block">Expiring Soon</span>
                    <span className="text-lg font-black text-amber-600">{s.expiring}</span>
                  </div>
                  <div className="bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                    <span className="text-[10px] font-bold text-rose-600 block">Expired</span>
                    <span className="text-lg font-black text-rose-600">{s.expired}</span>
                  </div>
                </>
              );
            })()}
            {source === 'Competencies' && (() => {
              const s = metricsSummary as CompetencyMetrics;
              return (
                <>
                  <div className="bg-muted/30 p-3 rounded-xl border border-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Total Gaps Checked</span>
                    <span className="text-lg font-black text-foreground">{s.total}</span>
                  </div>
                  <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                    <span className="text-[10px] font-bold text-emerald-600 block">Valid</span>
                    <span className="text-lg font-black text-emerald-600">{s.valid}</span>
                  </div>
                  <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                    <span className="text-[10px] font-bold text-amber-600 block">Expiring Soon</span>
                    <span className="text-lg font-black text-amber-600">{s.expiring}</span>
                  </div>
                  <div className="bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                    <span className="text-[10px] font-bold text-rose-600 block">Expired / Gaps</span>
                    <span className="text-lg font-black text-rose-600">{s.expired}</span>
                  </div>
                </>
              );
            })()}
            {source === 'Actions' && (() => {
              const s = metricsSummary as ActionMetrics;
              return (
                <>
                  <div className="bg-muted/30 p-3 rounded-xl border border-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Total Actions</span>
                    <span className="text-lg font-black text-foreground">{s.total}</span>
                  </div>
                  <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                    <span className="text-[10px] font-bold text-emerald-600 block">Completed</span>
                    <span className="text-lg font-black text-emerald-600">{s.completed}</span>
                  </div>
                  <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                    <span className="text-[10px] font-bold text-amber-600 block">In Progress</span>
                    <span className="text-lg font-black text-amber-600">{s.progress}</span>
                  </div>
                  <div className="bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                    <span className="text-[10px] font-bold text-rose-600 block">Open</span>
                    <span className="text-lg font-black text-rose-600">{s.open}</span>
                  </div>
                </>
              );
            })()}
            {source === 'Audits' && (() => {
              const s = metricsSummary as AuditMetrics;
              return (
                <>
                  <div className="bg-muted/30 p-3 rounded-xl border border-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Total Packs</span>
                    <span className="text-lg font-black text-foreground">{s.total}</span>
                  </div>
                  <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                    <span className="text-[10px] font-bold text-emerald-600 block">Ready</span>
                    <span className="text-lg font-black text-emerald-600">{s.ready}</span>
                  </div>
                  <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                    <span className="text-[10px] font-bold text-amber-600 block">Draft</span>
                    <span className="text-lg font-black text-amber-600">{s.draft}</span>
                  </div>
                  <div className="bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10">
                    <span className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 block">Sent</span>
                    <span className="text-lg font-black text-indigo-650 dark:text-indigo-400">{s.sent}</span>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Progress bar visual */}
        {isSupportedSource && metricsSummary && (
          <div className="pt-2">
            <span className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Status Proportions</span>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
              {(() => {
                const total = metricsSummary.total || 1;
                let segments: Array<{ color: string; pct: number }> = [];
                if (source === 'Requirements') {
                  const s = metricsSummary as RequirementsMetrics;
                  segments = [
                    { color: 'bg-emerald-500', pct: (s.compliant / total) * 100 },
                    { color: 'bg-amber-500', pct: (s.warning / total) * 100 },
                    { color: 'bg-rose-500', pct: (s.gaps / total) * 100 }
                  ];
                } else if (source === 'Evidence') {
                  const s = metricsSummary as EvidenceMetrics;
                  segments = [
                    { color: 'bg-emerald-500', pct: (s.active / total) * 100 },
                    { color: 'bg-amber-500', pct: (s.expiring / total) * 100 },
                    { color: 'bg-rose-500', pct: (s.expired / total) * 100 }
                  ];
                } else if (source === 'Competencies') {
                  const s = metricsSummary as CompetencyMetrics;
                  segments = [
                    { color: 'bg-emerald-500', pct: (s.valid / total) * 100 },
                    { color: 'bg-amber-500', pct: (s.expiring / total) * 100 },
                    { color: 'bg-rose-500', pct: (s.expired / total) * 100 }
                  ];
                } else if (source === 'Actions') {
                  const s = metricsSummary as ActionMetrics;
                  segments = [
                    { color: 'bg-emerald-500', pct: (s.completed / total) * 100 },
                    { color: 'bg-amber-500', pct: (s.progress / total) * 100 },
                    { color: 'bg-rose-500', pct: (s.open / total) * 100 }
                  ];
                } else if (source === 'Audits') {
                  const s = metricsSummary as AuditMetrics;
                  segments = [
                    { color: 'bg-emerald-500', pct: (s.ready / total) * 100 },
                    { color: 'bg-amber-500', pct: (s.draft / total) * 100 },
                    { color: 'bg-indigo-550', pct: (s.sent / total) * 100 }
                  ];
                }
                return segments.map((seg, idx) => (
                  <div key={idx} className={`${seg.color} h-full`} style={{ width: `${seg.pct}%` }} />
                ));
              })()}
            </div>
          </div>
        )}
      </div>

      {!isSupportedSource && (
        <div className="bg-card border border-amber-500/30 rounded-2xl p-8 text-center">
          <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-3" />
          <h2 className="text-sm font-extrabold text-foreground">Report source unavailable</h2>
          <p className="text-xs text-muted-foreground mt-1">Return to Reports and open a supported detail view.</p>
        </div>
      )}

      {/* Detail Table Container */}
      {isSupportedSource && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
          {/* Custom controls row above table header */}
          <div className="p-4 border-b border-border/60 flex flex-wrap gap-4 items-center justify-between bg-muted/20 print:hidden text-xs">
            {interfaceDetailLevel === 'focused' ? (
              // FOCUSED VIEW LAYOUT
              <>
                <div className="flex flex-wrap items-center gap-2 w-full">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search matching records..."
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="w-full pl-9 pr-4 py-2 bg-muted rounded-xl border border-border outline-none text-xs text-foreground"
                    />
                  </div>
                  <FiltersAndToolsButton
                    isOpen={showFilters}
                    onClick={() => setShowFilters(!showFilters)}
                    activeFiltersCount={0}
                    onClearFilters={() => {}}
                  />
                </div>

                <AdvancedControlsPanel isOpen={showFilters} onClose={() => setShowFilters(false)}>
                  <div className="space-y-4 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Page Size Select */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground font-bold">Page Size:</span>
                        <select
                          value={pageSize}
                          onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                          className="px-2.5 py-1.5 bg-muted rounded-lg border border-border font-bold outline-none cursor-pointer text-foreground"
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>

                      {/* Column Visibility Selector (rendered inline for simplicity inside the panel) */}
                      <div className="space-y-2">
                        <span className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-wider block">Visible Columns</span>
                        <div className="flex flex-wrap gap-3">
                          {Object.keys(visibleColumns).map(colKey => (
                            <label key={colKey} className="flex items-center gap-2 font-semibold text-xs cursor-pointer select-none text-foreground hover:text-indigo-650">
                              <input
                                type="checkbox"
                                checked={visibleColumns[colKey] !== false}
                                onChange={e => {
                                  setVisibleColumns(prev => ({
                                    ...prev,
                                    [colKey]: e.target.checked
                                  }));
                                }}
                                className="rounded border-border text-indigo-650 focus:ring-0 cursor-pointer"
                              />
                              <span className="capitalize">{colKey.replace('_', ' ')}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </AdvancedControlsPanel>
              </>
            ) : (
              // ADVANCED VIEW LAYOUT
              <>
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search matching records..."
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="w-full pl-9 pr-4 py-2 bg-muted rounded-xl border border-border outline-none text-xs text-foreground"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Page Size Select */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground font-bold">Page Size:</span>
                    <select
                      value={pageSize}
                      onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                      className="px-2.5 py-1.5 bg-muted rounded-lg border border-border font-bold outline-none cursor-pointer text-foreground"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  {/* Column Visibility Selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                      className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg border border-border flex items-center gap-1.5 cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" /> Columns
                    </button>

                    {showColumnDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg p-3 z-40 space-y-2">
                        <div className="flex justify-between items-center pb-1.5 border-b border-border/40">
                          <span className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-wider">Visible Columns</span>
                          <button onClick={() => setShowColumnDropdown(false)} className="text-muted-foreground hover:text-foreground">✕</button>
                        </div>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {Object.keys(visibleColumns).map(colKey => (
                            <label key={colKey} className="flex items-center gap-2 font-semibold text-xs cursor-pointer select-none text-foreground hover:text-indigo-650">
                              <input
                                type="checkbox"
                                checked={visibleColumns[colKey] !== false}
                                onChange={e => {
                                  setVisibleColumns(prev => ({
                                    ...prev,
                                    [colKey]: e.target.checked
                                  }));
                                }}
                                className="rounded border-border text-indigo-650 focus:ring-0 cursor-pointer"
                              />
                              <span className="capitalize">{colKey.replace('_', ' ')}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="p-4 border-b border-border/60 flex justify-between items-center bg-muted/5 text-xs">
            <span className="font-bold text-foreground">
              Matching records: <span className="text-indigo-650 dark:text-indigo-400">{sortedRecords.length} total</span>
            </span>
            <span className="text-[10px] text-muted-foreground font-bold">
              Sorted by: {sortBy} ({sortOrder})
            </span>
          </div>

          <div className="overflow-x-auto">
            {source === 'Requirements' && (
              <table className="min-w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/80 text-muted-foreground uppercase font-bold text-[9px] tracking-wider">
                    {visibleColumns.title !== false && <th className="p-3 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('name')}>Requirement Title</th>}
                    {visibleColumns.category !== false && <th className="p-3 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('category')}>Category</th>}
                    {visibleColumns.status !== false && <th className="p-3 cursor-pointer hover:bg-muted/80 text-center" onClick={() => handleSort('status')}>RAG Status</th>}
                    {visibleColumns.risk !== false && <th className="p-3 cursor-pointer hover:bg-muted/80 text-center" onClick={() => handleSort('risk')}>Risk Level</th>}
                    {visibleColumns.owner !== false && <th className="p-3">Owner</th>}
                    <th className="p-3 text-center print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(paginatedRecords as Requirement[]).map((r) => {
                    const status = readinessByRequirementId.get(r.id)?.status || 'GREY';
                    return (
                      <tr key={r.id} className="hover:bg-muted/10">
                        {visibleColumns.title !== false && <td className="p-3 font-bold text-foreground truncate max-w-xs">{r.title}</td>}
                        {visibleColumns.category !== false && <td className="p-3 text-muted-foreground font-semibold">{r.category}</td>}
                        {visibleColumns.status !== false && (
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase border ${
                              status === 'GREEN' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-650' :
                              status === 'AMBER' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                              status === 'RED' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' :
                              'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                            }`}>
                              {status === 'GREEN' ? 'Compliant' : status === 'AMBER' ? 'Warning' : status === 'RED' ? 'Gap' : 'Excluded'}
                            </span>
                          </td>
                        )}
                        {visibleColumns.risk !== false && <td className="p-3 text-center font-bold">{r.risk_level || 'Low'}</td>}
                        {visibleColumns.owner !== false && <td className="p-3 text-muted-foreground">{r.owner || 'Unassigned'}</td>}
                        <td className="p-3 text-center print:hidden">
                          <Link href={`/dashboard/requirements?id=${r.id}`} className="text-indigo-650 hover:underline flex items-center justify-center gap-1 font-bold">
                            Inspect <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {source === 'Evidence' && (
              <table className="min-w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/80 text-muted-foreground uppercase font-bold text-[9px] tracking-wider">
                    {visibleColumns.title !== false && <th className="p-3 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('name')}>File Name</th>}
                    {visibleColumns.category !== false && <th className="p-3 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('category')}>Category</th>}
                    {visibleColumns.status !== false && <th className="p-3 cursor-pointer hover:bg-muted/80 text-center" onClick={() => handleSort('status')}>Status</th>}
                    {visibleColumns.expiry !== false && <th className="p-3">Expiry Date</th>}
                    {visibleColumns.uploaded_by !== false && <th className="p-3">Uploaded By</th>}
                    <th className="p-3 text-center print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(paginatedRecords as EvidenceDocument[]).map((d) => (
                    <tr key={d.id} className="hover:bg-muted/10">
                      {visibleColumns.title !== false && <td className="p-3 font-bold text-foreground truncate max-w-xs">{d.title}</td>}
                      {visibleColumns.category !== false && <td className="p-3 text-muted-foreground font-semibold">{d.category}</td>}
                      {visibleColumns.status !== false && (
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase border ${
                            d.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-650' :
                            d.status === 'Expiring Soon' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                            d.status === 'Expired' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' :
                            'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                          }`}>
                            {d.status}
                          </span>
                        </td>
                      )}
                      {visibleColumns.expiry !== false && <td className="p-3 text-muted-foreground">{d.expiry_date ? new Date(d.expiry_date).toLocaleDateString() : 'No expiry'}</td>}
                      {visibleColumns.uploaded_by !== false && <td className="p-3 text-muted-foreground">{d.uploaded_by || 'Unknown'}</td>}
                      <td className="p-3 text-center print:hidden">
                        <Link href={`/dashboard/vault?id=${d.id}`} className="text-indigo-650 hover:underline flex items-center justify-center gap-1 font-bold">
                          Inspect <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {source === 'Competencies' && (
              <table className="min-w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/80 text-muted-foreground uppercase font-bold text-[9px] tracking-wider">
                    {visibleColumns.name !== false && <th className="p-3 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('name')}>Teammate Name</th>}
                    {visibleColumns.title !== false && <th className="p-3">Competency Title</th>}
                    {visibleColumns.category !== false && <th className="p-3 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('category')}>Category</th>}
                    {visibleColumns.status !== false && <th className="p-3 cursor-pointer hover:bg-muted/80 text-center" onClick={() => handleSort('status')}>Status</th>}
                    {visibleColumns.expiry !== false && <th className="p-3">Expiry Date</th>}
                    <th className="p-3 text-center print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(paginatedRecords as CompetencyDetail[]).map((c, idx) => (
                    <tr key={idx} className="hover:bg-muted/10">
                      {visibleColumns.name !== false && <td className="p-3 font-bold text-foreground">{c.person.display_name}</td>}
                      {visibleColumns.title !== false && <td className="p-3 text-muted-foreground font-semibold">{c.type.title}</td>}
                      {visibleColumns.category !== false && <td className="p-3 text-muted-foreground">{c.type.category}</td>}
                      {visibleColumns.status !== false && (
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase border ${
                            c.status === 'Valid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-650' :
                            c.status === 'Expiring Soon' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                            c.status === 'Expired' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' :
                            'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                      )}
                      {visibleColumns.expiry !== false && <td className="p-3 text-muted-foreground">{c.record?.expiry_date ? new Date(c.record.expiry_date).toLocaleDateString() : 'N/A'}</td>}
                      <td className="p-3 text-center print:hidden">
                        <Link href={`/dashboard/competencies?id=${c.person.id}`} className="text-indigo-650 hover:underline flex items-center justify-center gap-1 font-bold">
                          Inspect <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {source === 'Actions' && (
              <table className="min-w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/80 text-muted-foreground uppercase font-bold text-[9px] tracking-wider">
                    {visibleColumns.description !== false && <th className="p-3 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('name')}>Action Description</th>}
                    {visibleColumns.risk !== false && <th className="p-3 cursor-pointer hover:bg-muted/80 text-center" onClick={() => handleSort('risk')}>Linked Requirement Risk</th>}
                    {visibleColumns.status !== false && <th className="p-3 cursor-pointer hover:bg-muted/80 text-center" onClick={() => handleSort('status')}>Status</th>}
                    {visibleColumns.owner !== false && <th className="p-3">Owner</th>}
                    {visibleColumns.due_date !== false && <th className="p-3">Due Date</th>}
                    <th className="p-3 text-center print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(paginatedRecords as Action[]).map((a) => (
                    <tr key={a.id} className="hover:bg-muted/10">
                      {visibleColumns.description !== false && <td className="p-3 font-bold text-foreground truncate max-w-xs">{a.description}</td>}
                      {visibleColumns.risk !== false && <td className="p-3 text-center font-semibold text-muted-foreground">{getLinkedRequirementRisk(a.id)}</td>}
                      {visibleColumns.status !== false && (
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase border ${
                            a.status === 'Complete' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-650' :
                            a.status === 'In Progress' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                            a.status === 'Open' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' :
                            'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                      )}
                      {visibleColumns.owner !== false && <td className="p-3 text-muted-foreground">{a.owner || 'Unassigned'}</td>}
                      {visibleColumns.due_date !== false && <td className="p-3 text-muted-foreground">{a.target_due_date || a.due_date ? new Date((a.target_due_date || a.due_date) as string).toLocaleDateString() : 'N/A'}</td>}
                      <td className="p-3 text-center print:hidden">
                        <Link href={`/dashboard/requirements?filter=actions&actionId=${a.id}`} className="text-indigo-650 hover:underline flex items-center justify-center gap-1 font-bold">
                          Inspect <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {source === 'Audits' && (
              <table className="min-w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/80 text-muted-foreground uppercase font-bold text-[9px] tracking-wider">
                    {visibleColumns.name !== false && <th className="p-3 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('name')}>Pack Name</th>}
                    {visibleColumns.status !== false && <th className="p-3 cursor-pointer hover:bg-muted/80 text-center" onClick={() => handleSort('status')}>Status</th>}
                    {visibleColumns.requirements !== false && <th className="p-3 text-center">Requirements</th>}
                    {visibleColumns.documents !== false && <th className="p-3 text-center">Documents</th>}
                    <th className="p-3 text-center print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(paginatedRecords as AuditPack[]).map((p) => (
                    <tr key={p.id} className="hover:bg-muted/10">
                      {visibleColumns.name !== false && <td className="p-3 font-bold text-foreground">{p.name}</td>}
                      {visibleColumns.status !== false && (
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase border ${
                            p.status === 'Ready' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-650' :
                            p.status === 'Draft' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                            p.status === 'Sent' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-650' :
                            'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      )}
                      {visibleColumns.requirements !== false && <td className="p-3 text-center text-muted-foreground font-semibold">{(p.requirements || []).length}</td>}
                      {visibleColumns.documents !== false && <td className="p-3 text-center text-muted-foreground font-semibold">{(p.documents || []).length}</td>}
                      <td className="p-3 text-center print:hidden">
                        <Link href={`/dashboard/audit-packs`} className="text-indigo-650 hover:underline flex items-center justify-center gap-1 font-bold">
                          Inspect <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Empty State */}
          {sortedRecords.length === 0 && (
            <div className="p-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
              No report results match the current filters.
            </div>
          )}

          {/* Pagination footer */}
          {sortedRecords.length > 0 && (
            <div className="p-4 border-t border-border/60 flex items-center justify-between text-xs bg-muted/10 print:hidden">
              <span className="text-muted-foreground">
                Page <strong className="text-foreground">{currentPage}</strong> of <strong className="text-foreground">{totalPages}</strong>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 rounded border border-border disabled:opacity-45 disabled:pointer-events-none cursor-pointer text-foreground"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 rounded border border-border disabled:opacity-45 disabled:pointer-events-none cursor-pointer text-foreground"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Report Trust Note */}
      <div className="text-[10px] text-muted-foreground text-center border-t border-border/60 pt-6 mt-12">
        <span className="font-extrabold text-indigo-650 dark:text-indigo-400 block mb-1">REPORT TRUST NOTE</span>
        Reports reflect the records currently held in Vygilence and depend on the completeness and accuracy of the underlying data.
      </div>

      <ConfirmDialog request={confirmRequest} onCancel={() => setConfirmRequest(null)} />
      <InlineToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
