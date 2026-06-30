'use client';

import React, { useState } from 'react';
import {
  ConceptExecutiveCommandCentre,
  ConceptComplianceControlRoom,
  ConceptEvidenceIntelligenceHub,
  PrototypeStyles
} from './DashboardPrototypeComponents';

type ConceptId = 'executive' | 'operational' | 'hub';

export default function DashboardPrototypesPage() {
  const [activeConcept, setActiveConcept] = useState<ConceptId>('executive');

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      {/* Global CSS animations for the prototypes */}
      <PrototypeStyles />

      {/* Switcher Navigation Bar at the top of the route */}
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 z-30">
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide">AssureCore Dashboard Visual Prototypes</h1>
          <p className="text-xs text-slate-400">
            Static visual concepts only • Not connected to production datastores, Supabase, or live state.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex space-x-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
          {[
            { id: 'executive' as const, label: 'Executive Command Centre' },
            { id: 'operational' as const, label: 'Compliance Control Room' },
            { id: 'hub' as const, label: 'Evidence Intelligence Hub' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveConcept(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeConcept === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Render Selected Prototype Container */}
      <div className="flex-1 relative overflow-hidden">
        {activeConcept === 'executive' && <ConceptExecutiveCommandCentre />}
        {activeConcept === 'operational' && <ConceptComplianceControlRoom />}
        {activeConcept === 'hub' && <ConceptEvidenceIntelligenceHub />}
      </div>
    </div>
  );
}
