'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';
import { ActionDetailDrawer } from '@/components/ActionDetailDrawer';
import { EvidenceDropzone } from '@/components/EvidenceDropzone';
import { evidenceAcceptAttribute, formatMaxEvidenceUploadSize } from '@/lib/evidenceStorage';
import { isDemoMode } from '@/lib/env';
import type { Action } from '@/lib/types';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Plus,
  ShieldAlert,
  TrendingUp,
  Upload,
  Calendar,
  AlertTriangle,
  Check,
  Activity,
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
    requirementActions,
    actionUpdates,
    actionDocuments,
    auditLogs,
    resetDemoData,
    uploadDocument,
    updateAction,
    addActionUpdate,
    linkDocumentToAction,
    unlinkDocumentFromAction,
    uploadActionAttachment,
    getDocumentSignedUrl,
    findPossibleDuplicateDocuments
  } = useApp();

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

  const greenRequirements = readinessReport.requirements.filter(requirement => requirement.status === 'GREEN').length;
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

  // Setup list for Attention Centre
  const overdueAndUpcoming = [
    ...readinessReport.overdue.map(item => ({ ...item, isOverdue: true })),
    ...readinessReport.upcomingDue.map(item => ({ ...item, isOverdue: false }))
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

  return (
    <div className="space-y-8">
      {/* Header and Reset Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" id="dashboard-heading">Mission Control</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time compliance intelligence and readiness status for <strong>{organization?.name}</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDemoMode && (
            <button
              onClick={handleResetDemoData}
              disabled={isResettingDemo}
              className="px-3.5 py-2 bg-muted hover:bg-muted/85 border border-border text-foreground font-semibold text-xs rounded-lg transition-all"
            >
              {isResettingDemo ? 'Resetting...' : 'Reset Sample Data'}
            </button>
          )}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/15 transition-all"
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

      {/* Setup walkthrough bar */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-0.5">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Setup Walkthrough</h2>
          <p className="text-[11px] text-muted-foreground">Import templates, link evidence records, and verify staff competencies to generate an audit pack.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] font-bold">
          <Link href="/dashboard/requirements" className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 border border-border rounded-lg transition-colors">1. Import Templates</Link>
          <Link href="/dashboard/vault" className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 border border-border rounded-lg transition-colors">2. Link Evidence</Link>
          <Link href="/dashboard/audit-packs" className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 border border-border rounded-lg transition-colors">3. Generate Pack</Link>
        </div>
      </div>

      {/* SECTION 1 — EXECUTIVE SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Overall Readiness</span>
            <span className={`text-3xl font-extrabold block ${scoreTone(readinessScore)}`}>{readinessScore}%</span>
            <span className="text-[10px] text-muted-foreground block">Continuous compliance score</span>
          </div>
          <div className={`p-3 rounded-xl border ${bgScoreTone(readinessScore)}`}>
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Requirements</span>
            <span className="text-3xl font-extrabold block text-foreground">{stats.activeRequirements}</span>
            <span className="text-[10px] text-muted-foreground block">{stats.compliantCount} fully compliant (green)</span>
          </div>
          <div className="p-3 rounded-xl border bg-muted/10 text-muted-foreground border-border/40">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between">
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
        </div>

        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Open Actions</span>
            <span className="text-3xl font-extrabold block text-indigo-500">{openActions}</span>
            <span className="text-[10px] text-muted-foreground block">{activeActionsCount} active tasks / {completedActionsCount} complete</span>
          </div>
          <div className="p-3 rounded-xl border bg-muted/10 text-muted-foreground border-border/40">
            <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Attention Centre & Readiness Breakdown */}
        <div className="lg:col-span-2 space-y-8">

          {/* SECTION 2 — ATTENTION CENTRE */}
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
                        <div key={item.requirement.id} className="p-3 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-2 items-start text-xs">
                          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-foreground block truncate" title={item.requirement.title}>{item.requirement.title}</span>
                            <span className="text-[9px] text-muted-foreground block truncate">{item.requirement.category} • {item.requirement.risk_level} Risk</span>
                            <span className="text-[9px] text-rose-600 dark:text-rose-400 mt-1 block truncate">
                              {item.reasons.find(r => r.level === 'RED' || r.level === 'AMBER')?.message || 'Gap warning detected.'}
                            </span>
                          </div>
                        </div>
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
                        <div key={item.requirement.id} className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-2 items-start text-xs">
                          <Calendar className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-foreground block truncate" title={item.requirement.title}>{item.requirement.title}</span>
                            <span className="text-[9px] text-muted-foreground block">
                              Review Due: <strong className={item.isOverdue ? 'text-rose-500' : 'text-amber-500'}>{item.requirement.next_due_date || 'None'}</strong>
                            </span>
                            <span className={`text-[8px] font-bold uppercase block mt-1 ${item.isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                              {item.isOverdue ? 'Overdue' : 'Due Soon'}
                            </span>
                          </div>
                        </div>
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
                          onClick={() => setSelectedAction(item.action)}
                          className="w-full text-left p-3 bg-muted/40 hover:bg-muted/65 border border-border/80 rounded-xl flex gap-2 items-start text-xs transition-all"
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
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* SECTION 3 — READINESS BREAKDOWN */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Readiness Breakdown</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Calculated score status across compliance pillars.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Radial Chart Visual */}
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
                      strokeDashoffset={2 * Math.PI * 56 * (1 - readinessScore / 100)}
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

              {/* Progress Pillar Deck */}
              <div className="space-y-4">
                {/* Row 1: Requirements Coverage */}
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

                {/* Row 2: Competency Verification */}
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

                {/* Row 3: Evidence Classification */}
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

                {/* Row 4: Review Cadence */}
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

                {/* Row 5: Task Resolution */}
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

        </div>

        {/* Right Side: Quick Actions & Recent Activity */}
        <div className="space-y-8">

          {/* SECTION 4 — QUICK ACTIONS */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Quick Actions</h2>
              <p className="text-xs text-muted-foreground mt-0.5">High-frequency compliance operations.</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="w-full p-3 bg-muted/50 hover:bg-muted/80 border border-border rounded-xl flex items-center justify-between text-xs font-semibold text-foreground transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg group-hover:scale-105 transition-transform">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span>Upload Evidence</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </button>

              <Link
                href="/dashboard/requirements"
                className="w-full p-3 bg-muted/50 hover:bg-muted/80 border border-border rounded-xl flex items-center justify-between text-xs font-semibold text-foreground transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg group-hover:scale-105 transition-transform">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span>Create Requirement</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/dashboard/competencies"
                className="w-full p-3 bg-muted/50 hover:bg-muted/80 border border-border rounded-xl flex items-center justify-between text-xs font-semibold text-foreground transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg group-hover:scale-105 transition-transform">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <span>Add Competency</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/dashboard/requirements"
                className="w-full p-3 bg-muted/50 hover:bg-muted/80 border border-border rounded-xl flex items-center justify-between text-xs font-semibold text-foreground transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <span>Create Action</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/dashboard/audit-packs"
                className="w-full p-3 bg-muted/50 hover:bg-muted/80 border border-border rounded-xl flex items-center justify-between text-xs font-semibold text-foreground transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg group-hover:scale-105 transition-transform">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span>Build Audit Pack</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* SECTION 5 — RECENT ACTIVITY */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Recent Activity</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Continuous tracking of compliance logs.</p>
            </div>

            <div className="relative border-l border-border pl-4 ml-2 space-y-5 py-2">
              {auditLogs.slice(0, 5).map(log => (
                <div key={log.id} className="text-xs relative">
                  {/* Timeline bullet indicator */}
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
