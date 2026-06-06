'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { dbService } from '@/lib/db';
import Link from 'next/link';
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
  Bookmark
} from 'lucide-react';
import {
  Requirement,
  AuditTrailEvent
} from '@/lib/types';
import { ConfirmDialog, ConfirmRequest, InlineToast, ToastState } from '@/components/AppFeedback';
import { calculateCompetencyStatus } from '@/lib/competencyEngine';

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
  | 'saved';

interface SavedReportConfig {
  id: string;
  name: string;
  description: string;
  dataSource: string;
  dimension: string;
  measure: string;
  visualType: string;
  filters: Record<string, string>;
  createdAt: string;
}

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

  // Loading admin trail logs
  const [auditTrailEvents, setAuditTrailEvents] = useState<AuditTrailEvent[]>([]);
  const isOwnerOrAdmin = user?.role === 'Owner' || user?.role === 'Admin';

  // State Management
  const [activeTab, setActiveTab] = useState<TabType>('executive');
  const [freshnessTime, setFreshnessTime] = useState<string>('');
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [showFilters, setShowFilters] = useState(false);

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

  // Custom Report Builder States
  const [builderSource, setBuilderSource] = useState('Requirements');
  const [builderDimension, setBuilderDimension] = useState('category');
  const [builderMeasure, setBuilderMeasure] = useState('count');
  const [builderVisual, setBuilderVisual] = useState('bar');
  const [builderReportName, setBuilderReportName] = useState('');
  const [builderReportDesc, setBuilderReportDesc] = useState('');

  // Saved Reports List
  const [savedReports, setSavedReports] = useState<SavedReportConfig[]>([]);

  // Pivot View States
  const [pivotRow, setPivotRow] = useState('category');
  const [pivotCol, setPivotCol] = useState('status');

  // Set freshness timestamp on load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFreshnessTime(new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    
    // Load saved reports
    if (typeof window !== 'undefined' && user && organization) {
      const stored = localStorage.getItem(`${SAVED_REPORTS_KEY}_${user.id}_${organization.id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (!Array.isArray(parsed)) throw new Error('Saved report data is not an array.');
          setSavedReports(parsed);
        } catch (e) {
          console.error('Failed to parse saved reports', e);
          localStorage.removeItem(`${SAVED_REPORTS_KEY}_${user.id}_${organization.id}`);
          setSavedReports([]);
        }
      }
    }
  }, [user, organization]);

  // Audit data is fetched only for authorised users when an audit-backed tab needs it.
  useEffect(() => {
    const needsAuditData = activeTab === 'executive' || activeTab === 'audits' || activeTab === 'administration' || (activeTab === 'builder' && builderSource === 'Audit Trail');
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

  // Donut segment math
  const renderSVDonut = (data: Array<{ value: number; color: string; label: string }>) => {
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
      const percentage = (item.value / total) * 100;
      const strokeDash = `${percentage} ${100 - percentage}`;
      const strokeOffset = 100 - accumulatedPercentage + 25; // start from 12 o'clock
      accumulatedPercentage += percentage;
      return { strokeDash, strokeOffset, color: item.color, label: item.label, value: item.value };
    });

    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        <div className="relative w-36 h-36">
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
                strokeWidth="3.2"
                strokeDasharray={seg.strokeDash}
                strokeDashoffset={seg.strokeOffset}
                className="transition-all duration-300 hover:stroke-[4]"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-black text-foreground">{total}</span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-extrabold">total</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5 text-xs w-full max-w-[200px]">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center justify-between border-b border-border/40 pb-1">
              <span className="flex items-center gap-2 text-muted-foreground font-semibold">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                {seg.label}
              </span>
              <span className="font-extrabold text-foreground">{seg.value} ({Math.round((seg.value / total) * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Sparkline Chart (Area/Line SVG)
  const renderSVGSparkline = (dataPoints: number[], labels: string[], areaColor = 'rgba(79, 70, 229, 0.15)', strokeColor = '#4f46e5') => {
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

    return (
      <div className="relative">
        <svg className="w-full h-20" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <path d={areaPath} fill={areaColor} />
          <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {svgPoints.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="3.5"
              fill="hsl(var(--card))"
              stroke={strokeColor}
              strokeWidth="2"
              className="cursor-pointer hover:r-5 transition-all duration-150"
            >
              <title>{`${labels[i]}: ${dataPoints[i]}`}</title>
            </circle>
          ))}
        </svg>
        <div className="flex justify-between text-[9px] text-muted-foreground uppercase font-bold tracking-wider pt-2 border-t border-border/40 mt-1">
          <span>{labels[0]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      </div>
    );
  };

  // Horizontal bar progress lists
  const renderHorizontalBarList = (list: Array<{ label: string; count: number; colorClass: string; total: number }>) => {
    return (
      <div className="space-y-3">
        {list.slice(0, 6).map((item, idx) => {
          const percentage = item.total > 0 ? (item.count / item.total) * 100 : 0;
          return (
            <div key={idx} className="space-y-1.5">
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

  const pivotGridData = useMemo(() => {
    // We aggregate over frameworkRequirements (or documents) based on Row and Col keys
    const rowField = pivotRow as keyof Requirement;
    const colField = pivotCol as keyof Requirement;

    const rowValues = new Set<string>();
    const colValues = new Set<string>();

    filteredReqs.forEach(r => {
      const rVal = String(r[rowField] || 'Unassigned');
      const cVal = String(r[colField] || 'Unassigned');
      rowValues.add(rVal);
      colValues.add(cVal);
    });

    const rowArr = Array.from(rowValues).sort();
    const colArr = Array.from(colValues).sort();

    const matrix: Record<string, Record<string, number>> = {};
    rowArr.forEach(r => {
      matrix[r] = {};
      colArr.forEach(c => {
        matrix[r][c] = 0;
      });
    });

    filteredReqs.forEach(r => {
      const rVal = String(r[rowField] || 'Unassigned');
      const cVal = String(r[colField] || 'Unassigned');
      matrix[rVal][cVal] += 1;
    });

    return { rowArr, colArr, matrix };
  }, [filteredReqs, pivotRow, pivotCol]);

  // ---------------- CUSTOM BUILDER DATA PREVIEW ----------------

  const builderReportData = useMemo(() => {
    let sourceData: Array<Record<string, unknown>> = [];
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

    const aggregationMap = new Map<string, number>();
    sourceData.forEach(item => {
      const key = String(item[builderDimension as keyof typeof item] || 'Unknown/Other');
      aggregationMap.set(key, (aggregationMap.get(key) || 0) + 1);
    });

    return Array.from(aggregationMap.entries()).map(([label, value]) => ({ label, value }));
  }, [builderSource, builderDimension, filteredReqs, filteredDocs, filteredCompetencyRecords, filteredActions, auditTrailEvents, readinessByRequirementId, isOwnerOrAdmin]);

  const handleExportBuilderCSV = () => {
    const reportName = builderReportName.trim() || `${builderSource} by ${builderDimension}`;
    if (builderVisual === 'pivot' && builderSource === 'Requirements') {
      const headers = [pivotRow, ...pivotGridData.colArr, 'Row Total'];
      const rows = pivotGridData.rowArr.map(row => {
        const values = pivotGridData.colArr.map(column => pivotGridData.matrix[row][column] || 0);
        return [row, ...values.map(String), String(values.reduce((sum, value) => sum + value, 0))];
      });
      handleExportCSV(reportName, headers, rows);
      return;
    }
    handleExportCSV(
      reportName,
      [builderDimension, 'Count'],
      builderReportData.map(item => [item.label, String(item.value)])
    );
  };

  // Save Custom Report Config
  const handleSaveCustomReport = () => {
    if (!builderReportName.trim()) {
      setToast({ type: 'error', message: 'Please provide a name for the report.' });
      return;
    }

    const newReport: SavedReportConfig = {
      id: `rep-${Math.random().toString(36).substr(2, 9)}`,
      name: builderReportName.trim(),
      description: builderReportDesc.trim() || 'No description provided.',
      dataSource: builderSource,
      dimension: builderDimension,
      measure: builderMeasure,
      visualType: builderVisual,
      filters: {
        category: selectedCategory,
        status: selectedStatus,
        risk: selectedRisk
      },
      createdAt: new Date().toISOString()
    };

    const updated = [...savedReports, newReport];
    setSavedReports(updated);
    if (user && organization) {
      try {
        localStorage.setItem(`${SAVED_REPORTS_KEY}_${user.id}_${organization.id}`, JSON.stringify(updated));
      } catch {
        setToast({ type: 'error', message: 'The report could not be saved in this browser.' });
        return;
      }
    }
    setBuilderReportName('');
    setBuilderReportDesc('');
    setToast({ type: 'success', message: `Report "${newReport.name}" saved to Saved Reports.` });
    setActiveTab('saved');
  };

  // Delete Saved Report
  const handleDeleteSavedReport = (id: string, name: string) => {
    setConfirmRequest({
      title: 'Delete Saved Report?',
      description: `Are you sure you want to delete the report "${name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      onConfirm: () => {
        const updated = savedReports.filter(r => r.id !== id);
        setSavedReports(updated);
        if (user && organization) {
          try {
            localStorage.setItem(`${SAVED_REPORTS_KEY}_${user.id}_${organization.id}`, JSON.stringify(updated));
          } catch {
            setToast({ type: 'error', message: 'The saved report could not be removed from this browser.' });
            return;
          }
        }
        setToast({ type: 'success', message: 'Saved report deleted successfully.' });
      }
    });
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
          { id: 'builder', name: 'Report Builder', icon: SlidersHorizontal },
          { id: 'saved', name: 'Personal Saved Reports', icon: Bookmark }
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
              <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Workspace Overall Readiness</span>
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

              <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Requirements</span>
                  <span className="text-3xl font-black text-foreground">{filteredReqs.length}</span>
                </div>
                <span className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </span>
              </div>

              <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Evidence Files</span>
                  <span className="text-3xl font-black text-foreground">{filteredDocs.length}</span>
                </div>
                <span className="p-2.5 bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </span>
              </div>

              <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Open Actions</span>
                  <span className="text-3xl font-black text-foreground">{filteredActions.filter(a => a.status !== 'Complete' && a.status !== 'Cancelled').length}</span>
                </div>
                <span className="p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
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
                ])}
              </div>

              {/* Card 2: Evidence upload activity */}
              <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Evidence Upload Activity</h3>
                <p className="text-[10px] text-muted-foreground">Actual document uploads by month. This is activity, not a historical readiness score.</p>
                <div className="pt-2">
                  {renderSVGSparkline(documentUploadTrend.points, documentUploadTrend.labels)}
                </div>
              </div>

              {/* Card 3: Upcoming obligations forecast */}
              <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Upcoming Scheduled Records</h3>
                <p className="text-[10px] text-muted-foreground">Exclusive windows; overdue records are not included.</p>
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-center p-2.5 bg-muted/40 rounded-xl border border-border/40">
                    <span className="font-bold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> 0-7 Days</span>
                    <span className="font-extrabold text-foreground">{upcomingReviews.w7 + upcomingEvidenceExpiries.w7 + upcomingTrainingRenewals.w7} items</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-muted/40 rounded-xl border border-border/40">
                    <span className="font-bold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> 8-30 Days</span>
                    <span className="font-extrabold text-foreground">{upcomingReviews.w30 + upcomingEvidenceExpiries.w30 + upcomingTrainingRenewals.w30} items</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-muted/40 rounded-xl border border-border/40">
                    <span className="font-bold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> 31-60 Days</span>
                    <span className="font-extrabold text-foreground">{upcomingReviews.w60 + upcomingEvidenceExpiries.w60 + upcomingTrainingRenewals.w60} items</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-muted/40 rounded-xl border border-border/40">
                    <span className="font-bold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> 61-90 Days</span>
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
                  }).filter(item => item.total > 0)
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
              <div className="bg-card border border-border p-4 rounded-xl text-center space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Total Evidence Documents</span>
                <span className="text-3xl font-black text-foreground">{filteredDocs.length}</span>
              </div>
              <div className="bg-card border border-border p-4 rounded-xl text-center space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Missing Dates / Metadata Expiry</span>
                <span className="text-3xl font-black text-rose-500">{dataQualityReport.missingDatesPercent}%</span>
              </div>
              <div className="bg-card border border-border p-4 rounded-xl text-center space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Duplicate File Hashes Detected</span>
                <span className="text-3xl font-black text-amber-500">{dataQualityReport.duplicateHashesCount}</span>
              </div>
              <div className="bg-card border border-border p-4 rounded-xl text-center space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Linked to Requirements</span>
                <span className="text-3xl font-black text-emerald-500">{evidenceLinkMetrics.linked}</span>
              </div>
              <div className="bg-card border border-border p-4 rounded-xl text-center space-y-1">
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
                ])}
              </div>

              <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Document Uploads Trend</h3>
                <p className="text-[10px] text-muted-foreground">Actual evidence documents uploaded in each month.</p>
                <div className="pt-2">
                  {renderSVGSparkline(documentUploadTrend.points, documentUploadTrend.labels)}
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
                      colorClass: 'bg-emerald-500'
                    };
                  })
                )}
                {filteredPeople.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-6">No personnel records found.</div>
                )}
              </div>

              <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Competency Gaps by Risk Level</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-xl">
                    <span className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> High Risk Competency Gaps</span>
                    <span className="font-extrabold">{filteredCompetencySummary.expired + filteredCompetencySummary.missing} records</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl">
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
              <div className="bg-card border border-border p-4 rounded-xl text-center space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Open Actions</span>
                <span className="text-3xl font-black text-foreground">{actionMetrics.open}</span>
              </div>
              <div className="bg-card border border-border p-4 rounded-xl text-center space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Overdue Open Actions</span>
                <span className="text-3xl font-black text-rose-500">{actionMetrics.overdue}</span>
              </div>
              <div className="bg-card border border-border p-4 rounded-xl text-center space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Completed Actions</span>
                <span className="text-3xl font-black text-emerald-500">{actionMetrics.completed}</span>
              </div>
              <div className="bg-card border border-border p-4 rounded-xl text-center space-y-1">
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
                ])}
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
                  })
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Audit Packs Status</h3>
                {renderSVDonut([
                  { value: auditPacks.filter(p => p.status === 'Ready').length, color: '#10b981', label: 'Ready' },
                  { value: auditPacks.filter(p => p.status === 'Draft').length, color: '#f59e0b', label: 'Draft' },
                  { value: auditPacks.filter(p => p.status === 'Sent').length, color: '#4f46e5', label: 'Sent' },
                  { value: auditPacks.filter(p => p.status === 'Archived').length, color: '#71717a', label: 'Archived' }
                ])}
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
        {activeTab === 'saved' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedReports.map(rep => (
                <div key={rep.id} className="bg-card border border-border p-5 rounded-2xl space-y-3 flex flex-col justify-between shadow-xs">
                  <div className="space-y-1">
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-indigo-650 dark:text-indigo-400" />
                      {rep.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{rep.description}</p>
                    <div className="flex gap-2 pt-2 text-[10px] text-muted-foreground font-semibold">
                      <span>Source: {rep.dataSource}</span>
                      <span>|</span>
                      <span>Dimension: {rep.dimension}</span>
                      <span>|</span>
                      <span>Created: {new Date(rep.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-border/40">
                    <button
                      onClick={() => {
                        const allowedSource = rep.dataSource === 'Audit Trail' && !isOwnerOrAdmin ? 'Requirements' : rep.dataSource;
                        setBuilderSource(allowedSource);
                        setBuilderDimension(allowedSource === rep.dataSource ? rep.dimension : 'category');
                        setBuilderMeasure(rep.measure);
                        setBuilderVisual(allowedSource === 'Requirements' ? rep.visualType : rep.visualType === 'pivot' ? 'table' : rep.visualType);
                        setSelectedCategory(rep.filters.category || 'All');
                        setSelectedStatus(rep.filters.status || 'All');
                        setSelectedRisk(rep.filters.risk || 'All');
                        setActiveTab('builder');
                        setToast({ type: 'info', message: `Loaded config for report "${rep.name}"` });
                      }}
                      className="px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-bold text-xs rounded-lg hover:bg-indigo-500/20 cursor-pointer"
                    >
                      Open Report Builder
                    </button>
                    <button
                      onClick={() => handleDeleteSavedReport(rep.id, rep.name)}
                      className="px-3 py-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-lg hover:bg-rose-500/20 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {savedReports.length === 0 && (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl col-span-2">
                  No saved reports configuration found. Use the Custom Report Builder to save templates.
                </div>
              )}
            </div>
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
                        setBuilderSource(e.target.value);
                        if (e.target.value !== 'Requirements' && builderVisual === 'pivot') setBuilderVisual('table');
                        if (e.target.value === 'Evidence') setBuilderDimension('category');
                        else if (e.target.value === 'Requirements') setBuilderDimension('category');
                        else if (e.target.value === 'Competencies') setBuilderDimension('status');
                        else if (e.target.value === 'Actions') setBuilderDimension('status');
                        else if (e.target.value === 'Audit Trail') setBuilderDimension('action_category');
                      }}
                      className="w-full px-2.5 py-2 bg-muted rounded-xl border border-border/80 outline-none font-semibold text-foreground"
                    >
                      <option value="Requirements">Requirements & Readiness</option>
                      <option value="Evidence">Evidence Documents</option>
                      <option value="Competencies">Competencies & People</option>
                      <option value="Actions">Corrective Actions Registry</option>
                      {isOwnerOrAdmin && <option value="Audit Trail">Audit Logs Trail</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-muted-foreground uppercase mb-1.5">Grouping Dimension</label>
                    <select
                      value={builderDimension}
                      onChange={e => setBuilderDimension(e.target.value)}
                      className="w-full px-2.5 py-2 bg-muted rounded-xl border border-border/80 outline-none font-semibold text-foreground"
                    >
                      {builderSource === 'Requirements' && (
                        <>
                          <option value="category">Category</option>
                          <option value="status">RAG Status</option>
                          <option value="risk_level">Risk Level</option>
                          <option value="owner">Owner</option>
                        </>
                      )}
                      {builderSource === 'Evidence' && (
                        <>
                          <option value="category">Category</option>
                          <option value="status">Status</option>
                          <option value="uploaded_by">Uploaded By</option>
                        </>
                      )}
                      {builderSource === 'Competencies' && (
                        <>
                          <option value="status">Status</option>
                          <option value="trainer">Trainer</option>
                          <option value="provider">Provider</option>
                        </>
                      )}
                      {builderSource === 'Actions' && (
                        <>
                          <option value="status">Status</option>
                          <option value="owner">Owner</option>
                        </>
                      )}
                      {builderSource === 'Audit Trail' && (
                        <>
                          <option value="action_category">Event Category</option>
                          <option value="actor_name">Actor Name</option>
                          <option value="severity">Severity</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-muted-foreground uppercase mb-1.5">Aggregation Measure</label>
                    <select
                      value={builderMeasure}
                      onChange={e => setBuilderMeasure(e.target.value)}
                      className="w-full px-2.5 py-2 bg-muted rounded-xl border border-border/80 outline-none font-semibold text-foreground"
                    >
                      <option value="count">Count of Records</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-muted-foreground uppercase mb-1.5">Visualization Type</label>
                    <select
                      value={builderVisual}
                      onChange={e => setBuilderVisual(e.target.value)}
                      className="w-full px-2.5 py-2 bg-muted rounded-xl border border-border/80 outline-none font-semibold text-foreground"
                    >
                      <option value="bar">Bar Chart</option>
                      <option value="donut">Donut Chart</option>
                      <option value="table">Data Grid Table</option>
                      {builderSource === 'Requirements' && <option value="pivot">Pivot Matrix Grid</option>}
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
                  <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">Interactive Report Preview</h3>
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] text-muted-foreground font-bold px-2 py-0.5 bg-muted rounded-full">
                      Live aggregate: {builderReportData.length} groups
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
                  }))
                )}

                {builderVisual === 'table' && (
                  <div className="border border-border rounded-xl overflow-hidden divide-y divide-border/60 text-xs">
                    <div className="grid grid-cols-2 bg-muted/65 p-2 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                      <span>Grouping Label</span>
                      <span>Records Count</span>
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
                    <p className="text-[10px] text-muted-foreground">Pivot matrices are available for Requirements using count aggregation.</p>
                    <div className="flex gap-4 text-xs font-semibold pb-3 border-b border-border/40">
                      <div>
                        <span className="text-muted-foreground block text-[9px] font-bold uppercase mb-1">Rows Field</span>
                        <select
                          value={pivotRow}
                          onChange={e => setPivotRow(e.target.value)}
                          className="px-2 py-1 bg-muted border border-border/60 rounded"
                        >
                          <option value="category">Category</option>
                          <option value="risk_level">Risk Level</option>
                          <option value="owner">Owner</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9px] font-bold uppercase mb-1">Columns Field</span>
                        <select
                          value={pivotCol}
                          onChange={e => setPivotCol(e.target.value)}
                          className="px-2 py-1 bg-muted border border-border/60 rounded"
                        >
                          <option value="status">RAG Status</option>
                          <option value="risk_level">Risk Level</option>
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
                            <th className="border border-border/60 p-2 text-center">Row Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pivotGridData.rowArr.map(r => {
                            let rowTotal = 0;
                            return (
                              <tr key={r} className="hover:bg-muted/10">
                                <td className="border border-border/60 p-2 font-bold">{r}</td>
                                {pivotGridData.colArr.map(c => {
                                  const val = pivotGridData.matrix[r][c] || 0;
                                  rowTotal += val;
                                  return (
                                    <td key={c} className="border border-border/60 p-2 text-center font-semibold text-muted-foreground">{val}</td>
                                  );
                                })}
                                <td className="border border-border/60 p-2 text-center font-bold text-foreground">{rowTotal}</td>
                              </tr>
                            );
                          })}
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

      <ConfirmDialog request={confirmRequest} onCancel={() => setConfirmRequest(null)} />
      <InlineToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
