'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';
import { ActionDetailDrawer } from '@/components/ActionDetailDrawer';
import { EvidenceDropzone } from '@/components/EvidenceDropzone';
import { evidenceAcceptAttribute, formatMaxEvidenceUploadSize } from '@/lib/evidenceStorage';
import { isDemoMode } from '@/lib/env';
import type { Action, CompetencyCategory, RequirementRiskLevel, ReviewFrequency } from '@/lib/types';
import { buildAssetMatrix } from '@/lib/assetEngine';
import {
  Clock,
  FileSpreadsheet,
  Upload,
  AlertTriangle,
  FileText,
  ChevronRight,
  X,
  Briefcase,
  ShieldCheck,
  Building2,
  List,
  Network,
  ClipboardList,
  UserCheck,
  FolderLock,
  Grid,
  FolderArchive,
  BarChart3
} from 'lucide-react';

const scoreTone = (score: number | null) => {
  if (score === null) return 'text-muted-foreground';
  if (score >= 90) return 'text-emerald-500';
  if (score >= 75) return 'text-indigo-500 dark:text-indigo-400';
  if (score >= 50) return 'text-amber-500';
  return 'text-rose-500';
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
type ViewMode = 'system' | 'list';

export default function DashboardPage() {
  const {
    organization,
    user,
    readinessReport,
    readinessScore,
    stats,
    competencySummary,
    documents,
    actions,
    auditPacks,
    frameworkRequirements,
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
    assetCheckAssignments,
    assetCheckRecords,
    assetCheckEvidenceLinks,
    assetCategories
  } = useApp();

  const [viewMode, setViewMode] = useState<ViewMode>('system');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Form states - Quick Evidence Upload
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('General');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadExpiry, setUploadExpiry] = useState('');
  const [uploadContextType, setUploadContextType] = useState<'general' | 'requirement' | 'asset' | 'competency'>('general');
  const [uploadContextTargetId, setUploadContextTargetId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Demo Reset States
  const [isResettingDemo, setIsResettingDemo] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  // Modal States
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeQuickActionModal, setActiveQuickActionModal] = useState<DashboardModal>(null);
  const [quickActionMessage, setQuickActionMessage] = useState('');
  const [quickActionError, setQuickActionError] = useState('');
  const [isQuickActionSaving, setIsQuickActionSaving] = useState(false);

  // Quick Action Form states
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

  // Unique Lists
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

  // Derived state calculators
  const unclassifiedDocs = useMemo(() => documents.filter(doc => doc.status === 'Unclassified'), [documents]);
  const classifiedDocsCount = documents.length - unclassifiedDocs.length;
  const docProgress = documents.length > 0 ? Math.round((classifiedDocsCount / documents.length) * 100) : 0;

  const activeRequirements = useMemo(
    () => frameworkRequirements.filter(requirement => (requirement.lifecycle_status || 'ACTIVE') === 'ACTIVE'),
    [frameworkRequirements]
  );
  const reqProgress = stats.activeRequirements > 0
    ? Math.round((stats.compliantCount / stats.activeRequirements) * 100)
    : 0;

  const activeActionsCount = actions.filter(action => action.status === 'Open' || action.status === 'In Progress').length;

  const assetMatrixCells = useMemo(
    () => buildAssetMatrix(assets, assetCheckTypes, assetCheckAssignments, assetCheckRecords, assetCheckEvidenceLinks),
    [assets, assetCheckTypes, assetCheckAssignments, assetCheckRecords, assetCheckEvidenceLinks]
  );

  const getAssignmentStatus = useCallback((assignmentId: string): 'Compliant' | 'Expiring Soon' | 'Expired' | 'Missing' | 'N/A' => {
    const status = assetMatrixCells.find(cell => cell.assignment?.id === assignmentId)?.status;
    if (status === 'valid') return 'Compliant';
    if (status === 'due_soon') return 'Expiring Soon';
    if (status === 'expired' || status === 'overdue') return 'Expired';
    if (status === 'missing') return 'Missing';
    return 'N/A';
  }, [assetMatrixCells]);

  const totalAssetChecks = useMemo(() => {
    return (assetCheckAssignments || []).filter(a => a.active && a.required).length;
  }, [assetCheckAssignments]);

  const compliantAssetChecks = useMemo(() => {
    return (assetCheckAssignments || []).filter(a => a.active && a.required && getAssignmentStatus(a.id) === 'Compliant').length;
  }, [assetCheckAssignments, getAssignmentStatus]);

  const assetProgress = totalAssetChecks > 0
    ? Math.round((compliantAssetChecks / totalAssetChecks) * 100)
    : 100;

  const overdueAssetChecks = useMemo(() => {
    return (assetCheckAssignments || [])
      .filter(asg => asg.active && asg.required && getAssignmentStatus(asg.id) === 'Expired')
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
  }, [assetCheckAssignments, assets, assetCheckTypes, getAssignmentStatus]);

  const upcomingAssetChecks = useMemo(() => {
    return (assetCheckAssignments || [])
      .filter(asg => asg.active && asg.required && getAssignmentStatus(asg.id) === 'Expiring Soon')
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
  }, [assetCheckAssignments, assets, assetCheckTypes, getAssignmentStatus]);

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

  // Aggregate due & overdue list
  const overdueAndUpcoming = useMemo(() => {
    return [
      ...readinessReport.overdue.map(item => ({
        ...item,
        id: `req-overdue-${item.requirement.id}`,
        isOverdue: true,
        link: `/dashboard/requirements?id=${item.requirement.id}`
      })),
      ...readinessReport.upcomingDue.map(item => ({
        ...item,
        id: `req-upcoming-${item.requirement.id}`,
        isOverdue: false,
        link: `/dashboard/requirements?id=${item.requirement.id}`
      })),
      ...overdueAssetChecks,
      ...upcomingAssetChecks
    ].sort((a, b) => {
      const dateA = a.requirement.next_due_date ? new Date(a.requirement.next_due_date).getTime() : Infinity;
      const dateB = b.requirement.next_due_date ? new Date(b.requirement.next_due_date).getTime() : Infinity;
      return dateA - dateB;
    });
  }, [readinessReport, overdueAssetChecks, upcomingAssetChecks]);

  // Safe Workspace Activity
  const safeActivity = useMemo(() => {
    return (auditLogs || []).slice(0, 5);
  }, [auditLogs]);

  // Timeline / Radar Buckets
  const radarBuckets = useMemo(() => {
    const addDays = (d: Date, days: number) => {
      const r = new Date(d);
      r.setDate(r.getDate() + days);
      return r;
    };
    const day30 = addDays(today, 30);
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

    return items
      .filter(item => {
        const d = new Date(item.dueDate);
        return d >= today && d <= day30;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [frameworkRequirements, documents, competencyRecords, competencyTypes, people, actions, today]);

  // Smart suggestions
  const smartSuggestions = useMemo(() => {
    const list: string[] = [];
    if (overdueAssetChecks.length > 0) {
      list.push(`Record checklist logs for ${overdueAssetChecks.length} overdue checks in the Asset Matrix.`);
    }
    if (stats.expiredCount > 0) {
      list.push(`Provide current files for ${stats.expiredCount} expired framework requirements.`);
    }
    if (unclassifiedDocs.length > 0) {
      list.push(`Assign details and classifications to ${unclassifiedDocs.length} vault documents.`);
    }
    if (overdueActionsCount > 0) {
      list.push(`Update progress or close out ${overdueActionsCount} overdue gap action tasks.`);
    }
    if (list.length === 0) {
      list.push("All modules aligned. Your compliance posture is currently optimal.");
    }
    return list;
  }, [overdueAssetChecks, stats, unclassifiedDocs, overdueActionsCount]);

  // Central Map Satellite Nodes configuration
  const satelliteNodes = useMemo(() => {
    return [
      {
        id: 'requirements',
        name: 'Requirements',
        icon: <ClipboardList className="w-5 h-5" />,
        count: stats.activeRequirements,
        warnings: stats.expiredCount,
        path: '/dashboard/requirements',
        pos: 'left-[43.75%] top-[15%] -translate-x-6 -translate-y-6',
        color: stats.expiredCount > 0 ? 'border-rose-500/40 text-rose-600 dark:text-rose-400' : 'border-border text-foreground',
        description: 'Assurance Objectives',
        actionLabel: 'View Objectives',
        badge: stats.expiredCount,
        badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
      },
      {
        id: 'competencies',
        name: 'Competency Matrix',
        icon: <UserCheck className="w-5 h-5" />,
        count: people.length,
        warnings: competencyRecords.filter(r => r.status === 'Expired' || r.status === 'Missing').length,
        path: '/dashboard/competencies',
        pos: 'left-[17.5%] top-[30%] -translate-x-6 -translate-y-6',
        color: competencyRecords.filter(r => r.status === 'Expired' || r.status === 'Missing').length > 0 ? 'border-amber-500/40 text-amber-600 dark:text-amber-400' : 'border-border text-foreground',
        description: 'Personnel matrix',
        actionLabel: 'View Matrix',
        badge: competencyRecords.filter(r => r.status === 'Expired' || r.status === 'Missing').length,
        badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
      },
      {
        id: 'vault',
        name: 'Evidence Vault',
        icon: <FolderLock className="w-5 h-5" />,
        count: documents.length,
        warnings: unclassifiedDocs.length,
        path: '/dashboard/vault',
        pos: 'left-[71.25%] top-[30%] -translate-x-6 -translate-y-6',
        color: unclassifiedDocs.length > 0 ? 'border-amber-500/40 text-amber-600 dark:text-amber-400' : 'border-border text-foreground',
        description: 'Audit evidence repository',
        actionLabel: 'Open Vault',
        badge: unclassifiedDocs.length,
        badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
      },
      {
        id: 'matrix',
        name: 'Asset Matrix',
        icon: <Grid className="w-5 h-5" />,
        count: assets.length,
        warnings: overdueAssetChecks.length,
        path: '/dashboard/matrix',
        pos: 'left-[17.5%] top-[70%] -translate-x-6 -translate-y-6',
        color: overdueAssetChecks.length > 0 ? 'border-rose-500/40 text-rose-600 dark:text-rose-400' : 'border-border text-foreground',
        description: 'Equipment & facility checks',
        actionLabel: 'Open Matrix',
        badge: overdueAssetChecks.length,
        badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
      },
      {
        id: 'audit-packs',
        name: 'Audit Pack Builder',
        icon: <FolderArchive className="w-5 h-5" />,
        count: auditPacks.length,
        warnings: 0,
        path: '/dashboard/audit-packs',
        pos: 'left-[71.25%] top-[70%] -translate-x-6 -translate-y-6',
        color: 'border-border text-foreground',
        description: 'Readiness reports compiler',
        actionLabel: 'Configure Packs',
        badge: auditPacks.length,
        badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
      },
      {
        id: 'reports',
        name: 'Reports',
        icon: <BarChart3 className="w-5 h-5" />,
        count: 24,
        warnings: 0,
        path: '/dashboard/reports',
        pos: 'left-[43.75%] top-[85%] -translate-x-6 -translate-y-6',
        color: 'border-border text-foreground',
        description: 'Performance overview analytics',
        actionLabel: 'Open Analytics',
        badge: 5,
        badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
      }
    ];
  }, [stats, people, competencyRecords, documents, unclassifiedDocs, assets, overdueAssetChecks, auditPacks]);

  // Asset Categories list compliance progress
  const assetCategoryCompliance = useMemo(() => {
    if (!assetCategories || !assets || !assetCheckAssignments) return [];
    const parents = assetCategories.filter(c => c.active && !c.parent_id);
    return parents.map(parent => {
      const subCategoryIds = assetCategories
        .filter(c => c.active && (c.id === parent.id || c.parent_id === parent.id))
        .map(c => c.id);
      const categoryAssets = assets.filter(a => a.status === 'active' && a.category_id && subCategoryIds.includes(a.category_id));
      const assetIds = categoryAssets.map(a => a.id);
      const categoryAssignments = assetCheckAssignments.filter(asg => asg.active && asg.required && assetIds.includes(asg.asset_id));
      const total = categoryAssignments.length;
      const compliant = categoryAssignments.filter(asg => getAssignmentStatus(asg.id) === 'Compliant').length;
      const percent = total > 0 ? Math.round((compliant / total) * 100) : 100;
      return { id: parent.id, name: parent.name, total, compliant, percent };
    });
  }, [assetCategories, assets, assetCheckAssignments, getAssignmentStatus]);

  // Quick action creates
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
        metadata: {
          source: 'dashboard_quick_uploader',
          context_type: uploadContextType,
          context_target_id: uploadContextTargetId || undefined
        }
      });

      setUploadTitle('');
      setUploadFile(null);
      setUploadExpiry('');
      setUploadContextTargetId('');
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
      setTimeout(() => closeDashboardModal(), 1200);
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
      setTimeout(() => closeDashboardModal(), 1200);
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
      setActionForm({
        requirement_id: '',
        title: '',
        description: '',
        owner: '',
        due_date: ''
      });
      setQuickActionMessage('Corrective Action created.');
      setTimeout(() => closeDashboardModal(), 1200);
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
      await createPack(
        auditPackForm.name.trim(),
        auditPackForm.description.trim() || '',
        auditPackForm.requirementIds,
        []
      );
      setAuditPackForm({
        name: '',
        description: '',
        requirementIds: []
      });
      setQuickActionMessage('Draft Audit Pack saved.');
      setTimeout(() => closeDashboardModal(), 1200);
    } catch (error) {
      setQuickActionError(error instanceof Error ? error.message : 'Unable to create audit pack.');
    } finally {
      setIsQuickActionSaving(false);
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

  // Helper variables for ActionDetailDrawer
  const selectedActionRequirements = selectedAction
    ? frameworkRequirements.filter(requirement =>
        requirementActions.some(link => link.action_id === selectedAction.id && link.requirement_id === requirement.id)
      )
    : [];
  const currentSelectedAction = selectedAction
    ? actions.find(action => action.id === selectedAction.id) || selectedAction
    : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header greeting strip */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/60 backdrop-blur-xs border border-border/80 rounded-2xl p-6 shadow-xs">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight" id="dashboard-heading">
            Welcome back, {user?.full_name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-semibold">
            <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            Active workspace: <strong className="text-foreground">{organization?.name}</strong>
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
          {isDemoMode && (
            <button
              onClick={handleResetDemoData}
              disabled={isResettingDemo}
              className="flex-1 md:flex-initial px-3.5 py-2 bg-muted hover:bg-muted/80 border border-border text-foreground font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              {isResettingDemo ? 'Resetting...' : 'Reset Demo Data'}
            </button>
          )}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-indigo-650 hover:bg-indigo-750 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/10 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" /> Quick Upload
          </button>
        </div>
      </div>

      {(resetMessage || resetError) && (
        <div className={`p-3.5 rounded-xl border text-xs font-bold ${resetError ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>
          {resetError || resetMessage}
        </div>
      )}

      {/* 2. Top KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1: Overall Compliance */}
        <div className="bg-card border border-border rounded-2xl p-4.5 hover:shadow-md transition-all space-y-2.5">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Compliance Health</span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black ${scoreTone(readinessScore)}`}>{readinessScore}%</span>
            <span className="text-[10px] text-muted-foreground font-bold leading-none">Score</span>
          </div>
          <span className="text-[10px] text-muted-foreground block font-bold">Current Snapshot</span>
        </div>

        {/* KPI 2: Requirements */}
        <div className="bg-card border border-border rounded-2xl p-4.5 hover:shadow-md transition-all space-y-2.5">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Requirements</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-foreground">{stats.compliantCount}</span>
            <span className="text-muted-foreground text-xs font-bold">/ {stats.activeRequirements}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${reqProgress}%` }} />
            </div>
            <span className="text-[9px] font-bold text-muted-foreground">{reqProgress}%</span>
          </div>
        </div>

        {/* KPI 3: Evidence Coverage */}
        <div className="bg-card border border-border rounded-2xl p-4.5 hover:shadow-md transition-all space-y-2.5">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Evidence Coverage</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-foreground">{classifiedDocsCount}</span>
            <span className="text-muted-foreground text-xs font-bold">/ {documents.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-1 rounded-full" style={{ width: `${docProgress}%` }} />
            </div>
            <span className="text-[9px] font-bold text-muted-foreground">{docProgress}%</span>
          </div>
        </div>

        {/* KPI 4: Personnel Training */}
        <div className="bg-card border border-border rounded-2xl p-4.5 hover:shadow-md transition-all space-y-2.5">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Personnel Training</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-foreground">{competencySummary.compliancePercent}%</span>
          </div>
          <span className="text-[10px] text-muted-foreground block font-bold truncate">Active certifications</span>
        </div>

        {/* KPI 5: Action Tasks */}
        <div className="bg-card border border-border rounded-2xl p-4.5 hover:shadow-md transition-all space-y-2.5">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Open Tasks / Gaps</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-foreground">{activeActionsCount}</span>
            {overdueActionsCount > 0 && (
              <span className="text-rose-500 text-[10px] font-black uppercase bg-rose-500/10 border border-rose-500/20 px-1 rounded">
                {overdueActionsCount} Exp
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground block font-bold">Actions pending</span>
        </div>

        {/* KPI 6: Asset Assurance */}
        <div className="bg-card border border-border rounded-2xl p-4.5 hover:shadow-md transition-all space-y-2.5">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Asset Assurance</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-foreground">{compliantAssetChecks}</span>
            <span className="text-muted-foreground text-xs font-bold">/ {totalAssetChecks}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-1 rounded-full" style={{ width: `${assetProgress}%` }} />
            </div>
            <span className="text-[9px] font-bold text-muted-foreground">{assetProgress}%</span>
          </div>
        </div>
      </div>

      {/* 3. Core content grid with Sidebar Live Rail */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Central compliance program map */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
            {/* Header controls for central overview */}
            <div className="p-5 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Compliance Program Overview</h3>
                <p className="text-xs text-muted-foreground">Interactive program maps and status monitoring of system modules.</p>
              </div>
              <div className="flex items-center bg-muted border border-border p-0.5 rounded-lg shrink-0">
                <button
                  onClick={() => setViewMode('system')}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'system' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label="View graphical system map"
                >
                  <Network className="w-3.5 h-3.5" /> System View
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label="View list format"
                >
                  <List className="w-3.5 h-3.5" /> List View
                </button>
              </div>
            </div>

            {/* Central content depending on toggle */}
            <div className="p-6">
              {viewMode === 'system' ? (
                /* Upgraded Premium Graphical System Map Layout */
                <>
                  <div className="w-full max-w-[800px] aspect-[2/1] mx-auto relative select-none hidden md:block">
                    {/* Background SVG connections */}
                    <svg viewBox="0 0 800 400" className="absolute inset-0 w-full h-full pointer-events-none">
                      <defs>
                        {/* Glowing effect filter definition */}
                        <filter id="core-glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="8" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                        <radialGradient id="hub-glow-gradient" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="rgba(99, 102, 241, 0.25)" />
                          <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
                        </radialGradient>
                      </defs>

                      <style>{`
                        @keyframes flow-animation {
                          from { stroke-dashoffset: 48; }
                          to { stroke-dashoffset: 0; }
                        }
                        .glowing-flow-line {
                          stroke-dasharray: 8 40;
                          animation: flow-animation 3s linear infinite;
                        }
                      `}</style>

                      {/* Radial glow behind the center hub */}
                      <circle cx="400" cy="200" r="120" fill="url(#hub-glow-gradient)" />

                      {/* Connecting lines from Core to satellites */}
                      {satelliteNodes.map(node => {
                        const isHovered = hoveredNode === node.id;
                        let pathD = '';
                        if (node.id === 'competencies') pathD = 'M 400 200 L 260 200 L 260 120 L 150 120';
                        else if (node.id === 'requirements') pathD = 'M 400 200 L 400 100 L 350 100 L 350 60';
                        else if (node.id === 'vault') pathD = 'M 400 200 L 510 200 L 510 120 L 570 120';
                        else if (node.id === 'audit-packs') pathD = 'M 400 200 L 510 200 L 510 280 L 570 280';
                        else if (node.id === 'reports') pathD = 'M 400 200 L 400 300 L 350 300 L 350 340';
                        else if (node.id === 'matrix') pathD = 'M 400 200 L 260 200 L 260 280 L 150 280';

                        return (
                          <g key={node.id}>
                            {/* Background path with thin subtle opacity */}
                            <path
                              d={pathD}
                              fill="none"
                              className={`transition-all duration-300 stroke-[1.5] ${
                                isHovered
                                  ? 'stroke-indigo-500/60'
                                  : 'stroke-indigo-500/15 dark:stroke-indigo-500/10'
                              }`}
                            />
                            {/* Animated glowing data flow line */}
                            <path
                              d={pathD}
                              fill="none"
                              stroke="#6366f1"
                              strokeWidth="2"
                              className="glowing-flow-line opacity-75"
                              style={{ strokeLinecap: 'round' }}
                            />
                            {/* Thick glow overlay when node is hovered */}
                            {isHovered && (
                              <path
                                d={pathD}
                                fill="none"
                                className="stroke-indigo-400 opacity-40 stroke-[4] animate-pulse"
                                filter="url(#core-glow)"
                                style={{ strokeLinecap: 'round' }}
                              />
                            )}
                          </g>
                        );
                      })}

                      {/* Concentric rings surrounding the central hub */}
                      <circle cx="400" cy="200" r="76" stroke="rgba(99, 102, 241, 0.12)" strokeWidth="1" fill="none" strokeDasharray="6 12" />
                      <circle cx="400" cy="200" r="54" stroke="rgba(6, 182, 212, 0.25)" strokeWidth="1.5" fill="none" />

                      {/* Central Glowing Orb Core (fill/glow) */}
                      <circle cx="400" cy="200" r="46" fill="#070A13" stroke="#6366f1" strokeWidth="2.5" filter="url(#core-glow)" />

                      {/* Slow spinning starburst emblem inside the core (matching the Lumen radial style) */}
                      <g style={{ transformOrigin: '400px 200px', animation: 'spin 120s linear infinite' }}>
                        {Array.from({ length: 32 }).map((_, i) => {
                          const angle = i * (360 / 32);
                          const rad = (angle * Math.PI) / 180;
                          const r1 = 12; // starts inside the core
                          const r2 = i % 2 === 0 ? 38 : 28; // alternating long and short spikes
                          const x1 = 400 + r1 * Math.cos(rad);
                          const y1 = 200 + r1 * Math.sin(rad);
                          const x2 = 400 + r2 * Math.cos(rad);
                          const y2 = 200 + r2 * Math.sin(rad);

                          return (
                            <line
                              key={i}
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              className={`stroke-indigo-400 dark:stroke-indigo-300 opacity-90 ${
                                i % 2 === 0 ? 'stroke-[2]' : 'stroke-[1.5]'
                              }`}
                              strokeLinecap="round"
                            />
                          );
                        })}
                      </g>
                    </svg>

                    {/* Absolute positioned module nodes with side-labels */}
                    {satelliteNodes.map(node => {
                      const isHovered = hoveredNode === node.id;
                      return (
                        <div
                          key={node.id}
                          className={`absolute ${node.pos} flex items-center transition-all duration-300 z-20`}
                          style={{ minWidth: '180px' }}
                        >
                          <Link
                            href={node.path}
                            id={`program-node-${node.id}`}
                            onMouseEnter={() => setHoveredNode(node.id)}
                            onMouseLeave={() => setHoveredNode(null)}
                            onFocus={() => setHoveredNode(node.id)}
                            onBlur={() => setHoveredNode(null)}
                            className={`w-12 h-12 rounded-full bg-card border-2 flex items-center justify-center transition-all duration-300 shadow-xs hover:scale-110 hover:shadow-lg hover:border-indigo-500/80 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shrink-0 ${
                              isHovered ? 'border-indigo-500 shadow-md scale-105' : 'border-border text-foreground'
                            }`}
                            title={`${node.name}: ${node.description}`}
                          >
                            <div className="relative">
                              <span className={isHovered ? 'text-indigo-500 dark:text-indigo-400' : 'text-foreground'}>
                                {node.icon}
                              </span>
                              {node.warnings > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 border border-card text-[8px] font-black text-white flex items-center justify-center animate-pulse">
                                  {node.warnings}
                                </span>
                              )}
                            </div>
                          </Link>

                          {/* Node label details right next to the circle node */}
                          <div className="ml-3 flex flex-col text-left select-none pointer-events-none">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[11px] font-black uppercase tracking-tight transition-colors duration-250 ${
                                isHovered ? 'text-indigo-500 dark:text-indigo-400' : 'text-foreground'
                              }`}>
                                {node.name}
                              </span>
                              {node.badge !== undefined && node.badge > 0 && (
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black leading-none shrink-0 ${node.badgeColor}`}>
                                  {node.badge}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              {node.count} {node.id === 'competencies' ? 'staff' : node.id === 'vault' ? 'files' : node.id === 'reports' ? 'reports' : 'items'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Responsive grid for mobile view */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:hidden">
                    {satelliteNodes.map(node => (
                      <Link
                        key={node.id}
                        href={node.path}
                        className={`p-3 bg-card border rounded-xl flex items-center gap-3 hover:border-indigo-500/50 transition-colors ${node.color}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                          {node.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-foreground uppercase tracking-tight truncate">
                              {node.name}
                            </span>
                            {node.badge !== undefined && node.badge > 0 && (
                              <span className={`px-1 rounded text-[8px] font-black shrink-0 ${node.badgeColor}`}>
                                {node.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-muted-foreground block truncate">
                            {node.count} {node.id === 'competencies' ? 'staff' : node.id === 'vault' ? 'files' : node.id === 'reports' ? 'reports' : 'items'}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                /* Tabular List View of Workspace modules */
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider">
                        <th className="p-3">Module</th>
                        <th className="p-3">Overview Context</th>
                        <th className="p-3 text-center">Active Items</th>
                        <th className="p-3 text-center">Alert Gaps</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {satelliteNodes.map(node => (
                        <tr key={node.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-bold text-foreground flex items-center gap-2">
                            <span className="text-indigo-500">{node.icon}</span>
                            {node.name}
                          </td>
                          <td className="p-3 text-muted-foreground">{node.description}</td>
                          <td className="p-3 text-center font-bold">{node.count}</td>
                          <td className="p-3 text-center">
                            {node.warnings > 0 ? (
                              <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold bg-rose-500/10 text-rose-600 rounded-full border border-rose-500/20">
                                {node.warnings} Issues
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20">
                                Compliant
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <Link
                              href={node.path}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg transition-colors border border-border/80"
                            >
                              {node.actionLabel} <ChevronRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions panel */}
          <section className="bg-card border border-border rounded-2xl p-5 space-y-3.5 shadow-xs">
            <div>
              <h3 className="text-sm font-extrabold text-foreground">Program Quick Actions</h3>
              <p className="text-xs text-muted-foreground">High-frequency compliance operations and records registration.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
              {[
                { label: 'Upload Evidence', desc: 'Add file to vault', icon: <Upload className="w-4 h-4" />, onClick: () => setIsUploadModalOpen(true) },
                { label: 'Create Requirement', desc: 'Add new compliance goal', icon: <ShieldCheck className="w-4 h-4" />, onClick: () => setActiveQuickActionModal('requirement') },
                { label: 'Create Competency', desc: 'Add skills / training', icon: <Briefcase className="w-4 h-4" />, onClick: () => setActiveQuickActionModal('competency') },
                { label: 'Create Action', desc: 'Register gap items', icon: <FileSpreadsheet className="w-4 h-4" />, onClick: () => setActiveQuickActionModal('action') },
                { label: 'Build Audit Pack', desc: 'Export compliance pack', icon: <FileText className="w-4 h-4" />, onClick: () => setActiveQuickActionModal('audit-pack') }
              ].map(action => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className="p-3 bg-muted/40 hover:bg-card hover:border-indigo-500/40 hover:shadow-xs border border-border rounded-xl text-left transition-all duration-200 group flex flex-col justify-between min-h-[96px] cursor-pointer"
                >
                  <div className="p-2 bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                    {action.icon}
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-foreground text-[11px] block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{action.label}</span>
                    <p className="text-[9px] text-muted-foreground line-clamp-1">{action.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Quick upload drop zone section */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
            <h3 className="text-sm font-extrabold text-foreground">Discreet Evidence Drops</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Quickly upload private audit evidence directly from the landing desk.</p>
            <div className="mt-4 border-2 border-dashed border-border/80 hover:border-indigo-500/40 rounded-xl p-6 text-center bg-muted/10">
              <EvidenceDropzone
                label="Drag & drop evidence files here to upload"
                helperText={`Files remain secure and require context confirmation. Max ${formatMaxEvidenceUploadSize()}.`}
                buttonLabel="Browse Documents"
                compact
                multiple
                onUpload={async (file, updateStatus) => {
                  updateStatus('saving record');
                  const doc = await uploadDocument({
                    file,
                    title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim() || file.name,
                    category: 'General',
                    expiry_date: null,
                    issue_date: new Date().toISOString().split('T')[0],
                    metadata: { source: 'dashboard_quick_dropper' }
                  });
                  return doc;
                }}
                onComplete={docs => setUploadSuccess(`Uploaded ${docs.length} document${docs.length === 1 ? '' : 's'} successfully.`)}
                findDuplicates={findPossibleDuplicateDocuments}
              />
            </div>
          </div>
        </div>

        {/* Right-side live intelligence rail */}
        <aside className="space-y-6">
          {/* Rail Section 1: Circular Compliance gauge */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Compliance Snapshot</span>
              <span className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 py-1">
              <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                {/* SVG Circular progress arch */}
                <svg viewBox="0 0 120 120" className="w-full h-full">
                  <defs>
                    <linearGradient id="compliance-gauge-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444" /> {/* Red */}
                      <stop offset="35%" stopColor="#f59e0b" /> {/* Orange/Yellow */}
                      <stop offset="70%" stopColor="#10b981" /> {/* Emerald */}
                      <stop offset="100%" stopColor="#6366f1" /> {/* Indigo */}
                    </linearGradient>
                  </defs>
                  {/* Background Track */}
                  <path
                    d="M 30 95 A 40 40 0 1 1 90 95"
                    fill="transparent"
                    stroke="currentColor"
                    className="text-muted/15 dark:text-muted/10"
                    strokeWidth="9"
                    strokeLinecap="round"
                  />
                  {/* Active Arc */}
                  <path
                    d="M 30 95 A 40 40 0 1 1 90 95"
                    fill="transparent"
                    stroke="url(#compliance-gauge-grad)"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray="188.5"
                    strokeDashoffset={188.5 - ((readinessScore ?? 0) / 100) * 188.5}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center mt-[-8px]">
                  <span className="text-2xl font-black text-foreground">{readinessScore}%</span>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">Overall</span>
                  <div className={`flex items-center gap-0.5 mt-0.5 text-[8px] font-bold ${readinessScore && readinessScore >= 75 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    <span>{readinessScore && readinessScore >= 75 ? '▲' : '▼'}</span>
                    <span>{readinessScore && readinessScore >= 75 ? '4%' : '2%'} vs last month</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>Compliant</span>
                  </div>
                  <span className="font-bold text-foreground">{stats.compliantCount}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    <span>In Progress</span>
                  </div>
                  <span className="font-bold text-foreground">{activeActionsCount}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span>At Risk</span>
                  </div>
                  <span className="font-bold text-foreground">{stats.expiringSoonCount}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span>Non-Compliant</span>
                  </div>
                  <span className="font-bold text-foreground">{stats.expiredCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rail Section 2: Due & Overdue items */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Due & Overdue</span>
            <div className="space-y-3">
              {overdueAndUpcoming.slice(0, 5).map(item => (
                <Link
                  key={item.id}
                  href={item.link}
                  className="flex items-start gap-2.5 p-2 bg-muted/30 hover:bg-muted/65 border border-border/60 rounded-xl transition-colors text-xs outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                >
                  {item.isOverdue ? (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="font-bold block text-foreground truncate">{item.requirement.title}</span>
                    <span className="text-[10px] text-muted-foreground block truncate">{item.requirement.category}</span>
                    <span className={`text-[9px] font-extrabold ${item.isOverdue ? 'text-rose-500' : 'text-amber-500'}`}>
                      Due: {item.requirement.next_due_date || 'N/A'}
                    </span>
                  </div>
                </Link>
              ))}
              {overdueAndUpcoming.length === 0 && (
                <p className="text-[10px] text-muted-foreground italic text-center py-4">No pending items due.</p>
              )}
            </div>
          </div>

          {/* Rail Section 3: Recent Safe Activity */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Recent Workspace Activity</span>
            <div className="space-y-3 relative border-l border-border pl-3.5 ml-1.5 py-1">
              {safeActivity.map(log => (
                <div key={log.id} className="text-[11px] relative space-y-0.5">
                  <div className="absolute -left-[18.5px] top-1.5 w-2 h-2 rounded-full border border-card bg-indigo-500" />
                  <span className="font-bold block text-foreground truncate" title={log.action}>{log.action}</span>
                  <p className="text-muted-foreground text-[10px] leading-relaxed line-clamp-2">{log.details}</p>
                </div>
              ))}
              {safeActivity.length === 0 && (
                <p className="text-[10px] text-muted-foreground italic text-center py-4">No recent activities.</p>
              )}
            </div>
          </div>

          {/* Rail Section 4: Expiring Soon */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Expiring within 30 Days</span>
            <div className="space-y-2.5">
              {radarBuckets.slice(0, 5).map(item => (
                <div key={item.id} className="flex justify-between items-center text-xs p-2 bg-muted/20 rounded-lg">
                  <div className="min-w-0">
                    <span className="font-bold text-foreground block truncate max-w-[120px]">{item.title}</span>
                    <span className="text-[9px] text-muted-foreground block">{item.type}</span>
                  </div>
                  <span className="text-[9px] font-bold text-amber-500">{item.dueDate}</span>
                </div>
              ))}
              {radarBuckets.length === 0 && (
                <p className="text-[10px] text-muted-foreground italic text-center py-4">No exipries in 30 days.</p>
              )}
            </div>
          </div>

          {/* Rail Section 5: Smart Suggestions */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Smart Focus Suggestions</span>
            <div className="space-y-2">
              {smartSuggestions.map((suggestion, idx) => (
                <div key={idx} className="flex gap-2 p-2 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 rounded-xl text-xs text-indigo-650 dark:text-indigo-300 font-semibold leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* 4. Lower Dashboard Panels - Tier 1: Key Performance Dials */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Card 1: Compliance Trend */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Compliance Trend</span>
            <span className="text-[9px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">All Programs</span>
          </div>
          <div className="relative w-full h-32 mt-2">
            <svg viewBox="0 0 300 120" className="w-full h-full">
              <defs>
                <linearGradient id="trend-fill-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(99, 102, 241, 0.25)" />
                  <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
                </linearGradient>
              </defs>
              {/* Horizontal Grid lines */}
              <line x1="10" y1="20" x2="290" y2="20" stroke="currentColor" className="text-muted/10" strokeDasharray="4 4" />
              <line x1="10" y1="50" x2="290" y2="50" stroke="currentColor" className="text-muted/10" strokeDasharray="4 4" />
              <line x1="10" y1="80" x2="290" y2="80" stroke="currentColor" className="text-muted/10" strokeDasharray="4 4" />
              <line x1="10" y1="110" x2="290" y2="110" stroke="currentColor" className="text-muted/10" />

              {/* Area path */}
              <path
                d={`M 20 110 L 20 85 L 70 70 L 120 78 L 170 55 L 220 48 L 270 ${110 - ((readinessScore ?? 92) / 100) * 90} L 270 110 Z`}
                fill="url(#trend-fill-grad)"
              />

              {/* Main Line path */}
              <path
                d={`M 20 85 L 70 70 L 120 78 L 170 55 L 220 48 L 270 ${110 - ((readinessScore ?? 92) / 100) * 90}`}
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Trend points circles */}
              <circle cx="20" cy="85" r="3" fill="#6366f1" />
              <circle cx="70" cy="70" r="3" fill="#6366f1" />
              <circle cx="120" cy="78" r="3" fill="#6366f1" />
              <circle cx="170" cy="55" r="3" fill="#6366f1" />
              <circle cx="220" cy="48" r="3" fill="#6366f1" />
              <circle cx="270" cy={110 - ((readinessScore ?? 92) / 100) * 90} r="4.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />

              {/* Floating label for current month value */}
              <rect x="245" cy={110 - ((readinessScore ?? 92) / 100) * 90 - 24} width="32" height="15" rx="3" fill="#6366f1" />
              <text x="261" y={110 - ((readinessScore ?? 92) / 100) * 90 - 14} fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                {readinessScore}%
              </text>
            </svg>
          </div>
          <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase px-2.5 mt-2">
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
          </div>
        </div>

        {/* Card 2: Requirement Status Donut Chart */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Requirement Status</span>
            <span className="text-[9px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">All Frameworks</span>
          </div>
          <div className="flex items-center justify-between gap-3 py-1">
            <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle cx="50" cy="50" r="36" fill="transparent" stroke="currentColor" className="text-muted/10" strokeWidth="11" />
                
                {/* Compliant segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="11"
                  strokeDasharray="226.2"
                  strokeDashoffset={226.2 - (226.2 * (stats.compliantCount / (stats.activeRequirements || 1)))}
                />
                
                {/* In Progress segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  fill="transparent"
                  stroke="#6366f1"
                  strokeWidth="11"
                  strokeDasharray="226.2"
                  strokeDashoffset={226.2 - (226.2 * (activeActionsCount / (stats.activeRequirements || 1)))}
                  transform={`rotate(${(stats.compliantCount / (stats.activeRequirements || 1)) * 360} 50 50)`}
                />
                
                {/* At Risk segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  fill="transparent"
                  stroke="#f59e0b"
                  strokeWidth="11"
                  strokeDasharray="226.2"
                  strokeDashoffset={226.2 - (226.2 * (stats.expiringSoonCount / (stats.activeRequirements || 1)))}
                  transform={`rotate(${((stats.compliantCount + activeActionsCount) / (stats.activeRequirements || 1)) * 360} 50 50)`}
                />
                
                {/* Non-Compliant segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  fill="transparent"
                  stroke="#ef4444"
                  strokeWidth="11"
                  strokeDasharray="226.2"
                  strokeDashoffset={226.2 - (226.2 * (stats.expiredCount / (stats.activeRequirements || 1)))}
                  transform={`rotate(${((stats.compliantCount + activeActionsCount + stats.expiringSoonCount) / (stats.activeRequirements || 1)) * 360} 50 50)`}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-base font-black text-foreground">{stats.activeRequirements}</span>
                <span className="text-[7px] font-bold text-muted-foreground uppercase">Total</span>
              </div>
            </div>

            <div className="flex-1 space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" /> Compliant</span>
                <span className="text-foreground">{stats.compliantCount} ({stats.activeRequirements > 0 ? Math.round((stats.compliantCount / stats.activeRequirements) * 100) : 0}%)</span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" /> In Progress</span>
                <span className="text-foreground">{activeActionsCount} ({stats.activeRequirements > 0 ? Math.round((activeActionsCount / stats.activeRequirements) * 100) : 0}%)</span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" /> At Risk</span>
                <span className="text-foreground">{stats.expiringSoonCount} ({stats.activeRequirements > 0 ? Math.round((stats.expiringSoonCount / stats.activeRequirements) * 100) : 0}%)</span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" /> Non-Compliant</span>
                <span className="text-foreground">{stats.expiredCount} ({stats.activeRequirements > 0 ? Math.round((stats.expiredCount / stats.activeRequirements) * 100) : 0}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Audit Readiness */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Audit Readiness</span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          </div>
          <div className="flex flex-col items-center py-1.5">
            <div className="relative w-28 h-20 flex items-center justify-center overflow-hidden">
              <svg viewBox="0 0 100 60" className="w-full h-full">
                <defs>
                  <linearGradient id="readiness-gauge-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                {/* Background Track */}
                <path d="M 15 50 A 35 35 0 0 1 85 50" fill="transparent" stroke="currentColor" className="text-muted/15 dark:text-muted/10" strokeWidth="8" strokeLinecap="round" />
                {/* Active Arc */}
                <path
                  d="M 15 50 A 35 35 0 0 1 85 50"
                  fill="transparent"
                  stroke="url(#readiness-gauge-grad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="110"
                  strokeDashoffset={110 - (110 * ((readinessScore ?? 87) / 100))}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute bottom-1 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-foreground">{readinessScore}%</span>
                <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-wider">Audit Ready</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full mt-2 border-t border-border/40 pt-2 text-[10px] text-center font-bold">
              <div>
                <span className="block text-rose-500">{stats.expiredCount}</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-wider block">High Risk Issues</span>
              </div>
              <div className="border-l border-border/40">
                <span className="block text-amber-500">{stats.expiringSoonCount}</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-wider block">Medium Risk Issues</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Training Completion */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Training Completion</span>
            <span className="text-[9px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">This Quarter</span>
          </div>
          <div className="flex flex-col items-center py-1.5">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="currentColor" className="text-muted/10" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="238.8"
                  strokeDashoffset={238.8 - (238.8 * ((competencySummary?.compliancePercent ?? 91) / 100))}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-base font-black text-foreground">{competencySummary?.compliancePercent ?? 91}%</span>
                <span className="text-[7px] font-bold text-muted-foreground uppercase">Completed</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full mt-2 border-t border-border/40 pt-2 text-[10px] text-center font-bold">
              <div>
                <span className="block text-emerald-500">{competencySummary?.valid ?? 182}</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-wider block">Completed</span>
              </div>
              <div className="border-l border-border/40">
                <span className="block text-rose-500">{competencySummary?.expired ?? 18}</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-wider block">Overdue</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tier 2: Lower Lists Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Panel 1: Asset Compliance Categories */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Asset Category Health</span>
          <div className="space-y-3 py-1 text-xs">
            {assetCategoryCompliance.map(category => (
              <div key={category.id} className="space-y-1.5">
                <div className="flex justify-between items-center font-bold">
                  <span>{category.name}</span>
                  <span className="text-muted-foreground">{category.compliant} / {category.total} checks</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${category.percent}%` }} />
                  </div>
                  <span className="font-extrabold text-[10px] text-muted-foreground w-8 text-right">{category.percent}%</span>
                </div>
              </div>
            ))}
            {assetCategoryCompliance.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic text-center py-6">No parent asset categories defined.</p>
            )}
          </div>
        </div>

        {/* Panel 2: Risk Level Areas */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Top Risk Gaps</span>
          <div className="space-y-3 text-xs">
            {[
              { label: 'Critical Risk Items', count: frameworkRequirements.filter(r => r.risk_level === 'Critical' && r.status !== 'GREEN').length, color: 'text-rose-600 bg-rose-500/10 border-rose-500/20' },
              { label: 'High Risk Items', count: frameworkRequirements.filter(r => r.risk_level === 'High' && r.status !== 'GREEN').length, color: 'text-rose-500 bg-rose-500/5 border-rose-500/15' },
              { label: 'Medium Risk Items', count: frameworkRequirements.filter(r => r.risk_level === 'Medium' && r.status !== 'GREEN').length, color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' },
              { label: 'Low Risk Items', count: frameworkRequirements.filter(r => r.risk_level === 'Low' && r.status !== 'GREEN').length, color: 'text-zinc-600 bg-zinc-500/10 border-zinc-500/20' }
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center p-2.5 bg-muted/20 border border-border rounded-xl">
                <span className="font-bold text-foreground">{item.label}</span>
                <span className={`px-2 py-0.5 text-[10px] font-black rounded-md border ${item.color}`}>
                  {item.count} pending
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 3: Workspace Alerts */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Active Alerts</span>
          <div className="space-y-3 text-xs">
            {stats.expiredCount > 0 && (
              <div className="flex items-start gap-2.5 p-2 bg-rose-500/5 border border-rose-500/15 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-rose-600 dark:text-rose-400">{stats.expiredCount} expired objectives</span>
                  <p className="text-[10px] text-muted-foreground">Requirements missing essential evidence records.</p>
                </div>
              </div>
            )}
            {overdueAssetChecks.length > 0 && (
              <div className="flex items-start gap-2.5 p-2 bg-rose-500/5 border border-rose-500/15 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-rose-600 dark:text-rose-400">{overdueAssetChecks.length} asset checkouts expired</span>
                  <p className="text-[10px] text-muted-foreground">Assigned equipment or vehicle checks require action.</p>
                </div>
              </div>
            )}
            {unclassifiedDocs.length > 0 && (
              <div className="flex items-start gap-2.5 p-2 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-amber-600 dark:text-amber-400">{unclassifiedDocs.length} unclassified documents</span>
                  <p className="text-[10px] text-muted-foreground">Newly uploaded evidence files pending classification.</p>
                </div>
              </div>
            )}
            {stats.expiredCount === 0 && overdueAssetChecks.length === 0 && unclassifiedDocs.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic text-center py-6">No critical alerts detected in your workspace.</p>
            )}
          </div>
        </div>
      </div>

      {/* 5. Modals and Quick-Upload dialogs */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card solid-panel border border-border w-full max-w-md rounded-2xl p-6 relative shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-border/60 pb-3 mb-2">
              <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Upload Evidence Document</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Files are private and scoped to this organisation.</p>
              </div>
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
                  placeholder="e.g. Annual Fleet Insurance Cert"
                  value={uploadTitle}
                  onChange={event => setUploadTitle(event.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="quick-category" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Doc Category
                  </label>
                  <select
                    id="quick-category"
                    value={uploadCategory}
                    onChange={event => setUploadCategory(event.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none transition-colors"
                  >
                    <option value="General">General</option>
                    <option value="Vehicle">Vehicle</option>
                    <option value="Driver">Driver</option>
                    <option value="Facility">Facility</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="quick-expiry" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Expiry Date <span className="text-[9px] font-normal text-muted-foreground">(Optional)</span>
                  </label>
                  <input
                    id="quick-expiry"
                    type="date"
                    value={uploadExpiry}
                    onChange={event => setUploadExpiry(event.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  File Attachment
                </label>
                <input
                  type="file"
                  required
                  accept={evidenceAcceptAttribute}
                  onChange={e => {
                    const file = e.target.files?.[0] || null;
                    setUploadFile(file);
                    if (file && !uploadTitle) {
                      setUploadTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim());
                    }
                  }}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none"
                />
              </div>

              {/* Context Selector */}
              <div className="border-t border-border/50 pt-3 space-y-3">
                <div>
                  <label htmlFor="upload-context" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Link Evidence Context
                  </label>
                  <select
                    id="upload-context"
                    value={uploadContextType}
                    onChange={e => {
                      setUploadContextType(e.target.value as 'general' | 'requirement' | 'asset' | 'competency');
                      setUploadContextTargetId('');
                    }}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none transition-colors"
                  >
                    <option value="general">Evidence Vault Only</option>
                    <option value="requirement">Link to Requirement</option>
                    <option value="asset">Link to Asset Check</option>
                    <option value="competency">Link to Competency Record</option>
                  </select>
                </div>

                {uploadContextType === 'requirement' && (
                  <div>
                    <label htmlFor="context-req-target" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Select Requirement Target
                    </label>
                    <select
                      id="context-req-target"
                      required
                      value={uploadContextTargetId}
                      onChange={e => setUploadContextTargetId(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none transition-colors"
                    >
                      <option value="">Choose requirement...</option>
                      {activeRequirements.map(req => (
                        <option key={req.id} value={req.id}>{req.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {uploadContextType === 'asset' && (
                  <div>
                    <label htmlFor="context-asset-target" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Select Asset Check Target
                    </label>
                    <select
                      id="context-asset-target"
                      required
                      value={uploadContextTargetId}
                      onChange={e => setUploadContextTargetId(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none transition-colors"
                    >
                      <option value="">Choose asset check assignment...</option>
                      {(assetCheckAssignments || []).filter(a => a.active && a.required).map(asg => {
                        const asset = assets.find(a => a.id === asg.asset_id);
                        const checkType = assetCheckTypes.find(ct => ct.id === asg.asset_check_type_id);
                        return (
                          <option key={asg.id} value={asg.id}>
                            {checkType?.title || 'Check'} - {asset?.name || 'Asset'}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {uploadContextType === 'competency' && (
                  <div>
                    <label htmlFor="context-comp-target" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Select Competency Record Target
                    </label>
                    <select
                      id="context-comp-target"
                      required
                      value={uploadContextTargetId}
                      onChange={e => setUploadContextTargetId(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none transition-colors"
                    >
                      <option value="">Choose competency record...</option>
                      {competencyRecords.map(rec => {
                        const p = people.find(item => item.id === rec.person_id);
                        const ct = competencyTypes.find(item => item.id === rec.competency_type_id);
                        return (
                          <option key={rec.id} value={rec.id}>
                            {ct?.title || 'Competency'} - {p?.display_name || 'Staff'}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 text-[11px] font-semibold">
                  {uploadError}
                </div>
              )}

              {uploadSuccess && (
                <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 text-[11px] font-semibold">
                  {uploadSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading || !uploadTitle || !uploadFile}
                className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-755 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-md"
              >
                {isUploading ? 'Uploading...' : 'Confirm Upload'}
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
                <button disabled={isQuickActionSaving || !requirementForm.title.trim()} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-lg cursor-pointer">
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
                <button disabled={isQuickActionSaving || !competencyForm.title.trim()} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-lg cursor-pointer">
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
                <button disabled={isQuickActionSaving || !actionForm.requirement_id || !actionForm.title.trim()} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-lg cursor-pointer">
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
                <button disabled={isQuickActionSaving || !auditPackForm.name.trim() || auditPackForm.requirementIds.length === 0} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-lg cursor-pointer">
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
