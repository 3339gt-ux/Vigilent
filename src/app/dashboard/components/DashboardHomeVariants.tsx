'use client';

import React from 'react';
import {
  ClipboardList,
  Users,
  Package,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  FileWarning,
  ChevronRight
} from 'lucide-react';
import type { Action, EvidenceDocument } from '@/lib/types';

interface DashboardHomeVariantsProps {
  variant: 'map' | 'executive-bar' | 'taskboard' | 'evidence-readiness' | 'matrix-overview' | 'focus-mode';
  stats: any;
  documents: EvidenceDocument[];
  classifiedDocsCount: number;
  unclassifiedDocs: EvidenceDocument[];
  people: any[];
  competencyRecords: any[];
  competencySummary: any;
  totalAssetChecks: number;
  compliantAssetChecks: number;
  overdueAssetChecks: any[];
  upcomingAssetChecks: any[];
  auditPacks: any[];
  actions: Action[];
  activeActionsCount: number;
  overdueActionsCount: number;
  activeRequirements: any[];
  greyRequirementCount: number;
  onNavigate: (path: string) => void;
  renderCommandMap: () => React.ReactNode;
}

export default function DashboardHomeVariants({
  variant,
  stats,
  documents,
  classifiedDocsCount,
  unclassifiedDocs,
  people,
  competencyRecords,
  competencySummary,
  totalAssetChecks,
  compliantAssetChecks,
  overdueAssetChecks,
  upcomingAssetChecks,
  auditPacks,
  actions,
  activeActionsCount,
  overdueActionsCount,
  activeRequirements,
  greyRequirementCount,
  onNavigate,
  renderCommandMap
}: DashboardHomeVariantsProps) {

  // Return Command Map node hero
  if (variant === 'map') {
    return <>{renderCommandMap()}</>;
  }

  // 1. Executive KPI Command Bar
  if (variant === 'executive-bar') {
    const kpis = [
      {
        title: 'Overall Readiness',
        value: stats.activeRequirements > 0 ? `${Math.round((stats.compliantCount / stats.activeRequirements) * 100)}%` : 'N/A',
        description: `${stats.compliantCount} of ${stats.activeRequirements} requirements compliant`,
        color: 'text-indigo-650 dark:text-indigo-450 border-indigo-500/10 bg-indigo-500/5',
        icon: <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
        path: '/dashboard/reports'
      },
      {
        title: 'Open Actions',
        value: activeActionsCount,
        description: `${overdueActionsCount} overdue corrective tasks`,
        color: 'text-rose-600 dark:text-rose-450 border-rose-500/10 bg-rose-500/5',
        icon: <Activity className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
        path: '/dashboard/requirements'
      },
      {
        title: 'Overdue Checks',
        value: overdueAssetChecks.length,
        description: 'Asset safety and compliance checks',
        color: 'text-amber-600 dark:text-amber-450 border-amber-500/10 bg-amber-500/5',
        icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
        path: '/dashboard/matrix'
      },
      {
        title: 'Missing Evidence',
        value: stats.missingCount || 0,
        description: `${unclassifiedDocs.length} unclassified vault records`,
        color: 'text-sky-600 dark:text-sky-450 border-sky-500/10 bg-sky-500/5',
        icon: <FileWarning className="w-5 h-5 text-sky-600 dark:text-sky-400" />,
        path: '/dashboard/vault'
      },
      {
        title: 'Expiring Competencies',
        value: competencyRecords.filter(r => r.status === 'Expired' || r.status === 'Missing').length,
        description: `${competencySummary.compliancePercent}% teammate validity index`,
        color: 'text-emerald-600 dark:text-emerald-450 border-emerald-500/10 bg-emerald-500/5',
        icon: <Users className="w-5 h-5 text-emerald-650 dark:text-emerald-400" />,
        path: '/dashboard/competencies'
      },
      {
        title: 'Asset Checks Staged',
        value: totalAssetChecks,
        description: `${compliantAssetChecks} active checks compliant`,
        color: 'text-violet-600 dark:text-violet-455 border-violet-500/10 bg-violet-500/5',
        icon: <Package className="w-5 h-5 text-violet-600 dark:text-violet-400" />,
        path: '/dashboard/matrix'
      }
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Executive Overview</h3>
            <p className="text-[10px] text-muted-foreground">Snapshot metrics for active compliance controls.</p>
          </div>
          <div className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-muted border border-border text-muted-foreground">
            Current Snapshot
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((kpi, idx) => (
            <div
              key={idx}
              onClick={() => onNavigate(kpi.path)}
              className="group relative bg-card border border-border/80 hover:border-border p-4.5 rounded-xl transition-all cursor-pointer select-none hover:shadow-xs flex flex-col justify-between h-32"
            >
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg border ${kpi.color}`}>
                  {kpi.icon}
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-foreground block tracking-tight">{kpi.value}</span>
                <span className="text-[10.5px] font-bold text-foreground block mt-0.5">{kpi.title}</span>
                <span className="text-[9.5px] text-muted-foreground block mt-0.5">{kpi.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Operations Taskboard
  if (variant === 'taskboard') {
    const overdueTasks: { title: string; subtitle: string; path: string }[] = [];
    const dueNowTasks: { title: string; subtitle: string; path: string }[] = [];
    const missingEvidenceTasks: { title: string; subtitle: string; path: string }[] = [];
    const awaitingReviewTasks: { title: string; subtitle: string; path: string }[] = [];

    // Overdue checks
    overdueAssetChecks.forEach(asg => {
      overdueTasks.push({
        title: asg.requirement.title,
        subtitle: `Asset Check Overdue • Target: ${asg.requirement.next_due_date ? new Date(asg.requirement.next_due_date).toLocaleDateString() : 'N/A'}`,
        path: asg.link
      });
    });

    // Overdue actions
    actions.filter(a => {
      if (a.status !== 'Open' && a.status !== 'In Progress') return false;
      const d = a.target_due_date || a.due_date;
      return d && new Date(d) < new Date();
    }).forEach(action => {
      overdueTasks.push({
        title: action.title,
        subtitle: `Action Overdue • Due: ${action.due_date ? new Date(action.due_date).toLocaleDateString() : 'N/A'}`,
        path: '/dashboard/requirements'
      });
    });

    // Expired requirements
    activeRequirements.filter(r => r.status === 'RED').forEach(req => {
      overdueTasks.push({
        title: req.title,
        subtitle: `Requirement Expired • Owner: ${req.owner || 'System'}`,
        path: `/dashboard/requirements?id=${req.id}`
      });
    });

    // Due now
    upcomingAssetChecks.forEach(asg => {
      dueNowTasks.push({
        title: asg.requirement.title,
        subtitle: `Asset check due soon • Due: ${asg.requirement.next_due_date ? new Date(asg.requirement.next_due_date).toLocaleDateString() : 'N/A'}`,
        path: asg.link
      });
    });

    activeRequirements.filter(r => r.status === 'AMBER').forEach(req => {
      dueNowTasks.push({
        title: req.title,
        subtitle: `Requirement review due soon • Target: ${req.next_due_date ? new Date(req.next_due_date).toLocaleDateString() : 'N/A'}`,
        path: `/dashboard/requirements?id=${req.id}`
      });
    });

    // Missing evidence
    activeRequirements.filter(r => r.status === 'GREY').slice(0, 5).forEach(req => {
      missingEvidenceTasks.push({
        title: req.title,
        subtitle: 'Unassessed requirement. Lacks associated proof.',
        path: `/dashboard/requirements?id=${req.id}`
      });
    });

    unclassifiedDocs.slice(0, 5).forEach(doc => {
      missingEvidenceTasks.push({
        title: doc.title,
        subtitle: 'Unclassified document in Evidence Vault.',
        path: `/dashboard/vault?doc=${doc.id}`
      });
    });

    // Awaiting review
    auditPacks.filter(p => p.status === 'Draft').forEach(pack => {
      awaitingReviewTasks.push({
        title: pack.name,
        subtitle: 'Audit pack draft. Ready for internal preview.',
        path: `/dashboard/audit-packs?pack=${pack.id}`
      });
    });

    const lanes = [
      { id: 'overdue', title: 'Overdue / Alerts', items: overdueTasks.slice(0, 5), badge: overdueTasks.length, color: 'bg-rose-500' },
      { id: 'due-now', title: 'Due Soon', items: dueNowTasks.slice(0, 5), badge: dueNowTasks.length, color: 'bg-amber-500' },
      { id: 'missing', title: 'Evidence Required', items: missingEvidenceTasks.slice(0, 5), badge: missingEvidenceTasks.length, color: 'bg-indigo-500' },
      { id: 'review', title: 'Awaiting Review', items: awaitingReviewTasks.slice(0, 5), badge: awaitingReviewTasks.length, color: 'bg-sky-500' }
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Operations Taskboard</h3>
            <p className="text-[10px] text-muted-foreground">Action-oriented work queues for outstanding checks, audits, and tasks.</p>
          </div>
          <div className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-muted border border-border text-muted-foreground">
            Current Snapshot
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {lanes.map(lane => (
            <div key={lane.id} className="bg-muted/10 border border-border/80 rounded-xl overflow-hidden flex flex-col max-h-[420px]">
              <div className="p-3 border-b border-border bg-card flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${lane.color}`} />
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-foreground">{lane.title}</span>
                </div>
                <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-bold bg-muted text-muted-foreground border border-border">
                  {lane.badge}
                </span>
              </div>
              <div className="p-2.5 overflow-y-auto space-y-2 flex-1 min-h-[120px]">
                {lane.items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground/60 text-[9.5px]">
                    No items in queue
                  </div>
                ) : (
                  lane.items.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => onNavigate(item.path)}
                      className="bg-card border border-border hover:border-indigo-500/30 p-2.5 rounded-lg transition-all cursor-pointer hover:shadow-xs group space-y-1"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] font-semibold text-foreground leading-tight group-hover:text-indigo-650 dark:group-hover:text-indigo-400 break-words flex-1">
                          {item.title}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0 group-hover:translate-x-0.5 transition-all mt-0.5" />
                      </div>
                      <span className="text-[8.5px] text-muted-foreground block leading-tight">{item.subtitle}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. Evidence Readiness Dashboard
  if (variant === 'evidence-readiness') {
    const totalDocs = documents.length;
    const progressPercent = totalDocs > 0 ? Math.round((classifiedDocsCount / totalDocs) * 100) : 0;

    const sortedDocs = [...documents]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 5);

    const missingEvidenceReqs = activeRequirements.filter(
      r => r.status === 'RED' || r.status === 'AMBER'
    ).slice(0, 5);

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Evidence Readiness</h3>
            <p className="text-[10px] text-muted-foreground">Focus on document coverage, classifications, and verification.</p>
          </div>
          <div className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-muted border border-border text-muted-foreground">
            Current Snapshot
          </div>
        </div>

        {/* Progress Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-card border border-border p-4.5 rounded-xl flex flex-col justify-between h-44">
            <div>
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Evidence Coverage</span>
              <span className="text-3xl font-black text-foreground block mt-1">{progressPercent}%</span>
              <span className="text-[9.5px] text-muted-foreground block mt-0.5">
                {classifiedDocsCount} of {totalDocs} vault documents classified
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-650 h-1.5 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="lg:col-span-1 bg-card border border-border p-4.5 rounded-xl flex flex-col justify-between h-44">
            <div>
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Unclassified Files</span>
              <span className="text-3xl font-black text-amber-605 dark:text-amber-400 block mt-1">{unclassifiedDocs.length}</span>
              <span className="text-[9.5px] text-muted-foreground block mt-0.5">
                Documents awaiting association with compliance controls.
              </span>
            </div>
            <button
              onClick={() => onNavigate('/dashboard/vault')}
              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1.5 cursor-pointer mt-2 w-max"
            >
              Classify Files <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="lg:col-span-1 bg-card border border-border p-4.5 rounded-xl flex flex-col justify-between h-44">
            <div>
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Duplicate Warnings</span>
              <span className="text-3xl font-black text-foreground block mt-1">
                {totalDocs > 0 ? '0' : 'N/A'}
              </span>
              <span className="text-[9.5px] text-muted-foreground block mt-0.5">
                Duplicate check verification engine active.
              </span>
            </div>
            <div className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[9px] font-bold rounded-lg inline-flex items-center gap-1.5 w-max">
              <CheckCircle2 className="w-3.5 h-3.5" /> Checking active
            </div>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Missing Evidence */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-3 bg-muted/15 border-b border-border flex justify-between items-center">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-foreground">Controls Lacking Evidence</span>
              <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-450 border border-rose-550/20">
                {missingEvidenceReqs.length} Warnings
              </span>
            </div>
            <div className="p-3 space-y-2">
              {missingEvidenceReqs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/60 text-[9.5px]">
                  No missing evidence alerts detected.
                </div>
              ) : (
                missingEvidenceReqs.map(req => (
                  <div
                    key={req.id}
                    onClick={() => onNavigate(`/dashboard/requirements?id=${req.id}`)}
                    className="border border-border/80 hover:border-indigo-500/20 p-2.5 rounded-lg transition-all cursor-pointer flex justify-between items-center group"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-bold text-foreground block truncate max-w-[220px]">
                        {req.title}
                      </span>
                      <span className="text-[8.5px] text-muted-foreground block">
                        Category: {req.category || 'General'}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-md text-[8.5px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      Needs Evidence
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Vault Additions */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-3 bg-muted/15 border-b border-border flex justify-between items-center">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-foreground">Recently Stored Evidence</span>
              <span className="text-[8.5px] text-muted-foreground">Latest 5 uploads</span>
            </div>
            <div className="p-3 space-y-2">
              {sortedDocs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/60 text-[9.5px]">
                  No documents found. Open the Evidence Vault to add files.
                </div>
              ) : (
                sortedDocs.map(doc => (
                  <div
                    key={doc.id}
                    onClick={() => onNavigate(`/dashboard/vault?doc=${doc.id}`)}
                    className="border border-border/80 hover:border-indigo-500/20 p-2.5 rounded-lg transition-all cursor-pointer flex justify-between items-center group"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-bold text-foreground block truncate max-w-[220px]">
                        {doc.title}
                      </span>
                      <span className="text-[8.5px] text-muted-foreground block">
                        Stored: {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded-md text-[8.5px] font-bold ${
                      doc.status !== 'Unclassified'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {doc.status || 'General'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Matrix Overview
  if (variant === 'matrix-overview') {
    const totalPeople = people.length;
    const expiringSoonCompetencies = competencyRecords.filter(r => r.status === 'Expiring Soon').length;
    const expiredCompetencies = competencyRecords.filter(r => r.status === 'Expired').length;
    const missingCompetencies = competencyRecords.filter(r => r.status === 'Missing').length;

    const reqsCompliant = stats.compliantCount;
    const reqsAtRisk = stats.expiringSoonCount;
    const reqsAlert = stats.expiredCount;
    const reqsNotAssessed = greyRequirementCount;

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Matrix Overview</h3>
            <p className="text-[10px] text-muted-foreground">Teammate competencies, assets, requirements and actions overview.</p>
          </div>
          <div className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-muted border border-border text-muted-foreground">
            Current Snapshot
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Teammates Matrix card */}
          <div className="bg-card border border-border p-4.5 rounded-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Teammate Matrix</span>
                <Users className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Total Teammates</span>
                  <span className="font-bold text-foreground">{totalPeople}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Valid Credentials</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{competencySummary.compliancePercent}%</span>
                </div>
                <div className="space-y-1 pt-2 border-t border-border/60 text-[9.5px]">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Expired</span>
                    <span className="font-semibold text-rose-600">{expiredCompetencies}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Expiring Soon</span>
                    <span className="font-semibold text-amber-600">{expiringSoonCompetencies}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Missing Proof</span>
                    <span className="font-semibold text-zinc-500">{missingCompetencies}</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('/dashboard/competencies')}
              className="w-full py-1.5 mt-2 bg-muted hover:bg-muted/80 text-[10px] font-bold rounded-lg border border-border text-center block cursor-pointer transition-colors"
            >
              Open Teammates Matrix
            </button>
          </div>

          {/* Asset Check Matrix card */}
          <div className="bg-card border border-border p-4.5 rounded-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Asset Matrix</span>
                <Package className="w-4 h-4 text-violet-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Active Check Points</span>
                  <span className="font-bold text-foreground">{totalAssetChecks}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Checks Compliant</span>
                  <span className="font-bold text-violet-600 dark:text-violet-400">
                    {totalAssetChecks > 0 ? `${Math.round((compliantAssetChecks / totalAssetChecks) * 100)}%` : '100%'}
                  </span>
                </div>
                <div className="space-y-1 pt-2 border-t border-border/60 text-[9.5px]">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Overdue Checks</span>
                    <span className="font-semibold text-rose-600">{overdueAssetChecks.length}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Upcoming Checks</span>
                    <span className="font-semibold text-amber-600">{upcomingAssetChecks.length}</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('/dashboard/matrix')}
              className="w-full py-1.5 mt-2 bg-muted hover:bg-muted/80 text-[10px] font-bold rounded-lg border border-border text-center block cursor-pointer transition-colors"
            >
              Open Asset Matrix
            </button>
          </div>

          {/* Requirements Status card */}
          <div className="bg-card border border-border p-4.5 rounded-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Requirement Status</span>
                <ClipboardList className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Total Requirements</span>
                  <span className="font-bold text-foreground">{activeRequirements.length}</span>
                </div>
                <div className="space-y-1 pt-2 border-t border-border/60 text-[9.5px]">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Compliant</span>
                    <span className="font-semibold text-emerald-600">{reqsCompliant}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>At Risk</span>
                    <span className="font-semibold text-amber-600">{reqsAtRisk}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Needs Attention</span>
                    <span className="font-semibold text-rose-600">{reqsAlert}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Not Assessed</span>
                    <span className="font-semibold text-zinc-500">{reqsNotAssessed}</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('/dashboard/requirements')}
              className="w-full py-1.5 mt-2 bg-muted hover:bg-muted/80 text-[10px] font-bold rounded-lg border border-border text-center block cursor-pointer transition-colors"
            >
              Open Requirements
            </button>
          </div>

          {/* Action Tasks card */}
          <div className="bg-card border border-border p-4.5 rounded-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Corrective Actions</span>
                <Activity className="w-4 h-4 text-rose-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Active Actions</span>
                  <span className="font-bold text-foreground">{activeActionsCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Overdue Actions</span>
                  <span className="font-bold text-rose-600">{overdueActionsCount}</span>
                </div>
                <div className="space-y-1 pt-2 border-t border-border/60 text-[9.5px]">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total corrective logged</span>
                    <span className="font-semibold text-foreground">{actions.length}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Closed action points</span>
                    <span className="font-semibold text-emerald-600">{actions.filter(a => a.status === 'Complete').length}</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('/dashboard/requirements')}
              className="w-full py-1.5 mt-2 bg-muted hover:bg-muted/80 text-[10px] font-bold rounded-lg border border-border text-center block cursor-pointer transition-colors"
            >
              Manage Gaps & Actions
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Focus Mode
  if (variant === 'focus-mode') {
    const priorities: { title: string; desc: string; type: string; color: string }[] = [];
    if (overdueActionsCount > 0) {
      priorities.push({
        title: `${overdueActionsCount} Overdue Corrective Actions`,
        desc: 'Overdue task queue requires review.',
        type: 'Action',
        color: 'border-rose-500/20 text-rose-700 dark:text-rose-400 bg-rose-500/5'
      });
    }
    if (overdueAssetChecks.length > 0) {
      priorities.push({
        title: `${overdueAssetChecks.length} Overdue Asset Inspections`,
        desc: 'Staged safety checks have expired training or validation metrics.',
        type: 'Asset',
        color: 'border-amber-500/20 text-amber-700 dark:text-amber-400 bg-amber-500/5'
      });
    }
    if (competencyRecords.filter(r => r.status === 'Expired').length > 0) {
      priorities.push({
        title: `${competencyRecords.filter(r => r.status === 'Expired').length} Expired Teammate Credentials`,
        desc: 'Teammates hold expired requirements or mandatory training limits.',
        type: 'Teammates',
        color: 'border-violet-500/20 text-violet-700 dark:text-violet-400 bg-violet-500/5'
      });
    }

    if (priorities.length < 3) {
      activeRequirements.filter(r => r.status === 'RED').slice(0, 3 - priorities.length).forEach(req => {
        priorities.push({
          title: `Needs Attention: ${req.title}`,
          desc: 'Primary compliance control is unassessed or lacks required evidence.',
          type: 'Control',
          color: 'border-indigo-500/20 text-indigo-700 dark:text-indigo-400 bg-indigo-500/5'
        });
      });
    }

    const nextDue: { title: string; date: string; category: string }[] = [];
    upcomingAssetChecks.slice(0, 3).forEach(c => {
      nextDue.push({
        title: c.requirement.title,
        date: c.requirement.next_due_date ? new Date(c.requirement.next_due_date).toLocaleDateString() : 'N/A',
        category: 'Asset Check'
      });
    });

    activeRequirements.filter(r => r.status === 'AMBER').slice(0, 2).forEach(r => {
      nextDue.push({
        title: r.title,
        date: r.next_due_date ? new Date(r.next_due_date).toLocaleDateString() : 'N/A',
        category: 'Requirement'
      });
    });

    const quickLinks = [
      { label: 'Requirements', path: '/dashboard/requirements' },
      { label: 'Teammates Matrix', path: '/dashboard/competencies' },
      { label: 'Asset Matrix', path: '/dashboard/matrix' },
      { label: 'Evidence Vault', path: '/dashboard/vault' }
    ];

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Focus Mode</h3>
            <p className="text-[10px] text-muted-foreground">Simplified daily view targeting critical compliance tasks.</p>
          </div>
          <div className="flex items-center gap-4 bg-card border border-border px-3 py-1.5 rounded-xl">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Readiness Score</span>
            <span className="text-sm font-black text-indigo-660 dark:text-indigo-400">
              {stats.activeRequirements > 0 ? `${Math.round((stats.compliantCount / stats.activeRequirements) * 100)}%` : 'N/A'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Priorities Panel */}
          <div className="md:col-span-2 space-y-4">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block pl-0.5">Top Priorities</span>
            <div className="space-y-3">
              {priorities.length === 0 ? (
                <div className="p-8 border border-dashed border-border rounded-xl text-center text-muted-foreground/60 text-xs">
                  No priority alerts detected. Workspace fully compliant.
                </div>
              ) : (
                priorities.slice(0, 3).map((pri, idx) => (
                  <div key={idx} className={`p-3.5 border rounded-xl flex items-start gap-3 ${pri.color}`}>
                    <div className="px-2 py-0.5 rounded bg-background border border-current text-[8px] font-black uppercase shrink-0 mt-0.5">
                      {pri.type}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10.5px] font-bold text-foreground block leading-tight">{pri.title}</span>
                      <span className="text-[9.5px] text-muted-foreground block leading-relaxed">{pri.desc}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Links & Upcoming */}
          <div className="md:col-span-1 space-y-6">
            <div className="space-y-3">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block pl-0.5">Quick Actions</span>
              <div className="grid grid-cols-2 gap-2">
                {quickLinks.map((link, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onNavigate(link.path)}
                    className="p-2.5 bg-card hover:bg-muted border border-border rounded-xl text-[10px] font-bold text-left transition-colors cursor-pointer block truncate"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block pl-0.5">Upcoming Milestones</span>
              <div className="border border-border rounded-xl p-3 bg-muted/5 space-y-2">
                {nextDue.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground/60 text-[9px]">
                    No upcoming inspections staged
                  </div>
                ) : (
                  nextDue.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[9.5px] border-b border-border/40 last:border-b-0 pb-1.5 last:pb-0">
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-foreground block truncate max-w-[120px]">{item.title}</span>
                        <span className="text-[8px] text-muted-foreground block">{item.category}</span>
                      </div>
                      <span className="font-black text-foreground shrink-0">{item.date}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
