'use client';

import React, { useState } from 'react';

interface ExactHeroComponentProps {
  theme: 'light' | 'dark';
}

export default function ExactHeroComponent({ theme }: ExactHeroComponentProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Theme-specific color definitions
  const colors = {
    bgGlowCyan: theme === 'dark' ? 'rgba(0, 240, 255, 0.12)' : 'rgba(2, 132, 199, 0.06)',
    bgGlowPurple: theme === 'dark' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(124, 58, 237, 0.06)',
    cyanLine: theme === 'dark' ? '#00f0ff' : '#0284c7',
    purpleLine: theme === 'dark' ? '#a855f7' : '#7c3aed',
    cyanMuted: theme === 'dark' ? 'rgba(0, 240, 255, 0.3)' : 'rgba(2, 132, 199, 0.25)',
    purpleMuted: theme === 'dark' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(124, 58, 237, 0.25)',
    lineMuted: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    textLabel: theme === 'dark' ? '#94a3b8' : '#475569',
    centerCoreGlow: theme === 'dark' ? 'rgba(0, 240, 255, 0.8)' : 'rgba(2, 132, 199, 0.7)',
  };

  // Node coordinate configurations
  const nodes = [
    { id: 'checklist', x: 220, y: 100, label: 'SMS Checklist', side: 'left', icon: 'checklist' },
    { id: 'users', x: 110, y: 300, label: 'User Registry', side: 'left', icon: 'users' },
    { id: 'grid', x: 220, y: 500, label: 'Matrix Grid', side: 'left', icon: 'grid' },
    { id: 'folder', x: 780, y: 100, label: 'Vault Folder', side: 'right', icon: 'folder' },
    { id: 'document', x: 890, y: 300, label: 'Document Files', side: 'right', icon: 'document' },
    { id: 'chart', x: 780, y: 500, label: 'Telemetry Report', side: 'right', icon: 'chart' },
  ];

  // Render SVG icons in a 24x24 grid
  const renderIcon = (type: string, strokeColor: string) => {
    switch (type) {
      case 'checklist':
        return (
          <>
            <path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-3a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2H6z" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 2h6v2H9z" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 9h6" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M9 13h6" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M9 17h6" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="7" cy="9" r="0.75" fill={strokeColor} />
            <circle cx="7" cy="13" r="0.75" fill={strokeColor} />
            <circle cx="7" cy="17" r="0.75" fill={strokeColor} />
          </>
        );
      case 'users':
        return (
          <>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="7" r="4" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );
      case 'grid':
        return (
          <>
            <rect x="3" y="3" width="7" height="7" rx="1" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="14" y="3" width="7" height="7" rx="1" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="3" y="14" width="7" height="7" rx="1" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="14" y="14" width="7" height="7" rx="1" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );
      case 'folder':
        return (
          <>
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );
      case 'document':
        return (
          <>
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13 2v7h7" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="8" y1="13" x2="16" y2="13" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="8" y1="17" x2="16" y2="17" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          </>
        );
      case 'chart':
        return (
          <>
            <line x1="18" y1="20" x2="18" y2="10" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" />
            <line x1="12" y1="20" x2="12" y2="4" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" />
            <line x1="6" y1="20" x2="6" y2="14" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" />
            <line x1="3" y1="20" x2="21" y2="20" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto flex items-center justify-center p-4">
      {/* SVG Viewport */}
      <svg 
        className="w-full h-auto aspect-[5/3] overflow-visible select-none" 
        viewBox="0 0 1000 600"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Neon Glow Filters */}
          <filter id="glow-cyan-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-purple-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-strong-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradients */}
          <radialGradient id="cyan-radial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="purple-radial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="cyan-purple-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>

        {/* ==========================================
            1. BACKGROUND SOFT GLOWS
           ========================================== */}
        <g id="bg-glows" className="pointer-events-none">
          {/* Left Side Cyan Ambient Glow */}
          <circle cx="350" cy="300" r="280" fill="url(#cyan-radial)" />
          {/* Right Side Purple Ambient Glow */}
          <circle cx="650" cy="300" r="280" fill="url(#purple-radial)" />
          {/* Central Bright Core Glow */}
          <circle cx="500" cy="300" r="80" fill={theme === 'dark' ? 'rgba(0, 240, 255, 0.06)' : 'rgba(2, 132, 199, 0.03)'} />
        </g>

        {/* ==========================================
            2. CONNECTOR BUS PATHS (Topology)
           ========================================== */}
        <g id="connector-paths" strokeLinecap="round" strokeLinejoin="round">
          {/* TOP-LEFT CONNECTOR */}
          <g id="path-top-left" opacity={hoveredNode === null || hoveredNode === 'checklist' ? 1 : 0.35}>
            {/* Sub-trace */}
            <path 
              d="M 415 215 L 380 180 L 315 180 L 270 135 L 240 135" 
              fill="none" 
              stroke={colors.lineMuted} 
              strokeWidth="1.2" 
            />
            {/* Main Trace */}
            <path 
              d="M 405 205 L 370 170 L 310 170 L 260 120 L 220 120" 
              fill="none" 
              stroke={hoveredNode === 'checklist' ? colors.cyanLine : colors.cyanMuted} 
              strokeWidth={hoveredNode === 'checklist' ? '2.2' : '1.5'} 
              filter={hoveredNode === 'checklist' ? 'url(#glow-cyan-filter)' : undefined}
              className="transition-all duration-300"
            />
            {/* Junction dot */}
            <circle cx="370" cy="170" r="3" fill={colors.cyanLine} />
          </g>

          {/* LEFT CONNECTOR */}
          <g id="path-left" opacity={hoveredNode === null || hoveredNode === 'users' ? 1 : 0.35}>
            {/* Upper sub-trace */}
            <path 
              d="M 375 292 L 340 292 L 330 300 L 260 300 L 250 292 L 160 292" 
              fill="none" 
              stroke={colors.lineMuted} 
              strokeWidth="1.2" 
            />
            {/* Lower sub-trace */}
            <path 
              d="M 375 308 L 340 308 L 330 300 L 260 300 L 250 308 L 160 308" 
              fill="none" 
              stroke={colors.lineMuted} 
              strokeWidth="1.2" 
            />
            {/* Main Trace */}
            <path 
              d="M 380 300 L 130 300" 
              fill="none" 
              stroke={hoveredNode === 'users' ? colors.cyanLine : colors.cyanMuted} 
              strokeWidth={hoveredNode === 'users' ? '2.2' : '1.5'} 
              filter={hoveredNode === 'users' ? 'url(#glow-cyan-filter)' : undefined}
              className="transition-all duration-300"
            />
            {/* Junction dot */}
            <circle cx="350" cy="300" r="3.5" fill={colors.cyanLine} />
          </g>

          {/* BOTTOM-LEFT CONNECTOR */}
          <g id="path-bottom-left" opacity={hoveredNode === null || hoveredNode === 'grid' ? 1 : 0.35}>
            {/* Sub-trace */}
            <path 
              d="M 415 385 L 380 420 L 315 420 L 270 465 L 240 465" 
              fill="none" 
              stroke={colors.lineMuted} 
              strokeWidth="1.2" 
            />
            {/* Main Trace */}
            <path 
              d="M 405 395 L 370 430 L 310 430 L 260 480 L 220 480" 
              fill="none" 
              stroke={hoveredNode === 'grid' ? colors.cyanLine : colors.cyanMuted} 
              strokeWidth={hoveredNode === 'grid' ? '2.2' : '1.5'} 
              filter={hoveredNode === 'grid' ? 'url(#glow-cyan-filter)' : undefined}
              className="transition-all duration-300"
            />
            {/* Junction dot */}
            <circle cx="370" cy="430" r="3" fill={colors.cyanLine} />
          </g>

          {/* TOP-RIGHT CONNECTOR */}
          <g id="path-top-right" opacity={hoveredNode === null || hoveredNode === 'folder' ? 1 : 0.35}>
            {/* Sub-trace */}
            <path 
              d="M 585 215 L 620 180 L 685 180 L 730 135 L 760 135" 
              fill="none" 
              stroke={colors.lineMuted} 
              strokeWidth="1.2" 
            />
            {/* Main Trace */}
            <path 
              d="M 595 205 L 630 170 L 690 170 L 740 120 L 780 120" 
              fill="none" 
              stroke={hoveredNode === 'folder' ? colors.purpleLine : colors.purpleMuted} 
              strokeWidth={hoveredNode === 'folder' ? '2.2' : '1.5'} 
              filter={hoveredNode === 'folder' ? 'url(#glow-purple-filter)' : undefined}
              className="transition-all duration-300"
            />
            {/* Junction dot */}
            <circle cx="630" cy="170" r="3" fill={colors.purpleLine} />
          </g>

          {/* RIGHT CONNECTOR */}
          <g id="path-right" opacity={hoveredNode === null || hoveredNode === 'document' ? 1 : 0.35}>
            {/* Upper sub-trace */}
            <path 
              d="M 625 292 L 660 292 L 670 300 L 740 300 L 750 292 L 840 292" 
              fill="none" 
              stroke={colors.lineMuted} 
              strokeWidth="1.2" 
            />
            {/* Lower sub-trace */}
            <path 
              d="M 625 308 L 660 308 L 670 300 L 740 300 L 750 308 L 840 308" 
              fill="none" 
              stroke={colors.lineMuted} 
              strokeWidth="1.2" 
            />
            {/* Main Trace */}
            <path 
              d="M 620 300 L 870 300" 
              fill="none" 
              stroke={hoveredNode === 'document' ? colors.purpleLine : colors.purpleMuted} 
              strokeWidth={hoveredNode === 'document' ? '2.2' : '1.5'} 
              filter={hoveredNode === 'document' ? 'url(#glow-purple-filter)' : undefined}
              className="transition-all duration-300"
            />
            {/* Junction dot */}
            <circle cx="650" cy="300" r="3.5" fill={colors.purpleLine} />
          </g>

          {/* BOTTOM-RIGHT CONNECTOR */}
          <g id="path-bottom-right" opacity={hoveredNode === null || hoveredNode === 'chart' ? 1 : 0.35}>
            {/* Sub-trace */}
            <path 
              d="M 585 385 L 620 420 L 685 420 L 730 465 L 760 465" 
              fill="none" 
              stroke={colors.lineMuted} 
              strokeWidth="1.2" 
            />
            {/* Main Trace */}
            <path 
              d="M 595 395 L 630 430 L 690 430 L 740 480 L 780 480" 
              fill="none" 
              stroke={hoveredNode === 'chart' ? colors.purpleLine : colors.purpleMuted} 
              strokeWidth={hoveredNode === 'chart' ? '2.2' : '1.5'} 
              filter={hoveredNode === 'chart' ? 'url(#glow-purple-filter)' : undefined}
              className="transition-all duration-300"
            />
            {/* Junction dot */}
            <circle cx="630" cy="430" r="3" fill={colors.purpleLine} />
          </g>
        </g>

        {/* ==========================================
            3. CONNECTOR PULSING FLOW DOTS
           ========================================== */}
        <g id="flowing-pulse-dots" className="pointer-events-none">
          {/* Top-Left Flow */}
          <circle r="3" fill={colors.cyanLine} filter="url(#glow-cyan-filter)">
            <animateMotion path="M 405 205 L 370 170 L 310 170 L 260 120 L 220 120" dur="3s" repeatCount="indefinite" />
          </circle>
          {/* Left Flow */}
          <circle r="3" fill={colors.cyanLine} filter="url(#glow-cyan-filter)">
            <animateMotion path="M 380 300 L 130 300" dur="2.5s" repeatCount="indefinite" />
          </circle>
          {/* Bottom-Left Flow */}
          <circle r="3" fill={colors.cyanLine} filter="url(#glow-cyan-filter)">
            <animateMotion path="M 405 395 L 370 430 L 310 430 L 260 480 L 220 480" dur="3.2s" repeatCount="indefinite" />
          </circle>
          {/* Top-Right Flow */}
          <circle r="3" fill={colors.purpleLine} filter="url(#glow-purple-filter)">
            <animateMotion path="M 595 205 L 630 170 L 690 170 L 740 120 L 780 120" dur="2.8s" repeatCount="indefinite" />
          </circle>
          {/* Right Flow */}
          <circle r="3" fill={colors.purpleLine} filter="url(#glow-purple-filter)">
            <animateMotion path="M 620 300 L 870 300" dur="3.5s" repeatCount="indefinite" />
          </circle>
          {/* Bottom-Right Flow */}
          <circle r="3" fill={colors.purpleLine} filter="url(#glow-purple-filter)">
            <animateMotion path="M 595 395 L 630 430 L 690 430 L 740 480 L 780 480" dur="3s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* ==========================================
            4. CENTRAL LUMINOUS CORE
           ========================================== */}
        <g id="central-core">
          {/* Outermost Thin Reference Circle */}
          <circle cx="500" cy="300" r="160" fill="none" stroke={colors.lineMuted} strokeWidth="0.8" />
          
          {/* Concentric Circle Guides */}
          <circle cx="500" cy="300" r="140" fill="none" stroke={colors.lineMuted} strokeWidth="1" strokeDasharray="3,6" />
          
          {/* Large split-arcs (Image A / Image B Core centerpiece highlight) */}
          {/* Left cyan split arc */}
          <path 
            d="M 500 176 A 124 124 0 0 0 500 424" 
            fill="none" 
            stroke={colors.cyanLine} 
            strokeWidth="3.5" 
            strokeLinecap="round"
            filter={hoveredNode && nodes.find(n => n.id === hoveredNode)?.side === 'left' ? 'url(#glow-cyan-filter)' : undefined}
            className="transition-all duration-300"
          />
          {/* Right purple split arc */}
          <path 
            d="M 500 424 A 124 124 0 0 0 500 176" 
            fill="none" 
            stroke={colors.purpleLine} 
            strokeWidth="3.5" 
            strokeLinecap="round"
            filter={hoveredNode && nodes.find(n => n.id === hoveredNode)?.side === 'right' ? 'url(#glow-purple-filter)' : undefined}
            className="transition-all duration-300"
          />

          {/* HUD index labels & ticks */}
          <g id="hud-ticks-labels">
            {/* Ticks circle: Outer ring with rotating segments */}
            <circle 
              cx="500" 
              cy="300" 
              r="110" 
              fill="none" 
              stroke="url(#cyan-purple-grad)" 
              strokeWidth="2" 
              strokeDasharray="40 10 90 20 5 15 150 25" 
              className="proto-animate-cw"
            />
            {/* Ticks circle: Middle ring with counter-clockwise rotation */}
            <circle 
              cx="500" 
              cy="300" 
              r="92" 
              fill="none" 
              stroke={colors.cyanLine} 
              strokeWidth="1.2" 
              strokeDasharray="80 30 10 10 40 20" 
              opacity="0.6"
              className="proto-animate-ccw"
            />
          </g>

          {/* Fine Compass Ticks (Outer circle dial) */}
          <g id="compass-ticks-outer">
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

          {/* Thin segment tracks */}
          <circle cx="500" cy="300" r="76" fill="none" stroke={colors.lineMuted} strokeWidth="1" />
          <circle cx="500" cy="300" r="72" fill="none" stroke="url(#cyan-purple-grad)" strokeWidth="1.5" strokeDasharray="180 180" className="proto-animate-cw" />

          {/* Central Crosshairs */}
          {/* Vertical axis line */}
          <line x1="500" y1="180" x2="500" y2="420" stroke={colors.lineMuted} strokeWidth="0.8" />
          <line x1="500" y1="210" x2="500" y2="390" stroke={colors.cyanMuted} strokeWidth="1.2" strokeDasharray="4 4" />
          {/* Horizontal axis line */}
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

          {/* Radial Ticks (Inner Circle Dial) */}
          <g id="compass-ticks-inner">
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
                  opacity="0.6"
                />
              );
            })}
          </g>

          {/* Central Bright Dot & Aura */}
          <g id="center-light-source">
            <circle 
              cx="500" 
              cy="300" 
              r="24" 
              fill="none" 
              stroke={colors.cyanLine} 
              strokeWidth="2.5" 
              filter="url(#glow-cyan-filter)"
            />
            {/* Pulsing Core */}
            <circle 
              cx="500" 
              cy="300" 
              r="12" 
              fill={theme === 'dark' ? '#ffffff' : colors.cyanLine} 
              filter="url(#glow-strong-filter)"
              className="proto-animate-pulse"
            />
          </g>
        </g>

        {/* ==========================================
            5. SIX OUTER NODES & HUD FRAMES
           ========================================== */}
        <g id="outer-nodes">
          {nodes.map((node) => {
            const isHovered = hoveredNode === node.id;
            const strokeColor = node.side === 'left' ? colors.cyanLine : colors.purpleLine;
            const ringColor = node.side === 'left' ? colors.cyanMuted : colors.purpleMuted;
            
            return (
              <g 
                key={node.id}
                id={`node-${node.id}`}
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Node Ambient Soft Glow */}
                <circle 
                  cx={node.x} 
                  cy={node.y} 
                  r="45" 
                  fill={node.side === 'left' ? 'url(#cyan-radial)' : 'url(#purple-radial)'} 
                  opacity={isHovered ? 1 : 0.4}
                  className="transition-all duration-300"
                />

                {/* Concentric Ring 1 (Outer fine guide) */}
                <circle 
                  cx={node.x} 
                  cy={node.y} 
                  r="36" 
                  fill="none" 
                  stroke={ringColor} 
                  strokeWidth="0.8" 
                  strokeDasharray="4 8" 
                  opacity={isHovered ? 1 : 0.6}
                  className="transition-all duration-300"
                />

                {/* Concentric Ring 2 (Middle HUD indicator) */}
                <circle 
                  cx={node.x} 
                  cy={node.y} 
                  r="28" 
                  fill="none" 
                  stroke={strokeColor} 
                  strokeWidth="1.2" 
                  strokeDasharray={isHovered ? "none" : "15 5 45 5 10 10"} 
                  opacity={isHovered ? 1 : 0.75}
                  filter={isHovered ? (node.side === 'left' ? 'url(#glow-cyan-filter)' : 'url(#glow-purple-filter)') : undefined}
                  className="transition-all duration-300"
                />

                {/* Outer Tick indicators (top, bottom, left, right ticks) */}
                <line x1={node.x} y1={node.y - 36} x2={node.x} y2={node.y - 32} stroke={strokeColor} strokeWidth="1.5" />
                <line x1={node.x} y1={node.y + 32} x2={node.x} y2={node.y + 36} stroke={strokeColor} strokeWidth="1.5" />
                <line x1={node.x - 36} y1={node.y} x2={node.x - 32} y2={node.y} stroke={strokeColor} strokeWidth="1.5" />
                <line x1={node.x + 32} y1={node.y} x2={node.x + 36} y2={node.y} stroke={strokeColor} strokeWidth="1.5" />

                {/* Node Solid Center Circle */}
                <circle 
                  cx={node.x} 
                  cy={node.y} 
                  r="20" 
                  fill={theme === 'dark' ? '#0f172a' : '#ffffff'} 
                  stroke={strokeColor} 
                  strokeWidth={isHovered ? '2.5' : '1.8'} 
                  filter={isHovered ? (node.side === 'left' ? 'url(#glow-cyan-filter)' : 'url(#glow-purple-filter)') : undefined}
                  className="transition-all duration-300"
                />

                {/* Inner Icon */}
                <g transform={`translate(${node.x - 12}, ${node.y - 12}) scale(1)`}>
                  {renderIcon(node.icon, isHovered ? (theme === 'dark' ? '#ffffff' : strokeColor) : strokeColor)}
                </g>

                {/* Hover node indicator label */}
                <text
                  x={node.x}
                  y={node.y + 50}
                  textAnchor="middle"
                  fill={isHovered ? strokeColor : colors.textLabel}
                  fontSize="10"
                  fontWeight={isHovered ? 'bold' : 'medium'}
                  letterSpacing="0.5"
                  className="transition-colors duration-300 opacity-80"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
