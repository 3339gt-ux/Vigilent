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
  heroAccent?: 'default' | 'cyan-emerald' | 'blue-amber' | 'violet-rose' | 'rainbow';
  
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
}

export default function ComplianceHeroCore({
  theme,
  readinessScore,
  readinessLabel,
  isMotionReduced,
  effectIntensity,
  heroAccent = 'default',
  requirementsData,
  vaultData,
  competencyData,
  matrixData,
  auditPacksData,
  reportsData,
  onNodeMouseEnter,
  onNodeMouseLeave,
  onNodeClick
}: ComplianceHeroCoreProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isCoreHovered, setIsCoreHovered] = useState(false);

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

  // 6 nodes structural definitions mapped to real modules
  const nodes = [
    { 
      id: 'requirements', 
      x: 220, 
      y: 100, 
      label: 'Requirements', 
      side: 'left', 
      icon: 'checklist',
      percent: requirementsData.percent,
      metricText: requirementsData.metricText,
      warnings: requirementsData.warnings,
      path: '/dashboard/requirements'
    },
    { 
      id: 'competencies', 
      x: 110, 
      y: 300, 
      label: 'Competency Matrix', 
      side: 'left', 
      icon: 'users',
      percent: competencyData.percent,
      metricText: competencyData.metricText,
      warnings: competencyData.warnings,
      path: '/dashboard/competencies'
    },
    { 
      id: 'matrix', 
      x: 220, 
      y: 500, 
      label: 'Asset Matrix', 
      side: 'left', 
      icon: 'grid',
      percent: matrixData.percent,
      metricText: matrixData.metricText,
      warnings: matrixData.warnings,
      path: '/dashboard/matrix'
    },
    { 
      id: 'vault', 
      x: 780, 
      y: 100, 
      label: 'Evidence Vault', 
      side: 'right', 
      icon: 'folder',
      percent: vaultData.percent,
      metricText: vaultData.metricText,
      warnings: vaultData.warnings,
      path: '/dashboard/vault'
    },
    { 
      id: 'audit-packs', 
      x: 890, 
      y: 300, 
      label: 'Audit Pack Builder', 
      side: 'right', 
      icon: 'document',
      percent: auditPacksData.percent,
      metricText: auditPacksData.metricText,
      warnings: auditPacksData.warnings,
      path: '/dashboard/audit-packs'
    },
    { 
      id: 'reports', 
      x: 780, 
      y: 500, 
      label: 'Reports', 
      side: 'right', 
      icon: 'chart',
      percent: 100, // neutral snapshot bar
      metricText: reportsData.metricText,
      warnings: 0,
      path: '/dashboard/reports'
    },
  ];

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
        className="w-full h-auto aspect-[5/3] overflow-visible" 
        viewBox="0 0 1000 600"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Custom theme styling based on intensity settings */}
          <filter id="hero-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={theme === 'light' ? '3' : effectIntensity === 'subtle' ? '4' : effectIntensity === 'vibrant' ? '8' : '6'} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="hero-glow-purple" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={theme === 'light' ? '3' : effectIntensity === 'subtle' ? '4' : effectIntensity === 'vibrant' ? '8' : '6'} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="hero-glow-strong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={theme === 'light' ? '4.5' : effectIntensity === 'subtle' ? '6' : effectIntensity === 'vibrant' ? '12' : '10'} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradients */}
          <radialGradient id="hero-cyan-radial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={config.gradStop1} stopOpacity={theme === 'light' ? '0.08' : '0.14'} />
            <stop offset="100%" stopColor={config.gradStop1} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hero-purple-radial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={config.gradStop2} stopOpacity={theme === 'light' ? '0.08' : '0.14'} />
            <stop offset="100%" stopColor={config.gradStop2} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hero-cyan-purple-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={config.gradStop1} />
            <stop offset="100%" stopColor={config.gradStop2} />
          </linearGradient>
        </defs>

        {/* Ambient backing glows */}
        <g id="hero-bg-glows" className="pointer-events-none">
          <circle cx="350" cy="300" r="280" fill="url(#hero-cyan-radial)" />
          <circle cx="650" cy="300" r="280" fill="url(#hero-purple-radial)" />
          <circle cx="500" cy="300" r="80" fill={theme === 'light' ? 'rgba(2, 132, 199, 0.03)' : 'rgba(0, 240, 255, 0.05)'} />
        </g>

        {/* ==========================================
            2. CONNECTOR BUS PATHS (Topology)
           ========================================== */}
        <g id="hero-connector-paths" strokeLinecap="round" strokeLinejoin="round">
          {/* TOP-LEFT CONNECTOR */}
          <g opacity={hoveredNode === null || hoveredNode === 'requirements' ? 1 : 0.3} style={{ transition: 'opacity 0.3s ease' }}>
            <path d="M 415 215 L 380 180 L 315 180 L 270 135 L 240 135" fill="none" stroke={colors.lineMuted} strokeWidth="1.2" />
            <path 
              d="M 405 205 L 370 170 L 310 170 L 260 120 L 220 120" 
              fill="none" 
              stroke={hoveredNode === 'requirements' ? colors.cyanLine : colors.cyanMuted} 
              strokeWidth={hoveredNode === 'requirements' ? '2.2' : '1.5'} 
              filter={hoveredNode === 'requirements' ? 'url(#hero-glow-cyan)' : undefined}
              className="transition-all duration-355"
            />
            <circle cx="370" cy="170" r={hoveredNode === 'requirements' ? 4.5 : 3} fill={colors.cyanLine} filter={hoveredNode === 'requirements' ? 'url(#hero-glow-cyan)' : undefined} className="transition-all duration-300" />
          </g>

          {/* LEFT CONNECTOR */}
          <g opacity={hoveredNode === null || hoveredNode === 'competencies' ? 1 : 0.3} style={{ transition: 'opacity 0.3s ease' }}>
            <path d="M 375 292 L 340 292 L 330 300 L 260 300 L 250 292 L 160 292" fill="none" stroke={colors.lineMuted} strokeWidth="1.2" />
            <path d="M 375 308 L 340 308 L 330 300 L 260 300 L 250 308 L 160 308" fill="none" stroke={colors.lineMuted} strokeWidth="1.2" />
            <path 
              d="M 380 300 L 130 300" 
              fill="none" 
              stroke={hoveredNode === 'competencies' ? colors.cyanLine : colors.cyanMuted} 
              strokeWidth={hoveredNode === 'competencies' ? '2.2' : '1.5'} 
              filter={hoveredNode === 'competencies' ? 'url(#hero-glow-cyan)' : undefined}
              className="transition-all duration-355"
            />
            <circle cx="350" cy="300" r={hoveredNode === 'competencies' ? 5 : 3.5} fill={colors.cyanLine} filter={hoveredNode === 'competencies' ? 'url(#hero-glow-cyan)' : undefined} className="transition-all duration-300" />
          </g>

          {/* BOTTOM-LEFT CONNECTOR */}
          <g opacity={hoveredNode === null || hoveredNode === 'matrix' ? 1 : 0.3} style={{ transition: 'opacity 0.3s ease' }}>
            <path d="M 415 385 L 380 420 L 315 420 L 270 465 L 240 465" fill="none" stroke={colors.lineMuted} strokeWidth="1.2" />
            <path 
              d="M 405 395 L 370 430 L 310 430 L 260 480 L 220 480" 
              fill="none" 
              stroke={hoveredNode === 'matrix' ? colors.cyanLine : colors.cyanMuted} 
              strokeWidth={hoveredNode === 'matrix' ? '2.2' : '1.5'} 
              filter={hoveredNode === 'matrix' ? 'url(#hero-glow-cyan)' : undefined}
              className="transition-all duration-355"
            />
            <circle cx="370" cy="430" r={hoveredNode === 'matrix' ? 4.5 : 3} fill={colors.cyanLine} filter={hoveredNode === 'matrix' ? 'url(#hero-glow-cyan)' : undefined} className="transition-all duration-300" />
          </g>

          {/* TOP-RIGHT CONNECTOR */}
          <g opacity={hoveredNode === null || hoveredNode === 'vault' ? 1 : 0.3} style={{ transition: 'opacity 0.3s ease' }}>
            <path d="M 585 215 L 620 180 L 685 180 L 730 135 L 760 135" fill="none" stroke={colors.lineMuted} strokeWidth="1.2" />
            <path 
              d="M 595 205 L 630 170 L 690 170 L 740 120 L 780 120" 
              fill="none" 
              stroke={hoveredNode === 'vault' ? colors.purpleLine : colors.purpleMuted} 
              strokeWidth={hoveredNode === 'vault' ? '2.2' : '1.5'} 
              filter={hoveredNode === 'vault' ? 'url(#hero-glow-purple)' : undefined}
              className="transition-all duration-355"
            />
            <circle cx="630" cy="170" r={hoveredNode === 'vault' ? 4.5 : 3} fill={colors.purpleLine} filter={hoveredNode === 'vault' ? 'url(#hero-glow-purple)' : undefined} className="transition-all duration-300" />
          </g>

          {/* RIGHT CONNECTOR */}
          <g opacity={hoveredNode === null || hoveredNode === 'audit-packs' ? 1 : 0.3} style={{ transition: 'opacity 0.3s ease' }}>
            <path d="M 625 292 L 660 292 L 670 300 L 740 300 L 750 292 L 840 292" fill="none" stroke={colors.lineMuted} strokeWidth="1.2" />
            <path d="M 625 308 L 660 308 L 670 300 L 740 300 L 750 308 L 840 308" fill="none" stroke={colors.lineMuted} strokeWidth="1.2" />
            <path 
              d="M 620 300 L 870 300" 
              fill="none" 
              stroke={hoveredNode === 'audit-packs' ? colors.purpleLine : colors.purpleMuted} 
              strokeWidth={hoveredNode === 'audit-packs' ? '2.2' : '1.5'} 
              filter={hoveredNode === 'audit-packs' ? 'url(#hero-glow-purple)' : undefined}
              className="transition-all duration-355"
            />
            <circle cx="650" cy="300" r={hoveredNode === 'audit-packs' ? 5 : 3.5} fill={colors.purpleLine} filter={hoveredNode === 'audit-packs' ? 'url(#hero-glow-purple)' : undefined} className="transition-all duration-300" />
          </g>

          {/* BOTTOM-RIGHT CONNECTOR */}
          <g opacity={hoveredNode === null || hoveredNode === 'reports' ? 1 : 0.3} style={{ transition: 'opacity 0.3s ease' }}>
            <path d="M 585 385 L 620 420 L 685 420 L 730 465 L 760 465" fill="none" stroke={colors.lineMuted} strokeWidth="1.2" />
            <path 
              d="M 595 395 L 630 430 L 690 430 L 740 480 L 780 480" 
              fill="none" 
              stroke={hoveredNode === 'reports' ? colors.purpleLine : colors.purpleMuted} 
              strokeWidth={hoveredNode === 'reports' ? '2.2' : '1.5'} 
              filter={hoveredNode === 'reports' ? 'url(#hero-glow-purple)' : undefined}
              className="transition-all duration-355"
            />
            <circle cx="630" cy="430" r={hoveredNode === 'reports' ? 4.5 : 3} fill={colors.purpleLine} filter={hoveredNode === 'reports' ? 'url(#hero-glow-purple)' : undefined} className="transition-all duration-300" />
          </g>
        </g>

        {/* Connector pulse animations - only active when motion is not reduced */}
        {!isMotionReduced && (
          <g id="hero-flowing-pulse-dots" className="pointer-events-none">
            <circle r="3.5" fill={colors.cyanLine} filter="url(#hero-glow-cyan)" opacity={hoveredNode === null || hoveredNode === 'requirements' ? 1 : 0.1}>
              <animateMotion path="M 405 205 L 370 170 L 310 170 L 260 120 L 220 120" dur="3.5s" repeatCount="indefinite" />
            </circle>
            <circle r="3.5" fill={colors.cyanLine} filter="url(#hero-glow-cyan)" opacity={hoveredNode === null || hoveredNode === 'competencies' ? 1 : 0.1}>
              <animateMotion path="M 380 300 L 130 300" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle r="3.5" fill={colors.cyanLine} filter="url(#hero-glow-cyan)" opacity={hoveredNode === null || hoveredNode === 'matrix' ? 1 : 0.1}>
              <animateMotion path="M 405 395 L 370 430 L 310 430 L 260 480 L 220 480" dur="3.8s" repeatCount="indefinite" />
            </circle>
            <circle r="3.5" fill={colors.purpleLine} filter="url(#hero-glow-purple)" opacity={hoveredNode === null || hoveredNode === 'vault' ? 1 : 0.1}>
              <animateMotion path="M 595 205 L 630 170 L 690 170 L 740 120 L 780 120" dur="3.2s" repeatCount="indefinite" />
            </circle>
            <circle r="3.5" fill={colors.purpleLine} filter="url(#hero-glow-purple)" opacity={hoveredNode === null || hoveredNode === 'audit-packs' ? 1 : 0.1}>
              <animateMotion path="M 620 300 L 870 300" dur="4s" repeatCount="indefinite" />
            </circle>
            <circle r="3.5" fill={colors.purpleLine} filter="url(#hero-glow-purple)" opacity={hoveredNode === null || hoveredNode === 'reports' ? 1 : 0.1}>
              <animateMotion path="M 595 395 L 630 430 L 690 430 L 740 480 L 780 480" dur="3.5s" repeatCount="indefinite" />
            </circle>
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

          {/* Rotating HUD tracks */}
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

          {/* Axis Ticks */}
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
              {readinessScore === null ? 'N/A' : `${readinessScore}%`}
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
              READINESS SCORE
            </text>

            {/* Telemetry Status Line (Excellent, Fair, Critical, etc.) */}
            <text
              x="500"
              y="320"
              textAnchor="middle"
              fill={
                readinessScore === null ? colors.textLabel :
                readinessScore >= 90 ? '#10b981' :
                readinessScore >= 75 ? colors.cyanLine :
                readinessScore >= 50 ? '#f59e0b' : '#ef4444'
              }
              fontSize="5"
              fontWeight="black"
              letterSpacing="0.5"
              opacity={isCoreHovered ? 1.0 : 0.85}
              style={{ userSelect: 'none', textTransform: 'uppercase' }}
            >
              ● {readinessLabel}
            </text>
          </g>
        </g>

        {/* ==========================================
            4. SIX OUTER NODES & COMPACT STATE INDICATORS
           ========================================== */}
        <g id="hero-outer-nodes">
          {nodes.map((node) => {
            const isHovered = hoveredNode === node.id;
            const strokeColor = node.side === 'left' ? colors.cyanLine : colors.purpleLine;
            const ringColor = node.side === 'left' ? colors.cyanMuted : colors.purpleMuted;
            
            // Circular Progress Ring Math
            const percent = node.percent || 0;
            const ringRadius = 24;
            const ringCircumference = 2 * Math.PI * ringRadius; // ~150.8
            const ringDashoffset = ringCircumference - (percent / 100) * ringCircumference;

            return (
              <g 
                key={node.id}
                id={`hero-node-${node.id}`}
                className="cursor-pointer group outline-none"
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
                onClick={() => onNodeClick(node.id)}
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
                
                {/* Concentric Ring 2 (HUD gaps) */}
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

                {/* Real circular progress ring wrapped around the node */}
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

                {/* Lucide Inner Icon mapped into 24x24 translate coordinate */}
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
                <text
                  x={node.x}
                  y={node.y + 44}
                  textAnchor="middle"
                  fill={isHovered ? strokeColor : colors.textLabel}
                  fontSize="10"
                  fontWeight={isHovered ? 'bold' : 'bold'}
                  letterSpacing="0.5"
                  className="transition-colors duration-300 opacity-90"
                  style={{ userSelect: 'none' }}
                >
                  {node.label}
                </text>

                {/* Data Metric Text */}
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

                {/* Small HUD Data Bar below label */}
                <g opacity={isHovered ? 1.0 : 0.4} className="transition-opacity duration-300">
                  <rect x={node.x - 25} y={node.y + 59} width="50" height="2.5" rx="1.25" fill={colors.lineMuted} />
                  <rect x={node.x - 25} y={node.y + 59} width={50 * (percent / 100)} height="2.5" rx="1.25" fill={strokeColor} />
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
