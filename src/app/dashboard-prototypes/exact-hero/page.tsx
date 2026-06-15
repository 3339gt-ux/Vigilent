'use client';

import React, { useState } from 'react';
import ExactHeroComponent from './ExactHeroComponent';
import { Sun, Moon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ExactHeroPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

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
            href="/dashboard-prototypes"
            className={`p-2 rounded-lg border transition-colors flex items-center justify-center ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-black'}`}
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold tracking-wide">Locked Hero Graphic Replication</h1>
            <p className="text-xs text-slate-400">
              Isolated prototype route reproducing the master reference illustrations exactly in React SVG.
            </p>
          </div>
        </div>

        {/* Theme and Navigation Controls */}
        <div className="flex items-center space-x-3">
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
      <main className="flex-1 flex items-center justify-center p-6 relative">
        <div className="w-full max-w-5xl">
          <ExactHeroComponent theme={theme} />
        </div>
      </main>

      {/* Footer / Telemetry Data Honesty Banner */}
      <footer className={`h-10 border-t px-6 flex items-center justify-between text-[10px] text-slate-500 ${theme === 'dark' ? 'bg-[#020617] border-slate-900' : 'bg-white border-slate-200'}`}>
        <span>Locked design replication • Image A (Dark) & Image B (Light) Master Reference.</span>
        <span>No compliance data, charts, or fake cards included in this layout view.</span>
      </footer>
    </div>
  );
}
