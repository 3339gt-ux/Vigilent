'use client';

import React, { useState } from 'react';
import { useApp, VygilenceTheme, InterfaceStyle, ThemePreference } from '@/context/AppContext';
import { isDemoMode, evidenceStorageBucket } from '@/lib/env';
import { Save, ShieldAlert, Key, Bell, User, CheckCircle2, Copy, Check, Palette, Sun, Moon, CircleDot, ArrowRight, Eye, Sparkles, ShieldCheck, Activity } from 'lucide-react';
import { ConfirmDialog, ConfirmRequest, InlineToast, ToastState } from '@/components/AppFeedback';

export default function SettingsPage() {
  const {
    user,
    themePreference,
    vygilenceTheme,
    interfaceStyle,
    interfaceDetailLevel,
    setThemePreference,
    setVygilenceTheme,
    setInterfaceStyle,
    setInterfaceDetailLevel,
    refreshSession,
    resetDemoData,
    loadHighVolumeDemoDataset,
    requirements,
    documents,
    assets,
    people,
    competencyRecords
  } = useApp();

  const isOwnerOrAdmin = user?.role === 'Owner' || user?.role === 'Admin';

  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest>(null);
  const [toast, setToast] = useState<ToastState>(null);

  // Profile Form States
  const [name, setName] = useState(user?.full_name || 'Jane Doe');
  const [phone, setPhone] = useState('+44 7700 900077');
  const [email, setEmail] = useState('jane.doe@apexlogistics.com');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Demo Seeding States
  const [highVolumeLoading, setHighVolumeLoading] = useState(false);
  const [highVolumeSuccess, setHighVolumeSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  // Notification States
  const [alertDays30, setAlertDays30] = useState(true);
  const [alertDays60, setAlertDays60] = useState(true);
  const [alertDays90, setAlertDays90] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);

  // API Key States
  const [apiKey, setApiKey] = useState('vig_demo_c10a4e3ff98d5c64c781e002da76e');
  const [isCopied, setIsCopied] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleGenerateKey = () => {
    if (!isDemoMode) {
      setToast({ type: 'error', message: 'API token generation requires a production secrets service before it can be enabled.' });
      return;
    }
    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setApiKey(`vig_demo_${randomHex}`);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleLoadHighVolumeDemo = () => {
    setConfirmRequest({
      title: 'Load High-Volume Demo Dataset',
      description: 'Are you sure you want to load the high-volume demo dataset? This will replace your current demo workspace data with 200 assets, 200 people, 100 requirements, 300 competency types, and 500 evidence records to stress-test the UI, filters, pagination, and performance.',
      confirmLabel: 'Load Dataset',
      tone: 'warning',
      onConfirm: async () => {
        setHighVolumeLoading(true);
        setHighVolumeSuccess(false);
        setResetSuccess(false);
        setClearSuccess(false);
        try {
          await loadHighVolumeDemoDataset();
          setHighVolumeSuccess(true);
          setToast({ type: 'success', message: 'High-volume demo dataset loaded successfully.' });
        } catch (err) {
          console.error(err);
          setToast({ type: 'error', message: 'Error loading dataset: ' + (err instanceof Error ? err.message : String(err)) });
        } finally {
          setHighVolumeLoading(false);
        }
      }
    });
  };

  const handleLocalReset = () => {
    setConfirmRequest({
      title: 'Reset to Standard Demo Dataset',
      description: 'Are you sure you want to reset the database? This will clear current high-volume data and restore the standard sample dataset.',
      confirmLabel: 'Reset Data',
      tone: 'danger',
      onConfirm: async () => {
        setResetLoading(true);
        setResetSuccess(false);
        setHighVolumeSuccess(false);
        setClearSuccess(false);
        try {
          await resetDemoData();
          localStorage.removeItem('vigilen_session_user');
          localStorage.removeItem('vigilen_session_org');
          await refreshSession();
          setResetSuccess(true);
        } catch (err) {
          console.error(err);
          setToast({ type: 'error', message: 'Error resetting local data: ' + (err instanceof Error ? err.message : String(err)) });
        } finally {
          setResetLoading(false);
        }
      }
    });
  };

  const handleClearDemoData = () => {
    setConfirmRequest({
      title: 'Clear Demo Data',
      description: 'Are you sure you want to clear all demo data? This will wipe the local workspace database clean, removing all assets, people, requirements, evidence, and actions.',
      confirmLabel: 'Clear All Data',
      tone: 'danger',
      onConfirm: async () => {
        setClearLoading(true);
        setClearSuccess(false);
        setResetSuccess(false);
        setHighVolumeSuccess(false);
        try {
          [
            'vigilen_requirements', 'vigilen_documents', 'vigilen_cells', 'vigilen_audit_packs',
            'vigilen_logs', 'vigilen_framework_requirements', 'vigilen_requirement_evidence_types',
            'vigilen_requirement_documents', 'vigilen_requirement_evidence_criteria',
            'vigilen_requirement_evidence_criterion_matches', 'vigilen_reviews', 'vigilen_actions',
            'vigilen_requirement_actions', 'vigilen_action_updates', 'vigilen_action_documents',
            'vigilen_action_object_links', 'vigilen_people', 'vigilen_competency_types',
            'vigilen_competency_records', 'vigilen_competency_record_documents',
            'vigilen_requirement_competency_types', 'vigilen_requirement_categories',
            'vigilen_evidence_categories', 'vigilen_audit_trail_events',
            'vygilence_workspace_notifications', 'vigilen_asset_categories', 'vigilen_assets',
            'vigilen_asset_check_types', 'vigilen_asset_check_assignments', 'vigilen_asset_check_records',
            'vigilen_asset_check_evidence_links', 'vigilen_asset_requirement_links', 'vigilen_asset_history_events'
          ].forEach(key => localStorage.setItem(key, JSON.stringify([])));

          localStorage.setItem('vigilen_initialized', 'true');
          localStorage.removeItem('vigilen_session_user');
          localStorage.removeItem('vigilen_session_org');
          await refreshSession();
          setClearSuccess(true);
          setToast({ type: 'success', message: 'Demo data cleared successfully.' });
        } catch (err) {
          console.error(err);
          setToast({ type: 'error', message: 'Error clearing demo data: ' + (err instanceof Error ? err.message : String(err)) });
        } finally {
          setClearLoading(false);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Head */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight" id="settings-heading">Account Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Adjust compliance alert notification limits, profile configurations, and developer API credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left: Profile Settings Form */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <User className="w-5 h-5 text-indigo-500" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">User Account Profile</h2>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Profile details updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div>
              <label htmlFor="settings-name" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Display Full Name
              </label>
              <input
                id="settings-name"
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
              />
            </div>

            <div>
              <label htmlFor="settings-email" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Workspace Email Address
              </label>
              <input
                id="settings-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
              />
            </div>

            <div>
              <label htmlFor="settings-phone" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Contact Phone Number
              </label>
              <input
                id="settings-phone"
                type="text"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
              />
            </div>

            <button
              id="settings-save-profile-btn"
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" /> Save Profile Details
            </button>
          </form>
        </div>

        {/* Center: Notification Configuration */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Bell className="w-5 h-5 text-indigo-500" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Alert Configurations</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Advance Expiry Boundaries</span>
              
              <label htmlFor="alert-30d" className="flex items-center justify-between p-2.5 bg-muted/40 hover:bg-muted/80 rounded-lg cursor-pointer border border-border/50">
                <div className="space-y-0.5">
                  <span className="font-bold text-foreground block">30 Days Advance Alert</span>
                  <span className="text-[10px] text-muted-foreground block">Flag assets as 'Expiring Soon' at 30 days.</span>
                </div>
                <input
                  id="alert-30d"
                  type="checkbox"
                  checked={alertDays30}
                  onChange={e => setAlertDays30(e.target.checked)}
                  className="accent-indigo-600 w-4 h-4"
                />
              </label>

              <label htmlFor="alert-60d" className="flex items-center justify-between p-2.5 bg-muted/40 hover:bg-muted/80 rounded-lg cursor-pointer border border-border/50">
                <div className="space-y-0.5">
                  <span className="font-bold text-foreground block">60 Days Advance Alert</span>
                  <span className="text-[10px] text-muted-foreground block">Flag assets as 'Expiring Soon' at 60 days.</span>
                </div>
                <input
                  id="alert-60d"
                  type="checkbox"
                  checked={alertDays60}
                  onChange={e => setAlertDays60(e.target.checked)}
                  className="accent-indigo-600 w-4 h-4"
                />
              </label>

              <label htmlFor="alert-99d" className="flex items-center justify-between p-2.5 bg-muted/40 hover:bg-muted/80 rounded-lg cursor-pointer border border-border/50">
                <div className="space-y-0.5">
                  <span className="font-bold text-foreground block">90 Days Advance Alert</span>
                  <span className="text-[10px] text-muted-foreground block">Flag assets as 'Expiring Soon' at 90 days.</span>
                </div>
                <input
                  id="alert-99d"
                  type="checkbox"
                  checked={alertDays90}
                  onChange={e => setAlertDays90(e.target.checked)}
                  className="accent-indigo-600 w-4 h-4"
                />
              </label>
            </div>

            <div className="space-y-3 border-t border-border/60 pt-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Delivery Channels</span>
              
              <label htmlFor="alert-email" className="flex items-center justify-between p-2 rounded-lg cursor-pointer">
                <div>
                  <span className="font-semibold block text-foreground">Email Alert Digests</span>
                  <span className="text-[9px] text-muted-foreground block">Weekly summaries of expiring and missing slots.</span>
                </div>
                <input
                  id="alert-email"
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={e => setEmailAlerts(e.target.checked)}
                  className="accent-indigo-600 w-4 h-4"
                />
              </label>

              <label htmlFor="alert-sms" className="flex items-center justify-between p-2 rounded-lg cursor-pointer">
                <div>
                  <span className="font-semibold block text-foreground">Critical SMS Alerts</span>
                  <span className="text-[9px] text-muted-foreground block">Immediate text notifications upon expired certificates.</span>
                </div>
                <input
                  id="alert-sms"
                  type="checkbox"
                  checked={smsAlerts}
                  onChange={e => setSmsAlerts(e.target.checked)}
                  className="accent-indigo-600 w-4 h-4"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right: API Integrations key configurations */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Key className="w-5 h-5 text-indigo-500" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Developer & API Integration</h2>
          </div>

          <div className="space-y-4 text-xs">
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Integrate LUMÉN tracking metrics directly into fleet logistics management systems, or import records programmatically.
            </p>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Active API Credentials Token
              </label>
              
              <div className="flex gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={apiKey}
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-[10px] font-mono outline-none"
                />
                
                <button
                  onClick={handleCopyKey}
                  className="p-2.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg transition-colors flex items-center justify-center shrink-0"
                  title="Copy Key"
                  id="settings-copy-api-btn"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleGenerateKey}
              className="w-full py-2 bg-muted hover:bg-muted/80 border border-border text-foreground font-bold rounded-lg transition-colors text-[11px]"
              id="settings-regenerate-api-btn"
            >
              Regenerate API Access Token
            </button>

            <div className="p-3 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 rounded-lg text-[10px] leading-relaxed space-y-1">
              <span className="font-bold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> Security Precaution:
              </span>
              <p className="opacity-90">Keep live integration tokens secure. Do not share API secret keys in public code repositories.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Appearance Customisation Section */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Palette className="w-5 h-5 text-indigo-500" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Workspace Visual Customisation</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-7 space-y-6">
            {/* Appearance Selector */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Appearance</span>
              <div className="grid grid-cols-3 gap-2">
                {(['light', 'midtone', 'dark'] as const).map(option => {
                  const Icon = option === 'light' ? Sun : option === 'midtone' ? CircleDot : Moon;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setThemePreference(option)}
                      aria-pressed={themePreference === option}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border font-bold capitalize transition-all text-xs cursor-pointer ${
                        themePreference === option
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-muted/40 hover:bg-muted border-border text-foreground hover:border-border-hover'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Named Vygilence Themes */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">LUMÉN Theme Palette</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(['sentinel', 'obsidian', 'emerald-watch', 'amber-beacon', 'arc-reactor', 'iron-ledger', 'vanguard'] as const).map(option => {
                  const themeNames: Record<VygilenceTheme, string> = {
                    'sentinel': 'Sentinel (Default)',
                    'obsidian': 'Obsidian Dark',
                    'emerald-watch': 'Emerald Watch',
                    'amber-beacon': 'Amber Beacon',
                    'arc-reactor': 'Arc Reactor',
                    'iron-ledger': 'Iron Ledger',
                    'vanguard': 'Vanguard Premium'
                  };

                  const themeDescs: Record<VygilenceTheme, string> = {
                    'sentinel': 'Navy, electric blue, & clean white accents.',
                    'obsidian': 'Executive graphite & soft silver highlights.',
                    'emerald-watch': 'Graphite with emerald & green glows.',
                    'amber-beacon': 'Navy with amber & soft gold highlights.',
                    'arc-reactor': 'Midnight blue with cyan & glass layers.',
                    'iron-ledger': 'Slate grey & steel blue classic stability.',
                    'vanguard': 'Premium indigo, purple, & subtle gradients.'
                  };

                  const themeColors: Record<VygilenceTheme, string> = {
                    'sentinel': 'bg-blue-500',
                    'obsidian': 'bg-zinc-400',
                    'emerald-watch': 'bg-emerald-500',
                    'amber-beacon': 'bg-amber-500',
                    'arc-reactor': 'bg-cyan-400',
                    'iron-ledger': 'bg-slate-500',
                    'vanguard': 'bg-violet-500'
                  };

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setVygilenceTheme(option)}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all text-xs cursor-pointer ${
                        vygilenceTheme === option
                          ? 'bg-indigo-500/5 border-indigo-650 ring-1 ring-indigo-650'
                          : 'bg-muted/30 border-border hover:bg-muted/50 hover:border-border-hover'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 border border-white/20 shadow-xs ${themeColors[option]}`} />
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-foreground block">{themeNames[option]}</span>
                        <span className="text-[10px] text-muted-foreground leading-normal block">{themeDescs[option]}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interface Styles */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Interface Style System</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['focused', 'balanced', 'command-centre', 'executive'] as const).map(option => {
                  const styleNames: Record<InterfaceStyle, string> = {
                    'focused': 'Focused',
                    'balanced': 'Balanced',
                    'command-centre': 'Command Centre',
                    'executive': 'Executive'
                  };

                  const styleDescs: Record<InterfaceStyle, string> = {
                    'focused': 'Minimal highlights, flat cards.',
                    'balanced': 'Modern recommended defaults.',
                    'command-centre': 'Enhanced dashboard visibility.',
                    'executive': 'Presentation gradients & radiuses.'
                  };

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setInterfaceStyle(option)}
                      className={`flex flex-col p-2.5 rounded-lg border text-left transition-all text-xs cursor-pointer ${
                        interfaceStyle === option
                          ? 'bg-indigo-500/5 border-indigo-650 ring-1 ring-indigo-650'
                          : 'bg-muted/30 border-border hover:bg-muted/50 hover:border-border-hover'
                      }`}
                    >
                      <span className="font-extrabold text-[11px] text-foreground capitalize">{styleNames[option]}</span>
                      <span className="text-[9px] text-muted-foreground mt-0.5 leading-normal">{styleDescs[option]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interface Detail Level */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Interface Detail Level</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['focused', 'advanced'] as const).map(option => {
                  const levelNames = {
                    focused: 'Focused View',
                    advanced: 'Advanced View'
                  };
                  const levelDescs = {
                    focused: 'Cleaner screens with advanced filters and tools available when needed.',
                    advanced: 'Keep filters, saved views, columns and power tools visible.'
                  };
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setInterfaceDetailLevel(option)}
                      className={`flex flex-col p-3.5 rounded-lg border text-left transition-all text-xs cursor-pointer ${
                        interfaceDetailLevel === option
                          ? 'bg-indigo-500/5 border-indigo-650 ring-1 ring-indigo-650'
                          : 'bg-muted/30 border-border hover:bg-muted/50 hover:border-border-hover'
                      }`}
                    >
                      <span className="font-extrabold text-[12px] text-foreground capitalize">{levelNames[option]}</span>
                      <span className="text-[10px] text-muted-foreground mt-1 leading-normal">{levelDescs[option]}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 leading-normal">
                💡 Note: Focused View simplifies layouts by hiding secondary elements under a unified control, but retains 100% of the app's functionality.
              </p>
            </div>
          </div>

          {/* Sandbox Live Preview Container */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-muted/20 border border-border/80 rounded-xl p-5 space-y-4">
            <div>
              <div className="flex items-center gap-1.5 border-b border-border/50 pb-2 mb-4">
                <Eye className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">Interactive Live Preview Sandbox</span>
              </div>

              <div className="space-y-4">
                {/* 1. Dashboard card preview */}
                <div className="bg-card p-4 border border-border rounded-xl space-y-3 shadow-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Preview Dashboard Widget</span>
                    <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-600 rounded text-[9px] font-bold">Active Theme</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-2xl font-black text-foreground">84%</span>
                      <span className="text-[9px] text-muted-foreground block mt-0.5">Assessed compliance readiness score</span>
                    </div>
                    {/* Button preview inside dashboard card */}
                    <button type="button" className="px-3 py-1.5 bg-indigo-650 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition-colors cursor-default">
                      View Details
                    </button>
                  </div>
                </div>

                {/* 2. Badge Preview */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Semantic Badge Safeguards</span>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      <span className="w-1 h-1 rounded-full bg-emerald-500" /> Compliant
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400">
                      <span className="w-1 h-1 rounded-full bg-amber-500" /> Due Soon
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400">
                      <span className="w-1 h-1 rounded-full bg-rose-500" /> Overdue
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase bg-zinc-500/10 border-zinc-500/20 text-zinc-500 dark:text-zinc-400">
                      <span className="w-1 h-1 rounded-full bg-zinc-500" /> Excluded
                    </span>
                  </div>
                </div>

                {/* 3. Table Rows Preview */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Table Rows Layout</span>

                  {/* Requirement table row preview */}
                  <div className="p-2.5 bg-card border border-border rounded-lg flex items-center justify-between text-[11px] hover:bg-muted/10 transition-colors">
                    <div className="font-semibold text-foreground truncate">1. Risk Assessment Record</div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground">General</span>
                      <span className="px-1.5 py-0.5 rounded border text-[9px] font-bold bg-indigo-500/10 border-indigo-500/20 text-indigo-650">Link File</span>
                    </div>
                  </div>

                  {/* Evidence table row preview */}
                  <div className="p-2.5 bg-card border border-border rounded-lg flex items-center justify-between text-[11px] hover:bg-muted/10 transition-colors">
                    <div className="truncate text-muted-foreground font-mono text-[10px]">apex_risk_assessment_2026.pdf</div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] px-1.5 py-0.5 bg-muted border border-border rounded text-muted-foreground font-bold">1.2 MB</span>
                      <span className="text-indigo-600 font-extrabold hover:underline">Preview</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground mt-4 leading-normal">
              Previews update in real-time as you switch options. Named themes and interface styles transform shadows, outlines, and border roundness globally across the workspace.
            </p>
          </div>
        </div>
      </div>

      {/* Demo Seeding Section */}
      {isDemoMode && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Demo Workspace Seeding & Diagnostics</h2>
          </div>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Load seed data configurations locally to stress-test layout rendering, pagination, global search limits, and overall interface responsiveness.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                id="settings-seed-demo-btn"
                onClick={handleLoadHighVolumeDemo}
                disabled={highVolumeLoading}
                className="px-4 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {highVolumeLoading ? 'Generating Data...' : 'Load High-Volume Demo Dataset'}
              </button>
              <button
                id="settings-reset-demo-btn"
                onClick={handleLocalReset}
                disabled={resetLoading}
                className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg text-xs shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {resetLoading ? 'Resetting...' : 'Reset to Standard Demo Dataset'}
              </button>
              <button
                id="settings-clear-demo-btn"
                onClick={handleClearDemoData}
                disabled={clearLoading}
                className="px-4 py-2.5 bg-rose-650 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer border border-rose-700/30"
              >
                {clearLoading ? 'Clearing...' : 'Clear Demo Data'}
              </button>
            </div>
            {highVolumeSuccess && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-200">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Success: High-volume dataset generated! loaded 200 assets, 200 people, 100 requirements, 300 competency types, and 500 evidence records.</span>
              </p>
            )}
            {resetSuccess && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-200">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Reset complete! Reverted to clean standard sample dataset.</span>
              </p>
            )}
            {clearSuccess && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-200">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Demo database cleared: All localStorage collections wiped.</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* System Readiness & Diagnostics Section (Admin/Developer only) */}
      {isOwnerOrAdmin && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-3.5">
            <Activity className="w-5 h-5 text-indigo-500" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">System Readiness & Diagnostics</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Environment Variables & Mode */}
            <div className="bg-muted/30 border border-border/60 rounded-xl p-4 space-y-3">
              <span className="font-extrabold text-[10px] uppercase tracking-widest text-indigo-650 dark:text-indigo-400 block">Environment & Mode</span>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Application Mode:</span>
                  <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider ${
                    isDemoMode ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  }`}>
                    {isDemoMode ? 'Demo / Local' : 'Production'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Supabase URL configured:</span>
                  <span className={`font-bold ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Yes (Present)' : 'No (Missing)'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Supabase Anon Key:</span>
                  <span className={`font-bold ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Yes (Present)' : 'No (Missing)'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Auth Redirect Config:</span>
                  <span className="text-muted-foreground">Redirects to `/login`</span>
                </div>
              </div>
            </div>

            {/* Storage & Data Store */}
            <div className="bg-muted/30 border border-border/60 rounded-xl p-4 space-y-3">
              <span className="font-extrabold text-[10px] uppercase tracking-widest text-indigo-650 dark:text-indigo-400 block">Storage & Data Store</span>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Evidence Storage Bucket:</span>
                  <span className="font-mono text-[10px] text-foreground font-bold">{evidenceStorageBucket}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Bucket Setup:</span>
                  <span className={`font-bold ${isDemoMode ? 'text-muted-foreground' : 'text-amber-500'}`}>
                    {isDemoMode ? 'N/A (Local DB)' : 'Staging Verification Pending'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Local Storage DB status:</span>
                  <span className="text-foreground font-bold">
                    {isDemoMode ? 'Active (Initialized)' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">
                    {isDemoMode ? 'Local Demo Record Count:' : 'Loaded Workspace Record Count:'}
                  </span>
                  <span className="font-bold font-mono">
                    {requirements.length + documents.length + assets.length + people.length + competencyRecords.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Schema & Migrations */}
            <div className="bg-muted/30 border border-border/60 rounded-xl p-4 space-y-3">
              <span className="font-extrabold text-[10px] uppercase tracking-widest text-indigo-650 dark:text-indigo-400 block">Schema & Migrations</span>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Database Schema Verification:</span>
                  <span className={`font-bold ${isDemoMode ? 'text-muted-foreground' : 'text-amber-500'}`}>
                    {isDemoMode ? 'N/A' : 'Pending Verification'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Saved Reports Migration:</span>
                  <span className={`font-bold ${isDemoMode ? 'text-muted-foreground' : 'text-amber-500'}`}>
                    {isDemoMode ? 'N/A' : 'Pending Verification'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Asset Matrix Migrations:</span>
                  <span className={`font-bold ${isDemoMode ? 'text-muted-foreground' : 'text-amber-500'}`}>
                    {isDemoMode ? 'N/A' : 'Pending Verification'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">CI Smoke Tests:</span>
                  <span className="text-rose-500 font-bold font-mono">Pending checklist</span>
                </div>
              </div>
            </div>
          </div>

          {/* Warnings & Boundary Diagnostics */}
          <div className="p-4 bg-amber-500/5 border border-amber-500/25 rounded-xl space-y-2 text-xs leading-relaxed">
            <span className="font-bold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-4 h-4 shrink-0" /> Important Readiness Warnings:
            </span>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                <strong>Competency Registry Expiry:</strong> Target warning values (`review_period_months` and `warning_days`) are local/demo-only unless corresponding columns exist in your active staging database schema.
              </li>
              <li>
                <strong>Password Recovery:</strong> In-app password update flow is completed for production Supabase redirects. In demo mode, it is cleanly disabled.
              </li>
              <li>
                <strong>Invitations:</strong> Member invitation workflows are currently simulation-only. They are disabled outside of demo mode.
              </li>
            </ul>
          </div>
        </div>
      )}

      <ConfirmDialog request={confirmRequest} onCancel={() => setConfirmRequest(null)} />
      <InlineToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
