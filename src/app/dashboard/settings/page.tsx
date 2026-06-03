'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { isDemoMode } from '@/lib/env';
import { Save, ShieldAlert, Key, Bell, User, CheckCircle2, Copy, Check } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useApp();

  // Profile Form States
  const [name, setName] = useState(user?.full_name || 'Jane Doe');
  const [phone, setPhone] = useState('+44 7700 900077');
  const [email, setEmail] = useState('jane.doe@apexlogistics.com');
  const [saveSuccess, setSaveSuccess] = useState(false);

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
      alert('API token generation requires a production secrets service before it can be enabled.');
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
              Integrate Vygilence tracking metrics directly into fleet logistics management systems, or import records programmatically.
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

    </div>
  );
}
