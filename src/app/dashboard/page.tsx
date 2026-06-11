'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ActionDetailDrawer } from '@/components/ActionDetailDrawer';
import { EvidenceDropzone } from '@/components/EvidenceDropzone';
import { evidenceAcceptAttribute, formatMaxEvidenceUploadSize } from '@/lib/evidenceStorage';
import { isDemoMode } from '@/lib/env';
import type { Action, CompetencyCategory, RequirementRiskLevel, ReviewFrequency } from '@/lib/types';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  ShieldAlert,
  TrendingUp,
  Upload,
  Calendar,
  AlertTriangle,
  FileText,
  ChevronRight,
  X,
  Briefcase,
  ShieldCheck
} from 'lucide-react';

const scoreTone = (score: number | null) => {
  if (score === null) return 'text-muted-foreground';
  if (score >= 80) return 'text-emerald-500';
  if (score >= 50) return 'text-amber-500';
  return 'text-rose-500';
};

const bgScoreTone = (score: number | null) => {
  if (score === null) return 'bg-muted/10 text-muted-foreground border-border/40';
  if (score >= 80) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  if (score >= 50) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
};

type RadarItem = {
  id: string;
  title: string;
  type: 'Requirement' | 'Evidence' | 'Competency' | 'Action' | 'Review';
  dueDate: string;
  status: string;
  owner?: string | null;
  link?: string;
  action?: Action;
};

type DashboardModal = 'requirement' | 'competency' | 'action' | 'audit-pack' | null;
type DashboardTab = 'overview' | 'upcoming-history';

type DashboardRecordTarget = {
  type: RadarItem['type'];
  link?: string;
  action?: Action;
};

const flyoutPanelClass = 'bg-card solid-panel text-foreground border border-border rounded-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 z-[80]';
const requirementRiskLevels: RequirementRiskLevel[] = ['Low', 'Medium', 'High', 'Critical'];
const reviewFrequencies: ReviewFrequency[] = ['Weekly', 'Monthly', 'Quarterly', 'Annually', 'Custom'];
const competencyCategories: CompetencyCategory[] = [
  'Safety',
  'Equipment & Vehicle',
  'Transport',
  'Security',
  'Quality & Compliance',
  'Environmental',
  'Operational',
  'Professional',
  'Industry Certification',
  'Other'
];

export default function DashboardPage() {
  const {
    organization,
    readinessReport,
    readinessScore,
    stats,
    competencySummary,
    documents,
    actions,
    frameworkRequirements,
    requirementDocuments,
    requirementActions,
    actionUpdates,
    actionDocuments,
    auditLogs,
    resetDemoData,
    uploadDocument,
    createFrameworkRequirement,
    createActionForRequirement,
    upsertCompetencyType,
    createPack,
    updateAction,
    addActionUpdate,
    linkDocumentToAction,
    unlinkDocumentFromAction,
    uploadActionAttachment,
    getDocumentSignedUrl,
    findPossibleDuplicateDocuments,
    competencyRecords,
    competencyTypes,
    people,
    assets,
    assetCheckTypes,
    assetCheckAssignments
  } = useApp();

  const router = useRouter();
  const dashboardTabStorageKey = `vygilence_dashboard_tab_${organization?.id || 'workspace'}`;
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('overview');
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Vehicle');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadExpiry, setUploadExpiry] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResettingDemo, setIsResettingDemo] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeFlyout, setActiveFlyout] = useState<string | null>(null);
  const [activeDashboardPanel, setActiveDashboardPanel] = useState<string | null>(null);
  const [selectedAttentionItem, setSelectedAttentionItem] = useState<string | null>(null);
  const [expandedRadarBucket, setExpandedRadarBucket] = useState<string | null>(null);
  const [activeQuickActionModal, setActiveQuickActionModal] = useState<DashboardModal>(null);
  const [quickActionMessage, setQuickActionMessage] = useState('');
  const [quickActionError, setQuickActionError] = useState('');
  const [isQuickActionSaving, setIsQuickActionSaving] = useState(false);
  const [requirementForm, setRequirementForm] = useState({
    title: '',
    category: 'Operations',
    owner: '',
    risk_level: 'Medium' as RequirementRiskLevel,
    review_frequency: 'Annually' as ReviewFrequency,
    next_due_date: '',
    description: ''
  });
  const [competencyForm, setCompetencyForm] = useState({
    title: '',
    category: 'Safety' as CompetencyCategory,
    validity_period_months: '36',
    default_risk_level: 'Medium' as RequirementRiskLevel,
    description: ''
  });
  const [actionForm, setActionForm] = useState({
    requirement_id: '',
    title: '',
    description: '',
    owner: '',
    due_date: ''
  });
  const [auditPackForm, setAuditPackForm] = useState({
    name: '',
    description: '',
    requirementIds: [] as string[]
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(dashboardTabStorageKey);
    if (stored === 'overview' || stored === 'upcoming-history') {
      setDashboardTab(stored);
    }
  }, [dashboardTabStorageKey]);

  useEffect(() => {
    const handleOutsideClick = () => {
      setExpandedRadarBucket(null);
      setActiveDashboardPanel(null);
      setActiveFlyout(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const updateDashboardTab = (tab: DashboardTab) => {
    setDashboardTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem(dashboardTabStorageKey, tab);
    }
  };

  // Status counters for Requirements
  const reqGreen = useMemo(() => readinessReport.requirements.filter(r => r.status === 'GREEN').length, [readinessReport.requirements]);
  const reqAmber = useMemo(() => readinessReport.requirements.filter(r => r.status === 'AMBER').length, [readinessReport.requirements]);
  const reqRed = useMemo(() => readinessReport.requirements.filter(r => r.status === 'RED').length, [readinessReport.requirements]);
  const reqGrey = useMemo(() => readinessReport.requirements.filter(r => !['GREEN', 'AMBER', 'RED'].includes(r.status)).length, [readinessReport.requirements]);

  const openActions = readinessReport.openActionItems.length;
  const unclassifiedDocs = documents.filter(document => document.status === 'Unclassified');
  const selectedActionRequirements = selectedAction
    ? frameworkRequirements.filter(requirement =>
        requirementActions.some(link => link.action_id === selectedAction.id && link.requirement_id === requirement.id)
      )
    : [];
  const currentSelectedAction = selectedAction
    ? actions.find(action => action.id === selectedAction.id) || selectedAction
    : null;

  // Helper: Get status of a check assignment
  const getAssignmentStatus = (asg: any): 'Compliant' | 'Expiring Soon' | 'Expired' | 'Missing' | 'N/A' => {
    if (!asg || !asg.active || !asg.required) return 'N/A';
    if (!asg.next_due_date) return 'Missing';

    const due = new Date(asg.next_due_date).getTime();
    const now = Date.now();
    const warningLimit = (asg.warning_days || 30) * 24 * 60 * 60 * 1000;

    if (due <= now) return 'Expired';
    if (due - now <= warningLimit) return 'Expiring Soon';
    return 'Compliant';
  };

  const overdueAssetChecks = useMemo(() => {
    return (assetCheckAssignments || [])
      .filter(asg => asg.active && asg.required && getAssignmentStatus(asg) === 'Expired')
      .map(asg => {
        const asset = (assets || []).find(a => a.id === asg.asset_id);
        const checkType = (assetCheckTypes || []).find(ct => ct.id === asg.asset_check_type_id);
        return {
          id: `asset-asg-${asg.id}`,
          isOverdue: true,
          link: `/dashboard/matrix?asset=${asset?.id}`,
          requirement: {
            id: asg.id,
            title: `${checkType?.title || 'Check'} - ${asset?.name || 'Asset'}`,
            next_due_date: asg.next_due_date || '',
            category: asset?.asset_type || 'Asset'
          }
        };
      });
  }, [assetCheckAssignments, assets, assetCheckTypes]);

  const upcomingAssetChecks = useMemo(() => {
    return (assetCheckAssignments || [])
      .filter(asg => asg.active && asg.required && getAssignmentStatus(asg) === 'Expiring Soon')
      .map(asg => {
        const asset = (assets || []).find(a => a.id === asg.asset_id);
        const checkType = (assetCheckTypes || []).find(ct => ct.id === asg.asset_check_type_id);
        return {
          id: `asset-asg-${asg.id}`,
          isOverdue: false,
          link: `/dashboard/matrix?asset=${asset?.id}`,
          requirement: {
            id: asg.id,
            title: `${checkType?.title || 'Check'} - ${asset?.name || 'Asset'}`,
            next_due_date: asg.next_due_date || '',
            category: asset?.asset_type || 'Asset'
          }
        };
      });
  }, [assetCheckAssignments, assets, assetCheckTypes]);

  // Setup list for Attention Centre
  const overdueAndUpcoming = [
    ...readinessReport.overdue.map(item => ({ ...item, isOverdue: true, link: `/dashboard/requirements?id=${item.requirement.id}` })),
    ...readinessReport.upcomingDue.map(item => ({ ...item, isOverdue: false, link: `/dashboard/requirements?id=${item.requirement.id}` })),
    ...overdueAssetChecks,
    ...upcomingAssetChecks
  ];

  // Derived progress values for Readiness Breakdown (Section 3)
  const reqProgress = stats.activeRequirements > 0
    ? Math.round((stats.compliantCount / stats.activeRequirements) * 100)
    : 0;

  const compProgress = competencySummary.compliancePercent || 0;

  const classifiedDocsCount = documents.length - unclassifiedDocs.length;
  const docProgress = documents.length > 0
    ? Math.round((classifiedDocsCount / documents.length) * 100)
    : 0;

  const reviewedCount = Math.max(0, stats.activeRequirements - readinessReport.overdue.length);
  const reviewProgress = stats.activeRequirements > 0
    ? Math.round((reviewedCount / stats.activeRequirements) * 100)
    : 0;

  const completedActionsCount = actions.filter(a => a.status === 'Complete' || a.status === 'Cancelled').length;
  const actionProgress = actions.length > 0
    ? Math.round((completedActionsCount / actions.length) * 100)
    : 0;

  const activeActionsCount = actions.filter(action => action.status === 'Open' || action.status === 'In Progress').length;
  const activeRequirements = useMemo(
    () => frameworkRequirements.filter(requirement => (requirement.lifecycle_status || 'ACTIVE') === 'ACTIVE'),
    [frameworkRequirements]
  );

  // Additional counts/helpers for Phase 2
  const getHealthState = (score: number | null) => {
    if (score === null) return 'N/A';
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 30) return 'Poor';
    return 'Critical';
  };

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[d.getMonth()]}`;
  };

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const overdueActionsCount = useMemo(() => {
    return actions.filter(a => {
      if (a.status !== 'Open' && a.status !== 'In Progress') return false;
      const d = a.target_due_date || a.due_date;
      return d && new Date(d) < today;
    }).length;
  }, [actions, today]);

  const dueThisWeekCount = useMemo(() => {
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 7);
    return actions.filter(a => {
      if (a.status !== 'Open' && a.status !== 'In Progress') return false;
      const d = a.target_due_date || a.due_date;
      if (!d) return false;
      const dVal = new Date(d);
      return dVal >= today && dVal <= endOfWeek;
    }).length;
  }, [actions, today]);

  // Aggregate compliance events
  const complianceEvents = useMemo(() => {
    const list: Array<{
      date: Date;
      dateStr: string;
      type: string;
      title: string;
      description: string;
      link: string;
      action?: Action;
    }> = [];

    // 1. Requirement Reviews
    frameworkRequirements.forEach(req => {
      if (req.next_due_date) {
        list.push({
          date: new Date(req.next_due_date),
          dateStr: req.next_due_date,
          type: 'Review',
          title: req.title,
          description: `Review due for requirement: ${req.title}`,
          link: `/dashboard/requirements?id=${req.id}`
        });
      }
    });

    // 2. Competency Expiries
    competencyRecords.forEach(rec => {
      if (rec.expiry_date) {
        const cType = competencyTypes.find(t => t.id === rec.competency_type_id);
        const person = people.find(p => p.id === rec.person_id);
        list.push({
          date: new Date(rec.expiry_date),
          dateStr: rec.expiry_date,
          type: 'Competency Expiry',
          title: `${cType?.title || 'Competency'} expiry`,
          description: `Expiry for ${person?.display_name || 'Staff member'}`,
          link: `/dashboard/competencies?status=Gap&search=${encodeURIComponent(person?.display_name || '')}`
        });
      }
    });

    // 3. Evidence Expiries
    documents.forEach(doc => {
      if (doc.expiry_date) {
        list.push({
          date: new Date(doc.expiry_date),
          dateStr: doc.expiry_date,
          type: 'Evidence Expiry',
          title: doc.title,
          description: `Document expiry: ${doc.title}`,
          link: `/dashboard/vault`
        });
      }
    });

    // 4. Actions Due
    actions.forEach(action => {
      if (action.status === 'Open' || action.status === 'In Progress') {
        const dStr = action.target_due_date || action.due_date;
        if (dStr) {
          list.push({
            date: new Date(dStr),
            dateStr: dStr,
            type: 'Action Due',
            title: action.title,
            description: `Gap action due: ${action.title}`,
            action,
            link: '#action'
          });
        }
      }
    });

    return list
      .filter(e => e.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [frameworkRequirements, competencyRecords, competencyTypes, people, documents, actions, today]);

  const openDashboardRecord = (target: DashboardRecordTarget) => {
    setActiveFlyout(null);
    setActiveDashboardPanel(null);
    setSelectedAttentionItem(null);
    setExpandedRadarBucket(null);
    if (target.action) {
      setSelectedAction(target.action);
      return;
    }
    if (target.link) {
      router.push(target.link);
    }
  };

  const openComplianceEvent = (event: { link: string; action?: Action }) => {
    openDashboardRecord({
      type: 'Review',
      link: event.link === '#action' ? undefined : event.link,
      action: event.action
    });
  };

  const openRadarItem = (item: RadarItem) => {
    openDashboardRecord(item);
  };

  const openAttentionAction = (action: Action) => {
    setSelectedAttentionItem(`action-${action.id}`);
    setActiveFlyout(null);
    setActiveDashboardPanel(null);
    setExpandedRadarBucket(null);
    setSelectedAction(action);
  };

  const radarBuckets = useMemo(() => {
    const addDays = (d: Date, days: number) => {
      const r = new Date(d);
      r.setDate(r.getDate() + days);
      return r;
    };
    const day30 = addDays(today, 30);
    const day60 = addDays(today, 60);
    const day90 = addDays(today, 90);
    const items: RadarItem[] = [];

    frameworkRequirements.forEach(req => {
      if (!req.next_due_date) return;
      if (req.lifecycle_status && req.lifecycle_status !== 'ACTIVE') return;
      items.push({
        id: `requirement-${req.id}`,
        title: req.title,
        type: 'Requirement',
        dueDate: req.next_due_date,
        status: req.status,
        owner: req.owner,
        link: `/dashboard/requirements?id=${req.id}`
      });
    });

    documents.forEach(document => {
      if (!document.expiry_date) return;
      items.push({
        id: `evidence-${document.id}`,
        title: document.title,
        type: 'Evidence',
        dueDate: document.expiry_date,
        status: document.status,
        owner: document.uploaded_by,
        link: '/dashboard/vault'
      });
    });

    competencyRecords.forEach(record => {
      if (!record.expiry_date) return;
      const competencyType = competencyTypes.find(type => type.id === record.competency_type_id);
      const person = people.find(item => item.id === record.person_id);
      items.push({
        id: `competency-${record.id}`,
        title: competencyType ? `${competencyType.title} - ${person?.display_name || 'Person'}` : person?.display_name || 'Competency record',
        type: 'Competency',
        dueDate: record.expiry_date,
        status: record.status,
        owner: person?.display_name,
        link: `/dashboard/competencies?search=${encodeURIComponent(person?.display_name || '')}`
      });
    });

    actions.forEach(action => {
      if (action.status !== 'Open' && action.status !== 'In Progress') return;
      const dueDate = action.target_due_date || action.due_date;
      if (!dueDate) return;
      items.push({
        id: `action-${action.id}`,
        title: action.title,
        type: 'Action',
        dueDate,
        status: action.status,
        owner: action.owner,
        action
      });
    });

    (assetCheckAssignments || []).forEach(asg => {
      if (!asg.active || !asg.required || !asg.next_due_date) return;
      const asset = (assets || []).find(a => a.id === asg.asset_id);
      const checkType = (assetCheckTypes || []).find(ct => ct.id === asg.asset_check_type_id);
      items.push({
        id: `asset-asg-${asg.id}`,
        title: `${checkType?.title || 'Check'} - ${asset?.name || 'Asset'}`,
        type: 'Review',
        dueDate: asg.next_due_date,
        status: getAssignmentStatus(asg) === 'Expired' ? 'RED' : getAssignmentStatus(asg) === 'Expiring Soon' ? 'AMBER' : 'GREEN',
        owner: asset?.name || 'Asset Check',
        link: `/dashboard/matrix?asset=${asset?.id}`
      });
    });

    const sortByDate = (a: RadarItem, b: RadarItem) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    return {
      overdue: items.filter(item => new Date(item.dueDate) < today).sort(sortByDate),
      due30: items.filter(item => {
        const due = new Date(item.dueDate);
        return due >= today && due <= day30;
      }).sort(sortByDate),
      due60: items.filter(item => {
        const due = new Date(item.dueDate);
        return due > day30 && due <= day60;
      }).sort(sortByDate),
      due90: items.filter(item => {
        const due = new Date(item.dueDate);
        return due > day60 && due <= day90;
      }).sort(sortByDate)
    };
  }, [actions, competencyRecords, competencyTypes, documents, frameworkRequirements, people, today, assets, assetCheckTypes, assetCheckAssignments]);

  const radarRows: Array<{
    label: string;
    items: RadarItem[];
    styleClass: string;
  }> = [
    { label: 'Overdue', items: radarBuckets.overdue, styleClass: 'text-rose-500 font-bold' },
    { label: 'Due 30 Days', items: radarBuckets.due30, styleClass: 'text-amber-500 font-semibold' },
    { label: 'Due 60 Days', items: radarBuckets.due60, styleClass: 'text-foreground/80' },
    { label: 'Due 90 Days', items: radarBuckets.due90, styleClass: 'text-foreground/60' }
  ];

  const quickActions = [
    {
      label: 'Upload Evidence',
      description: 'Upload files and link them to compliance requirements.',
      icon: <Upload className="w-5 h-5" />,
      onClick: () => setIsUploadModalOpen(true)
    },
    {
      label: 'Create Requirement',
      description: 'Define new compliance objectives and criteria.',
      icon: <ShieldCheck className="w-5 h-5" />,
      onClick: () => setActiveQuickActionModal('requirement')
    },
    {
      label: 'Create Competency',
      description: 'Assign training, certifications, and skills to staff.',
      icon: <Briefcase className="w-5 h-5" />,
      onClick: () => setActiveQuickActionModal('competency')
    },
    {
      label: 'Create Action',
      description: 'Track compliance tasks and action items.',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      onClick: () => setActiveQuickActionModal('action')
    },
    {
      label: 'Build Audit Pack',
      description: 'Compile active requirements and evidence into a PDF.',
      icon: <FileText className="w-5 h-5" />,
      onClick: () => setActiveQuickActionModal('audit-pack')
    }
  ];

  const renderQuickActions = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2.5">
      {quickActions.map(action => (
        <button
          key={action.label}
          onClick={action.onClick}
          className="w-full p-3 bg-card/60 dark:bg-muted/10 hover:bg-card hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:border-indigo-500/40 border border-border/80 rounded-2xl text-left transition-all duration-300 group flex items-start gap-3.5 shadow-xs min-h-[84px] cursor-pointer"
        >
          <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shrink-0">
            {action.icon}
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <span className="font-extrabold text-foreground text-xs block leading-none tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">{action.label}</span>
            <p className="text-[10px] text-muted-foreground leading-normal font-medium line-clamp-2">{action.description}</p>
          </div>
        </button>
      ))}
    </div>
  );

  const handleQuickUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!uploadTitle || !uploadFile) return;

    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');
    try {
      await uploadDocument({
        file: uploadFile,
        title: uploadTitle,
        category: uploadCategory,
        expiry_date: uploadExpiry || null,
        issue_date: new Date().toISOString().split('T')[0],
        metadata: {}
      });

      setUploadTitle('');
      setUploadFileName('');
      setUploadFile(null);
      setUploadExpiry('');
      setUploadSuccess('Document uploaded successfully.');
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setUploadSuccess('');
      }, 1500);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetDemoData = async () => {
    setIsResettingDemo(true);
    setResetMessage('');
    setResetError('');
    try {
      await resetDemoData();
      setResetMessage('Demo sample data has been reset.');
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Unable to reset demo data.');
    } finally {
      setIsResettingDemo(false);
    }
  };

  const closeDashboardModal = () => {
    setActiveQuickActionModal(null);
    setQuickActionMessage('');
    setQuickActionError('');
  };

  const handleCreateRequirement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!requirementForm.title.trim()) return;
    setIsQuickActionSaving(true);
    setQuickActionError('');
    setQuickActionMessage('');
    try {
      await createFrameworkRequirement({
        title: requirementForm.title.trim(),
        category: requirementForm.category.trim() || 'Operations',
        owner: requirementForm.owner.trim() || null,
        risk_level: requirementForm.risk_level,
        review_frequency: requirementForm.review_frequency,
        next_due_date: requirementForm.next_due_date || null,
        description: requirementForm.description.trim() || null
      });
      setRequirementForm({
        title: '',
        category: 'Operations',
        owner: '',
        risk_level: 'Medium',
        review_frequency: 'Annually',
        next_due_date: '',
        description: ''
      });
      setQuickActionMessage('Requirement created.');
    } catch (error) {
      setQuickActionError(error instanceof Error ? error.message : 'Unable to create requirement.');
    } finally {
      setIsQuickActionSaving(false);
    }
  };

  const handleCreateCompetency = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!competencyForm.title.trim()) return;
    setIsQuickActionSaving(true);
    setQuickActionError('');
    setQuickActionMessage('');
    try {
      await upsertCompetencyType({
        title: competencyForm.title.trim(),
        category: competencyForm.category,
        description: competencyForm.description.trim() || null,
        validity_period_months: competencyForm.validity_period_months ? Number(competencyForm.validity_period_months) : null,
        refresher_period_months: null,
        evidence_required: true,
        default_risk_level: competencyForm.default_risk_level,
        active: true
      });
      setCompetencyForm({
        title: '',
        category: 'Safety',
        validity_period_months: '36',
        default_risk_level: 'Medium',
        description: ''
      });
      setQuickActionMessage('Competency created.');
    } catch (error) {
      setQuickActionError(error instanceof Error ? error.message : 'Unable to create competency.');
    } finally {
      setIsQuickActionSaving(false);
    }
  };

  const handleCreateAction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!actionForm.requirement_id || !actionForm.title.trim()) return;
    setIsQuickActionSaving(true);
    setQuickActionError('');
    setQuickActionMessage('');
    try {
      await createActionForRequirement(actionForm.requirement_id, {
        title: actionForm.title.trim(),
        description: actionForm.description.trim() || null,
        owner: actionForm.owner.trim() || null,
        due_date: actionForm.due_date || null,
        status: 'Open'
      });
      setActionForm({ requirement_id: '', title: '', description: '', owner: '', due_date: '' });
      setQuickActionMessage('Action created.');
    } catch (error) {
      setQuickActionError(error instanceof Error ? error.message : 'Unable to create action.');
    } finally {
      setIsQuickActionSaving(false);
    }
  };

  const handleCreateAuditPack = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!auditPackForm.name.trim() || auditPackForm.requirementIds.length === 0) return;
    setIsQuickActionSaving(true);
    setQuickActionError('');
    setQuickActionMessage('');
    try {
      const requirementDocIds = Array.from(new Set(
        auditPackForm.requirementIds.flatMap(requirementId =>
          requirementDocuments
            .filter(link => link.requirement_id === requirementId)
            .map(link => link.document_id)
        )
      )).filter(documentId => documents.some(document => document.id === documentId && document.status !== 'deleted'));
      await createPack(auditPackForm.name.trim(), auditPackForm.description.trim(), auditPackForm.requirementIds, requirementDocIds);
      setAuditPackForm({ name: '', description: '', requirementIds: [] });
      setQuickActionMessage('Audit pack saved as Draft.');
    } catch (error) {
      setQuickActionError(error instanceof Error ? error.message : 'Unable to create audit pack.');
    } finally {
      setIsQuickActionSaving(false);
    }
  };

  return (
    <div className="space-y-8" data-selected-attention-item={selectedAttentionItem || undefined}>
      {/* Header and Reset Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" id="dashboard-heading">Compliance Workspace</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time compliance intelligence and readiness status for <strong>{organization?.name}</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Focus Mode Toggle */}
          <div className="flex items-center bg-muted border border-border rounded-lg p-0.5 mr-1 shrink-0">
            <button
              onClick={() => setIsFocusMode(false)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                !isFocusMode
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setIsFocusMode(true)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                isFocusMode
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Focus
            </button>
          </div>

          {isDemoMode && (
            <button
              onClick={handleResetDemoData}
              disabled={isResettingDemo}
              className="px-3.5 py-2 bg-muted hover:bg-muted/85 border border-border text-foreground font-semibold text-xs rounded-lg transition-all shrink-0"
            >
              {isResettingDemo ? 'Resetting...' : 'Reset Sample Data'}
            </button>
          )}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/15 transition-all shrink-0"
          >
            <Upload className="w-4 h-4" /> Upload Evidence
          </button>
        </div>
      </div>

      {(resetMessage || resetError) && (
        <div className={`p-3 rounded-xl border text-xs font-semibold ${resetError ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>
          {resetError || resetMessage}
        </div>
      )}

      <section className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Quick Actions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">High-frequency compliance operations without leaving the dashboard.</p>
          </div>
          <div className="flex bg-muted border border-border rounded-lg p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => updateDashboardTab('overview')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                dashboardTab === 'overview' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Main Overview
            </button>
            <button
              type="button"
              onClick={() => updateDashboardTab('upcoming-history')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                dashboardTab === 'upcoming-history' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Upcoming / History
            </button>
          </div>
        </div>
        {renderQuickActions()}
      </section>

      {/* SECTION 1 — EXECUTIVE SUMMARY (hidden in Focus mode) */}
      {!isFocusMode && dashboardTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Overall Readiness */}
          <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between hover:shadow-md transition-all">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Compliance Health</span>
              <span className="text-2xl font-extrabold block text-foreground leading-tight">{getHealthState(readinessScore)}</span>
              <span className={`text-xs font-bold block ${scoreTone(readinessScore)}`}>{readinessScore}% score</span>
            </div>
            <div className={`p-3 rounded-xl border ${bgScoreTone(readinessScore)}`}>
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Requirements */}
          <div
            onClick={() => router.push('/dashboard/requirements?status=Attention')}
            onMouseEnter={() => {
              setActiveDashboardPanel('requirements-summary');
              setExpandedRadarBucket(null);
              setActiveFlyout(null);
            }}
            onMouseLeave={() => setActiveDashboardPanel(current => current === 'requirements-summary' ? null : current)}
            className="relative group bg-card border border-border p-5 rounded-xl flex items-center justify-between hover:shadow-md hover:border-indigo-500/40 transition-all cursor-pointer"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Requirements</span>
              <span className="text-3xl font-extrabold block text-foreground">{stats.activeRequirements}</span>
              <span className="text-[10px] text-muted-foreground block">{stats.compliantCount} fully compliant</span>
            </div>
            <div className="p-3 rounded-xl border bg-muted/10 text-muted-foreground border-border/40">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
            </div>

            {/* Smart Hover Panel */}
            {(activeDashboardPanel === 'requirements-summary' || activeFlyout === 'requirements-summary') && (
            <div className={`absolute left-0 top-full mt-2 w-64 p-4 ${flyoutPanelClass} transition-all duration-200`} onClick={e => e.stopPropagation()}>
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground mb-2">Requirements Summary</h4>
              <div className="space-y-1 text-xs">
                <Link href="/dashboard/requirements?status=GREEN" className="flex justify-between hover:bg-muted/50 p-1.5 rounded transition-colors">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Green</span>
                  <span className="font-bold">{reqGreen}</span>
                </Link>
                <Link href="/dashboard/requirements?status=AMBER" className="flex justify-between hover:bg-muted/50 p-1.5 rounded transition-colors">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Amber</span>
                  <span className="font-bold">{reqAmber}</span>
                </Link>
                <Link href="/dashboard/requirements?status=RED" className="flex justify-between hover:bg-muted/50 p-1.5 rounded transition-colors">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Red</span>
                  <span className="font-bold">{reqRed}</span>
                </Link>
                <Link href="/dashboard/requirements?status=GREY" className="flex justify-between hover:bg-muted/50 p-1.5 rounded transition-colors">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-zinc-400" /> Grey</span>
                  <span className="font-bold">{reqGrey}</span>
                </Link>
              </div>
              <div className="border-t border-border mt-3 pt-2">
                <Link href="/dashboard/requirements?status=Attention" className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-between hover:underline">
                  View Requirements <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
            )}
          </div>

          {/* Card 3: Competencies */}
          <div
            onClick={() => router.push('/dashboard/competencies?status=Gap')}
            onMouseEnter={() => {
              setActiveDashboardPanel('competencies-summary');
              setExpandedRadarBucket(null);
              setActiveFlyout(null);
            }}
            onMouseLeave={() => setActiveDashboardPanel(current => current === 'competencies-summary' ? null : current)}
            className="relative group bg-card border border-border p-5 rounded-xl flex items-center justify-between hover:shadow-md hover:border-indigo-500/40 transition-all cursor-pointer"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Competencies</span>
              <span className={`text-3xl font-extrabold block ${scoreTone(competencySummary.compliancePercent)}`}>
                {competencySummary.compliancePercent}%
              </span>
              <span className="text-[10px] text-muted-foreground block">{competencySummary.missing} missing / {competencySummary.expired} expired</span>
            </div>
            <div className="p-3 rounded-xl border bg-muted/10 text-muted-foreground border-border/40">
              <Briefcase className="w-5 h-5 text-indigo-500" />
            </div>

            {/* Smart Hover Panel */}
            {(activeDashboardPanel === 'competencies-summary' || activeFlyout === 'competencies-summary') && (
            <div className={`absolute left-0 top-full mt-2 w-64 p-4 ${flyoutPanelClass} transition-all duration-200`} onClick={e => e.stopPropagation()}>
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground mb-2">Competencies Summary</h4>
              <div className="space-y-1 text-xs">
                <Link href="/dashboard/competencies?status=Missing" className="flex justify-between hover:bg-muted/50 p-1.5 rounded transition-colors">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Missing</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">{competencySummary.missing}</span>
                </Link>
                <Link href="/dashboard/competencies?status=Expired" className="flex justify-between hover:bg-muted/50 p-1.5 rounded transition-colors">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-600" /> Expired</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">{competencySummary.expired}</span>
                </Link>
                <Link href="/dashboard/competencies?status=Expiring Soon" className="flex justify-between hover:bg-muted/50 p-1.5 rounded transition-colors">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Expiring Soon</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{competencySummary.expiringSoon}</span>
                </Link>
              </div>
              <div className="border-t border-border mt-3 pt-2">
                <Link href="/dashboard/competencies?status=Gap" className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-between hover:underline">
                  View Competencies <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
            )}
          </div>

          {/* Card 4: Open Actions */}
          <div
            onClick={() => router.push('/dashboard/requirements?filter=actions')}
            onMouseEnter={() => {
              setActiveDashboardPanel('actions-summary');
              setExpandedRadarBucket(null);
              setActiveFlyout(null);
            }}
            onMouseLeave={() => setActiveDashboardPanel(current => current === 'actions-summary' ? null : current)}
            className="relative group bg-card border border-border p-5 rounded-xl flex items-center justify-between hover:shadow-md hover:border-indigo-500/40 transition-all cursor-pointer"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Open Actions</span>
              <span className="text-3xl font-extrabold block text-indigo-500">{openActions}</span>
              <span className="text-[10px] text-muted-foreground block">{activeActionsCount} active tasks</span>
            </div>
            <div className="p-3 rounded-xl border bg-muted/10 text-muted-foreground border-border/40">
              <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
            </div>

            {/* Smart Hover Panel */}
            {(activeDashboardPanel === 'actions-summary' || activeFlyout === 'actions-summary') && (
            <div className={`absolute right-0 top-full mt-2 w-64 p-4 ${flyoutPanelClass} transition-all duration-200`} onClick={e => e.stopPropagation()}>
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground mb-2">Actions Summary</h4>
              <div className="space-y-1 text-xs">
                <Link href="/dashboard/requirements?filter=actions" className="flex justify-between hover:bg-muted/50 p-1.5 rounded transition-colors">
                  <span>Open Actions</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{openActions}</span>
                </Link>
                <Link href="/dashboard/requirements?filter=overdue" className="flex justify-between hover:bg-muted/50 p-1.5 rounded transition-colors">
                  <span className="text-rose-500">Overdue</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">{overdueActionsCount}</span>
                </Link>
                <Link href="/dashboard/requirements?filter=due-week" className="flex justify-between hover:bg-muted/50 p-1.5 rounded transition-colors">
                  <span className="text-amber-500 font-medium">Due This Week</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{dueThisWeekCount}</span>
                </Link>
              </div>
              <div className="border-t border-border mt-3 pt-2">
                <Link href="/dashboard/requirements?filter=actions" className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-between hover:underline">
                  View Actions <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {/* Main Grid Layout (Conditional on Focus Mode) */}
      {isFocusMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8 animate-fade-in">
            {/* Focus Mode Daily Workbench Attention Centre */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-base font-extrabold text-foreground">Daily Workbench</h2>
                <p className="text-xs text-muted-foreground mt-0.5">High-priority compliance items and deadlines for today.</p>
              </div>

              {readinessReport.topRisks.length === 0 && overdueAndUpcoming.length === 0 && readinessReport.openActionItems.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground flex flex-col items-center justify-center gap-3 bg-muted/10 border border-dashed border-border rounded-xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <span className="font-semibold text-foreground text-sm">System Healthy</span>
                  <span>No outstanding issues require immediate attention.</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Section 1: Critical Issues */}
                  {readinessReport.topRisks.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-rose-500/10 pb-1.5">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Critical Issues ({readinessReport.topRisks.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {readinessReport.topRisks.slice(0, 4).map(item => (
                          <Link
                            key={item.requirement.id}
                            href={`/dashboard/requirements?id=${item.requirement.id}`}
                            className="relative group block p-3.5 bg-rose-500/5 dark:bg-rose-500/10 hover:bg-rose-500/10 dark:hover:bg-rose-500/15 border border-rose-500/20 rounded-xl flex gap-2.5 items-start text-xs transition-colors cursor-pointer"
                          >
                            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-foreground block truncate" title={item.requirement.title}>{item.requirement.title}</span>
                              <span className="text-[9px] text-muted-foreground block truncate">{item.requirement.category} • {item.requirement.risk_level} Risk</span>
                              <span className="text-[9px] text-rose-600 dark:text-rose-400 mt-1 block truncate">
                                {item.reasons.find(r => r.level === 'RED' || r.level === 'AMBER')?.message || 'Gap warning detected.'}
                              </span>
                            </div>

                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 2: Upcoming Deadlines */}
                  {overdueAndUpcoming.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-amber-500/10 pb-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Upcoming Deadlines ({overdueAndUpcoming.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {overdueAndUpcoming.slice(0, 4).map(item => (
                          <Link
                            key={item.requirement.id}
                            href={`/dashboard/requirements?id=${item.requirement.id}`}
                            className="relative group block p-3.5 bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/10 dark:hover:bg-amber-500/15 border border-amber-500/20 rounded-xl flex gap-2.5 items-start text-xs transition-colors cursor-pointer"
                          >
                            <Calendar className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-foreground block truncate" title={item.requirement.title}>{item.requirement.title}</span>
                              <span className="text-[9px] text-muted-foreground block font-medium">
                                Review Due: <strong className={item.isOverdue ? 'text-rose-500 font-bold' : 'text-amber-500 font-bold'}>{item.requirement.next_due_date || 'None'}</strong>
                              </span>
                              <span className={`text-[8px] font-bold uppercase block mt-1 ${item.isOverdue ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-amber-600 dark:text-amber-400'}`}>
                                {item.isOverdue ? 'Overdue' : 'Due Soon'}
                              </span>
                            </div>

                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 3: Open Actions */}
                  {readinessReport.openActionItems.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-indigo-500/10 pb-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Linked Actions ({openActions})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {readinessReport.openActionItems.slice(0, 4).map(item => (
                          <button
                            key={item.action.id}
                            onClick={() => openAttentionAction(item.action)}
                            className="relative group w-full text-left p-3.5 bg-muted/40 hover:bg-muted/65 border border-border/80 rounded-xl flex gap-2.5 items-start text-xs transition-colors cursor-pointer"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-foreground block truncate" title={item.action.title}>{item.action.title}</span>
                              <span className="text-[9px] text-muted-foreground block truncate">
                                {item.requirements.map(r => r.title).join(', ') || 'No linked requirement'}
                              </span>
                              {item.action.due_date && <span className="text-[8px] text-indigo-600 dark:text-indigo-400 font-bold block mt-1">Due: {item.action.due_date}</span>}
                            </div>

                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Timeline in Focus Mode */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
              <div>
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Compliance Timeline</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Chronological workload view.</p>
              </div>
              <div className="space-y-4">
                {complianceEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-6">No upcoming events scheduled.</p>
                ) : (
                  <div className="relative border-l border-border pl-4 ml-3 space-y-6 py-2">
                    {complianceEvents.slice(0, 8).map((event, idx) => (
                      <div key={idx} className="relative text-xs group">
                        <div className="absolute -left-[22px] top-1 w-3.5 h-3.5 rounded-full border-2 border-card bg-indigo-500 ring-4 ring-indigo-500/10 group-hover:scale-110 transition-transform" />
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block uppercase tracking-wider">
                            {formatShortDate(event.dateStr)} • {event.type}
                          </span>
                          <button
                            onClick={() => openComplianceEvent(event)}
                            className="font-bold text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 text-left transition-colors cursor-pointer"
                          >
                            {event.title}
                          </button>
                          <p className="text-muted-foreground text-[10px] leading-relaxed mt-0.5">{event.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Overview Mode (Regular 3-Column Split Layout) */
        <div className="grid grid-cols-1 gap-8 animate-fade-in">
          {/* Left Side: Attention Centre, Readiness Breakdown, Timeline */}
          <div className={`space-y-8 ${dashboardTab === 'overview' ? '' : 'hidden'}`}>
            {/* Attention Centre */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Attention Centre</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Urgent compliance issues, review dates, and linked actions requiring attention.</p>
              </div>

              {readinessReport.topRisks.length === 0 && overdueAndUpcoming.length === 0 && readinessReport.openActionItems.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground flex flex-col items-center justify-center gap-3 bg-muted/10 border border-dashed border-border rounded-xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <span className="font-semibold text-foreground text-sm">System Healthy</span>
                  <span>No outstanding issues require immediate attention.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Column 1: Critical Issues */}
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                      Critical Issues ({readinessReport.topRisks.length})
                    </h3>
                    <div className="space-y-2">
                      {readinessReport.topRisks.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground italic py-3 bg-muted/15 border border-dashed border-border rounded-lg text-center">No risk alerts.</p>
                      ) : (
                        readinessReport.topRisks.slice(0, 3).map(item => (
                          <Link
                            key={item.requirement.id}
                            href={`/dashboard/requirements?id=${item.requirement.id}`}
                            className="relative group block p-3 bg-rose-500/5 dark:bg-rose-500/10 hover:bg-rose-500/10 dark:hover:bg-rose-500/15 border border-rose-500/20 rounded-xl flex gap-2 items-start text-xs transition-colors cursor-pointer animate-slide-in"
                          >
                            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-foreground block truncate">{item.requirement.title}</span>
                              <span className="text-[9px] text-muted-foreground block truncate">{item.requirement.category} • {item.requirement.risk_level} Risk</span>
                              <span className="text-[9px] text-rose-600 dark:text-rose-400 mt-1 block truncate">
                                {item.reasons.find(r => r.level === 'RED' || r.level === 'AMBER')?.message || 'Gap warning detected.'}
                              </span>
                            </div>

                          </Link>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Column 2: Upcoming Deadlines */}
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      Deadlines ({overdueAndUpcoming.length})
                    </h3>
                    <div className="space-y-2">
                      {overdueAndUpcoming.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground italic py-3 bg-muted/15 border border-dashed border-border rounded-lg text-center">No overdue items.</p>
                      ) : (
                        overdueAndUpcoming.slice(0, 3).map(item => (
                          <Link
                            key={item.requirement.id}
                            href={item.link || `/dashboard/requirements?id=${item.requirement.id}`}
                            className="relative group block p-3 bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/10 dark:hover:bg-amber-500/15 border border-amber-500/20 rounded-xl flex gap-2 items-start text-xs transition-colors cursor-pointer"
                          >
                            <Calendar className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-foreground block truncate">{item.requirement.title}</span>
                              <span className="text-[9px] text-muted-foreground block font-medium">
                                Review Due: <strong className={item.isOverdue ? 'text-rose-500 font-bold' : 'text-amber-500 font-bold'}>{item.requirement.next_due_date || 'None'}</strong>
                              </span>
                              <span className={`text-[8px] font-bold uppercase block mt-1 ${item.isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                {item.isOverdue ? 'Overdue' : 'Due Soon'}
                              </span>
                            </div>

                          </Link>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Column 3: Open Actions */}
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />
                      Linked Actions ({openActions})
                    </h3>
                    <div className="space-y-2">
                      {readinessReport.openActionItems.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground italic py-3 bg-muted/15 border border-dashed border-border rounded-lg text-center">No open actions.</p>
                      ) : (
                        readinessReport.openActionItems.slice(0, 3).map(item => (
                          <button
                            key={item.action.id}
                            onClick={() => openAttentionAction(item.action)}
                            className="relative group w-full text-left p-3 bg-muted/40 hover:bg-muted/65 border border-border/80 rounded-xl flex gap-2 items-start text-xs transition-colors cursor-pointer"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-foreground block truncate">{item.action.title}</span>
                              <span className="text-[9px] text-muted-foreground block truncate">
                                {item.requirements.map(r => r.title).join(', ') || 'No linked requirement'}
                              </span>
                              {item.action.due_date && <span className="text-[8px] text-indigo-600 dark:text-indigo-400 font-bold block mt-1">Due: {item.action.due_date}</span>}
                            </div>

                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Readiness Breakdown */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Readiness Breakdown</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Calculated score status across compliance pillars.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="flex flex-col items-center justify-center p-4 bg-muted/20 border border-border/60 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>
                  <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="72" cy="72" r="56" stroke="currentColor" className="text-muted/10" strokeWidth="10" fill="transparent" />
                      <circle
                        cx="72"
                        cy="72"
                        r="56"
                        stroke="currentColor"
                        className={scoreTone(readinessScore)}
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 56}
                        strokeDashoffset={2 * Math.PI * 56 * (1 - (readinessScore ?? 0) / 100)}
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-4xl font-extrabold">{readinessScore}%</span>
                      <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Readiness</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-center text-muted-foreground leading-normal max-w-xs mt-4">
                    {readinessReport.explanation}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Progress Pillars */}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between font-bold">
                      <span>Requirements Coverage</span>
                      <span className={scoreTone(reqProgress)}>{reqProgress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${reqProgress}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>{stats.compliantCount} compliant</span>
                      <span>{stats.activeRequirements} active</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between font-bold">
                      <span>Competency Verification</span>
                      <span className={scoreTone(compProgress)}>{compProgress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${compProgress}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>{competencySummary.missing} missing / {competencySummary.expired} expired</span>
                      <span>{competencySummary.upcomingRenewals.length} upcoming renewals</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between font-bold">
                      <span>Evidence Classification</span>
                      <span className={scoreTone(docProgress)}>{docProgress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${docProgress}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>{classifiedDocsCount} classified documents</span>
                      <span>{unclassifiedDocs.length} unclassified files</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between font-bold">
                      <span>Review Cadence</span>
                      <span className={scoreTone(reviewProgress)}>{reviewProgress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${reviewProgress}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>{reviewedCount} reviewed on schedule</span>
                      <span>{readinessReport.overdue.length} overdue reviews</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between font-bold">
                      <span>Task Resolution</span>
                      <span className={scoreTone(actionProgress)}>{actionProgress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${actionProgress}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>{completedActionsCount} actions resolved</span>
                      <span>{openActions} actions open</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance Timeline (Main Section in Overview Mode) */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Compliance Timeline</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Upcoming reviews, expiries, audits, and deadlines in chronological order.</p>
              </div>

              <div className="space-y-4">
                {complianceEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-6">No upcoming events scheduled.</p>
                ) : (
                  <div className="relative border-l border-border pl-4 ml-3 space-y-6 py-2">
                    {complianceEvents.slice(0, 10).map((event, idx) => (
                      <div key={idx} className="relative text-xs group">
                        <div className="absolute -left-[22px] top-1 w-3.5 h-3.5 rounded-full border-2 border-card bg-indigo-500 ring-4 ring-indigo-500/10 group-hover:scale-110 transition-transform" />
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block uppercase tracking-wider">
                            {formatShortDate(event.dateStr)} • {event.type}
                          </span>
                          <button
                            onClick={() => openComplianceEvent(event)}
                            className="font-bold text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 text-left transition-colors cursor-pointer"
                          >
                            {event.title}
                          </button>
                          <p className="text-muted-foreground text-[10px] leading-relaxed mt-0.5">{event.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Quick Actions, Compliance Radar, Upcoming, Recent Activity */}
          <div className={`space-y-8 ${dashboardTab === 'upcoming-history' ? '' : 'hidden'}`}>
            {/* Compliance Radar Panel */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
              <div>
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Compliance Radar</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Hover or click a row to view specific due and overdue tasks.</p>
              </div>
              <div className="space-y-3">
                {radarRows.map(row => {
                  const radarDescriptions: Record<string, string> = {
                    'Overdue': 'Active requirements, expired evidence, overdue actions, or competency gaps past schedule.',
                    'Due 30 Days': 'Requirements, evidence, and actions due for scheduled review or renewal in 30 days.',
                    'Due 60 Days': 'Requirements, evidence, and actions due for scheduled review or renewal in 30 to 60 days.',
                    'Due 90 Days': 'Requirements, evidence, and actions due for scheduled review or renewal in 60 to 90 days.'
                  };
                  const filterParamMap: Record<string, string> = {
                    'Overdue': 'overdue',
                    'Due 30 Days': 'due30',
                    'Due 60 Days': 'due60',
                    'Due 90 Days': 'due90'
                  };
                  return (
                    <div key={row.label} className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedRadarBucket(current => current === row.label ? null : row.label);
                          setActiveDashboardPanel(null);
                          setActiveFlyout(null);
                        }}
                        className="w-full text-left relative group flex items-center justify-between p-3.5 bg-muted/40 hover:bg-muted/75 hover:border-indigo-500/20 focus-visible:ring-2 focus-visible:ring-indigo-600 border border-border/80 rounded-xl cursor-pointer transition-all duration-200 outline-none"
                        aria-expanded={expandedRadarBucket === row.label}
                        aria-haspopup="true"
                        aria-label={`View ${row.label} compliance items. Contains ${row.items.length} items.`}
                      >
                        <span className="font-extrabold text-foreground/85 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">{row.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`${row.styleClass} px-2.5 py-0.5 bg-card border border-border/50 rounded-full text-[10px] font-extrabold group-hover:scale-105 transition-transform`}>
                            {row.items.length}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </button>

                      {/* Popover content (opens to the left) */}
                      {expandedRadarBucket === row.label && (
                        <div
                          className={`absolute right-full mr-3 top-0 w-80 max-w-[min(20rem,calc(100vw-2rem))] p-4 ${flyoutPanelClass} transition-all duration-200 space-y-3 z-30`}
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="flex flex-col gap-1 border-b border-border/80 pb-2">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-foreground text-xs">{row.label} Workload</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{row.items.length} item{row.items.length === 1 ? '' : 's'}</span>
                                <button
                                  type="button"
                                  onClick={() => setExpandedRadarBucket(null)}
                                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                                  aria-label={`Close ${row.label} workload`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <p className="text-[9px] text-muted-foreground leading-normal mt-0.5">
                              {radarDescriptions[row.label]}
                            </p>
                          </div>
                          <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
                            {row.items.length === 0 ? (
                              <p className="text-[10px] text-muted-foreground italic text-center py-4">No tasks found in this timeframe.</p>
                            ) : (
                              row.items.slice(0, 10).map(item => (
                                <button
                                  key={item.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openRadarItem(item);
                                  }}
                                  className="w-full text-left p-2.5 bg-muted/30 hover:bg-muted/70 hover:border-indigo-500/30 border border-border/50 rounded-lg flex flex-col gap-1 text-[11px] transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-600 outline-none"
                                >
                                  <div className="flex items-start justify-between gap-1.5 w-full">
                                    <span className="font-bold text-foreground truncate max-w-[170px]" title={item.title}>
                                      {item.title}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-extrabold shrink-0 border uppercase tracking-wider ${
                                      item.type === 'Requirement' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' :
                                      item.type === 'Evidence' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                                      item.type === 'Competency' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                                      'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                    }`}>
                                      {item.type}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center text-[9px] text-muted-foreground">
                                    <span>Due: {formatShortDate(item.dueDate)}</span>
                                    <span className="font-semibold truncate max-w-[95px]">{item.owner || 'Unassigned'}</span>
                                  </div>
                                </button>
                              ))
                            )}
                            {row.items.length > 10 && (
                              <p className="text-[9px] text-muted-foreground italic text-center pt-1 font-medium">{row.items.length - 10} more items available via filters.</p>
                            )}
                          </div>
                          <div className="border-t border-border/80 pt-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedRadarBucket(null);
                                router.push(`/dashboard/requirements?filter=${filterParamMap[row.label]}`);
                              }}
                              className="w-full text-center text-[10px] font-black text-indigo-600 hover:text-indigo-750 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline cursor-pointer py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 rounded"
                            >
                              View Filtered Requirements →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming Compliance Events Panel (Compact) */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Upcoming</h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Quick workload preview.</p>
                </div>
                <span className="text-[10px] font-extrabold text-muted-foreground">
                  {complianceEvents.length} item{complianceEvents.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="space-y-3">
                {complianceEvents.slice(0, 3).map((event, idx) => (
                  <button
                    key={idx}
                    onClick={() => openComplianceEvent(event)}
                    className="w-full flex gap-3 items-center justify-between text-left text-xs p-2.5 bg-muted/30 hover:bg-muted/60 border border-border rounded-xl transition-colors"
                  >
                    <div className="min-w-0">
                      <span className="font-bold block text-foreground truncate">{event.title}</span>
                      <span className="text-[9px] text-muted-foreground">{event.type} • {event.description}</span>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                      {formatShortDate(event.dateStr)}
                    </span>
                  </button>
                ))}
                {complianceEvents.length === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center py-2">No upcoming events.</p>
                )}
              </div>
            </div>

            {/* Recent Activity Rework */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Recent Activity</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Continuous tracking of compliance logs.</p>
                </div>
                <button
                  onClick={() => setIsActivityModalOpen(true)}
                  className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View Full Activity →
                </button>
              </div>

              <div className="relative border-l border-border pl-4 ml-2 space-y-5 py-2">
                {auditLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="text-xs relative">
                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-card bg-indigo-500 ring-4 ring-indigo-500/15" />
                    <div className="space-y-0.5">
                      <span className="font-bold block text-foreground leading-normal">{log.action}</span>
                      <p className="text-muted-foreground text-[10px] leading-relaxed">{log.details}</p>
                      <span className="text-[9px] text-muted-foreground/80 block pt-0.5">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Evidence Modal Overlay */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card solid-panel border border-border w-full max-w-lg rounded-2xl p-6 relative shadow-2xl space-y-4 animate-scale-in">
            <button
              onClick={() => {
                setIsUploadModalOpen(false);
                setUploadError('');
                setUploadSuccess('');
              }}
              className="absolute top-4 right-4 p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-foreground">Upload Evidence Document</h3>
              <p className="text-xs text-muted-foreground">Attach a document to private storage and assign a category.</p>
            </div>

            <form onSubmit={handleQuickUpload} className="space-y-4 text-xs">
              <div>
                <label htmlFor="quick-title" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Document Title
                </label>
                <input
                  id="quick-title"
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={event => setUploadTitle(event.target.value)}
                  placeholder="e.g., Training certificate"
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="quick-file" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    File
                  </label>
                  <input
                    id="quick-file"
                    type="file"
                    required
                    accept={evidenceAcceptAttribute}
                    onChange={event => {
                      const file = event.target.files?.[0] || null;
                      setUploadFile(file);
                      setUploadFileName(file?.name || '');
                    }}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none transition-colors"
                  />
                  <span className="text-[9px] text-muted-foreground block mt-1 truncate">
                    {uploadFileName || `Max ${formatMaxEvidenceUploadSize()}`}
                  </span>
                </div>

                <div>
                  <label htmlFor="quick-cat" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Category Scope
                  </label>
                  <select
                    id="quick-cat"
                    value={uploadCategory}
                    onChange={event => setUploadCategory(event.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none transition-colors"
                  >
                    <option value="Vehicle">Vehicle</option>
                    <option value="Driver">Driver</option>
                    <option value="Facility">Facility</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="quick-expiry" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Expiry Date <span className="text-[10px] font-normal text-muted-foreground">(Optional)</span>
                </label>
                <input
                  id="quick-expiry"
                  type="date"
                  value={uploadExpiry}
                  onChange={event => setUploadExpiry(event.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none transition-colors"
                />
              </div>

              <div className="border-t border-border pt-3.5">
                <EvidenceDropzone
                  label="Drag & drop files here to upload"
                  helperText={`Applies category and optional expiry. Max ${formatMaxEvidenceUploadSize()} per file.`}
                  buttonLabel="Choose files"
                  compact
                  multiple
                  onUpload={async (file, updateStatus) => {
                    updateStatus('saving record');
                    const doc = await uploadDocument({
                      file,
                      title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim() || file.name,
                      category: uploadCategory,
                      expiry_date: uploadExpiry || null,
                      issue_date: new Date().toISOString().split('T')[0],
                      metadata: { source: 'dashboard_quick_dropzone' }
                    });
                    return doc;
                  }}
                  onComplete={docs => setUploadSuccess(`Uploaded ${docs.length} document${docs.length === 1 ? '' : 's'} successfully.`)}
                  findDuplicates={findPossibleDuplicateDocuments}
                />
              </div>

              {uploadError && (
                <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 text-[11px]">
                  {uploadError}
                </div>
              )}

              {uploadSuccess && (
                <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 text-[11px]">
                  {uploadSuccess}
                </div>
              )}

              <button
                id="quick-upload-submit-btn"
                type="submit"
                disabled={isUploading || !uploadTitle || !uploadFile}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-semibold rounded-lg flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10 transition-all duration-200"
              >
                {isUploading ? 'Uploading...' : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Document
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeQuickActionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card solid-panel border border-border w-full max-w-xl rounded-2xl p-6 relative shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto">
            <button
              onClick={closeDashboardModal}
              className="absolute top-4 right-4 p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 pr-8">
              <h3 className="text-base font-extrabold text-foreground">
                {activeQuickActionModal === 'requirement' && 'Create Requirement'}
                {activeQuickActionModal === 'competency' && 'Create Competency'}
                {activeQuickActionModal === 'action' && 'Create Action'}
                {activeQuickActionModal === 'audit-pack' && 'Build Audit Pack'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Complete the quick action without leaving the dashboard.
              </p>
            </div>

            {activeQuickActionModal === 'requirement' && (
              <form onSubmit={handleCreateRequirement} className="space-y-3 text-xs">
                <input required placeholder="Requirement title" value={requirementForm.title} onChange={event => setRequirementForm({ ...requirementForm, title: event.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input placeholder="Category" value={requirementForm.category} onChange={event => setRequirementForm({ ...requirementForm, category: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
                  <input placeholder="Owner" value={requirementForm.owner} onChange={event => setRequirementForm({ ...requirementForm, owner: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select value={requirementForm.risk_level} onChange={event => setRequirementForm({ ...requirementForm, risk_level: event.target.value as RequirementRiskLevel })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none">
                    {requirementRiskLevels.map(level => <option key={level} value={level}>{level}</option>)}
                  </select>
                  <select value={requirementForm.review_frequency} onChange={event => setRequirementForm({ ...requirementForm, review_frequency: event.target.value as ReviewFrequency })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none">
                    {reviewFrequencies.map(frequency => <option key={frequency} value={frequency}>{frequency}</option>)}
                  </select>
                  <input type="date" value={requirementForm.next_due_date} onChange={event => setRequirementForm({ ...requirementForm, next_due_date: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
                </div>
                <textarea placeholder="Description" value={requirementForm.description} onChange={event => setRequirementForm({ ...requirementForm, description: event.target.value })} rows={3} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none resize-none" />
                <button disabled={isQuickActionSaving || !requirementForm.title.trim()} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-lg">
                  {isQuickActionSaving ? 'Creating...' : 'Create Requirement'}
                </button>
              </form>
            )}

            {activeQuickActionModal === 'competency' && (
              <form onSubmit={handleCreateCompetency} className="space-y-3 text-xs">
                <input required placeholder="Competency title" value={competencyForm.title} onChange={event => setCompetencyForm({ ...competencyForm, title: event.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select value={competencyForm.category} onChange={event => setCompetencyForm({ ...competencyForm, category: event.target.value as CompetencyCategory })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none">
                    {competencyCategories.map(category => <option key={category} value={category}>{category}</option>)}
                  </select>
                  <input type="number" min="0" placeholder="Validity months" value={competencyForm.validity_period_months} onChange={event => setCompetencyForm({ ...competencyForm, validity_period_months: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
                  <select value={competencyForm.default_risk_level} onChange={event => setCompetencyForm({ ...competencyForm, default_risk_level: event.target.value as RequirementRiskLevel })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none">
                    {requirementRiskLevels.map(level => <option key={level} value={level}>{level}</option>)}
                  </select>
                </div>
                <textarea placeholder="Description" value={competencyForm.description} onChange={event => setCompetencyForm({ ...competencyForm, description: event.target.value })} rows={3} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none resize-none" />
                <button disabled={isQuickActionSaving || !competencyForm.title.trim()} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-lg">
                  {isQuickActionSaving ? 'Creating...' : 'Create Competency'}
                </button>
              </form>
            )}

            {activeQuickActionModal === 'action' && (
              <form onSubmit={handleCreateAction} className="space-y-3 text-xs">
                <select required value={actionForm.requirement_id} onChange={event => setActionForm({ ...actionForm, requirement_id: event.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none">
                  <option value="">Select linked requirement...</option>
                  {activeRequirements.map(requirement => <option key={requirement.id} value={requirement.id}>{requirement.title}</option>)}
                </select>
                <input required placeholder="Action title" value={actionForm.title} onChange={event => setActionForm({ ...actionForm, title: event.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input placeholder="Owner" value={actionForm.owner} onChange={event => setActionForm({ ...actionForm, owner: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
                  <input type="date" value={actionForm.due_date} onChange={event => setActionForm({ ...actionForm, due_date: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
                </div>
                <textarea placeholder="Description" value={actionForm.description} onChange={event => setActionForm({ ...actionForm, description: event.target.value })} rows={3} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none resize-none" />
                <button disabled={isQuickActionSaving || !actionForm.requirement_id || !actionForm.title.trim()} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-lg">
                  {isQuickActionSaving ? 'Creating...' : 'Create Action'}
                </button>
              </form>
            )}

            {activeQuickActionModal === 'audit-pack' && (
              <form onSubmit={handleCreateAuditPack} className="space-y-3 text-xs">
                <input required placeholder="Audit pack name" value={auditPackForm.name} onChange={event => setAuditPackForm({ ...auditPackForm, name: event.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
                <textarea placeholder="Description" value={auditPackForm.description} onChange={event => setAuditPackForm({ ...auditPackForm, description: event.target.value })} rows={2} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none resize-none" />
                <div className="border border-border rounded-xl p-3 max-h-56 overflow-y-auto space-y-2 bg-muted/20">
                  {activeRequirements.length === 0 ? (
                    <p className="text-muted-foreground italic">No active requirements available.</p>
                  ) : activeRequirements.map(requirement => (
                    <label key={requirement.id} className="flex items-start gap-2 p-2 bg-card border border-border rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={auditPackForm.requirementIds.includes(requirement.id)}
                        onChange={event => {
                          const requirementIds = event.target.checked
                            ? [...auditPackForm.requirementIds, requirement.id]
                            : auditPackForm.requirementIds.filter(id => id !== requirement.id);
                          setAuditPackForm({ ...auditPackForm, requirementIds });
                        }}
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="font-bold block text-foreground truncate">{requirement.title}</span>
                        <span className="text-[10px] text-muted-foreground">{requirement.category} | {requirement.status}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <button disabled={isQuickActionSaving || !auditPackForm.name.trim() || auditPackForm.requirementIds.length === 0} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-lg">
                  {isQuickActionSaving ? 'Saving...' : 'Save Draft Audit Pack'}
                </button>
              </form>
            )}

            {(quickActionMessage || quickActionError) && (
              <div className={`p-2.5 rounded-lg border text-[11px] font-semibold ${quickActionError ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'}`}>
                {quickActionError || quickActionMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Full Activity Modal */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card solid-panel border border-border w-full max-w-2xl rounded-2xl p-6 relative shadow-2xl space-y-4 flex flex-col max-h-[80vh]">
            <button
              onClick={() => setIsActivityModalOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-foreground">Compliance Activity Log</h3>
              <p className="text-xs text-muted-foreground">Historical trail of changes, updates, evidence uploads, and system resets.</p>
            </div>

            <div className="overflow-y-auto pr-1 flex-1 relative border border-border rounded-xl p-4 bg-muted/20">
              <div className="relative border-l border-border pl-4 ml-2 space-y-5 py-2">
                {auditLogs.map(log => (
                  <div key={log.id} className="text-xs relative">
                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-card bg-indigo-500 ring-4 ring-indigo-500/15" />
                    <div className="space-y-0.5">
                      <span className="font-bold block text-foreground leading-normal">{log.action}</span>
                      <p className="text-muted-foreground text-[10px] leading-relaxed">{log.details}</p>
                      <span className="text-[9px] text-muted-foreground/80 block pt-0.5">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center py-6">No activity records found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Detail Drawer */}
      <ActionDetailDrawer
        action={currentSelectedAction}
        requirements={selectedActionRequirements}
        documents={documents}
        actionUpdates={actionUpdates}
        actionDocuments={actionDocuments}
        onClose={() => setSelectedAction(null)}
        onUpdateAction={updateAction}
        onAddUpdate={addActionUpdate}
        onLinkDocument={linkDocumentToAction}
        onUnlinkDocument={unlinkDocumentFromAction}
        onUploadAttachment={uploadActionAttachment}
        onOpenDocument={getDocumentSignedUrl}
        onFindDuplicates={findPossibleDuplicateDocuments}
      />
    </div>
  );
}
