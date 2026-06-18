'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  ClipboardList,
  Copy,
  Eye,
  EyeOff,
  FolderArchive,
  FolderLock,
  GripVertical,
  LayoutGrid,
  Package,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import { usePackBuilder } from '@/components/packs/EvidencePackBuilderProvider';

export type DashboardLayoutMode = 'classic' | 'editable';
export type DashboardGridPreset = '4-large' | '6-balanced' | '8-operations' | '12-executive' | 'custom';
export type DashboardPaneType =
  | 'stat'
  | 'readiness'
  | 'status-bars'
  | 'mini-chart'
  | 'work-queue'
  | 'module-summary'
  | 'quick-actions'
  | 'pack-builder';
export type DashboardPaneDisplayMode = 'stat' | 'bar' | 'donut' | 'list' | 'compact' | 'detailed';
export type DashboardPaneSpan = '1' | '2' | '3' | '4' | 'full';
export type DashboardPaneFontSize = 'sm' | 'md' | 'lg' | 'xl';
export type DashboardPaneEmphasis = 'normal' | 'strong' | 'hero';
export type DashboardPaneAccent = 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate';
export type DashboardMetricKey =
  | 'overall-readiness'
  | 'open-actions'
  | 'overdue-actions'
  | 'due-soon-actions'
  | 'missing-evidence'
  | 'evidence-coverage'
  | 'recent-evidence'
  | 'expiring-competencies'
  | 'expired-competencies'
  | 'people-status'
  | 'asset-checks-due'
  | 'asset-checks-overdue'
  | 'requirement-status'
  | 'audit-trail-recent'
  | 'pack-builder-draft'
  | 'saved-reports';

export interface DashboardPaneConfig {
  id: string;
  type: DashboardPaneType;
  title: string;
  metricKey: DashboardMetricKey;
  displayMode: DashboardPaneDisplayMode;
  span: DashboardPaneSpan;
  order: number;
  visible: boolean;
  style: {
    fontSize: DashboardPaneFontSize;
    emphasis: DashboardPaneEmphasis;
    accent: DashboardPaneAccent;
    compact: boolean;
    showHelper: boolean;
  };
  filters?: {
    statusScope?: string;
    dateScope?: 'snapshot' | '7days' | '30days' | '90days';
  };
}

export interface EditableDashboardConfig {
  preset: DashboardGridPreset;
  panes: DashboardPaneConfig[];
}

export interface DashboardQueueItem {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  route: string;
}

export interface DashboardMetricSnapshot {
  readinessScore: number | null;
  readinessLabel: string;
  requirementCounts: {
    active: number;
    green: number;
    amber: number;
    red: number;
    grey: number;
  };
  evidenceCounts: {
    total: number;
    classified: number;
    unclassified: number;
    recentlyUploaded: number;
  };
  actionCounts: {
    total: number;
    open: number;
    overdue: number;
    dueSoon: number;
  };
  competencyCounts: {
    people: number;
    valid: number;
    expiring: number;
    expired: number;
    missing: number;
  };
  peopleStatusCounts: {
    active: number;
    onLeave: number;
    suspended: number;
    inactive: number;
  };
  assetCounts: {
    totalChecks: number;
    compliantChecks: number;
    dueSoonChecks: number;
    overdueChecks: number;
  };
  auditLogCount: number;
  savedReportCount: number;
  queues: {
    overdue: DashboardQueueItem[];
    dueSoon: DashboardQueueItem[];
    missingEvidence: DashboardQueueItem[];
    recentActivity: DashboardQueueItem[];
  };
}

interface MetricDefinition {
  key: DashboardMetricKey;
  label: string;
  description: string;
  module: string;
  route: string;
  displayModes: DashboardPaneDisplayMode[];
  emptyState: string;
  resolver: (data: DashboardMetricSnapshot, packCount: number) => MetricResult;
}

interface MetricResult {
  value: string;
  helper: string;
  status: 'good' | 'warning' | 'danger' | 'neutral';
  route: string;
  bars?: Array<{ label: string; value: number; total: number; tone: DashboardPaneAccent }>;
  queue?: DashboardQueueItem[];
}

const accentClasses: Record<DashboardPaneAccent, { text: string; bg: string; border: string; bar: string }> = {
  indigo: { text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/25', bar: 'bg-indigo-500' },
  emerald: { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', bar: 'bg-emerald-500' },
  amber: { text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/25', bar: 'bg-amber-500' },
  rose: { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/25', bar: 'bg-rose-500' },
  sky: { text: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/25', bar: 'bg-sky-500' },
  violet: { text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/25', bar: 'bg-violet-500' },
  slate: { text: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/25', bar: 'bg-slate-500' }
};

const accentHex: Record<DashboardPaneAccent, string> = {
  indigo: '#6366f1',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#ef4444',
  sky: '#0ea5e9',
  violet: '#8b5cf6',
  slate: '#64748b'
};

const statusToneToAccent: Record<MetricResult['status'], DashboardPaneAccent> = {
  good: 'emerald',
  warning: 'amber',
  danger: 'rose',
  neutral: 'indigo'
};

const paneTypeOptions: Array<{ id: DashboardPaneType; label: string }> = [
  { id: 'stat', label: 'Stat Tile' },
  { id: 'readiness', label: 'Progress / Readiness' },
  { id: 'status-bars', label: 'Status Bars' },
  { id: 'mini-chart', label: 'Mini Chart' },
  { id: 'work-queue', label: 'Work Queue' },
  { id: 'module-summary', label: 'Module Summary' },
  { id: 'quick-actions', label: 'Quick Actions' },
  { id: 'pack-builder', label: 'Pack Builder Summary' }
];

const presetLabels: Record<DashboardGridPreset, string> = {
  '4-large': '4-pane infographic',
  '6-balanced': '6-pane balanced',
  '8-operations': '8-pane operations',
  '12-executive': '12-pane executive detail',
  custom: 'Custom'
};

const makePane = (
  id: string,
  title: string,
  type: DashboardPaneType,
  metricKey: DashboardMetricKey,
  span: DashboardPaneSpan,
  displayMode: DashboardPaneDisplayMode,
  accent: DashboardPaneAccent,
  order: number
): DashboardPaneConfig => ({
  id,
  title,
  type,
  metricKey,
  displayMode,
  span,
  order,
  visible: true,
  style: {
    fontSize: span === '4' || span === 'full' ? 'lg' : 'md',
    emphasis: span === '4' || span === 'full' ? 'hero' : 'strong',
    accent,
    compact: span === '1',
    showHelper: true
  }
});

export const createEditablePanePreset = (preset: DashboardGridPreset): DashboardPaneConfig[] => {
  const normalizedPreset = preset === 'custom' ? '6-balanced' : preset;

  if (normalizedPreset === '4-large') {
    return [
      makePane('pane-readiness', 'Overall Readiness', 'readiness', 'overall-readiness', '2', 'donut', 'indigo', 0),
      makePane('pane-queue', 'Priority Work Queue', 'work-queue', 'due-soon-actions', '2', 'list', 'rose', 1),
      makePane('pane-evidence', 'Evidence Coverage', 'status-bars', 'evidence-coverage', '2', 'bar', 'sky', 2),
      makePane('pane-assets', 'Asset Assurance', 'status-bars', 'asset-checks-overdue', '2', 'bar', 'violet', 3)
    ];
  }

  if (normalizedPreset === '8-operations') {
    return [
      makePane('pane-readiness', 'Overall Readiness', 'readiness', 'overall-readiness', '2', 'donut', 'indigo', 0),
      makePane('pane-open-actions', 'Open Actions', 'stat', 'open-actions', '1', 'stat', 'rose', 1),
      makePane('pane-overdue', 'Overdue Actions', 'stat', 'overdue-actions', '1', 'stat', 'rose', 2),
      makePane('pane-due', 'Due Soon', 'work-queue', 'due-soon-actions', '2', 'list', 'amber', 3),
      makePane('pane-missing', 'Missing Evidence', 'work-queue', 'missing-evidence', '2', 'list', 'sky', 4),
      makePane('pane-competencies', 'Competency Watch', 'status-bars', 'expiring-competencies', '1', 'bar', 'emerald', 5),
      makePane('pane-assets', 'Asset Checks', 'status-bars', 'asset-checks-due', '1', 'bar', 'violet', 6),
      makePane('pane-pack', 'Pack Builder', 'pack-builder', 'pack-builder-draft', '2', 'compact', 'slate', 7)
    ];
  }

  if (normalizedPreset === '12-executive') {
    return [
      makePane('pane-readiness', 'Readiness', 'readiness', 'overall-readiness', '2', 'donut', 'indigo', 0),
      makePane('pane-reqs', 'Requirements', 'stat', 'requirement-status', '1', 'stat', 'emerald', 1),
      makePane('pane-evidence', 'Evidence', 'stat', 'evidence-coverage', '1', 'stat', 'sky', 2),
      makePane('pane-actions', 'Open Actions', 'stat', 'open-actions', '1', 'stat', 'rose', 3),
      makePane('pane-assets', 'Asset Checks', 'stat', 'asset-checks-overdue', '1', 'stat', 'violet', 4),
      makePane('pane-people', 'People Status', 'status-bars', 'people-status', '1', 'bar', 'emerald', 5),
      makePane('pane-competency-expiry', 'Expired Competencies', 'stat', 'expired-competencies', '1', 'stat', 'amber', 6),
      makePane('pane-recent-evidence', 'Recent Evidence', 'mini-chart', 'recent-evidence', '1', 'bar', 'sky', 7),
      makePane('pane-due', 'Due Soon', 'work-queue', 'due-soon-actions', '2', 'compact', 'amber', 8),
      makePane('pane-alerts', 'Missing Evidence', 'work-queue', 'missing-evidence', '2', 'compact', 'rose', 9),
      makePane('pane-activity', 'Recent Activity', 'work-queue', 'audit-trail-recent', '2', 'compact', 'slate', 10),
      makePane('pane-quick', 'Quick Actions', 'quick-actions', 'saved-reports', '2', 'compact', 'indigo', 11)
    ];
  }

  return [
    makePane('pane-readiness', 'Overall Readiness', 'readiness', 'overall-readiness', '2', 'donut', 'indigo', 0),
    makePane('pane-requirements', 'Requirement Status', 'status-bars', 'requirement-status', '2', 'bar', 'emerald', 1),
    makePane('pane-actions', 'Open Actions', 'stat', 'open-actions', '1', 'stat', 'rose', 2),
    makePane('pane-evidence', 'Evidence Coverage', 'stat', 'evidence-coverage', '1', 'stat', 'sky', 3),
    makePane('pane-work', 'Due / Overdue Queue', 'work-queue', 'due-soon-actions', '2', 'list', 'amber', 4),
    makePane('pane-modules', 'Module Summary', 'module-summary', 'people-status', '2', 'detailed', 'violet', 5)
  ];
};

const metricDefinitions: MetricDefinition[] = [
  {
    key: 'overall-readiness',
    label: 'Overall readiness',
    description: 'Canonical readiness score from current requirement calculations.',
    module: 'Dashboard',
    route: '/dashboard/reports',
    displayModes: ['stat', 'donut', 'bar', 'compact', 'detailed'],
    emptyState: 'No active requirements have been assessed yet.',
    resolver: data => ({
      value: data.readinessScore === null ? 'N/A' : `${data.readinessScore}%`,
      helper: data.readinessScore === null ? 'No assessed readiness score yet' : data.readinessLabel,
      status: data.readinessScore === null ? 'neutral' : data.readinessScore >= 75 ? 'good' : data.readinessScore >= 50 ? 'warning' : 'danger',
      route: '/dashboard/reports',
      bars: [
        { label: 'Green', value: data.requirementCounts.green, total: data.requirementCounts.active, tone: 'emerald' },
        { label: 'Amber', value: data.requirementCounts.amber, total: data.requirementCounts.active, tone: 'amber' },
        { label: 'Red', value: data.requirementCounts.red, total: data.requirementCounts.active, tone: 'rose' },
        { label: 'Grey', value: data.requirementCounts.grey, total: data.requirementCounts.active, tone: 'slate' }
      ]
    })
  },
  {
    key: 'open-actions',
    label: 'Open actions',
    description: 'Open and in-progress action records.',
    module: 'Actions',
    route: '/dashboard/requirements?filter=actions',
    displayModes: ['stat', 'bar', 'list', 'compact'],
    emptyState: 'No open actions found.',
    resolver: data => ({
      value: String(data.actionCounts.open),
      helper: `${data.actionCounts.overdue} overdue`,
      status: data.actionCounts.overdue > 0 ? 'danger' : data.actionCounts.open > 0 ? 'warning' : 'good',
      route: '/dashboard/requirements?filter=actions',
      bars: [
        { label: 'Open', value: data.actionCounts.open, total: Math.max(data.actionCounts.total, 1), tone: 'amber' },
        { label: 'Overdue', value: data.actionCounts.overdue, total: Math.max(data.actionCounts.open, 1), tone: 'rose' }
      ],
      queue: data.queues.overdue
    })
  },
  {
    key: 'overdue-actions',
    label: 'Overdue actions',
    description: 'Open actions past due date.',
    module: 'Actions',
    route: '/dashboard/requirements?filter=actions',
    displayModes: ['stat', 'list', 'compact'],
    emptyState: 'No overdue actions found.',
    resolver: data => ({
      value: String(data.actionCounts.overdue),
      helper: data.actionCounts.overdue > 0 ? 'Needs owner review' : 'No overdue actions',
      status: data.actionCounts.overdue > 0 ? 'danger' : 'good',
      route: '/dashboard/requirements?filter=actions',
      queue: data.queues.overdue
    })
  },
  {
    key: 'due-soon-actions',
    label: 'Due soon / upcoming',
    description: 'Upcoming actions, reviews, evidence, competencies and checks.',
    module: 'Workspace',
    route: '/dashboard/reports',
    displayModes: ['list', 'compact', 'detailed'],
    emptyState: 'No upcoming due items found.',
    resolver: data => ({
      value: String(data.queues.dueSoon.length),
      helper: 'Current snapshot queue',
      status: data.queues.dueSoon.length > 0 ? 'warning' : 'good',
      route: '/dashboard/reports',
      queue: data.queues.dueSoon
    })
  },
  {
    key: 'missing-evidence',
    label: 'Missing evidence',
    description: 'Requirements and documents needing evidence attention.',
    module: 'Evidence Vault',
    route: '/dashboard/vault',
    displayModes: ['stat', 'list', 'bar', 'compact'],
    emptyState: 'No missing evidence items found.',
    resolver: data => ({
      value: String(data.requirementCounts.red + data.evidenceCounts.unclassified),
      helper: `${data.evidenceCounts.unclassified} unclassified vault records`,
      status: data.requirementCounts.red + data.evidenceCounts.unclassified > 0 ? 'danger' : 'good',
      route: '/dashboard/vault',
      queue: data.queues.missingEvidence
    })
  },
  {
    key: 'evidence-coverage',
    label: 'Evidence coverage',
    description: 'Classified Evidence Vault records as a current snapshot.',
    module: 'Evidence Vault',
    route: '/dashboard/vault',
    displayModes: ['stat', 'bar', 'donut', 'compact'],
    emptyState: 'No evidence records found.',
    resolver: data => {
      const percent = data.evidenceCounts.total > 0
        ? Math.round((data.evidenceCounts.classified / data.evidenceCounts.total) * 100)
        : 0;
      return {
        value: data.evidenceCounts.total > 0 ? `${percent}%` : 'N/A',
        helper: `${data.evidenceCounts.classified} of ${data.evidenceCounts.total} classified`,
        status: data.evidenceCounts.total === 0 ? 'neutral' : percent >= 80 ? 'good' : percent >= 50 ? 'warning' : 'danger',
        route: '/dashboard/vault',
        bars: [
          { label: 'Classified', value: data.evidenceCounts.classified, total: data.evidenceCounts.total, tone: 'sky' },
          { label: 'Unclassified', value: data.evidenceCounts.unclassified, total: data.evidenceCounts.total, tone: 'amber' }
        ]
      };
    }
  },
  {
    key: 'recent-evidence',
    label: 'Recent evidence',
    description: 'Evidence records recently added to the workspace.',
    module: 'Evidence Vault',
    route: '/dashboard/vault',
    displayModes: ['stat', 'bar', 'compact'],
    emptyState: 'No recent evidence records found.',
    resolver: data => ({
      value: String(data.evidenceCounts.recentlyUploaded),
      helper: 'Added in the current activity window',
      status: data.evidenceCounts.recentlyUploaded > 0 ? 'good' : 'neutral',
      route: '/dashboard/vault',
      bars: [
        { label: 'Recent', value: data.evidenceCounts.recentlyUploaded, total: Math.max(data.evidenceCounts.total, 1), tone: 'sky' }
      ]
    })
  },
  {
    key: 'expiring-competencies',
    label: 'Expiring competencies',
    description: 'Competency records that are due soon.',
    module: 'Competency Matrix',
    route: '/dashboard/competencies',
    displayModes: ['stat', 'bar', 'compact'],
    emptyState: 'No expiring competencies found.',
    resolver: data => ({
      value: String(data.competencyCounts.expiring),
      helper: `${data.competencyCounts.valid} valid records`,
      status: data.competencyCounts.expiring > 0 ? 'warning' : 'good',
      route: '/dashboard/competencies',
      bars: [
        { label: 'Valid', value: data.competencyCounts.valid, total: Math.max(data.competencyCounts.valid + data.competencyCounts.expiring + data.competencyCounts.expired + data.competencyCounts.missing, 1), tone: 'emerald' },
        { label: 'Expiring', value: data.competencyCounts.expiring, total: Math.max(data.competencyCounts.valid + data.competencyCounts.expiring + data.competencyCounts.expired + data.competencyCounts.missing, 1), tone: 'amber' }
      ]
    })
  },
  {
    key: 'expired-competencies',
    label: 'Expired competencies',
    description: 'Competency records currently expired or missing.',
    module: 'Competency Matrix',
    route: '/dashboard/competencies',
    displayModes: ['stat', 'bar', 'compact'],
    emptyState: 'No expired competencies found.',
    resolver: data => ({
      value: String(data.competencyCounts.expired + data.competencyCounts.missing),
      helper: `${data.competencyCounts.expired} expired, ${data.competencyCounts.missing} missing`,
      status: data.competencyCounts.expired + data.competencyCounts.missing > 0 ? 'danger' : 'good',
      route: '/dashboard/competencies',
      bars: [
        { label: 'Expired', value: data.competencyCounts.expired, total: Math.max(data.competencyCounts.expired + data.competencyCounts.missing, 1), tone: 'rose' },
        { label: 'Missing', value: data.competencyCounts.missing, total: Math.max(data.competencyCounts.expired + data.competencyCounts.missing, 1), tone: 'amber' }
      ]
    })
  },
  {
    key: 'people-status',
    label: 'People status',
    description: 'Operational status split for people records.',
    module: 'Competency Matrix',
    route: '/dashboard/competencies',
    displayModes: ['bar', 'stat', 'compact'],
    emptyState: 'No people records found.',
    resolver: data => ({
      value: String(data.competencyCounts.people),
      helper: `${data.peopleStatusCounts.active} active people`,
      status: data.competencyCounts.people > 0 ? 'neutral' : 'warning',
      route: '/dashboard/competencies',
      bars: [
        { label: 'Active', value: data.peopleStatusCounts.active, total: Math.max(data.competencyCounts.people, 1), tone: 'emerald' },
        { label: 'On leave', value: data.peopleStatusCounts.onLeave, total: Math.max(data.competencyCounts.people, 1), tone: 'amber' },
        { label: 'Suspended', value: data.peopleStatusCounts.suspended, total: Math.max(data.competencyCounts.people, 1), tone: 'rose' },
        { label: 'Inactive', value: data.peopleStatusCounts.inactive, total: Math.max(data.competencyCounts.people, 1), tone: 'slate' }
      ]
    })
  },
  {
    key: 'asset-checks-due',
    label: 'Asset checks due',
    description: 'Asset check assignments due soon.',
    module: 'Asset Matrix',
    route: '/dashboard/matrix',
    displayModes: ['stat', 'bar', 'list', 'compact'],
    emptyState: 'No asset checks due soon.',
    resolver: data => ({
      value: String(data.assetCounts.dueSoonChecks),
      helper: `${data.assetCounts.compliantChecks} of ${data.assetCounts.totalChecks} compliant`,
      status: data.assetCounts.dueSoonChecks > 0 ? 'warning' : 'good',
      route: '/dashboard/matrix',
      bars: [
        { label: 'Compliant', value: data.assetCounts.compliantChecks, total: data.assetCounts.totalChecks, tone: 'emerald' },
        { label: 'Due soon', value: data.assetCounts.dueSoonChecks, total: data.assetCounts.totalChecks, tone: 'amber' }
      ],
      queue: data.queues.dueSoon.filter(item => item.status.toLowerCase().includes('asset'))
    })
  },
  {
    key: 'asset-checks-overdue',
    label: 'Asset checks overdue',
    description: 'Asset check assignments currently overdue.',
    module: 'Asset Matrix',
    route: '/dashboard/matrix',
    displayModes: ['stat', 'bar', 'compact'],
    emptyState: 'No overdue asset checks.',
    resolver: data => ({
      value: String(data.assetCounts.overdueChecks),
      helper: `${data.assetCounts.totalChecks} required checks`,
      status: data.assetCounts.overdueChecks > 0 ? 'danger' : 'good',
      route: '/dashboard/matrix',
      bars: [
        { label: 'Overdue', value: data.assetCounts.overdueChecks, total: data.assetCounts.totalChecks, tone: 'rose' },
        { label: 'Compliant', value: data.assetCounts.compliantChecks, total: data.assetCounts.totalChecks, tone: 'emerald' }
      ]
    })
  },
  {
    key: 'requirement-status',
    label: 'Requirement status split',
    description: 'GREEN, AMBER, RED and GREY active requirement counts.',
    module: 'Requirements',
    route: '/dashboard/requirements',
    displayModes: ['bar', 'donut', 'stat', 'compact'],
    emptyState: 'No active requirements found.',
    resolver: data => ({
      value: String(data.requirementCounts.active),
      helper: `${data.requirementCounts.green} green, ${data.requirementCounts.red} red`,
      status: data.requirementCounts.red > 0 ? 'danger' : data.requirementCounts.amber > 0 ? 'warning' : data.requirementCounts.active > 0 ? 'good' : 'neutral',
      route: '/dashboard/requirements',
      bars: [
        { label: 'Green', value: data.requirementCounts.green, total: data.requirementCounts.active, tone: 'emerald' },
        { label: 'Amber', value: data.requirementCounts.amber, total: data.requirementCounts.active, tone: 'amber' },
        { label: 'Red', value: data.requirementCounts.red, total: data.requirementCounts.active, tone: 'rose' },
        { label: 'Grey', value: data.requirementCounts.grey, total: data.requirementCounts.active, tone: 'slate' }
      ]
    })
  },
  {
    key: 'audit-trail-recent',
    label: 'Recent safe activity',
    description: 'Recent workspace activity available to this user.',
    module: 'Audit Trail',
    route: '/dashboard/audit-trail',
    displayModes: ['list', 'compact'],
    emptyState: 'No accessible activity events found.',
    resolver: data => ({
      value: String(data.auditLogCount),
      helper: 'Permission-filtered activity snapshot',
      status: 'neutral',
      route: '/dashboard/audit-trail',
      queue: data.queues.recentActivity
    })
  },
  {
    key: 'pack-builder-draft',
    label: 'Pack Builder draft',
    description: 'Local Evidence Pack Builder draft item count.',
    module: 'Pack Builder',
    route: '/dashboard/audit-packs',
    displayModes: ['stat', 'compact', 'list'],
    emptyState: 'No local pack items in the current draft.',
    resolver: (_data, packCount) => ({
      value: String(packCount),
      helper: 'Local draft only',
      status: packCount > 0 ? 'good' : 'neutral',
      route: '/dashboard/audit-packs'
    })
  },
  {
    key: 'saved-reports',
    label: 'Saved reports',
    description: 'Saved reports or report views available in this workspace.',
    module: 'Reports',
    route: '/dashboard/reports',
    displayModes: ['stat', 'compact'],
    emptyState: 'No saved report data available.',
    resolver: data => ({
      value: String(data.savedReportCount),
      helper: 'Report surfaces available',
      status: data.savedReportCount > 0 ? 'neutral' : 'warning',
      route: '/dashboard/reports'
    })
  }
];

const metricByKey = new Map(metricDefinitions.map(metric => [metric.key, metric]));

const spanClasses: Record<DashboardPaneSpan, string> = {
  '1': 'lg:col-span-1',
  '2': 'lg:col-span-2',
  '3': 'lg:col-span-3',
  '4': 'lg:col-span-4',
  full: 'lg:col-span-4'
};

const fontSizeClasses: Record<DashboardPaneFontSize, string> = {
  sm: 'text-2xl',
  md: 'text-3xl',
  lg: 'text-4xl',
  xl: 'text-5xl'
};

const normalisePanes = (panes: DashboardPaneConfig[]) =>
  [...panes].sort((a, b) => a.order - b.order).map((pane, index) => ({ ...pane, order: index }));

const getSupportedDisplayModes = (type: DashboardPaneType, metricKey: DashboardMetricKey): DashboardPaneDisplayMode[] => {
  const metricModes = metricByKey.get(metricKey)?.displayModes || ['stat', 'compact'];
  if (type === 'work-queue') return metricModes.filter(mode => mode === 'list' || mode === 'compact' || mode === 'detailed');
  if (type === 'status-bars') return metricModes.filter(mode => mode === 'bar' || mode === 'compact' || mode === 'detailed');
  if (type === 'mini-chart') return metricModes.filter(mode => mode === 'bar' || mode === 'donut' || mode === 'compact');
  if (type === 'readiness') return metricModes.filter(mode => mode === 'donut' || mode === 'bar' || mode === 'stat' || mode === 'detailed');
  if (type === 'module-summary') return ['detailed', 'compact'];
  if (type === 'quick-actions') return ['compact', 'detailed'];
  if (type === 'pack-builder') return ['compact', 'stat', 'list'];
  return metricModes.filter(mode => mode === 'stat' || mode === 'compact' || mode === 'bar');
};

const coerceDisplayMode = (type: DashboardPaneType, metricKey: DashboardMetricKey, current: DashboardPaneDisplayMode): DashboardPaneDisplayMode => {
  const modes = getSupportedDisplayModes(type, metricKey);
  return modes.includes(current) ? current : modes[0] || 'compact';
};

function ProgressBars({ bars }: { bars: NonNullable<MetricResult['bars']> }) {
  if (bars.length === 0) return null;

  return (
    <div className="space-y-2">
      {bars.map(bar => {
        const percent = bar.total > 0 ? Math.min(100, Math.round((bar.value / bar.total) * 100)) : 0;
        const accent = accentClasses[bar.tone];
        return (
          <div key={bar.label} className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="text-muted-foreground">{bar.label}</span>
              <span className="text-foreground">{bar.value}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${accent.bar}`} style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SnapshotDonut({ result, accent }: { result: MetricResult; accent: DashboardPaneAccent }) {
  const firstBar = result.bars?.[0];
  const total = firstBar?.total || 0;
  const value = firstBar?.value || 0;
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;

  return (
    <div className="flex items-center gap-4">
      <div
        className="grid h-24 w-24 shrink-0 place-items-center rounded-full border border-border"
        style={{ background: `conic-gradient(${accentHex[accent]} ${percent}%, hsl(var(--muted)) ${percent}% 100%)` }}
      >
        <div className="grid h-16 w-16 place-items-center rounded-full bg-card text-sm font-black text-foreground">
          {result.value}
        </div>
      </div>
      <div className="min-w-0 space-y-2">
        <p className="text-xs font-bold text-foreground">{result.helper}</p>
        {result.bars && <ProgressBars bars={result.bars.slice(0, 3)} />}
      </div>
    </div>
  );
}

function QueueList({ items, emptyState, onNavigate }: { items: DashboardQueueItem[]; emptyState: string; onNavigate: (path: string) => void }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-6 text-center text-xs font-semibold text-muted-foreground">
        {emptyState}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.slice(0, 5).map(item => (
        <button
          key={item.id}
          type="button"
          onClick={() => onNavigate(item.route)}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:border-indigo-500/40 hover:bg-muted/30"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground">{item.title}</p>
              <p className="truncate text-[10px] text-muted-foreground">{item.subtitle}</p>
            </div>
            <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-black uppercase text-muted-foreground">
              {item.status}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function QuickActionPane({ onNavigate }: { onNavigate: (path: string) => void }) {
  const actions = [
    { label: 'Requirements', route: '/dashboard/requirements', icon: ClipboardList },
    { label: 'Evidence', route: '/dashboard/vault', icon: FolderLock },
    { label: 'Competencies', route: '/dashboard/competencies', icon: UserCheck },
    { label: 'Assets', route: '/dashboard/matrix', icon: Package },
    { label: 'Reports', route: '/dashboard/reports', icon: BarChart3 },
    { label: 'Packs', route: '/dashboard/audit-packs', icon: FolderArchive }
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map(action => {
        const Icon = action.icon;
        return (
          <button
            key={action.route}
            type="button"
            onClick={() => onNavigate(action.route)}
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-2.5 py-2 text-[11px] font-bold text-foreground transition-colors hover:border-indigo-500/40 hover:bg-muted/50"
          >
            <Icon className="h-3.5 w-3.5 text-indigo-500" />
            <span className="truncate">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function PaneRenderer({
  pane,
  data,
  packItemCount,
  isEditing,
  onNavigate,
  onOpenSettings,
  onMove,
  onDuplicate,
  onHide,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop
}: {
  pane: DashboardPaneConfig;
  data: DashboardMetricSnapshot;
  packItemCount: number;
  isEditing: boolean;
  onNavigate: (path: string) => void;
  onOpenSettings: () => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onHide: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: () => void;
}) {
  const metric = metricByKey.get(pane.metricKey) || metricDefinitions[0];
  const result = metric.resolver(data, packItemCount);
  const statusAccent = statusToneToAccent[result.status];
  const accent = pane.style.accent || statusAccent;
  const classes = accentClasses[accent];
  const displayMode = coerceDisplayMode(pane.type, pane.metricKey, pane.displayMode);
  const compact = pane.style.compact || displayMode === 'compact';
  const showQueue = pane.type === 'work-queue' || pane.displayMode === 'list';
  const valueClass = pane.style.emphasis === 'hero' ? 'text-5xl' : fontSizeClasses[pane.style.fontSize];

  return (
    <div
      draggable={isEditing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`${spanClasses[pane.span]} min-h-[190px] rounded-lg border bg-card shadow-sm transition-all ${
        isEditing ? 'border-indigo-500/35 ring-1 ring-indigo-500/10' : 'border-border/80 hover:border-border'
      }`}
    >
      <div className="flex h-full flex-col p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isEditing && <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <h3 className="truncate text-xs font-black uppercase tracking-wider text-foreground">{pane.title}</h3>
            </div>
            {pane.style.showHelper && (
              <p className="mt-1 line-clamp-2 text-[10px] font-medium text-muted-foreground">
                {metric.description}
              </p>
            )}
          </div>
          {isEditing ? (
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={onOpenSettings} title="Pane settings" className="rounded-md border border-border bg-muted/30 p-1 text-muted-foreground hover:text-foreground">
                <Settings className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => onMove(-1)} title="Move pane left/up" className="rounded-md border border-border bg-muted/30 p-1 text-muted-foreground hover:text-foreground">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => onMove(1)} title="Move pane right/down" className="rounded-md border border-border bg-muted/30 p-1 text-muted-foreground hover:text-foreground">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={onDuplicate} title="Duplicate pane" className="rounded-md border border-border bg-muted/30 p-1 text-muted-foreground hover:text-foreground">
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={onHide} title="Hide pane" className="rounded-md border border-border bg-muted/30 p-1 text-muted-foreground hover:text-foreground">
                <EyeOff className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={onRemove} title="Remove pane" className="rounded-md border border-border bg-muted/30 p-1 text-muted-foreground hover:text-rose-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate(result.route)}
              className={`rounded-md border px-2 py-1 text-[9px] font-black uppercase ${classes.bg} ${classes.border} ${classes.text}`}
            >
              Open
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between gap-3">
          {pane.type === 'quick-actions' ? (
            <QuickActionPane onNavigate={onNavigate} />
          ) : showQueue && result.queue ? (
            <QueueList items={result.queue} emptyState={metric.emptyState} onNavigate={onNavigate} />
          ) : pane.type === 'module-summary' ? (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Requirements', value: data.requirementCounts.active, route: '/dashboard/requirements', icon: ClipboardList },
                { label: 'Evidence', value: data.evidenceCounts.total, route: '/dashboard/vault', icon: FolderLock },
                { label: 'People', value: data.competencyCounts.people, route: '/dashboard/competencies', icon: Users },
                { label: 'Assets', value: data.assetCounts.totalChecks, route: '/dashboard/matrix', icon: Package }
              ].map(module => {
                const Icon = module.icon;
                return (
                  <button key={module.label} type="button" onClick={() => onNavigate(module.route)} className="rounded-lg border border-border bg-muted/20 p-2 text-left hover:bg-muted/40">
                    <Icon className="mb-2 h-4 w-4 text-indigo-500" />
                    <p className="text-lg font-black text-foreground">{module.value}</p>
                    <p className="text-[10px] font-bold text-muted-foreground">{module.label}</p>
                  </button>
                );
              })}
            </div>
          ) : displayMode === 'bar' && result.bars ? (
            <ProgressBars bars={result.bars} />
          ) : displayMode === 'donut' && result.bars ? (
            <SnapshotDonut result={result} accent={accent} />
          ) : pane.type === 'mini-chart' ? (
            <div className="space-y-3">
              {result.bars ? <ProgressBars bars={result.bars} /> : <p className="text-xs text-muted-foreground">{metric.emptyState}</p>}
              <p className="rounded-md border border-border bg-muted/20 px-2 py-1 text-[10px] font-bold text-muted-foreground">
                Current snapshot only. Trend unavailable until historical snapshots are enabled.
              </p>
            </div>
          ) : (
            <div className={compact ? 'space-y-2' : 'space-y-3'}>
              <div className={`font-black tracking-tight ${classes.text} ${valueClass}`}>{result.value}</div>
              <p className="text-xs font-bold text-foreground">{result.helper}</p>
              {result.bars && !compact && <ProgressBars bars={result.bars.slice(0, 2)} />}
            </div>
          )}

          {pane.type === 'pack-builder' && !showQueue && (
            <p className="rounded-md border border-border bg-muted/20 px-2 py-1 text-[10px] font-bold text-muted-foreground">
              Pack Builder data is local to this browser and workspace.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PaneSettingsPanel({
  pane,
  onUpdate,
  onClose,
  onReset,
  onDuplicate,
  onRemove
}: {
  pane: DashboardPaneConfig;
  onUpdate: (pane: DashboardPaneConfig) => void;
  onClose: () => void;
  onReset: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const metric = metricByKey.get(pane.metricKey) || metricDefinitions[0];
  const displayModes = getSupportedDisplayModes(pane.type, pane.metricKey);

  const updatePane = (patch: Partial<DashboardPaneConfig>) => {
    onUpdate({ ...pane, ...patch });
  };

  return (
    <aside className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Pane Settings</h3>
          <p className="mt-1 text-[10px] font-medium text-muted-foreground">{metric.module} source: {metric.label}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-5">
        <section className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Content</h4>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground">Title</span>
            <input
              value={pane.title}
              onChange={event => updatePane({ title: event.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-indigo-500"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground">Data source</span>
            <select
              value={pane.metricKey}
              onChange={event => {
                const metricKey = event.target.value as DashboardMetricKey;
                updatePane({ metricKey, displayMode: coerceDisplayMode(pane.type, metricKey, pane.displayMode) });
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-indigo-500"
            >
              {metricDefinitions.map(item => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground">Pane type</span>
            <select
              value={pane.type}
              onChange={event => {
                const type = event.target.value as DashboardPaneType;
                updatePane({ type, displayMode: coerceDisplayMode(type, pane.metricKey, pane.displayMode) });
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-indigo-500"
            >
              {paneTypeOptions.map(item => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
        </section>

        <section className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Display</h4>
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground">Mode</span>
              <select
                value={pane.displayMode}
                onChange={event => updatePane({ displayMode: event.target.value as DashboardPaneDisplayMode })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-indigo-500"
              >
                {displayModes.map(mode => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground">Span</span>
              <select
                value={pane.span}
                onChange={event => updatePane({ span: event.target.value as DashboardPaneSpan })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-indigo-500"
              >
                <option value="1">1 column</option>
                <option value="2">2 columns</option>
                <option value="3">3 columns</option>
                <option value="4">4 columns</option>
                <option value="full">Full width</option>
              </select>
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Style</h4>
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground">Font</span>
              <select
                value={pane.style.fontSize}
                onChange={event => updatePane({ style: { ...pane.style, fontSize: event.target.value as DashboardPaneFontSize } })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-indigo-500"
              >
                <option value="sm">Small</option>
                <option value="md">Standard</option>
                <option value="lg">Large</option>
                <option value="xl">Extra Large</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground">Emphasis</span>
              <select
                value={pane.style.emphasis}
                onChange={event => updatePane({ style: { ...pane.style, emphasis: event.target.value as DashboardPaneEmphasis } })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-indigo-500"
              >
                <option value="normal">Normal</option>
                <option value="strong">Strong</option>
                <option value="hero">Hero</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground">Accent</span>
              <select
                value={pane.style.accent}
                onChange={event => updatePane({ style: { ...pane.style, accent: event.target.value as DashboardPaneAccent } })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-indigo-500"
              >
                {Object.keys(accentClasses).map(accent => (
                  <option key={accent} value={accent}>{accent}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs font-bold text-foreground">
              <input
                type="checkbox"
                checked={pane.style.showHelper}
                onChange={event => updatePane({ style: { ...pane.style, showHelper: event.target.checked } })}
              />
              Helper text
            </label>
          </div>
        </section>

        <section className="flex flex-wrap gap-2 border-t border-border pt-4">
          <button type="button" onClick={onReset} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[11px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            Reset pane
          </button>
          <button type="button" onClick={onDuplicate} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[11px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground">
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </button>
          <button type="button" onClick={onRemove} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/25 px-3 py-2 text-[11px] font-bold text-rose-600 hover:bg-rose-500/10">
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </section>
      </div>
    </aside>
  );
}

export default function EditableDashboardGrid({
  config,
  isEditing,
  data,
  onChange,
  onNavigate
}: {
  config: EditableDashboardConfig;
  isEditing: boolean;
  data: DashboardMetricSnapshot;
  onChange: (config: EditableDashboardConfig) => void;
  onNavigate: (path: string) => void;
}) {
  const packBuilder = usePackBuilder();
  const [selectedPaneId, setSelectedPaneId] = useState<string | null>(null);
  const [draggedPaneId, setDraggedPaneId] = useState<string | null>(null);
  const paneIdCounterRef = useRef(0);
  const visiblePanes = useMemo(() => normalisePanes(config.panes).filter(pane => pane.visible || isEditing), [config.panes, isEditing]);
  const selectedPane = visiblePanes.find(pane => pane.id === selectedPaneId) || null;

  const updatePanes = (panes: DashboardPaneConfig[]) => {
    onChange({ ...config, panes: normalisePanes(panes), preset: config.preset });
  };

  const updatePane = (updatedPane: DashboardPaneConfig) => {
    updatePanes(config.panes.map(pane => pane.id === updatedPane.id ? updatedPane : pane));
  };

  const movePane = (paneId: string, direction: -1 | 1) => {
    const panes = normalisePanes(config.panes);
    const index = panes.findIndex(pane => pane.id === paneId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= panes.length) return;
    const next = [...panes];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    updatePanes(next);
  };

  const dropPane = (targetPaneId: string) => {
    if (!draggedPaneId || draggedPaneId === targetPaneId) return;
    const panes = normalisePanes(config.panes);
    const dragged = panes.find(pane => pane.id === draggedPaneId);
    const targetIndex = panes.findIndex(pane => pane.id === targetPaneId);
    if (!dragged || targetIndex < 0) return;
    const next = panes.filter(pane => pane.id !== draggedPaneId);
    next.splice(targetIndex, 0, dragged);
    updatePanes(next);
    setDraggedPaneId(null);
  };

  const duplicatePane = (pane: DashboardPaneConfig) => {
    paneIdCounterRef.current += 1;
    const copy: DashboardPaneConfig = {
      ...pane,
      id: `${pane.id}-copy-${paneIdCounterRef.current}`,
      title: `${pane.title} Copy`,
      order: config.panes.length,
      visible: true
    };
    updatePanes([...config.panes, copy]);
    setSelectedPaneId(copy.id);
  };

  const addPane = () => {
    paneIdCounterRef.current += 1;
    const pane = makePane(
      `pane-custom-${config.panes.length}-${paneIdCounterRef.current}`,
      'New Dashboard Pane',
      'stat',
      'overall-readiness',
      '1',
      'stat',
      'indigo',
      config.panes.length
    );
    updatePanes([...config.panes, pane]);
    setSelectedPaneId(pane.id);
  };

  const resetPane = (pane: DashboardPaneConfig) => {
    const defaultPane = createEditablePanePreset('6-balanced').find(item => item.metricKey === pane.metricKey) || makePane(
      pane.id,
      metricByKey.get(pane.metricKey)?.label || 'Dashboard Pane',
      pane.type,
      pane.metricKey,
      pane.span,
      coerceDisplayMode(pane.type, pane.metricKey, pane.displayMode),
      pane.style.accent,
      pane.order
    );
    updatePane({ ...defaultPane, id: pane.id, order: pane.order, visible: true });
  };

  const applyPreset = (preset: DashboardGridPreset) => {
    onChange({
      preset,
      panes: createEditablePanePreset(preset)
    });
    setSelectedPaneId(null);
  };

  const hiddenPanes = normalisePanes(config.panes).filter(pane => !pane.visible);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/15 p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-indigo-500/25 bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
            <LayoutGrid className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-foreground">Editable Homepage</h2>
            <p className="mt-1 text-[11px] font-medium text-muted-foreground">
              Current snapshot panes use live workspace records only. Historical trend panes stay labelled as unavailable until snapshots exist.
            </p>
          </div>
        </div>
        {isEditing && (
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(presetLabels).map(([preset, label]) => (
              <button
                key={preset}
                type="button"
                onClick={() => applyPreset(preset as DashboardGridPreset)}
                className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-black transition-colors ${
                  config.preset === preset
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={addPane}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1.5 text-[10px] font-black text-indigo-600 transition-colors hover:bg-indigo-500/20 dark:text-indigo-400"
            >
              <Plus className="h-3.5 w-3.5" />
              Add pane
            </button>
          </div>
        )}
      </div>

      {isEditing && hiddenPanes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hidden panes</span>
          {hiddenPanes.map(pane => (
            <button
              key={pane.id}
              type="button"
              onClick={() => updatePane({ ...pane, visible: true })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground"
            >
              <Eye className="h-3 w-3" />
              {pane.title}
            </button>
          ))}
        </div>
      )}

      <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 ${isEditing ? 'pb-2' : ''}`}>
        {visiblePanes.map(pane => (
          <PaneRenderer
            key={pane.id}
            pane={pane}
            data={data}
            packItemCount={packBuilder.items.length}
            isEditing={isEditing}
            onNavigate={onNavigate}
            onOpenSettings={() => setSelectedPaneId(pane.id)}
            onMove={direction => movePane(pane.id, direction)}
            onDuplicate={() => duplicatePane(pane)}
            onHide={() => updatePane({ ...pane, visible: false })}
            onRemove={() => {
              updatePanes(config.panes.filter(item => item.id !== pane.id));
              if (selectedPaneId === pane.id) setSelectedPaneId(null);
            }}
            onDragStart={() => setDraggedPaneId(pane.id)}
            onDragOver={event => event.preventDefault()}
            onDrop={() => dropPane(pane.id)}
          />
        ))}
      </div>

      {visiblePanes.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
          <Sparkles className="mx-auto mb-3 h-5 w-5 text-indigo-500" />
          <p className="text-sm font-bold text-foreground">No panes are visible.</p>
          <p className="mt-1 text-xs text-muted-foreground">Add a pane or restore hidden panes while editing.</p>
        </div>
      )}

      {isEditing && selectedPane && (
        <PaneSettingsPanel
          pane={selectedPane}
          onUpdate={updatePane}
          onClose={() => setSelectedPaneId(null)}
          onReset={() => resetPane(selectedPane)}
          onDuplicate={() => duplicatePane(selectedPane)}
          onRemove={() => {
            updatePanes(config.panes.filter(item => item.id !== selectedPane.id));
            setSelectedPaneId(null);
          }}
        />
      )}
    </div>
  );
}
