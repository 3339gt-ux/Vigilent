'use client';

import React, { useState } from 'react';
import {
  ClipboardList,
  UserCheck,
  Grid,
  FolderLock,
  FolderArchive,
  BarChart3
} from 'lucide-react';

interface ComplianceHeroCoreProps {
  theme: 'light' | 'dark' | 'midtone';
  readinessScore: number | null;
  readinessLabel: string;
  isMotionReduced: boolean;
  effectIntensity: 'subtle' | 'standard' | 'vibrant';
  heroAccent?: 'default' | 'cyan-emerald' | 'blue-amber' | 'violet-rose' | 'rainbow' | 'gold-amber' | 'neon-green' | 'sunset-orange' | 'slate-monochrome';
  heroLayoutPreset?: 'balanced-orbit' | 'wide-command-map' | 'compact-core' | 'operations-focus' | 'presentation-mode';
  dragEnabled?: boolean;
  customPositions?: Record<string, { x: number; y: number }>;
  onCustomPositionsChange?: (positions: Record<string, { x: number; y: number }>) => void;

  // Real data mappings
  requirementsData: { active: number; compliant: number; warnings: number; percent: number; metricText: string };
  vaultData: { total: number; classified: number; warnings: number; percent: number; metricText: string };
  competencyData: { total: number; warnings: number; percent: number; metricText: string };
  matrixData: { total: number; compliant: number; warnings: number; percent: number; metricText: string };
  auditPacksData: { total: number; ready: number; warnings: number; percent: number; metricText: string };
  reportsData: { total: number; metricText: string };

  // Interactivity handlers
  onNodeMouseEnter: (id: string, element: SVGGElement) => void;
  onNodeMouseLeave: () => void;
  onNodeClick: (id: string) => void;

  // Customisation options
  heroVisualMode?: 'standard' | 'detailed' | 'showcase' | 'minimal';
  heroNodeDisplayLevel?: 'icons-only' | 'icons-labels' | 'icons-labels-metrics' | 'full-detail';
  heroCentralOrbContent?: 'overall-score' | 'score-status' | 'score-top-gap' | 'score-evidence-health' | 'score-action-count' | 'rotating-snapshot';
  showMinorNodes?: boolean;
  visibleHeroNodes?: string[];
}

interface NodeLayout {
  x: number;
  y: number;
  side: 'left' | 'right';
  mainPath: string;
  subPaths?: string[];
  junctions?: { cx: number; cy: number }[];
}

const PRESETS: Record<'default' | 'hexagon' | 'orbit' | 'wide', Record<string, NodeLayout>> = {
  default: {
    requirements: {
      x: 220,
      y: 100,
      side: 'left',
      mainPath: "M 405 205 L 370 170 L 310 170 L 260 120 L 220 120",
      subPaths: ["M 415 215 L 380 180 L 315 180 L 270 135 L 240 135"],
      junctions: [{ cx: 370, cy: 170 }]
    },
    competencies: {
      x: 110,
      y: 300,
      side: 'left',
      mainPath: "M 380 300 L 130 300",
      subPaths: [
        "M 375 292 L 340 292 L 330 300 L 260 300 L 250 292 L 160 292",
        "M 375 308 L 340 308 L 330 300 L 260 300 L 250 308 L 160 308"
      ],
      junctions: [{ cx: 350, cy: 300 }]
    },
    matrix: {
      x: 220,
      y: 500,
      side: 'left',
      mainPath: "M 405 395 L 370 430 L 310 430 L 260 480 L 220 480",
      subPaths: ["M 415 385 L 380 420 L 315 420 L 270 465 L 240 465"],
      junctions: [{ cx: 370, cy: 430 }]
    },
    vault: {
      x: 780,
      y: 100,
      side: 'right',
      mainPath: "M 595 205 L 630 170 L 690 170 L 740 120 L 780 120",
      subPaths: ["M 585 215 L 620 180 L 685 180 L 730 135 L 760 135"],
      junctions: [{ cx: 630, cy: 170 }]
    },
    'audit-packs': {
      x: 890,
      y: 300,
      side: 'right',
      mainPath: "M 620 300 L 870 300",
      subPaths: [
        "M 625 292 L 660 292 L 670 300 L 740 300 L 750 292 L 840 292",
        "M 625 308 L 660 308 L 670 300 L 740 300 L 750 308 L 840 308"
      ],
      junctions: [{ cx: 650, cy: 300 }]
    },
    reports: {
      x: 780,
      y: 500,
      side: 'right',
      mainPath: "M 595 395 L 630 430 L 690 430 L 740 480 L 780 480",
      subPaths: ["M 585 385 L 620 420 L 685 420 L 730 465 L 760 465"],
      junctions: [{ cx: 630, cy: 430 }]
    }
  },
  hexagon: {
    requirements: {
      x: 350,
      y: 60,
      side: 'left',
      mainPath: "M 450 240 L 350 60",
      subPaths: ["M 456 248 L 356 68"],
      junctions: []
    },
    competencies: {
      x: 150,
      y: 300,
      side: 'left',
      mainPath: "M 420 300 L 150 300",
      subPaths: ["M 420 292 L 150 292", "M 420 308 L 150 308"],
      junctions: [{ cx: 285, cy: 300 }]
    },
    matrix: {
      x: 350,
      y: 540,
      side: 'left',
      mainPath: "M 450 360 L 350 540",
      subPaths: ["M 456 352 L 356 532"],
      junctions: []
    },
    vault: {
      x: 650,
      y: 60,
      side: 'right',
      mainPath: "M 550 240 L 650 60",
      subPaths: ["M 544 248 L 644 68"],
      junctions: []
    },
    'audit-packs': {
      x: 850,
      y: 300,
      side: 'right',
      mainPath: "M 580 300 L 850 300",
      subPaths: ["M 580 292 L 850 292", "M 580 308 L 850 308"],
      junctions: [{ cx: 715, cy: 300 }]
    },
    reports: {
      x: 650,
      y: 540,
      side: 'right',
      mainPath: "M 550 360 L 650 540",
      subPaths: ["M 544 352 L 644 532"],
      junctions: []
    }
  },
  orbit: {
    requirements: {
      x: 360,
      y: 170,
      side: 'left',
      mainPath: "M 450 250 L 360 170",
      subPaths: ["M 456 256 L 366 176"],
      junctions: []
    },
    competencies: {
      x: 300,
      y: 300,
      side: 'left',
      mainPath: "M 430 300 L 300 300",
      subPaths: ["M 430 294 L 300 294", "M 430 306 L 300 306"],
      junctions: []
    },
    matrix: {
      x: 360,
      y: 430,
      side: 'left',
      mainPath: "M 450 350 L 360 430",
      subPaths: ["M 456 344 L 366 424"],
      junctions: []
    },
    vault: {
      x: 640,
      y: 170,
      side: 'right',
      mainPath: "M 550 250 L 640 170",
      subPaths: ["M 544 256 L 634 176"],
      junctions: []
    },
    'audit-packs': {
      x: 700,
      y: 300,
      side: 'right',
      mainPath: "M 570 300 L 700 300",
      subPaths: ["M 570 294 L 700 294", "M 570 306 L 700 306"],
      junctions: []
    },
    reports: {
      x: 640,
      y: 430,
      side: 'right',
      mainPath: "M 550 350 L 640 430",
      subPaths: ["M 544 344 L 634 424"],
      junctions: []
    }
  },
  wide: {
    requirements: {
      x: 180,
      y: 80,
      side: 'left',
      mainPath: "M 405 205 L 360 160 L 280 160 L 220 100 L 180 100",
      subPaths: ["M 415 215 L 370 170 L 285 170 L 230 115 L 180 115"],
      junctions: [{ cx: 360, cy: 160 }, { cx: 220, cy: 100 }]
    },
    competencies: {
      x: 80,
      y: 300,
      side: 'left',
      mainPath: "M 380 300 L 100 300",
      subPaths: ["M 375 292 L 100 292", "M 375 308 L 100 308"],
      junctions: [{ cx: 240, cy: 300 }]
    },
    matrix: {
      x: 180,
      y: 520,
      side: 'left',
      mainPath: "M 405 395 L 360 440 L 280 440 L 220 500 L 180 500",
      subPaths: ["M 415 385 L 370 430 L 285 430 L 230 485 L 180 485"],
      junctions: [{ cx: 360, cy: 440 }, { cx: 220, cy: 500 }]
    },
    vault: {
      x: 820,
      y: 80,
      side: 'right',
      mainPath: "M 595 205 L 640 160 L 720 160 L 780 100 L 820 100",
      subPaths: ["M 585 215 L 630 170 L 715 170 L 770 115 L 820 115"],
      junctions: [{ cx: 640, cy: 160 }, { cx: 780, cy: 100 }]
    },
    'audit-packs': {
      x: 920,
      y: 300,
      side: 'right',
      mainPath: "M 620 300 L 900 300",
      subPaths: ["M 625 292 L 900 292", "M 625 308 L 900 308"],
      junctions: [{ cx: 760, cy: 300 }]
    },
    reports: {
      x: 820,
      y: 520,
      side: 'right',
      mainPath: "M 595 395 L 640 440 L 720 440 L 780 500 L 820 500",
      subPaths: ["M 585 385 L 620 420 L 685 420 L 730 465 L 760 465"],
      junctions: [{ cx: 640, cy: 440 }, { cx: 780, cy: 500 }]
    }
  }
};

export default function ComplianceHeroCore({
  theme,
  readinessScore,
  readinessLabel,
  isMotionReduced,
  effectIntensity,
  heroAccent = 'default',
  heroLayoutPreset = 'balanced-orbit',
  dragEnabled = false,
  customPositions,
  onCustomPositionsChange,
  requirementsData,
  vaultData,
  competencyData,
  matrixData,
  auditPacksData,
  reportsData,
  onNodeMouseEnter,
  onNodeMouseLeave,
  onNodeClick,
  heroVisualMode = 'standard',
  heroNodeDisplayLevel = 'icons-labels-metrics',
  heroCentralOrbContent = 'overall-score',
  showMinorNodes = true,
  visibleHeroNodes = ['requirements', 'vault', 'competencies', 'matrix', 'audit-packs', 'reports']
}: ComplianceHeroCoreProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isCoreHovered, setIsCoreHovered] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  // Central Orb calculation logic based on heroCentralOrbContent setting
  const orbContent = React.useMemo(() => {
    let mainText = readinessScore === null ? 'N/A' : `${readinessScore}%`;
    let labelText = 'READINESS SCORE';
    let statusText = `● ${readinessLabel}`;
    let statusColor = readinessScore === null ? colors.textLabel :
                      readinessScore >= 90 ? '#10b981' :
                      readinessScore >= 75 ? colors.cyanLine :
                      readinessScore >= 50 ? '#f59e0b' : '#ef4444';

    if (heroCentralOrbContent === 'score-status') {
      labelText = 'SYSTEM STATUS';
      statusText = `● STATUS: ${readinessLabel.toUpperCase()}`;
    } else if (heroCentralOrbContent === 'score-top-gap') {
      labelText = 'PENDING GAPS';
      const reqOpen = requirementsData.warnings;
      statusText = reqOpen > 0 ? `● ${reqOpen} REQS ATTN` : '● NO ACTIVE GAPS';
      statusColor = reqOpen > 0 ? '#ef4444' : '#10b981';
    } else if (heroCentralOrbContent === 'score-evidence-health') {
      mainText = `${vaultData.percent}%`;
      labelText = 'EVIDENCE HEALTH';
      statusText = `● ${vaultData.classified}/${vaultData.total} TAGGED`;
      statusColor = vaultData.warnings > 0 ? '#f59e0b' : '#10b981';
    } else if (heroCentralOrbContent === 'score-action-count') {
      labelText = 'ACTIVE ACTIONS';
      statusText = `● ${requirementsData.active} TASKS OPEN`;
      statusColor = requirementsData.active > 0 ? '#f59e0b' : '#10b981';
    }

    return { mainText, labelText, statusText, statusColor };
  }, [heroCentralOrbContent, readinessScore, readinessLabel, requirementsData, vaultData]);

  // Retrieve active preset layout config mapping to coordinates presets
  const mappedPresetKey = heroLayoutPreset === 'wide-command-map' ? 'wide' :
                          heroLayoutPreset === 'compact-core' ? 'default' :
                          heroLayoutPreset === 'operations-focus' ? 'hexagon' :
                          heroLayoutPreset === 'presentation-mode' ? 'orbit' : 'orbit';
  const activePreset = PRESETS[mappedPresetKey];

  // Helper to extract node position (customized vs preset default)
  const getNodePos = (nodeId: string) => {
    if (customPositions && customPositions[nodeId]) {
      return customPositions[nodeId];
    }
    const presetNode = activePreset[nodeId] || activePreset.requirements;
    return { x: presetNode.x, y: presetNode.y };
  };

  // Helper to dynamically calculate straight trace vector paths from core boundary (radius 124) to node center
  const getPathsForNode = (nodeId: string, currentX: number, currentY: number) => {
    const presetNode = activePreset[nodeId] || activePreset.requirements;
    // If it is at the preset default position, use the high-fidelity handcrafted layout path
    if (currentX === presetNode.x && currentY === presetNode.y) {
      return {
        mainPath: presetNode.mainPath,
        subPaths: presetNode.subPaths || [],
        junctions: presetNode.junctions || []
      };
    }

    const cx = 500;
    const cy = 300;
    const dx = currentX - cx;
    const dy = currentY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) {
      return { mainPath: '', subPaths: [], junctions: [] };
    }

    // Coordinates at core circle boundary (r=124)
    const bx = cx + (dx / dist) * 124;
    const by = cy + (dy / dist) * 124;

    const mainPath = `M ${bx.toFixed(1)} ${by.toFixed(1)} L ${currentX.toFixed(1)} ${currentY.toFixed(1)}`;

    // Parallel sub-traces offset perpendicularly by 8px
    const px = (-dy / dist) * 8;
    const py = (dx / dist) * 8;

    const subPaths: string[] = [];
    if (nodeId === 'competencies' || nodeId === 'audit-packs') {
      subPaths.push(`M ${(bx + px).toFixed(1)} ${(by + py).toFixed(1)} L ${(currentX + px).toFixed(1)} ${(currentY + py).toFixed(1)}`);
      subPaths.push(`M ${(bx - px).toFixed(1)} ${(by - py).toFixed(1)} L ${(currentX - px).toFixed(1)} ${(currentY - py).toFixed(1)}`);
    } else {
      const offsetDir = currentY < cy ? 1 : -1;
      subPaths.push(`M ${(bx + px * offsetDir).toFixed(1)} ${(by + py * offsetDir).toFixed(1)} L ${(currentX + px * offsetDir).toFixed(1)} ${(currentY + py * offsetDir).toFixed(1)}`);
    }

    // HUD junction dot along the connector line at 35% distance
    const ratio = 0.35;
    const jx = bx + (currentX - bx) * ratio;
    const jy = by + (currentY - by) * ratio;
    const junctions = [{ cx: jx, cy: jy }];

    return { mainPath, subPaths, junctions };
  };

  // Drag-and-drop mouse/pointer handlers
  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    if (!dragEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggingNodeId(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragEnabled || !draggingNodeId) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();

    // Scale screen space to viewBox 1000x600 coordinates
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 600);

    // Clamping to prevent dragging off-screen
    const clampedX = Math.max(50, Math.min(950, x));
    const clampedY = Math.max(50, Math.min(550, y));

    // Keep distance from central core to prevent excessive overlapping
    const cx = 500;
    const cy = 300;
    const dx = clampedX - cx;
    const dy = clampedY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let finalX = clampedX;
    let finalY = clampedY;
    if (dist < 165) {
      if (dist === 0) {
        finalX = cx - 165;
      } else {
        finalX = Math.round(cx + (dx / dist) * 165);
        finalY = Math.round(cy + (dy / dist) * 165);
      }
    }

    const currentPositions = { ...customPositions } as Record<string, { x: number; y: number }>;
    // Seed default positions if not present
    for (const key of Object.keys(activePreset)) {
      if (!currentPositions[key]) {
        currentPositions[key] = { x: activePreset[key].x, y: activePreset[key].y };
      }
    }

    // Check collision with other nodes (minimum distance 75px)
    let hasCollision = false;
    for (const [key, pos] of Object.entries(currentPositions)) {
      if (key !== draggingNodeId) {
        const ndx = finalX - pos.x;
        const ndy = finalY - pos.y;
        const ndist = Math.sqrt(ndx * ndx + ndy * ndy);
        if (ndist < 75) {
          hasCollision = true;
          break;
        }
      }
    }

    if (!hasCollision) {
      currentPositions[draggingNodeId] = { x: finalX, y: finalY };
      if (onCustomPositionsChange) {
        onCustomPositionsChange(currentPositions);
      }
    }
  };

  const handleMouseUpOrLeave = () => {
    setDraggingNodeId(null);
  };

  // Configuration for Hero Color Customization Variables
  const getAccentStyles = () => {
    switch (heroAccent) {
      case 'cyan-emerald':
        return {
          primary: '#0891b2',
          secondary: '#059669',
          primaryMuted: 'rgba(8, 145, 178, 0.35)',
          secondaryMuted: 'rgba(5, 150, 105, 0.35)',
          gradStop1: '#0891b2',
          gradStop2: '#059669',
          glow: 'rgba(8, 145, 178, 0.45)',
        };
      case 'blue-amber':
        return {
          primary: '#1d4ed8',
          secondary: '#b45309',
          primaryMuted: 'rgba(29, 78, 216, 0.35)',
          secondaryMuted: 'rgba(180, 83, 9, 0.35)',
          gradStop1: '#1d4ed8',
          gradStop2: '#b45309',
          glow: 'rgba(29, 78, 216, 0.45)',
        };
      case 'violet-rose':
        return {
          primary: '#7c3aed',
          secondary: '#be185d',
          primaryMuted: 'rgba(124, 58, 237, 0.35)',
          secondaryMuted: 'rgba(190, 24, 93, 0.35)',
          gradStop1: '#7c3aed',
          gradStop2: '#be185d',
          glow: 'rgba(124, 58, 237, 0.45)',
        };
      case 'rainbow':
        return {
          primary: '#00f0ff',
          secondary: '#f43f5e',
          primaryMuted: 'rgba(0, 240, 255, 0.35)',
          secondaryMuted: 'rgba(244, 63, 94, 0.35)',
          gradStop1: '#00f0ff',
          gradStop2: '#f43f5e',
          glow: 'rgba(0, 240, 255, 0.5)',
        };
      case 'gold-amber':
        return {
          primary: '#eab308',
          secondary: '#d97706',
          primaryMuted: 'rgba(234, 179, 8, 0.35)',
          secondaryMuted: 'rgba(217, 119, 6, 0.35)',
          gradStop1: '#eab308',
          gradStop2: '#d97706',
          glow: 'rgba(234, 179, 8, 0.45)',
        };
      case 'neon-green':
        return {
          primary: '#10b981',
          secondary: '#84cc16',
          primaryMuted: 'rgba(16, 185, 129, 0.35)',
          secondaryMuted: 'rgba(132, 204, 22, 0.35)',
          gradStop1: '#10b981',
          gradStop2: '#84cc16',
          glow: 'rgba(16, 185, 129, 0.45)',
        };
      case 'sunset-orange':
        return {
          primary: '#f97316',
          secondary: '#ec4899',
          primaryMuted: 'rgba(249, 115, 22, 0.35)',
          secondaryMuted: 'rgba(236, 72, 153, 0.35)',
          gradStop1: '#f97316',
          gradStop2: '#ec4899',
          glow: 'rgba(249, 115, 22, 0.45)',
        };
      case 'slate-monochrome':
        return {
          primary: '#94a3b8',
          secondary: '#cbd5e1',
          primaryMuted: 'rgba(148, 163, 184, 0.25)',
          secondaryMuted: 'rgba(203, 213, 225, 0.25)',
          gradStop1: '#94a3b8',
          gradStop2: '#e2e8f0',
          glow: 'rgba(148, 163, 184, 0.35)',
        };
      case 'default':
      default:
        return {
          primary: theme === 'light' ? '#0284c7' : '#00f0ff',
          secondary: theme === 'light' ? '#7c3aed' : '#a855f7',
          primaryMuted: theme === 'light' ? 'rgba(2, 132, 199, 0.45)' : 'rgba(0, 240, 255, 0.3)',
          secondaryMuted: theme === 'light' ? 'rgba(124, 58, 237, 0.45)' : 'rgba(168, 85, 247, 0.3)',
          gradStop1: theme === 'light' ? '#0284c7' : '#00f0ff',
          gradStop2: theme === 'light' ? '#7c3aed' : '#a855f7',
          glow: theme === 'light' ? 'rgba(2, 132, 199, 0.4)' : 'rgba(0, 240, 255, 0.5)',
        };
    }
  };

  const config = getAccentStyles();

  // Theme-specific line and backdrop variables
  const colors = {
    bgGlowCyan: theme === 'dark' ? 'rgba(0, 240, 255, 0.12)' : theme === 'midtone' ? 'rgba(6, 182, 212, 0.1)' : 'rgba(2, 132, 199, 0.08)',
    bgGlowPurple: theme === 'dark' ? 'rgba(168, 85, 247, 0.12)' : theme === 'midtone' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(124, 58, 237, 0.08)',
    cyanLine: config.primary,
    purpleLine: config.secondary,
    cyanMuted: config.primaryMuted,
    purpleMuted: config.secondaryMuted,
    lineMuted: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : theme === 'midtone' ? 'rgba(241, 245, 249, 0.16)' : 'rgba(15, 23, 42, 0.15)',
    textLabel: theme === 'dark' ? '#94a3b8' : theme === 'midtone' ? '#cbd5e1' : '#334155',
    centerCoreGlow: config.glow,
  };

  const surfaceColor = theme === 'dark' ? '#0f172a' : theme === 'midtone' ? '#1e293b' : '#ffffff';

  // 6 nodes structural definitions mapped to active preset
  const nodes = [
    {
      id: 'requirements',
      x: getNodePos('requirements').x,
      y: getNodePos('requirements').y,
      label: 'Requirements',
      side: getNodePos('requirements').x < 500 ? 'left' as const : 'right' as const,
      icon: 'checklist',
      percent: requirementsData.percent,
      metricText: requirementsData.metricText,
      warnings: requirementsData.warnings,
      path: '/dashboard/requirements'
    },
    {
      id: 'competencies',
      x: getNodePos('competencies').x,
      y: getNodePos('competencies').y,
      label: 'Competency Matrix',
      side: getNodePos('competencies').x < 500 ? 'left' as const : 'right' as const,
      icon: 'users',
      percent: competencyData.percent,
      metricText: competencyData.metricText,
      warnings: competencyData.warnings,
      path: '/dashboard/competencies'
    },
    {
      id: 'matrix',
      x: getNodePos('matrix').x,
      y: getNodePos('matrix').y,
      label: 'Asset Matrix',
      side: getNodePos('matrix').x < 500 ? 'left' as const : 'right' as const,
      icon: 'grid',
      percent: matrixData.percent,
      metricText: matrixData.metricText,
      warnings: matrixData.warnings,
      path: '/dashboard/matrix'
    },
    {
      id: 'vault',
      x: getNodePos('vault').x,
      y: getNodePos('vault').y,
      label: 'Evidence Vault',
      side: getNodePos('vault').x < 500 ? 'left' as const : 'right' as const,
      icon: 'folder',
      percent: vaultData.percent,
      metricText: vaultData.metricText,
      warnings: vaultData.warnings,
      path: '/dashboard/vault'
    },
    {
      id: 'audit-packs',
      x: getNodePos('audit-packs').x,
      y: getNodePos('audit-packs').y,
      label: 'Audit Pack Builder',
      side: getNodePos('audit-packs').x < 500 ? 'left' as const : 'right' as const,
      icon: 'document',
      percent: auditPacksData.percent,
      metricText: auditPacksData.metricText,
      warnings: auditPacksData.warnings,
      path: '/dashboard/audit-packs'
    },
    {
      id: 'reports',
      x: getNodePos('reports').x,
      y: getNodePos('reports').y,
      label: 'Reports',
      side: getNodePos('reports').x < 500 ? 'left' as const : 'right' as const,
      icon: 'chart',
      percent: 100, // neutral snapshot bar
      metricText: reportsData.metricText,
      warnings: 0,
      path: '/dashboard/reports'
    },
  ];

  const majorNodesList = React.useMemo(() => {
    return nodes.filter(n => visibleHeroNodes.includes(n.id));
  }, [nodes, visibleHeroNodes]);

  const minorNodesList = React.useMemo(() => {
    if (!showMinorNodes) return [];
    return nodes.filter(n => !visibleHeroNodes.includes(n.id));
  }, [nodes, showMinorNodes, visibleHeroNodes]);

  // Render SVG icons with matching theme highlights
  const renderIcon = (type: string, strokeColor: string) => {
    const iconSize = 13;
    const offset = (24 - iconSize) / 2;
    switch (type) {
      case 'checklist':
        return <ClipboardList stroke={strokeColor} strokeWidth={2} width={iconSize} height={iconSize} x={offset} y={offset} />;
      case 'users':
        return <UserCheck stroke={strokeColor} strokeWidth={2} width={iconSize} height={iconSize} x={offset} y={offset} />;
      case 'grid':
        return <Grid stroke={strokeColor} strokeWidth={2} width={iconSize} height={iconSize} x={offset} y={offset} />;
      case 'folder':
        return <FolderLock stroke={strokeColor} strokeWidth={2} width={iconSize} height={iconSize} x={offset} y={offset} />;
      case 'document':
        return <FolderArchive stroke={strokeColor} strokeWidth={2} width={iconSize} height={iconSize} x={offset} y={offset} />;
      case 'chart':
        return <BarChart3 stroke={strokeColor} strokeWidth={2} width={iconSize} height={iconSize} x={offset} y={offset} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto flex items-center justify-center p-2 select-none">

      {/* SVG Container */}
      <svg
        className={`w-full h-auto aspect-[5/3] overflow-visible ${draggingNodeId ? 'cursor-grabbing' : ''}`}
        viewBox="0 0 1000 600"
        xmlns="http://www.w3.org/2000/svg"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        <defs>
          {/* Custom theme styling based on intensity settings */}
          <filter id="hero-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={theme === 'light' ? '2.5' : effectIntensity === 'subtle' ? '3' : effectIntensity === 'vibrant' ? '7' : '5'} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="hero-glow-purple" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={theme === 'light' ? '2.5' : effectIntensity === 'subtle' ? '3' : effectIntensity === 'vibrant' ? '7' : '5'} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="hero-glow-strong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={theme === 'light' ? '3.5' : effectIntensity === 'subtle' ? '5' : effectIntensity === 'vibrant' ? '11' : '9'} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradients */}
          <radialGradient id="hero-cyan-radial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={config.gradStop1} stopOpacity={theme === 'light' ? '0.08' : effectIntensity === 'subtle' ? '0.08' : effectIntensity === 'vibrant' ? '0.22' : '0.14'} />
            <stop offset="100%" stopColor={config.gradStop1} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hero-purple-radial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={config.gradStop2} stopOpacity={theme === 'light' ? '0.08' : effectIntensity === 'subtle' ? '0.08' : effectIntensity === 'vibrant' ? '0.22' : '0.14'} />
            <stop offset="100%" stopColor={config.gradStop2} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hero-cyan-purple-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={config.gradStop1} />
            <stop offset="100%" stopColor={config.gradStop2} />
          </linearGradient>

          {/* Staggered Premium Light Sweep Gradient */}
          <linearGradient id="hero-sweep-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={config.primary} stopOpacity="0" />
            <stop offset="35%" stopColor={config.primary} stopOpacity="0.2" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="65%" stopColor={config.secondary} stopOpacity="0.2" />
            <stop offset="100%" stopColor={config.secondary} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* CSS Animations (Dynamic sweeps & spins) */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes hero-rotate-cw {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes hero-rotate-ccw {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
          }
          @keyframes hero-pulse-glow {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.08); opacity: 1; }
          }
          @keyframes hero-light-sweep {
            0% { stroke-dashoffset: 250; }
            100% { stroke-dashoffset: -250; }
          }
          .proto-animate-cw {
            animation: hero-rotate-cw 60s linear infinite;
            transform-origin: 500px 300px;
          }
          .proto-animate-ccw {
            animation: hero-rotate-ccw 70s linear infinite;
            transform-origin: 500px 300px;
          }
          .proto-animate-pulse {
            animation: hero-pulse-glow 4s ease-in-out infinite;
            transform-origin: 500px 300px;
          }
          .hero-sweep-line {
            stroke-dasharray: 50 150;
            animation: hero-light-sweep 4.5s linear infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .proto-animate-cw, .proto-animate-ccw, .proto-animate-pulse, .hero-sweep-line {
              animation: none !important;
              transform: none !important;
            }
          }
        ` }} />

        {/* Ambient backing glows */}
        {heroVisualMode !== 'minimal' && (
          <g id="hero-bg-glows" className="pointer-events-none">
            <circle cx="350" cy="300" r="280" fill="url(#hero-cyan-radial)" />
            <circle cx="650" cy="300" r="280" fill="url(#hero-purple-radial)" />
            <circle cx="500" cy="300" r="80" fill={theme === 'light' ? 'rgba(2, 132, 199, 0.03)' : 'rgba(0, 240, 255, 0.05)'} />
          </g>
        )}

        {/* ==========================================
            2. CONNECTOR BUS PATHS (Topology)
           ========================================== */}
        <g id="hero-connector-paths" strokeLinecap="round" strokeLinejoin="round">
          {majorNodesList.map((node) => {
            const isHovered = hoveredNode === node.id || draggingNodeId === node.id;
            const strokeColor = node.side === 'left' ? colors.cyanLine : colors.purpleLine;
            const ringColor = node.side === 'left' ? colors.cyanMuted : colors.purpleMuted;

            const { mainPath, subPaths, junctions } = getPathsForNode(node.id, node.x, node.y);

            return (
              <g key={node.id} opacity={hoveredNode === null || isHovered ? 1 : 0.3} style={{ transition: 'opacity 0.3s ease' }}>
                {/* Secondary/Sub parallel paths */}
                {subPaths.map((pathD, idx) => (
                  <path key={idx} d={pathD} fill="none" stroke={colors.lineMuted} strokeWidth="1.2" />
                ))}

                {/* Main connector path */}
                <path
                  d={mainPath}
                  fill="none"
                  stroke={isHovered ? strokeColor : ringColor}
                  strokeWidth={isHovered ? '2.2' : '1.5'}
                  filter={isHovered ? (node.side === 'left' ? 'url(#hero-glow-cyan)' : 'url(#hero-glow-purple)') : undefined}
                  className="transition-all duration-355"
                />

                {/* Staggered Premium Light Sweep Line */}
                {effectIntensity !== 'subtle' && heroVisualMode !== 'minimal' && (
                  <path
                    d={mainPath}
                    fill="none"
                    stroke="url(#hero-sweep-grad)"
                    strokeWidth={isHovered ? '3' : '2'}
                    className="hero-sweep-line"
                    style={{
                      animationDelay: `${node.id === 'requirements' ? 0 : node.id === 'vault' ? 0.6 : node.id === 'competencies' ? 1.2 : node.id === 'audit-packs' ? 1.8 : node.id === 'matrix' ? 2.4 : 3.0}s`,
                      opacity: isHovered ? 1.0 : effectIntensity === 'vibrant' ? 0.8 : 0.4
                    }}
                  />
                )}

                {/* Junction nodes */}
                {junctions.map((junction, idx) => (
                  <circle
                    key={idx}
                    cx={junction.cx}
                    cy={junction.cy}
                    r={isHovered ? 4.5 : 3}
                    fill={strokeColor}
                    filter={isHovered ? (node.side === 'left' ? 'url(#hero-glow-cyan)' : 'url(#hero-glow-purple)') : undefined}
                    className="transition-all duration-300"
                  />
                ))}
              </g>
            );
          })}

          {/* Minor nodes traces (thin dashed lines) */}
          {minorNodesList.map((node) => {
            const strokeColor = node.side === 'left' ? colors.cyanLine : colors.purpleLine;
            const { mainPath } = getPathsForNode(node.id, node.x, node.y);
            if (!mainPath) return null;
            return (
              <g key={node.id} opacity={hoveredNode === node.id ? 0.9 : 0.35} style={{ transition: 'opacity 0.3s ease' }}>
                <path
                  d={mainPath}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                />
              </g>
            );
          })}
        </g>

        {/* Connector pulse animations - only active when motion is not reduced */}
        {!isMotionReduced && (
          <g id="hero-flowing-pulse-dots" className="pointer-events-none">
            {majorNodesList.map((node) => {
              const isHovered = hoveredNode === node.id || draggingNodeId === node.id;
              const strokeColor = node.side === 'left' ? colors.cyanLine : colors.purpleLine;
              const { mainPath } = getPathsForNode(node.id, node.x, node.y);
              if (!mainPath) return null;

              return (
                <circle
                  key={node.id}
                  r="3.5"
                  fill={strokeColor}
                  filter={node.side === 'left' ? "url(#hero-glow-cyan)" : "url(#hero-glow-purple)"}
                  opacity={hoveredNode === null || isHovered ? 1 : 0.1}
                >
                  <animateMotion
                    path={mainPath}
                    dur={node.id === 'requirements' ? '3.5s' : node.id === 'vault' ? '3.2s' : node.id === 'competencies' ? '3s' : node.id === 'audit-packs' ? '4s' : node.id === 'matrix' ? '3.8s' : '3.5s'}
                    repeatCount="indefinite"
                  />
                </circle>
              );
            })}
          </g>
        )}

        {/* ==========================================
            3. CENTRAL LUMINOUS CORE
           ========================================== */}
        <g id="hero-central-core">
          {/* Outermost thin reference path */}
          <circle cx="500" cy="300" r="160" fill="none" stroke={colors.lineMuted} strokeWidth="0.8" />
          <circle cx="500" cy="300" r="140" fill="none" stroke={colors.lineMuted} strokeWidth="1" strokeDasharray="3,6" />

          {/* Cyan and Purple Concentric Split Arcs */}
          <path
            d="M 500 176 A 124 124 0 0 0 500 424"
            fill="none"
            stroke={colors.cyanLine}
            strokeWidth="3.5"
            strokeLinecap="round"
            filter={hoveredNode && nodes.find(n => n.id === hoveredNode)?.side === 'left' ? 'url(#hero-glow-cyan)' : undefined}
            className="transition-all duration-300"
          />
          <path
            d="M 500 424 A 124 124 0 0 0 500 176"
            fill="none"
            stroke={colors.purpleLine}
            strokeWidth="3.5"
            strokeLinecap="round"
            filter={hoveredNode && nodes.find(n => n.id === hoveredNode)?.side === 'right' ? 'url(#hero-glow-purple)' : undefined}
            className="transition-all duration-300"
          />

          {/* Rotating HUD tracks, Ticks, and Crosshairs */}
          {heroVisualMode !== 'minimal' && (
            <>
              <g opacity="0.8">
                <circle
                  cx="500"
                  cy="300"
                  r="110"
                  fill="none"
                  stroke="url(#hero-cyan-purple-grad)"
                  strokeWidth="2"
                  strokeDasharray="40 10 90 20 5 15 150 25"
                  className={isMotionReduced ? '' : 'proto-animate-cw'}
                />
                <circle
                  cx="500"
                  cy="300"
                  r="92"
                  fill="none"
                  stroke={colors.cyanLine}
                  strokeWidth="1.2"
                  strokeDasharray="80 30 10 10 40 20"
                  opacity="0.6"
                  className={isMotionReduced ? '' : 'proto-animate-ccw'}
                />
              </g>

              {/* Fine Outer Compass Ticks */}
              <g id="hero-compass-ticks-outer">
                {Array.from({ length: 72 }).map((_, i) => {
                  const angle = (i * 5 * Math.PI) / 180;
                  const innerRadius = 82;
                  const outerRadius = i % 6 === 0 ? 89 : 85;
                  const x1 = 500 + innerRadius * Math.cos(angle);
                  const y1 = 300 + innerRadius * Math.sin(angle);
                  const x2 = 500 + outerRadius * Math.cos(angle);
                  const y2 = 300 + outerRadius * Math.sin(angle);
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={i % 6 === 0 ? colors.cyanLine : colors.lineMuted}
                      strokeWidth={i % 6 === 0 ? '1' : '0.6'}
                      opacity={i % 6 === 0 ? '0.8' : '0.4'}
                    />
                  );
                })}
              </g>

              {/* Concentric tracks */}
              <circle cx="500" cy="300" r="76" fill="none" stroke={colors.lineMuted} strokeWidth="1" />
              <circle cx="500" cy="300" r="72" fill="none" stroke="url(#hero-cyan-purple-grad)" strokeWidth="1.5" strokeDasharray="180 180" className={isMotionReduced ? '' : 'proto-animate-cw'} />

              {/* Crosshair telemetry paths */}
              <line x1="500" y1="180" x2="500" y2="420" stroke={colors.lineMuted} strokeWidth="0.8" />
              <line x1="500" y1="210" x2="500" y2="390" stroke={colors.cyanMuted} strokeWidth="1.2" strokeDasharray="4 4" />
              <line x1="380" y1="300" x2="620" y2="300" stroke={colors.lineMuted} strokeWidth="0.8" />
              <line x1="410" y1="300" x2="590" y2="300" stroke={colors.cyanMuted} strokeWidth="1.2" strokeDasharray="4 4" />
            </>
          )}

          {/* Axis Ticks and Inner Ticks Dial */}
          {heroVisualMode !== 'minimal' && (
            <>
              {Array.from({ length: 9 }).map((_, i) => {
                const y = 220 + i * 20;
                if (y === 300) return null;
                return <line key={i} x1="496" y1={y} x2="504" y2={y} stroke={colors.cyanMuted} strokeWidth="1" />;
              })}
              {Array.from({ length: 9 }).map((_, i) => {
                const x = 420 + i * 20;
                if (x === 500) return null;
                return <line key={i} x1={x} y1="296" x2={x} y2="304" stroke={colors.cyanMuted} strokeWidth="1" />;
              })}

              {/* Inner ticks dial */}
              <g id="hero-compass-ticks-inner" opacity={isCoreHovered ? 1.0 : 0.6} style={{ transition: 'opacity 0.3s ease' }}>
                {Array.from({ length: 36 }).map((_, i) => {
                  const angle = (i * 10 * Math.PI) / 180;
                  const innerRadius = 40;
                  const outerRadius = 48;
                  const x1 = 500 + innerRadius * Math.cos(angle);
                  const y1 = 300 + innerRadius * Math.sin(angle);
                  const x2 = 500 + outerRadius * Math.cos(angle);
                  const y2 = 300 + outerRadius * Math.sin(angle);
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={colors.cyanLine}
                      strokeWidth="0.8"
                    />
                  );
                })}
              </g>
            </>
          )}

          {/* Inner core circle holding HUD score readout */}
          <g
            id="hero-center-light-source"
            className="cursor-pointer outline-none"
            onMouseEnter={() => setIsCoreHovered(true)}
            onMouseLeave={() => setIsCoreHovered(false)}
            onFocus={() => setIsCoreHovered(true)}
            onBlur={() => setIsCoreHovered(false)}
            onClick={() => onNodeClick('hub')}
            role="button"
            tabIndex={0}
            aria-label="Inspect overall compliance rating"
          >
            {/* Outward pulse breathing track */}
            <circle
              cx="500"
              cy="300"
              r="62"
              fill="none"
              stroke={colors.cyanLine}
              strokeWidth="1.2"
              opacity={isCoreHovered ? 0.7 : 0.15}
              className={isCoreHovered && !isMotionReduced ? "proto-animate-pulse" : undefined}
              style={{ transition: 'all 0.3s ease' }}
            />

            {/* Inner Core */}
            <circle
              cx="500"
              cy="300"
              r="37"
              fill={surfaceColor}
              stroke={colors.cyanLine}
              strokeWidth={isCoreHovered ? '2.2' : '1.5'}
              filter={isCoreHovered ? "url(#hero-glow-strong)" : "url(#hero-glow-cyan)"}
              style={{ transition: 'all 0.3s ease' }}
            />

            {/* Overall Score Readout */}
            <text
              x="500"
              y="294"
              textAnchor="middle"
              fill={theme === 'light' ? '#0f172a' : '#ffffff'}
              fontSize="20"
              fontWeight="bold"
              style={{ letterSpacing: '-0.5px', userSelect: 'none' }}
            >
              {orbContent.mainText}
            </text>

            {/* Score Label */}
            <text
              x="500"
              y="308"
              textAnchor="middle"
              fill={colors.textLabel}
              fontSize="6"
              fontWeight="bold"
              letterSpacing="0.8"
              style={{ userSelect: 'none' }}
            >
              {orbContent.labelText}
            </text>

            {/* Telemetry Status Line */}
            <text
              x="500"
              y="320"
              textAnchor="middle"
              fill={orbContent.statusColor}
              fontSize="5"
              fontWeight="black"
              letterSpacing="0.5"
              opacity={isCoreHovered ? 1.0 : 0.85}
              style={{ userSelect: 'none', textTransform: 'uppercase' }}
            >
              {orbContent.statusText}
            </text>
          </g>
        </g>

        {/* ==========================================
            4. SIX OUTER NODES & COMPACT STATE INDICATORS
           ========================================== */}
        <g id="hero-outer-nodes">
          {majorNodesList.map((node) => {
            const isHovered = hoveredNode === node.id;
            const strokeColor = node.side === 'left' ? colors.cyanLine : colors.purpleLine;
            const ringColor = node.side === 'left' ? colors.cyanMuted : colors.purpleMuted;

            // Circular Progress Ring Math
            const percent = node.percent || 0;
            const ringRadius = 24;
            const ringCircumference = 2 * Math.PI * ringRadius;
            const ringDashoffset = ringCircumference - (percent / 100) * ringCircumference;

            return (
              <g
                key={node.id}
                id={`hero-node-${node.id}`}
                className={`group outline-none select-none ${dragEnabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                onMouseEnter={(e) => {
                  setHoveredNode(node.id);
                  onNodeMouseEnter(node.id, e.currentTarget);
                }}
                onMouseLeave={() => {
                  setHoveredNode(null);
                  onNodeMouseLeave();
                }}
                onFocus={(e) => {
                  setHoveredNode(node.id);
                  onNodeMouseEnter(node.id, e.currentTarget);
                }}
                onBlur={() => {
                  setHoveredNode(null);
                  onNodeMouseLeave();
                }}
                onMouseDown={(e) => handleMouseDown(node.id, e)}
                onClick={() => {
                  if (dragEnabled) return;
                  onNodeClick(node.id);
                }}
                role="button"
                tabIndex={0}
                aria-label={`Inspect ${node.label} module`}
              >
                {/* Node ambient soft glow */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="45"
                  fill={node.side === 'left' ? 'url(#hero-cyan-radial)' : 'url(#hero-purple-radial)'}
                  opacity={isHovered ? 1 : 0.4}
                  className="transition-all duration-300"
                />

                {/* Outer concentric HUD rings */}
                <circle cx={node.x} cy={node.y} r="36" fill="none" stroke={ringColor} strokeWidth="0.8" strokeDasharray="4 8" opacity={isHovered ? 1 : 0.6} className="transition-all duration-300" />

                {/* Concentric Ring 2 */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="28"
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="1"
                  strokeDasharray={isHovered ? "none" : "15 5 45 5 10 10"}
                  opacity={isHovered ? 1 : 0.7}
                  filter={isHovered ? (node.side === 'left' ? 'url(#hero-glow-cyan)' : 'url(#hero-glow-purple)') : undefined}
                  className="transition-all duration-300"
                />

                {/* Outer Ticks */}
                <line x1={node.x} y1={node.y - 36} x2={node.x} y2={node.y - 32} stroke={strokeColor} strokeWidth="1.2" />
                <line x1={node.x} y1={node.y + 32} x2={node.x} y2={node.y + 36} stroke={strokeColor} strokeWidth="1.2" />
                <line x1={node.x - 36} y1={node.y} x2={node.x - 32} y2={node.y} stroke={strokeColor} strokeWidth="1.2" />
                <line x1={node.x + 32} y1={node.y} x2={node.x + 36} y2={node.y} stroke={strokeColor} strokeWidth="1.2" />

                {/* Real circular progress ring */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={ringRadius}
                  fill="none"
                  stroke={theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}
                  strokeWidth="3.2"
                />
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={ringRadius}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="3.2"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringDashoffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${node.x} ${node.y})`}
                  filter={isHovered ? (node.side === 'left' ? 'url(#hero-glow-cyan)' : 'url(#hero-glow-purple)') : undefined}
                  className="transition-all duration-300"
                />

                {/* Dotted drag target ring */}
                {dragEnabled && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="23"
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="1"
                    strokeDasharray="2 3"
                    opacity="0.85"
                  />
                )}

                {/* Node Solid Center Circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="20"
                  fill={surfaceColor}
                  stroke={strokeColor}
                  strokeWidth={isHovered ? '2' : '1.2'}
                  filter={isHovered ? (node.side === 'left' ? 'url(#hero-glow-cyan)' : 'url(#hero-glow-purple)') : undefined}
                  className="transition-all duration-300"
                />

                {/* Icon translate */}
                <g transform={`translate(${node.x - 12}, ${node.y - 12})`}>
                  {renderIcon(node.icon, isHovered ? (theme === 'light' ? strokeColor : '#ffffff') : strokeColor)}
                </g>

                {/* Warning Counter Badge */}
                {node.warnings > 0 && (
                  <g transform={`translate(${node.x + 14}, ${node.y - 22})`}>
                    <circle r="8.5" fill="#ef4444" filter="url(#hero-glow-strong)" opacity="0.3" />
                    <circle r="7.5" fill="#ef4444" stroke={surfaceColor} strokeWidth="1" />
                    <text textAnchor="middle" y="2.5" fill="#ffffff" fontSize="8" fontWeight="black" style={{ userSelect: 'none' }}>
                      {node.warnings}
                    </text>
                  </g>
                )}

                {/* Node Label Text */}
                {heroNodeDisplayLevel !== 'icons-only' && (
                  <text
                    x={node.x}
                    y={node.y + 44}
                    textAnchor="middle"
                    fill={isHovered ? strokeColor : colors.textLabel}
                    fontSize="10"
                    fontWeight="bold"
                    letterSpacing="0.5"
                    className="transition-colors duration-300 opacity-90"
                    style={{ userSelect: 'none' }}
                  >
                    {node.label}
                  </text>
                )}

                {/* Data Metric Text */}
                {heroNodeDisplayLevel !== 'icons-only' && heroNodeDisplayLevel !== 'icons-labels' && (
                  <text
                    x={node.x}
                    y={node.y + 54}
                    textAnchor="middle"
                    fill={colors.textLabel}
                    fontSize="8"
                    fontWeight="medium"
                    opacity={isHovered ? 1.0 : 0.65}
                    className="transition-opacity duration-300"
                    style={{ userSelect: 'none' }}
                  >
                    {node.metricText}
                  </text>
                )}

                {/* Small HUD Data Bar below label */}
                {heroNodeDisplayLevel === 'full-detail' && (
                  <g opacity={isHovered ? 1.0 : 0.4} className="transition-opacity duration-300">
                    <rect x={node.x - 25} y={node.y + 59} width="50" height="2.5" rx="1.25" fill={colors.lineMuted} />
                    <rect x={node.x - 25} y={node.y + 59} width={50 * (percent / 100)} height="2.5" rx="1.25" fill={strokeColor} />
                  </g>
                )}
              </g>
            );
          })}

          {/* Minor nodes satellites */}
          {minorNodesList.map((node) => {
            const isHovered = hoveredNode === node.id;
            const strokeColor = node.side === 'left' ? colors.cyanLine : colors.purpleLine;
            const ringColor = node.side === 'left' ? colors.cyanMuted : colors.purpleMuted;
            return (
              <g
                key={node.id}
                id={`hero-node-${node.id}`}
                className="cursor-pointer outline-none select-none"
                onMouseEnter={(e) => {
                  setHoveredNode(node.id);
                  onNodeMouseEnter(node.id, e.currentTarget);
                }}
                onMouseLeave={() => {
                  setHoveredNode(null);
                  onNodeMouseLeave();
                }}
                onClick={() => onNodeClick(node.id)}
                role="button"
                tabIndex={0}
                aria-label={`Inspect ${node.label} module`}
              >
                {/* Ambient glow */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="20"
                  fill={node.side === 'left' ? 'url(#hero-cyan-radial)' : 'url(#hero-purple-radial)'}
                  opacity={isHovered ? 0.8 : 0.25}
                  className="transition-all duration-300"
                />

                {/* Outer ring */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="12"
                  fill="none"
                  stroke={isHovered ? strokeColor : ringColor}
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  className="transition-all duration-300"
                />

                {/* Center dot */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="6"
                  fill={isHovered ? strokeColor : surfaceColor}
                  stroke={strokeColor}
                  strokeWidth="1"
                  className="transition-all duration-300"
                />

                {/* Small indicator label on hover */}
                {isHovered && (
                  <text
                    x={node.x}
                    y={node.y + 20}
                    textAnchor="middle"
                    fill={strokeColor}
                    fontSize="8"
                    fontWeight="bold"
                    style={{ userSelect: 'none' }}
                  >
                    {node.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
