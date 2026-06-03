'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { 
  FileCheck, 
  Table, 
  Layers, 
  AlertTriangle, 
  Clock, 
  ChevronRight, 
  Sun, 
  Moon, 
  Info,
  DollarSign,
  Building,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function LandingPage() {
  const { theme, toggleTheme } = useApp();
  const [calculatorState, setCalculatorState] = useState({
    licence: true,
    mot: false,
    cpc: false,
    insurance: true,
    fire: false
  });

  const toggleCalculator = (key: keyof typeof calculatorState) => {
    setCalculatorState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Calculate simulated score
  const total = Object.keys(calculatorState).length;
  const completed = Object.values(calculatorState).filter(Boolean).length;
  const simulatedScore = Math.round((completed / total) * 100);

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-border/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img 
                src={theme === 'dark' ? '/brand/vygilence-mark.png' : '/brand/vygilence-mark-light.png'} 
                alt="Vygilence Logo" 
                className="w-10 h-10 object-contain" 
              />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-foreground">Vygilence</span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">Ready</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors" id="nav-features-link">Features</a>
            <a href="#calculator" className="hover:text-foreground transition-colors" id="nav-demo-link">Readiness Calculator</a>
            <a href="#boundaries" className="hover:text-foreground transition-colors text-amber-600 dark:text-amber-400" id="nav-disclaimer-link">Operational Boundaries</a>
            <a href="#pricing" className="hover:text-foreground transition-colors" id="nav-pricing-link">Pricing</a>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200"
              aria-label="Toggle theme"
              id="theme-toggle-btn"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
            </button>

            <Link 
              href="/login" 
              className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 rounded-lg transition-colors duration-200"
              id="header-login-btn"
            >
              Sign In
            </Link>

            <Link 
              href="/register" 
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-600/10 transition-all duration-200"
              id="header-register-btn"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Main Section */}
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative pt-24 pb-20 overflow-hidden bg-radial from-indigo-500/5 via-transparent to-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-semibold uppercase tracking-wider mb-8">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
              Audit Preparedness Reinvented
            </div>
            
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6" id="main-headline">
              See it. Manage it.<br />
              <span className="gradient-text">Prove it.</span>
            </h1>
            
            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground mb-10 leading-relaxed">
              Vygilence is the Audit Readiness and Evidence Intelligence Platform for transport, warehousing, logistics and compliance-driven businesses. 
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link 
                href="/register" 
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-200"
                id="hero-register-cta"
              >
                Start Free Trial
              </Link>
              <a 
                href="#calculator" 
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-foreground bg-muted hover:bg-muted/80 rounded-xl border border-border/80 transition-all duration-200"
                id="hero-demo-cta"
              >
                Test Score Calculator
              </a>
            </div>

            {/* Dashboard Mock Preview */}
            <div className="relative max-w-5xl mx-auto rounded-2xl border border-border/50 shadow-2xl overflow-hidden glass-panel">
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10"></div>
              <div className="h-10 bg-muted/50 border-b border-border/50 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <div className="text-xs text-muted-foreground ml-4 select-none font-mono">https://app.vygilence.com/dashboard</div>
              </div>
              <div className="p-6 md:p-8 bg-card/40 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                {/* Simulated Readiness Score Widget */}
                <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between h-48">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Simulated Readiness Score</h3>
                    <p className="text-xs text-muted-foreground mt-1">Reflects evidence requirements met across assets.</p>
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="32" stroke="currentColor" className="text-muted/20" strokeWidth="6" fill="transparent" />
                        <circle cx="40" cy="40" r="32" stroke="currentColor" className="text-emerald-500" strokeWidth="6" fill="transparent" 
                          strokeDasharray={2 * Math.PI * 32} 
                          strokeDashoffset={2 * Math.PI * 32 * (1 - 0.84)} 
                        />
                      </svg>
                      <span className="absolute text-xl font-bold">84%</span>
                    </div>
                    <div>
                      <span className="text-emerald-500 font-semibold flex items-center gap-1 text-sm">
                        <CheckCircle2 className="w-4 h-4" /> Highly Prepared
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">2 compliance actions pending</p>
                    </div>
                  </div>
                </div>

                {/* Expiry Alerts Panel */}
                <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between h-48">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Urgent Expirations</h3>
                    <p className="text-xs text-muted-foreground mt-1">Actions needed to avoid compliance lapses.</p>
                  </div>
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center justify-between text-xs p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-500/20">
                      <span className="font-medium flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" /> Driver CPC - M. Vance
                      </span>
                      <span className="font-semibold">20d left</span>
                    </div>
                    <div className="flex items-center justify-between text-xs p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-500/20">
                      <span className="font-medium flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5" /> LOLER Cert - FLT #03
                      </span>
                      <span className="font-semibold">Expired</span>
                    </div>
                  </div>
                </div>

                {/* Audit Pack Generator */}
                <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between h-48">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Shareable Audit Packs</h3>
                    <p className="text-xs text-muted-foreground mt-1">Compiled packages for DVSA or safety audits.</p>
                  </div>
                  <div className="mt-4">
                    <div className="border border-border/80 rounded-lg p-3 bg-muted/40">
                      <div className="flex justify-between items-center text-xs font-semibold mb-1">
                        <span>Q2 Safety Audit Pack</span>
                        <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">Active</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Expires: 30 Jun 2026 • Secure PIN enabled</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-muted/20 border-y border-border/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Core Compliance Infrastructure
              </h2>
              <p className="text-muted-foreground">
                Ditch messy folders and spreadsheets. Keep your logistics, warehousing, and transport evidence easier to review.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Feature 1 */}
              <div className="bg-card border border-border p-6 rounded-xl hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center rounded-xl mb-4">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">Evidence Vault</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Evidence storage with expiration alert configurations, category metadata tags, and document activity trails.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-card border border-border p-6 rounded-xl hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center rounded-xl mb-4">
                  <Table className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">Compliance Matrix</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Real-time mapping grid showing requirements against drivers, vehicles, and depots to quickly find outstanding gaps.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-card border border-border p-6 rounded-xl hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center rounded-xl mb-4">
                  <FileCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">Audit Pack Builder</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Group relevant evidence records, generate PIN-secured access urls for auditors, or export a structured file directory.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-card border border-border p-6 rounded-xl hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center rounded-xl mb-4">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">Expiry Engine</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Intelligent tracking checks for expirations 30/60/90 days in advance, notifying staff before items breach standard validity.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Readiness Score Calculator */}
        <section id="calculator" className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-card border border-border rounded-2xl p-8 md:p-10 glow-indigo">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight mb-4">
                    Audit Readiness Interactive Calculator
                  </h2>
                  <p className="text-muted-foreground text-sm mb-6">
                    Toggle mock certificates below to see how your readiness score recalculates. Vygilence continuously updates this across your entire fleet, personnel list, and warehouses.
                  </p>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={() => toggleCalculator('licence')}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-xs font-semibold transition-all ${calculatorState.licence ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-600 dark:text-emerald-400' : 'bg-muted border-border text-muted-foreground'}`}
                      id="calc-licence-toggle"
                    >
                      <span>1. Core Operator Licence Document</span>
                      <span>{calculatorState.licence ? 'Uploaded (Active)' : 'Missing'}</span>
                    </button>
                    
                    <button 
                      onClick={() => toggleCalculator('mot')}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-xs font-semibold transition-all ${calculatorState.mot ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-600 dark:text-emerald-400' : 'bg-muted border-border text-muted-foreground'}`}
                      id="calc-mot-toggle"
                    >
                      <span>2. HGV Fleet MOT & Inspections</span>
                      <span>{calculatorState.mot ? 'Uploaded (Active)' : 'Missing'}</span>
                    </button>

                    <button 
                      onClick={() => toggleCalculator('cpc')}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-xs font-semibold transition-all ${calculatorState.cpc ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-600 dark:text-emerald-400' : 'bg-muted border-border text-muted-foreground'}`}
                      id="calc-cpc-toggle"
                    >
                      <span>3. Driver CPC Qualification Cards</span>
                      <span>{calculatorState.cpc ? 'Uploaded (Active)' : 'Missing'}</span>
                    </button>

                    <button 
                      onClick={() => toggleCalculator('insurance')}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-xs font-semibold transition-all ${calculatorState.insurance ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-600 dark:text-emerald-400' : 'bg-muted border-border text-muted-foreground'}`}
                      id="calc-insurance-toggle"
                    >
                      <span>4. Transit Liability Insurance</span>
                      <span>{calculatorState.insurance ? 'Uploaded (Active)' : 'Missing'}</span>
                    </button>

                    <button 
                      onClick={() => toggleCalculator('fire')}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-xs font-semibold transition-all ${calculatorState.fire ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-600 dark:text-emerald-400' : 'bg-muted border-border text-muted-foreground'}`}
                      id="calc-fire-toggle"
                    >
                      <span>5. Warehouse Fire Risk Audit</span>
                      <span>{calculatorState.fire ? 'Uploaded (Active)' : 'Missing'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-6 bg-muted/30 border border-border/85 rounded-xl text-center">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Calculated Score</span>
                  <div className="relative w-36 h-36 flex items-center justify-center mb-4">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="72" cy="72" r="56" stroke="currentColor" className="text-muted/20" strokeWidth="8" fill="transparent" />
                      <circle cx="72" cy="72" r="56" stroke="currentColor" 
                        className={simulatedScore > 79 ? 'text-emerald-500' : simulatedScore > 40 ? 'text-amber-500' : 'text-rose-500'} 
                        strokeWidth="8" fill="transparent" 
                        strokeDasharray={2 * Math.PI * 56} 
                        strokeDashoffset={2 * Math.PI * 56 * (1 - simulatedScore / 100)} 
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                      />
                    </svg>
                    <span className="absolute text-3xl font-extrabold">{simulatedScore}%</span>
                  </div>
                  
                  <div className="text-sm font-semibold">
                    {simulatedScore === 100 && <span className="text-emerald-500">100% Prepared</span>}
                    {simulatedScore < 100 && simulatedScore >= 60 && <span className="text-amber-500">Requirements Pending</span>}
                    {simulatedScore < 60 && <span className="text-rose-500">Critical Gaps Identified</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 max-w-[200px]">
                    Interactive simulation. In-app matrix automates checks for thousands of individual assets.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Regulatory Boundaries / Disclaimers (CRITICAL REQUIREMENT) */}
        <section id="boundaries" className="py-16 bg-amber-500/5 dark:bg-amber-950/10 border-y border-amber-500/20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 mt-1">
                <Info className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-2 text-amber-800 dark:text-amber-400">
                  Operational Guidelines & Boundaries
                </h2>
                <p className="text-sm text-muted-foreground">
                  Vygilence functions strictly as a document tracking database and repository system to support internal readiness audits. Please review our compliance and legal operational boundaries.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card border border-amber-500/20 p-5 rounded-xl">
                <div className="flex items-center gap-2 text-rose-500 font-semibold text-xs uppercase tracking-wider mb-2">
                  <AlertCircle className="w-4 h-4" /> NO Legal Advice
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Vygilence is not a law firm. The system does not write, interpret, customize, or generate legal documents or statutory compliance advice. All requirements should be verified with licensed counsel.
                </p>
              </div>

              <div className="bg-card border border-amber-500/20 p-5 rounded-xl">
                <div className="flex items-center gap-2 text-rose-500 font-semibold text-xs uppercase tracking-wider mb-2">
                  <AlertCircle className="w-4 h-4" /> NO Safety Statements
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Vygilence does not write, generate, or compile safety policy templates, method statements, risk assessments, or health & safety guidelines. All policies must be validated by qualified safety experts.
                </p>
              </div>

              <div className="bg-card border border-amber-500/20 p-5 rounded-xl">
                <div className="flex items-center gap-2 text-rose-500 font-semibold text-xs uppercase tracking-wider mb-2">
                  <AlertCircle className="w-4 h-4" /> NO Claims of Compliance
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  An active readiness indicator inside Vygilence does not constitute a legal or official certification of regulatory compliance. Vygilence cannot certify fitness for licensing audits, DVSA inspections, or court audits.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-extrabold tracking-tight mb-4">
                Transparent Plans For Active Readiness
              </h2>
              <p className="text-muted-foreground">
                Select the right scale for your transport fleet, warehouse networks, or logistics business.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Standard */}
              <div className="bg-card border border-border p-8 rounded-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold">Standard</h3>
                  <p className="text-xs text-muted-foreground mt-1">For local hauliers & single-site warehouses</p>
                  <div className="flex items-baseline mt-4 mb-6">
                    <span className="text-4xl font-extrabold">£99</span>
                    <span className="text-muted-foreground text-xs ml-1">/ month</span>
                  </div>
                  <ul className="space-y-3 text-xs mb-8">
                    <li className="flex items-center gap-2">✓ Up to 15 vehicles/assets</li>
                    <li className="flex items-center gap-2">✓ 1 Organization Admin</li>
                    <li className="flex items-center gap-2">✓ Evidence Vault (10GB)</li>
                    <li className="flex items-center gap-2">✓ Standard Compliance Matrix</li>
                  </ul>
                </div>
                <Link href="/register" className="w-full py-2.5 bg-muted hover:bg-muted/80 text-center text-xs font-semibold rounded-lg border border-border">
                  Choose Standard
                </Link>
              </div>

              {/* Professional */}
              <div className="bg-card border-2 border-indigo-600 p-8 rounded-xl flex flex-col justify-between relative glow-indigo">
                <div className="absolute top-0 right-6 transform -translate-y-1/2 bg-indigo-600 text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full">
                  Most Popular
                </div>
                <div>
                  <h3 className="text-lg font-bold">Professional</h3>
                  <p className="text-xs text-muted-foreground mt-1">For expanding logistics fleets & multi-depot groups</p>
                  <div className="flex items-baseline mt-4 mb-6">
                    <span className="text-4xl font-extrabold">£249</span>
                    <span className="text-muted-foreground text-xs ml-1">/ month</span>
                  </div>
                  <ul className="space-y-3 text-xs mb-8">
                    <li className="flex items-center gap-2">✓ Up to 75 vehicles/assets</li>
                    <li className="flex items-center gap-2">✓ 5 Organization Members</li>
                    <li className="flex items-center gap-2">✓ Evidence Vault (50GB)</li>
                    <li className="flex items-center gap-2">✓ Matrix & Audit Pack Builder</li>
                    <li className="flex items-center gap-2">✓ PIN-secured share portals</li>
                  </ul>
                </div>
                <Link href="/register" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-center text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/10">
                  Choose Professional
                </Link>
              </div>

              {/* Enterprise */}
              <div className="bg-card border border-border p-8 rounded-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold">Enterprise</h3>
                  <p className="text-xs text-muted-foreground mt-1">For national freight fleets & compliance networks</p>
                  <div className="flex items-baseline mt-4 mb-6">
                    <span className="text-4xl font-extrabold">£599</span>
                    <span className="text-muted-foreground text-xs ml-1">/ month</span>
                  </div>
                  <ul className="space-y-3 text-xs mb-8">
                    <li className="flex items-center gap-2">✓ Unlimited vehicles & depots</li>
                    <li className="flex items-center gap-2">✓ Unlimited Team Members & Auditors</li>
                    <li className="flex items-center gap-2">✓ Custom Compliance Profile Templates</li>
                    <li className="flex items-center gap-2">✓ API Integrations & Webhooks</li>
                    <li className="flex items-center gap-2">✓ Dedicated SLA Support</li>
                  </ul>
                </div>
                <Link href="/register" className="w-full py-2.5 bg-muted hover:bg-muted/80 text-center text-xs font-semibold rounded-lg border border-border">
                  Choose Enterprise
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border/80 py-12 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-foreground font-bold">
                <img src="/brand/vygilence-mark.png" alt="Vygilence Logo" className="w-5 h-5 object-contain" />
                <span>Vygilence</span>
              </div>
              <p className="max-w-[200px] leading-relaxed">
                Continuous compliance oversight for logistics, fleet transport and warehouses.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-foreground mb-3">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-foreground">Vault</a></li>
                <li><a href="#features" className="hover:text-foreground">Matrix</a></li>
                <li><a href="#features" className="hover:text-foreground">Audit Packs</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-3">Operational Boundaries</h4>
              <ul className="space-y-2">
                <li><a href="#boundaries" className="hover:text-foreground">No Legal Counsel</a></li>
                <li><a href="#boundaries" className="hover:text-foreground">No Safety Statements</a></li>
                <li><a href="#boundaries" className="hover:text-foreground">Mock Verification</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-3">Company</h4>
              <ul className="space-y-2">
                <li><a href="/login" className="hover:text-foreground">Workspace Sign In</a></li>
                <li><a href="/register" className="hover:text-foreground">Create Account</a></li>
                <li><span className="text-emerald-500 font-semibold">Ready System Online</span></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
            <p>&copy; {new Date().getFullYear()} Vygilence Inc. All rights reserved.</p>
            <p className="max-w-md text-[10px] leading-normal">
              Disclaimer: Vygilence is a storage utility. It does not provide legal advice, safety reviews, or safety statement templates. Use of the software does not warrant compliance with DVSA, HSE, or other regulatory audits.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
