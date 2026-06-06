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
  Download,
  Calendar,
  AlertTriangle,
  FileText,
  ChevronLeft,
  Filter,
  X,
  ChevronDown,
  Info,
  CheckCircle2,
  SlidersHorizontal,
  Bookmark,
  ExternalLink
} from 'lucide-react';
import {
  Requirement,
  EvidenceDocument,
  Action,
  CompetencyRecord,
  Person,
  AuditPack,
  AuditTrailEvent,
  CellStatus,
  DocumentStatus,
  ActionStatus,
  CompetencyStatus
} from '@/lib/types';
import { ConfirmDialog, ConfirmRequest, InlineToast, ToastState } from '@/components/AppFeedback';
import { calculateCompetencyStatus } from '@/lib/competencyEngine';

export default function ReportDetailPage() {
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
    requirementActions
  } = useApp();

  const router = useRouter();

  // Load audit trail events for Admin reports
  const [auditTrailEvents, setAuditTrailEvents] = useState<AuditTrailEvent[]>([]);
  const isOwnerOrAdmin = user?.role === 'Owner' || user?.role === 'Admin';

  // State
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Helper to find linked requirement risk
  const getLinkedRequirementRisk = useCallback((actionId: string) => {
    const link = requirementActions.find(la => la.action_id === actionId);
    if (!link) return 'Not recorded';
    const req = frameworkRequirements.find(r => r.id === link.requirement_id);
    return req?.risk_level || 'Not recorded';
  }, [requirementActions, frameworkRequirements]);

  // Filter overrides from query parameters
  const [source, setSource] = useState<string>('');
  const [reportKey, setReportKey] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [ownerFilter, setOwnerFilter] = useState<string>('All');
  const [riskFilter, setRiskFilter] = useState<string>('All');

  // Fetch initial params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setSource(params.get('source') || '');
      setReportKey(params.get('reportKey') || '');
      setStatusFilter(params.get('status') || 'All');
      setCategoryFilter(params.get('category') || 'All');
      setOwnerFilter(params.get('owner') || 'All');
      setRiskFilter(params.get('risk') || 'All');
    }
  }, []);

  // Back tab tracking (decides which parent reports tab to open when clicking Back)
  const parentTab = useMemo(() => {
    if (source === 'Requirements') return 'requirements';
    if (source === 'Evidence') return 'evidence';
    if (source === 'Competencies') return 'competencies';
    if (source === 'Actions') return 'actions';
    if (source === 'Audits') return 'audits';
    if (source === 'Audit Trail') return 'administration';
    return 'executive';
  }, [source]);

  // Compute readiness mapping
  const readinessByRequirementId = useMemo(
    () => new Map(readinessReport.requirements.map(item => [item.requirement.id, item])),
    [readinessReport.requirements]
  );

  // Filtered lists
  const records = useMemo(() => {
    if (source === 'Requirements') {
      return frameworkRequirements.filter(r => {
        const lifecycle = r.lifecycle_status || 'ACTIVE';
        if (lifecycle === 'DELETED') return false;
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
      const activeTypes = new Set(competencyTypes.filter(t => t.active).map(t => t.id));
      const activePeopleIds = new Set(people.filter(p => p.active).map(p => p.id));
      const recordsByCell = new Map(
        competencyRecords.map(record => [`${record.person_id}:${record.competency_type_id}`, record])
      );

      const list: Array<{ person: Person; type: any; status: string; record: CompetencyRecord | null }> = [];
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
  }, [source, frameworkRequirements, documents, competencyRecords, competencyTypes, people, actions, auditPacks, categoryFilter, ownerFilter, riskFilter, statusFilter, readinessByRequirementId, requirementActions, getLinkedRequirementRisk]);

  // Sort records
  const sortedRecords = useMemo(() => {
    const list = [...records];
    list.sort((a: any, b: any) => {
      let valA: any = '';
      let valB: any = '';

      if (source === 'Requirements') {
        if (sortBy === 'name') { valA = a.title; valB = b.title; }
        else if (sortBy === 'category') { valA = a.category; valB = b.category; }
        else if (sortBy === 'status') { valA = readinessByRequirementId.get(a.id)?.status || ''; valB = readinessByRequirementId.get(b.id)?.status || ''; }
        else if (sortBy === 'risk') { valA = a.risk_level; valB = b.risk_level; }
      } else if (source === 'Evidence') {
        if (sortBy === 'name') { valA = a.title; valB = b.title; }
        else if (sortBy === 'category') { valA = a.category; valB = b.category; }
        else if (sortBy === 'status') { valA = a.status; valB = b.status; }
      } else if (source === 'Competencies') {
        if (sortBy === 'name') { valA = a.person.display_name; valB = b.person.display_name; }
        else if (sortBy === 'category') { valA = a.type.category; valB = b.type.category; }
        else if (sortBy === 'status') { valA = a.status; valB = b.status; }
      } else if (source === 'Actions') {
        if (sortBy === 'name') { valA = a.description; valB = b.description; }
        else if (sortBy === 'status') { valA = a.status; valB = b.status; }
        else if (sortBy === 'risk') { valA = getLinkedRequirementRisk(a.id); valB = getLinkedRequirementRisk(b.id); }
      } else if (source === 'Audits') {
        if (sortBy === 'name') { valA = a.name; valB = b.name; }
        else if (sortBy === 'status') { valA = a.status; valB = b.status; }
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [records, sortBy, sortOrder, source, readinessByRequirementId]);

  // Paginated records
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;

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
    let headers: string[] = [];
    let rows: string[][] = [];

    if (source === 'Requirements') {
      headers = ['Requirement Title', 'Category', 'RAG Status', 'Risk Level', 'Owner'];
      rows = sortedRecords.map((r: any) => [
        r.title,
        r.category,
        readinessByRequirementId.get(r.id)?.status || 'GREY',
        r.risk_level || 'Low',
        r.owner || 'Unassigned'
      ]);
    } else if (source === 'Evidence') {
      headers = ['Document Name', 'Category', 'Status', 'Expiry Date', 'Uploaded By'];
      rows = sortedRecords.map((d: any) => [
        d.title,
        d.category,
        d.status,
        d.expiry_date || 'N/A',
        d.uploaded_by || 'Unknown'
      ]);
    } else if (source === 'Competencies') {
      headers = ['Teammate Name', 'Competency Title', 'Category', 'Compliance Status', 'Expiry Date'];
      rows = sortedRecords.map((c: any) => [
        c.person.display_name,
        c.type.title,
        c.type.category,
        c.status,
        c.record?.expiry_date || 'N/A'
      ]);
    } else if (source === 'Actions') {
      headers = ['Description', 'Linked Requirement Risk', 'Status', 'Owner', 'Due Date'];
      rows = sortedRecords.map((a: any) => [
        a.description,
        getLinkedRequirementRisk(a.id),
        a.status,
        a.owner || 'Unassigned',
        a.target_due_date || a.due_date || 'N/A'
      ]);
    } else if (source === 'Audits') {
      headers = ['Pack Name', 'Status', 'Requirements Count', 'Documents Count', 'Created At'];
      rows = sortedRecords.map((p: any) => [
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
      <div className="flex items-center justify-between border-b border-border/60 pb-4 print:hidden">
        <button
          onClick={() => router.push(`/dashboard/reports?tab=${parentTab}`)}
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Reports
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportDetailCSV}
            className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-lg border border-border flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={handlePrintDetailPDF}
            className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            Print PDF
          </button>
        </div>
      </div>

      {/* Report Summary Card */}
      <div className="bg-card border border-border p-6 rounded-2xl shadow-xs space-y-4">
        <div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
            {organization?.name || 'Workspace'} • Detail Inspector
          </span>
          <h1 className="text-2xl font-black text-foreground tracking-tight mt-1">
            {source} Compliance Report
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Detailed breakdown of records matching compliance and readiness statuses.
          </p>
        </div>

        {/* Filter Badges Summary */}
        <div className="flex flex-wrap gap-2 text-xs">
          {statusFilter !== 'All' && (
            <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg flex items-center gap-1">
              Status: {statusFilter}
              <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setStatusFilter('All')} />
            </span>
          )}
          {categoryFilter !== 'All' && (
            <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg flex items-center gap-1">
              Category: {categoryFilter}
              <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setCategoryFilter('All')} />
            </span>
          )}
          {ownerFilter !== 'All' && (
            <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg flex items-center gap-1">
              Owner/Person: {ownerFilter}
              <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setOwnerFilter('All')} />
            </span>
          )}
          {riskFilter !== 'All' && (
            <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg flex items-center gap-1">
              Risk: {riskFilter}
              <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setRiskFilter('All')} />
            </span>
          )}
          {(statusFilter !== 'All' || categoryFilter !== 'All' || ownerFilter !== 'All' || riskFilter !== 'All') && (
            <button
              onClick={() => {
                setStatusFilter('All');
                setCategoryFilter('All');
                setOwnerFilter('All');
                setRiskFilter('All');
              }}
              className="text-xs text-indigo-650 dark:text-indigo-400 hover:underline font-bold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Detail Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border/60 flex justify-between items-center bg-muted/20">
          <span className="text-xs font-bold text-foreground">
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
                  <th className="p-3 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('name')}>Requirement Title</th>
                  <th className="p-3 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('category')}>Category</th>
                  <th className="p-3 cursor-pointer hover:bg-muted/80 text-center" onClick={() => handleSort('status')}>RAG Status</th>
                  <th className="p-3 cursor-pointer hover:bg-muted/80 text-center" onClick={() => handleSort('risk')}>Risk Level</th>
                  <th className="p-3">Owner</th>
                  <th className="p-3 text-center print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedRecords.map((r: any) => {
                  const status = readinessByRequirementId.get(r.id)?.status || 'GREY';
                  return (
                    <tr key={r.id} className="hover:bg-muted/10">
                      <td className="p-3 font-bold text-foreground truncate max-w-xs">{r.title}</td>
                      <td className="p-3 text-muted-foreground font-semibold">{r.category}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase border ${
                          status === 'GREEN' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' :
                          status === 'AMBER' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                          status === 'RED' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' :
                          'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                        }`}>
                          {status === 'GREEN' ? 'Compliant' : status === 'AMBER' ? 'Warning' : status === 'RED' ? 'Gap' : 'Excluded'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold">{r.risk_level || 'Low'}</td>
                      <td className="p-3 text-muted-foreground">{r.owner || 'Unassigned'}</td>
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
                  <th className="p-3 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('name')}>File Name</th>
                  <th className="p-3 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('category')}>Category</th>
                  <th className="p-3 cursor-pointer hover:bg-muted/80 text-center" onClick={() => handleSort('status')}>Status</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3">Uploaded By</th>
                  <th className="p-3 text-center print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedRecords.map((d: any) => (
                  <tr key={d.id} className="hover:bg-muted/10">
                    <td className="p-3 font-bold text-foreground truncate max-w-xs">{d.title}</td>
                    <td className="p-3 text-muted-foreground font-semibold">{d.category}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase border ${
                        d.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' :
                        d.status === 'Expiring Soon' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                        d.status === 'Expired' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' :
                        'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{d.expiry_date ? new Date(d.expiry_date).toLocaleDateString() : 'No expiry'}</td>
                    <td className="p-3 text-muted-foreground">{d.uploaded_by || 'Unknown'}</td>
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
                  <th className="p-3 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('name')}>Teammate Name</th>
                  <th className="p-3">Competency Title</th>
                  <th className="p-3 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('category')}>Category</th>
                  <th className="p-3 cursor-pointer hover:bg-muted/80 text-center" onClick={() => handleSort('status')}>Status</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3 text-center print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedRecords.map((c: any, idx: number) => (
                  <tr key={idx} className="hover:bg-muted/10">
                    <td className="p-3 font-bold text-foreground">{c.person.display_name}</td>
                    <td className="p-3 text-muted-foreground font-semibold">{c.type.title}</td>
                    <td className="p-3 text-muted-foreground">{c.type.category}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase border ${
                        c.status === 'Valid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' :
                        c.status === 'Expiring Soon' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                        c.status === 'Expired' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' :
                        'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{c.record?.expiry_date ? new Date(c.record.expiry_date).toLocaleDateString() : 'N/A'}</td>
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
                  <th className="p-3 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('name')}>Action Description</th>
                  <th className="p-3 cursor-pointer hover:bg-muted/80 text-center" onClick={() => handleSort('risk')}>Linked Requirement Risk</th>
                  <th className="p-3 cursor-pointer hover:bg-muted/80 text-center" onClick={() => handleSort('status')}>Status</th>
                  <th className="p-3">Owner</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3 text-center print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedRecords.map((a: any) => (
                  <tr key={a.id} className="hover:bg-muted/10">
                    <td className="p-3 font-bold text-foreground truncate max-w-xs">{a.description}</td>
                    <td className="p-3 text-center font-semibold text-muted-foreground">{getLinkedRequirementRisk(a.id)}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase border ${
                        a.status === 'Complete' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' :
                        a.status === 'In Progress' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                        a.status === 'Open' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' :
                        'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{a.owner || 'Unassigned'}</td>
                    <td className="p-3 text-muted-foreground">{a.target_due_date || a.due_date ? new Date(a.target_due_date || a.due_date).toLocaleDateString() : 'N/A'}</td>
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
                  <th className="p-3 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('name')}>Pack Name</th>
                  <th className="p-3 cursor-pointer hover:bg-muted/80 text-center" onClick={() => handleSort('status')}>Status</th>
                  <th className="p-3 text-center">Requirements</th>
                  <th className="p-3 text-center">Documents</th>
                  <th className="p-3 text-center print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedRecords.map((p: any) => (
                  <tr key={p.id} className="hover:bg-muted/10">
                    <td className="p-3 font-bold text-foreground">{p.name}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase border ${
                        p.status === 'Ready' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' :
                        p.status === 'Draft' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                        p.status === 'Sent' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600' :
                        'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-center text-muted-foreground font-semibold">{(p.requirements || []).length}</td>
                    <td className="p-3 text-center text-muted-foreground font-semibold">{(p.documents || []).length}</td>
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
          <div className="p-12 text-center text-xs text-muted-foreground">
            No records match the current filter criteria.
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
                className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 rounded border border-border disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 rounded border border-border disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Printable Legal Disclaimer */}
      <div className="hidden print:block text-[9px] text-zinc-400 text-center border-t border-zinc-200 pt-6 mt-12">
        Reports reflect the records currently held in Vygilence and depend on the completeness and accuracy of the underlying data.
      </div>

      <ConfirmDialog request={confirmRequest} onCancel={() => setConfirmRequest(null)} />
      <InlineToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
