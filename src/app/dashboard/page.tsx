'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';
import ComplianceHeroCore from './components/ComplianceHeroCore';
import { InlineToast, ToastState } from '@/components/AppFeedback';
import { ActionDetailDrawer } from '@/components/ActionDetailDrawer';
import { EvidenceDropzone } from '@/components/EvidenceDropzone';
import { evidenceAcceptAttribute } from '@/lib/evidenceStorage';
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
  BarChart3,
  Settings,
  ArrowRight,
  Move,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Check,
  RotateCcw
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

const getGreeting = () => {
  const hour = new Date().getHours();
  const day = new Date().getDay(); // 0 is Sunday, 5 is Friday
  if (day === 5 && hour >= 12 && hour < 18) return 'Happy Friday';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

interface DashboardWidget {
  id: string;
  title: string;
  description: string;
  defaultZone: 'top-kpis' | 'main' | 'right-rail' | 'lower-grid';
  defaultOrder: number;
  defaultSize: 'sm' | 'md' | 'lg' | 'full';
  minSize?: 'sm' | 'md' | 'lg' | 'full';
  canHide: boolean;
  canMove: boolean;
  canResize: boolean;
  supportedDetailLevels: ('compact' | 'standard' | 'detailed')[];
  supportedHoverDetail: boolean;
  supportedClickDrilldown: boolean;
  dataSourceDescription: string;
  emptyStateText: string;
  routeTarget?: string;
}

const DASHBOARD_WIDGET_REGISTRY: DashboardWidget[] = [
  {
    id: 'health',
    title: 'Compliance Health',
    description: 'Overview metric showing overall readiness score.',
    defaultZone: 'top-kpis',
    defaultOrder: 0,
    defaultSize: 'sm',
    canHide: true,
    canMove: true,
    canResize: false,
    supportedDetailLevels: ['compact', 'standard', 'detailed'],
    supportedHoverDetail: true,
    supportedClickDrilldown: true,
    dataSourceDescription: 'readinessReport.overallScore',
    emptyStateText: 'N/A',
    routeTarget: '/dashboard/requirements'
  },
  {
    id: 'requirements',
    title: 'Framework Requirements',
    description: 'Active compliance objectives tracking.',
    defaultZone: 'top-kpis',
    defaultOrder: 1,
    defaultSize: 'sm',
    canHide: true,
    canMove: true,
    canResize: false,
    supportedDetailLevels: ['compact', 'standard', 'detailed'],
    supportedHoverDetail: true,
    supportedClickDrilldown: true,
    dataSourceDescription: 'stats.activeRequirements',
    emptyStateText: '0 active requirements',
    routeTarget: '/dashboard/requirements'
  },
  {
    id: 'evidence',
    title: 'Evidence Vault Coverage',
    description: 'Percentage of classified and active evidence files.',
    defaultZone: 'top-kpis',
    defaultOrder: 2,
    defaultSize: 'sm',
    canHide: true,
    canMove: true,
    canResize: false,
    supportedDetailLevels: ['compact', 'standard', 'detailed'],
    supportedHoverDetail: true,
    supportedClickDrilldown: true,
    dataSourceDescription: 'documents',
    emptyStateText: 'No evidence documents loaded',
    routeTarget: '/dashboard/vault'
  },
  {
    id: 'training',
    title: 'Personnel Competency Training',
    description: 'Teammates competency and training compliance percentage.',
    defaultZone: 'top-kpis',
    defaultOrder: 3,
    defaultSize: 'sm',
    canHide: true,
    canMove: true,
    canResize: false,
    supportedDetailLevels: ['compact', 'standard', 'detailed'],
    supportedHoverDetail: true,
    supportedClickDrilldown: true,
    dataSourceDescription: 'competencySummary',
    emptyStateText: 'No personnel records loaded',
    routeTarget: '/dashboard/competencies'
  },
  {
    id: 'tasks',
    title: 'Open Tasks / Gaps',
    description: 'Remediation action items and compliance gap statuses.',
    defaultZone: 'top-kpis',
    defaultOrder: 4,
    defaultSize: 'sm',
    canHide: true,
    canMove: true,
    canResize: false,
    supportedDetailLevels: ['compact', 'standard', 'detailed'],
    supportedHoverDetail: true,
    supportedClickDrilldown: true,
    dataSourceDescription: 'actions',
    emptyStateText: 'No open action items',
    routeTarget: '/dashboard/requirements?filter=actions'
  },
  {
    id: 'asset',
    title: 'Asset Assurance',
    description: 'Checklist compliance of assigned vehicles and equipment.',
    defaultZone: 'top-kpis',
    defaultOrder: 5,
    defaultSize: 'sm',
    canHide: true,
    canMove: true,
    canResize: false,
    supportedDetailLevels: ['compact', 'standard', 'detailed'],
    supportedHoverDetail: true,
    supportedClickDrilldown: true,
    dataSourceDescription: 'assets',
    emptyStateText: 'No asset assignments loaded',
    routeTarget: '/dashboard/matrix'
  },
  {
    id: 'hero',
    title: 'Compliance Program Overview Map',
    description: 'Visual SVG engine mapping compliance components.',
    defaultZone: 'main',
    defaultOrder: 0,
    defaultSize: 'full',
    canHide: false,
    canMove: false,
    canResize: false,
    supportedDetailLevels: ['standard', 'detailed'],
    supportedHoverDetail: true,
    supportedClickDrilldown: true,
    dataSourceDescription: 'All system metrics (stats, documents, competency, assets)',
    emptyStateText: 'No active program configuration loaded'
  },
  {
    id: 'snapshot',
    title: 'Compliance Snapshot Gauge',
    description: 'Circular gauge with overall score and count breakdowns.',
    defaultZone: 'right-rail',
    defaultOrder: 0,
    defaultSize: 'sm',
    canHide: true,
    canMove: true,
    canResize: false,
    supportedDetailLevels: ['compact', 'standard', 'detailed'],
    supportedHoverDetail: true,
    supportedClickDrilldown: true,
    dataSourceDescription: 'readinessReport & stats',
    emptyStateText: 'No status information available'
  },
  {
    id: 'focus-card',
    title: 'Tabbed Intelligence Center',
    description: 'Interactive feed showing Focus items, next 7 days tasks, needs action lists, and audit trails.',
    defaultZone: 'right-rail',
    defaultOrder: 1,
    defaultSize: 'md',
    canHide: true,
    canMove: true,
    canResize: false,
    supportedDetailLevels: ['standard', 'detailed'],
    supportedHoverDetail: true,
    supportedClickDrilldown: true,
    dataSourceDescription: 'suggestions, tasks, and safe logs',
    emptyStateText: 'No immediate tasks registered'
  },
  {
    id: 'expiring',
    title: 'Expiring Soon Feed',
    description: 'Tracks documents and certifications expiring in the next 30 days.',
    defaultZone: 'right-rail',
    defaultOrder: 2,
    defaultSize: 'sm',
    canHide: true,
    canMove: true,
    canResize: false,
    supportedDetailLevels: ['compact', 'standard'],
    supportedHoverDetail: true,
    supportedClickDrilldown: true,
    dataSourceDescription: 'expiringSoonItems',
    emptyStateText: 'No items expiring soon'
  },
  {
    id: 'upload-console',
    title: 'Smart Upload console',
    description: 'Evidence file dropper and linker workflow console.',
    defaultZone: 'right-rail',
    defaultOrder: 3,
    defaultSize: 'sm',
    canHide: true,
    canMove: true,
    canResize: false,
    supportedDetailLevels: ['compact', 'standard'],
    supportedHoverDetail: true,
    supportedClickDrilldown: false,
    dataSourceDescription: 'EvidenceVault upload utility',
    emptyStateText: 'Drag and drop uploads disabled'
  },
  {
    id: 'quickActions',
    title: 'Program Quick Actions',
    description: 'Quick links to launch upload, goal creation, competency, and pack builder forms.',
    defaultZone: 'lower-grid',
    defaultOrder: 0,
    defaultSize: 'full',
    canHide: true,
    canMove: true,
    canResize: false,
    supportedDetailLevels: ['compact', 'standard', 'detailed'],
    supportedHoverDetail: false,
    supportedClickDrilldown: false,
    dataSourceDescription: 'Interactive workflow modal triggers',
    emptyStateText: 'No actions available'
  },
  {
    id: 'trend',
    title: 'Readiness History Trend',
    description: 'Historical path representing compliance score changes.',
    defaultZone: 'lower-grid',
    defaultOrder: 1,
    defaultSize: 'md',
    canHide: true,
    canMove: true,
    canResize: false,
    supportedDetailLevels: ['standard', 'detailed'],
    supportedHoverDetail: true,
    supportedClickDrilldown: true,
    dataSourceDescription: 'overallScore history path',
    emptyStateText: 'Historical readiness statistics not populated'
  },
  {
    id: 'statusDonut',
    title: 'Requirement Status Segment',
    description: 'Compliant vs at-risk count distribution ring.',
    defaultZone: 'lower-grid',
    defaultOrder: 2,
    defaultSize: 'md',
    canHide: true,
    canMove: true,
    canResize: false,
    supportedDetailLevels: ['standard', 'detailed'],
    supportedHoverDetail: true,
    supportedClickDrilldown: true,
    dataSourceDescription: 'stats statuses',
    emptyStateText: 'Status indicators not populated'
  },
  {
    id: 'readinessGauge',
    title: 'Audit Readiness Level Dial',
    description: 'Readiness indicator arch with amber/red details.',
    defaultZone: 'lower-grid',
    defaultOrder: 3,
    defaultSize: 'md',
    canHide: true,
    canMove: true,
    canResize: false,
    supportedDetailLevels: ['standard', 'detailed'],
    supportedHoverDetail: true,
    supportedClickDrilldown: true,
    dataSourceDescription: 'overallScore level',
    emptyStateText: 'Readiness details not assessed'
  },
  {
    id: 'trainingRing',
    title: 'Personnel Competency Ring',
    description: 'Training completion ring showing valid vs overdue counts.',
    defaultZone: 'lower-grid',
    defaultOrder: 4,
    defaultSize: 'md',
    canHide: true,
    canMove: true,
    canResize: false,
    supportedDetailLevels: ['standard', 'detailed'],
    supportedHoverDetail: true,
    supportedClickDrilldown: true,
    dataSourceDescription: 'competencySummary validation status',
    emptyStateText: 'Personnel competencies not configured'
  },
  {
    id: 'assetCategory',
    title: 'Asset Category Health',
    description: 'Category-wise checks compliance metrics.',
    defaultZone: 'lower-grid',
    defaultOrder: 5,
    defaultSize: 'md',
    canHide: true,
    canMove: true,
    canResize: false,
    supportedDetailLevels: ['standard', 'detailed'],
    supportedHoverDetail: true,
    supportedClickDrilldown: true,
    dataSourceDescription: 'assetCategoryCompliance checks',
    emptyStateText: 'No asset categories configured'
  },
  {
    id: 'riskGaps',
    title: 'Top Risk Gaps',
    description: 'Count of pending requirements classified by risk level.',
    defaultZone: 'lower-grid',
    defaultOrder: 6,
    defaultSize: 'md',
    canHide: true,
    canMove: true,
    canResize: false,
    supportedDetailLevels: ['standard', 'detailed'],
    supportedHoverDetail: true,
    supportedClickDrilldown: true,
    dataSourceDescription: 'frameworkRequirements risk levels',
    emptyStateText: 'No risk gaps detected'
  },
  {
    id: 'alerts',
    title: 'Active Alerts Feed',
    description: 'Highlights critical alerts e.g. overdue checks, expired requirements.',
    defaultZone: 'lower-grid',
    defaultOrder: 7,
    defaultSize: 'md',
    canHide: true,
    canMove: true,
    canResize: false,
    supportedDetailLevels: ['standard', 'detailed'],
    supportedHoverDetail: true,
    supportedClickDrilldown: true,
    dataSourceDescription: 'stats, overdue asset checks, unclassified files',
    emptyStateText: 'No workspace alerts detected'
  }
];

type DashboardCustomization = {
  visibleKpis: string[];
  kpiOrder: string[];
  visiblePanels: string[];
  defaultViewMode: 'system' | 'list';
  defaultRailTab: 'focus' | 'upcoming' | 'action' | 'activity';
  density: 'comfortable' | 'compact' | 'executive';
  heroStyle: 'map' | 'core' | 'list';
  heroDetailLevel: 'minimal' | 'balanced' | 'full';
  visibleRightRailSections: string[];
  dataWindow: 'snapshot' | '7days' | '30days' | '90days';
  motionPreference: 'standard' | 'reduced';
  effectIntensity: 'subtle' | 'standard' | 'vibrant';
  heroAccent?: 'default' | 'cyan-emerald' | 'blue-amber' | 'violet-rose' | 'rainbow' | 'gold-amber' | 'neon-green' | 'sunset-orange' | 'slate-monochrome';
  heroLayoutPreset?: 'balanced-orbit' | 'wide-command-map' | 'compact-core' | 'operations-focus' | 'presentation-mode';
  heroCustomPositions?: Record<string, { x: number; y: number }>;
  rightRailOrder?: string[];
  lowerPanelsOrder?: string[];

  // Readability / window settings
  fontSize: 'sm' | 'standard' | 'lg' | 'xl';
  layoutDensity: 'compact' | 'comfortable' | 'spacious';
  paneSpacing: 'tight' | 'standard' | 'wide';
  cardRadius: 'sharp' | 'standard' | 'soft' | 'rounded';
  contrast: 'standard' | 'high';
  motion: 'minimal' | 'standard' | 'enhanced';
  dataDetailLevel: 'summary' | 'standard' | 'detailed';
  colourAccent: 'default' | 'cyan-emerald' | 'emerald-pulse' | 'violet-rose' | 'azure-amber' | 'blue-amber' | 'rainbow' | 'gold-amber' | 'neon-green' | 'sunset-orange' | 'slate-monochrome';
  tableOptions: {
    stickyHeaders: boolean;
    rowHeight: 'compact' | 'standard' | 'spacious';
    zebraRows: boolean;
    compactTable: boolean;
  };

  // Expanded Hero settings
  heroVisualMode: 'standard' | 'detailed' | 'showcase' | 'minimal';
  heroNodeDisplayLevel: 'icons-only' | 'icons-labels' | 'icons-labels-metrics' | 'full-detail';
  heroCentralOrbContent: 'overall-score' | 'score-status' | 'score-top-gap' | 'score-evidence-health' | 'score-action-count' | 'rotating-snapshot';
  showMinorNodes: boolean;
  visibleHeroNodes: string[];

  // Widget settings per panel
  widgetSettings: Record<string, {
    detailLevel: 'compact' | 'standard' | 'detailed';
    hoverDetailLevel: 'none' | 'summary' | 'full';
    clickBehaviour: 'open-drawer' | 'navigate' | 'filtered-view';
    showSecondaryMetrics?: boolean;
    showChart?: boolean;
    showRecentRecords?: boolean;
    showWarnings?: boolean;
  }>;
};

const DEFAULT_CUSTOMIZATION_SETTINGS: DashboardCustomization = {
  visibleKpis: ['health', 'requirements', 'evidence', 'training', 'tasks', 'asset'],
  kpiOrder: ['health', 'requirements', 'evidence', 'training', 'tasks', 'asset'],
  visiblePanels: ['trend', 'statusDonut', 'readinessGauge', 'trainingRing', 'assetCategory', 'riskGaps', 'alerts'],
  defaultViewMode: 'system',
  defaultRailTab: 'focus',
  density: 'comfortable',
  heroStyle: 'map',
  heroDetailLevel: 'balanced',
  visibleRightRailSections: ['snapshot', 'focus', 'upcoming', 'action', 'activity', 'expiring', 'upload-console'],
  dataWindow: 'snapshot',
  motionPreference: 'standard',
  effectIntensity: 'standard',
  heroAccent: 'default',
  heroLayoutPreset: 'balanced-orbit',
  heroCustomPositions: undefined,
  rightRailOrder: ['snapshot', 'focus-card', 'expiring', 'upload-console'],
  lowerPanelsOrder: ['quickActions', 'trend', 'statusDonut', 'readinessGauge', 'trainingRing', 'assetCategory', 'riskGaps', 'alerts'],

  // Readability
  fontSize: 'standard',
  layoutDensity: 'comfortable',
  paneSpacing: 'standard',
  cardRadius: 'standard',
  contrast: 'standard',
  motion: 'standard',
  dataDetailLevel: 'standard',
  colourAccent: 'default',
  tableOptions: {
    stickyHeaders: true,
    rowHeight: 'standard',
    zebraRows: false,
    compactTable: false
  },

  // Hero presets
  heroVisualMode: 'standard',
  heroNodeDisplayLevel: 'icons-labels-metrics',
  heroCentralOrbContent: 'overall-score',
  showMinorNodes: true,
  visibleHeroNodes: ['requirements', 'vault', 'competencies', 'matrix', 'audit-packs', 'reports'],

  // Default widget settings
  widgetSettings: {}
};

const WidgetWrapper = ({
  id,
  children,
  isEditing,
  isVisible,
  onMoveUp,
  onMoveDown,
  onToggleLocation,
  onHide,
  onShow,
  currentCustomization,
  setTempCustomization
}: {
  id: string;
  children: React.ReactNode;
  isEditing: boolean;
  isVisible: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onToggleLocation?: () => void;
  onHide?: () => void;
  onShow?: () => void;
  currentCustomization: DashboardCustomization;
  setTempCustomization: React.Dispatch<React.SetStateAction<DashboardCustomization | null>>;
}) => {
  const isKpi = ['health', 'requirements', 'evidence', 'training', 'tasks', 'asset'].includes(id);
  const widgetName = DASHBOARD_WIDGET_REGISTRY.find(w => w.id === id)?.title || id;

  if (!isEditing) {
    if (!isVisible) return null;
    return <div className="w-full h-full">{children}</div>;
  }

  return (
    <div className={`relative w-full h-full group ${!isVisible ? 'opacity-40 hover:opacity-75' : ''} transition-opacity duration-300`}>
      <div className="pointer-events-none select-none filter blur-[0.5px] w-full h-full">
        {children}
      </div>

      <div className="absolute inset-0 bg-indigo-500/5 border-2 border-dashed border-indigo-500/80 rounded-2xl z-10 flex flex-col justify-between p-2 pointer-events-auto">
        <div className="flex justify-between items-start bg-indigo-950/95 border border-indigo-500/30 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1.5 rounded-lg shadow-md w-full">
          <span className="truncate max-w-[120px]">{widgetName}</span>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {!isVisible ? (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onShow?.(); }}
                className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 rounded text-white cursor-pointer flex items-center gap-1 font-bold text-[8px]"
                title="Show Widget"
              >
                <Eye className="w-2.5 h-2.5" /> Show
              </button>
            ) : (
              <>
                {!isKpi && onToggleLocation && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleLocation(); }}
                    className="p-0.5 hover:bg-white/20 rounded text-white cursor-pointer"
                    title="Move between Grid and Rail"
                  >
                    <Move className="w-2.5 h-2.5" />
                  </button>
                )}
                {onMoveUp && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveUp(); }}
                    className="p-0.5 hover:bg-white/20 rounded text-white cursor-pointer"
                    title="Move Up/Left"
                  >
                    <ArrowUp className="w-2.5 h-2.5" />
                  </button>
                )}
                {onMoveDown && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveDown(); }}
                    className="p-0.5 hover:bg-white/20 rounded text-white cursor-pointer"
                    title="Move Down/Right"
                  >
                    <ArrowDown className="w-2.5 h-2.5" />
                  </button>
                )}
                {onHide && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onHide(); }}
                    className="p-0.5 hover:bg-white/20 rounded text-white cursor-pointer"
                    title="Hide Pane"
                  >
                    <EyeOff className="w-2.5 h-2.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {isVisible && (
          <div className="flex justify-between items-center mt-auto bg-card border border-indigo-500/20 p-1 rounded-lg shadow-sm w-full">
            <span className="text-[7.5px] font-black text-muted-foreground uppercase tracking-wider">Detail Level:</span>
            <div className="flex items-center gap-0.5">
              {['compact', 'standard', 'detailed'].map((lvl) => {
                const currentLvl = currentCustomization.widgetSettings?.[id]?.detailLevel || 'standard';
                return (
                  <button
                    key={lvl}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const ws = { ...currentCustomization.widgetSettings };
                      ws[id] = {
                        ...(ws[id] || { hoverDetailLevel: 'summary', clickBehaviour: 'open-drawer' }),
                        detailLevel: lvl as any
                      };
                      setTempCustomization({ ...currentCustomization, widgetSettings: ws });
                    }}
                    className={`px-1 py-0.5 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                      currentLvl === lvl
                        ? 'bg-indigo-500 text-white shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {lvl.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const getColSpan = (size?: 'sm' | 'md' | 'lg' | 'full') => {
  if (size === 'full') return 'lg:col-span-12 md:col-span-12 col-span-1';
  if (size === 'lg') return 'lg:col-span-4 md:col-span-6 col-span-1';
  return 'lg:col-span-3 md:col-span-6 col-span-1';
};

export default function DashboardPage() {
  const {
    organization,
    theme,
    user,
    readinessReport,
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
    linkDocumentToRequirement,
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
    assetCategories,
    linkDocumentToCompetencyRecord,
    linkAssetCheckEvidence
  } = useApp();
  const readinessScore = readinessReport.overallScore;
  const readinessDisplay = readinessScore === null ? 'N/A' : `${readinessScore}%`;

  const [customization, setCustomization] = useState<DashboardCustomization>(() => {
    if (typeof window === 'undefined') return DEFAULT_CUSTOMIZATION_SETTINGS;
    try {
      const key = `vygilence_dashboard_customization_${user?.id || 'anon'}_${organization?.id || 'default'}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          visibleKpis: parsed.visibleKpis || DEFAULT_CUSTOMIZATION_SETTINGS.visibleKpis,
          kpiOrder: parsed.kpiOrder || DEFAULT_CUSTOMIZATION_SETTINGS.kpiOrder,
          visiblePanels: parsed.visiblePanels || DEFAULT_CUSTOMIZATION_SETTINGS.visiblePanels,
          defaultViewMode: parsed.defaultViewMode || DEFAULT_CUSTOMIZATION_SETTINGS.defaultViewMode,
          defaultRailTab: parsed.defaultRailTab || DEFAULT_CUSTOMIZATION_SETTINGS.defaultRailTab,
          density: parsed.density || DEFAULT_CUSTOMIZATION_SETTINGS.density,
          heroStyle: parsed.heroStyle || DEFAULT_CUSTOMIZATION_SETTINGS.heroStyle,
          heroDetailLevel: parsed.heroDetailLevel || DEFAULT_CUSTOMIZATION_SETTINGS.heroDetailLevel,
          visibleRightRailSections: parsed.visibleRightRailSections || DEFAULT_CUSTOMIZATION_SETTINGS.visibleRightRailSections,
          dataWindow: parsed.dataWindow || DEFAULT_CUSTOMIZATION_SETTINGS.dataWindow,
          motionPreference: parsed.motionPreference || DEFAULT_CUSTOMIZATION_SETTINGS.motionPreference,
          effectIntensity: parsed.effectIntensity || DEFAULT_CUSTOMIZATION_SETTINGS.effectIntensity,
          heroAccent: parsed.heroAccent || 'default',
          heroLayoutPreset: parsed.heroLayoutPreset || 'balanced-orbit',
          heroCustomPositions: parsed.heroCustomPositions,
          rightRailOrder: parsed.rightRailOrder || DEFAULT_CUSTOMIZATION_SETTINGS.rightRailOrder,
          lowerPanelsOrder: parsed.lowerPanelsOrder || DEFAULT_CUSTOMIZATION_SETTINGS.lowerPanelsOrder,

          // Readability
          fontSize: parsed.fontSize || DEFAULT_CUSTOMIZATION_SETTINGS.fontSize,
          layoutDensity: parsed.layoutDensity || DEFAULT_CUSTOMIZATION_SETTINGS.layoutDensity,
          paneSpacing: parsed.paneSpacing || DEFAULT_CUSTOMIZATION_SETTINGS.paneSpacing,
          cardRadius: parsed.cardRadius || DEFAULT_CUSTOMIZATION_SETTINGS.cardRadius,
          contrast: parsed.contrast || DEFAULT_CUSTOMIZATION_SETTINGS.contrast,
          motion: parsed.motion || DEFAULT_CUSTOMIZATION_SETTINGS.motion,
          dataDetailLevel: parsed.dataDetailLevel || DEFAULT_CUSTOMIZATION_SETTINGS.dataDetailLevel,
          colourAccent: parsed.colourAccent || DEFAULT_CUSTOMIZATION_SETTINGS.colourAccent,
          tableOptions: {
            stickyHeaders: parsed.tableOptions?.stickyHeaders ?? DEFAULT_CUSTOMIZATION_SETTINGS.tableOptions.stickyHeaders,
            rowHeight: parsed.tableOptions?.rowHeight ?? DEFAULT_CUSTOMIZATION_SETTINGS.tableOptions.rowHeight,
            zebraRows: parsed.tableOptions?.zebraRows ?? DEFAULT_CUSTOMIZATION_SETTINGS.tableOptions.zebraRows,
            compactTable: parsed.tableOptions?.compactTable ?? DEFAULT_CUSTOMIZATION_SETTINGS.tableOptions.compactTable,
          },

          // Expanded Hero Settings
          heroVisualMode: parsed.heroVisualMode || DEFAULT_CUSTOMIZATION_SETTINGS.heroVisualMode,
          heroNodeDisplayLevel: parsed.heroNodeDisplayLevel || DEFAULT_CUSTOMIZATION_SETTINGS.heroNodeDisplayLevel,
          heroCentralOrbContent: parsed.heroCentralOrbContent || DEFAULT_CUSTOMIZATION_SETTINGS.heroCentralOrbContent,
          showMinorNodes: parsed.showMinorNodes ?? DEFAULT_CUSTOMIZATION_SETTINGS.showMinorNodes,
          visibleHeroNodes: parsed.visibleHeroNodes || DEFAULT_CUSTOMIZATION_SETTINGS.visibleHeroNodes,

          // Widget Settings
          widgetSettings: parsed.widgetSettings || DEFAULT_CUSTOMIZATION_SETTINGS.widgetSettings
        };
      }
    } catch {}
    return DEFAULT_CUSTOMIZATION_SETTINGS;
  });

  const [viewMode, setViewMode] = useState<ViewMode>(
    customization.heroStyle === 'list' ? 'list' : customization.defaultViewMode
  );

  const [activeRailTab, setActiveRailTab] = useState<'focus' | 'upcoming' | 'action' | 'activity'>(
    customization.defaultRailTab
  );
  const [prevCustomization, setPrevCustomization] = useState<DashboardCustomization | null>(null);
  const [clickedItemId, setClickedItemId] = useState<string | null>(null);

  const handleItemClick = (id: string, action?: () => void) => {
    setClickedItemId(id);
    setTimeout(() => setClickedItemId(null), 150);
    if (action) action();
  };

  // Edit Dashboard Mode state
  const [isEditingDashboard, setIsEditingDashboard] = useState(false);
  const [tempCustomization, setTempCustomization] = useState<DashboardCustomization | null>(null);

  const currentCustomization = useMemo<DashboardCustomization>(() => {
    if (isEditingDashboard && tempCustomization) {
      return tempCustomization;
    }
    return customization;
  }, [isEditingDashboard, tempCustomization, customization]);

  const handleMoveWidget = useCallback((widgetId: string, direction: 'up' | 'down') => {
    if (!tempCustomization) return;
    const isKpi = ['health', 'requirements', 'evidence', 'training', 'tasks', 'asset'].includes(widgetId);
    if (isKpi) {
      const orderArray = [...(tempCustomization.kpiOrder || [])];
      const index = orderArray.indexOf(widgetId);
      if (index === -1) return;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= orderArray.length) return;
      const temp = orderArray[index];
      orderArray[index] = orderArray[targetIndex];
      orderArray[targetIndex] = temp;
      setTempCustomization({ ...tempCustomization, kpiOrder: orderArray });
      return;
    }

    const inRail = tempCustomization.rightRailOrder?.includes(widgetId);
    const orderArray = inRail
      ? [...(tempCustomization.rightRailOrder || [])]
      : [...(tempCustomization.lowerPanelsOrder || [])];

    const index = orderArray.indexOf(widgetId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderArray.length) return;

    const temp = orderArray[index];
    orderArray[index] = orderArray[targetIndex];
    orderArray[targetIndex] = temp;

    if (inRail) {
      setTempCustomization({ ...tempCustomization, rightRailOrder: orderArray });
    } else {
      setTempCustomization({ ...tempCustomization, lowerPanelsOrder: orderArray });
    }
  }, [tempCustomization]);

  const handleToggleWidgetLocation = useCallback((widgetId: string) => {
    if (!tempCustomization) return;
    let rightOrder = [...(tempCustomization.rightRailOrder || [])];
    let lowerOrder = [...(tempCustomization.lowerPanelsOrder || [])];

    if (rightOrder.includes(widgetId)) {
      // Move from rail to lower area
      rightOrder = rightOrder.filter(id => id !== widgetId);
      lowerOrder.push(widgetId);
    } else if (lowerOrder.includes(widgetId)) {
      // Move from lower area to rail
      lowerOrder = lowerOrder.filter(id => id !== widgetId);
      rightOrder.push(widgetId);
    }

    setTempCustomization({
      ...tempCustomization,
      rightRailOrder: rightOrder,
      lowerPanelsOrder: lowerOrder
    });
  }, [tempCustomization]);

  const handleHideWidget = useCallback((widgetId: string) => {
    if (!tempCustomization) return;
    const isKpi = ['health', 'requirements', 'evidence', 'training', 'tasks', 'asset'].includes(widgetId);
    if (isKpi) {
      const newVisible = tempCustomization.visibleKpis.filter(k => k !== widgetId);
      setTempCustomization({ ...tempCustomization, visibleKpis: newVisible });
      return;
    }

    if (['snapshot', 'focus-card', 'expiring', 'upload-console'].includes(widgetId)) {
      if (widgetId === 'focus-card') {
        const newSections = tempCustomization.visibleRightRailSections.filter(
          id => !['focus', 'upcoming', 'action', 'activity'].includes(id)
        );
        setTempCustomization({ ...tempCustomization, visibleRightRailSections: newSections });
      } else {
        const newSections = tempCustomization.visibleRightRailSections.filter(id => id !== widgetId);
        setTempCustomization({ ...tempCustomization, visibleRightRailSections: newSections });
      }
    } else {
      const newPanels = tempCustomization.visiblePanels.filter(id => id !== widgetId);
      setTempCustomization({ ...tempCustomization, visiblePanels: newPanels });
    }
  }, [tempCustomization]);

  const handleShowWidget = useCallback((widgetId: string) => {
    if (!tempCustomization) return;
    const isKpi = ['health', 'requirements', 'evidence', 'training', 'tasks', 'asset'].includes(widgetId);
    if (isKpi) {
      if (!tempCustomization.visibleKpis.includes(widgetId)) {
        setTempCustomization({ ...tempCustomization, visibleKpis: [...tempCustomization.visibleKpis, widgetId] });
      }
      return;
    }

    if (['snapshot', 'focus-card', 'expiring', 'upload-console'].includes(widgetId)) {
      if (widgetId === 'focus-card') {
        const newSections = Array.from(new Set([...tempCustomization.visibleRightRailSections, 'focus', 'upcoming', 'action', 'activity']));
        setTempCustomization({ ...tempCustomization, visibleRightRailSections: newSections });
      } else {
        const newSections = Array.from(new Set([...tempCustomization.visibleRightRailSections, widgetId]));
        setTempCustomization({ ...tempCustomization, visibleRightRailSections: newSections });
      }
    } else {
      const newPanels = Array.from(new Set([...tempCustomization.visiblePanels, widgetId]));
      setTempCustomization({ ...tempCustomization, visiblePanels: newPanels });
    }
  }, [tempCustomization]);

  const isWidgetVisible = useCallback((widgetId: string) => {
    const cust = tempCustomization || customization;
    const isKpi = ['health', 'requirements', 'evidence', 'training', 'tasks', 'asset'].includes(widgetId);
    if (isKpi) {
      return cust.visibleKpis.includes(widgetId);
    }
    if (widgetId === 'focus-card') {
      return ['focus', 'upcoming', 'action', 'activity'].some(id => cust.visibleRightRailSections.includes(id));
    }
    if (widgetId === 'upload-console') {
      return cust.visibleRightRailSections.includes('upload-console');
    }
    if (['snapshot', 'expiring'].includes(widgetId)) {
      return cust.visibleRightRailSections.includes(widgetId);
    }
    if (widgetId === 'quickActions') {
      return cust.visiblePanels.includes('quickActions') ?? true;
    }
    return cust.visiblePanels.includes(widgetId);
  }, [tempCustomization, customization]);

  const isInRightRail = useCallback((widgetId: string) => {
    const cust = tempCustomization || customization;
    return cust.rightRailOrder?.includes(widgetId) ?? false;
  }, [tempCustomization, customization]);

  const densityStyles = useMemo(() => {
    return {
      comfortable: {
        spacing: 'space-y-8',
        cardPadding: 'p-6',
        gridGap: 'gap-6',
        kpiPadding: 'p-4.5',
        headingSize: 'text-2xl',
        subheadingSize: 'text-xs',
        panelSpacing: 'space-y-5',
        outerGridGap: 'gap-6'
      },
      compact: {
        spacing: 'space-y-4',
        cardPadding: 'p-4',
        gridGap: 'gap-4',
        kpiPadding: 'p-3',
        headingSize: 'text-xl',
        subheadingSize: 'text-[11px]',
        panelSpacing: 'space-y-3',
        outerGridGap: 'gap-4'
      },
      executive: {
        spacing: 'space-y-3',
        cardPadding: 'p-3',
        gridGap: 'gap-3',
        kpiPadding: 'p-2.5',
        headingSize: 'text-lg',
        subheadingSize: 'text-[10px]',
        panelSpacing: 'space-y-2',
        outerGridGap: 'gap-3'
      }
    }[customization.density || 'comfortable'];
  }, [customization.density]);

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
  const greyRequirementCount = activeRequirements.filter(requirement => requirement.status === 'GREY').length;
  const reportViewCount = user?.role === 'Owner' || user?.role === 'Admin' ? 11 : 9;
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
    const isPrivileged = user?.role === 'Owner' || user?.role === 'Admin';
    if (isPrivileged) {
      return (auditLogs || []).slice(0, 5);
    }
    return (auditLogs || [])
      .filter(log => {
        const act = (log.action || '').toLowerCase();
        const det = (log.details || '').toLowerCase();
        return !act.includes('delete') &&
               !act.includes('organization') &&
               !act.includes('billing') &&
               !act.includes('invite') &&
               !act.includes('role') &&
               !act.includes('key') &&
               !det.includes('delete') &&
               !det.includes('organization') &&
               !det.includes('billing') &&
               !det.includes('invite') &&
               !det.includes('role') &&
               !det.includes('key');
      })
      .slice(0, 5);
  }, [auditLogs, user?.role]);

  // Timeline / Radar Buckets
  const radarBuckets = useMemo(() => {
    const addDays = (d: Date, days: number) => {
      const r = new Date(d);
      r.setDate(r.getDate() + days);
      return r;
    };
    const daysLimit =
      customization.dataWindow === '7days' ? 7 :
      customization.dataWindow === '90days' ? 90 :
      customization.dataWindow === 'snapshot' ? 0 : 30;
    const limitDate = addDays(today, daysLimit);
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
        link: `/dashboard/vault?id=${document.id}`
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
        link: `/dashboard/competencies?person=${record.person_id}&competency=${record.competency_type_id}`
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
        link: `/dashboard/requirements?selectedAction=${action.id}`,
        action
      });
    });

    return items
      .filter(item => {
        const d = new Date(item.dueDate);
        return d >= today && d <= limitDate;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [frameworkRequirements, documents, competencyRecords, competencyTypes, people, actions, today, customization.dataWindow]);

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
      list.push("No current priority suggestions were identified from the available workspace records.");
    }
    return list;
  }, [overdueAssetChecks, stats, unclassifiedDocs, overdueActionsCount]);

  // Unified list of all tasks and expiries (requirements, asset checks, expiring training/documents)
  const allTasksAndExpiries = useMemo(() => {
    const combined = overdueAndUpcoming.map(item => ({
      id: item.id,
      isOverdue: item.isOverdue,
      link: item.link || '#',
      requirement: {
        id: item.requirement.id,
        title: item.requirement.title,
        next_due_date: item.requirement.next_due_date,
        category: item.requirement.category
      }
    }));

    radarBuckets.forEach(radarItem => {
      const exists = combined.some(item =>
        item.id === radarItem.id ||
        item.requirement.id === radarItem.id.replace(/^(requirement|evidence|competency|action)-/, '')
      );
      if (!exists) {
        combined.push({
          id: radarItem.id,
          isOverdue: false,
          link: radarItem.link || '#',
          requirement: {
            id: radarItem.id,
            title: radarItem.title,
            next_due_date: radarItem.dueDate,
            category: radarItem.type
          }
        });
      }
    });

    return combined.sort((a, b) => {
      const dateA = a.requirement.next_due_date ? new Date(a.requirement.next_due_date).getTime() : Infinity;
      const dateB = b.requirement.next_due_date ? new Date(b.requirement.next_due_date).getTime() : Infinity;
      return dateA - dateB;
    });
  }, [overdueAndUpcoming, radarBuckets]);

  const next7DaysItems = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return allTasksAndExpiries.filter(item => {
      if (item.isOverdue) return false;
      if (!item.requirement.next_due_date) return false;
      const dueDate = new Date(item.requirement.next_due_date);
      return dueDate <= d && dueDate >= today;
    });
  }, [allTasksAndExpiries, today]);

  const expiringSoonItems = useMemo(() => {
    const d30 = new Date(today);
    d30.setDate(d30.getDate() + 30);
    return allTasksAndExpiries.filter(item => {
      if (item.isOverdue) return false;
      if (!item.requirement.next_due_date) return false;
      const dueDate = new Date(item.requirement.next_due_date);
      return dueDate <= d30 && dueDate >= today;
    });
  }, [allTasksAndExpiries, today]);

  const needsActionItems = useMemo(() => {
    return allTasksAndExpiries.filter(item => item.isOverdue || item.requirement.category === 'Action');
  }, [allTasksAndExpiries]);

  const getReadinessLabel = useCallback((score: number | null) => {
    if (score === null) return 'N/A';
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 35) return 'Needs Attention';
    return 'Critical';
  }, []);

  const readinessLabel = useMemo(() => getReadinessLabel(readinessScore), [readinessScore, getReadinessLabel]);

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
        badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
        metric: `${stats.compliantCount}/${stats.activeRequirements} Compliant`
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
        badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
        metric: `${competencySummary.compliancePercent}% Compliant`
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
        badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
        metric: `${classifiedDocsCount}/${documents.length} Classified`
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
        badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
        metric: `${compliantAssetChecks}/${totalAssetChecks} Compliant`
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
        badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
        metric: `${auditPacks.filter(p => p.status === 'Ready').length}/${auditPacks.length} Ready`
      },
      {
        id: 'reports',
        name: 'Reports',
        icon: <BarChart3 className="w-5 h-5" />,
        count: reportViewCount,
        warnings: 0,
        path: '/dashboard/reports',
        pos: 'left-[43.75%] top-[85%] -translate-x-6 -translate-y-6',
        color: 'border-border text-foreground',
        description: 'Performance overview analytics',
        actionLabel: 'Open Analytics',
        badge: 0,
        badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
        metric: `${reportViewCount} Views Available`
      }
    ];
  }, [stats, people, competencyRecords, documents, unclassifiedDocs, assets, overdueAssetChecks, auditPacks, reportViewCount]);

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

  const router = useRouter();

  // Toast state
  const [toast, setToast] = useState<ToastState>(null);

  // Customization state
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);

  const [hoveredInsight, setHoveredInsight] = useState<{
    id: string;
    title: string;
    explanation: string;
    count: string | number;
    countLabel?: string;
    statusBreakdown?: Array<{
      label: string;
      count: number;
      color: string;
      records: Array<{ name: string; info: string; status?: string; link: string }>;
    }>;
    records?: Array<{ name: string; info: string; status?: string; link: string }>;
    link?: string;
    linkLabel?: string;
    secondaryLink?: string;
    secondaryLinkLabel?: string;
    suggestedAction?: string;
    x: number;
    y: number;
  } | null>(null);

  const [activeInsightDrawer, setActiveInsightDrawer] = useState<{
    id: string;
    title: string;
    explanation: string;
    count: string | number;
    countLabel?: string;
    statusBreakdown?: Array<{
      label: string;
      count: number;
      color: string;
      records: Array<{ name: string; info: string; status?: string; link: string }>;
    }>;
    records: Array<{ name: string; info: string; status?: string; link: string }>;
    link?: string;
    linkLabel?: string;
    secondaryLink?: string;
    secondaryLinkLabel?: string;
    suggestedAction?: string;
  } | null>(null);

  const [hoveredTrendPoint, setHoveredTrendPoint] = useState<{
    label: string;
    score: number;
    source: string;
    x: number;
    y: number;
  } | null>(null);

  const [modalCustomization, setModalCustomization] = useState(customization);
  const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [expandedStatusLabel, setExpandedStatusLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!hoveredInsight) {
      setExpandedStatusLabel(null);
    }
  }, [hoveredInsight]);

  // Drag over states for smart evidence dropzone
  const [isDragOverActive, setIsDragOverActive] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[] | null>(null);
  const [isDropContextModalOpen, setIsDropContextModalOpen] = useState(false);
  const [selectedContextType, setSelectedContextType] = useState<'general' | 'requirement' | 'action' | 'asset' | 'competency'>('general');
  const [selectedContextId, setSelectedContextId] = useState('');
  const [isUploadingDropped, setIsUploadingDropped] = useState(false);
  const [uploadProgressMessage, setUploadProgressMessage] = useState('');

  const dragCounter = React.useRef(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current += 1;
      if (dragCounter.current === 1) {
        setIsDragOverActive(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current -= 1;
      if (dragCounter.current === 0) {
        setIsDragOverActive(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragOverActive(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        setDroppedFiles(Array.from(e.dataTransfer.files));
        setIsDropContextModalOpen(true);
        setSelectedContextType('general');
        setSelectedContextId('');
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setHoveredInsight(null);
      setActiveInsightDrawer(null);
      setIsCustomizationOpen(false);
      setIsUploadModalOpen(false);
      setActiveQuickActionModal(null);
      setIsDropContextModalOpen(false);
      setDroppedFiles(null);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const getInsightData = useCallback((id: string) => {
    const mapRequirement = (r: typeof frameworkRequirements[0]) => ({
      name: r.title,
      info: `${r.category} | Risk: ${r.risk_level}`,
      status: r.status,
      link: `/dashboard/requirements?requirementId=${r.id}`
    });

    const mapDocument = (d: typeof documents[0]) => ({
      name: d.title,
      info: d.expiry_date ? `Expires: ${d.expiry_date}` : `Classified | ${d.category}`,
      status: d.expiry_date && new Date(d.expiry_date) < today ? "RED" : "GREEN",
      link: `/dashboard/vault?id=${d.id}`
    });

    const mapCompRecord = (r: typeof competencyRecords[0]) => {
      const p = people.find(item => item.id === r.person_id);
      const ct = competencyTypes.find(item => item.id === r.competency_type_id);
      return {
        name: p?.display_name || 'Teammate',
        info: `${ct?.title || 'Training'} | ${r.status}`,
        status: r.status === 'Expired' ? 'RED' : r.status === 'Valid' ? 'GREEN' : 'AMBER',
        link: `/dashboard/competencies?person=${p?.id}&competency=${ct?.id}`
      };
    };

    const isActionOverdue = (a: typeof actions[0]) => {
      const dueDate = a.target_due_date || a.due_date;
      if (!dueDate) return false;
      return new Date(dueDate) < today;
    };

    const mapAction = (a: typeof actions[0]) => {
      const isOver = isActionOverdue(a);
      return {
        name: a.title,
        info: `Owner: ${a.owner || 'Unassigned'} | Due: ${a.target_due_date || a.due_date || 'No Date'}`,
        status: isOver ? 'RED' : 'AMBER',
        link: `/dashboard/requirements?filter=actions`
      };
    };

    const mapAssetAssignment = (asg: typeof assetCheckAssignments[0]) => {
      const asset = (assets || []).find(a => a.id === asg.asset_id);
      const checkType = (assetCheckTypes || []).find(ct => ct.id === asg.asset_check_type_id);
      const status = getAssignmentStatus(asg.id);
      return {
        name: `${checkType?.title || 'Check'} - ${asset?.name || 'Asset'}`,
        info: `Asset Check | ${status}`,
        status: status === 'Compliant' ? 'GREEN' : status === 'Expired' ? 'RED' : 'AMBER',
        link: `/dashboard/matrix?asset=${asset?.id}`
      };
    };

    switch (id) {
      case 'health':
        return {
          id: 'health',
          title: "Readiness Health",
          explanation: readinessScore === null
            ? "No assessed active requirements are currently included in the readiness calculation."
            : "The readiness score is calculated from assessed active requirements and their linked evidence, reviews, actions, and mapped competency records. Asset gaps are shown as workspace context.",
          count: readinessDisplay,
          countLabel: "Readiness Score",
          statusBreakdown: [
            { label: "Compliant", count: stats.compliantCount, color: "bg-emerald-500", records: activeRequirements.filter(r => r.status === 'GREEN').slice(0, 5).map(mapRequirement) },
            { label: "At Risk", count: stats.expiringSoonCount, color: "bg-amber-500", records: activeRequirements.filter(r => r.status === 'AMBER').slice(0, 5).map(mapRequirement) },
            { label: "Needs Attention", count: stats.expiredCount, color: "bg-rose-500", records: activeRequirements.filter(r => r.status === 'RED').slice(0, 5).map(mapRequirement) },
            { label: "Not Assessed", count: greyRequirementCount, color: "bg-zinc-500", records: activeRequirements.filter(r => !r.status || r.status === 'GREY').slice(0, 5).map(mapRequirement) }
          ],
          records: [
            ...frameworkRequirements.filter(r => r.status === 'RED' || r.status === 'AMBER').slice(0, 3).map(mapRequirement),
            ...overdueAssetChecks.slice(0, 2).map(c => ({
              name: c.requirement.title,
              info: `Asset Check | Overdue`,
              status: "RED",
              link: c.link
            }))
          ],
          link: "/dashboard/reports?tab=executive",
          linkLabel: "Open Reports Overview"
        };
      case 'requirements':
        const reqRecords = activeRequirements.filter(r => r.status === 'RED' || r.status === 'AMBER').slice(0, 3).map(mapRequirement);
        if (reqRecords.length === 0) {
          reqRecords.push({
            name: "All requirements current",
            info: "No overdue goals or missing evidence requirements.",
            status: "GREEN",
            link: "/dashboard/requirements"
          });
        }
        return {
          id: 'requirements',
          title: "Framework Requirements",
          explanation: `Total active goals: ${activeRequirements.length}. Active requirements mapped to compliance metrics. Gaps represent objectives with expired evidence or overdue reviews.`,
          count: `${stats.compliantCount} / ${stats.activeRequirements}`,
          countLabel: "Compliant Objectives",
          statusBreakdown: [
            { label: "Compliant", count: stats.compliantCount, color: "bg-emerald-500", records: activeRequirements.filter(r => r.status === 'GREEN').slice(0, 5).map(mapRequirement) },
            { label: "At Risk (Amber)", count: stats.expiringSoonCount, color: "bg-amber-500", records: activeRequirements.filter(r => r.status === 'AMBER').slice(0, 5).map(mapRequirement) },
            { label: "Needs Attention (Red)", count: stats.expiredCount, color: "bg-rose-500", records: activeRequirements.filter(r => r.status === 'RED').slice(0, 5).map(mapRequirement) },
            { label: "Not Assessed (Grey)", count: greyRequirementCount, color: "bg-zinc-500", records: activeRequirements.filter(r => !r.status || r.status === 'GREY').slice(0, 5).map(mapRequirement) }
          ],
          records: reqRecords,
          link: "/dashboard/requirements?status=Attention",
          linkLabel: "View Attention Requirements"
        };
      case 'evidence':
      case 'vault':
        const expiredDocsCount = documents.filter(d => d.expiry_date && new Date(d.expiry_date) < today).length;
        const expiringDocsCount = documents.filter(d => {
          if (!d.expiry_date) return false;
          const exp = new Date(d.expiry_date);
          const limit = new Date(today);
          limit.setDate(limit.getDate() + 30);
          return exp >= today && exp <= limit;
        }).length;
        const vaultRecords = [
          ...unclassifiedDocs.slice(0, 2).map(mapDocument),
          ...documents.filter(d => d.expiry_date && new Date(d.expiry_date as string) < today).slice(0, 2).map(mapDocument)
        ];
        if (vaultRecords.length === 0) {
          vaultRecords.push({
            name: "Evidence records fully verified",
            info: "No unclassified or expired files found.",
            status: "GREEN",
            link: "/dashboard/vault"
          });
        }
        return {
          id: 'vault',
          title: "Evidence Vault Coverage",
          explanation: `Total documents: ${documents.length}. Shows files with classified tags vs raw incoming uploads. Expired evidence triggers gaps in related objectives.`,
          count: `${classifiedDocsCount} / ${documents.length}`,
          countLabel: "Classified Documents",
          statusBreakdown: [
            { label: "Classified & Linked", count: classifiedDocsCount, color: "bg-indigo-500", records: documents.filter(d => d.status !== 'Unclassified').slice(0, 5).map(mapDocument) },
            { label: "Unclassified Raw Uploads", count: unclassifiedDocs.length, color: "bg-amber-500", records: unclassifiedDocs.slice(0, 5).map(mapDocument) },
            { label: "Expired Evidence Documents", count: expiredDocsCount, color: "bg-rose-500", records: documents.filter(d => d.expiry_date && new Date(d.expiry_date) < today).slice(0, 5).map(mapDocument) },
            { label: "Expiring Within 30 Days", count: expiringDocsCount, color: "bg-amber-400", records: documents.filter(d => { if (!d.expiry_date) return false; const exp = new Date(d.expiry_date); const limit = new Date(today); limit.setDate(limit.getDate() + 30); return exp >= today && exp <= limit; }).slice(0, 5).map(mapDocument) }
          ],
          records: vaultRecords,
          link: "/dashboard/vault?status=Unclassified",
          linkLabel: "Open Unclassified Vault Records"
        };
      case 'training':
      case 'competencies':
        const compExpired = competencyRecords.filter(r => r.status === 'Expired').length;
        const compMissing = competencyRecords.filter(r => r.status === 'Missing').length;
        const compRecords = competencyRecords.filter(r => r.status === 'Expired' || r.status === 'Missing').slice(0, 3).map(mapCompRecord);
        if (compRecords.length === 0) {
          compRecords.push({
            name: "Personnel training up-to-date",
            info: "All team members hold valid competency certificates.",
            status: "GREEN",
            link: "/dashboard/competencies"
          });
        }
        return {
          id: 'competencies',
          title: "Teammate Training Matrix",
          explanation: `Total personnel tracked: ${people.length}. Measures compliance rate of training, licenses, and professional requirements assigned to team members.`,
          count: `${competencySummary.compliancePercent}%`,
          countLabel: "Training Compliance",
          statusBreakdown: [
            { label: "Valid Qualifications", count: competencySummary.valid, color: "bg-emerald-500", records: competencyRecords.filter(r => r.status === 'Valid').slice(0, 5).map(mapCompRecord) },
            { label: "Expired Certifications", count: compExpired, color: "bg-rose-500", records: competencyRecords.filter(r => r.status === 'Expired').slice(0, 5).map(mapCompRecord) },
            { label: "Missing Records", count: compMissing, color: "bg-amber-500", records: competencyRecords.filter(r => r.status === 'Missing').slice(0, 5).map(mapCompRecord) }
          ],
          records: compRecords,
          link: "/dashboard/competencies?status=Expired",
          linkLabel: "View Expired Competencies"
        };
      case 'tasks':
      case 'actions':
        return {
          id: 'actions',
          title: "Action Tasks & Remediation",
          explanation: `Active actions: ${activeActionsCount}. Corrective task items raised during self-audits to close identified framework gaps.`,
          count: activeActionsCount,
          countLabel: "Open Action Tasks",
          statusBreakdown: [
            { label: "Overdue Actions", count: overdueActionsCount, color: "bg-rose-500", records: actions.filter(a => (a.status === 'Open' || a.status === 'In Progress') && isActionOverdue(a)).slice(0, 5).map(mapAction) },
            { label: "Active Actions", count: activeActionsCount - overdueActionsCount, color: "bg-indigo-500", records: actions.filter(a => (a.status === 'Open' || a.status === 'In Progress') && !isActionOverdue(a)).slice(0, 5).map(mapAction) }
          ],
          records: actions.filter(a => a.status === 'Open' || a.status === 'In Progress').slice(0, 3).map(mapAction),
          link: "/dashboard/requirements?filter=actions",
          linkLabel: "View Actions Registry"
        };
      case 'asset':
      case 'matrix':
        const missingAssetChecks = assetMatrixCells.filter(cell => cell.status === 'missing').length;
        const expiredAssetChecks = assetMatrixCells.filter(cell => cell.status === 'expired' || cell.status === 'overdue').length;
        const dueSoonAssetChecks = assetMatrixCells.filter(cell => cell.status === 'due_soon').length;
        const matrixRecords = overdueAssetChecks.slice(0, 3).map(c => ({
          name: c.requirement.title,
          info: `Asset Check | Overdue`,
          status: "RED",
          link: c.link
        }));
        if (matrixRecords.length === 0) {
          matrixRecords.push({
            name: "Asset checks current",
            info: "No overdue maintenance checks or logs.",
            status: "GREEN",
            link: "/dashboard/matrix"
          });
        }
        return {
          id: 'matrix',
          title: "Asset Assurance Health",
          explanation: `Total assets: ${assets.length}. Monitors vehicle checks, equipment certifications, and facility maintenance timelines.`,
          count: `${compliantAssetChecks} / ${totalAssetChecks}`,
          countLabel: "Compliant Asset Checks",
          statusBreakdown: [
            { label: "Compliant checks", count: compliantAssetChecks, color: "bg-emerald-500", records: (assetCheckAssignments || []).filter(a => a.active && a.required && getAssignmentStatus(a.id) === 'Compliant').slice(0, 5).map(mapAssetAssignment) },
            { label: "Overdue checks", count: expiredAssetChecks, color: "bg-rose-500", records: (assetCheckAssignments || []).filter(a => a.active && a.required && getAssignmentStatus(a.id) === 'Expired').slice(0, 5).map(mapAssetAssignment) },
            { label: "Missing check logs", count: missingAssetChecks, color: "bg-rose-500/60", records: (assetCheckAssignments || []).filter(a => a.active && a.required && getAssignmentStatus(a.id) === 'Missing').slice(0, 5).map(mapAssetAssignment) },
            { label: "Due soon checks", count: dueSoonAssetChecks, color: "bg-amber-500", records: (assetCheckAssignments || []).filter(a => a.active && a.required && getAssignmentStatus(a.id) === 'Expiring Soon').slice(0, 5).map(mapAssetAssignment) }
          ],
          records: matrixRecords,
          link: "/dashboard/matrix?status=Expired",
          linkLabel: "Open Asset Matrix Gaps"
        };
      case 'audit-packs':
        const draftPacks = auditPacks.filter(p => p.status === 'Draft' || !p.status).length;
        const readyPacks = auditPacks.filter(p => p.status === 'Ready').length;
        const sentPacks = auditPacks.filter(p => (p.status as string) === 'Sent' || (p.status as string) === 'Published').length;
        const packRecords = auditPacks.slice(0, 3).map(p => ({
          name: p.name,
          info: `Status: ${p.status || 'Draft'} | Requirements: ${p.requirements?.length || 0}`,
          status: p.status === 'Ready' ? 'GREEN' : 'AMBER',
          link: `/dashboard/audit-packs?pack=${p.id}`
        }));
        if (packRecords.length === 0) {
          packRecords.push({
            name: "No audit packs built",
            info: "Create a draft package to compile compliance evidence.",
            status: "AMBER",
            link: "/dashboard/audit-packs"
          });
        }
        return {
          id: 'audit-packs',
          title: "Audit Pack Builder",
          explanation: "Evidence packages compiled from selected workspace objectives and linked files to present during audits.",
          count: auditPacks.length,
          countLabel: "Active Packs",
          statusBreakdown: [
            { label: "Draft Packs", count: draftPacks, color: "bg-amber-500", records: [] },
            { label: "Ready to Present", count: readyPacks, color: "bg-emerald-500", records: [] },
            { label: "Shared / Sent Packs", count: sentPacks, color: "bg-indigo-500", records: [] }
          ],
          records: packRecords,
          link: "/dashboard/audit-packs",
          linkLabel: "Open Pack Builder"
        };
      case 'reports':
        return {
          id: 'reports',
          title: "Workspace Performance Overview",
          explanation: "Analytics reports and compliance histories automatically generated from user inputs and vault evidence.",
          count: reportViewCount,
          countLabel: "Available Views",
          statusBreakdown: [
            { label: "Executive summary", count: 1, color: "bg-emerald-500", records: [] },
            { label: "Framework audit check", count: 1, color: "bg-emerald-500", records: [] },
            { label: "Training matrix check", count: 1, color: "bg-emerald-500", records: [] },
            { label: "Asset maintenance history", count: 1, color: "bg-emerald-500", records: [] }
          ],
          records: [
            { name: "Executive Readiness Overview", info: "Aggregated health index across framework groups", status: "GREEN", link: "/dashboard/reports?tab=executive" },
            { name: "Framework Requirements breakdown", info: "Detailed checklist completion charts", status: "GREEN", link: "/dashboard/reports?tab=requirements" },
            { name: "Personnel Training status", info: "Certification expiry timelines", status: "GREEN", link: "/dashboard/reports?tab=competencies" },
            { name: "Asset Maintenance history", info: "Equipment checklists & service records", status: "GREEN", link: "/dashboard/reports?tab=locations-assets" }
          ],
          link: "/dashboard/reports",
          linkLabel: "Open Analytics Hub"
        };
      case 'hub':
        const compGapsCount = competencyRecords.filter(r => r.status === 'Expired' || r.status === 'Missing').length;
        const topReasons = [
          ...(stats.expiredCount > 0 ? [{ name: `${stats.expiredCount} requirements need attention`, info: "Missing evidence, overdue reviews, or other readiness gaps", status: "RED", link: `/dashboard/requirements?status=RED` }] : []),
          ...(overdueAssetChecks.length > 0 ? [{ name: `${overdueAssetChecks.length} Expired asset checks`, info: "Equipment or vehicle check gaps", status: "RED", link: "/dashboard/matrix?status=Expired" }] : []),
          ...(compGapsCount > 0 ? [{ name: `${compGapsCount} Training gaps`, info: "Expired or missing competency records", status: "AMBER", link: "/dashboard/competencies?status=Expired" }] : []),
          ...(unclassifiedDocs.length > 0 ? [{ name: `${unclassifiedDocs.length} Unclassified documents`, info: "Evidence records awaiting classification", status: "AMBER", link: "/dashboard/vault?status=Unclassified" }] : [])
        ].slice(0, 3);

        if (topReasons.length === 0) {
          topReasons.push({ name: "No current priority gaps", info: "No priority gaps were identified from the available workspace records.", status: "GREEN", link: "/dashboard/reports" });
        }

        return {
          id: 'hub',
          title: "Compliance Core Status",
          explanation: readinessScore === null
            ? "No assessed active requirements are currently included in the readiness calculation."
            : `Workspace readiness rating is ${readinessScore}%. It is calculated from assessed active requirements and their linked evidence, reviews, actions, and mapped competency records.`,
          count: readinessDisplay,
          countLabel: "Readiness Rating",
          statusBreakdown: [
            { label: "Requirements Needing Attention", count: stats.expiredCount, color: "bg-rose-500", records: activeRequirements.filter(r => r.status === 'RED').slice(0, 5).map(mapRequirement) },
            { label: "Missing Evidence", count: stats.missingCount, color: "bg-amber-500", records: activeRequirements.filter(r => r.status === 'AMBER').slice(0, 5).map(mapRequirement) },
            { label: "Training Gaps", count: compGapsCount, color: "bg-amber-500", records: competencyRecords.filter(r => r.status === 'Expired' || r.status === 'Missing').slice(0, 5).map(mapCompRecord) },
            { label: "Asset Gaps", count: overdueAssetChecks.length, color: "bg-rose-500", records: overdueAssetChecks.map(c => ({ name: c.requirement.title, info: `Asset Check | Overdue`, status: "RED", link: c.link })) }
          ],
          records: topReasons,
          link: "/dashboard/reports?tab=executive",
          linkLabel: "Open Workspace Reports",
          secondaryLink: "/dashboard/requirements?status=Attention",
          secondaryLinkLabel: "View Attention Items",
          suggestedAction: stats.expiredCount > 0 ? "Review overdue framework goals" :
                           overdueAssetChecks.length > 0 ? "Log checklist updates in Asset Matrix" :
                           unclassifiedDocs.length > 0 ? "Classify vault documents" :
                           "Review current workspace records"
        };
      case 'snapshot-compliant':
        return {
          id: 'snapshot-compliant',
          title: "Compliant Requirements",
          explanation: "All framework requirements that have active evidence and are marked as compliant (GREEN).",
          count: stats.compliantCount,
          countLabel: "Compliant count",
          records: activeRequirements.filter(r => r.status === 'GREEN').slice(0, 5).map(mapRequirement),
          link: "/dashboard/requirements?status=GREEN",
          linkLabel: "Filter Compliant Requirements"
        };
      case 'snapshot-inprogress':
        return {
          id: 'snapshot-inprogress',
          title: "In Progress Actions",
          explanation: "Remediation action items currently active or open to address framework gaps.",
          count: activeActionsCount,
          countLabel: "Active Actions count",
          records: actions.filter(a => a.status === 'Open' || a.status === 'In Progress').slice(0, 5).map(mapAction),
          link: "/dashboard/requirements?filter=actions",
          linkLabel: "Filter Actions"
        };
      case 'snapshot-atrisk':
        return {
          id: 'snapshot-atrisk',
          title: "At Risk Requirements",
          explanation: "Framework requirements that are expiring soon or have warning flags (AMBER).",
          count: stats.expiringSoonCount,
          countLabel: "At Risk count",
          records: activeRequirements.filter(r => r.status === 'AMBER').slice(0, 5).map(mapRequirement),
          link: "/dashboard/requirements?status=AMBER",
          linkLabel: "Filter At Risk Requirements"
        };
      case 'snapshot-needsattention':
        return {
          id: 'snapshot-needsattention',
          title: "Needs Attention Requirements",
          explanation: "Requirements that are overdue, have missing evidence, or have expired items (RED).",
          count: stats.expiredCount,
          countLabel: "Needs Attention count",
          records: activeRequirements.filter(r => r.status === 'RED').slice(0, 5).map(mapRequirement),
          link: "/dashboard/requirements?status=RED",
          linkLabel: "Filter Attention Requirements"
        };
      default:
        return null;
    }
  }, [readinessScore, readinessDisplay, stats, activeActionsCount, activeRequirements, frameworkRequirements, overdueAssetChecks, classifiedDocsCount, documents, unclassifiedDocs, competencySummary, competencyRecords, people, competencyTypes, overdueActionsCount, actions, compliantAssetChecks, totalAssetChecks, auditPacks, assets, today, greyRequirementCount, reportViewCount, assetMatrixCells, getAssignmentStatus, assetCheckAssignments]);

  const handleMouseEnter = (id: string) => (e: React.SyntheticEvent<HTMLElement>) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

    // Check widget's customized hoverDetailLevel
    const widgetConfig = currentCustomization.widgetSettings?.[id];
    const hoverLevel = widgetConfig?.hoverDetailLevel ?? 'full';
    if (hoverLevel === 'none') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const data = getInsightData(id);
    if (data) {
      if (hoverLevel === 'summary') {
        // Strip out records and statusBreakdown
        setHoveredInsight({
          ...data,
          records: undefined,
          statusBreakdown: undefined,
          x: rect.left + rect.width / 2,
          y: rect.bottom + 8
        });
      } else {
        setHoveredInsight({
          ...data,
          x: rect.left + rect.width / 2,
          y: rect.bottom + 8
        });
      }
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredInsight(null);
    }, 300);
  };

  const handleClick = (id: string) => () => {
    const widgetConfig = currentCustomization.widgetSettings?.[id];
    const clickAction = widgetConfig?.clickBehaviour ?? 'open-drawer';

    const routeMap: Record<string, string> = {
      health: '/dashboard/reports?tab=executive',
      requirements: '/dashboard/requirements',
      competencies: '/dashboard/competencies',
      vault: '/dashboard/vault',
      matrix: '/dashboard/matrix',
      'audit-packs': '/dashboard/audit-packs',
      reports: '/dashboard/reports',
      training: '/dashboard/competencies',
      tasks: '/dashboard/requirements?filter=actions',
      asset: '/dashboard/matrix',
      trend: '/dashboard/reports?tab=history',
      statusDonut: '/dashboard/requirements',
      readinessGauge: '/dashboard/reports',
      trainingRing: '/dashboard/competencies',
      assetCategory: '/dashboard/matrix',
      riskGaps: '/dashboard/requirements',
      alerts: '/dashboard/reports'
    };

    if (clickAction === 'navigate') {
      const path = routeMap[id];
      if (path) {
        router.push(path);
        return;
      }
    } else if (clickAction === 'filtered-view') {
      const tabMap: Record<string, string> = {
        requirements: 'action',
        tasks: 'action',
        training: 'focus',
        competencies: 'focus',
        asset: 'upcoming',
        evidence: 'activity'
      };
      const tab = tabMap[id] || 'focus';
      setActiveRailTab(tab as any);

      const railEl = document.getElementById('dashboard-right-rail');
      if (railEl) {
        railEl.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // Default 'open-drawer'
    const data = getInsightData(id);
    if (data) {
      setActiveInsightDrawer(data);
    }
  };

  const handleInsightKeyDown = (id: string) => (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick(id)();
    }
  };

  const handleTrendMouseEnter = (point: { label: string; score: number; source: string }) => (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredTrendPoint({
      label: point.label,
      score: point.score,
      source: point.source,
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const handleTrendMouseLeave = () => {
    setHoveredTrendPoint(null);
  };

  const handleNodeMouseEnter = (id: string, element: SVGGElement) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

    const widgetConfig = currentCustomization.widgetSettings?.[id];
    const hoverLevel = widgetConfig?.hoverDetailLevel ?? 'full';
    if (hoverLevel === 'none') return;

    const rect = element.getBoundingClientRect();
    const data = getInsightData(id);
    if (data) {
      if (hoverLevel === 'summary') {
        setHoveredInsight({
          ...data,
          records: undefined,
          statusBreakdown: undefined,
          x: rect.left + rect.width / 2,
          y: rect.bottom + 8
        });
      } else {
        setHoveredInsight({
          ...data,
          x: rect.left + rect.width / 2,
          y: rect.bottom + 8
        });
      }
    }
  };

  const handleNodeMouseLeave = () => {
    handleMouseLeave();
  };

  const handleNodeClick = (id: string) => {
    if (id === 'hub') {
      handleItemClick('hub', handleClick('hub'));
      return;
    }

    const widgetConfig = currentCustomization.widgetSettings?.[id];
    const clickAction = widgetConfig?.clickBehaviour ?? 'open-drawer';

    if (clickAction === 'open-drawer') {
      const data = getInsightData(id);
      if (data) {
        setActiveInsightDrawer(data);
      }
    } else {
      const routeMap: Record<string, string> = {
        requirements: '/dashboard/requirements',
        competencies: '/dashboard/competencies',
        vault: '/dashboard/vault',
        matrix: '/dashboard/matrix',
        'audit-packs': '/dashboard/audit-packs',
        reports: '/dashboard/reports'
      };
      const path = routeMap[id];
      if (path) {
        router.push(path);
      }
    }
  };



  const getPopoverStyle = (insight: typeof hoveredInsight) => {
    if (!insight) return {};
    let left = insight.x;
    let transform = 'translateX(-50%)';
    if (insight.x < 160) {
      left = 16;
      transform = 'none';
    } else if (typeof window !== 'undefined' && insight.x > window.innerWidth - 180) {
      return {
        position: 'fixed' as const,
        right: '16px',
        top: `${insight.y}px`,
        width: '280px'
      };
    }
    return {
      position: 'fixed' as const,
      left: `${left}px`,
      top: `${insight.y}px`,
      transform,
      width: '280px'
    };
  };

  const getTrendTooltipStyle = (pt: typeof hoveredTrendPoint) => {
    if (!pt) return {};
    return {
      position: 'fixed' as const,
      left: `${pt.x}px`,
      top: `${pt.y}px`,
      transform: 'translate(-50%, -100%)',
      pointerEvents: 'none' as const
    };
  };

  const moveKpi = (index: number, direction: -1 | 1, currentOrder: string[]) => {
    const newOrder = [...currentOrder];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return newOrder;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    return newOrder;
  };

  const handleSaveCustomization = (newCustomization: DashboardCustomization) => {
    const key = `vygilence_dashboard_customization_${user?.id || 'anon'}_${organization?.id || 'default'}`;
    try {
      const visibleTabs = newCustomization.visibleRightRailSections.filter(
        section => section !== 'snapshot'
      ) as DashboardCustomization['defaultRailTab'][];
      const defaultRailTab = visibleTabs.includes(newCustomization.defaultRailTab)
        ? newCustomization.defaultRailTab
        : visibleTabs[0] || 'tasks';
      const normalizedCustomization = { ...newCustomization, defaultRailTab };
      setPrevCustomization(customization);
      localStorage.setItem(key, JSON.stringify(normalizedCustomization));
      setCustomization(normalizedCustomization);
      setViewMode(normalizedCustomization.heroStyle === 'list' ? 'list' : normalizedCustomization.defaultViewMode);
      setActiveRailTab(defaultRailTab);
      setToast({ type: 'success', message: 'Dashboard layout preferences saved.' });
      setIsCustomizationOpen(false);
    } catch {
      setToast({ type: 'error', message: 'Failed to save dashboard preferences.' });
    }
  };

  const getTrendData = useCallback(() => {
    if (readinessScore === null) {
      return {
        points: [],
        labels: [],
        pathD: '',
        areaD: ''
      };
    }
    const scoreVal = readinessScore;
    const y = 110 - (scoreVal / 100) * 90;
    return {
      points: [
        { label: 'Current', cx: 150, cy: y, score: scoreVal, source: 'Live readiness calculation' }
      ],
      labels: ['Current'],
      pathD: '',
      areaD: ''
    };
  }, [readinessScore]);

  const readabilityStyles = useMemo(() => {
    const scale =
      customization.fontSize === 'sm' ? 0.9 :
      customization.fontSize === 'lg' ? 1.15 :
      customization.fontSize === 'xl' ? 1.25 : 1.0;

    const paneSpacingVal =
      customization.paneSpacing === 'tight' ? '12px' :
      customization.paneSpacing === 'wide' ? '36px' : '20px';

    const gridGapVal =
      customization.paneSpacing === 'tight' ? '12px' :
      customization.paneSpacing === 'wide' ? '36px' : '20px';

    const radiusVal =
      customization.cardRadius === 'sharp' ? '0px' :
      customization.cardRadius === 'soft' ? '16px' :
      customization.cardRadius === 'rounded' ? '24px' : '12px';

    // Accents map
    let primaryColor = '99, 102, 241'; // Indigo-500 default rgb
    let secondaryColor = '168, 85, 247'; // Purple-500 default rgb

    if (customization.colourAccent === 'cyan-emerald') {
      primaryColor = '6, 182, 212'; // Cyan-500
      secondaryColor = '16, 185, 129'; // Emerald-500
    } else if (customization.colourAccent === 'emerald-pulse') {
      primaryColor = '16, 185, 129';
      secondaryColor = '132, 204, 22';
    } else if (customization.colourAccent === 'violet-rose') {
      primaryColor = '124, 58, 237';
      secondaryColor = '219, 39, 119';
    } else if (customization.colourAccent === 'azure-amber') {
      primaryColor = '29, 78, 216';
      secondaryColor = '245, 158, 11';
    } else if (customization.colourAccent === 'gold-amber') {
      primaryColor = '234, 179, 8';
      secondaryColor = '217, 119, 6';
    } else if (customization.colourAccent === 'neon-green') {
      primaryColor = '16, 185, 129';
      secondaryColor = '132, 204, 22';
    } else if (customization.colourAccent === 'sunset-orange') {
      primaryColor = '249, 115, 22';
      secondaryColor = '236, 72, 153';
    } else if (customization.colourAccent === 'slate-monochrome') {
      primaryColor = '148, 163, 184';
      secondaryColor = '71, 85, 105';
    }

    return {
      '--lumen-scale': `${scale}`,
      '--lumen-pane-spacing': paneSpacingVal,
      '--lumen-grid-gap': gridGapVal,
      '--lumen-radius': radiusVal,
      '--lumen-primary-rgb': primaryColor,
      '--lumen-secondary-rgb': secondaryColor,
    } as React.CSSProperties;
  }, [customization]);

  const activeViewMode = customization.heroStyle === 'list' ? 'list' : viewMode;
  const isMotionReduced = customization.motionPreference === 'reduced';

  return (
    <div className="lumen-dashboard w-full" style={readabilityStyles}>
      <style dangerouslySetInnerHTML={{ __html: `
        .lumen-dashboard {
          font-size: calc(1rem * var(--lumen-scale, 1.0));
        }
        .lumen-dashboard .bg-card,
        .lumen-dashboard .bg-muted,
        .lumen-dashboard .border {
          border-radius: var(--lumen-radius, 12px) !important;
        }
        ${customization.contrast === 'high' ? `
          .lumen-dashboard .border,
          .lumen-dashboard .border-border,
          .lumen-dashboard .border-border\\/60,
          .lumen-dashboard .border-border\\/80 {
            border-width: 1.5px !important;
            border-color: rgba(var(--lumen-primary-rgb, 99, 102, 241), 0.8) !important;
          }
        ` : ''}
        /* Color accent overrides */
        .text-indigo-550, .text-indigo-500, .text-indigo-650 {
          color: rgb(var(--lumen-primary-rgb, 99, 102, 241)) !important;
        }
        .bg-indigo-650, .bg-indigo-500 {
          background-color: rgb(var(--lumen-primary-rgb, 99, 102, 241)) !important;
        }
        .bg-indigo-500\\/10 {
          background-color: rgba(var(--lumen-primary-rgb, 99, 102, 241), 0.1) !important;
        }
        .bg-indigo-500\\/5 {
          background-color: rgba(var(--lumen-primary-rgb, 99, 102, 241), 0.05) !important;
        }
        .border-indigo-500\\/20, .border-indigo-500\\/15, .border-indigo-500\\/30 {
          border-color: rgba(var(--lumen-primary-rgb, 99, 102, 241), 0.3) !important;
        }
        .hover\\:border-indigo-500\\/40:hover, .hover\\:border-indigo-500\\/30:hover {
          border-color: rgba(var(--lumen-primary-rgb, 99, 102, 241), 0.6) !important;
        }
        .group:hover .group-hover\\:text-indigo-600 {
          color: rgb(var(--lumen-primary-rgb, 99, 102, 241)) !important;
        }
        .group:hover .group-hover\\:bg-indigo-600 {
          background-color: rgb(var(--lumen-primary-rgb, 99, 102, 241)) !important;
        }
        .text-purple-550, .text-purple-500, .text-purple-650 {
          color: rgb(var(--lumen-secondary-rgb, 168, 85, 247)) !important;
        }
        .bg-purple-650, .bg-purple-500 {
          background-color: rgb(var(--lumen-secondary-rgb, 168, 85, 247)) !important;
        }
        /* Motion overrides */
        ${customization.motion === 'minimal' ? `
          * {
            animation: none !important;
            transition: none !important;
          }
        ` : ''}
      ` }} />
      <div className={`${densityStyles.spacing} animate-in fade-in duration-300`}>
      {/* 1. Header greeting strip */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/60 backdrop-blur-xs border border-border/80 rounded-2xl ${densityStyles.cardPadding} shadow-xs`}>
        <div className="space-y-1">
          <h1 className={`${densityStyles.headingSize} font-black tracking-tight`} id="dashboard-heading" suppressHydrationWarning>
            {getGreeting()}, {user?.full_name?.split(' ')[0] || 'User'}
          </h1>
          <p className={`${densityStyles.subheadingSize} text-muted-foreground flex items-center gap-1.5 font-semibold`}>
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
      <div className={`grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 ${densityStyles.gridGap}`}>
        {currentCustomization.kpiOrder
          .map(kpiId => {
            const isVisible = isWidgetVisible(kpiId);
            if (!isEditingDashboard && !isVisible) return null;

            const renderKpiCard = () => {
              switch (kpiId) {
                case 'health':
                  return (
                    <div
                      onMouseEnter={handleMouseEnter('health')}
                      onMouseLeave={handleMouseLeave}
                      onFocus={handleMouseEnter('health')}
                      onBlur={handleMouseLeave}
                      onClick={() => handleItemClick('health', handleClick('health'))}
                      onKeyDown={handleInsightKeyDown('health')}
                      role="button"
                      tabIndex={0}
                      aria-label="Inspect Compliance Health"
                      className={`bg-card border border-border rounded-2xl ${densityStyles.kpiPadding} hover:shadow-md hover:border-indigo-500/50 hover:scale-[1.02] cursor-pointer transition-all space-y-2.5 select-none ${
                        clickedItemId === 'health' ? 'scale-95 border-indigo-600 bg-indigo-500/10' : ''
                      }`}
                    >
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Compliance Health</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-2xl font-black ${scoreTone(readinessScore)}`}>{readinessDisplay}</span>
                        <span className="text-[10px] text-muted-foreground font-bold leading-none">Score</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block font-bold">Current Snapshot</span>
                    </div>
                  );
                case 'requirements':
                  return (
                    <div
                      onMouseEnter={handleMouseEnter('requirements')}
                      onMouseLeave={handleMouseLeave}
                      onFocus={handleMouseEnter('requirements')}
                      onBlur={handleMouseLeave}
                      onClick={() => handleItemClick('requirements', handleClick('requirements'))}
                      onKeyDown={handleInsightKeyDown('requirements')}
                      role="button"
                      tabIndex={0}
                      aria-label="Inspect Requirements"
                      className={`bg-card border border-border rounded-2xl ${densityStyles.kpiPadding} hover:shadow-md hover:border-indigo-500/50 hover:scale-[1.02] cursor-pointer transition-all space-y-2.5 select-none ${
                        clickedItemId === 'requirements' ? 'scale-95 border-indigo-600 bg-indigo-500/10' : ''
                      }`}
                    >
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
                  );
                case 'evidence':
                  return (
                    <div
                      onMouseEnter={handleMouseEnter('evidence')}
                      onMouseLeave={handleMouseLeave}
                      onFocus={handleMouseEnter('evidence')}
                      onBlur={handleMouseLeave}
                      onClick={() => handleItemClick('evidence', handleClick('evidence'))}
                      onKeyDown={handleInsightKeyDown('evidence')}
                      role="button"
                      tabIndex={0}
                      aria-label="Inspect Evidence Coverage"
                      className={`bg-card border border-border rounded-2xl ${densityStyles.kpiPadding} hover:shadow-md hover:border-indigo-500/50 hover:scale-[1.02] cursor-pointer transition-all space-y-2.5 select-none ${
                        clickedItemId === 'evidence' ? 'scale-95 border-indigo-600 bg-indigo-500/10' : ''
                      }`}
                    >
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
                  );
                case 'training':
                  return (
                    <div
                      onMouseEnter={handleMouseEnter('training')}
                      onMouseLeave={handleMouseLeave}
                      onFocus={handleMouseEnter('training')}
                      onBlur={handleMouseLeave}
                      onClick={() => handleItemClick('training', handleClick('training'))}
                      onKeyDown={handleInsightKeyDown('training')}
                      role="button"
                      tabIndex={0}
                      aria-label="Inspect Personnel Training"
                      className={`bg-card border border-border rounded-2xl ${densityStyles.kpiPadding} hover:shadow-md hover:border-indigo-500/50 hover:scale-[1.02] cursor-pointer transition-all space-y-2.5 select-none ${
                        clickedItemId === 'training' ? 'scale-95 border-indigo-600 bg-indigo-500/10' : ''
                      }`}
                    >
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Personnel Training</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-foreground">{competencySummary.compliancePercent}%</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block font-bold truncate">Active certifications</span>
                    </div>
                  );
                case 'tasks':
                  return (
                    <div
                      onMouseEnter={handleMouseEnter('tasks')}
                      onMouseLeave={handleMouseLeave}
                      onFocus={handleMouseEnter('tasks')}
                      onBlur={handleMouseLeave}
                      onClick={() => handleItemClick('tasks', handleClick('tasks'))}
                      onKeyDown={handleInsightKeyDown('tasks')}
                      role="button"
                      tabIndex={0}
                      aria-label="Inspect Open Tasks and Gaps"
                      className={`bg-card border border-border rounded-2xl ${densityStyles.kpiPadding} hover:shadow-md hover:border-indigo-500/50 hover:scale-[1.02] cursor-pointer transition-all space-y-2.5 select-none ${
                        clickedItemId === 'tasks' ? 'scale-95 border-indigo-600 bg-indigo-500/10' : ''
                      }`}
                    >
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
                  );
                case 'asset':
                  return (
                    <div
                      onMouseEnter={handleMouseEnter('asset')}
                      onMouseLeave={handleMouseLeave}
                      onFocus={handleMouseEnter('asset')}
                      onBlur={handleMouseLeave}
                      onClick={() => handleItemClick('asset', handleClick('asset'))}
                      onKeyDown={handleInsightKeyDown('asset')}
                      role="button"
                      tabIndex={0}
                      aria-label="Inspect Asset Assurance"
                      className={`bg-card border border-border rounded-2xl ${densityStyles.kpiPadding} hover:shadow-md hover:border-indigo-500/50 hover:scale-[1.02] cursor-pointer transition-all space-y-2.5 select-none ${
                        clickedItemId === 'asset' ? 'scale-95 border-indigo-600 bg-indigo-500/10' : ''
                      }`}
                    >
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
                  );
                default:
                  return null;
              }
            };

            const kpiCard = renderKpiCard();
            if (!kpiCard) return null;

            return (
              <WidgetWrapper
                key={kpiId}
                id={kpiId}
                isEditing={isEditingDashboard}
                isVisible={isVisible}
                onMoveUp={() => handleMoveWidget(kpiId, 'up')}
                onMoveDown={() => handleMoveWidget(kpiId, 'down')}
                onHide={() => handleHideWidget(kpiId)}
                onShow={() => handleShowWidget(kpiId)}
                currentCustomization={tempCustomization || customization}
                setTempCustomization={setTempCustomization}
              >
                {kpiCard}
              </WidgetWrapper>
            );
          })}
      </div>

      {/* 3. Core content grid with Sidebar Live Rail */}
      <div className={`grid grid-cols-1 lg:grid-cols-4 ${densityStyles.outerGridGap}`}>
        {/* Main Central compliance program map */}
        <div className={`lg:col-span-3 ${densityStyles.panelSpacing}`}>
          <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
            {/* Header controls for central overview */}
            <div className="p-4 border-b border-border/60 bg-muted/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Compliance Program Overview</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Interactive program maps and status monitoring of system modules.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isEditingDashboard ? (
                  <>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 rounded-md text-[10px] font-black uppercase tracking-wider animate-pulse">
                      Editing Hero Layout
                    </span>
                    <button
                      onClick={() => {
                        if (tempCustomization) {
                          handleSaveCustomization(tempCustomization);
                        }
                        setIsEditingDashboard(false);
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 border border-emerald-600/30 text-white rounded-md text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                    >
                      Save Layout
                    </button>
                    <button
                      onClick={() => {
                        if (tempCustomization) {
                          setTempCustomization({
                            ...tempCustomization,
                            heroCustomPositions: undefined
                          });
                          setToast({ type: 'info', message: 'Positions reset to preset defaults. Save to apply.' });
                        }
                      }}
                      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-md text-[10px] font-bold transition-all cursor-pointer"
                    >
                      Reset Layout
                    </button>
                    <button
                      onClick={() => {
                        setTempCustomization(null);
                        setIsEditingDashboard(false);
                      }}
                      className="px-2.5 py-1 bg-muted hover:bg-muted/80 border border-border rounded-md text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setModalCustomization(customization);
                        setIsCustomizationOpen(true);
                      }}
                      className="px-2.5 py-1 bg-muted hover:bg-muted/80 border border-border rounded-md text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer text-muted-foreground hover:text-foreground"
                      title="Customize Dashboard"
                    >
                      <Settings className="w-3.5 h-3.5" /> Customize
                    </button>
                    {customization.heroStyle !== 'list' && (
                      <button
                        onClick={() => {
                          setTempCustomization({ ...customization });
                          setIsEditingDashboard(true);
                        }}
                        className="px-2.5 py-1 bg-muted hover:bg-muted/80 border border-border rounded-md text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer text-muted-foreground hover:text-foreground"
                        title="Interactive layout sandbox"
                      >
                        Edit Layout
                      </button>
                    )}
                  </>
                )}
                {prevCustomization && (
                  <button
                    onClick={() => {
                      const key = `vygilence_dashboard_customization_${user?.id || 'anon'}_${organization?.id || 'default'}`;
                      try {
                        localStorage.setItem(key, JSON.stringify(prevCustomization));
                        setCustomization(prevCustomization);
                        setViewMode(prevCustomization.heroStyle === 'list' ? 'list' : prevCustomization.defaultViewMode);
                        setActiveRailTab(prevCustomization.defaultRailTab);
                        setPrevCustomization(null);
                        setToast({ type: 'success', message: 'Reverted to previous customization.' });
                      } catch {
                        setToast({ type: 'error', message: 'Failed to restore dashboard preferences.' });
                      }
                    }}
                    className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-md text-[10px] font-bold transition-all cursor-pointer"
                  >
                    Undo last save
                  </button>
                )}
                {customization.heroStyle !== 'list' && (
                  <div className="flex items-center bg-muted border border-border p-0.5 rounded-lg shrink-0">
                    <button
                      onClick={() => setViewMode('system')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeViewMode === 'system' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                      aria-label="View graphical system map"
                    >
                      <Network className="w-3.5 h-3.5" /> System View
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeViewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                      aria-label="View list format"
                    >
                      <List className="w-3.5 h-3.5" /> List View
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Central content depending on toggle */}
            <div className="p-5">
              {activeViewMode === 'system' ? (
                <>
                  {isEditingDashboard && (
                    <div className="mb-4 p-2.5 bg-indigo-500/5 border border-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded-lg text-center text-[11px] font-medium flex items-center justify-center gap-2">
                      <Move className="w-3.5 h-3.5 animate-pulse" />
                      <span>Drag nodes to reposition. Connectors update automatically.</span>
                    </div>
                  )}
                  <ComplianceHeroCore
                    theme={theme}
                    readinessScore={readinessScore}
                    readinessLabel={readinessLabel}
                    isMotionReduced={isMotionReduced}
                    effectIntensity={currentCustomization.effectIntensity || 'standard'}
                    heroAccent={currentCustomization.heroAccent || 'default'}
                    heroLayoutPreset={currentCustomization.heroLayoutPreset || 'balanced-orbit'}
                    dragEnabled={isEditingDashboard}
                    customPositions={currentCustomization.heroCustomPositions}
                    onCustomPositionsChange={(positions) => {
                      if (tempCustomization) {
                        setTempCustomization({ ...tempCustomization, heroCustomPositions: positions });
                      }
                    }}
                    requirementsData={{
                      active: stats.activeRequirements,
                      compliant: stats.compliantCount,
                      warnings: stats.expiredCount,
                      percent: stats.activeRequirements > 0 ? Math.round((stats.compliantCount / stats.activeRequirements) * 100) : 0,
                      metricText: `${stats.compliantCount}/${stats.activeRequirements} compliant`
                    }}
                    vaultData={{
                      total: documents.length,
                      classified: classifiedDocsCount,
                      warnings: unclassifiedDocs.length,
                      percent: documents.length > 0 ? Math.round((classifiedDocsCount / documents.length) * 100) : 0,
                      metricText: `${classifiedDocsCount}/${documents.length} classified`
                    }}
                    competencyData={{
                      total: people.length,
                      warnings: competencyRecords.filter(r => r.status === 'Expired' || r.status === 'Missing').length,
                      percent: competencySummary.compliancePercent,
                      metricText: `${competencySummary.compliancePercent}% valid`
                    }}
                    matrixData={{
                      total: totalAssetChecks,
                      compliant: compliantAssetChecks,
                      warnings: overdueAssetChecks.length,
                      percent: totalAssetChecks > 0 ? Math.round((compliantAssetChecks / totalAssetChecks) * 100) : 0,
                      metricText: `${compliantAssetChecks}/${totalAssetChecks} checks`
                    }}
                    auditPacksData={{
                      total: auditPacks.length,
                      ready: auditPacks.filter(p => p.status === 'Ready').length,
                      warnings: 0,
                      percent: auditPacks.length > 0 ? Math.round((auditPacks.filter(p => p.status === 'Ready').length / auditPacks.length) * 100) : 0,
                      metricText: `${auditPacks.filter(p => p.status === 'Ready').length}/${auditPacks.length} ready`
                    }}
                    reportsData={{
                      total: reportViewCount,
                      metricText: `${reportViewCount} available`
                    }}
                    onNodeMouseEnter={handleNodeMouseEnter}
                    onNodeMouseLeave={handleNodeMouseLeave}
                    onNodeClick={handleNodeClick}
                  />
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

          {/* Program Quick Actions */}
          <section className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-xs">
            <div className="mb-2">
              <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Program Quick Actions</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">High-frequency compliance operations and records registration.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-2">
              {[
                { label: 'Upload Evidence', desc: 'Add file to vault', icon: <Upload className="w-3.5 h-3.5" />, onClick: () => setIsUploadModalOpen(true) },
                { label: 'Create Goal', desc: 'Add requirement', icon: <ShieldCheck className="w-3.5 h-3.5" />, onClick: () => setActiveQuickActionModal('requirement') },
                { label: 'Add Competency', desc: 'Skills / training', icon: <Briefcase className="w-3.5 h-3.5" />, onClick: () => setActiveQuickActionModal('competency') },
                { label: 'Create Action', desc: 'Register gap item', icon: <FileSpreadsheet className="w-3.5 h-3.5" />, onClick: () => setActiveQuickActionModal('action') },
                { label: 'Build Pack', desc: 'Export audit pack', icon: <FileText className="w-3.5 h-3.5" />, onClick: () => setActiveQuickActionModal('audit-pack') }
              ].map(action => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className="p-2.5 bg-muted/40 hover:bg-card hover:border-indigo-500/40 hover:shadow-xs border border-border rounded-xl text-left transition-all duration-200 group flex flex-col justify-between min-h-[82px] cursor-pointer"
                >
                  <div className="p-1.5 w-7 h-7 bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0 flex items-center justify-center">
                    {action.icon}
                  </div>
                  <div className="space-y-0.5 mt-2">
                    <span className="font-extrabold text-foreground text-[10px] block leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{action.label}</span>
                    <p className="text-[8px] text-muted-foreground line-clamp-1 leading-none">{action.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Right-side live intelligence rail */}
        <aside className="space-y-5">
          {/* Rail Section 1: Circular Compliance gauge */}
          {customization.visibleRightRailSections.includes('snapshot') && (
            <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Compliance Snapshot</span>
                <span className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase">
                  <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${isMotionReduced ? '' : 'animate-pulse'}`} /> Live
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div
                  className="relative w-24 h-24 flex items-center justify-center shrink-0 cursor-pointer"
                  onMouseEnter={handleMouseEnter('health')}
                  onMouseLeave={handleMouseLeave}
                  onClick={handleClick('health')}
                  title="Click to view posture summary"
                >
                  {/* SVG Circular progress arch */}
                  <svg viewBox="0 0 120 120" className="w-full h-full">
                    <defs>
                      <linearGradient id="compliance-gauge-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="35%" stopColor="#f59e0b" />
                        <stop offset="70%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#6366f1" />
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
                    <span className="text-xl font-black text-foreground">{readinessDisplay}</span>
                    <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-wider">Overall</span>
                    <span className="mt-0.5 text-[7px] font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {readinessScore === null ? 'Not assessed' : 'Live readiness'}
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-1.5 text-[10.5px]">
                  <Link
                    href="/dashboard/requirements?status=GREEN"
                    onMouseEnter={handleMouseEnter('snapshot-compliant')}
                    onMouseLeave={handleMouseLeave}
                    onFocus={handleMouseEnter('snapshot-compliant')}
                    className="flex items-center justify-between gap-2 p-1 hover:bg-muted/30 border border-transparent hover:border-border/40 rounded-lg transition-all cursor-pointer block text-xs text-foreground font-bold"
                    title="Click to view compliant requirements"
                  >
                    <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>Compliant</span>
                    </div>
                    <span className="font-bold text-foreground">{stats.compliantCount}</span>
                  </Link>
                  <Link
                    href="/dashboard/requirements?filter=actions"
                    onMouseEnter={handleMouseEnter('snapshot-inprogress')}
                    onMouseLeave={handleMouseLeave}
                    onFocus={handleMouseEnter('snapshot-inprogress')}
                    className="flex items-center justify-between gap-2 p-1 hover:bg-muted/30 border border-transparent hover:border-border/40 rounded-lg transition-all cursor-pointer block text-xs text-foreground font-bold"
                    title="Click to view action tasks"
                  >
                    <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>In Progress</span>
                    </div>
                    <span className="font-bold text-foreground">{activeActionsCount}</span>
                  </Link>
                  <Link
                    href="/dashboard/requirements?status=AMBER"
                    onMouseEnter={handleMouseEnter('snapshot-atrisk')}
                    onMouseLeave={handleMouseLeave}
                    onFocus={handleMouseEnter('snapshot-atrisk')}
                    className="flex items-center justify-between gap-2 p-1 hover:bg-muted/30 border border-transparent hover:border-border/40 rounded-lg transition-all cursor-pointer block text-xs text-foreground font-bold"
                    title="Click to view at-risk requirements"
                  >
                    <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>At Risk</span>
                    </div>
                    <span className="font-bold text-foreground">{stats.expiringSoonCount}</span>
                  </Link>
                  <Link
                    href="/dashboard/requirements?status=RED"
                    onMouseEnter={handleMouseEnter('snapshot-needsattention')}
                    onMouseLeave={handleMouseLeave}
                    onFocus={handleMouseEnter('snapshot-needsattention')}
                    className="flex items-center justify-between gap-2 p-1 hover:bg-muted/30 border border-transparent hover:border-border/40 rounded-lg transition-all cursor-pointer block text-xs text-foreground font-bold"
                    title="Click to view requirements needing attention"
                  >
                    <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span>Needs Attention</span>
                    </div>
                    <span className="font-bold text-foreground">{stats.expiredCount}</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Rail Section 2: Tabbed Workspace Intelligence card */}
          {['focus', 'upcoming', 'action', 'activity'].some(id => customization.visibleRightRailSections.includes(id)) && (
            <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex flex-col h-[382px]">
              {/* Tab bar headers */}
              <div className="flex border-b border-border/60 pb-1.5 mb-2.5">
                {[
                  { id: 'focus', label: 'Focus', count: smartSuggestions.filter(s => s !== "No current priority suggestions were identified from the available workspace records.").length },
                  { id: 'upcoming', label: 'Next 7 Days', count: next7DaysItems.length },
                  { id: 'action', label: 'Needs Action', count: needsActionItems.length },
                  { id: 'activity', label: 'Activity', count: safeActivity.length }
                ]
                  .filter(tab => customization.visibleRightRailSections.includes(tab.id))
                  .map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveRailTab(tab.id as DashboardCustomization['defaultRailTab'])}
                      className={`flex-1 text-center pb-1 text-[9px] font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer relative ${
                        activeRailTab === tab.id
                          ? 'border-indigo-500 text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        {tab.label}
                        {tab.count > 0 && (
                          <span className={`w-1.5 h-1.5 rounded-full ${tab.id === 'action' || tab.id === 'upcoming' ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                        )}
                      </span>
                    </button>
                  ))}
              </div>

              {/* Tab contents */}
              <div className="flex-1 overflow-y-auto pr-0.5 no-scrollbar">
                {activeRailTab === 'action' && (
                  <div className="space-y-2 pb-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    {needsActionItems.slice(0, 5).map(item => (
                      <Link
                        key={item.id}
                        href={item.link}
                        className={`p-2.5 bg-card hover:bg-muted/40 border border-border rounded-xl text-left transition-all duration-200 group flex items-start gap-3 cursor-pointer shadow-xs hover:shadow-md hover:border-indigo-500/30 active:scale-[0.98] ${
                          (typeof window !== 'undefined' && window.location.search.includes(`id=${item.id}`)) ? 'ring-2 ring-indigo-500/50' : ''
                        }`}
                      >
                        {item.isOverdue ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="font-extrabold block text-foreground truncate text-[11px] leading-tight">{item.requirement.title}</span>
                          <span className="text-[9px] text-muted-foreground block truncate leading-none mt-0.5">{item.requirement.category}</span>
                          <span className={`text-[9px] font-black block mt-1 ${item.isOverdue ? 'text-rose-500' : 'text-amber-500'}`}>
                            Due: {item.requirement.next_due_date || 'N/A'}
                          </span>
                        </div>
                      </Link>
                    ))}
                    {needsActionItems.length === 0 && (
                      <p className="text-[10px] text-muted-foreground italic text-center py-20">No pending items due.</p>
                    )}
                  </div>
                )}

                {activeRailTab === 'activity' && (
                  <div className="space-y-3 relative border-l border-border pl-3.5 ml-1.5 py-1 animate-in fade-in duration-200 text-xs">
                    {safeActivity.map(log => {
                      const isAdminOrOwner = user?.role === 'Owner' || user?.role === 'Admin';
                      return (
                        <div
                          key={log.id}
                          onClick={() => {
                            if (isAdminOrOwner) {
                              router.push('/dashboard/reports?tab=history');
                            } else {
                              setToast({
                                type: 'error',
                                message: 'Access Denied: Standard users cannot view the full audit logs.'
                              });
                            }
                          }}
                          className={`text-[11px] relative space-y-0.5 cursor-pointer hover:bg-muted/30 p-1.5 rounded-lg transition-all active:scale-95 ${
                            (typeof window !== 'undefined' && window.location.search.includes(`id=${log.id}`)) ? 'bg-indigo-500/10' : ''
                          }`}
                          title={isAdminOrOwner ? "Click to view full Audit Trail logs in Reports." : "Audit event details"}
                        >
                          <div className="absolute -left-[18.5px] top-2.5 w-2.5 h-2.5 rounded-full border-2 border-card bg-indigo-500 shadow-xs" />
                          <span className="font-extrabold block text-foreground truncate text-[10px] leading-tight" title={log.action}>{log.action}</span>
                          <p className="text-muted-foreground text-[9.5px] leading-relaxed line-clamp-2 mt-0.5">{log.details}</p>
                        </div>
                      );
                    })}
                    {safeActivity.length === 0 && (
                      <p className="text-[10px] text-muted-foreground italic text-center py-20">No recent activities.</p>
                    )}
                  </div>
                )}

                {activeRailTab === 'focus' && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    {smartSuggestions.map((suggestion, idx) => {
                      let targetLink = '';
                      if (suggestion.includes('Asset Matrix')) {
                        targetLink = '/dashboard/matrix?status=Expired';
                      } else if (suggestion.includes('expired framework requirements')) {
                        targetLink = '/dashboard/requirements?status=RED';
                      } else if (suggestion.includes('vault documents')) {
                        targetLink = '/dashboard/vault?status=Unclassified';
                      } else if (suggestion.includes('gap action tasks')) {
                        targetLink = '/dashboard/requirements?filter=actions';
                      }

                      if (targetLink) {
                        return (
                          <Link
                            key={idx}
                            href={targetLink}
                            className="flex gap-2.5 p-2.5 bg-indigo-500/5 dark:bg-indigo-500/10 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 border border-indigo-500/15 hover:border-indigo-500/30 rounded-xl text-[10px] text-indigo-650 dark:text-indigo-300 font-semibold leading-relaxed transition-all cursor-pointer block text-left active:scale-95"
                            title="Click to navigate to filter"
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0 animate-pulse" />
                              <span>{suggestion}</span>
                            </div>
                          </Link>
                        );
                      }

                      return (
                        <div key={idx} className="flex gap-2.5 p-2.5 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 rounded-xl text-[10px] text-indigo-650 dark:text-indigo-300 font-semibold leading-relaxed">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0 animate-pulse" />
                          <span>{suggestion}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeRailTab === 'upcoming' && (
                  <div className="space-y-2 pb-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    {next7DaysItems.slice(0, 5).map(item => (
                      <Link
                        key={item.id}
                        href={item.link || '#'}
                        className={`p-2.5 bg-card hover:bg-muted/40 border border-border rounded-xl text-left transition-all duration-200 group flex items-start gap-3 cursor-pointer shadow-xs hover:shadow-md hover:border-indigo-500/30 active:scale-[0.98] ${
                          (typeof window !== 'undefined' && window.location.search.includes(`id=${item.id}`)) ? 'ring-2 ring-indigo-500/50' : ''
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="font-extrabold block text-foreground truncate text-[11px] leading-tight">{item.requirement.title}</span>
                          <span className="text-[9px] text-muted-foreground block truncate leading-none mt-0.5">{item.requirement.category}</span>
                          <span className="text-[9px] font-black text-amber-500 block mt-1">
                            Expiry: {item.requirement.next_due_date || 'N/A'}
                          </span>
                        </div>
                      </Link>
                    ))}
                    {next7DaysItems.length === 0 && (
                      <p className="text-[10px] text-muted-foreground italic text-center py-20">No expiring items found.</p>
                    )}
                  </div>
                )}
            </div>
          </div>
        )}

          {/* Rail Section 3: Expiring Soon */}
          {customization.visibleRightRailSections.includes('expiring') && (
            <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3 flex flex-col max-h-[280px]">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Expiring Soon</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-md">
                  {expiringSoonItems.length} items
                </span>
              </div>
              <div className="flex-1 overflow-y-auto pr-0.5 no-scrollbar space-y-2">
                {expiringSoonItems.slice(0, 4).map(item => (
                  <Link
                    key={item.id}
                    href={item.link || '#'}
                    className="p-2 bg-card hover:bg-muted/40 border border-border hover:border-indigo-500/30 rounded-xl text-left transition-all duration-200 flex items-start gap-2.5 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="font-extrabold block text-foreground truncate text-[11px] leading-tight">{item.requirement.title}</span>
                      <span className="text-[9px] text-muted-foreground block truncate leading-none mt-0.5">{item.requirement.category}</span>
                      <span className="text-[9px] font-black text-amber-500 block mt-1">
                        Due: {item.requirement.next_due_date || 'N/A'}
                      </span>
                    </div>
                  </Link>
                ))}
                {expiringSoonItems.length === 0 && (
                  <p className="text-[10px] text-muted-foreground italic text-center py-8">No items expiring in next 30 days.</p>
                )}
              </div>
            </div>
          )}

          {/* Rail Section 4: Evidence Upload Console */}
          {customization.visibleRightRailSections.includes('upload-console') && (
            <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3">
              <div>
                <h3 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Evidence Upload Console</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Quickly drop or browse evidence files to upload privately to the vault.</p>
              </div>
              <div className="min-h-[110px] flex items-center justify-center">
                <EvidenceDropzone
                  label="Drag file here or click"
                  helperText="Files are securely uploaded to the private vault"
                  buttonLabel="Browse Files"
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
          )}
        </aside>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 ${densityStyles.gridGap} transition-all duration-300`}>
        {(currentCustomization.lowerPanelsOrder || DEFAULT_CUSTOMIZATION_SETTINGS.lowerPanelsOrder || [])
          .map(paneId => {
            const isVisible = isWidgetVisible(paneId);
            if (!isEditingDashboard && !isVisible) return null;

            const registryItem = DASHBOARD_WIDGET_REGISTRY.find(w => w.id === paneId);
            const colSpanClass = getColSpan(registryItem?.defaultSize);

            const renderPaneContent = () => {
              switch (paneId) {
                case 'trend':
                  return (
                    <div className={`bg-card border border-border rounded-xl ${densityStyles.cardPadding} shadow-xs flex flex-col justify-between h-full`}>
                      <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Readiness Snapshot</span>
                        <span className="text-[8px] font-bold text-muted-foreground">Historical trend unavailable</span>
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
                          {getTrendData().areaD && <path d={getTrendData().areaD} fill="url(#trend-fill-grad)" />}

                          {/* Main Line path */}
                          {getTrendData().pathD && <path d={getTrendData().pathD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />}

                          {/* Trend points circles */}
                          {getTrendData().points.map((pt, idx) => (
                            <circle
                              key={idx}
                              cx={pt.cx}
                              cy={pt.cy}
                              r={idx === getTrendData().points.length - 1 ? 4.5 : 3.5}
                              fill={idx === getTrendData().points.length - 1 ? "#38bdf8" : "#6366f1"}
                              stroke={idx === getTrendData().points.length - 1 ? "#ffffff" : "none"}
                              strokeWidth={idx === getTrendData().points.length - 1 ? 1.5 : 0}
                              className="cursor-pointer transition-all hover:scale-150"
                              onMouseEnter={handleTrendMouseEnter(pt)}
                              onMouseLeave={handleTrendMouseLeave}
                            />
                          ))}

                          {/* Floating label for the current readiness value */}
                          {readinessScore !== null ? (
                            <>
                              <rect x="134" cy={110 - (readinessScore / 100) * 90 - 24} width="32" height="15" rx="3" fill="#6366f1" />
                              <text x="150" y={110 - (readinessScore / 100) * 90 - 14} fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                                {readinessDisplay}
                              </text>
                            </>
                          ) : (
                            <text x="150" y="66" fill="currentColor" className="text-muted-foreground" fontSize="9" fontWeight="bold" textAnchor="middle">
                              No assessed requirements
                            </text>
                          )}
                        </svg>
                      </div>
                      <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase px-2.5 mt-2">
                        {getTrendData().labels.map((lbl, idx) => (
                          <span key={idx}>{lbl}</span>
                        ))}
                      </div>
                    </div>
                  );
                case 'statusDonut':
                  return (
                    <div className={`bg-card border border-border rounded-xl ${densityStyles.cardPadding} shadow-xs flex flex-col justify-between h-full`}>
                      <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Requirement Status</span>
                        <span className="text-[9px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">Active Requirements</span>
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
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => router.push('/dashboard/requirements?status=GREEN')}
                            >
                              <title>{`Compliant: ${stats.compliantCount} objectives. Click to filter.`}</title>
                            </circle>
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
                              transform={`rotate(${(stats.compliantCount / (stats.activeRequirements || 1)) * 360} 50 50)`}
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => router.push('/dashboard/requirements?status=AMBER')}
                            >
                              <title>{`At Risk: ${stats.expiringSoonCount} requirements. Click to filter.`}</title>
                            </circle>

                            {/* Needs Attention segment */}
                            <circle
                              cx="50"
                              cy="50"
                              r="36"
                              fill="transparent"
                              stroke="#ef4444"
                              strokeWidth="11"
                              strokeDasharray="226.2"
                              strokeDashoffset={226.2 - (226.2 * (stats.expiredCount / (stats.activeRequirements || 1)))}
                              transform={`rotate(${((stats.compliantCount + stats.expiringSoonCount) / (stats.activeRequirements || 1)) * 360} 50 50)`}
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => router.push('/dashboard/requirements?status=RED')}
                            >
                              <title>{`Needs Attention: ${stats.expiredCount} requirements. Click to filter.`}</title>
                            </circle>

                            {/* Not Assessed segment */}
                            <circle
                              cx="50"
                              cy="50"
                              r="36"
                              fill="transparent"
                              stroke="#71717a"
                              strokeWidth="11"
                              strokeDasharray="226.2"
                              strokeDashoffset={226.2 - (226.2 * (greyRequirementCount / (stats.activeRequirements || 1)))}
                              transform={`rotate(${((stats.compliantCount + stats.expiringSoonCount + stats.expiredCount) / (stats.activeRequirements || 1)) * 360} 50 50)`}
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => router.push('/dashboard/requirements?status=GREY')}
                            >
                              <title>{`Not Assessed: ${greyRequirementCount} requirements. Click to filter.`}</title>
                            </circle>
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center text-center">
                            <span className="text-base font-black text-foreground">{stats.activeRequirements}</span>
                            <span className="text-[7px] font-bold text-muted-foreground uppercase">Total</span>
                          </div>
                        </div>

                        <div className="flex-1 space-y-1.5 text-[10px]">
                          <button
                            onClick={() => router.push('/dashboard/requirements?status=GREEN')}
                            className="w-full flex items-center justify-between font-bold hover:bg-muted/30 p-1 rounded-md transition-all text-left"
                          >
                            <span className="flex items-center gap-1 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" /> Compliant</span>
                            <span className="text-foreground">{stats.compliantCount} ({stats.activeRequirements > 0 ? Math.round((stats.compliantCount / stats.activeRequirements) * 100) : 0}%)</span>
                          </button>
                          <button
                            onClick={() => router.push('/dashboard/requirements?status=AMBER')}
                            className="w-full flex items-center justify-between font-bold hover:bg-muted/30 p-1 rounded-md transition-all text-left"
                          >
                            <span className="flex items-center gap-1 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" /> At Risk</span>
                            <span className="text-foreground">{stats.expiringSoonCount} ({stats.activeRequirements > 0 ? Math.round((stats.expiringSoonCount / stats.activeRequirements) * 100) : 0}%)</span>
                          </button>
                          <button
                            onClick={() => router.push('/dashboard/requirements?status=RED')}
                            className="w-full flex items-center justify-between font-bold hover:bg-muted/30 p-1 rounded-md transition-all text-left"
                          >
                            <span className="flex items-center gap-1 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" /> Needs Attention</span>
                            <span className="text-foreground">{stats.expiredCount} ({stats.activeRequirements > 0 ? Math.round((stats.expiredCount / stats.activeRequirements) * 100) : 0}%)</span>
                          </button>
                          <button
                            onClick={() => router.push('/dashboard/requirements?status=GREY')}
                            className="w-full flex items-center justify-between font-bold hover:bg-muted/30 p-1 rounded-md transition-all text-left"
                          >
                            <span className="flex items-center gap-1 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0" /> Not Assessed</span>
                            <span className="text-foreground">{greyRequirementCount} ({stats.activeRequirements > 0 ? Math.round((greyRequirementCount / stats.activeRequirements) * 100) : 0}%)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                case 'readinessGauge':
                  return (
                    <div
                      className={`bg-card border border-border rounded-xl ${densityStyles.cardPadding} shadow-xs flex flex-col justify-between cursor-pointer hover:border-indigo-500/50 transition-all duration-300 select-none h-full`}
                      onMouseEnter={handleMouseEnter('health')}
                      onMouseLeave={handleMouseLeave}
                      onClick={handleClick('health')}
                      title="Click to view full posture analysis"
                    >
                      <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Audit Readiness</span>
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
                              strokeDashoffset={110 - (110 * ((readinessScore ?? 0) / 100))}
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <div className="absolute bottom-1 flex flex-col items-center justify-center text-center">
                            <span className="text-xl font-black text-foreground">{readinessDisplay}</span>
                            <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-wider">Readiness</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 w-full mt-2 border-t border-border/40 pt-2 text-[10px] text-center font-bold">
                          <div>
                            <span className="block text-rose-500">{stats.expiredCount}</span>
                            <span className="text-[8px] text-muted-foreground uppercase tracking-wider block">Needs Attention</span>
                          </div>
                          <div className="border-l border-border/40">
                            <span className="block text-amber-500">{stats.expiringSoonCount}</span>
                            <span className="text-[8px] text-muted-foreground uppercase tracking-wider block">Due Soon</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                case 'trainingRing':
                  return (
                    <div
                      className={`bg-card border border-border rounded-xl ${densityStyles.cardPadding} shadow-xs flex flex-col justify-between cursor-pointer hover:border-indigo-500/50 transition-all duration-300 select-none h-full`}
                      onMouseEnter={handleMouseEnter('training')}
                      onMouseLeave={handleMouseLeave}
                      onClick={handleClick('training')}
                      title="Click to view teammate certifications status"
                    >
                      <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Training Completion</span>
                        <span className="text-[9px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">Current Records</span>
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
                              strokeDashoffset={238.8 - (238.8 * ((competencySummary?.compliancePercent ?? 0) / 100))}
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center text-center">
                            <span className="text-base font-black text-foreground">{competencySummary?.compliancePercent ?? 0}%</span>
                            <span className="text-[7px] font-bold text-muted-foreground uppercase">Completed</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 w-full mt-2 border-t border-border/40 pt-2 text-[10px] text-center font-bold">
                          <div>
                            <span className="block text-emerald-500">{competencySummary?.valid ?? 0}</span>
                            <span className="text-[8px] text-muted-foreground uppercase tracking-wider block">Completed</span>
                          </div>
                          <div className="border-l border-border/40">
                            <span className="block text-rose-500">{competencySummary?.expired ?? 0}</span>
                            <span className="text-[8px] text-muted-foreground uppercase tracking-wider block">Overdue</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                case 'assetCategory':
                  return (
                    <div className={`bg-card border border-border rounded-xl ${densityStyles.cardPadding} shadow-xs ${densityStyles.panelSpacing} transition-all duration-300 h-full flex flex-col justify-between`}>
                      <div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Asset Category Health</span>
                        <div className="space-y-3 py-1 text-xs mt-3">
                          {assetCategoryCompliance.map(category => (
                            <Link
                              key={category.id}
                              href={`/dashboard/matrix?category=${category.id}`}
                              className="space-y-1.5 block hover:bg-muted/30 p-2 rounded-xl transition-all cursor-pointer"
                              title={`Health score: ${category.percent}% | ${category.compliant} of ${category.total} checks compliant. Click to view category in Asset Matrix.`}
                            >
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
                            </Link>
                          ))}
                          {assetCategoryCompliance.length === 0 && (
                            <p className="text-[10px] text-muted-foreground italic text-center py-6">No parent asset categories defined.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                case 'riskGaps':
                  return (
                    <div className={`bg-card border border-border rounded-xl ${densityStyles.cardPadding} shadow-xs ${densityStyles.panelSpacing} transition-all duration-300 h-full flex flex-col justify-between`}>
                      <div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Top Risk Gaps</span>
                        <div className="space-y-3 text-xs mt-3">
                          {[
                            { label: 'Critical Risk Items', riskKey: 'Critical', count: frameworkRequirements.filter(r => r.risk_level === 'Critical' && r.status !== 'GREEN').length, color: 'text-rose-600 bg-rose-500/10 border-rose-500/20' },
                            { label: 'High Risk Items', riskKey: 'High', count: frameworkRequirements.filter(r => r.risk_level === 'High' && r.status !== 'GREEN').length, color: 'text-rose-500 bg-rose-500/5 border-rose-500/15' },
                            { label: 'Medium Risk Items', riskKey: 'Medium', count: frameworkRequirements.filter(r => r.risk_level === 'Medium' && r.status !== 'GREEN').length, color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' },
                            { label: 'Low Risk Items', riskKey: 'Low', count: frameworkRequirements.filter(r => r.risk_level === 'Low' && r.status !== 'GREEN').length, color: 'text-zinc-600 bg-zinc-500/10 border-zinc-500/20' }
                          ].map(item => (
                            <Link
                              key={item.label}
                              href={`/dashboard/requirements?risk=${item.riskKey}&status=Attention`}
                              className="flex justify-between items-center p-2.5 bg-muted/20 hover:bg-muted/40 border border-border rounded-xl transition-all cursor-pointer block text-xs font-bold text-foreground"
                              title={`Click to view pending ${item.riskKey} risk requirements.`}
                            >
                              <span>{item.label}</span>
                              <span className={`px-2 py-0.5 text-[10px] font-black rounded-md border ${item.color}`}>
                                {item.count} pending
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                case 'alerts':
                  return (
                    <div className={`bg-card border border-border rounded-xl ${densityStyles.cardPadding} shadow-xs ${densityStyles.panelSpacing} transition-all duration-300 h-full flex flex-col justify-between`}>
                      <div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Active Alerts</span>
                        <div className="space-y-3 text-xs mt-3">
                          {stats.expiredCount > 0 && (
                            <Link
                              href="/dashboard/requirements?status=RED"
                              className="flex items-start gap-2.5 p-2 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 hover:border-rose-500/30 rounded-xl transition-all cursor-pointer block"
                              title="Click to view requirements needing attention."
                            >
                              <div className="flex items-start gap-2.5">
                                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold block text-rose-600 dark:text-rose-400">{stats.expiredCount} requirements need attention</span>
                                  <p className="text-[10px] text-muted-foreground">Missing evidence, overdue reviews, or other readiness gaps.</p>
                                </div>
                              </div>
                            </Link>
                          )}
                          {overdueAssetChecks.length > 0 && (
                            <Link
                              href="/dashboard/matrix?status=Expired"
                              className="flex items-start gap-2.5 p-2 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 hover:border-rose-500/30 rounded-xl transition-all cursor-pointer block"
                              title="Click to view expired asset checks."
                            >
                              <div className="flex items-start gap-2.5">
                                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold block text-rose-600 dark:text-rose-400">{overdueAssetChecks.length} asset checks overdue</span>
                                  <p className="text-[10px] text-muted-foreground">Assigned equipment or vehicle checks require action.</p>
                                </div>
                              </div>
                            </Link>
                          )}
                          {unclassifiedDocs.length > 0 && (
                            <Link
                              href="/dashboard/vault?status=Unclassified"
                              className="flex items-start gap-2.5 p-2 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 hover:border-amber-500/30 rounded-xl transition-all cursor-pointer block"
                              title="Click to view unclassified vault files."
                            >
                              <div className="flex items-start gap-2.5">
                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold block text-amber-600 dark:text-amber-400">{unclassifiedDocs.length} unclassified documents</span>
                                  <p className="text-[10px] text-muted-foreground">Newly uploaded evidence files pending classification.</p>
                                </div>
                              </div>
                            </Link>
                          )}
                          {stats.expiredCount === 0 && overdueAssetChecks.length === 0 && unclassifiedDocs.length === 0 && (
                            <p className="text-[10px] text-muted-foreground italic text-center py-6">No critical alerts detected in your workspace.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                case 'quickActions':
                  return (
                    <div className={`bg-card border border-border rounded-xl ${densityStyles.cardPadding} shadow-xs ${densityStyles.panelSpacing} h-full flex flex-col justify-between`}>
                      <div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Quick Actions</span>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="flex flex-col items-center justify-center p-3 bg-muted/30 hover:bg-indigo-500/10 border border-border hover:border-indigo-500/35 rounded-xl transition-all text-center gap-1.5 cursor-pointer"
                          >
                            <Upload className="w-5 h-5 text-indigo-550" />
                            <span className="text-[10px] font-bold text-foreground">Upload Evidence</span>
                          </button>
                          <Link
                            href="/dashboard/matrix"
                            className="flex flex-col items-center justify-center p-3 bg-muted/30 hover:bg-indigo-500/10 border border-border hover:border-indigo-500/35 rounded-xl transition-all text-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-5 h-5 text-emerald-550" />
                            <span className="text-[10px] font-bold text-foreground">Conduct Check</span>
                          </Link>
                          <Link
                            href="/dashboard/requirements"
                            className="flex flex-col items-center justify-center p-3 bg-muted/30 hover:bg-indigo-500/10 border border-border hover:border-indigo-500/35 rounded-xl transition-all text-center gap-1.5 cursor-pointer"
                          >
                            <FileText className="w-5 h-5 text-sky-550" />
                            <span className="text-[10px] font-bold text-foreground">View Requirements</span>
                          </Link>
                          <button
                            onClick={() => {
                              setTempCustomization({ ...customization });
                              setIsEditingDashboard(true);
                            }}
                            className="flex flex-col items-center justify-center p-3 bg-muted/30 hover:bg-indigo-500/10 border border-border hover:border-indigo-500/35 rounded-xl transition-all text-center gap-1.5 cursor-pointer"
                          >
                            <Settings className="w-5 h-5 text-violet-550" />
                            <span className="text-[10px] font-bold text-foreground">Customize Layout</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                default:
                  return null;
              }
            };

            const paneContent = renderPaneContent();
            if (!paneContent) return null;

            return (
              <div key={paneId} className={colSpanClass}>
                <WidgetWrapper
                  id={paneId}
                  isEditing={isEditingDashboard}
                  isVisible={isVisible}
                  onMoveUp={() => handleMoveWidget(paneId, 'up')}
                  onMoveDown={() => handleMoveWidget(paneId, 'down')}
                  onToggleLocation={() => handleToggleWidgetLocation(paneId)}
                  onHide={() => handleHideWidget(paneId)}
                  onShow={() => handleShowWidget(paneId)}
                  currentCustomization={tempCustomization || customization}
                  setTempCustomization={setTempCustomization}
                >
                  {paneContent}
                </WidgetWrapper>
              </div>
            );
          })}
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

      {/* Insight Popover Tooltip */}
      {hoveredInsight && (
        <div
          onMouseEnter={() => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current); }}
          onMouseLeave={handleMouseLeave}
          style={getPopoverStyle(hoveredInsight)}
          className="z-50 bg-card/95 backdrop-blur-md border border-indigo-500/30 rounded-xl p-4 shadow-2xl space-y-3 pointer-events-auto transition-all duration-150 animate-in fade-in zoom-in-95 text-left"
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
            <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{hoveredInsight.title}</span>
            {hoveredInsight.countLabel && (
              <span className="text-[9px] font-bold text-muted-foreground uppercase">{hoveredInsight.countLabel}</span>
            )}
          </div>
          <p className="text-[10.5px] text-muted-foreground leading-relaxed">{hoveredInsight.explanation}</p>
          {hoveredInsight.statusBreakdown && (
            <div className="space-y-1.5 text-[9.5px] font-bold border-t border-border/40 pt-2">
              {hoveredInsight.statusBreakdown.map((item, idx) => {
                const hasRecords = item.records && item.records.length > 0;
                const isExpanded = expandedStatusLabel === `${hoveredInsight.id}-${item.label}`;
                return (
                  <div key={idx} className="space-y-1">
                    <button
                      onClick={() => {
                        if (hasRecords) {
                          setExpandedStatusLabel(isExpanded ? null : `${hoveredInsight.id}-${item.label}`);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-1 rounded hover:bg-muted/30 transition-colors text-left ${hasRecords ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                        {item.label}
                        {hasRecords && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`w-2.5 h-2.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          >
                            <path d="m6 9 6 6 6-6"/>
                          </svg>
                        )}
                      </span>
                      <span className="text-foreground">{item.count}</span>
                    </button>
                    {hasRecords && isExpanded && (
                      <div className="pl-3 space-y-1 max-h-32 overflow-y-auto no-scrollbar pt-0.5 pb-1">
                        {item.records.slice(0, 5).map((rec, recIdx) => (
                          <Link
                            key={recIdx}
                            href={rec.link || '#'}
                            className="flex justify-between items-center text-[9px] p-1.5 bg-muted/40 hover:bg-muted/80 border border-border/40 hover:border-indigo-500/30 rounded-lg transition-colors cursor-pointer pointer-events-auto"
                          >
                            <span className="font-extrabold text-foreground truncate max-w-[150px]" title={rec.name}>{rec.name}</span>
                            <span className="text-muted-foreground text-[8px] truncate">{rec.info}</span>
                          </Link>
                        ))}
                        {item.records.length > 5 && (
                          <div className="text-[8.5px] text-muted-foreground italic pl-1.5 pt-0.5">
                            ...and {item.records.length - 5} more records.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {hoveredInsight.records && hoveredInsight.records.length > 0 && (
            <div className="space-y-1.5 border-t border-border/40 pt-2">
              <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block">Needs Attention</span>
              <div className="space-y-1 max-h-24 overflow-y-auto no-scrollbar">
                {hoveredInsight.records.slice(0, 3).map((rec, idx) => (
                  <Link key={idx} href={rec.link || '#'} className="flex justify-between items-center text-[9px] p-1.5 bg-muted/30 hover:bg-muted/70 border border-border/40 hover:border-indigo-500/30 rounded-lg transition-colors cursor-pointer pointer-events-auto">
                    <span className="font-extrabold text-foreground truncate max-w-[150px]" title={rec.name}>{rec.name}</span>
                    <span className="text-muted-foreground text-[8px] truncate">{rec.info}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {hoveredInsight.link && (
            <div className="pt-2 border-t border-border/40 text-center pointer-events-auto">
              <Link
                href={hoveredInsight.link}
                className="text-[9.5px] font-black text-indigo-500 hover:text-indigo-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                {hoveredInsight.linkLabel || 'Open full view'}
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
              </Link>
            </div>
          )}
        </div>
      )}

      {hoveredTrendPoint && (
        <div
          style={getTrendTooltipStyle(hoveredTrendPoint)}
          className="z-50 bg-card/95 backdrop-blur-md border border-indigo-500/30 rounded-xl p-3 shadow-xl pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95 text-left"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{hoveredTrendPoint.label}</span>
            <span className="text-[9px] font-bold text-indigo-500">{hoveredTrendPoint.source}</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-foreground">{hoveredTrendPoint.score}%</span>
            <span className="text-[9px] text-muted-foreground font-semibold">readiness</span>
          </div>
        </div>
      )}

      {/* Insight Drawer */}
      {activeInsightDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setActiveInsightDrawer(null)} />
          <div className="relative w-full max-w-md bg-card/95 backdrop-blur-md border-l border-border/80 h-full p-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300 text-left">
            <div className="space-y-6 overflow-y-auto no-scrollbar flex-1 pb-6">
              <div className="flex items-start justify-between border-b border-border/60 pb-4">
                <div>
                  <h3 className="text-base font-black text-foreground uppercase tracking-wider">{activeInsightDrawer.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{activeInsightDrawer.explanation}</p>
                </div>
                <button
                  onClick={() => setActiveInsightDrawer(null)}
                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {activeInsightDrawer.id === 'hub' ? (
                /* Compliance Core Custom Layout */
                <div className="space-y-6">
                  {/* Overall Readiness Breakdown */}
                  <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{activeInsightDrawer.countLabel || 'Readiness Rating'}</span>
                      <span className="text-3xl font-black block text-foreground mt-1">{activeInsightDrawer.count}</span>
                    </div>
                    {activeInsightDrawer.statusBreakdown && (
                      <div className="space-y-1.5 text-[10px] font-bold">
                        {activeInsightDrawer.statusBreakdown.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${item.color}`} />
                            <span className="text-muted-foreground">{item.label}:</span>
                            <span className="text-foreground">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Module Contribution Cards */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Module Health Context</span>
                    <div className="grid grid-cols-2 gap-2.5">
                      {satelliteNodes.map(node => {
                        let healthVal = '';
                        if (node.id === 'requirements') {
                          healthVal = `${Math.round((stats.compliantCount / (stats.activeRequirements || 1)) * 100)}%`;
                        } else if (node.id === 'competencies') {
                          healthVal = `${competencySummary.compliancePercent}%`;
                        } else if (node.id === 'vault') {
                          healthVal = `${Math.round((classifiedDocsCount / (documents.length || 1)) * 100)}%`;
                        } else if (node.id === 'matrix') {
                          healthVal = `${Math.round((compliantAssetChecks / (totalAssetChecks || 1)) * 100)}%`;
                        } else if (node.id === 'audit-packs') {
                          healthVal = `${node.count} packs`;
                        } else if (node.id === 'reports') {
                          healthVal = `${node.count} views`;
                        }
                        return (
                          <Link
                            key={node.id}
                            href={node.path}
                            onClick={() => setActiveInsightDrawer(null)}
                            className="p-3 bg-muted/20 border border-border/60 hover:border-indigo-500/30 rounded-xl flex flex-col justify-between text-xs transition-all cursor-pointer block text-left"
                          >
                            <div className="flex items-center gap-1.5 font-bold text-foreground">
                              <span className="text-indigo-500 shrink-0">{node.icon}</span>
                              <span className="truncate">{node.name}</span>
                            </div>
                            <div className="mt-2 flex items-baseline justify-between">
                              <span className="text-[9px] text-muted-foreground truncate">{node.description}</span>
                              <span className="font-extrabold text-indigo-650 dark:text-indigo-400">{healthVal}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Risk Summary */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Top Risk Gaps Summary</span>
                    <div className="space-y-2.5 max-h-[30vh] overflow-y-auto pr-1">
                      {activeInsightDrawer.records.map((rec, idx) => (
                        <Link
                          key={idx}
                          href={rec.link}
                          onClick={() => setActiveInsightDrawer(null)}
                          className="flex items-center justify-between p-3 bg-muted/20 border border-border/60 hover:border-indigo-500/30 rounded-xl transition-all cursor-pointer block text-left"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <span className="font-extrabold text-xs block text-foreground truncate">{rec.name}</span>
                            <span className="text-[10px] text-muted-foreground block truncate mt-0.5">{rec.info}</span>
                          </div>
                          <span className={`px-1.5 py-0.5 text-[8px] font-black rounded-md border shrink-0 ${
                            rec.status === 'RED' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                            rec.status === 'AMBER' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                            'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                          }`}>
                            {rec.status}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Generic module details layout */
                <>
                  <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{activeInsightDrawer.countLabel || 'Current Posture'}</span>
                      <span className="text-3xl font-black block text-foreground mt-1">{activeInsightDrawer.count}</span>
                    </div>
                    {activeInsightDrawer.statusBreakdown && (
                      <div className="space-y-1.5 text-[10px] font-bold">
                        {activeInsightDrawer.statusBreakdown.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${item.color}`} />
                            <span className="text-muted-foreground">{item.label}:</span>
                            <span className="text-foreground">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Items Requiring Attention</span>
                    <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1">
                      {activeInsightDrawer.records && activeInsightDrawer.records.length > 0 ? (
                        activeInsightDrawer.records.map((rec, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-muted/20 border border-border/60 hover:border-indigo-500/30 rounded-xl transition-all"
                          >
                            <div className="min-w-0 flex-1 pr-3">
                              <span className="font-extrabold text-xs block text-foreground truncate">{rec.name}</span>
                              <span className="text-[10px] text-muted-foreground block truncate mt-0.5">{rec.info}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {rec.status && (
                                <span className={`px-1.5 py-0.5 text-[8px] font-black rounded-md border ${
                                  rec.status === 'RED' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                                  rec.status === 'AMBER' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                  'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                }`}>
                                  {rec.status}
                                </span>
                              )}
                              <Link
                                href={rec.link}
                                className="p-1 bg-muted hover:bg-indigo-500/10 text-muted-foreground hover:text-indigo-500 rounded-lg transition-colors"
                                onClick={() => setActiveInsightDrawer(null)}
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 bg-muted/10 border border-dashed border-border rounded-xl">
                          <p className="text-xs text-muted-foreground italic">No pending action items found.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {(activeInsightDrawer.link || activeInsightDrawer.secondaryLink || activeInsightDrawer.suggestedAction) && (
              <div className="border-t border-border/60 pt-4 mt-auto space-y-3">
                {activeInsightDrawer.suggestedAction && (
                  <div className="bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 rounded-xl p-3 text-left">
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block">Suggested Next Action</span>
                    <p className="text-xs text-foreground font-semibold mt-1">{activeInsightDrawer.suggestedAction}</p>
                  </div>
                )}
                <div className="flex gap-2.5">
                  {activeInsightDrawer.secondaryLink && (
                    <Link
                      href={activeInsightDrawer.secondaryLink}
                      onClick={() => setActiveInsightDrawer(null)}
                      className="flex-1 py-3 border border-border hover:bg-muted text-foreground font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all text-center"
                    >
                      {activeInsightDrawer.secondaryLinkLabel || 'View Attention'}
                    </Link>
                  )}
                  {activeInsightDrawer.link && (
                    <Link
                      href={activeInsightDrawer.link}
                      onClick={() => setActiveInsightDrawer(null)}
                      className="flex-1 py-3 bg-indigo-650 hover:bg-indigo-750 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 transition-all text-center"
                    >
                      {activeInsightDrawer.linkLabel || 'Open Module'}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Layout Customization Modal */}
      {isCustomizationOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg border border-border rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto flex flex-col justify-between text-left">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Customize Dashboard Layout</h3>
                </div>
                <button
                  onClick={() => setIsCustomizationOpen(false)}
                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* KPI Cards Configuration */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Top KPI Cards (Show & Reorder)</span>
                <div className="space-y-1.5 border border-border/60 rounded-xl p-3 bg-muted/10 max-h-56 overflow-y-auto">
                  {modalCustomization.kpiOrder.map((kpiId, index) => {
                    const isVisible = modalCustomization.visibleKpis.includes(kpiId);
                    const label = kpiId === 'health' ? 'Compliance Health' :
                                  kpiId === 'requirements' ? 'Framework Requirements' :
                                  kpiId === 'evidence' ? 'Evidence Vault Coverage' :
                                  kpiId === 'training' ? 'Personnel Competency Training' :
                                  kpiId === 'tasks' ? 'Open Tasks / Gaps' :
                                  kpiId === 'asset' ? 'Asset Assurance' : kpiId;
                    return (
                      <div key={kpiId} className="flex items-center justify-between p-2 bg-card border border-border/60 rounded-lg text-xs font-semibold">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={(e) => {
                              const newVisible = e.target.checked
                                ? [...modalCustomization.visibleKpis, kpiId]
                                : modalCustomization.visibleKpis.filter(id => id !== kpiId);
                              setModalCustomization({ ...modalCustomization, visibleKpis: newVisible });
                            }}
                            className="rounded border-border focus:ring-indigo-500"
                          />
                          <span className={isVisible ? 'text-foreground font-bold' : 'text-muted-foreground line-through'}>{label}</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            disabled={index === 0}
                            onClick={() => {
                              const newOrder = moveKpi(index, -1, modalCustomization.kpiOrder);
                              setModalCustomization({ ...modalCustomization, kpiOrder: newOrder });
                            }}
                            className="p-1 bg-muted hover:bg-muted-foreground/10 disabled:opacity-40 rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                          >
                            ▲
                          </button>
                          <button
                            disabled={index === modalCustomization.kpiOrder.length - 1}
                            onClick={() => {
                              const newOrder = moveKpi(index, 1, modalCustomization.kpiOrder);
                              setModalCustomization({ ...modalCustomization, kpiOrder: newOrder });
                            }}
                            className="p-1 bg-muted hover:bg-muted-foreground/10 disabled:opacity-40 rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lower Panels Configuration */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Visible Lower Panels</span>
                <div className="grid grid-cols-2 gap-2 border border-border/60 rounded-xl p-3 bg-muted/10">
                  {[
                    { id: 'trend', label: 'Readiness Snapshot' },
                    { id: 'statusDonut', label: 'Requirement Donut' },
                    { id: 'readinessGauge', label: 'Readiness Dial' },
                    { id: 'trainingRing', label: 'Training Ring' },
                    { id: 'assetCategory', label: 'Asset Categories' },
                    { id: 'riskGaps', label: 'Risk Level Areas' },
                    { id: 'alerts', label: 'Workspace Alerts' }
                  ].map(panel => {
                    const isVisible = modalCustomization.visiblePanels.includes(panel.id);
                    return (
                      <label key={panel.id} className="flex items-center gap-2 p-2 bg-card border border-border/60 rounded-lg text-xs font-semibold cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={(e) => {
                            const newVisible = e.target.checked
                              ? [...modalCustomization.visiblePanels, panel.id]
                              : modalCustomization.visiblePanels.filter(id => id !== panel.id);
                            setModalCustomization({ ...modalCustomization, visiblePanels: newVisible });
                          }}
                          className="rounded border-border focus:ring-indigo-500"
                        />
                        <span className={isVisible ? 'text-foreground' : 'text-muted-foreground'}>{panel.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Right Rail Sections Configuration */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Right Rail Sections</span>
                <div className="grid grid-cols-2 gap-2 border border-border/60 rounded-xl p-3 bg-muted/10">
                  {[
                    { id: 'snapshot', label: 'Compliance Snapshot' },
                    { id: 'tasks', label: 'Tasks Feed' },
                    { id: 'activity', label: 'Recent Activity' },
                    { id: 'focus', label: 'Focus' },
                    { id: 'expiring', label: 'Expiring Soon' }
                  ].map(sec => {
                    const isVisible = modalCustomization.visibleRightRailSections.includes(sec.id);
                    return (
                      <label key={sec.id} className="flex items-center gap-2 p-1.5 bg-card border border-border/60 rounded-lg text-xs font-semibold cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={(e) => {
                            const newVisible = e.target.checked
                              ? [...modalCustomization.visibleRightRailSections, sec.id]
                              : modalCustomization.visibleRightRailSections.filter(id => id !== sec.id);
                            setModalCustomization({ ...modalCustomization, visibleRightRailSections: newVisible });
                          }}
                          className="rounded border-border focus:ring-indigo-500"
                        />
                        <span className={isVisible ? 'text-foreground' : 'text-muted-foreground'}>{sec.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Layout & Hero Aesthetics */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Layout & Hero Aesthetics</span>
                <div className="grid grid-cols-2 gap-3 border border-border/60 rounded-xl p-3 bg-muted/10">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Layout Density</label>
                    <select
                      value={modalCustomization.density}
                      onChange={(e) => setModalCustomization({ ...modalCustomization, density: e.target.value as DashboardCustomization['density'] })}
                      className="w-full px-2.5 py-1.5 bg-card border border-border focus:border-indigo-500 rounded-lg text-xs outline-none"
                    >
                      <option value="comfortable">Comfortable</option>
                      <option value="compact">Compact</option>
                      <option value="executive">Executive</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Hero Style</label>
                    <select
                      value={modalCustomization.heroStyle}
                      onChange={(e) => setModalCustomization({ ...modalCustomization, heroStyle: e.target.value as DashboardCustomization['heroStyle'] })}
                      className="w-full px-2.5 py-1.5 bg-card border border-border focus:border-indigo-500 rounded-lg text-xs outline-none"
                    >
                      <option value="map">System Map</option>
                      <option value="core">Compliance Core Only</option>
                      <option value="list">List Overview</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Hero Detail Level</label>
                    <select
                      value={modalCustomization.heroDetailLevel}
                      onChange={(e) => setModalCustomization({ ...modalCustomization, heroDetailLevel: e.target.value as DashboardCustomization['heroDetailLevel'] })}
                      className="w-full px-2.5 py-1.5 bg-card border border-border focus:border-indigo-500 rounded-lg text-xs outline-none"
                    >
                      <option value="minimal">Minimal</option>
                      <option value="balanced">Balanced</option>
                      <option value="full">Full</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Motion Settings</label>
                    <select
                      value={modalCustomization.motionPreference}
                      onChange={(e) => setModalCustomization({ ...modalCustomization, motionPreference: e.target.value as DashboardCustomization['motionPreference'] })}
                      className="w-full px-2.5 py-1.5 bg-card border border-border focus:border-indigo-500 rounded-lg text-xs outline-none"
                    >
                      <option value="standard">Standard animations</option>
                      <option value="reduced">Reduced motion</option>
                    </select>
                  </div>
                   <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Hero Accent</label>
                    <select
                      value={modalCustomization.heroAccent || 'default'}
                      onChange={(e) => setModalCustomization({ ...modalCustomization, heroAccent: e.target.value as DashboardCustomization['heroAccent'] })}
                      className="w-full px-2.5 py-1.5 bg-card border border-border focus:border-indigo-500 rounded-lg text-xs outline-none"
                    >
                      <option value="default">Default Blue/Violet</option>
                      <option value="cyan-emerald">Cyan/Emerald</option>
                      <option value="blue-amber">Blue/Amber</option>
                      <option value="violet-rose">Violet/Rose</option>
                      <option value="rainbow">Rainbow Spectrum</option>
                      <option value="gold-amber">Gold/Amber</option>
                      <option value="neon-green">Neon Green</option>
                      <option value="sunset-orange">Sunset Orange</option>
                      <option value="slate-monochrome">Slate Monochrome</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Effects Intensity</label>
                    <select
                      value={modalCustomization.effectIntensity || 'standard'}
                      onChange={(e) => setModalCustomization({ ...modalCustomization, effectIntensity: e.target.value as DashboardCustomization['effectIntensity'] })}
                      className="w-full px-2.5 py-1.5 bg-card border border-border focus:border-indigo-500 rounded-lg text-xs outline-none"
                    >
                      <option value="subtle">Subtle Glows</option>
                      <option value="standard">Standard Glows & Sweeps</option>
                      <option value="vibrant">Vibrant Glows & Sweeps</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Hero Layout Preset</label>
                    <select
                      value={modalCustomization.heroLayoutPreset || 'balanced-orbit'}
                      onChange={(e) => setModalCustomization({ ...modalCustomization, heroLayoutPreset: e.target.value as DashboardCustomization['heroLayoutPreset'] })}
                      className="w-full px-2.5 py-1.5 bg-card border border-border focus:border-indigo-500 rounded-lg text-xs outline-none"
                    >
                      <option value="balanced-orbit">Balanced Orbit (Default)</option>
                      <option value="wide-command-map">Wide Command Map</option>
                      <option value="compact-core">Compact Core</option>
                      <option value="operations-focus">Operations Focus</option>
                      <option value="presentation-mode">Presentation Mode</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Display & Readability Settings */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Display & Readability</span>
                <div className="grid grid-cols-2 gap-3 border border-border/60 rounded-xl p-3 bg-muted/10">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Font Size Scale</label>
                    <select
                      value={modalCustomization.fontSize || 'standard'}
                      onChange={(e) => setModalCustomization({ ...modalCustomization, fontSize: e.target.value as 'sm' | 'standard' | 'lg' | 'xl' })}
                      className="w-full px-2.5 py-1.5 bg-card border border-border focus:border-indigo-500 rounded-lg text-xs outline-none"
                    >
                      <option value="sm">Small (90%)</option>
                      <option value="standard">Standard (100%)</option>
                      <option value="lg">Large (115%)</option>
                      <option value="xl">Extra Large (125%)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Pane Spacing</label>
                    <select
                      value={modalCustomization.paneSpacing || 'standard'}
                      onChange={(e) => setModalCustomization({ ...modalCustomization, paneSpacing: e.target.value as 'tight' | 'standard' | 'wide' })}
                      className="w-full px-2.5 py-1.5 bg-card border border-border focus:border-indigo-500 rounded-lg text-xs outline-none"
                    >
                      <option value="tight">Tight (12px)</option>
                      <option value="standard">Standard (20px)</option>
                      <option value="wide">Wide (36px)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Card Corner Radius</label>
                    <select
                      value={modalCustomization.cardRadius || 'standard'}
                      onChange={(e) => setModalCustomization({ ...modalCustomization, cardRadius: e.target.value as 'sharp' | 'standard' | 'soft' | 'rounded' })}
                      className="w-full px-2.5 py-1.5 bg-card border border-border focus:border-indigo-500 rounded-lg text-xs outline-none"
                    >
                      <option value="sharp">Sharp (0px)</option>
                      <option value="standard">Standard (12px)</option>
                      <option value="soft">Soft (16px)</option>
                      <option value="rounded">Rounded (24px)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Colour Accent Scheme</label>
                    <select
                      value={modalCustomization.colourAccent || 'default'}
                      onChange={(e) => setModalCustomization({ ...modalCustomization, colourAccent: e.target.value as 'default' | 'cyan-emerald' | 'emerald-pulse' | 'violet-rose' | 'azure-amber' | 'blue-amber' | 'rainbow' | 'gold-amber' | 'neon-green' | 'sunset-orange' | 'slate-monochrome' })}
                      className="w-full px-2.5 py-1.5 bg-card border border-border focus:border-indigo-500 rounded-lg text-xs outline-none"
                    >
                      <option value="default">Default Indigo/Violet</option>
                      <option value="cyan-emerald">Cyan/Emerald</option>
                      <option value="emerald-pulse">Emerald Pulse</option>
                      <option value="violet-rose">Violet/Rose</option>
                      <option value="azure-amber">Azure/Amber</option>
                      <option value="gold-amber">Gold/Amber</option>
                      <option value="neon-green">Neon Green</option>
                      <option value="sunset-orange">Sunset Orange</option>
                      <option value="slate-monochrome">Slate Monochrome</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Contrast Enhancement</label>
                    <select
                      value={modalCustomization.contrast || 'standard'}
                      onChange={(e) => setModalCustomization({ ...modalCustomization, contrast: e.target.value as 'standard' | 'high' })}
                      className="w-full px-2.5 py-1.5 bg-card border border-border focus:border-indigo-500 rounded-lg text-xs outline-none"
                    >
                      <option value="standard">Standard Contrast</option>
                      <option value="high">High Contrast Borders</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Interface Motion</label>
                    <select
                      value={modalCustomization.motion || 'standard'}
                      onChange={(e) => setModalCustomization({ ...modalCustomization, motion: e.target.value as 'standard' | 'minimal' })}
                      className="w-full px-2.5 py-1.5 bg-card border border-border focus:border-indigo-500 rounded-lg text-xs outline-none"
                    >
                      <option value="standard">Standard Transitions</option>
                      <option value="minimal">Minimal / Disable Motion</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Defaults Configuration */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Default View Mode</label>
                  <select
                    value={modalCustomization.defaultViewMode}
                    onChange={(e) => setModalCustomization({ ...modalCustomization, defaultViewMode: e.target.value as 'system' | 'list' })}
                    className="w-full px-2.5 py-1.5 bg-muted border border-border focus:border-indigo-500 rounded-lg text-xs outline-none transition-colors"
                  >
                    <option value="system">System graphical</option>
                    <option value="list">Module list</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Default Right Rail Tab</label>
                  <select
                    value={modalCustomization.defaultRailTab}
                    onChange={(e) => setModalCustomization({ ...modalCustomization, defaultRailTab: e.target.value as DashboardCustomization['defaultRailTab'] })}
                    className="w-full px-2.5 py-1.5 bg-muted border border-border focus:border-indigo-500 rounded-lg text-xs outline-none transition-colors"
                  >
                    <option value="tasks">Tasks list</option>
                    <option value="activity">Recent activity</option>
                    <option value="focus">Focus</option>
                    <option value="expiring">Expiring soon</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Upcoming Items Window</label>
                  <select
                    value={modalCustomization.dataWindow}
                    onChange={(e) => setModalCustomization({ ...modalCustomization, dataWindow: e.target.value as DashboardCustomization['dataWindow'] })}
                    className="w-full px-2.5 py-1.5 bg-muted border border-border focus:border-indigo-500 rounded-lg text-xs outline-none transition-colors"
                  >
                    <option value="snapshot">Due today</option>
                    <option value="7days">Next 7 days</option>
                    <option value="30days">Next 30 days</option>
                    <option value="90days">Next 90 days</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-border/60 pt-4 mt-6 flex justify-between items-center gap-3">
              <button
                onClick={() => {
                  setModalCustomization(DEFAULT_CUSTOMIZATION_SETTINGS);
                }}
                className="px-4 py-2 border border-border rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                Reset to Defaults
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsCustomizationOpen(false)}
                  className="px-4 py-2 border border-border rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveCustomization(modalCustomization)}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-750 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-md shadow-indigo-600/10"
                >
                  Save Changes
                </button>
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

      {/* Smart Evidence Dropzone Side Panel */}
      {isDragOverActive && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 bg-background/95 backdrop-blur-md border-l border-border p-6 shadow-2xl flex flex-col items-center justify-center text-center animate-in slide-in-from-right duration-300">
          <div className="absolute inset-0 border-2 border-dashed border-indigo-500/50 m-4 rounded-xl flex flex-col items-center justify-center pointer-events-none">
            <Upload className="w-12 h-12 text-indigo-500 animate-bounce mb-4" />
            <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Evidence Dropzone</h3>
            <p className="text-[10px] text-muted-foreground mt-2 max-w-[200px] leading-relaxed">
              Drop files anywhere to start linking evidence to your requirements, actions, assets, or competencies.
            </p>
          </div>
        </div>
      )}

      {/* Drop Context Classification Modal */}
      {isDropContextModalOpen && droppedFiles && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-extrabold text-foreground">Classify & Link Evidence</h3>
              </div>
              <button
                onClick={() => {
                  setIsDropContextModalOpen(false);
                  setDroppedFiles(null);
                }}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dropped Files List */}
            <div className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Dropped Files ({droppedFiles.length})</span>
              {droppedFiles.map((file, idx) => (
                <div key={idx} className="flex justify-between items-center text-[10px] p-2 bg-muted/40 border border-border/40 rounded-lg">
                  <span className="font-bold text-foreground truncate max-w-[250px]">{file.name}</span>
                  <span className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
              ))}
            </div>

            {/* Context Type Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Link To Context</label>
              <select
                value={selectedContextType}
                onChange={(e) => {
                  setSelectedContextType(e.target.value as any);
                  setSelectedContextId('');
                }}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none text-xs text-foreground font-bold cursor-pointer"
              >
                <option value="general">General (Unclassified Vault)</option>
                <option value="requirement">Framework Requirement</option>
                <option value="action">Remediation Action Task</option>
                <option value="asset">Asset Check Assignment</option>
                <option value="competency">Personnel Competency Record</option>
              </select>
            </div>

            {/* Specific Record Selector (conditional) */}
            {selectedContextType !== 'general' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">
                  Select {selectedContextType.charAt(0).toUpperCase() + selectedContextType.slice(1)} Target
                </label>
                <select
                  value={selectedContextId}
                  onChange={(e) => setSelectedContextId(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none text-xs text-foreground font-bold cursor-pointer"
                >
                  <option value="">-- Choose one --</option>
                  {selectedContextType === 'requirement' &&
                    activeRequirements.map(r => (
                      <option key={r.id} value={r.id}>
                        [{r.category}] {r.title} ({r.status})
                      </option>
                    ))
                  }
                  {selectedContextType === 'action' &&
                    actions.filter(a => a.status === 'Open' || a.status === 'In Progress').map(a => (
                      <option key={a.id} value={a.id}>
                        {a.title} (Owner: {a.owner || 'Unassigned'})
                      </option>
                    ))
                  }
                  {selectedContextType === 'asset' &&
                    (assetCheckAssignments || []).filter(a => a.active && a.required).map(asg => {
                      const asset = (assets || []).find(a => a.id === asg.asset_id);
                      const checkType = (assetCheckTypes || []).find(ct => ct.id === asg.asset_check_type_id);
                      return (
                        <option key={asg.id} value={asg.id}>
                          {checkType?.title || 'Check'} - {asset?.name || 'Asset'} (Next due: {asg.next_due_date || 'None'})
                        </option>
                      );
                    })
                  }
                  {selectedContextType === 'competency' &&
                    competencyRecords.map(r => {
                      const p = people.find(item => item.id === r.person_id);
                      const ct = competencyTypes.find(item => item.id === r.competency_type_id);
                      return (
                        <option key={r.id} value={r.id}>
                          {p?.display_name || 'Teammate'} - {ct?.title || 'Certification'} ({r.status})
                        </option>
                      );
                    })
                  }
                </select>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsDropContextModalOpen(false);
                  setDroppedFiles(null);
                }}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg font-bold text-xs transition-colors cursor-pointer"
                disabled={isUploadingDropped}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (selectedContextType !== 'general' && !selectedContextId) {
                    alert('Please select a target.');
                    return;
                  }
                  setIsUploadingDropped(true);
                  setUploadProgressMessage('Uploading files...');
                  try {
                    for (const file of droppedFiles) {
                      setUploadProgressMessage(`Uploading ${file.name}...`);
                      const doc = await uploadDocument({
                        file,
                        title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim() || file.name,
                        category: selectedContextType === 'competency' ? 'Competency' :
                                  selectedContextType === 'asset' ? 'Asset' :
                                  selectedContextType === 'requirement' ? 'Requirement' :
                                  selectedContextType === 'action' ? 'Action' : 'General',
                        expiry_date: null,
                        issue_date: new Date().toISOString().split('T')[0],
                        metadata: { source: 'dashboard_dropzone' }
                      });

                      if (selectedContextType === 'requirement') {
                        await linkDocumentToRequirement(selectedContextId, doc.id);
                      } else if (selectedContextType === 'action') {
                        await linkDocumentToAction(selectedContextId, doc.id);
                      } else if (selectedContextType === 'asset') {
                        const asg = assetCheckAssignments.find(a => a.id === selectedContextId);
                        if (asg) {
                          await linkAssetCheckEvidence(asg.id, null, doc.id, asg.asset_id);
                        }
                      } else if (selectedContextType === 'competency') {
                        await linkDocumentToCompetencyRecord(selectedContextId, doc.id);
                      }
                    }
                    setToast({ type: 'success', message: `Successfully uploaded and linked ${droppedFiles.length} file(s).` });
                    setIsDropContextModalOpen(false);
                    setDroppedFiles(null);
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'An error occurred during upload.');
                  } finally {
                    setIsUploadingDropped(false);
                    setUploadProgressMessage('');
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs transition-all shadow-md cursor-pointer disabled:bg-indigo-650/40"
                disabled={isUploadingDropped || (selectedContextType !== 'general' && !selectedContextId)}
              >
                {isUploadingDropped ? 'Uploading...' : 'Upload & Link'}
              </button>
            </div>
            {uploadProgressMessage && (
              <p className="text-[10px] text-indigo-500 font-bold text-center mt-2 animate-pulse">{uploadProgressMessage}</p>
            )}
          </div>
        </div>
      )}

      <InlineToast toast={toast} onDismiss={() => setToast(null)} />
      </div>
    </div>
  );
}
