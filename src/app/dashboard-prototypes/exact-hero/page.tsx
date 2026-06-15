'use client';

import React, { useState } from 'react';
import ExactHeroComponent from './ExactHeroComponent';
import { Sun, Moon, ArrowLeft, Move, RotateCcw } from 'lucide-react';
import Link from 'next/link';

interface NodeItem {
  id: string;
  x: number;
  y: number;
  label: string;
  side: 'left' | 'right';
  icon: string;
}

const DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  checklist: { x: 220, y: 100 },
  users: { x: 110, y: 300 },
  grid: { x: 220, y: 500 },
  folder: { x: 780, y: 100 },
  document: { x: 890, y: 300 },
  chart: { x: 780, y: 500 }
};

export default function ExactHeroPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [dragEnabled, setDragEnabled] = useState(false);
  const [nodePositions, setNodePositions] = useState<NodeItem[]>([
    { id: 'checklist', x: 220, y: 100, label: 'SMS Checklist', side: 'left', icon: 'checklist' },
    { id: 'users', x: 110, y: 300, label: 'User Registry', side: 'left', icon: 'users' },
    { id: 'grid', x: 220, y: 500, label: 'Matrix Grid', side: 'left', icon: 'grid' },
    { id: 'folder', x: 780, y: 100, label: 'Vault Folder', side: 'right', icon: 'folder' },
    { id: 'document', x: 890, y: 300, label: 'Document Files', side: 'right', icon: 'document' },
    { id: 'chart', x: 780, y: 500, label: 'Telemetry Report', side: 'right', icon: 'chart' },
  ]);

  const isModified = nodePositions.some(
    node => node.x !== DEFAULT_POSITIONS[node.id].x || node.y !== DEFAULT_POSITIONS[node.id].y
  );

  const resetPositions = () => {
    setNodePositions([
      { id: 'checklist', x: 220, y: 100, label: 'SMS Checklist', side: 'left', icon: 'checklist' },
      { id: 'users', x: 110, y: 300, label: 'User Registry', side: 'left', icon: 'users' },
      { id: 'grid', x: 220, y: 500, label: 'Matrix Grid', side: 'left', icon: 'grid' },
      { id: 'folder', x: 780, y: 100, label: 'Vault Folder', side: 'right', icon: 'folder' },
      { id: 'document', x: 890, y: 300, label: 'Document Files', side: 'right', icon: 'document' },
      { id: 'chart', x: 780, y: 500, label: 'Telemetry Report', side: 'right', icon: 'chart' },
    ]);
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${theme === 'dark' ? 'bg-[#020617] text-slate-100' : 'bg-[#f8fafc] text-slate-900'}`}>
      
      {/* Scoped CSS animations for rotation and pulse */}
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
          50% { transform: scale(1.1); opacity: 1; filter: drop-shadow(0 0 10px rgba(0, 240, 255, 0.9)); }
        }
        .proto-animate-cw {
          animation: hero-rotate-cw 45s linear infinite;
          transform-origin: 500px 300px;
        }
        .proto-animate-ccw {
          animation: hero-rotate-ccw 55s linear infinite;
          transform-origin: 500px 300px;
        }
        .proto-animate-pulse {
          animation: hero-pulse-glow 4s ease-in-out infinite;
          transform-origin: 500px 300px;
        }
        @media (prefers-reduced-motion: reduce) {
          .proto-animate-cw, .proto-animate-ccw, .proto-animate-pulse {
            animation: none !important;
            transform: none !important;
          }
        }
      ` }} />

      {/* Header Panel */}
      <header className={`px-6 py-4 border-b flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 ${theme === 'dark' ? 'bg-[#0b0f19] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center space-x-4">
          <Link 
            href="/dashboard"
            className={`p-2 rounded-lg border transition-colors flex items-center justify-center ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-black'}`}
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold tracking-wide flex items-center gap-2">
              Locked Hero Graphic Replication (Interactive)
            </h1>
            <p className="text-xs text-slate-400">
              Interactive prototype route. Toggle &ldquo;Drag-and-Drop Mode&rdquo; to reposition nodes in SVG space and view real-time HUD path adjustments.
            </p>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          {/* Drag Toggle */}
          <button
            onClick={() => setDragEnabled(!dragEnabled)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              dragEnabled 
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                : theme === 'dark'
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-black'
            }`}
            type="button"
          >
            <Move className="h-3.5 w-3.5" />
            <span>Drag Mode: {dragEnabled ? 'Active' : 'Off'}</span>
          </button>

          {/* Reset button */}
          {isModified && (
            <button
              onClick={resetPositions}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                theme === 'dark'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                  : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
              }`}
              type="button"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Positions</span>
            </button>
          )}

          {/* Theme Switcher */}
          <div className={`flex rounded-xl p-1 border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                theme === 'dark' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              type="button"
            >
              <Moon className="h-3.5 w-3.5" />
              <span>Image A (Dark)</span>
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                theme === 'light' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              type="button"
            >
              <Sun className="h-3.5 w-3.5" />
              <span>Image B (Light)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="flex-1 flex flex-col md:flex-row items-stretch justify-center p-6 gap-6 overflow-hidden">
        {/* Interactive SVG Hero Viewport */}
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <div className="w-full max-w-5xl">
            <ExactHeroComponent 
              theme={theme} 
              dragEnabled={dragEnabled}
              nodePositions={nodePositions}
              setNodePositions={setNodePositions}
            />
          </div>
        </div>

        {/* Dynamic Coordinates Sidebar */}
        <div className={`w-full md:w-80 border rounded-2xl p-5 flex flex-col justify-between ${
          theme === 'dark' ? 'bg-[#0f172a]/60 border-slate-800' : 'bg-white border-slate-200 shadow-md'
        }`}>
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Node Config Matrix</h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Drag the satellite nodes on the canvas. The layout positions config updates dynamically below in real time.
              </p>
            </div>
            
            <div className={`rounded-xl p-3 font-mono text-[10px] overflow-auto h-[320px] max-h-[350px] ${
              theme === 'dark' ? 'bg-slate-950/70 border border-slate-900 text-emerald-400' : 'bg-slate-50 border border-slate-200 text-emerald-700'
            }`}>
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Live JSON Output</span>
              <pre className="whitespace-pre">
                {JSON.stringify(
                  nodePositions.reduce((acc, node) => {
                    acc[node.id] = { x: node.x, y: node.y };
                    return acc;
                  }, {} as Record<string, { x: number; y: number }>),
                  null,
                  2
                )}
              </pre>
            </div>
          </div>

          <div className="border-t pt-4 border-slate-800/60 mt-4 text-[9px] text-slate-400 leading-relaxed space-y-1 font-sans">
            <div>● Circle core: (500, 300)</div>
            <div>● Core path boundary radius: 124</div>
            <div>● Drag constraints: clamped to viewBox limits</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`h-10 border-t px-6 flex items-center justify-between text-[10px] text-slate-500 ${theme === 'dark' ? 'bg-[#020617] border-slate-900' : 'bg-white border-slate-200'}`}>
        <span>Interactive prototype view • Move nodes around with mouse drag.</span>
        <span>Coordinates can be exported directly to `PRESETS` configurations in core views.</span>
      </footer>
    </div>
  );
}
