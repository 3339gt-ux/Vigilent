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
  Upload
} from 'lucide-react';

const scoreTone = (score: number | null) => {
  if (score === null) return 'text-muted-foreground';
  if (score >= 80) return 'text-emerald-500';
  if (score >= 50) return 'text-amber-500';
  return 'text-rose-500';
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
    auditPacks,
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

  const greenRequirements = readinessReport.requirements.filter(requirement => requirement.status === 'GREEN').length;
  const amberRequirements = readinessReport.requirements.filter(requirement => requirement.status === 'AMBER').length;
  const redRequirements = readinessReport.requirements.filter(requirement => requirement.status === 'RED').length;
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
      setUploadSuccess('Document uploaded to private storage.');
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" id="dashboard-heading">Compliance Workspace</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of <strong>{organization?.name}</strong> readiness across requirements, reviews, actions and evidence.
          </p>
        </div>
        <Link
          href="/dashboard/vault"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/15"
          id="dash-vault-btn"
        >
          <Plus className="w-4 h-4" /> Upload Evidence
        </Link>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">First-Run Checklist</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Start with a template pack, upload evidence, link records to requirements, then create an audit pack from the selected requirements.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link href="/dashboard/requirements" className="px-3 py-2 bg-muted hover:bg-muted/80 border border-border rounded-lg font-bold">1. Import Requirements</Link>
            <Link href="/dashboard/vault" className="px-3 py-2 bg-muted hover:bg-muted/80 border border-border rounded-lg font-bold">2. Upload Evidence</Link>
            <Link href="/dashboard/audit-packs" className="px-3 py-2 bg-muted hover:bg-muted/80 border border-border rounded-lg font-bold">3. Build Pack</Link>
            {isDemoMode && (
              <button
                onClick={handleResetDemoData}
                disabled={isResettingDemo}
                className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-700 dark:text-amber-300 rounded-lg font-bold"
              >
                {isResettingDemo ? 'Resetting...' : 'Reset Demo Data'}
              </button>
            )}
          </div>
        </div>
        {(resetMessage || resetError) && (
          <p className={`text-[11px] mt-3 font-semibold ${resetError ? 'text-rose-500' : 'text-emerald-500'}`}>
            {resetError || resetMessage}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Overall Readiness</span>
            <span className={`text-3xl font-extrabold block mt-1 ${scoreTone(readinessScore)}`}>{readinessScore}%</span>
          </div>
          <div className={`p-3 rounded-lg ${readinessScore > 75 ? 'bg-emerald-500/10 text-emerald-500' : readinessScore >= 50 ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Missing Evidence</span>
            <span className="text-3xl font-extrabold block mt-1 text-rose-500">{readinessReport.missingEvidence.length}</span>
          </div>
          <div className="p-3 rounded-lg bg-rose-500/10 text-rose-500">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Overdue Reviews</span>
            <span className="text-3xl font-extrabold block mt-1 text-rose-500">{readinessReport.overdue.length}</span>
          </div>
          <div className="p-3 rounded-lg bg-rose-500/10 text-rose-500">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Open Actions</span>
            <span className="text-3xl font-extrabold block mt-1 text-indigo-500">{openActions}</span>
          </div>
          <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-500">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Link href="/dashboard/requirements" className="bg-card border border-border p-4 rounded-xl hover:bg-muted/30 transition-colors">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Green Requirements</span>
          <span className="text-2xl font-extrabold block mt-1 text-emerald-500">{greenRequirements}</span>
        </Link>
        <Link href="/dashboard/requirements" className="bg-card border border-border p-4 rounded-xl hover:bg-muted/30 transition-colors">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Amber Requirements</span>
          <span className="text-2xl font-extrabold block mt-1 text-amber-500">{amberRequirements}</span>
        </Link>
        <Link href="/dashboard/requirements" className="bg-card border border-border p-4 rounded-xl hover:bg-muted/30 transition-colors">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Red Requirements</span>
          <span className="text-2xl font-extrabold block mt-1 text-rose-500">{redRequirements}</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Link href="/dashboard/competencies" className="bg-card border border-border p-4 rounded-xl hover:bg-muted/30 transition-colors">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Competency Compliance</span>
          <span className={`text-2xl font-extrabold block mt-1 ${scoreTone(competencySummary.compliancePercent)}`}>
            {competencySummary.compliancePercent}%
          </span>
        </Link>
        <Link href="/dashboard/competencies" className="bg-card border border-border p-4 rounded-xl hover:bg-muted/30 transition-colors">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Expiring</span>
          <span className="text-2xl font-extrabold block mt-1 text-amber-500">{competencySummary.expiringSoon}</span>
        </Link>
        <Link href="/dashboard/competencies" className="bg-card border border-border p-4 rounded-xl hover:bg-muted/30 transition-colors">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Expired</span>
          <span className="text-2xl font-extrabold block mt-1 text-rose-500">{competencySummary.expired}</span>
        </Link>
        <Link href="/dashboard/competencies" className="bg-card border border-border p-4 rounded-xl hover:bg-muted/30 transition-colors">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Missing</span>
          <span className="text-2xl font-extrabold block mt-1 text-rose-500">{competencySummary.missing}</span>
        </Link>
        <Link href="/dashboard/competencies" className="bg-card border border-border p-4 rounded-xl hover:bg-muted/30 transition-colors">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Renewals</span>
          <span className="text-2xl font-extrabold block mt-1 text-indigo-500">{competencySummary.upcomingRenewals.length}</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6">Readiness Engine</h2>
            <div className="flex flex-col sm:flex-row items-center gap-8">
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
                <span className="absolute text-4xl font-extrabold">{readinessScore}%</span>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-lg font-bold">
                  {readinessScore >= 80 ? 'High Evidence Readiness' : readinessScore >= 50 ? 'Evidence Gaps Present' : 'Critical Evidence Gaps'}
                </h3>
                <p className="text-xs text-muted-foreground leading-normal max-w-md">
                  {readinessReport.explanation} Each requirement includes the exact evidence, review or action reason that changed its score.
                </p>
                <div className="flex flex-wrap gap-4 pt-1.5 text-[11px] font-semibold text-muted-foreground">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>{stats.compliantCount} Green at 100</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>{stats.expiringSoonCount} Amber at 50</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>{stats.expiredCount} Red at 0</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Category Scores</h2>
              {readinessReport.categoryScores.length === 0 ? (
                <p className="text-xs text-muted-foreground">No assessed categories yet.</p>
              ) : (
                <div className="space-y-3">
                  {readinessReport.categoryScores.map(category => (
                    <div key={category.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>{category.name}</span>
                        <span className={scoreTone(category.score)}>{category.score ?? 'N/A'}{category.score !== null ? '%' : ''}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${category.score || 0}%` }}></div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{category.scored} scored, {category.grey} excluded</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Risk Scores</h2>
              {readinessReport.riskScores.length === 0 ? (
                <p className="text-xs text-muted-foreground">No assessed risk levels yet.</p>
              ) : (
                <div className="space-y-3">
                  {readinessReport.riskScores.map(risk => (
                    <div key={risk.name} className="p-3 bg-muted/30 border border-border/60 rounded-lg text-xs flex justify-between items-center">
                      <div>
                        <span className="font-bold block">{risk.name}</span>
                        <span className="text-[10px] text-muted-foreground">{risk.red} red, {risk.amber} amber, {risk.green} green</span>
                      </div>
                      <span className={`font-extrabold ${scoreTone(risk.score)}`}>{risk.score ?? 'N/A'}{risk.score !== null ? '%' : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Top 10 Risks</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Highest priority amber and red requirements, including the reason each item affects readiness.</p>
              </div>
              <Link href="/dashboard/requirements" className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
                View Requirements <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {readinessReport.topRisks.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground flex flex-col items-center justify-center gap-3 bg-muted/10 border border-dashed border-border rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <span className="font-semibold text-foreground">All Clear</span>
                <span>No amber or red requirement risks currently detected.</span>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {readinessReport.topRisks.map(item => (
                  <div key={item.requirement.id} className="py-3.5 flex justify-between items-start gap-4 text-xs">
                    <div className="min-w-0">
                      <span className="font-semibold block truncate">{item.requirement.title}</span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        {item.requirement.category} | {item.requirement.risk_level} risk | Score {item.score}
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-1">
                        {item.reasons.find(reason => reason.level === 'RED' || reason.level === 'AMBER')?.message || 'Readiness warning detected.'}
                      </span>
                      {item.openActions[0] && (
                        <button
                          onClick={() => setSelectedAction(item.openActions[0])}
                          className="mt-2 text-[10px] font-bold text-indigo-500 hover:underline"
                        >
                          Open related action
                        </button>
                      )}
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full shrink-0 border ${
                      item.status === 'RED'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Missing Evidence ({readinessReport.missingEvidence.length})</h2>
              {readinessReport.missingEvidence.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground flex flex-col items-center justify-center gap-2 bg-muted/10 border border-dashed border-border rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <span>No missing evidence detected.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {readinessReport.missingEvidence.slice(0, 8).map(item => (
                    <div key={item.requirement.id} className="text-xs flex justify-between gap-3">
                      <span className="font-semibold truncate">{item.requirement.title}</span>
                      <span className="text-rose-500 font-bold shrink-0">Missing</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Overdue Reviews ({readinessReport.overdue.length})</h2>
              {readinessReport.overdue.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground flex flex-col items-center justify-center gap-2 bg-muted/10 border border-dashed border-border rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <span>No overdue reviews detected.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {readinessReport.overdue.slice(0, 8).map(item => (
                    <div key={item.requirement.id} className="text-xs flex justify-between gap-3">
                      <span className="font-semibold truncate">{item.requirement.title}</span>
                      <span className="text-rose-500 font-bold shrink-0">{item.requirement.next_due_date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rebalanced: Unclassified Documents and Open Audit Packs side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Unclassified Documents ({unclassifiedDocs.length})</h2>
              <p className="text-[11px] text-muted-foreground mb-4">Files missing expiry metadata required for continuous tracking.</p>

              {unclassifiedDocs.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground bg-muted/10 border border-dashed border-border rounded-xl">
                  No unclassified documents.
                </div>
              ) : (
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {unclassifiedDocs.map(doc => (
                    <div key={doc.id} className="p-3 bg-muted/40 border border-border/80 rounded-lg flex justify-between items-center text-xs">
                      <div className="overflow-hidden mr-2">
                        <span className="font-semibold block truncate">{doc.title}</span>
                        <span className="text-[10px] text-muted-foreground block truncate mt-0.5">{doc.file_name}</span>
                      </div>
                      <Link
                        href="/dashboard/vault"
                        className="px-2 py-1 bg-indigo-500/10 text-indigo-500 font-bold text-[10px] rounded hover:bg-indigo-500/20 shrink-0"
                      >
                        Classify
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Open Audit Packs</h2>
                <Link href="/dashboard/audit-packs" className="text-xs text-indigo-500 hover:underline">
                  Create Pack
                </Link>
              </div>

              {auditPacks.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground bg-muted/10 border border-dashed border-border rounded-xl">
                  No audit packs created yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {auditPacks.map(pack => (
                    <div key={pack.id} className="p-3 bg-card border border-border rounded-lg text-xs space-y-2">
                      <div className="flex justify-between items-center font-bold">
                        <span className="truncate">{pack.name}</span>
                        <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase ${
                          (pack.status === 'Ready' || pack.status === 'Active') ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-500/10 text-zinc-500'
                        }`}>
                          {pack.status === 'Active' ? 'Ready' : pack.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                        <span>{(pack.requirements || []).length} Requirements</span>
                        <span>{pack.documents.length} Evidence Docs</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rebalanced: Recent Audit Activity (Full Width for Left Column) */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Recent Audit Activity</h2>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {auditLogs.slice(0, 5).map(log => (
                <div key={log.id} className="text-xs flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5"></div>
                  <div>
                    <span className="font-semibold block text-foreground">{log.action}</span>
                    <p className="text-muted-foreground text-[10px] leading-relaxed mt-0.5">{log.details}</p>
                    <span className="text-[9px] text-muted-foreground block mt-1">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Readiness Trend</h2>
            <div className="space-y-3">
              {readinessReport.readinessTrend.map(point => (
                <div key={point.label} className="flex items-center gap-3 text-xs">
                  <span className="w-16 text-muted-foreground font-bold">{point.label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${point.score || 0}%` }}></div>
                  </div>
                  <span className={`w-12 text-right font-extrabold ${scoreTone(point.score)}`}>{point.score ?? 'N/A'}{point.score !== null ? '%' : ''}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-4">The first release shows current score with a placeholder previous point until historical snapshots are stored.</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Open Actions ({openActions})</h2>
            {readinessReport.openActionItems.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground flex flex-col items-center justify-center gap-2 bg-muted/10 border border-dashed border-border rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <span>No open action items.</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {readinessReport.openActionItems.slice(0, 8).map(item => (
                  <button
                    key={item.action.id}
                    onClick={() => setSelectedAction(item.action)}
                    className="w-full text-left p-3 bg-muted/40 border border-border/80 rounded-lg text-xs hover:bg-muted/60 transition-colors"
                  >
                    <span className="font-semibold block">{item.action.title}</span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      {item.requirements.map(requirement => requirement.title).join(', ') || 'No linked requirement'}{item.action.target_due_date || item.action.due_date ? ` | Due ${item.action.target_due_date || item.action.due_date}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Upcoming Due ({readinessReport.upcomingDue.length})</h2>
            {readinessReport.upcomingDue.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground flex flex-col items-center justify-center gap-2 bg-muted/10 border border-dashed border-border rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <span>No reviews due soon.</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                {readinessReport.upcomingDue.slice(0, 8).map(item => (
                  <div key={item.requirement.id} className="text-xs flex justify-between gap-3">
                    <span className="font-semibold truncate">{item.requirement.title}</span>
                    <span className="text-amber-500 font-bold shrink-0">{item.requirement.next_due_date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Quick Upload</h2>

            <form onSubmit={handleQuickUpload} className="space-y-3.5 text-xs">
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

              <EvidenceDropzone
                label="Drag files here for quick multi-upload"
                helperText={`Uses selected category and expiry date. Max ${formatMaxEvidenceUploadSize()} per file.`}
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
                onComplete={docs => setUploadSuccess(`Uploaded ${docs.length} document${docs.length === 1 ? '' : 's'} to private storage.`)}
                findDuplicates={findPossibleDuplicateDocuments}
              />

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
                    Upload File
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
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
