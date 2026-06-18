'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Briefcase,
  ClipboardList,
  Copy,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  GripVertical,
  LayoutGrid,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { usePackBuilder } from '@/components/packs/EvidencePackBuilderProvider';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

export type DashboardLayoutMode = 'classic' | 'editable';
export type DashboardGridPreset =
  | '4-large'
  | '6-balanced'
  | '8-operations'
  | '12-executive'
  | 'audit-prep'
  | 'people-assets'
  | 'evidence-control'
  | 'minimal-focus'
  | 'custom';
export type DashboardPaneType =
  | 'stat'
  | 'readiness'
  | 'status-bars'
  | 'mini-chart'
  | 'work-queue'
  | 'module-summary'
  | 'quick-actions'
  | 'pack-builder'
  | 'upload-console';
export type DashboardPaneDisplayMode =
  | 'stat'
  | 'bar'
  | 'donut'
  | 'ring'
  | 'gauge'
  | 'list'
  | 'table'
  | 'compact'
  | 'detailed'
  | 'cards'
  | 'stacked';
export type DashboardPaneSpan = '1' | '2' | '3' | '4' | 'full';
export type DashboardPaneFontSize = 'sm' | 'md' | 'lg' | 'xl';
export type DashboardPaneEmphasis = 'normal' | 'strong' | 'hero';
export type DashboardPaneAccent = 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate';
export type DashboardTimeframe = 'today' | '7days' | '14days' | '30days' | '60days' | '90days' | 'all';
export type DashboardRecordLimit = 3 | 5 | 10 | 20;
export type DashboardMetricKey =
  | 'active-requirements'
  | 'overall-readiness'
  | 'personnel-readiness'
  | 'evidence-coverage'
  | 'open-actions'
  | 'overdue-actions'
  | 'due-soon-actions'
  | 'missing-evidence'
  | 'requirement-status'
  | 'people-status'
  | 'expiring-competencies'
  | 'expired-competencies'
  | 'asset-checks-due'
  | 'asset-checks-overdue'
  | 'focus-suggestions'
  | 'expiring-items'
  | 'audit-trail-recent'
  | 'pack-builder-draft'
  | 'saved-reports'
  | 'risk-gaps'
  | 'active-alerts'
  | 'quick-actions'
  | 'upload-console';
export type DashboardQuickAction =
  | 'upload-evidence'
  | 'create-requirement'
  | 'add-competency'
  | 'create-action'
  | 'build-pack'
  | 'view-requirements'
  | 'conduct-check'
  | 'customize-layout'
  | 'open-vault';

export interface DashboardPaneConfig {
  id: string;
  type: DashboardPaneType;
  title: string;
  metricKey: DashboardMetricKey;
  displayMode: DashboardPaneDisplayMode;
  span: DashboardPaneSpan;
  order: number;
  visible: boolean;
  titleMode?: 'suggested' | 'custom';
  style: {
    fontSize: DashboardPaneFontSize;
    emphasis: DashboardPaneEmphasis;
    accent: DashboardPaneAccent;
    compact: boolean;
    showHelper: boolean;
  };
  filters?: {
    statusScope?: 'all' | 'overdue' | 'due-soon' | 'expiring' | 'missing' | 'valid' | 'expired';
    dateScope?: 'snapshot' | '7days' | '14days' | '30days' | '60days' | '90days';
    timeframe?: DashboardTimeframe;
    recordLimit?: DashboardRecordLimit;
    includeOverdue?: boolean;
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
  date?: string | null;
  category?: string;
  overdue?: boolean;
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
    expiring: DashboardQueueItem[];
    focusSuggestions: DashboardQueueItem[];
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
  note?: string;
}

interface ConfirmationState {
  title: string;
  body: string;
  confirmLabel: string;
  tone?: 'default' | 'danger';
  onConfirm: () => void;
}

type DashboardPaneOverrides = Omit<Partial<DashboardPaneConfig>, 'style' | 'filters'> & {
  style?: Partial<DashboardPaneConfig['style']>;
  filters?: Partial<NonNullable<DashboardPaneConfig['filters']>>;
};

const accentClasses: Record<DashboardPaneAccent, { text: string; bg: string; border: string; bar: string; ring: string }> = {
  indigo: { text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/25', bar: 'bg-indigo-500', ring: 'ring-indigo-500/25' },
  emerald: { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', bar: 'bg-emerald-500', ring: 'ring-emerald-500/25' },
  amber: { text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/25', bar: 'bg-amber-500', ring: 'ring-amber-500/25' },
  rose: { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/25', bar: 'bg-rose-500', ring: 'ring-rose-500/25' },
  sky: { text: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/25', bar: 'bg-sky-500', ring: 'ring-sky-500/25' },
  violet: { text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/25', bar: 'bg-violet-500', ring: 'ring-violet-500/25' },
  slate: { text: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/25', bar: 'bg-slate-500', ring: 'ring-slate-500/25' }
};

const paneTypeOptions: Array<{ id: DashboardPaneType; label: string }> = [
  { id: 'stat', label: 'Stat Tile' },
  { id: 'readiness', label: 'Progress / Readiness' },
  { id: 'status-bars', label: 'Status Bars' },
  { id: 'mini-chart', label: 'Mini Chart' },
  { id: 'work-queue', label: 'Work Queue' },
  { id: 'module-summary', label: 'Module Summary' },
  { id: 'quick-actions', label: 'Quick Actions' },
  { id: 'pack-builder', label: 'Pack Builder Summary' },
  { id: 'upload-console', label: 'Upload Console' }
];

const presetLabels: Record<DashboardGridPreset, string> = {
  '4-large': '4-pane large infographic',
  '6-balanced': '6-pane balanced',
  '8-operations': '8-pane operations',
  '12-executive': '12-pane executive screen',
  'audit-prep': 'Audit prep',
  'people-assets': 'People & assets',
  'evidence-control': 'Evidence control',
  'minimal-focus': 'Minimal daily focus',
  custom: 'Custom layout'
};

const DEFAULT_RECORD_LIMIT: DashboardRecordLimit = 5;
const DEFAULT_TIMEFRAME: DashboardTimeframe = '30days';

const makePane = (
  id: string,
  title: string,
  type: DashboardPaneType,
  metricKey: DashboardMetricKey,
  span: DashboardPaneSpan,
  displayMode: DashboardPaneDisplayMode,
  accent: DashboardPaneAccent,
  order: number,
  extra?: DashboardPaneOverrides
): DashboardPaneConfig => {
  const baseStyle: DashboardPaneConfig['style'] = {
    fontSize: (span === '4' || span === 'full' ? 'lg' : 'md') as DashboardPaneFontSize,
    emphasis: (span === '4' || span === 'full' ? 'hero' : 'strong') as DashboardPaneEmphasis,
    accent,
    compact: span === '1',
    showHelper: true
  };

  const baseFilters: NonNullable<DashboardPaneConfig['filters']> = {
    statusScope: 'all' as const,
    timeframe: DEFAULT_TIMEFRAME,
    recordLimit: DEFAULT_RECORD_LIMIT,
    includeOverdue: true
  };

  return {
    id,
    title,
    type,
    metricKey,
    displayMode,
    span,
    order,
    visible: true,
    titleMode: 'suggested',
    ...extra,
    style: {
      ...baseStyle,
      ...(extra?.style || {})
    },
    filters: {
      ...baseFilters,
      ...(extra?.filters || {})
    }
  };
};

const getSuggestedTitle = (metricKey: DashboardMetricKey) => {
  const metric = metricByKey.get(metricKey);
  if (metric) return metric.label.replace(/\b\w/g, char => char.toUpperCase());
  return 'Dashboard Pane';
};

export const createEditablePanePreset = (preset: DashboardGridPreset): DashboardPaneConfig[] => {
  switch (preset) {
    case '4-large':
      return [
        makePane('pane-readiness', 'Overall Readiness', 'readiness', 'overall-readiness', '2', 'ring', 'indigo', 0, { style: { fontSize: 'xl', emphasis: 'hero' } }),
        makePane('pane-people-readiness', 'Personnel Readiness', 'readiness', 'personnel-readiness', '2', 'gauge', 'emerald', 1, { style: { fontSize: 'xl', emphasis: 'hero' } }),
        makePane('pane-evidence', 'Evidence Coverage', 'status-bars', 'evidence-coverage', '2', 'stacked', 'sky', 2, { style: { fontSize: 'lg' } }),
        makePane('pane-actions', 'Open Actions', 'stat', 'open-actions', '2', 'stat', 'rose', 3, { style: { fontSize: 'xl', emphasis: 'hero' } })
      ];
    case '8-operations':
      return [
        makePane('pane-kpi-readiness', 'Readiness', 'stat', 'overall-readiness', '1', 'stat', 'indigo', 0),
        makePane('pane-kpi-requirements', 'Requirements', 'stat', 'active-requirements', '1', 'stat', 'emerald', 1),
        makePane('pane-kpi-people', 'Personnel', 'stat', 'personnel-readiness', '1', 'stat', 'amber', 2),
        makePane('pane-kpi-assets', 'Asset Checks', 'stat', 'asset-checks-due', '1', 'stat', 'violet', 3),
        makePane('pane-due-soon', 'Due Soon', 'work-queue', 'due-soon-actions', '2', 'list', 'amber', 4, { filters: { timeframe: '14days', recordLimit: 5 } }),
        makePane('pane-missing', 'Missing Evidence', 'work-queue', 'missing-evidence', '2', 'cards', 'rose', 5, { filters: { recordLimit: 5 } }),
        makePane('pane-focus', 'Needs Action', 'work-queue', 'focus-suggestions', '2', 'list', 'indigo', 6, { filters: { recordLimit: 5 } }),
        makePane('pane-quick-actions', 'Program Quick Actions', 'quick-actions', 'quick-actions', '2', 'cards', 'sky', 7)
      ];
    case '12-executive':
      return [
        makePane('pane-kpi-readiness', 'Readiness', 'stat', 'overall-readiness', '1', 'stat', 'indigo', 0),
        makePane('pane-kpi-requirements', 'Requirements', 'stat', 'active-requirements', '1', 'stat', 'emerald', 1),
        makePane('pane-kpi-evidence', 'Evidence', 'stat', 'evidence-coverage', '1', 'stat', 'sky', 2),
        makePane('pane-kpi-people', 'Personnel', 'stat', 'personnel-readiness', '1', 'stat', 'amber', 3),
        makePane('pane-kpi-assets', 'Asset Checks', 'stat', 'asset-checks-due', '1', 'stat', 'violet', 4),
        makePane('pane-kpi-actions', 'Open Tasks', 'stat', 'open-actions', '1', 'stat', 'rose', 5),
        makePane('pane-snapshot', 'Compliance Snapshot', 'readiness', 'requirement-status', '2', 'donut', 'indigo', 6),
        makePane('pane-focus', 'Focus / Needs Action', 'work-queue', 'focus-suggestions', '2', 'list', 'amber', 7, { filters: { recordLimit: 5 } }),
        makePane('pane-activity', 'Recent Activity', 'work-queue', 'audit-trail-recent', '2', 'table', 'slate', 8, { filters: { timeframe: '7days', recordLimit: 10 } }),
        makePane('pane-expiring', 'Expiring Soon', 'work-queue', 'expiring-items', '2', 'cards', 'amber', 9, { filters: { timeframe: '30days', recordLimit: 5 } }),
        makePane('pane-upload', 'Evidence Upload Console', 'upload-console', 'upload-console', '2', 'detailed', 'sky', 10),
        makePane('pane-pack', 'Pack Builder Summary', 'pack-builder', 'pack-builder-draft', '2', 'detailed', 'slate', 11)
      ];
    case 'audit-prep':
      return [
        makePane('pane-audit-readiness', 'Readiness Snapshot', 'readiness', 'overall-readiness', '2', 'ring', 'indigo', 0),
        makePane('pane-audit-missing', 'Missing Evidence', 'work-queue', 'missing-evidence', '2', 'table', 'rose', 1, { filters: { recordLimit: 10 } }),
        makePane('pane-audit-actions', 'Open Actions', 'work-queue', 'focus-suggestions', '2', 'list', 'amber', 2, { filters: { recordLimit: 5 } }),
        makePane('pane-audit-pack', 'Pack Builder Summary', 'pack-builder', 'pack-builder-draft', '2', 'detailed', 'slate', 3),
        makePane('pane-audit-requirements', 'Requirement Status', 'status-bars', 'requirement-status', '2', 'stacked', 'emerald', 4),
        makePane('pane-audit-quick', 'Program Quick Actions', 'quick-actions', 'quick-actions', '2', 'cards', 'sky', 5)
      ];
    case 'people-assets':
      return [
        makePane('pane-people-split', 'People Status', 'status-bars', 'people-status', '2', 'stacked', 'emerald', 0),
        makePane('pane-personnel', 'Personnel Readiness', 'readiness', 'personnel-readiness', '2', 'gauge', 'amber', 1),
        makePane('pane-expiring-comps', 'Expiring Competencies', 'work-queue', 'expiring-items', '2', 'list', 'amber', 2, { filters: { recordLimit: 10, timeframe: '30days' } }),
        makePane('pane-asset-checks', 'Asset Checks Due', 'work-queue', 'due-soon-actions', '2', 'table', 'violet', 3, { filters: { recordLimit: 10, timeframe: '30days' } }),
        makePane('pane-overdue-assets', 'Overdue Asset Checks', 'status-bars', 'asset-checks-overdue', '2', 'bar', 'rose', 4),
        makePane('pane-people-quick', 'Program Quick Actions', 'quick-actions', 'quick-actions', '2', 'cards', 'sky', 5)
      ];
    case 'evidence-control':
      return [
        makePane('pane-evidence-coverage', 'Evidence Coverage', 'readiness', 'evidence-coverage', '2', 'donut', 'sky', 0),
        makePane('pane-missing-evidence', 'Missing Evidence', 'work-queue', 'missing-evidence', '2', 'cards', 'rose', 1, { filters: { recordLimit: 10 } }),
        makePane('pane-recent-evidence', 'Recent Evidence', 'mini-chart', 'saved-reports', '1', 'stat', 'sky', 2, { title: 'Recent Evidence Intake' }),
        makePane('pane-upload-console', 'Evidence Upload Console', 'upload-console', 'upload-console', '1', 'compact', 'indigo', 3),
        makePane('pane-pack-summary', 'Pack Builder Summary', 'pack-builder', 'pack-builder-draft', '2', 'detailed', 'slate', 4),
        makePane('pane-evidence-actions', 'Program Quick Actions', 'quick-actions', 'quick-actions', '2', 'cards', 'amber', 5)
      ];
    case 'minimal-focus':
      return [
        makePane('pane-focus-priority', 'Top Priorities', 'work-queue', 'focus-suggestions', '2', 'cards', 'rose', 0, { filters: { recordLimit: 3 } }),
        makePane('pane-focus-due', 'Next Due Items', 'work-queue', 'due-soon-actions', '1', 'list', 'amber', 1, { filters: { recordLimit: 5, timeframe: '7days' } }),
        makePane('pane-focus-actions', 'Program Quick Actions', 'quick-actions', 'quick-actions', '1', 'cards', 'indigo', 2)
      ];
    case 'custom':
      return createEditablePanePreset('6-balanced');
    case '6-balanced':
    default:
      return [
        makePane('pane-balance-readiness', 'Overall Readiness', 'readiness', 'overall-readiness', '2', 'ring', 'indigo', 0),
        makePane('pane-balance-requirements', 'Requirements', 'stat', 'active-requirements', '1', 'stat', 'emerald', 1),
        makePane('pane-balance-personnel', 'Personnel Readiness', 'stat', 'personnel-readiness', '1', 'stat', 'amber', 2),
        makePane('pane-balance-due', 'Due Soon', 'work-queue', 'due-soon-actions', '2', 'list', 'amber', 3, { filters: { timeframe: '14days', recordLimit: 5 } }),
        makePane('pane-balance-snapshot', 'Compliance Snapshot', 'status-bars', 'requirement-status', '2', 'stacked', 'emerald', 4),
        makePane('pane-balance-actions', 'Program Quick Actions', 'quick-actions', 'quick-actions', '2', 'cards', 'sky', 5)
      ];
  }
};

const metricDefinitions: MetricDefinition[] = [
  {
    key: 'active-requirements',
    label: 'Active Requirements',
    description: 'Current active requirement count.',
    module: 'Requirements',
    route: '/dashboard/requirements',
    displayModes: ['stat', 'compact', 'bar'],
    emptyState: 'No active requirements yet.',
    resolver: data => ({
      value: String(data.requirementCounts.active),
      helper: `${data.requirementCounts.green} compliant, ${data.requirementCounts.red} needing attention`,
      status: data.requirementCounts.active > 0 ? 'neutral' : 'warning',
      route: '/dashboard/requirements',
      bars: [
        { label: 'Green', value: data.requirementCounts.green, total: Math.max(data.requirementCounts.active, 1), tone: 'emerald' },
        { label: 'Amber', value: data.requirementCounts.amber, total: Math.max(data.requirementCounts.active, 1), tone: 'amber' },
        { label: 'Red', value: data.requirementCounts.red, total: Math.max(data.requirementCounts.active, 1), tone: 'rose' }
      ]
    })
  },
  {
    key: 'overall-readiness',
    label: 'Overall Readiness',
    description: 'Current readiness score calculated from live workspace data.',
    module: 'Reports',
    route: '/dashboard/reports',
    displayModes: ['stat', 'donut', 'ring', 'gauge', 'detailed'],
    emptyState: 'No active readiness score yet.',
    resolver: data => ({
      value: data.readinessScore === null ? 'N/A' : `${data.readinessScore}%`,
      helper: data.readinessScore === null ? 'Current snapshot unavailable' : data.readinessLabel,
      status: data.readinessScore === null ? 'neutral' : data.readinessScore >= 75 ? 'good' : data.readinessScore >= 50 ? 'warning' : 'danger',
      route: '/dashboard/reports',
      bars: [
        { label: 'Green', value: data.requirementCounts.green, total: Math.max(data.requirementCounts.active, 1), tone: 'emerald' },
        { label: 'Amber', value: data.requirementCounts.amber, total: Math.max(data.requirementCounts.active, 1), tone: 'amber' },
        { label: 'Red', value: data.requirementCounts.red, total: Math.max(data.requirementCounts.active, 1), tone: 'rose' },
        { label: 'Grey', value: data.requirementCounts.grey, total: Math.max(data.requirementCounts.active, 1), tone: 'slate' }
      ],
      note: 'Current snapshot only'
    })
  },
  {
    key: 'personnel-readiness',
    label: 'Personnel Readiness',
    description: 'Validity snapshot for competency records.',
    module: 'Competencies',
    route: '/dashboard/competencies',
    displayModes: ['stat', 'gauge', 'ring', 'bar', 'detailed'],
    emptyState: 'No competency records found yet.',
    resolver: data => {
      const total = data.competencyCounts.valid + data.competencyCounts.expiring + data.competencyCounts.expired + data.competencyCounts.missing;
      const percent = total > 0 ? Math.round((data.competencyCounts.valid / total) * 100) : 0;
      return {
        value: total > 0 ? `${percent}%` : 'N/A',
        helper: `${data.competencyCounts.valid} valid of ${total} records`,
        status: total === 0 ? 'neutral' : percent >= 80 ? 'good' : percent >= 60 ? 'warning' : 'danger',
        route: '/dashboard/competencies',
        bars: [
          { label: 'Valid', value: data.competencyCounts.valid, total: Math.max(total, 1), tone: 'emerald' },
          { label: 'Expiring', value: data.competencyCounts.expiring, total: Math.max(total, 1), tone: 'amber' },
          { label: 'Expired', value: data.competencyCounts.expired, total: Math.max(total, 1), tone: 'rose' },
          { label: 'Missing', value: data.competencyCounts.missing, total: Math.max(total, 1), tone: 'slate' }
        ]
      };
    }
  },
  {
    key: 'evidence-coverage',
    label: 'Evidence Coverage',
    description: 'Classified evidence versus total evidence records.',
    module: 'Evidence Vault',
    route: '/dashboard/vault',
    displayModes: ['stat', 'bar', 'donut', 'ring', 'stacked'],
    emptyState: 'No evidence records found.',
    resolver: data => {
      const percent = data.evidenceCounts.total > 0 ? Math.round((data.evidenceCounts.classified / data.evidenceCounts.total) * 100) : 0;
      return {
        value: data.evidenceCounts.total > 0 ? `${percent}%` : 'N/A',
        helper: `${data.evidenceCounts.classified} of ${data.evidenceCounts.total} classified`,
        status: data.evidenceCounts.total === 0 ? 'neutral' : percent >= 80 ? 'good' : percent >= 50 ? 'warning' : 'danger',
        route: '/dashboard/vault',
        bars: [
          { label: 'Classified', value: data.evidenceCounts.classified, total: Math.max(data.evidenceCounts.total, 1), tone: 'sky' },
          { label: 'Unclassified', value: data.evidenceCounts.unclassified, total: Math.max(data.evidenceCounts.total, 1), tone: 'amber' }
        ]
      };
    }
  },
  {
    key: 'open-actions',
    label: 'Open Actions',
    description: 'Open and in-progress action items.',
    module: 'Actions',
    route: '/dashboard/requirements?filter=actions',
    displayModes: ['stat', 'compact', 'bar', 'list'],
    emptyState: 'No open actions found.',
    resolver: data => ({
      value: String(data.actionCounts.open),
      helper: `${data.actionCounts.overdue} overdue actions`,
      status: data.actionCounts.overdue > 0 ? 'danger' : data.actionCounts.open > 0 ? 'warning' : 'good',
      route: '/dashboard/requirements?filter=actions',
      bars: [
        { label: 'Open', value: data.actionCounts.open, total: Math.max(data.actionCounts.total, 1), tone: 'amber' },
        { label: 'Overdue', value: data.actionCounts.overdue, total: Math.max(data.actionCounts.total, 1), tone: 'rose' }
      ],
      queue: data.queues.overdue
    })
  },
  {
    key: 'overdue-actions',
    label: 'Overdue Actions',
    description: 'Action items already past due.',
    module: 'Actions',
    route: '/dashboard/requirements?filter=actions',
    displayModes: ['stat', 'compact', 'list', 'table'],
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
    label: 'Due Soon',
    description: 'Upcoming actions, checks, reviews, and due records.',
    module: 'Workspace',
    route: '/dashboard/reports',
    displayModes: ['list', 'compact', 'table', 'cards'],
    emptyState: 'No upcoming due items found.',
    resolver: data => ({
      value: String(data.queues.dueSoon.length),
      helper: 'Current due window snapshot',
      status: data.queues.dueSoon.length > 0 ? 'warning' : 'good',
      route: '/dashboard/reports',
      queue: data.queues.dueSoon
    })
  },
  {
    key: 'missing-evidence',
    label: 'Missing Evidence',
    description: 'Requirements or vault records needing evidence attention.',
    module: 'Evidence Vault',
    route: '/dashboard/vault',
    displayModes: ['stat', 'list', 'cards', 'table'],
    emptyState: 'No missing evidence items found.',
    resolver: data => ({
      value: String(data.queues.missingEvidence.length),
      helper: `${data.evidenceCounts.unclassified} unclassified vault records`,
      status: data.queues.missingEvidence.length > 0 ? 'danger' : 'good',
      route: '/dashboard/vault',
      queue: data.queues.missingEvidence
    })
  },
  {
    key: 'requirement-status',
    label: 'Requirement Status',
    description: 'Status split across active requirements.',
    module: 'Requirements',
    route: '/dashboard/requirements',
    displayModes: ['bar', 'stacked', 'donut', 'stat', 'detailed'],
    emptyState: 'No active requirements found.',
    resolver: data => ({
      value: String(data.requirementCounts.active),
      helper: `${data.requirementCounts.green} green, ${data.requirementCounts.red} red`,
      status: data.requirementCounts.red > 0 ? 'danger' : data.requirementCounts.amber > 0 ? 'warning' : data.requirementCounts.active > 0 ? 'good' : 'neutral',
      route: '/dashboard/requirements',
      bars: [
        { label: 'Green', value: data.requirementCounts.green, total: Math.max(data.requirementCounts.active, 1), tone: 'emerald' },
        { label: 'Amber', value: data.requirementCounts.amber, total: Math.max(data.requirementCounts.active, 1), tone: 'amber' },
        { label: 'Red', value: data.requirementCounts.red, total: Math.max(data.requirementCounts.active, 1), tone: 'rose' },
        { label: 'Grey', value: data.requirementCounts.grey, total: Math.max(data.requirementCounts.active, 1), tone: 'slate' }
      ]
    })
  },
  {
    key: 'people-status',
    label: 'People Status',
    description: 'Operational status split for people records.',
    module: 'Competencies',
    route: '/dashboard/competencies',
    displayModes: ['bar', 'stacked', 'stat', 'compact'],
    emptyState: 'No people records found.',
    resolver: data => ({
      value: String(data.competencyCounts.people),
      helper: `${data.peopleStatusCounts.active} active, ${data.peopleStatusCounts.onLeave} on leave`,
      status: data.competencyCounts.people > 0 ? 'neutral' : 'warning',
      route: '/dashboard/competencies',
      bars: [
        { label: 'Active', value: data.peopleStatusCounts.active, total: Math.max(data.competencyCounts.people, 1), tone: 'emerald' },
        { label: 'On Leave', value: data.peopleStatusCounts.onLeave, total: Math.max(data.competencyCounts.people, 1), tone: 'amber' },
        { label: 'Suspended', value: data.peopleStatusCounts.suspended, total: Math.max(data.competencyCounts.people, 1), tone: 'rose' },
        { label: 'Inactive', value: data.peopleStatusCounts.inactive, total: Math.max(data.competencyCounts.people, 1), tone: 'slate' }
      ]
    })
  },
  {
    key: 'expiring-competencies',
    label: 'Expiring Competencies',
    description: 'Competency records that are due soon.',
    module: 'Competencies',
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
    label: 'Expired Competencies',
    description: 'Expired or missing competency records.',
    module: 'Competencies',
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
    key: 'asset-checks-due',
    label: 'Asset Checks Due',
    description: 'Asset check assignments due soon.',
    module: 'Asset Matrix',
    route: '/dashboard/matrix',
    displayModes: ['stat', 'bar', 'list', 'table'],
    emptyState: 'No asset checks due soon.',
    resolver: data => ({
      value: String(data.assetCounts.dueSoonChecks),
      helper: `${data.assetCounts.compliantChecks} of ${data.assetCounts.totalChecks} compliant`,
      status: data.assetCounts.dueSoonChecks > 0 ? 'warning' : 'good',
      route: '/dashboard/matrix',
      bars: [
        { label: 'Compliant', value: data.assetCounts.compliantChecks, total: Math.max(data.assetCounts.totalChecks, 1), tone: 'emerald' },
        { label: 'Due Soon', value: data.assetCounts.dueSoonChecks, total: Math.max(data.assetCounts.totalChecks, 1), tone: 'amber' }
      ],
      queue: data.queues.dueSoon.filter(item => item.category?.toLowerCase().includes('asset'))
    })
  },
  {
    key: 'asset-checks-overdue',
    label: 'Asset Checks Overdue',
    description: 'Asset checks currently overdue.',
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
        { label: 'Overdue', value: data.assetCounts.overdueChecks, total: Math.max(data.assetCounts.totalChecks, 1), tone: 'rose' },
        { label: 'Compliant', value: data.assetCounts.compliantChecks, total: Math.max(data.assetCounts.totalChecks, 1), tone: 'emerald' }
      ]
    })
  },
  {
    key: 'focus-suggestions',
    label: 'Needs Action / Focus',
    description: 'Priority suggestions and action-led workspace focus.',
    module: 'Dashboard',
    route: '/dashboard',
    displayModes: ['list', 'cards', 'compact', 'table'],
    emptyState: 'No current priority suggestions identified.',
    resolver: data => ({
      value: String(data.queues.focusSuggestions.length),
      helper: 'Action-led daily focus',
      status: data.queues.focusSuggestions.length > 0 ? 'warning' : 'good',
      route: '/dashboard',
      queue: data.queues.focusSuggestions
    })
  },
  {
    key: 'expiring-items',
    label: 'Expiring Soon',
    description: 'Items expiring in the selected timeframe.',
    module: 'Dashboard',
    route: '/dashboard/reports',
    displayModes: ['list', 'cards', 'table', 'compact'],
    emptyState: 'No expiring items found.',
    resolver: data => ({
      value: String(data.queues.expiring.length),
      helper: 'Current expiry watchlist',
      status: data.queues.expiring.length > 0 ? 'warning' : 'good',
      route: '/dashboard/reports',
      queue: data.queues.expiring
    })
  },
  {
    key: 'audit-trail-recent',
    label: 'Recent Activity',
    description: 'Recent workspace events visible to the current user.',
    module: 'Audit Trail',
    route: '/dashboard/audit-trail',
    displayModes: ['list', 'table', 'compact'],
    emptyState: 'No accessible activity events found.',
    resolver: data => ({
      value: String(data.auditLogCount),
      helper: 'Permission-filtered activity',
      status: 'neutral',
      route: '/dashboard/audit-trail',
      queue: data.queues.recentActivity
    })
  },
  {
    key: 'pack-builder-draft',
    label: 'Pack Builder Draft',
    description: 'Current local draft selection count.',
    module: 'Audit Packs',
    route: '/dashboard/audit-packs',
    displayModes: ['stat', 'compact', 'detailed'],
    emptyState: 'No local pack items selected.',
    resolver: (_data, packCount) => ({
      value: String(packCount),
      helper: 'Local draft only',
      status: packCount > 0 ? 'good' : 'neutral',
      route: '/dashboard/audit-packs'
    })
  },
  {
    key: 'saved-reports',
    label: 'Saved Reports',
    description: 'Saved report surfaces and views.',
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
  },
  {
    key: 'risk-gaps',
    label: 'Risk Gaps',
    description: 'Combined count of red requirements, overdue actions, and missing competency coverage.',
    module: 'Dashboard',
    route: '/dashboard/reports',
    displayModes: ['stat', 'bar', 'compact'],
    emptyState: 'No risk gaps found.',
    resolver: data => {
      const total = data.requirementCounts.red + data.actionCounts.overdue + data.competencyCounts.missing + data.assetCounts.overdueChecks;
      return {
        value: String(total),
        helper: 'Red requirements, overdue actions, missing competencies and asset gaps',
        status: total > 0 ? 'danger' : 'good',
        route: '/dashboard/reports',
        bars: [
          { label: 'Requirements', value: data.requirementCounts.red, total: Math.max(total, 1), tone: 'rose' },
          { label: 'Actions', value: data.actionCounts.overdue, total: Math.max(total, 1), tone: 'amber' },
          { label: 'Competencies', value: data.competencyCounts.missing, total: Math.max(total, 1), tone: 'slate' },
          { label: 'Assets', value: data.assetCounts.overdueChecks, total: Math.max(total, 1), tone: 'violet' }
        ]
      };
    }
  },
  {
    key: 'active-alerts',
    label: 'Active Alerts',
    description: 'Current warning and alert totals across the workspace.',
    module: 'Dashboard',
    route: '/dashboard',
    displayModes: ['stat', 'bar', 'compact'],
    emptyState: 'No active alerts found.',
    resolver: data => {
      const total = data.requirementCounts.amber + data.actionCounts.dueSoon + data.competencyCounts.expiring + data.assetCounts.dueSoonChecks;
      return {
        value: String(total),
        helper: 'Amber requirements, due-soon actions, expiring competencies and asset checks',
        status: total > 0 ? 'warning' : 'good',
        route: '/dashboard',
        bars: [
          { label: 'Requirements', value: data.requirementCounts.amber, total: Math.max(total, 1), tone: 'amber' },
          { label: 'Actions', value: data.actionCounts.dueSoon, total: Math.max(total, 1), tone: 'rose' },
          { label: 'Competencies', value: data.competencyCounts.expiring, total: Math.max(total, 1), tone: 'emerald' },
          { label: 'Assets', value: data.assetCounts.dueSoonChecks, total: Math.max(total, 1), tone: 'violet' }
        ]
      };
    }
  },
  {
    key: 'quick-actions',
    label: 'Program Quick Actions',
    description: 'Open high-frequency workflows from the homepage.',
    module: 'Dashboard',
    route: '/dashboard',
    displayModes: ['cards', 'compact', 'detailed'],
    emptyState: 'Quick actions unavailable.',
    resolver: () => ({
      value: '6',
      helper: 'Safe actions and shortcuts',
      status: 'neutral',
      route: '/dashboard'
    })
  },
  {
    key: 'upload-console',
    label: 'Evidence Upload Console',
    description: 'Open the private evidence upload flow from the homepage.',
    module: 'Evidence Vault',
    route: '/dashboard/vault',
    displayModes: ['compact', 'detailed'],
    emptyState: 'Upload console unavailable.',
    resolver: () => ({
      value: 'Ready',
      helper: 'Opens the private vault upload flow',
      status: 'neutral',
      route: '/dashboard/vault'
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

const valueFontClasses: Record<DashboardPaneFontSize, string> = {
  sm: 'text-2xl',
  md: 'text-3xl',
  lg: 'text-4xl',
  xl: 'text-5xl'
};

const titleFontClasses: Record<DashboardPaneFontSize, string> = {
  sm: 'text-[11px]',
  md: 'text-xs',
  lg: 'text-sm',
  xl: 'text-base'
};

const helperFontClasses: Record<DashboardPaneFontSize, string> = {
  sm: 'text-[10px]',
  md: 'text-[11px]',
  lg: 'text-xs',
  xl: 'text-sm'
};

const normalisePanes = (panes: DashboardPaneConfig[]) =>
  [...panes]
    .sort((a, b) => a.order - b.order)
    .map((pane, index) => {
      const metricKey = pane.metricKey || 'overall-readiness';
      const titleMode = pane.titleMode || 'suggested';
      const suggestedTitle = getSuggestedTitle(metricKey);
      const type = pane.type || 'stat';
      const displayMode = coerceDisplayMode(type, metricKey, pane.displayMode || 'stat');
      return {
        ...pane,
        title: pane.title || suggestedTitle,
        titleMode,
        type,
        metricKey,
        displayMode,
        visible: pane.visible !== false,
        order: index,
        style: {
          fontSize: pane.style?.fontSize || 'md',
          emphasis: pane.style?.emphasis || 'strong',
          accent: pane.style?.accent || 'indigo',
          compact: pane.style?.compact ?? false,
          showHelper: pane.style?.showHelper ?? true
        },
        filters: {
          statusScope: pane.filters?.statusScope || 'all',
          dateScope: pane.filters?.dateScope || '30days',
          timeframe: pane.filters?.timeframe || DEFAULT_TIMEFRAME,
          recordLimit: pane.filters?.recordLimit || DEFAULT_RECORD_LIMIT,
          includeOverdue: pane.filters?.includeOverdue ?? true
        }
      };
    });

const getSupportedDisplayModes = (type: DashboardPaneType, metricKey: DashboardMetricKey): DashboardPaneDisplayMode[] => {
  const metricModes = metricByKey.get(metricKey)?.displayModes || ['stat', 'compact'];
  switch (type) {
    case 'work-queue':
      return metricModes.filter(mode => ['list', 'table', 'cards', 'compact', 'detailed'].includes(mode));
    case 'status-bars':
      return metricModes.filter(mode => ['bar', 'stacked', 'compact', 'detailed'].includes(mode));
    case 'mini-chart':
      return metricModes.filter(mode => ['bar', 'donut', 'ring', 'compact', 'stat'].includes(mode));
    case 'readiness':
      return metricModes.filter(mode => ['donut', 'ring', 'gauge', 'stat', 'detailed', 'bar'].includes(mode));
    case 'module-summary':
      return ['cards', 'detailed', 'compact'];
    case 'quick-actions':
      return ['cards', 'compact', 'detailed'];
    case 'pack-builder':
      return ['detailed', 'compact', 'stat'];
    case 'upload-console':
      return ['compact', 'detailed'];
    default:
      return metricModes.filter(mode => ['stat', 'compact', 'bar'].includes(mode));
  }
};

const coerceDisplayMode = (
  type: DashboardPaneType,
  metricKey: DashboardMetricKey,
  current: DashboardPaneDisplayMode
): DashboardPaneDisplayMode => {
  const modes = getSupportedDisplayModes(type, metricKey);
  return modes.includes(current) ? current : modes[0] || 'compact';
};

const getNumericPercent = (result: MetricResult) => {
  const match = result.value.match(/(\d+)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
};

const isWithinTimeframe = (dateValue: string | null | undefined, timeframe: DashboardTimeframe) => {
  if (timeframe === 'all' || !dateValue) return true;
  const targetDate = new Date(dateValue);
  if (Number.isNaN(targetDate.getTime())) return true;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  if (timeframe === 'today') {
    end.setDate(end.getDate() + 1);
  } else {
    const amount = Number(timeframe.replace('days', ''));
    end.setDate(end.getDate() + amount);
  }
  return targetDate >= start && targetDate <= end;
};

const filterQueue = (queue: DashboardQueueItem[], pane: DashboardPaneConfig) => {
  const timeframe = pane.filters?.timeframe || DEFAULT_TIMEFRAME;
  const includeOverdue = pane.filters?.includeOverdue ?? true;
  const statusScope = pane.filters?.statusScope || 'all';
  const recordLimit = pane.filters?.recordLimit || DEFAULT_RECORD_LIMIT;

  return queue
    .filter(item => includeOverdue || !item.overdue)
    .filter(item => isWithinTimeframe(item.date, timeframe))
    .filter(item => {
      if (statusScope === 'all') return true;
      const haystack = `${item.status} ${item.subtitle} ${item.category || ''}`.toLowerCase();
      if (statusScope === 'overdue') return item.overdue || haystack.includes('overdue');
      if (statusScope === 'due-soon') return haystack.includes('due');
      if (statusScope === 'expiring') return haystack.includes('expir');
      if (statusScope === 'missing') return haystack.includes('missing') || haystack.includes('unclassified');
      if (statusScope === 'expired') return haystack.includes('expired');
      if (statusScope === 'valid') return haystack.includes('valid');
      return true;
    })
    .slice(0, recordLimit);
};

function ProgressBars({
  bars,
  mode,
  compact
}: {
  bars: NonNullable<MetricResult['bars']>;
  mode: DashboardPaneDisplayMode;
  compact?: boolean;
}) {
  if (bars.length === 0) return null;

  return (
    <div className={`space-y-${compact ? '1.5' : '2'}`}>
      {bars.map(bar => {
        const percent = bar.total > 0 ? Math.min(100, Math.round((bar.value / bar.total) * 100)) : 0;
        const accent = accentClasses[bar.tone];
        return (
          <div key={bar.label} className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="text-muted-foreground">{bar.label}</span>
              <span className="text-foreground">{bar.value}</span>
            </div>
            <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
              <div
                className={`${accent.bar} h-full rounded-full transition-all duration-300`}
                style={{ width: `${percent}%`, opacity: mode === 'stacked' ? 0.95 : 0.8 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RingDisplay({
  result,
  accent,
  fontSize
}: {
  result: MetricResult;
  accent: DashboardPaneAccent;
  fontSize: DashboardPaneFontSize;
}) {
  const percent = getNumericPercent(result);
  const accentStyle = accentClasses[accent];
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - ((percent || 0) / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/20" />
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${accentStyle.text} transition-all duration-500`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`${valueFontClasses[fontSize]} font-black text-foreground leading-none`}>{result.value}</span>
          <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Snapshot</span>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-bold text-foreground">{result.helper}</p>
        {result.note && <p className="text-[11px] font-medium text-muted-foreground">{result.note}</p>}
      </div>
    </div>
  );
}

function GaugeDisplay({
  result,
  accent,
  fontSize
}: {
  result: MetricResult;
  accent: DashboardPaneAccent;
  fontSize: DashboardPaneFontSize;
}) {
  const percent = getNumericPercent(result) || 0;
  const accentStyle = accentClasses[accent];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className={`${valueFontClasses[fontSize]} font-black text-foreground leading-none`}>{result.value}</span>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${accentStyle.border} ${accentStyle.text} ${accentStyle.bg}`}>
          {result.helper}
        </span>
      </div>
      <div className="overflow-hidden rounded-full bg-muted/40">
        <div
          className={`${accentStyle.bar} h-3 rounded-full transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {result.note && <p className="text-[11px] text-muted-foreground">{result.note}</p>}
    </div>
  );
}

function QueueList({
  items,
  mode,
  onNavigate
}: {
  items: DashboardQueueItem[];
  mode: DashboardPaneDisplayMode;
  onNavigate: (path: string) => void;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No matching records for this timeframe.</p>;
  }

  if (mode === 'table') {
    return (
      <div className="overflow-hidden rounded-lg border border-border/60">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Record</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr
                key={item.id}
                className="border-t border-border/60 cursor-pointer hover:bg-muted/20"
                onClick={() => onNavigate(item.route)}
              >
                <td className="px-3 py-2">
                  <div className="font-bold text-foreground">{item.title}</div>
                  <div className="text-[10px] text-muted-foreground">{item.subtitle}</div>
                </td>
                <td className="px-3 py-2 text-[10px] font-bold text-foreground">{item.status}</td>
                <td className="px-3 py-2 text-[10px] text-muted-foreground">{item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (mode === 'cards') {
    return (
      <div className="grid gap-2 md:grid-cols-2">
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.route)}
            className="rounded-xl border border-border bg-card p-3 text-left hover:border-indigo-500/30 hover:bg-muted/20 transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-black text-foreground">{item.title}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">{item.subtitle}</div>
              </div>
              <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${
                item.overdue ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
              }`}>
                {item.status}
              </span>
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          onClick={() => onNavigate(item.route)}
          className="flex w-full items-start justify-between gap-3 rounded-xl border border-border bg-card p-3 text-left hover:border-indigo-500/30 hover:bg-muted/20 transition-all"
        >
          <div className="min-w-0">
            <div className="truncate text-xs font-black text-foreground">{item.title}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">{item.subtitle}</div>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${
            item.overdue ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
          }`}>
            {item.status}
          </span>
        </button>
      ))}
    </div>
  );
}

function ModuleSummaryPane({ onNavigate }: { onNavigate: (path: string) => void }) {
  const modules = [
    { label: 'Requirements', route: '/dashboard/requirements', icon: ShieldCheck },
    { label: 'Competencies', route: '/dashboard/competencies', icon: Briefcase },
    { label: 'Evidence Vault', route: '/dashboard/vault', icon: Upload },
    { label: 'Asset Matrix', route: '/dashboard/matrix', icon: ClipboardList },
    { label: 'Actions', route: '/dashboard/requirements?filter=actions', icon: AlertTriangle },
    { label: 'Reports', route: '/dashboard/reports', icon: BarChart3 }
  ];

  return (
    <div className="grid gap-2 md:grid-cols-2">
      {modules.map(module => {
        const Icon = module.icon;
        return (
          <button
            key={module.label}
            type="button"
            onClick={() => onNavigate(module.route)}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left hover:border-indigo-500/30 hover:bg-muted/20 transition-all"
          >
            <span className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="text-[11px] font-black text-foreground">{module.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function QuickActionPane({
  onQuickAction,
  isEditing
}: {
  onQuickAction?: (action: DashboardQuickAction) => void;
  isEditing: boolean;
}) {
  const actions: Array<{ id: DashboardQuickAction; label: string; helper: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'upload-evidence', label: 'Upload Evidence', helper: 'Open private vault upload', icon: Upload },
    { id: 'create-requirement', label: 'Create Requirement', helper: 'Add a requirement', icon: ShieldCheck },
    { id: 'add-competency', label: 'Add Competency', helper: 'Open competency workflow', icon: Briefcase },
    { id: 'create-action', label: 'Create Action', helper: 'Register a gap item', icon: FileSpreadsheet },
    { id: 'build-pack', label: 'Build Pack', helper: 'Open Evidence Pack Builder', icon: FileText },
    { id: 'view-requirements', label: 'View Requirements', helper: 'Jump to requirements', icon: ClipboardList }
  ];

  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {actions.map(action => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            type="button"
            onClick={() => !isEditing && onQuickAction?.(action.id)}
            className={`rounded-xl border border-border p-3 text-left transition-all ${
              isEditing
                ? 'cursor-default bg-muted/20'
                : 'bg-card hover:border-indigo-500/30 hover:bg-muted/20'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div>
                <div className="text-[11px] font-black text-foreground">{action.label}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">{action.helper}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function UploadConsolePane({
  onQuickAction,
  isEditing
}: {
  onQuickAction?: (action: DashboardQuickAction) => void;
  isEditing: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
        <div className="text-xs font-black text-foreground">Private Evidence Upload</div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          {isEditing
            ? 'Upload is paused while Edit Mode is active so pane dragging cannot be mistaken for a file drop.'
            : 'Open the existing private Evidence Vault upload flow. Files remain organisation-scoped and private.'}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isEditing}
          onClick={() => onQuickAction?.('upload-evidence')}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-black transition-all ${
            isEditing
              ? 'cursor-not-allowed border border-border bg-muted/30 text-muted-foreground'
              : 'border border-sky-500/25 bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 dark:text-sky-300'
          }`}
        >
          <Upload className="h-3.5 w-3.5" />
          Open upload flow
        </button>
        <button
          type="button"
          onClick={() => onQuickAction?.('open-vault')}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[11px] font-black text-foreground hover:bg-muted/20"
        >
          <FileText className="h-3.5 w-3.5" />
          Open Evidence Vault
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Files are never uploaded from dashboard layout editing. Use the normal vault flow after saving your layout.
      </p>
    </div>
  );
}

function ConfirmationDialog({
  state,
  onClose
}: {
  state: ConfirmationState | null;
  onClose: () => void;
}) {
  useBodyScrollLock(Boolean(state));
  if (!state) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <h3 className="text-sm font-black text-foreground">{state.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{state.body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-[11px] font-black text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              state.onConfirm();
              onClose();
            }}
            className={`rounded-lg px-3 py-2 text-[11px] font-black ${
              state.tone === 'danger'
                ? 'border border-rose-500/25 bg-rose-500/10 text-rose-600 hover:bg-rose-500/15'
                : 'border border-indigo-500/25 bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/15 dark:text-indigo-400'
            }`}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
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
  onDragEnd,
  onDragOver,
  onDrop,
  isDragged,
  onQuickAction
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
  onDragStart: (event: React.DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onDrop: () => void;
  isDragged: boolean;
  onQuickAction?: (action: DashboardQuickAction) => void;
}) {
  const metric = metricByKey.get(pane.metricKey) || metricDefinitions[0];
  const result = metric.resolver(data, packItemCount);
  const accent = accentClasses[pane.style.accent];
  const filteredQueue = result.queue ? filterQueue(result.queue, pane) : [];
  const isQueuePane = pane.type === 'work-queue';
  const isCompact = pane.displayMode === 'compact' || pane.style.compact;
  const valueClass = valueFontClasses[pane.style.fontSize];
  const titleClass = titleFontClasses[pane.style.fontSize];
  const helperClass = helperFontClasses[pane.style.fontSize];
  const emphasisClass =
    pane.style.emphasis === 'hero'
      ? 'tracking-tight'
      : pane.style.emphasis === 'strong'
        ? 'tracking-normal'
        : 'tracking-wide';
  const cardClass = [
    'group relative overflow-hidden rounded-2xl border bg-card shadow-xs transition-all',
    spanClasses[pane.span],
    accent.border,
    isEditing ? 'ring-1 ring-dashed ring-indigo-500/25 hover:shadow-md hover:ring-indigo-500/40' : 'hover:shadow-sm',
    isDragged ? 'scale-[0.98] opacity-60' : '',
    isCompact ? 'p-3' : 'p-4'
  ].join(' ');

  const renderBody = () => {
    if (pane.type === 'quick-actions') {
      return <QuickActionPane onQuickAction={onQuickAction} isEditing={isEditing} />;
    }

    if (pane.type === 'upload-console') {
      return <UploadConsolePane onQuickAction={onQuickAction} isEditing={isEditing} />;
    }

    if (pane.type === 'module-summary') {
      return <ModuleSummaryPane onNavigate={onNavigate} />;
    }

    if (pane.type === 'pack-builder') {
      return (
        <div className="space-y-3">
          <div className={`${valueClass} font-black text-foreground ${emphasisClass}`}>{result.value}</div>
          <p className={`${helperClass} text-muted-foreground`}>{result.helper}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onQuickAction?.('build-pack')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-500/25 bg-slate-500/10 px-3 py-2 text-[11px] font-black text-slate-700 hover:bg-slate-500/15 dark:text-slate-300"
            >
              <FileText className="h-3.5 w-3.5" />
              Open Pack Builder
            </button>
            <button
              type="button"
              onClick={() => onNavigate(result.route)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[11px] font-black text-foreground hover:bg-muted/20"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              View audit packs
            </button>
          </div>
        </div>
      );
    }

    if (isQueuePane) {
      return <QueueList items={filteredQueue} mode={pane.displayMode} onNavigate={onNavigate} />;
    }

    if (pane.displayMode === 'donut' || pane.displayMode === 'ring') {
      return <RingDisplay result={result} accent={pane.style.accent} fontSize={pane.style.fontSize} />;
    }

    if (pane.displayMode === 'gauge') {
      return <GaugeDisplay result={result} accent={pane.style.accent} fontSize={pane.style.fontSize} />;
    }

    return (
      <div className="space-y-4">
        <div className={`${valueClass} font-black text-foreground ${emphasisClass}`}>{result.value}</div>
        {pane.style.showHelper && (
          <p className={`${helperClass} text-muted-foreground`}>{result.helper}</p>
        )}
        {result.note && pane.displayMode !== 'compact' && (
          <p className="text-[10px] font-medium text-muted-foreground">{result.note}</p>
        )}
        {result.bars && result.bars.length > 0 && (
          <ProgressBars bars={result.bars} mode={pane.displayMode} compact={isCompact} />
        )}
        {!result.bars?.length && pane.displayMode === 'detailed' && metric.description && (
          <p className="text-[11px] text-muted-foreground">{metric.description}</p>
        )}
      </div>
    );
  };

  return (
    <section
      className={cardClass}
      onDragOver={isEditing ? onDragOver : undefined}
      onDrop={isEditing ? onDrop : undefined}
      data-dashboard-pane-id={pane.id}
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${accent.bar}`} />
      <div className="flex items-start justify-between gap-3 pb-3">
        <div className="min-w-0">
          <div className={`font-black uppercase tracking-[0.18em] text-muted-foreground ${titleClass}`}>{pane.title}</div>
          {pane.style.showHelper && (
            <div className="mt-1 text-[11px] text-muted-foreground">
              {metric.module} {metric.description ? `• ${metric.description}` : ''}
            </div>
          )}
        </div>
        {isEditing ? (
          <div className="flex items-center gap-1 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-1 shadow-sm">
            <button
              type="button"
              draggable
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              title="Drag to reorder"
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/20 bg-card px-2 py-1 text-[10px] font-black text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-400"
            >
              <GripVertical className="h-3.5 w-3.5" />
              Move
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              title="Open pane settings"
              className="rounded-lg border border-border bg-card px-2 py-1 text-[10px] font-black text-foreground hover:bg-muted/20"
            >
              Settings
            </button>
            <button
              type="button"
              onClick={() => onMove(-1)}
              title="Move pane up"
              className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              title="Move pane down"
              className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDuplicate}
              title="Duplicate pane"
              className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onHide}
              title="Hide pane"
              className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground hover:text-foreground"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onRemove}
              title="Remove pane"
              className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-1.5 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate(result.route)}
            className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${accent.border} ${accent.text} ${accent.bg}`}
          >
            Open
          </button>
        )}
      </div>
      {renderBody()}
    </section>
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
  const suggestedTitle = getSuggestedTitle(pane.metricKey);

  useBodyScrollLock(true);

  const updatePane = (patch: Partial<DashboardPaneConfig>) => {
    onUpdate({ ...pane, ...patch });
  };

  return (
    <div className="fixed inset-0 z-[75] bg-black/60 flex justify-end animate-in fade-in duration-200" onClick={onClose}>
      <aside
        className="h-full w-full max-w-lg overflow-hidden border-l border-border bg-card shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/10 p-4">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Pane Settings</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">{metric.module} source • {metric.label}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-[calc(100%-78px)] overflow-y-auto p-4">
          <div className="space-y-6">
            <section className="space-y-3">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Content</h4>
                <p className="mt-1 text-[11px] text-muted-foreground">Choose what this pane shows and how the title should behave.</p>
              </div>
              <label className="block space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground">Data source</span>
                <select
                  value={pane.metricKey}
                  onChange={event => {
                    const metricKey = event.target.value as DashboardMetricKey;
                    const nextTitle = getSuggestedTitle(metricKey);
                    const shouldUpdateTitle = pane.titleMode !== 'custom' || pane.title === suggestedTitle || pane.title.trim() === '';
                    updatePane({
                      metricKey,
                      displayMode: coerceDisplayMode(pane.type, metricKey, pane.displayMode),
                      title: shouldUpdateTitle ? nextTitle : pane.title,
                      titleMode: shouldUpdateTitle ? 'suggested' : pane.titleMode
                    });
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
              <label className="block space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground">Pane title</span>
                <input
                  value={pane.title}
                  onChange={event => updatePane({ title: event.target.value, titleMode: 'custom' })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-indigo-500"
                />
              </label>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/15 px-3 py-2">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Suggested title</div>
                  <div className="mt-1 text-xs font-semibold text-foreground">{suggestedTitle}</div>
                </div>
                <button
                  type="button"
                  onClick={() => updatePane({ title: suggestedTitle, titleMode: 'suggested' })}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-[11px] font-black text-foreground hover:bg-muted/20"
                >
                  Use suggested title
                </button>
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Display</h4>
                <p className="mt-1 text-[11px] text-muted-foreground">Choose the visual style and layout density that best fits this pane.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground">Visual mode</span>
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
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground">Records shown</span>
                  <select
                    value={pane.filters?.recordLimit || DEFAULT_RECORD_LIMIT}
                    onChange={event => updatePane({
                      filters: { ...pane.filters, recordLimit: Number(event.target.value) as DashboardRecordLimit }
                    })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-indigo-500"
                  >
                    <option value={3}>3</option>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground">Timeframe</span>
                  <select
                    value={pane.filters?.timeframe || DEFAULT_TIMEFRAME}
                    onChange={event => updatePane({
                      filters: { ...pane.filters, timeframe: event.target.value as DashboardTimeframe }
                    })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-indigo-500"
                  >
                    <option value="today">Today</option>
                    <option value="7days">Next 7 days</option>
                    <option value="14days">Next 14 days</option>
                    <option value="30days">Next 30 days</option>
                    <option value="60days">Next 60 days</option>
                    <option value="90days">Next 90 days</option>
                    <option value="all">All visible</option>
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground">Status scope</span>
                  <select
                    value={pane.filters?.statusScope || 'all'}
                    onChange={event => updatePane({
                      filters: {
                        ...pane.filters,
                        statusScope: event.target.value as NonNullable<DashboardPaneConfig['filters']>['statusScope']
                      }
                    })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-indigo-500"
                  >
                    <option value="all">All visible</option>
                    <option value="overdue">Overdue</option>
                    <option value="due-soon">Due soon</option>
                    <option value="expiring">Expiring</option>
                    <option value="missing">Missing</option>
                    <option value="valid">Valid</option>
                    <option value="expired">Expired</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs font-bold text-foreground">
                  <input
                    type="checkbox"
                    checked={pane.filters?.includeOverdue ?? true}
                    onChange={event => updatePane({
                      filters: { ...pane.filters, includeOverdue: event.target.checked }
                    })}
                  />
                  Include overdue items
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Style</h4>
                <p className="mt-1 text-[11px] text-muted-foreground">Typography and accent settings preview live before Save.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground">Font size</span>
                  <select
                    value={pane.style.fontSize}
                    onChange={event => updatePane({ style: { ...pane.style, fontSize: event.target.value as DashboardPaneFontSize } })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-indigo-500"
                  >
                    <option value="sm">Small</option>
                    <option value="md">Standard</option>
                    <option value="lg">Large</option>
                    <option value="xl">Extra large</option>
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
                    checked={pane.style.compact}
                    onChange={event => updatePane({ style: { ...pane.style, compact: event.target.checked } })}
                  />
                  Compact layout
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs font-bold text-foreground">
                  <input
                    type="checkbox"
                    checked={pane.style.showHelper}
                    onChange={event => updatePane({ style: { ...pane.style, showHelper: event.target.checked } })}
                  />
                  Show helper text
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Actions</h4>
                <p className="mt-1 text-[11px] text-muted-foreground">Use confirmations before removing or resetting panes.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onDuplicate}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[11px] font-black text-foreground hover:bg-muted/20"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[11px] font-black text-foreground hover:bg-muted/20"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reset pane
                </button>
                <button
                  type="button"
                  onClick={onRemove}
                  className="inline-flex items-center gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[11px] font-black text-rose-600 hover:bg-rose-500/15 dark:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove pane
                </button>
              </div>
            </section>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function EditableDashboardGrid({
  config,
  isEditing,
  data,
  onChange,
  onNavigate,
  onQuickAction,
  hasUnsavedChanges = false
}: {
  config: EditableDashboardConfig;
  isEditing: boolean;
  data: DashboardMetricSnapshot;
  onChange: (config: EditableDashboardConfig) => void;
  onNavigate: (path: string) => void;
  onQuickAction?: (action: DashboardQuickAction) => void;
  hasUnsavedChanges?: boolean;
}) {
  const packBuilder = usePackBuilder();
  const [selectedPaneId, setSelectedPaneId] = useState<string | null>(null);
  const [draggedPaneId, setDraggedPaneId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const paneIdCounterRef = useRef(0);
  const visiblePanes = useMemo(() => normalisePanes(config.panes).filter(pane => pane.visible || isEditing), [config.panes, isEditing]);
  const selectedPane = normalisePanes(config.panes).find(pane => pane.id === selectedPaneId) || null;

  const updatePanes = (panes: DashboardPaneConfig[]) => {
    onChange({ ...config, panes: normalisePanes(panes), preset: config.preset });
  };

  const updatePane = (updatedPane: DashboardPaneConfig) => {
    updatePanes(config.panes.map(pane => (pane.id === updatedPane.id ? updatedPane : pane)));
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
      titleMode: 'custom',
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
      config.panes.length,
      { titleMode: 'custom' }
    );
    updatePanes([...config.panes, pane]);
    setSelectedPaneId(pane.id);
  };

  const resetPane = (pane: DashboardPaneConfig) => {
    const presetDefault = createEditablePanePreset(config.preset === 'custom' ? '6-balanced' : config.preset).find(item => item.metricKey === pane.metricKey);
    const fallback = makePane(
      pane.id,
      getSuggestedTitle(pane.metricKey),
      pane.type,
      pane.metricKey,
      pane.span,
      coerceDisplayMode(pane.type, pane.metricKey, pane.displayMode),
      pane.style.accent,
      pane.order
    );
    const replacement = presetDefault || fallback;
    updatePane({
      ...replacement,
      id: pane.id,
      order: pane.order,
      visible: true
    });
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
      <div className={`rounded-2xl border p-4 shadow-xs transition-all ${
        isEditing
          ? 'border-indigo-500/30 bg-indigo-500/5 ring-1 ring-indigo-500/15'
          : 'border-border bg-card'
      }`}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
              <LayoutGrid className="h-4 w-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
                  {isEditing ? 'Editing Dashboard' : 'Editable Homepage'}
                </h2>
                {isEditing && (
                  <span className="rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Full pane mode
                  </span>
                )}
                {isEditing && hasUnsavedChanges && (
                  <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Unsaved changes
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                Every visible homepage section is represented as a movable pane. Metrics stay data-backed, and trend views stay honestly marked as current snapshots only.
              </p>
            </div>
          </div>
          {isEditing && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={addPane}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-3 py-2 text-[11px] font-black text-indigo-600 hover:bg-indigo-500/20 dark:text-indigo-400"
              >
                <Plus className="h-3.5 w-3.5" />
                Add pane
              </button>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(presetLabels).map(([preset, label]) => (
              <button
                key={preset}
                type="button"
                onClick={() => applyPreset(preset as DashboardGridPreset)}
                className={`rounded-lg border px-3 py-2 text-[11px] font-black transition-colors ${
                  config.preset === preset
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {isEditing && hiddenPanes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
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

      <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 ${isEditing ? 'grid-flow-row-dense' : ''}`}>
        {visiblePanes.map(pane => (
          <PaneRenderer
            key={pane.id}
            pane={pane}
            data={data}
            packItemCount={packBuilder.items.length}
            isEditing={isEditing}
            onNavigate={onNavigate}
            onQuickAction={onQuickAction}
            onOpenSettings={() => setSelectedPaneId(pane.id)}
            onMove={direction => movePane(pane.id, direction)}
            onDuplicate={() =>
              setConfirmation({
                title: 'Duplicate pane?',
                body: `Create a copy of "${pane.title}" so you can configure a variant without losing the original.`,
                confirmLabel: 'Duplicate pane',
                onConfirm: () => duplicatePane(pane)
              })
            }
            onHide={() => updatePane({ ...pane, visible: false })}
            onRemove={() =>
              setConfirmation({
                title: 'Remove pane?',
                body: `Remove "${pane.title}" from this homepage layout. You can add it back later from presets or by creating a new pane.`,
                confirmLabel: 'Remove pane',
                tone: 'danger',
                onConfirm: () => {
                  updatePanes(config.panes.filter(item => item.id !== pane.id));
                  if (selectedPaneId === pane.id) setSelectedPaneId(null);
                }
              })
            }
            onDragStart={event => {
              event.stopPropagation();
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('application/x-lumen-dashboard-pane', pane.id);
              setDraggedPaneId(pane.id);
            }}
            onDragEnd={() => setDraggedPaneId(null)}
            onDragOver={event => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onDrop={() => dropPane(pane.id)}
            isDragged={draggedPaneId === pane.id}
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
          onReset={() =>
            setConfirmation({
              title: 'Reset this pane?',
              body: `Restore "${selectedPane.title}" to its default settings for the current preset. This keeps the pane in place but resets its configuration.`,
              confirmLabel: 'Reset pane',
              onConfirm: () => resetPane(selectedPane)
            })
          }
          onDuplicate={() =>
            setConfirmation({
              title: 'Duplicate this pane?',
              body: `Create a copy of "${selectedPane.title}" so you can compare two views side by side.`,
              confirmLabel: 'Duplicate pane',
              onConfirm: () => duplicatePane(selectedPane)
            })
          }
          onRemove={() =>
            setConfirmation({
              title: 'Remove this pane?',
              body: `Remove "${selectedPane.title}" from this homepage layout. You can still add it back later.`,
              confirmLabel: 'Remove pane',
              tone: 'danger',
              onConfirm: () => {
                updatePanes(config.panes.filter(item => item.id !== selectedPane.id));
                setSelectedPaneId(null);
              }
            })
          }
        />
      )}

      <ConfirmationDialog state={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  );
}
