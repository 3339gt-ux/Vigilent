'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  FileCheck, 
  Plus, 
  Upload, 
  FolderLock, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  Trash2
} from 'lucide-react';

export default function DashboardPage() {
  const { 
    organization, 
    readinessScore, 
    stats, 
    matrixCells, 
    requirements, 
    documents, 
    auditPacks, 
    auditLogs, 
    uploadDocument,
    deleteDocument
  } = useApp();

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Vehicle');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadExpiry, setUploadExpiry] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Expiring Documents (status is 'Expiring Soon' or 'Expired')
  const expiringSoonDocs = documents.filter(d => d.status === 'Expiring Soon' || d.status === 'Expired');

  // Missing Evidence Requirements (from matrix cells)
  const missingRequirements = matrixCells.filter(c => c.status === 'Missing');

  // Unclassified Documents (no category set or status is Unclassified)
  const unclassifiedDocs = documents.filter(d => d.status === 'Unclassified');

  // Action to mock file uploading
  const handleQuickUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle || !uploadFileName) return;
    
    setIsUploading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulating lag
      
      // Call Context upload document
      await uploadDocument(
        uploadTitle,
        uploadFileName.toLowerCase().endsWith('.pdf') ? uploadFileName : `${uploadFileName}.pdf`,
        uploadCategory,
        Math.floor(Math.random() * 3000000) + 500000, // mock size
        uploadExpiry || null,
        new Date().toISOString().split('T')[0],
        {}
      );

      // Reset
      setUploadTitle('');
      setUploadFileName('');
      setUploadExpiry('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" id="dashboard-heading">Compliance Workspace</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of <strong>{organization?.name}</strong> readiness status across compliance categories.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/vault"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/15"
            id="dash-vault-btn"
          >
            <Plus className="w-4 h-4" /> Upload Evidence
          </Link>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Readiness Score</span>
            <span className="text-3xl font-extrabold block mt-1">{readinessScore}%</span>
          </div>
          <div className={`p-3 rounded-lg ${readinessScore > 75 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Missing Records</span>
            <span className="text-3xl font-extrabold block mt-1 text-rose-500">{stats.missingCount}</span>
          </div>
          <div className="p-3 rounded-lg bg-rose-500/10 text-rose-500">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Expiring / Expired</span>
            <span className="text-3xl font-extrabold block mt-1 text-amber-500">
              {stats.expiringSoonCount + stats.expiredCount}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Unclassified Files</span>
            <span className="text-3xl font-extrabold block mt-1 text-indigo-500">{stats.unclassifiedCount}</span>
          </div>
          <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-500">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns - Performance Matrix & Expiries (2 Cols on large screens) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Readiness Score Card */}
          <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6">Readiness Health Index</h2>
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="72" cy="72" r="56" stroke="currentColor" className="text-muted/10" strokeWidth="10" fill="transparent" />
                  <circle cx="72" cy="72" r="56" stroke="currentColor" 
                    className={readinessScore > 79 ? 'text-emerald-500' : readinessScore > 40 ? 'text-amber-500' : 'text-rose-500'} 
                    strokeWidth="10" fill="transparent" 
                    strokeDasharray={2 * Math.PI * 56} 
                    strokeDashoffset={2 * Math.PI * 56 * (1 - readinessScore / 100)} 
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                <span className="absolute text-4xl font-extrabold">{readinessScore}%</span>
              </div>
              
              <div className="space-y-2.5">
                <h3 className="text-lg font-bold">
                  {readinessScore >= 80 ? 'Operationally Compliant' : readinessScore >= 50 ? 'Medium Compliance Risks' : 'Critical Compliance Actions Required'}
                </h3>
                <p className="text-xs text-muted-foreground leading-normal max-w-md">
                  This score aggregates matched files inside the Evidence Matrix. Active certificates add to safety standing. Missing slots and expired items detract from score readiness.
                </p>
                <div className="flex flex-wrap gap-4 pt-1.5 text-[11px] font-semibold text-muted-foreground">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>{stats.compliantCount} Compliant Items</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>{stats.expiringSoonCount} Expiring Soon</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>{stats.expiredCount} Expired</div>
                </div>
              </div>
            </div>
          </div>

          {/* Missing Evidence List */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Missing Evidence ({missingRequirements.length})</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Required compliance fields lacking supporting documentation.</p>
              </div>
              <Link href="/dashboard/matrix" className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
                View Matrix <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {missingRequirements.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                No missing evidence! All compliance checkpoints contain records.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {missingRequirements.slice(0, 5).map(cell => {
                  const req = requirements.find(r => r.id === cell.requirement_id);
                  return (
                    <div key={cell.id} className="py-3.5 flex justify-between items-start gap-4 text-xs">
                      <div>
                        <span className="font-semibold block">{req?.title || 'Unknown Requirement'}</span>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          Target: {cell.target_name} ({cell.target_type})
                        </span>
                      </div>
                      <span className="px-2.5 py-1 text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full shrink-0 border border-rose-500/20">
                        Missing
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expiring Soon & Expired Evidence */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Expiry Alert Logs ({expiringSoonDocs.length})</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Certificates and files close to or past their expiration dates.</p>
              </div>
              <Link href="/dashboard/vault" className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
                Open Vault <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {expiringSoonDocs.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                All active documents are valid for at least 30 days.
              </div>
            ) : (
              <div className="space-y-3">
                {expiringSoonDocs.map(doc => {
                  const daysLeft = doc.expiry_date 
                    ? Math.ceil((new Date(doc.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : 0;
                  const isExpired = doc.status === 'Expired' || daysLeft <= 0;

                  return (
                    <div 
                      key={doc.id} 
                      className={`p-3 rounded-lg border flex justify-between items-center gap-4 text-xs ${
                        isExpired 
                          ? 'bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-400' 
                          : 'bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <span className="font-bold block truncate">{doc.title}</span>
                        <span className="text-[10px] opacity-80 block truncate mt-0.5">
                          File: {doc.file_name} • Category: {doc.category}
                        </span>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-[11px] uppercase tracking-wide block">
                          {isExpired ? 'Expired' : `${daysLeft} Days Left`}
                        </span>
                        <span className="text-[10px] opacity-70 block mt-0.5">
                          Exp: {doc.expiry_date || 'N/A'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Quick Upload, Unclassified, & Recents (1 Col) */}
        <div className="space-y-8">
          
          {/* Quick Upload Evidence Staging Area */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Quick Upload</h2>
            
            <form onSubmit={handleQuickUpload} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="quick-title" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Document Title
                </label>
                <input
                  id="quick-title"
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="e.g., Driver CPC - John Vance"
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="quick-filename" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    File Name
                  </label>
                  <input
                    id="quick-filename"
                    type="text"
                    required
                    value={uploadFileName}
                    onChange={e => setUploadFileName(e.target.value)}
                    placeholder="cpc_card.pdf"
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="quick-cat" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Category Scope
                  </label>
                  <select
                    id="quick-cat"
                    value={uploadCategory}
                    onChange={e => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none transition-colors"
                  >
                    <option value="Vehicle">Vehicle</option>
                    <option value="Driver">Driver</option>
                    <option value="Facility">Facility</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="quick-expiry" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Expiry Date <span className="text-[10px] font-normal text-muted-foreground">(Optional - Leaves Unclassified if Blank)</span>
                </label>
                <input
                  id="quick-expiry"
                  type="date"
                  value={uploadExpiry}
                  onChange={e => setUploadExpiry(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none transition-colors"
                />
              </div>

              <button
                id="quick-upload-submit-btn"
                type="submit"
                disabled={isUploading || !uploadTitle || !uploadFileName}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-semibold rounded-lg flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10 transition-all duration-200"
              >
                {isUploading ? 'Uploading & Seeding...' : (
                  <>
                    <Upload className="w-4 h-4" />
                    Process & Seed File
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Unclassified Documents Bin */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Unclassified Documents ({unclassifiedDocs.length})</h2>
            <p className="text-[11px] text-muted-foreground mb-4">Files missing expiry metadata required for continuous tracking.</p>

            {unclassifiedDocs.length === 0 ? (
              <div className="text-center py-6 text-[11px] text-muted-foreground bg-muted/20 border border-dashed border-border rounded-lg">
                No unclassified documents. All items in the vault are metadata mapped!
              </div>
            ) : (
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {unclassifiedDocs.map(doc => (
                  <div key={doc.id} className="p-3 bg-muted/40 border border-border/80 rounded-lg flex justify-between items-center text-xs">
                    <div className="overflow-hidden mr-2">
                      <span className="font-semibold block truncate">{doc.title}</span>
                      <span className="text-[10px] text-muted-foreground block truncate mt-0.5">{doc.file_name}</span>
                    </div>
                    <Link
                      href="/dashboard/vault"
                      className="px-2 py-1 bg-indigo-500/10 text-indigo-500 font-bold text-[10px] rounded hover:bg-indigo-500/20 shrink-0"
                    >
                      Classify
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Shareable Audit Packs */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Open Audit Packs</h2>
              <Link href="/dashboard/audit-packs" className="text-xs text-indigo-500 hover:underline">
                Create Pack
              </Link>
            </div>

            {auditPacks.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No active audit share links generated.
              </div>
            ) : (
              <div className="space-y-3">
                {auditPacks.map(pack => (
                  <div key={pack.id} className="p-3 bg-card border border-border rounded-lg text-xs space-y-2">
                    <div className="flex justify-between items-center font-bold">
                      <span className="truncate">{pack.name}</span>
                      <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase ${
                        pack.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-500/10 text-zinc-500'
                      }`}>
                        {pack.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      <span>{pack.documents.length} Evidence Docs</span>
                      <span>PIN: {pack.pin_code || 'None'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Recent Audit Activity</h2>
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {auditLogs.slice(0, 5).map(log => (
                <div key={log.id} className="text-xs flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5"></div>
                  <div>
                    <span className="font-semibold block text-foreground">{log.action}</span>
                    <p className="text-muted-foreground text-[10px] leading-relaxed mt-0.5">{log.details}</p>
                    <span className="text-[9px] text-muted-foreground block mt-1">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
