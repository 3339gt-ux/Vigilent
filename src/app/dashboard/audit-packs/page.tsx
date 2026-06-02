'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AuditPack, EvidenceDocument } from '@/lib/types';
import { 
  FolderArchive, 
  Plus, 
  Search, 
  FileText, 
  ShieldAlert, 
  Copy, 
  Check, 
  Lock, 
  ExternalLink,
  Trash2,
  AlertCircle,
  FileArchive,
  RefreshCw,
  X,
  Info,
  FileCheck
} from 'lucide-react';

export default function AuditPackBuilder() {
  const { 
    documents, 
    auditPacks, 
    createPack, 
    updatePackStatus 
  } = useApp();

  const [step, setStep] = useState(1);
  const [packName, setPackName] = useState('');
  const [packDesc, setPackDesc] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  
  // Share links helper states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [newlyCreatedPack, setNewlyCreatedPack] = useState<AuditPack | null>(null);

  // Toggle document selection
  const toggleDocSelection = (id: string) => {
    setSelectedDocIds(prev => 
      prev.includes(id) ? prev.filter(dId => dId !== id) : [...prev, id]
    );
  };

  // Compile package logic
  const handleCompilePack = async () => {
    if (!packName || selectedDocIds.length === 0) return;
    
    setIsCompiling(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate packing compression
      const pin = pinCode || null;
      const pack = await createPack(packName, packDesc, selectedDocIds, pin);
      setNewlyCreatedPack(pack);
      setStep(3);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCompiling(false);
    }
  };

  // Reset compiler
  const handleReset = () => {
    setStep(1);
    setPackName('');
    setPackDesc('');
    setPinCode('');
    setSelectedDocIds([]);
    setNewlyCreatedPack(null);
  };

  // Clipboard share copy
  const handleCopyLink = (pack: AuditPack) => {
    const mockUrl = `${window.location.origin}/share/audit/${pack.share_token}`;
    navigator.clipboard.writeText(mockUrl);
    setCopiedId(pack.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredDocs = documents.filter(doc => {
    return doc.title.toLowerCase().includes(search.toLowerCase()) || 
           doc.file_name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-8">
      
      {/* Head */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight" id="packs-heading">Audit Pack Builder</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compile evidence files into structured bundles and track prototype share links for auditors.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* Pack Builder Wizard Card (2 Cols) */}
        <div className="xl:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm">
          
          {/* Header tabs indicator */}
          <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Compiler Workflow
            </span>
            <div className="flex gap-2.5 text-[10px] font-bold text-muted-foreground">
              <span className={`px-2 py-0.5 rounded ${step === 1 ? 'bg-indigo-500/10 text-indigo-500' : ''}`}>1. Pack Details</span>
              <span>&rarr;</span>
              <span className={`px-2 py-0.5 rounded ${step === 2 ? 'bg-indigo-500/10 text-indigo-500' : ''}`}>2. Select Files</span>
              <span>&rarr;</span>
              <span className={`px-2 py-0.5 rounded ${step === 3 ? 'bg-indigo-500/10 text-indigo-500' : ''}`}>3. Share Portal</span>
            </div>
          </div>

          {/* STEP 1: Details */}
          {step === 1 && (
            <div className="space-y-4 text-xs">
              <div>
                <label htmlFor="pack-name-input" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Audit Pack Name
                </label>
                <input
                  id="pack-name-input"
                  type="text"
                  required
                  value={packName}
                  onChange={e => setPackName(e.target.value)}
                  placeholder="e.g. DVSA Annual Safety Inspection 2026"
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                />
              </div>

              <div>
                <label htmlFor="pack-desc-input" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Purpose / Description
                </label>
                <textarea
                  id="pack-desc-input"
                  rows={3}
                  value={packDesc}
                  onChange={e => setPackDesc(e.target.value)}
                  placeholder="Briefly describe the audit context (e.g. including Operator Licence records, and driver CPC validation details for Q2 inspection scope)..."
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none resize-none"
                />
              </div>

              <div>
                <label htmlFor="pack-pin-input" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                  Security Passcode PIN <span className="font-normal text-muted-foreground text-[9px]">(Optional encryption mockup)</span>
                </label>
                <input
                  id="pack-pin-input"
                  type="text"
                  maxLength={6}
                  value={pinCode}
                  onChange={e => setPinCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 4-digit code (e.g. 4821)"
                  className="w-full max-w-[150px] px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs font-mono text-center tracking-widest outline-none"
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!packName}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white font-bold rounded-lg text-xs"
                  id="pack-goto-step2-btn"
                >
                  Continue to Select Files &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Select Files */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-muted-foreground">
                  Select Evidence Documents ({selectedDocIds.length} chosen)
                </span>
                
                <div className="relative w-48">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search vault..."
                    className="w-full pl-7 pr-3 py-1 bg-muted border border-border/80 rounded-lg text-[10px] outline-none"
                  />
                </div>
              </div>

              {/* Document selection lists */}
              <div className="border border-border/85 rounded-xl divide-y divide-border/60 max-h-[300px] overflow-y-auto bg-muted/10">
                {filteredDocs.length === 0 ? (
                  <p className="p-6 text-center text-xs text-muted-foreground">No files in your vault matching search parameters.</p>
                ) : (
                  filteredDocs.map(doc => {
                    const isChecked = selectedDocIds.includes(doc.id);
                    return (
                      <div 
                        key={doc.id} 
                        onClick={() => toggleDocSelection(doc.id)}
                        className={`p-3 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors ${
                          isChecked ? 'bg-indigo-500/5' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 text-xs overflow-hidden mr-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="accent-indigo-600 rounded shrink-0"
                          />
                          <div className="overflow-hidden">
                            <span className="font-bold block truncate text-foreground">{doc.title}</span>
                            <span className="text-[10px] text-muted-foreground block truncate">{doc.file_name} • {doc.category}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase shrink-0 ${
                          doc.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          {doc.status}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-4 border-t border-border flex justify-between text-xs">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg border border-border"
                >
                  Back to Details
                </button>
                <button
                  onClick={handleCompilePack}
                  disabled={selectedDocIds.length === 0 || isCompiling}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
                  id="pack-compile-submit-btn"
                >
                  {isCompiling ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Compiling Audit Bundle...
                    </>
                  ) : (
                    <>
                      <FileArchive className="w-4 h-4" />
                      Compile & Activate
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Share Portal */}
          {step === 3 && newlyCreatedPack && (
            <div className="space-y-6 text-center py-6 text-xs max-w-md mx-auto">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
                <FileCheck className="w-8 h-8" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-foreground">Bundle Compiled Successfully!</h3>
                <p className="text-xs text-muted-foreground">
                  The evidence package has been assembled in the prototype share-link registry.
                </p>
              </div>

              <div className="bg-muted/40 border border-border/80 rounded-xl p-4 text-left space-y-3">
                <div className="flex justify-between font-bold text-xs text-foreground">
                  <span>Name:</span>
                  <span>{newlyCreatedPack.name}</span>
                </div>
                <div className="flex justify-between font-bold text-xs text-foreground">
                  <span>Compiled Files:</span>
                  <span>{newlyCreatedPack.documents.length} Items</span>
                </div>
                <div className="flex justify-between font-bold text-xs text-foreground">
                  <span>PIN Protection:</span>
                  <span>{newlyCreatedPack.pin_code ? `Enabled (${newlyCreatedPack.pin_code})` : 'Disabled'}</span>
                </div>
                <div className="flex justify-between font-bold text-xs text-foreground">
                  <span>Expiry Date:</span>
                  <span>30 Days (Active Link)</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleCopyLink(newlyCreatedPack)}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/15"
                  id="pack-copy-link-btn"
                >
                  {copiedId === newlyCreatedPack.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  Copy Share URL
                </button>
                <button
                  onClick={handleReset}
                  className="w-1/2 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg text-center"
                >
                  Create New Pack
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Existing Packs Registry List (1 Col) */}
        <div className="space-y-4">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
            Existing Audit Portals
          </span>
          
          {auditPacks.length === 0 ? (
            <div className="bg-card border border-border p-6 rounded-xl text-center text-xs text-muted-foreground">
              No audit portals created yet. Use the wizard to bundle active compliance evidence.
            </div>
          ) : (
            <div className="space-y-4">
              {auditPacks.map(pack => (
                <div key={pack.id} className="bg-card border border-border p-4 rounded-xl space-y-4 text-xs shadow-sm">
                  
                  {/* Title & Status */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="overflow-hidden mr-2">
                      <span className="font-bold block truncate text-foreground leading-normal" title={pack.name}>{pack.name}</span>
                      <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
                        Compiled on {new Date(pack.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase shrink-0 border ${
                      pack.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                    }`}>
                      {pack.status}
                    </span>
                  </div>

                  {/* Pack description details */}
                  {pack.description && (
                    <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                      {pack.description}
                    </p>
                  )}

                  {/* Meta details list */}
                  <div className="p-2.5 bg-muted/40 rounded-lg space-y-1.5 text-[10px] font-semibold text-muted-foreground">
                    <div className="flex justify-between items-center">
                      <span>Documents:</span>
                      <span className="text-foreground font-bold">{pack.documents.length} Files compiled</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Security Mode:</span>
                      <span className="text-foreground font-bold flex items-center gap-1">
                        {pack.pin_code ? (
                          <>
                            <Lock className="w-3 h-3 text-indigo-500" /> PIN Protected ({pack.pin_code})
                          </>
                        ) : (
                          'Public URL'
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex gap-2 pt-2 border-t border-border/50">
                    <button
                      onClick={() => handleCopyLink(pack)}
                      className="flex-1 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded flex items-center justify-center gap-1 text-[10px]"
                      title="Copy URL"
                    >
                      {copiedId === pack.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Link
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        const targetStatus = pack.status === 'Active' ? 'Archived' : 'Active';
                        updatePackStatus(pack.id, targetStatus);
                      }}
                      className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground font-bold border border-border rounded text-[10px]"
                      title="Toggle Portal State"
                    >
                      {pack.status === 'Active' ? 'Archive' : 'Activate'}
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
