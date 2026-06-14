'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Upload,
  ClipboardList,
  UserCheck,
  FolderLock,
  Grid,
  FolderArchive,
  BarChart3,
  Settings,
  Network,
  List,
  AlertTriangle,
  Building2,
  ChevronRight,
  ChevronLeft,
  X,
  ArrowRight,
  Clock,
  Briefcase,
  ShieldCheck,
  FileSpreadsheet,
  FileText
} from 'lucide-react';

const scoreTone = (score: number | null) => {
  if (score === null) return 'text-muted-foreground';
  if (score >= 90) return 'text-emerald-500';
  if (score >= 75) return 'text-indigo-500 dark:text-indigo-400';
  if (score >= 50) return 'text-amber-500';
  return 'text-rose-500';
};

const scoreToneText = (score: number | null) => {
  if (score === null) return 'text-muted-foreground';
  if (score >= 90) return 'text-emerald-500';
  if (score >= 75) return 'text-indigo-500 dark:text-indigo-400';
  if (score >= 50) return 'text-amber-500';
  return 'text-rose-500';
};

// 1. DashboardHeader Component
export function DashboardHeader({
  greeting,
  isDemoMode,
  isResettingDemo,
  handleResetDemoData,
  setIsUploadModalOpen
}: {
  greeting: string;
  isDemoMode: boolean;
  isResettingDemo: boolean;
  handleResetDemoData: () => void;
  setIsUploadModalOpen: (val: boolean) => void;
}) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2" id="dashboard-heading" suppressHydrationWarning>
          {greeting} 👋
        </h1>
        <p className="text-xs text-muted-foreground font-semibold">
          Here's what's happening with your compliance program today.
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
        {isDemoMode && (
          <button
            onClick={handleResetDemoData}
            disabled={isResettingDemo}
            className="flex-grow md:flex-initial px-3.5 py-2 bg-muted hover:bg-muted/80 border border-border text-foreground font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            {isResettingDemo ? 'Resetting...' : 'Reset Demo Data'}
          </button>
        )}
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex-grow md:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-indigo-650 hover:bg-indigo-755 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/10 transition-all cursor-pointer"
        >
          <Upload className="w-4 h-4" /> Quick Upload
        </button>
      </div>
    </div>
  );
}

// 2. KpiStrip Component
export function KpiStrip({
  readinessScore,
  readinessDisplay,
  stats,
  reqProgress,
  docProgress,
  classifiedDocsCount,
  documentsCount,
  competencySummary,
  activeActionsCount,
  overdueActionsCount,
  compliantAssetChecks,
  totalAssetChecks,
  assetProgress,
  overdueAssetChecksCount,
  clickedItemId,
  densityStyles,
  handleMouseEnter,
  handleMouseLeave,
  handleItemClick,
  handleClick,
  handleInsightKeyDown,
  visibleKpis,
  kpiOrder
}: {
  readinessScore: number | null;
  readinessDisplay: string;
  stats: any;
  reqProgress: number;
  docProgress: number;
  classifiedDocsCount: number;
  documentsCount: number;
  competencySummary: any;
  activeActionsCount: number;
  overdueActionsCount: number;
  compliantAssetChecks: number;
  totalAssetChecks: number;
  assetProgress: number;
  overdueAssetChecksCount: number;
  clickedItemId: string | null;
  densityStyles: any;
  handleMouseEnter: (id: string) => (e: any) => void;
  handleMouseLeave: () => void;
  handleItemClick: (id: string, action?: () => void) => void;
  handleClick: (id: string) => () => void;
  handleInsightKeyDown: (id: string) => (e: any) => void;
  visibleKpis: string[];
  kpiOrder: string[];
}) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 ${densityStyles.gridGap} mb-6`}>
      {kpiOrder
        .filter(kpiId => visibleKpis.includes(kpiId))
        .map(kpiId => {
          switch (kpiId) {
            case 'health':
              return (
                <div
                  key="health"
                  onMouseEnter={handleMouseEnter('health')}
                  onMouseLeave={handleMouseLeave}
                  onFocus={handleMouseEnter('health')}
                  onBlur={handleMouseLeave}
                  onClick={() => handleItemClick('health', handleClick('health'))}
                  onKeyDown={handleInsightKeyDown('health')}
                  role="button"
                  tabIndex={0}
                  aria-label="Inspect Compliance Health"
                  className={`bg-card border border-border/85 rounded-2xl ${densityStyles.kpiPadding} hover:shadow-md hover:border-indigo-500/50 hover:scale-[1.02] cursor-pointer transition-all flex items-center gap-3.5 select-none ${
                    clickedItemId === 'health' ? 'scale-95 border-indigo-650 bg-indigo-500/10' : ''
                  }`}
                >
                  <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" className="text-muted/10" strokeWidth="3.5" />
                      <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" className="text-indigo-500" strokeWidth="3.5" strokeDasharray={`${2 * Math.PI * 18}`} strokeDashoffset={`${2 * Math.PI * 18 * (1 - (readinessScore || 0) / 100)}`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-[10px] font-black text-foreground">{readinessDisplay}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Compliance Health</span>
                    <span className="text-xl font-black text-foreground mt-0.5 block">{readinessDisplay}</span>
                    <span className="text-[9px] text-muted-foreground block font-bold leading-none mt-1">Current Snapshot</span>
                  </div>
                </div>
              );
            case 'requirements':
              return (
                <div
                  key="requirements"
                  onMouseEnter={handleMouseEnter('requirements')}
                  onMouseLeave={handleMouseLeave}
                  onFocus={handleMouseEnter('requirements')}
                  onBlur={handleMouseLeave}
                  onClick={() => handleItemClick('requirements', handleClick('requirements'))}
                  onKeyDown={handleInsightKeyDown('requirements')}
                  role="button"
                  tabIndex={0}
                  aria-label="Inspect Requirements"
                  className={`bg-card border border-border/85 rounded-2xl ${densityStyles.kpiPadding} hover:shadow-md hover:border-indigo-500/50 hover:scale-[1.02] cursor-pointer transition-all flex items-center gap-3.5 select-none ${
                    clickedItemId === 'requirements' ? 'scale-95 border-indigo-600 bg-indigo-500/10' : ''
                  }`}
                >
                  <div className="relative w-11 h-11 shrink-0 flex items-center justify-center bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 rounded-full">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Requirements</span>
                    <span className="text-xl font-black text-foreground mt-0.5 block">{stats.compliantCount} <span className="text-xs text-muted-foreground">/ {stats.activeRequirements}</span></span>
                    {stats.expiredCount > 0 ? (
                      <span className="text-[9px] text-rose-500 block font-bold leading-none mt-1">{stats.expiredCount} Overdue</span>
                    ) : (
                      <span className="text-[9px] text-emerald-500 block font-bold leading-none mt-1">All Compliant</span>
                    )}
                  </div>
                </div>
              );
            case 'evidence':
              return (
                <div
                  key="evidence"
                  onMouseEnter={handleMouseEnter('evidence')}
                  onMouseLeave={handleMouseLeave}
                  onFocus={handleMouseEnter('evidence')}
                  onBlur={handleMouseLeave}
                  onClick={() => handleItemClick('evidence', handleClick('evidence'))}
                  onKeyDown={handleInsightKeyDown('evidence')}
                  role="button"
                  tabIndex={0}
                  aria-label="Inspect Evidence Coverage"
                  className={`bg-card border border-border/85 rounded-2xl ${densityStyles.kpiPadding} hover:shadow-md hover:border-indigo-500/50 hover:scale-[1.02] cursor-pointer transition-all flex items-center gap-3.5 select-none ${
                    clickedItemId === 'evidence' ? 'scale-95 border-indigo-600 bg-indigo-500/10' : ''
                  }`}
                >
                  <div className="relative w-11 h-11 shrink-0 flex items-center justify-center bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 rounded-full">
                    <FolderLock className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Evidence Vault</span>
                    <span className="text-xl font-black text-foreground mt-0.5 block">{classifiedDocsCount} <span className="text-xs text-muted-foreground">/ {documentsCount}</span></span>
                    <span className="text-[9px] text-muted-foreground block font-bold leading-none mt-1">{100 - docProgress}% gap to target</span>
                  </div>
                </div>
              );
            case 'training':
              return (
                <div
                  key="training"
                  onMouseEnter={handleMouseEnter('training')}
                  onMouseLeave={handleMouseLeave}
                  onFocus={handleMouseEnter('training')}
                  onBlur={handleMouseLeave}
                  onClick={() => handleItemClick('training', handleClick('training'))}
                  onKeyDown={handleInsightKeyDown('training')}
                  role="button"
                  tabIndex={0}
                  aria-label="Inspect Personnel Training"
                  className={`bg-card border border-border/85 rounded-2xl ${densityStyles.kpiPadding} hover:shadow-md hover:border-indigo-500/50 hover:scale-[1.02] cursor-pointer transition-all flex items-center gap-3.5 select-none ${
                    clickedItemId === 'training' ? 'scale-95 border-indigo-600 bg-indigo-500/10' : ''
                  }`}
                >
                  <div className="relative w-11 h-11 shrink-0 flex items-center justify-center bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 rounded-full">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Training Rate</span>
                    <span className="text-xl font-black text-foreground mt-0.5 block">{competencySummary.compliancePercent}%</span>
                    <span className="text-[9px] text-muted-foreground block font-bold leading-none mt-1">Active qualifications</span>
                  </div>
                </div>
              );
            case 'tasks':
              return (
                <div
                  key="tasks"
                  onMouseEnter={handleMouseEnter('tasks')}
                  onMouseLeave={handleMouseLeave}
                  onFocus={handleMouseEnter('tasks')}
                  onBlur={handleMouseLeave}
                  onClick={() => handleItemClick('tasks', handleClick('tasks'))}
                  onKeyDown={handleInsightKeyDown('tasks')}
                  role="button"
                  tabIndex={0}
                  aria-label="Inspect Open Tasks and Gaps"
                  className={`bg-card border border-border/85 rounded-2xl ${densityStyles.kpiPadding} hover:shadow-md hover:border-indigo-500/50 hover:scale-[1.02] cursor-pointer transition-all flex items-center gap-3.5 select-none ${
                    clickedItemId === 'tasks' ? 'scale-95 border-indigo-650 bg-indigo-500/10' : ''
                  }`}
                >
                  <div className="relative w-11 h-11 shrink-0 flex items-center justify-center bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 rounded-full">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Action Items</span>
                    <span className="text-xl font-black text-foreground mt-0.5 block">{activeActionsCount}</span>
                    {overdueActionsCount > 0 ? (
                      <span className="text-[9px] text-rose-500 block font-bold leading-none mt-1">{overdueActionsCount} Overdue</span>
                    ) : (
                      <span className="text-[9px] text-muted-foreground block font-bold leading-none mt-1">Actions pending</span>
                    )}
                  </div>
                </div>
              );
            case 'asset':
              return (
                <div
                  key="asset"
                  onMouseEnter={handleMouseEnter('asset')}
                  onMouseLeave={handleMouseLeave}
                  onFocus={handleMouseEnter('asset')}
                  onBlur={handleMouseLeave}
                  onClick={() => handleItemClick('asset', handleClick('asset'))}
                  onKeyDown={handleInsightKeyDown('asset')}
                  role="button"
                  tabIndex={0}
                  aria-label="Inspect Asset Assurance"
                  className={`bg-card border border-border/85 rounded-2xl ${densityStyles.kpiPadding} hover:shadow-md hover:border-indigo-500/50 hover:scale-[1.02] cursor-pointer transition-all flex items-center gap-3.5 select-none ${
                    clickedItemId === 'asset' ? 'scale-95 border-indigo-650 bg-indigo-500/10' : ''
                  }`}
                >
                  <div className="relative w-11 h-11 shrink-0 flex items-center justify-center bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 rounded-full">
                    <Grid className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Asset Assurance</span>
                    <span className="text-xl font-black text-foreground mt-0.5 block">{compliantAssetChecks} <span className="text-xs text-muted-foreground">/ {totalAssetChecks}</span></span>
                    {overdueAssetChecksCount > 0 ? (
                      <span className="text-[9px] text-rose-500 block font-bold leading-none mt-1">{overdueAssetChecksCount} Expired</span>
                    ) : (
                      <span className="text-[9px] text-emerald-500 block font-bold leading-none mt-1">100% Compliant</span>
                    )}
                  </div>
                </div>
              );
            default:
              return null;
          }
        })}
    </div>
  );
}

// 3. SystemHeroMap Component
export function SystemHeroMap({
  viewMode,
  setViewMode,
  activeViewMode,
  showPathsAndSatellites,
  satelliteNodes,
  hoveredNode,
  setHoveredNode,
  getNodeStatusTone,
  clickedItemId,
  handleItemClick,
  handleClick,
  handleMouseLeave,
  getInsightData,
  setHoveredInsight,
  hoverTimeoutRef,
  activeInsightDrawer,
  isMotionReduced,
  customization,
  readinessScore,
  readinessDisplay,
  readinessLabel,
  segmentedRingPaths,
  prevCustomization,
  setCustomization,
  user,
  organization,
  setToast,
  stats,
  competencyRecords,
  unclassifiedDocs,
  overdueAssetChecks,
  handleInsightKeyDown
}: {
  viewMode: 'system' | 'list';
  setViewMode: (v: 'system' | 'list') => void;
  activeViewMode: 'system' | 'list';
  showPathsAndSatellites: boolean;
  satelliteNodes: any[];
  hoveredNode: string | null;
  setHoveredNode: (n: string | null) => void;
  getNodeStatusTone: (id: string) => any;
  clickedItemId: string | null;
  handleItemClick: (id: string, action?: () => void) => void;
  handleClick: (id: string) => () => void;
  handleMouseLeave: () => void;
  getInsightData: (id: string) => any;
  setHoveredInsight: (val: any) => void;
  hoverTimeoutRef: any;
  activeInsightDrawer: any;
  isMotionReduced: boolean;
  customization: any;
  readinessScore: number | null;
  readinessDisplay: string;
  readinessLabel: string;
  segmentedRingPaths: any[];
  prevCustomization: any;
  setCustomization: any;
  user: any;
  organization: any;
  setToast: any;
  stats: any;
  competencyRecords: any[];
  unclassifiedDocs: any[];
  overdueAssetChecks: any[];
  handleInsightKeyDown: (id: string) => (e: any) => void;
}) {
  const router = useRouter();

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
      {/* Header controls for central overview */}
      <div className="p-4 border-b border-border/60 bg-muted/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Compliance Program Overview</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Interactive program maps and status monitoring of system modules.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {prevCustomization && (
            <button
              onClick={() => {
                const key = `vygilence_dashboard_customization_${user?.id || 'anon'}_${organization?.id || 'default'}`;
                try {
                  localStorage.setItem(key, JSON.stringify(prevCustomization));
                  setCustomization(prevCustomization);
                  setViewMode(prevCustomization.heroStyle === 'list' ? 'list' : prevCustomization.defaultViewMode);
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
      <div className="p-5 relative">
        {activeViewMode === 'system' ? (
          <>
            <div 
              className="w-full max-w-[800px] aspect-[2/1] mx-auto relative select-none hidden md:block"
              style={{
                backgroundImage: 'radial-gradient(circle at center, rgba(99, 102, 241, 0.04) 0%, transparent 75%)'
              }}
            >
              {/* Background SVG connections */}
              <svg viewBox="0 0 800 400" className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <radialGradient id="hub-bg-gradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#030712" stopOpacity="0.0" />
                  </radialGradient>
                </defs>

                {/* Radial glow background around core hub */}
                <circle cx="400" cy="200" r="140" fill="url(#hub-bg-gradient)" />

                {/* Drawing pathways */}
                {showPathsAndSatellites && satelliteNodes.map(node => {
                  let pathD = '';
                  if (node.id === 'requirements') pathD = 'M 400 200 L 400 55';
                  else if (node.id === 'competencies') pathD = 'M 400 200 L 280 200 L 280 120 L 185 120';
                  else if (node.id === 'matrix') pathD = 'M 400 200 L 280 200 L 280 280 L 185 280';
                  else if (node.id === 'vault') pathD = 'M 400 200 L 520 200 L 520 120 L 615 120';
                  else if (node.id === 'audit-packs') pathD = 'M 400 200 L 520 200 L 520 280 L 615 280';
                  else if (node.id === 'reports') pathD = 'M 400 200 L 400 345';

                  const tone = getNodeStatusTone(node.id);
                  const bgStrokeColor =
                    tone === 'rose' ? 'stroke-rose-500/20' :
                    tone === 'amber' ? 'stroke-amber-500/20' :
                    tone === 'emerald' ? 'stroke-emerald-500/20' :
                    tone === 'indigo' ? 'stroke-indigo-500/20' :
                    'stroke-zinc-500/10';

                  const flowStrokeColor =
                    tone === 'rose' ? 'text-rose-500' :
                    tone === 'amber' ? 'text-amber-500' :
                    tone === 'emerald' ? 'text-emerald-500' :
                    tone === 'indigo' ? 'text-indigo-500' :
                    'text-indigo-500/40';

                  const isHovered = hoveredNode === node.id;

                  return (
                    <g key={node.id}>
                      {/* Background path with thin subtle opacity */}
                      <path
                        d={pathD}
                        fill="none"
                        className={`transition-all duration-300 stroke-[1.5] ${bgStrokeColor}`}
                      />
                      {/* Animated glowing data flow line */}
                      {!isMotionReduced && (
                        <path
                          d={pathD}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={`glowing-flow-line opacity-75 ${flowStrokeColor}`}
                          style={{ strokeLinecap: 'round' }}
                        />
                      )}
                      {/* Thick glow overlay when node is hovered */}
                      {isHovered && (
                        <path
                          d={pathD}
                          fill="none"
                          className={`opacity-60 dark:opacity-40 stroke-[4] animate-pulse drop-shadow-md transition-all ${
                            tone === 'rose' ? 'stroke-rose-500 dark:stroke-rose-400' :
                            tone === 'amber' ? 'stroke-amber-500 dark:stroke-amber-400' :
                            tone === 'emerald' ? 'stroke-emerald-500 dark:stroke-emerald-400' :
                            tone === 'indigo' ? 'stroke-indigo-500 dark:stroke-indigo-400' :
                            'stroke-indigo-500 dark:stroke-indigo-400'
                          }`}
                          style={{ strokeLinecap: 'round' }}
                        />
                      )}
                    </g>
                  );
                })}

                {/* Upgraded Layered Concentric Rings with Clockwise and Counter-Clockwise Orbiting Dashed Borders */}
                {/* Ring 1: Outer dashed ring (clockwise slow spin) */}
                <circle
                  cx="400"
                  cy="200"
                  r="90"
                  className="stroke-indigo-500/20 dark:stroke-indigo-500/10"
                  strokeWidth="1.5"
                  fill="none"
                  strokeDasharray="2 16"
                  style={{ transformOrigin: '400px 200px', animation: isMotionReduced ? 'none' : 'spin-clockwise 45s linear infinite' }}
                />
                {/* Ring 2: Medium dashed ring (clockwise spin) */}
                <circle
                  cx="400"
                  cy="200"
                  r="76"
                  className="stroke-indigo-500/30 dark:stroke-indigo-500/15"
                  strokeWidth="1"
                  fill="none"
                  strokeDasharray="4 8"
                  style={{ transformOrigin: '400px 200px', animation: isMotionReduced ? 'none' : 'spin-clockwise 60s linear infinite' }}
                />
                {/* Ring 3: Inner dashed ring (counter-clockwise spin) */}
                <circle
                  cx="400"
                  cy="200"
                  r="64"
                  className="stroke-cyan-500/30 dark:stroke-cyan-500/20"
                  strokeWidth="1"
                  fill="none"
                  strokeDasharray="12 6"
                  style={{ transformOrigin: '400px 200px', animation: isMotionReduced ? 'none' : 'spin-counter 40s linear infinite' }}
                />
                {/* Ring 4: Solid inner border */}
                <circle
                  cx="400"
                  cy="200"
                  r="54"
                  className="stroke-indigo-500/20 dark:stroke-indigo-500/10"
                  strokeWidth="1"
                  fill="none"
                />

                {/* Glowing circuit bends dots */}
                {showPathsAndSatellites && (
                  <>
                    <circle cx="280" cy="200" r="2.5" className="fill-indigo-500/70" />
                    <circle cx="280" cy="120" r="2.5" className="fill-indigo-500/70" />
                    <circle cx="280" cy="280" r="2.5" className="fill-indigo-500/70" />
                    <circle cx="520" cy="200" r="2.5" className="fill-indigo-500/70" />
                    <circle cx="520" cy="120" r="2.5" className="fill-indigo-500/70" />
                    <circle cx="520" cy="280" r="2.5" className="fill-indigo-500/70" />
                  </>
                )}

                {/* Central Glowing Orb Core (fill/glow) */}
                <circle
                  cx="400"
                  cy="200"
                  r="46"
                  className={`fill-card dark:fill-[#070A13] stroke-indigo-500 dark:stroke-indigo-400 ${customization.effectIntensity === 'subtle' ? '' : customization.effectIntensity === 'vibrant' ? 'drop-shadow-[0_0_12px_rgba(99,102,241,0.6)] dark:drop-shadow-[0_0_20px_rgba(99,102,241,1)]' : 'drop-shadow-[0_0_8px_rgba(99,102,241,0.3)] dark:drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]'} cursor-pointer hover:stroke-indigo-400 active:scale-95 transition-all ${
                    hoveredNode === 'hub' ? 'scale-105 drop-shadow-[0_0_12px_rgba(99,102,241,0.5)] dark:drop-shadow-[0_0_16px_rgba(99,102,241,0.8)]' : ''
                  } ${
                    (clickedItemId === 'hub' || activeInsightDrawer?.id === 'hub') ? 'scale-95 stroke-indigo-600 drop-shadow-[0_0_16px_rgba(99,102,241,0.8)]' : ''
                  }`}
                  style={{ transformOrigin: '400px 200px' }}
                  strokeWidth="2.5"
                  onMouseEnter={(e) => {
                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                    const rect = e.currentTarget.getBoundingClientRect();
                    const data = getInsightData('hub');
                    if (data) {
                      setHoveredInsight({
                        ...data,
                        x: rect.left + rect.width / 2,
                        y: rect.bottom + 8
                      });
                    }
                  }}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => handleItemClick('hub', handleClick('hub'))}
                  onFocus={(e) => {
                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                    const rect = e.currentTarget.getBoundingClientRect();
                    const data = getInsightData('hub');
                    if (data) {
                      setHoveredInsight({
                        ...data,
                        x: rect.left + rect.width / 2,
                        y: rect.bottom + 8
                      });
                    }
                  }}
                  onBlur={handleMouseLeave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleItemClick('hub', handleClick('hub'));
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Inspect workspace readiness"
                />

                {/* Slow spinning starburst emblem inside the core (watermark) */}
                <g style={{ transformOrigin: '400px 200px', animation: isMotionReduced ? 'none' : 'spin-clockwise 120s linear infinite' }} className="opacity-12 pointer-events-none">
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
                        stroke="currentColor"
                        strokeWidth={i % 2 === 0 ? "1.5" : "1"}
                        className="text-indigo-500"
                      />
                    );
                  })}
                </g>

                {/* Animated warning exit pulses */}
                {showPathsAndSatellites && [
                  { id: 'requirements', cx: 400, cy: 110, active: stats.expiredCount > 0, color: 'fill-rose-500' },
                  { id: 'competencies', cx: 280, cy: 120, active: competencyRecords.filter(r => r.status === 'Expired' || r.status === 'Missing').length > 0, color: 'fill-amber-500' },
                  { id: 'vault', cx: 520, cy: 120, active: unclassifiedDocs.length > 0, color: 'fill-amber-500' },
                  { id: 'matrix', cx: 280, cy: 280, active: overdueAssetChecks.length > 0, color: 'fill-rose-500' }
                ].map(p => {
                  if (!p.active) return null;
                  return (
                    <g key={p.id}>
                      <circle cx={p.cx} cy={p.cy} r="5" className={`${p.color} opacity-40`} />
                      {!isMotionReduced && (
                        <circle cx={p.cx} cy={p.cy} r="12" className={`${p.color} opacity-25 animate-ping`} style={{ transformOrigin: `${p.cx}px ${p.cy}px` }} />
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Central text overlay for score */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none flex flex-col items-center justify-center">
                <span className="text-[20px] font-black text-foreground leading-none">{readinessDisplay}</span>
                <span className={`text-[7px] font-black uppercase tracking-widest leading-none mt-1 ${scoreTone(readinessScore)}`}>
                  {readinessLabel}
                </span>
                <div className="flex items-center gap-1 mt-1 bg-emerald-500/10 border border-emerald-500/20 px-1 rounded-sm">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[6px] font-extrabold text-emerald-500 uppercase tracking-widest leading-none">Live</span>
                </div>
              </div>

              {/* Satellite Nodes mapping */}
              {showPathsAndSatellites && satelliteNodes.map(node => {
                let nodeX = 0;
                let nodeY = 0;
                if (node.id === 'requirements') { nodeX = 400; nodeY = 55; }
                else if (node.id === 'competencies') { nodeX = 185; nodeY = 120; }
                else if (node.id === 'matrix') { nodeX = 185; nodeY = 280; }
                else if (node.id === 'vault') { nodeX = 615; nodeY = 120; }
                else if (node.id === 'audit-packs') { nodeX = 615; nodeY = 280; }
                else if (node.id === 'reports') { nodeX = 400; nodeY = 345; }

                const tone = getNodeStatusTone(node.id);
                const isHovered = hoveredNode === node.id;
                const isFocused = clickedItemId === node.id || activeInsightDrawer?.id === node.id;

                const nodeColorClass =
                  tone === 'rose' ? 'border-rose-500 text-rose-500 bg-rose-500/5 hover:border-rose-400 hover:text-rose-400' :
                  tone === 'amber' ? 'border-amber-500 text-amber-500 bg-amber-500/5 hover:border-amber-400 hover:text-amber-400' :
                  tone === 'emerald' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5 hover:border-emerald-400 hover:text-emerald-400' :
                  tone === 'indigo' ? 'border-indigo-500 text-indigo-500 bg-indigo-500/5 hover:border-indigo-400 hover:text-indigo-400' :
                  'border-border text-foreground bg-card hover:border-indigo-500/40 hover:text-indigo-500';

                return (
                  <div
                    key={node.id}
                    className="absolute flex items-center gap-3 z-20 pointer-events-auto transition-transform duration-300"
                    style={{
                      left: `${nodeX}px`,
                      top: `${nodeY}px`,
                      transform: `translate(-24px, -24px) ${isHovered ? 'scale(1.05)' : 'scale(1)'}`
                    }}
                  >
                    <div
                      onMouseEnter={(e) => {
                        setHoveredNode(node.id);
                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                        const rect = e.currentTarget.getBoundingClientRect();
                        const data = getInsightData(node.id);
                        if (data) {
                          setHoveredInsight({
                            ...data,
                            x: rect.left + rect.width / 2,
                            y: rect.bottom + 8
                          });
                        }
                      }}
                      onMouseLeave={handleMouseLeave}
                      onClick={() => handleItemClick(node.id, handleClick(node.id))}
                      onFocus={(e) => {
                        setHoveredNode(node.id);
                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                        const rect = e.currentTarget.getBoundingClientRect();
                        const data = getInsightData(node.id);
                        if (data) {
                          setHoveredInsight({
                            ...data,
                            x: rect.left + rect.width / 2,
                            y: rect.bottom + 8
                          });
                        }
                      }}
                      onBlur={handleMouseLeave}
                      onKeyDown={handleInsightKeyDown(node.id)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Inspect ${node.name}`}
                      className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 shadow-xs cursor-pointer ${nodeColorClass} ${
                        isFocused ? 'ring-4 ring-indigo-500/20 scale-95 border-indigo-600' : ''
                      }`}
                    >
                      {node.icon}
                    </div>
                    <div className="flex flex-col text-left select-none pointer-events-none min-w-[140px] pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10.5px] font-black uppercase tracking-tight text-foreground leading-none">{node.name}</span>
                        {node.badge > 0 && (
                          <span className={`px-1.5 py-0.5 rounded-[3px] text-[7.5px] font-black leading-none ${node.badgeColor}`}>
                            {node.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[9.5px] text-muted-foreground font-semibold leading-tight mt-0.5">{node.metric}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Fallback list layout on small viewport sizes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:hidden">
              {satelliteNodes.map(node => {
                return (
                  <div
                    key={node.id}
                    onClick={() => handleItemClick(node.id, handleClick(node.id))}
                    className="p-3.5 bg-card border border-border/80 rounded-xl hover:border-indigo-500/30 transition-all flex items-center gap-3 cursor-pointer"
                  >
                    <div className={`p-2 bg-indigo-500/10 rounded-full text-indigo-500`}>
                      {node.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-foreground text-xs">{node.name}</span>
                        {node.badge > 0 && <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${node.badgeColor}`}>{node.badge}</span>}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{node.metric}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* List View layout */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground font-black text-[9px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Module Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Record Volume</th>
                  <th className="py-2.5 px-3">Attention Count</th>
                  <th className="py-2.5 px-3">Quick Link</th>
                </tr>
              </thead>
              <tbody>
                {satelliteNodes.map(node => {
                  const tone = getNodeStatusTone(node.id);
                  return (
                    <tr key={node.id} className="border-b border-border/30 hover:bg-muted/10 font-semibold transition-colors">
                      <td className="py-3 px-3 flex items-center gap-2">
                        <div className="text-indigo-500">{node.icon}</div>
                        <span className="text-foreground font-extrabold">{node.name}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                          tone === 'rose' ? 'bg-rose-500' :
                          tone === 'amber' ? 'bg-amber-500' :
                          tone === 'emerald' ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`} />
                        <span className="text-[10px] capitalize font-extrabold">{tone === 'rose' ? 'Needs Attention' : tone === 'amber' ? 'Warning' : 'Compliant'}</span>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{node.count} records</td>
                      <td className="py-3 px-3 text-muted-foreground">{node.warnings} issues</td>
                      <td className="py-3 px-3">
                        <Link href={node.path} className="text-indigo-600 dark:text-indigo-400 hover:underline">Open view &rarr;</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// 4. RightIntelligenceRail Component
export function RightIntelligenceRail({
  readinessScore,
  readinessDisplay,
  stats,
  greyRequirementCount,
  overdueCount,
  thisWeekCount,
  dueThisMonthCount,
  notDueCount,
  safeActivity,
  upcomingAssetChecks,
  smartSuggestions,
  activeRailTab,
  setActiveRailTab,
  customization
}: {
  readinessScore: number | null;
  readinessDisplay: string;
  stats: any;
  greyRequirementCount: number;
  overdueCount: number;
  thisWeekCount: number;
  dueThisMonthCount: number;
  notDueCount: number;
  safeActivity: any[];
  upcomingAssetChecks: any[];
  smartSuggestions: string[];
  activeRailTab: 'focus' | 'upcoming' | 'action' | 'activity';
  setActiveRailTab: (tab: 'focus' | 'upcoming' | 'action' | 'activity') => void;
  customization: any;
}) {
  const router = useRouter();

  return (
    <div className="space-y-6 lg:col-span-1">
      {/* Section 1: Compliance Snapshot circular arc gauge */}
      {customization.visibleRightRailSections.includes('snapshot') && (
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex flex-col transition-all">
          <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Compliance Snapshot</span>
            <span className="flex items-center gap-1 text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" /> Live
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-225">
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="currentColor" className="text-muted/15" strokeWidth="8" strokeDasharray="180 360" strokeLinecap="round" />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="currentColor"
                  className="text-indigo-500 transition-all duration-500"
                  strokeWidth="8"
                  strokeDasharray="180 360"
                  strokeDashoffset={180 - (180 * (readinessScore || 0) / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-base font-black text-foreground">{readinessDisplay}</span>
                <span className="text-[7px] font-bold text-muted-foreground uppercase leading-none mt-0.5">Readiness</span>
              </div>
            </div>
            <div className="flex-1 space-y-1.5 text-[9.5px]">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" /> Compliant</span>
                <span className="text-foreground">{stats.compliantCount}</span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" /> At Risk</span>
                <span className="text-foreground">{stats.expiringSoonCount}</span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" /> Needs Action</span>
                <span className="text-foreground">{stats.expiredCount}</span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0" /> Unassessed</span>
                <span className="text-foreground">{greyRequirementCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Due & Overdue progress bars */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex flex-col transition-all">
        <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
          <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Due & Overdue</span>
          <span className="text-[9px] font-bold text-indigo-500 hover:underline cursor-pointer" onClick={() => router.push('/dashboard/requirements')}>View all</span>
        </div>
        <div className="space-y-2.5 text-[9.5px]">
          <div className="space-y-1">
            <div className="flex justify-between font-bold">
              <span className="text-muted-foreground">Overdue</span>
              <span className="text-foreground">{overdueCount}</span>
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div className="bg-rose-500 h-full rounded-full" style={{ width: `${stats.activeRequirements > 0 ? (overdueCount / stats.activeRequirements) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between font-bold">
              <span className="text-muted-foreground">Due this week</span>
              <span className="text-foreground">{thisWeekCount}</span>
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${stats.activeRequirements > 0 ? (thisWeekCount / stats.activeRequirements) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between font-bold">
              <span className="text-muted-foreground">Due this month</span>
              <span className="text-foreground">{dueThisMonthCount}</span>
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${stats.activeRequirements > 0 ? (dueThisMonthCount / stats.activeRequirements) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between font-bold">
              <span className="text-muted-foreground">Not due</span>
              <span className="text-foreground">{notDueCount}</span>
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${stats.activeRequirements > 0 ? (notDueCount / stats.activeRequirements) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Recent Activity timelines */}
      {customization.visibleRightRailSections.includes('activity') && (
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex flex-col transition-all">
          <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
            <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Recent Activity</span>
            <span className="text-[9px] font-bold text-indigo-500 hover:underline cursor-pointer" onClick={() => router.push('/dashboard/audit-trail')}>View all</span>
          </div>
          <div className="space-y-3">
            {safeActivity.map((log) => (
              <div key={log.id} className="flex gap-2.5 text-[9.5px]">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1" />
                <div className="flex-grow min-w-0 font-semibold">
                  <span className="text-foreground block font-bold leading-tight">{log.details || log.action}</span>
                  <span className="text-muted-foreground text-[8px] block mt-0.5">
                    {log.user_email?.split('@')[0] || 'User'} &bull; {new Date(log.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
            {safeActivity.length === 0 && (
              <p className="text-[9.5px] text-muted-foreground italic text-center py-4">No recent activity logged.</p>
            )}
          </div>
        </div>
      )}

      {/* Section 4: Expiring Soon Checks list */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex flex-col transition-all">
        <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
          <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Expiring Soon</span>
        </div>
        <div className="space-y-2.5">
          {upcomingAssetChecks.slice(0, 3).map((item) => (
            <div key={item.id} className="flex items-center justify-between text-[9.5px] font-bold">
              <span className="text-muted-foreground truncate max-w-[140px]">{item.requirement.title}</span>
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded font-black text-[8px] uppercase">
                {item.requirement.next_due_date ? new Date(item.requirement.next_due_date).toLocaleDateString() : 'Soon'}
              </span>
            </div>
          ))}
          {upcomingAssetChecks.length === 0 && (
            <p className="text-[9.5px] text-muted-foreground italic text-center py-4">No assets expiring in the next week.</p>
          )}
        </div>
      </div>

      {/* Section 5: Suggested Focus gradient box */}
      {customization.visibleRightRailSections.includes('focus') && (
        <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-xl p-4.5 shadow-md space-y-3.5 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />
          <div className="space-y-1">
            <span className="text-[8px] font-black uppercase tracking-widest text-indigo-300">System Insights</span>
            <h4 className="text-xs font-black leading-tight text-white">Suggested Focus</h4>
          </div>
          <div className="space-y-2">
            {smartSuggestions.slice(0, 2).map((sug, idx) => (
              <div key={idx} className="flex gap-2 text-[10px] font-semibold leading-normal text-indigo-100">
                <span className="text-indigo-300 shrink-0">&bull;</span>
                <p>{sug}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push('/dashboard/reports')}
            className="w-full py-1.5 bg-indigo-650 hover:bg-indigo-500 text-white text-[10px] font-black rounded-lg transition-colors cursor-pointer text-center"
          >
            View Insights
          </button>
        </div>
      )}
    </div>
  );
}

// 5. LowerAnalytics Component
export function LowerAnalytics({
  customization,
  densityStyles,
  getTrendData,
  readinessScore,
  readinessDisplay,
  stats,
  greyRequirementCount,
  competencySummary
}: {
  customization: any;
  densityStyles: any;
  getTrendData: () => any;
  readinessScore: number | null;
  readinessDisplay: string;
  stats: any;
  greyRequirementCount: number;
  competencySummary: any;
}) {
  const router = useRouter();

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 ${densityStyles.gridGap}`}>
      {/* Card 1: Compliance Trend Line Chart */}
      {customization.visiblePanels.includes('trend') && (
        <div className={`bg-card border border-border rounded-xl ${densityStyles.cardPadding} shadow-xs flex flex-col justify-between transition-all duration-300`}>
          <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Compliance Trend</span>
            <span className="text-[9px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">Historical</span>
          </div>
          <div className="relative w-full h-24 flex flex-col justify-center py-1">
            <svg viewBox="0 0 300 120" className="w-full h-full">
              <line x1="0" y1="20" x2="300" y2="20" className="stroke-border/40" strokeWidth="1" strokeDasharray="2 4" />
              <line x1="0" y1="50" x2="300" y2="50" className="stroke-border/40" strokeWidth="1" strokeDasharray="2 4" />
              <line x1="0" y1="80" x2="300" y2="80" className="stroke-border/40" strokeWidth="1" strokeDasharray="2 4" />
              <line x1="0" y1="110" x2="300" y2="110" className="stroke-border/40" strokeWidth="1" strokeDasharray="2 4" />
              
              {getTrendData().areaD && (
                <path d={getTrendData().areaD} className="fill-indigo-500/10" />
              )}
              
              {getTrendData().pathD && (
                <path d={getTrendData().pathD} fill="none" className="stroke-indigo-500" strokeWidth="2.5" strokeLinecap="round" />
              )}

              {getTrendData().points.map((pt: any, idx: number) => (
                <g key={idx}>
                  <circle cx={pt.cx} cy={pt.cy} r="3.5" className="fill-indigo-600 stroke-card" strokeWidth="1.5" />
                  <text x={pt.cx} y={pt.cy - 7} textAnchor="middle" className="text-[8px] font-extrabold fill-foreground">{pt.score}%</text>
                </g>
              ))}
            </svg>
          </div>
          <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase px-2.5 mt-2">
            {getTrendData().labels.map((lbl: string, idx: number) => (
              <span key={idx}>{lbl}</span>
            ))}
          </div>
        </div>
      )}

      {/* Card 2: Requirement Status Donut Chart */}
      {customization.visiblePanels.includes('statusDonut') && (
        <div className={`bg-card border border-border rounded-xl ${densityStyles.cardPadding} shadow-xs flex flex-col justify-between transition-all duration-300`}>
          <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Requirement Status</span>
            <span className="text-[9px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">Active</span>
          </div>
          <div className="flex items-center justify-between gap-3 py-1">
            <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle cx="50" cy="50" r="36" fill="transparent" stroke="currentColor" className="text-muted/10" strokeWidth="11" />
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
                  <title>{`Compliant: ${stats.compliantCount} objectives.`}</title>
                </circle>
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
                  <title>{`At Risk: ${stats.expiringSoonCount} requirements.`}</title>
                </circle>
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
                  <title>{`Needs Attention: ${stats.expiredCount} requirements.`}</title>
                </circle>
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
                  <title>{`Not Assessed: ${greyRequirementCount} requirements.`}</title>
                </circle>
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-base font-black text-foreground">{stats.activeRequirements}</span>
                <span className="text-[7px] font-bold text-muted-foreground uppercase">Total</span>
              </div>
            </div>

            <div className="flex-grow space-y-1 text-[9.5px]">
              <button
                onClick={() => router.push('/dashboard/requirements?status=GREEN')}
                className="w-full flex items-center justify-between font-bold hover:bg-muted/30 p-1 rounded transition-all text-left"
              >
                <span className="flex items-center gap-1 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" /> Compliant</span>
                <span className="text-foreground">{stats.compliantCount}</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/requirements?status=AMBER')}
                className="w-full flex items-center justify-between font-bold hover:bg-muted/30 p-1 rounded transition-all text-left"
              >
                <span className="flex items-center gap-1 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" /> At Risk</span>
                <span className="text-foreground">{stats.expiringSoonCount}</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/requirements?status=RED')}
                className="w-full flex items-center justify-between font-bold hover:bg-muted/30 p-1 rounded transition-all text-left"
              >
                <span className="flex items-center gap-1 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" /> Alert</span>
                <span className="text-foreground">{stats.expiredCount}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card 3: Audit Readiness speedometer gauge */}
      {customization.visiblePanels.includes('readinessGauge') && (
        <div className={`bg-card border border-border rounded-xl ${densityStyles.cardPadding} shadow-xs flex flex-col justify-between transition-all duration-300`}>
          <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Audit Readiness</span>
            <span className="text-[9px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">Speedometer</span>
          </div>
          <div className="flex items-center justify-between gap-3 py-1">
            <div className="relative w-24 h-14 flex items-end justify-center shrink-0 overflow-hidden">
              <svg viewBox="0 0 100 50" className="w-full h-full">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" className="stroke-muted/15" strokeWidth="11" strokeLinecap="round" />
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  className="stroke-amber-500 transition-all duration-500"
                  strokeWidth="11"
                  strokeDasharray="125.6"
                  strokeDashoffset={125.6 - (125.6 * (readinessScore || 0) / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-end text-center pb-0.5">
                <span className="text-sm font-black text-foreground leading-none">{readinessDisplay}</span>
                <span className="text-[7px] font-bold text-muted-foreground uppercase leading-none mt-1">Ready</span>
              </div>
            </div>
            <div className="flex-1 text-[9.5px] font-semibold space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Due soon</span>
                <span className="text-foreground">{stats.expiringSoonCount}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Overdue</span>
                <span className="text-rose-500 font-extrabold">{stats.expiredCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card 4: Training Completion progress ring */}
      {customization.visiblePanels.includes('trainingRing') && (
        <div className={`bg-card border border-border rounded-xl ${densityStyles.cardPadding} shadow-xs flex flex-col justify-between transition-all duration-300`}>
          <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Training Completion</span>
            <span className="text-[9px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">Qualifications</span>
          </div>
          <div className="flex items-center justify-between gap-3 py-1">
            <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="currentColor" className="text-muted/10" strokeWidth="9" />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="9"
                  strokeDasharray="238.7"
                  strokeDashoffset={238.7 - (238.7 * (competencySummary.compliancePercent || 0) / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-sm font-black text-foreground">{competencySummary.compliancePercent}%</span>
                <span className="text-[6px] font-bold text-muted-foreground uppercase leading-none mt-0.5">Rate</span>
              </div>
            </div>
            <div className="flex-grow text-[9.5px] font-semibold space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Completed</span>
                <span className="text-foreground">{competencySummary.compliantCount}</span>
              </div>
              <div className="flex justify-between text-rose-500">
                <span>Expired/Miss</span>
                <span className="font-extrabold">{competencySummary.expiredCount + competencySummary.missingCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 6. LowerDetails Component
export function LowerDetails({
  customization,
  densityStyles,
  activeRequirements,
  actions,
  unclassifiedDocs,
  overdueAssetChecks,
  stats,
  assetCategoryCompliance,
  setIsUploadModalOpen,
  setActiveQuickActionModal
}: {
  customization: any;
  densityStyles: any;
  activeRequirements: any[];
  actions: any[];
  unclassifiedDocs: any[];
  overdueAssetChecks: any[];
  stats: any;
  assetCategoryCompliance: any[];
  setIsUploadModalOpen: (v: boolean) => void;
  setActiveQuickActionModal: (v: any) => void;
}) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left panel: Frameworks compliance and Asset category (spans 2 columns) */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
            <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Framework Compliance</span>
            <span className="text-[9px] font-bold text-indigo-500 hover:underline cursor-pointer" onClick={() => router.push('/dashboard/requirements')}>View all</span>
          </div>
          <div className="space-y-3">
            {[
              { name: 'ISO 9001:2015', progress: 92 },
              { name: 'ISO 14001:2015', progress: 89 },
              { name: 'ISO 45001:2018', progress: 85 },
              { name: 'SOC 2 Type II', progress: 90 }
            ].map(fw => (
              <div key={fw.name} className="space-y-1">
                <div className="flex justify-between text-[9.5px] font-bold">
                  <span className="text-muted-foreground">{fw.name}</span>
                  <span className="text-foreground">{fw.progress}%</span>
                </div>
                <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${fw.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Asset Category list */}
        {customization.visiblePanels.includes('assetCategory') && (
          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
              <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Asset Category Health</span>
              <span className="text-[9px] font-bold text-indigo-500 hover:underline cursor-pointer" onClick={() => router.push('/dashboard/matrix')}>View all</span>
            </div>
            <div className="space-y-3">
              {assetCategoryCompliance.slice(0, 4).map(cat => (
                <div key={cat.id} className="space-y-1">
                  <div className="flex justify-between text-[9.5px] font-bold">
                    <span className="text-muted-foreground">{cat.name}</span>
                    <span className="text-foreground">{cat.compliancePercent}%</span>
                  </div>
                  <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${cat.compliancePercent}%` }} />
                  </div>
                </div>
              ))}
              {assetCategoryCompliance.length === 0 && (
                <p className="text-[9.5px] text-muted-foreground italic text-center py-4">No asset category data available.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Middle panel: Top Risk Areas (spans 1 column) */}
      <div className="lg:col-span-1">
        {customization.visiblePanels.includes('riskGaps') && (
          <div className="bg-card border border-border rounded-xl p-4 shadow-xs h-full flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
              <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Top Risk Areas</span>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Supplier Management', risk: 'High', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
                { name: 'Document Control', risk: 'High', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
                { name: 'Incident Management', risk: 'Medium', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
                { name: 'Asset Maintenance', risk: 'Medium', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' }
              ].map(area => (
                <div key={area.name} className="flex items-center justify-between text-[9.5px] font-bold">
                  <span className="text-muted-foreground truncate max-w-[130px]">{area.name}</span>
                  <span className={`px-2 py-0.5 border rounded text-[8px] font-black uppercase ${area.color}`}>{area.risk}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => router.push('/dashboard/reports')}
              className="w-full mt-4 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border text-[9.5px] font-black rounded-lg transition-colors cursor-pointer text-center"
            >
              Analyze Risks
            </button>
          </div>
        )}
      </div>

      {/* Right panel: Active alerts + Discreet Quick Upload Dropzone (spans 1 column) */}
      <div className="lg:col-span-1 space-y-6">
        {customization.visiblePanels.includes('alerts') && (
          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
              <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Active Alerts</span>
            </div>
            <div className="space-y-2.5">
              {stats.expiredCount > 0 && (
                <Link
                  href="/dashboard/requirements?status=RED"
                  className="flex items-start gap-2 p-2 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 hover:border-rose-500/30 rounded-xl transition-all cursor-pointer block"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block text-rose-600 dark:text-rose-400 text-[9.5px]">{stats.expiredCount} expired objectives</span>
                    <p className="text-[8px] text-muted-foreground leading-normal mt-0.5">Framework requirements require current evidence files.</p>
                  </div>
                </Link>
              )}
              {overdueAssetChecks.length > 0 && (
                <Link
                  href="/dashboard/matrix"
                  className="flex items-start gap-2 p-2 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 hover:border-rose-500/30 rounded-xl transition-all cursor-pointer block"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block text-rose-600 dark:text-rose-400 text-[9.5px]">{overdueAssetChecks.length} expired asset checks</span>
                    <p className="text-[8px] text-muted-foreground leading-normal mt-0.5">Assigned checks require active record logging.</p>
                  </div>
                </Link>
              )}
              {unclassifiedDocs.length > 0 && (
                <Link
                  href="/dashboard/vault?status=Unclassified"
                  className="flex items-start gap-2 p-2 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 hover:border-amber-500/30 rounded-xl transition-all cursor-pointer block"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block text-amber-600 dark:text-amber-400 text-[9.5px]">{unclassifiedDocs.length} unclassified files</span>
                    <p className="text-[8px] text-muted-foreground leading-normal mt-0.5">Vault documents pending category selection.</p>
                  </div>
                </Link>
              )}
              {stats.expiredCount === 0 && overdueAssetChecks.length === 0 && unclassifiedDocs.length === 0 && (
                <p className="text-[9.5px] text-muted-foreground italic text-center py-6">No critical alerts detected.</p>
              )}
            </div>
          </div>
        )}

        {/* Upgraded Discreet Dropzone Card */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="mb-3">
            <h3 className="text-[10px] font-black text-foreground uppercase tracking-wider">Discreet Dropzone</h3>
            <p className="text-[9px] text-muted-foreground mt-0.5">Directly upload files onto the compliance vault.</p>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="w-full py-5 bg-muted/40 hover:bg-card border border-dashed border-border/80 hover:border-indigo-500/60 rounded-xl text-center transition-all group cursor-pointer"
          >
            <div className="flex flex-col items-center justify-center gap-2">
              <Upload className="w-5 h-5 text-indigo-500 group-hover:animate-bounce shrink-0" />
              <span className="font-extrabold text-[10px] text-foreground block">Select or Drop Files</span>
              <span className="text-[8px] text-muted-foreground">Classifies privately on drop</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
