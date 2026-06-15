'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  FolderLock,
  Grid,
  ClipboardList,
  FolderArchive,
  Settings,
  CreditCard,
  Building2,
  LogOut,
  Sun,
  Moon,
  CircleDot,
  Info,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UploadCloud,
  History,
  Star,
  BarChart3,
  Search,
  Bell,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  FileText,
  Layers,
  HelpCircle,
  TrendingUp,
  Activity,
  CheckCircle
} from 'lucide-react';

// Custom CSS styling injected specifically for the prototype page to ensure isolation
export function PrototypeStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes proto-rotate-cw {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes proto-rotate-ccw {
        from { transform: rotate(0deg); }
        to { transform: rotate(-360deg); }
      }
      @keyframes proto-pulse-glow {
        0%, 100% { transform: scale(1); opacity: 0.8; filter: drop-shadow(0 0 8px rgba(34, 197, 94, 0.6)); }
        50% { transform: scale(1.05); opacity: 1; filter: drop-shadow(0 0 16px rgba(34, 197, 94, 0.9)); }
      }
      @keyframes proto-pulse-glow-warning {
        0%, 100% { transform: scale(1); opacity: 0.8; filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.6)); }
        50% { transform: scale(1.05); opacity: 1; filter: drop-shadow(0 0 16px rgba(245, 158, 11, 0.9)); }
      }
      @keyframes proto-flow-line {
        to { stroke-dashoffset: -20; }
      }
      .proto-animate-cw {
        animation: proto-rotate-cw 25s linear infinite;
        transform-origin: center;
      }
      .proto-animate-ccw {
        animation: proto-rotate-ccw 30s linear infinite;
        transform-origin: center;
      }
      .proto-animate-pulse {
        animation: proto-pulse-glow 3s ease-in-out infinite;
        transform-origin: center;
      }
      .proto-animate-pulse-warning {
        animation: proto-pulse-glow-warning 3s ease-in-out infinite;
        transform-origin: center;
      }
      .proto-animate-flow {
        stroke-dasharray: 6, 4;
        animation: proto-flow-line 1.5s linear infinite;
      }
      .proto-glass {
        background: rgba(15, 23, 42, 0.4);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      .proto-glass-light {
        background: rgba(255, 255, 255, 0.65);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(0, 0, 0, 0.06);
      }
      .proto-glass-midtone {
        background: rgba(30, 41, 59, 0.7);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.06);
      }
      .proto-card-hover {
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .proto-card-hover:hover {
        transform: translateY(-2px);
        border-color: rgba(99, 102, 241, 0.4);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
      }
      .proto-card-hover-light:hover {
        transform: translateY(-2px);
        border-color: rgba(99, 102, 241, 0.3);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
      }
      @media (prefers-reduced-motion: reduce) {
        .proto-animate-cw, .proto-animate-ccw, .proto-animate-pulse, .proto-animate-pulse-warning, .proto-animate-flow {
          animation: none !important;
          transform: none !important;
          stroke-dasharray: none !important;
        }
      }
    ` }} />
  );
}

// Grouped Sidebar items definition
const SIDEBAR_SECTIONS = [
  {
    title: 'Core',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, active: true },
      { name: 'Favourites', icon: Star },
      { name: 'Requirements', icon: ClipboardList },
      { name: 'Evidence Vault', icon: FolderLock },
    ]
  },
  {
    title: 'Assurance',
    items: [
      { name: 'Competency Matrix', icon: UserCheck },
      { name: 'Asset Matrix', icon: Grid },
      { name: 'Audit Pack Builder', icon: FolderArchive },
      { name: 'Reports', icon: BarChart3 },
    ]
  },
  {
    title: 'Admin',
    items: [
      { name: 'Audit Trail', icon: History },
      { name: 'Organisation Management', icon: Building2 },
      { name: 'Billing', icon: CreditCard },
      { name: 'Settings', icon: Settings },
    ]
  }
];

// Helper legal tooltip
function LegalTooltip() {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block ml-2 align-middle">
      <button 
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        aria-label="LUMÉN Legal Info"
        className="text-zinc-500 hover:text-indigo-400 p-0.5 rounded transition-colors"
      >
        <Info className="h-4 w-4" />
      </button>
      {show && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 w-64 p-3 rounded-lg border border-border bg-popover text-popover-foreground text-xs shadow-xl z-50 transition-all">
          <p className="font-semibold mb-1">LUMÉN Compliance Platform</p>
          <p className="text-muted-foreground leading-relaxed">
            This platform is an evidence intelligence hub. It organizes audit files, tracks expiries, and builds pack templates. It does not provide legal safety advice, risk assessments, or guarantee regulatory compliance.
          </p>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// CONCEPT 1: Executive Command Centre (Dark Premium)
// ----------------------------------------------------
export function ConceptExecutiveCommandCentre() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'focus' | 'upcoming' | 'overdue'>('focus');

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none relative">
      {/* Sidebar Component */}
      <aside className="w-64 border-r border-slate-900 bg-slate-950/80 backdrop-blur-md flex flex-col z-20">
        {/* Sidebar Brand Header */}
        <div className="p-5 border-b border-slate-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]">
              L
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-200 to-indigo-500 bg-clip-text text-transparent">LUMÉN</span>
            <LegalTooltip />
          </div>
        </div>

        {/* Sidebar Items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {SIDEBAR_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1.5">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3">{section.title}</h4>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    type="button"
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      item.active
                        ? 'bg-indigo-600/15 text-indigo-400 border-l-2 border-indigo-500 pl-2.5 shadow-[inset_0_0_12px_rgba(99,102,241,0.08)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                    }`}
                  >
                    <Icon className={`h-4.5 w-4.5 shrink-0 ${item.active ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-900 text-[10px] text-slate-500 flex justify-between items-center">
          <span>v1.2.0 • Prototype Display</span>
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Command Bar */}
        <header className="h-16 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between z-10">
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium uppercase tracking-wider">
              DEMO WORKSPACE
            </span>
            <span className="text-slate-600">/</span>
            <h1 className="text-base font-semibold text-slate-200">Global Executive Overview</h1>
          </div>

          {/* Top Right Controls */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Global telemetry search..."
                className="w-full h-9 bg-slate-900/60 border border-slate-800 rounded-lg pl-9 pr-4 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                readOnly
              />
            </div>

            {/* Quick Action Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold flex items-center space-x-2 shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Quick Action</span>
              </button>

              {showActionsMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-800 bg-slate-900 p-1 shadow-2xl z-30">
                  <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 mb-1">
                    System Telemetry Commands
                  </div>
                  {[
                    { name: 'Upload Evidence File', desc: 'Secure repository vault' },
                    { name: 'Define Readiness Goal', desc: 'Target posture threshold' },
                    { name: 'Issue Competency Assessment', desc: 'Employee verification' },
                    { name: 'Compile Audit Pack', desc: 'Produce export template' }
                  ].map((act) => (
                    <button
                      key={act.name}
                      type="button"
                      className="w-full text-left px-3 py-2 rounded hover:bg-slate-800 text-sm transition-colors"
                      onClick={() => setShowActionsMenu(false)}
                    >
                      <div className="font-medium text-slate-200">{act.name}</div>
                      <div className="text-[10px] text-slate-500">{act.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              className="p-2 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-900 text-slate-400 hover:text-slate-200 relative transition-colors"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            </button>

            {/* User Profile avatar dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="h-9 w-9 rounded-lg bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-indigo-300 font-bold hover:bg-indigo-900 transition-colors"
              >
                JD
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-lg border border-slate-850 bg-slate-900 p-2 shadow-2xl z-30">
                  <div className="p-3 border-b border-slate-800 mb-2">
                    <div className="font-semibold text-slate-200">Jane Doe</div>
                    <div className="text-xs text-slate-500">jane.doe@company-demo.com</div>
                    <div className="mt-1.5 text-[10px] py-0.5 px-2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 inline-block font-medium">
                      Auditor Admin
                    </div>
                  </div>
                  <button
                    type="button"
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded hover:bg-slate-800 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Platform Settings</span>
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded hover:bg-slate-800 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <Building2 className="h-4 w-4" />
                    <span>Organization Hub</span>
                  </button>
                  <div className="border-t border-slate-800 my-1.5" />
                  <button
                    type="button"
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded hover:bg-rose-950/30 text-sm text-rose-400 hover:text-rose-300 transition-colors"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out Telemetry</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable telemetry panel */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top KPI Command Strip */}
          <section className="grid grid-cols-4 divide-x divide-slate-800 border border-slate-850 bg-slate-900/40 rounded-xl p-4 shadow-lg backdrop-blur-md">
            {[
              { label: 'Overall Readiness score', value: '94.2%', change: '+1.4% vs last week', status: 'compliant' },
              { label: 'Evidence Vault Integrity', value: '1,420 files', change: '100% verified encrypted', status: 'compliant' },
              { label: 'Assessments Outstanding', value: '4 checks', change: '2 due in next 48 hours', status: 'warning' },
              { label: 'Action Items Pending', value: '0 critical', change: 'All high-priority clear', status: 'compliant' }
            ].map((kpi) => (
              <div key={kpi.label} className="px-6 flex flex-col justify-between h-14">
                <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">{kpi.label}</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-bold text-slate-100">{kpi.value}</span>
                  <span className={`text-[10px] font-semibold flex items-center space-x-1 ${kpi.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    <span>{kpi.change}</span>
                  </span>
                </div>
              </div>
            ))}
          </section>

          {/* Central Section: Central Luminous Core & Right intelligence Rail */}
          <div className="grid grid-cols-3 gap-6">
            {/* Luminous Centerpiece Card (Spans 2 columns) */}
            <section className="col-span-2 border border-slate-850 bg-slate-900/40 rounded-xl p-6 flex flex-col justify-between relative overflow-hidden h-[420px] shadow-lg group">
              {/* Starburst backdrop flow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)] pointer-events-none" />
              
              {/* Card Title Header */}
              <div className="flex justify-between items-center z-10">
                <div>
                  <h3 className="font-semibold text-slate-200">Compliance Core Posture Telemetry</h3>
                  <p className="text-xs text-slate-500">Live SVG mapping of active framework links & health scores</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Operational</span>
                </div>
              </div>

              {/* Custom Animated SVG Composition */}
              <div className="flex-1 flex items-center justify-center z-10 relative">
                <svg className="w-full max-w-[450px] h-[280px]" viewBox="0 0 500 300">
                  {/* Radial Starburst Spokes Background */}
                  <g stroke="rgba(255,255,255,0.02)" strokeWidth="1" strokeDasharray="3,3">
                    <line x1="250" y1="150" x2="50" y2="40" />
                    <line x1="250" y1="150" x2="450" y2="40" />
                    <line x1="250" y1="150" x2="50" y2="260" />
                    <line x1="250" y1="150" x2="450" y2="260" />
                    <line x1="250" y1="150" x2="250" y2="20" />
                    <line x1="250" y1="150" x2="250" y2="280" />
                  </g>

                  {/* Concentric Rotating Ring (Outer) */}
                  <circle 
                    cx="250" 
                    cy="150" 
                    r="100" 
                    fill="none" 
                    stroke="rgba(99, 102, 241, 0.08)" 
                    strokeWidth="1.5" 
                    strokeDasharray="6 8" 
                    className="proto-animate-cw" 
                  />

                  {/* Concentric Orbit Ring (Inner Track) */}
                  <circle 
                    cx="250" 
                    cy="150" 
                    r="70" 
                    fill="none" 
                    stroke="rgba(99, 102, 241, 0.04)" 
                    strokeWidth="1" 
                  />

                  {/* Satellite Interconnecting Flowing Paths */}
                  {/* Sat 1: Competency (Top Left) */}
                  <path d="M 120 70 Q 185 100 250 150" fill="none" stroke="rgba(34, 197, 94, 0.4)" strokeWidth="1.5" className="proto-animate-flow" />
                  {/* Sat 2: Asset Registry (Top Right) */}
                  <path d="M 380 70 Q 315 100 250 150" fill="none" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="1.5" className="proto-animate-flow" />
                  {/* Sat 3: Evidence Vault (Bottom Left) */}
                  <path d="M 120 230 Q 185 200 250 150" fill="none" stroke="rgba(34, 197, 94, 0.4)" strokeWidth="1.5" className="proto-animate-flow" />
                  {/* Sat 4: Audit Packs (Bottom Right) */}
                  <path d="M 380 230 Q 315 200 250 150" fill="none" stroke="rgba(34, 197, 94, 0.4)" strokeWidth="1.5" className="proto-animate-flow" />

                  {/* Satellite Node Groups */}
                  {/* Node 1: Competency */}
                  <g transform="translate(120, 70)" className="cursor-pointer group/node">
                    <circle r="22" fill="#0f172a" stroke="#22c55e" strokeWidth="2" className="transition-all duration-300 group-hover/node:stroke-indigo-400 group-hover/node:r-24" />
                    <text textAnchor="middle" y="4" fill="#a7f3d0" fontSize="9" fontWeight="bold">98%</text>
                    <text textAnchor="middle" y="38" fill="#94a3b8" fontSize="8">Competencies</text>
                  </g>

                  {/* Node 2: Asset Matrix */}
                  <g transform="translate(380, 70)" className="cursor-pointer group/node">
                    <circle r="22" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" className="transition-all duration-300 group-hover/node:stroke-indigo-400 group-hover/node:r-24" />
                    <text textAnchor="middle" y="4" fill="#fef3c7" fontSize="9" fontWeight="bold">82%</text>
                    <text textAnchor="middle" y="38" fill="#94a3b8" fontSize="8">Asset Matrix</text>
                  </g>

                  {/* Node 3: Evidence Vault */}
                  <g transform="translate(120, 230)" className="cursor-pointer group/node">
                    <circle r="22" fill="#0f172a" stroke="#22c55e" strokeWidth="2" className="transition-all duration-300 group-hover/node:stroke-indigo-400 group-hover/node:r-24" />
                    <text textAnchor="middle" y="4" fill="#a7f3d0" fontSize="9" fontWeight="bold">100%</text>
                    <text textAnchor="middle" y="38" fill="#94a3b8" fontSize="8">Evidence Vault</text>
                  </g>

                  {/* Node 4: Audit Packs */}
                  <g transform="translate(380, 230)" className="cursor-pointer group/node">
                    <circle r="22" fill="#0f172a" stroke="#22c55e" strokeWidth="2" className="transition-all duration-300 group-hover/node:stroke-indigo-400 group-hover/node:r-24" />
                    <text textAnchor="middle" y="4" fill="#a7f3d0" fontSize="9" fontWeight="bold">95%</text>
                    <text textAnchor="middle" y="38" fill="#94a3b8" fontSize="8">Audit Packs</text>
                  </g>

                  {/* Central Glow Core Core Group */}
                  <g transform="translate(250, 150)" className="proto-animate-pulse cursor-pointer">
                    <circle r="36" fill="rgba(34, 197, 94, 0.12)" />
                    <circle r="28" fill="#0f172a" stroke="#22c55e" strokeWidth="3" />
                    <text textAnchor="middle" y="-2" fill="#fff" fontSize="11" fontWeight="bold">94%</text>
                    <text textAnchor="middle" y="10" fill="#a7f3d0" fontSize="7" fontWeight="medium" letterSpacing="0.5">READY</text>
                  </g>
                </svg>
              </div>

              {/* Bottom center metadata overlay */}
              <div className="absolute bottom-4 left-6 right-6 flex justify-between items-center text-[10px] text-slate-500 z-10 border-t border-slate-900 pt-3">
                <span>Core Nodes: 4 Active Telemetry Sources</span>
                <span>Hover nodes for satellite status reports</span>
              </div>
            </section>

            {/* Right Intelligence Rail */}
            <section className="border border-slate-850 bg-slate-900/40 rounded-xl p-5 flex flex-col justify-between shadow-lg h-[420px] backdrop-blur-md">
              {/* Compliance Gauge */}
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-10 w-10 rounded-full border-2 border-dashed border-indigo-500/30 flex items-center justify-center">
                  <TrendingUp className="h-4.5 w-4.5 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Intelligence Telemetry</h4>
                  <p className="text-[10px] text-slate-500">Live priority action scoring</p>
                </div>
              </div>

              {/* Tabs selector */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/80 rounded-lg border border-slate-850 text-xs font-semibold mb-4">
                {[
                  { id: 'focus', label: 'Smart Focus' },
                  { id: 'upcoming', label: 'Upcoming' },
                  { id: 'overdue', label: 'Needs Action' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id as any)}
                    className={`py-1.5 rounded-md text-center transition-all ${
                      activeTab === t.id 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-250'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                {activeTab === 'focus' && (
                  <>
                    <div className="p-3 bg-slate-950/30 border border-slate-900 rounded-lg space-y-1 hover:border-slate-800 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-300">File Classification Gap</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">Low Risk</span>
                      </div>
                      <p className="text-slate-500 leading-normal">3 uploaded files in Evidence Vault have missing requirement tags. Action required prior to next audit cycle.</p>
                    </div>
                    <div className="p-3 bg-slate-950/30 border border-slate-900 rounded-lg space-y-1 hover:border-slate-800 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-300">Training Check Required</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Suggested</span>
                      </div>
                      <p className="text-slate-500 leading-normal">Renew 1 competency verification for Jane Doe (Safety Officer Matrix) to avoid transition warnings.</p>
                    </div>
                  </>
                )}
                {activeTab === 'upcoming' && (
                  <>
                    <div className="p-3 bg-slate-950/30 border border-slate-900 rounded-lg flex items-center justify-between hover:border-slate-800 transition-colors">
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-300">Requirement 4.2 Review</div>
                        <div className="text-[10px] text-slate-500 flex items-center space-x-1.5">
                          <Clock className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Expires in 4 days</span>
                        </div>
                      </div>
                      <ArrowUpRight className="h-4.5 w-4.5 text-slate-500" />
                    </div>
                    <div className="p-3 bg-slate-950/30 border border-slate-900 rounded-lg flex items-center justify-between hover:border-slate-800 transition-colors">
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-300">Asset Verification Check</div>
                        <div className="text-[10px] text-slate-500 flex items-center space-x-1.5">
                          <Clock className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Expires in 7 days</span>
                        </div>
                      </div>
                      <ArrowUpRight className="h-4.5 w-4.5 text-slate-500" />
                    </div>
                  </>
                )}
                {activeTab === 'overdue' && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <CheckCircle className="h-8 w-8 text-emerald-400 mb-2" />
                    <span className="font-bold text-slate-300">All Clear</span>
                    <p className="text-[10px] text-slate-500 mt-1">No overdue actions or expired documents in this workspace.</p>
                  </div>
                )}
              </div>

              {/* Bottom intelligence footer */}
              <div className="border-t border-slate-900 pt-3 flex justify-between items-center text-[10px] text-slate-500">
                <span>Recommendations: 2 Active</span>
                <button type="button" className="text-indigo-400 hover:underline">View All</button>
              </div>
            </section>
          </div>

          {/* Lower Analytics Section */}
          <section className="grid grid-cols-3 gap-6">
            {/* Box 1: Requirement Status */}
            <div className="border border-slate-850 bg-slate-900/40 rounded-xl p-5 shadow-lg backdrop-blur-md">
              <h4 className="font-semibold text-slate-200 text-sm mb-4">Framework Requirement Status</h4>
              <div className="space-y-3.5 text-xs">
                {[
                  { category: 'Safety Management System', count: '12 Compliant', color: 'bg-emerald-500' },
                  { category: 'Asset Calibration Logs', count: '4 Compliant, 1 Pending', color: 'bg-emerald-500' },
                  { category: 'Staff Competency Registry', count: '8 Compliant, 1 Assessment Due', color: 'bg-amber-400' },
                  { category: 'Subcontractor Assurances', count: '5 Compliant', color: 'bg-emerald-500' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-950/20 rounded hover:bg-slate-900 transition-colors cursor-pointer">
                    <span className="text-slate-400 font-medium">{item.category}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`h-2 w-2 rounded-full ${item.color}`} />
                      <span className="text-slate-300 font-bold">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Box 2: Readiness Posture */}
            <div className="border border-slate-850 bg-slate-900/40 rounded-xl p-5 shadow-lg backdrop-blur-md">
              <h4 className="font-semibold text-slate-200 text-sm mb-4">Workspace Readiness Posture</h4>
              <div className="space-y-4">
                {[
                  { name: 'Core Assurance Levels', val: 96 },
                  { name: 'Training Verification', val: 98 },
                  { name: 'Document Archive Completeness', val: 89 }
                ].map((posture, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-400">{posture.name}</span>
                      <span className="text-slate-200 font-bold">{posture.val}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${posture.val}%` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-slate-900 flex justify-between items-center text-[10px] text-slate-500">
                  <span>Target Threshold: 90% Global</span>
                  <span className="text-emerald-400 font-semibold">Exceeded</span>
                </div>
              </div>
            </div>

            {/* Box 3: Top Risk Focus Areas */}
            <div className="border border-slate-850 bg-slate-900/40 rounded-xl p-5 shadow-lg backdrop-blur-md">
              <h4 className="font-semibold text-slate-200 text-sm mb-4">Top Suggested Focus Areas</h4>
              <div className="space-y-3.5 text-xs">
                {[
                  { title: 'Vehicle Calibration Certificates', desc: 'Expiry check scheduled in 7 days', priority: 'Medium' },
                  { title: 'Contractor Safety Declaration', desc: 'Evidence missing requirement tag', priority: 'Low' },
                  { title: 'Assessor Training Re-verification', desc: '1 item in matrix awaiting review', priority: 'Low' }
                ].map((risk, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-950/20 border border-slate-900 rounded hover:border-slate-800 transition-all cursor-pointer">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-slate-300">{risk.title}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${risk.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                        {risk.priority}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">{risk.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Global Bottom Legal Footer */}
        <footer className="h-8 border-t border-slate-900 bg-slate-950 px-6 flex items-center justify-between text-[10px] text-slate-500">
          <span>Disclaimer: Visual telemetry prototype display. All values are static simulation examples.</span>
          <span>© 2026 LUMÉN Assurance Systems.</span>
        </footer>
      </main>
    </div>
  );
}

// ----------------------------------------------------
// CONCEPT 2: Compliance Control Room (Midtone/Operational)
// ----------------------------------------------------
export function ConceptComplianceControlRoom() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans select-none relative">
      {/* Sidebar Component */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col z-20">
        <div className="p-5 border-b border-slate-850 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-7 w-7 rounded bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
              L
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-200">LUMÉN</span>
            <LegalTooltip />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {SIDEBAR_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1.5">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3">{section.title}</h4>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    type="button"
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      item.active
                        ? 'bg-slate-800 text-indigo-400 border-l-2 border-indigo-500 pl-2.5'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/50'
                    }`}
                  >
                    <Icon className={`h-4.5 w-4.5 shrink-0 ${item.active ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-850 text-[10px] text-slate-500 flex justify-between items-center">
          <span>Control Room Concept</span>
          <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-slate-950">
        {/* Top Command Bar */}
        <header className="h-16 border-b border-slate-850 bg-slate-900 px-6 flex items-center justify-between z-10">
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium uppercase tracking-wider">
              OPERATIONAL HUB
            </span>
            <span className="text-slate-700">/</span>
            <h1 className="text-base font-semibold text-slate-200">Compliance Action Command</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search alerts or logs..."
                className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                readOnly
              />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="h-9 px-3.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-lg text-sm font-semibold flex items-center space-x-2 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Command</span>
              </button>
              {showActionsMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-800 bg-slate-900 p-1 shadow-2xl z-30">
                  <button type="button" className="w-full text-left px-3 py-2 rounded hover:bg-slate-800 text-xs font-semibold text-slate-300" onClick={() => setShowActionsMenu(false)}>Upload Document</button>
                  <button type="button" className="w-full text-left px-3 py-2 rounded hover:bg-slate-800 text-xs font-semibold text-slate-300" onClick={() => setShowActionsMenu(false)}>Trigger Audit Run</button>
                </div>
              )}
            </div>

            <button type="button" className="p-2 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-900 text-slate-400 relative">
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="h-9 w-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold"
              >
                CM
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-800 bg-slate-900 p-2 shadow-2xl z-30">
                  <div className="p-2 border-b border-slate-850 mb-1 text-xs">
                    <div className="font-semibold text-slate-300">Compliance Manager</div>
                    <div className="text-slate-500">manager@lumen-demo.com</div>
                  </div>
                  <button type="button" className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800 text-xs text-slate-400 hover:text-slate-200" onClick={() => setShowProfileMenu(false)}>Profile Settings</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Workspace Layout: Operational Hierarchy Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Operational Status Board */}
          <section className="grid grid-cols-3 gap-6">
            <div className="p-4 rounded-xl border border-slate-850 bg-slate-900/50 flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Critical Failures</span>
                <div className="text-3xl font-bold text-slate-100">0</div>
                <p className="text-[10px] text-slate-500">All modules meet core minimum check scores</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-850 bg-slate-900/50 flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Warnings Pending</span>
                <div className="text-3xl font-bold text-amber-400">3</div>
                <p className="text-[10px] text-slate-500">Training reassessments require response</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <AlertTriangle className="h-6 w-6 text-amber-400" />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-850 bg-slate-900/50 flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Approaching Expiries</span>
                <div className="text-3xl font-bold text-indigo-400">2</div>
                <p className="text-[10px] text-slate-500">Document verifications renew in 7 days</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <Clock className="h-6 w-6 text-indigo-400" />
              </div>
            </div>
          </section>

          {/* Action-focused layout */}
          <div className="grid grid-cols-3 gap-6">
            {/* Live Operational Intelligence Feed */}
            <section className="border border-slate-850 bg-slate-900/50 rounded-xl p-5 shadow-lg space-y-4">
              <h3 className="font-semibold text-slate-200 text-sm">Critical Attention Feed</h3>
              <div className="space-y-3">
                {[
                  { type: 'warning', title: 'Vehicle 41B Calibration', time: 'Expired 2 hours ago', text: 'Calibration certificate verification is overdue. Requirement SMS-05 holds a dependency.' },
                  { type: 'info', title: 'John Doe Assessment', time: 'Assessment due tomorrow', text: 'Safety certification audit is scheduled. Vault upload required by Auditor Admin.' },
                  { type: 'check', title: 'System Security Lock', time: 'Verified encrypted', text: 'Subcontractor assurance document classified and linked to Requirement SMS-12.' }
                ].map((feed, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 border border-slate-850 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className={`h-2 w-2 rounded-full ${feed.type === 'warning' ? 'bg-amber-400' : feed.type === 'info' ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
                        <span className="font-semibold text-xs text-slate-350">{feed.title}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-medium">{feed.time}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">{feed.text}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Compact Control Map (Centerpiece) */}
            <section className="border border-slate-850 bg-slate-900/50 rounded-xl p-5 shadow-lg flex flex-col justify-between items-center relative h-[360px]">
              <div className="w-full flex justify-between text-xs font-semibold text-slate-400 border-b border-slate-850 pb-2.5">
                <span>System Node Postures</span>
                <span className="text-amber-400 uppercase tracking-wider text-[10px]">3 Alerts active</span>
              </div>

              <div className="flex-1 flex items-center justify-center">
                <svg className="w-[240px] h-[240px]" viewBox="0 0 200 200">
                  {/* Concentric rings */}
                  <circle cx="100" cy="100" r="50" fill="none" stroke="rgba(245, 158, 11, 0.1)" strokeWidth="1" strokeDasharray="4,4" className="proto-animate-cw" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(99, 102, 241, 0.05)" strokeWidth="1.5" />

                  {/* Satellite links */}
                  <line x1="100" y1="100" x2="100" y2="30" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="1.5" className="proto-animate-flow" />
                  <line x1="100" y1="100" x2="160" y2="100" stroke="rgba(34, 197, 94, 0.4)" strokeWidth="1.5" />
                  <line x1="100" y1="100" x2="40" y2="120" stroke="rgba(34, 197, 94, 0.4)" strokeWidth="1.5" />

                  {/* Nodes */}
                  <circle cx="100" cy="30" r="12" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
                  <text x="100" y="33" textAnchor="middle" fill="#fef3c7" fontSize="8" fontWeight="bold">!</text>

                  <circle cx="160" cy="100" r="12" fill="#0f172a" stroke="#22c55e" strokeWidth="2" />
                  <text x="160" y="103" textAnchor="middle" fill="#a7f3d0" fontSize="8" fontWeight="bold">OK</text>

                  <circle cx="40" cy="120" r="12" fill="#0f172a" stroke="#22c55e" strokeWidth="2" />
                  <text x="40" y="123" textAnchor="middle" fill="#a7f3d0" fontSize="8" fontWeight="bold">OK</text>

                  {/* Center Core */}
                  <g transform="translate(100, 100)" className="proto-animate-pulse-warning">
                    <circle r="24" fill="rgba(245, 158, 11, 0.1)" />
                    <circle r="18" fill="#0f172a" stroke="#f59e0b" strokeWidth="2.5" />
                    <text textAnchor="middle" y="3" fill="#fff" fontSize="9" fontWeight="bold">82%</text>
                  </g>
                </svg>
              </div>

              <span className="text-[9px] text-slate-500">Node telemetry connects every 15s</span>
            </section>

            {/* Operational Metrics Panel */}
            <section className="border border-slate-850 bg-slate-900/50 rounded-xl p-5 shadow-lg flex flex-col justify-between">
              <h3 className="font-semibold text-slate-200 text-sm mb-3">Live Operational Telemetry</h3>
              <div className="space-y-4 flex-1">
                {[
                  { name: 'SMS Compliance Level', value: '98%', status: 'nominal' },
                  { name: 'Vehicle Matrix Readiness', value: '75%', status: 'warning' },
                  { name: 'Personnel Training Audit', value: '94%', status: 'nominal' },
                  { name: 'Active Subcontractors Verified', value: '100%', status: 'nominal' }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-slate-950 rounded border border-slate-900">
                    <span className="text-xs text-slate-400 font-medium">{item.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${item.status === 'warning' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                      <span className="text-xs font-bold text-slate-200">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="w-full py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold rounded-lg text-slate-350 transition-colors mt-4">
                View Full Audit Logs
              </button>
            </section>
          </div>
        </div>

        <footer className="h-8 border-t border-slate-850 bg-slate-900 px-6 flex items-center justify-between text-[10px] text-slate-500">
          <span>Control Room Dashboard Prototype • Static Display Only</span>
          <span>LUMÉN Systems</span>
        </footer>
      </main>
    </div>
  );
}

// ----------------------------------------------------
// CONCEPT 3: Evidence Intelligence Hub (Light/Refined Slate)
// ----------------------------------------------------
export function ConceptEvidenceIntelligenceHub() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans select-none relative">
      {/* Sidebar Component */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col z-20">
        <div className="p-5 border-b border-slate-150 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-7 w-7 rounded bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
              L
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-800">LUMÉN</span>
            <LegalTooltip />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {SIDEBAR_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1.5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3">{section.title}</h4>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    type="button"
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      item.active
                        ? 'bg-indigo-50 text-indigo-600 border-l-2 border-indigo-500 pl-2.5'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`h-4.5 w-4.5 shrink-0 ${item.active ? 'text-indigo-600' : 'text-slate-550'}`} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-150 text-[10px] text-slate-400 flex justify-between items-center">
          <span>Intelligence Hub Concept</span>
          <span className="flex h-2 w-2 rounded-full bg-indigo-500" />
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-slate-50/50">
        {/* Top Command Bar */}
        <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between z-10">
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200/50 font-medium uppercase tracking-wider">
              EVIDENCE HUB
            </span>
            <span className="text-slate-400">/</span>
            <h1 className="text-base font-semibold text-slate-800">Readiness & Document Control</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search vault documents..."
                className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                readOnly
              />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold flex items-center space-x-2 shadow-sm transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Quick Actions</span>
              </button>
              {showActionsMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-2xl z-30">
                  <button type="button" className="w-full text-left px-3 py-2 rounded hover:bg-slate-50 text-xs font-semibold text-slate-700" onClick={() => setShowActionsMenu(false)}>Upload Document</button>
                </div>
              )}
            </div>

            <button type="button" className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 relative">
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-600" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold"
              >
                JD
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-2xl z-30">
                  <div className="p-2 border-b border-slate-100 mb-1 text-xs">
                    <div className="font-semibold text-slate-800">Jane Doe</div>
                    <div className="text-slate-500">auditor@lumen-demo.com</div>
                  </div>
                  <button type="button" className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 text-xs text-slate-600 hover:text-slate-900" onClick={() => setShowProfileMenu(false)}>Profile Settings</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Workspace Layout: Grid of refined, glass-like cards */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top KPI Cards */}
          <section className="grid grid-cols-4 gap-6">
            {[
              { label: 'Evidence Verified', val: '98%', desc: '142 documents' },
              { label: 'Assurance Posture', val: '94.2%', desc: 'All requirements met' },
              { label: 'Verification Actions', val: '0 Pending', desc: 'No overdue validations' },
              { label: 'Audit Packs Built', val: '2 Packs', desc: 'Ready for export' }
            ].map((kpi, idx) => (
              <div key={idx} className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2 hover:shadow-md transition-shadow">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{kpi.label}</span>
                <div className="text-2xl font-bold text-slate-800">{kpi.val}</div>
                <p className="text-[10px] text-slate-450">{kpi.desc}</p>
              </div>
            ))}
          </section>

          {/* Central Section: Evidence Hub & Audit Pack Builder */}
          <div className="grid grid-cols-3 gap-6">
            {/* Elegant Map centerpiece (Spans 2 columns) */}
            <section className="col-span-2 border border-slate-200 bg-white rounded-xl p-6 shadow-sm flex flex-col justify-between h-[360px]">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-semibold text-slate-800">Evidence Integrity Core</h3>
                  <p className="text-xs text-slate-500">Interactive repository nodes linking files to audit framework requirements</p>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                  Secure Vault
                </span>
              </div>

              {/* Clean/Premium Slate Core SVG */}
              <div className="flex-1 flex items-center justify-center">
                <svg className="w-[380px] h-[200px]" viewBox="0 0 380 200">
                  {/* Concentric clean circular paths */}
                  <circle cx="190" cy="100" r="45" fill="none" stroke="rgba(99,102,241,0.06)" strokeWidth="1" />
                  <circle cx="190" cy="100" r="75" fill="none" stroke="rgba(99,102,241,0.03)" strokeWidth="1.5" />

                  {/* Satellite connections */}
                  <line x1="190" y1="100" x2="90" y2="50" stroke="rgba(99,102,241,0.2)" strokeWidth="1" />
                  <line x1="190" y1="100" x2="290" y2="50" stroke="rgba(99,102,241,0.2)" strokeWidth="1" />
                  <line x1="190" y1="100" x2="90" y2="150" stroke="rgba(99,102,241,0.2)" strokeWidth="1" />
                  <line x1="190" y1="100" x2="290" y2="150" stroke="rgba(99,102,241,0.2)" strokeWidth="1" />

                  {/* Nodes */}
                  <circle cx="90" cy="50" r="14" fill="#fff" stroke="#cbd5e1" strokeWidth="2" />
                  <text x="90" y="53" textAnchor="middle" fill="#475569" fontSize="8" fontWeight="bold">98%</text>
                  <text x="90" y="75" textAnchor="middle" fill="#64748b" fontSize="8">Personnel</text>

                  <circle cx="290" cy="50" r="14" fill="#fff" stroke="#cbd5e1" strokeWidth="2" />
                  <text x="290" y="53" textAnchor="middle" fill="#475569" fontSize="8" fontWeight="bold">82%</text>
                  <text x="290" y="75" textAnchor="middle" fill="#64748b" fontSize="8">Assets</text>

                  <circle cx="90" cy="150" r="14" fill="#fff" stroke="#cbd5e1" strokeWidth="2" />
                  <text x="90" y="153" textAnchor="middle" fill="#475569" fontSize="8" fontWeight="bold">100%</text>
                  <text x="90" y="175" textAnchor="middle" fill="#64748b" fontSize="8">Vault</text>

                  <circle cx="290" cy="150" r="14" fill="#fff" stroke="#cbd5e1" strokeWidth="2" />
                  <text x="290" y="153" textAnchor="middle" fill="#475569" fontSize="8" fontWeight="bold">95%</text>
                  <text x="290" y="175" textAnchor="middle" fill="#64748b" fontSize="8">Packs</text>

                  {/* Center Hub Node */}
                  <circle cx="190" cy="100" r="28" fill="#eff6ff" stroke="#3b82f6" strokeWidth="3" />
                  <text x="190" y="103" textAnchor="middle" fill="#1e3a8a" fontSize="10" fontWeight="bold">94%</text>
                </svg>
              </div>

              <span className="text-[9px] text-slate-400 text-center">Ready for internal auditor verification and export</span>
            </section>

            {/* Audit Pack Generator Rail */}
            <section className="border border-slate-200 bg-white rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div className="space-y-1">
                <h4 className="font-semibold text-slate-800 text-sm">Active Audit Pack Template</h4>
                <p className="text-[10px] text-slate-500">Produce evidence dossiers for upcoming inspections</p>
              </div>

              <div className="space-y-3 flex-1 mt-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-700">Framework Overview Dossier</span>
                    <p className="text-[10px] text-slate-450">SMS requirements • 24 linked files</p>
                  </div>
                  <FileText className="h-5 w-5 text-indigo-500" />
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-700">Contractor Verification Dossier</span>
                    <p className="text-[10px] text-slate-450">Matrix criteria • 8 linked files</p>
                  </div>
                  <FileText className="h-5 w-5 text-indigo-500" />
                </div>
              </div>

              <button type="button" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors mt-4">
                Export Evidence Dossier
              </button>
            </section>
          </div>
        </div>

        <footer className="h-8 border-t border-slate-200 bg-white px-6 flex items-center justify-between text-[10px] text-slate-400">
          <span>Evidence Intelligence Hub Prototype • Static Display</span>
          <span>© 2026 LUMÉN</span>
        </footer>
      </main>
    </div>
  );
}
