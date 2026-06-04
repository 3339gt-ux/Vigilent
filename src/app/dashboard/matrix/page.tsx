'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { MatrixCell, ComplianceRequirement, EvidenceDocument, CellStatus } from '@/lib/types';
import { isDemoMode } from '@/lib/env';
import { 
  Grid, 
  Plus, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileCheck,
  X, 
  Link as LinkIcon, 
  FileText,
  UserPlus,
  AlertCircle
} from 'lucide-react';

export default function EvidenceMatrix() {
  const { 
    requirements, 
    matrixCells, 
    documents, 
    updateCellMapping, 
    createRequirement 
  } = useApp();

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTargetType, setSelectedTargetType] = useState<string>('All');

  // Modal State for Cell Editing
  const [activeCell, setActiveCell] = useState<MatrixCell | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string>('');

  // Target adding state
  const [showAddTargetModal, setShowAddTargetModal] = useState(false);
  const [newTargetName, setNewTargetName] = useState('');
  const [newTargetType, setNewTargetType] = useState<'Vehicle' | 'Facility' | 'Personnel'>('Vehicle');

  // Requirement adding state
  const [showAddReqModal, setShowAddReqModal] = useState(false);
  const [newReqTitle, setNewReqTitle] = useState('');
  const [newReqDesc, setNewReqDesc] = useState('');
  const [newReqCategory, setNewReqCategory] = useState<'Vehicle' | 'Driver' | 'Facility' | 'General'>('Vehicle');

  // Find unique targets across the cells
  const uniqueTargets = Array.from(new Set(matrixCells.map(c => c.target_name))).map(name => {
    const matchingCell = matrixCells.find(c => c.target_name === name);
    return {
      name,
      type: matchingCell ? matchingCell.target_type : 'Vehicle'
    };
  });

  // Filter targets based on selection
  const filteredTargets = uniqueTargets.filter(t => {
    if (selectedTargetType === 'All') return true;
    if (selectedTargetType === 'Vehicle' && t.type === 'Vehicle') return true;
    if (selectedTargetType === 'Personnel' && t.type === 'Personnel') return true;
    if (selectedTargetType === 'Facility' && t.type === 'Facility') return true;
    return false;
  });

  // Filter requirements based on selection
  const filteredRequirements = requirements.filter(r => {
    if (selectedCategory === 'All') return true;
    return r.category === selectedCategory;
  });

  // Handle cell click
  const handleCellClick = (cell: MatrixCell) => {
    setActiveCell(cell);
    setSelectedDocId(cell.document_id || '');
  };

  // Save cell link mapping
  const handleSaveCellLink = async () => {
    if (!activeCell) return;
    
    let nextStatus: CellStatus = 'Missing';
    if (selectedDocId) {
      const doc = documents.find(d => d.id === selectedDocId);
      if (doc) {
        if (doc.status === 'Expired') nextStatus = 'Expired';
        else if (doc.status === 'Expiring Soon') nextStatus = 'Expiring Soon';
        else nextStatus = 'Compliant';
      }
    }

    await updateCellMapping(activeCell.id, selectedDocId || null, nextStatus);
    setActiveCell(null);
  };

  // Add a new target entity
  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTargetName) return;
    if (!isDemoMode) {
      alert('Asset registration requires a production database mutation path before it can be enabled.');
      return;
    }

    // In local context, we add blank cell linkages for this target across matching requirements
    const matchedReqs = requirements.filter(r => {
      if (newTargetType === 'Vehicle' && r.category === 'Vehicle') return true;
      if (newTargetType === 'Personnel' && r.category === 'Driver') return true;
      if (newTargetType === 'Facility' && (r.category === 'Facility' || r.category === 'General')) return true;
      return false;
    });

    // We trigger updating cells locally via local storage
    if (typeof window !== 'undefined') {
      const cells = JSON.parse(localStorage.getItem('vigilen_cells') || '[]');
      matchedReqs.forEach(req => {
        const id = `cell-${Math.random().toString(36).substr(2, 9)}`;
        cells.push({
          id,
          organization_id: req.organization_id,
          requirement_id: req.id,
          target_name: newTargetName,
          target_type: newTargetType,
          document_id: null,
          status: 'Missing',
          last_checked_at: new Date().toISOString()
        });
      });
      localStorage.setItem('vigilen_cells', JSON.stringify(cells));
      
      // Seed audit log
      const logs = JSON.parse(localStorage.getItem('vigilen_logs') || '[]');
      logs.unshift({
        id: `log-${Math.random().toString(36).substr(2, 9)}`,
        organization_id: 'org-apex-101',
        profile_id: 'usr-jane-doe',
        action: 'Asset Registered',
        details: `Registered new target asset "${newTargetName}" (${newTargetType}) inside matrix grid.`,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('vigilen_logs', JSON.stringify(logs));
      
      // Reload page location to reflect context re-init
      window.location.reload();
    }
  };

  // Add compliance requirement
  const handleAddRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReqTitle) return;

    await createRequirement(newReqTitle, newReqDesc, newReqCategory);
    setNewReqTitle('');
    setNewReqDesc('');
    setShowAddReqModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" id="matrix-heading">Evidence Matrix</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visual evidence catalog mapping requirements to personnel, fleets, and facilities.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowAddReqModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-semibold rounded-lg"
            id="matrix-add-requirement-btn"
          >
            <Plus className="w-4 h-4" /> Add Requirement
          </button>
          
          <button
            onClick={() => setShowAddTargetModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/15"
            id="matrix-add-target-btn"
          >
            <UserPlus className="w-4 h-4" /> Register Asset
          </button>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-card border border-border p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-muted-foreground">Grid Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Target Columns Filter */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Columns (Assets):</span>
            <select
              id="matrix-filter-target"
              value={selectedTargetType}
              onChange={e => setSelectedTargetType(e.target.value)}
              className="bg-muted border border-border/80 rounded px-2.5 py-1 outline-none text-xs text-foreground font-bold"
            >
              <option value="All">All Assets</option>
              <option value="Vehicle">Vehicles</option>
              <option value="Personnel">Personnel / Drivers</option>
              <option value="Facility">Facilities / Depots</option>
            </select>
          </div>

          {/* Requirement Rows Filter */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Rows (Requirements):</span>
            <select
              id="matrix-filter-category"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-muted border border-border/80 rounded px-2.5 py-1 outline-none text-xs text-foreground font-bold"
            >
              <option value="All">All Requirements</option>
              <option value="Vehicle">Vehicle Requirements</option>
              <option value="Driver">Driver CPC / Training</option>
              <option value="Facility">Facility & Safety</option>
              <option value="General">General / Administrative</option>
            </select>
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider">
                <th className="p-4 min-w-[240px] sticky left-0 bg-card z-10 border-r border-border">Compliance Requirement</th>
                {filteredTargets.length === 0 ? (
                  <th className="p-4 text-center">No assets found</th>
                ) : (
                  filteredTargets.map(t => (
                    <th key={t.name} className="p-4 text-center min-w-[120px] whitespace-nowrap">
                      <span className="block font-extrabold text-foreground">{t.name}</span>
                      <span className="text-[9px] text-muted-foreground font-semibold uppercase mt-0.5">{t.type}</span>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredRequirements.length === 0 ? (
                <tr>
                  <td colSpan={filteredTargets.length + 1} className="p-8 text-center text-muted-foreground">
                    No compliance requirements mapped for this view.
                  </td>
                </tr>
              ) : (
                filteredRequirements.map(req => (
                  <tr key={req.id} className="hover:bg-muted/10 transition-colors">
                    {/* Sticky Row Title */}
                    <td className="p-4 font-semibold text-foreground sticky left-0 bg-card z-10 border-r border-border min-w-[240px]">
                      <span className="block font-bold">{req.title}</span>
                      <span className="text-[10px] text-muted-foreground font-normal leading-relaxed block mt-1">
                        {req.description}
                      </span>
                    </td>
                    
                    {/* Matrix Cells */}
                    {filteredTargets.map(target => {
                      // Find if a matrix cell exists mapping target name to this requirement
                      const cell = matrixCells.find(
                        c => c.requirement_id === req.id && c.target_name === target.name
                      );

                      if (!cell) {
                        return (
                          <td key={`${req.id}-${target.name}`} className="p-4 text-center text-muted-foreground/40 italic select-none">
                            N/A
                          </td>
                        );
                      }

                      // Status styles
                      return (
                        <td 
                          key={cell.id} 
                          className="p-4 text-center align-middle"
                        >
                          <button
                            onClick={() => handleCellClick(cell)}
                            id={`matrix-cell-${cell.id}`}
                            className={`w-full py-2 px-2.5 rounded-lg border font-bold text-[10px] uppercase tracking-wide transition-all cursor-pointer hover:shadow-sm ${
                              cell.status === 'Compliant' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20' :
                              cell.status === 'Expiring Soon' ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20' :
                              cell.status === 'Expired' ? 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20' :
                              'bg-zinc-500/10 border-zinc-500/25 text-zinc-500 hover:bg-zinc-500/20'
                            }`}
                          >
                            {cell.status}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-card border border-border p-4 rounded-xl text-xs text-muted-foreground flex flex-wrap gap-6 items-center">
        <span className="font-bold text-foreground">Matrix Legend:</span>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500 text-emerald-600"></span> Compliant (Active document uploaded)</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500 text-amber-600"></span> Expiring Soon (Doc expires within 30 days)</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-500/20 border border-rose-500 text-rose-600"></span> Expired (Doc validity has lapsed)</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-zinc-500/20 border border-zinc-500 text-zinc-600"></span> Missing (No verification records attached)</div>
      </div>

      {/* Modal 1: Link Evidence Document to Cell */}
      {activeCell && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 relative shadow-2xl">
            <button
              onClick={() => setActiveCell(null)}
              className="absolute top-4 right-4 p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div className="flex items-center gap-2.5 border-b border-border pb-3 mb-4">
              <LinkIcon className="w-5 h-5 text-indigo-500 shrink-0" />
              <div>
                <h3 className="text-base font-extrabold text-foreground">Verify Compliance Requirement</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Link a supporting document to update evidence status.</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-muted/40 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Target Entity:</span>
                  <span className="text-foreground font-extrabold">{activeCell.target_name} ({activeCell.target_type})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Requirement Row:</span>
                  <span className="text-foreground font-extrabold">{requirements.find(r => r.id === activeCell.requirement_id)?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Current Standing:</span>
                  <span className="text-foreground font-extrabold uppercase">{activeCell.status}</span>
                </div>
              </div>

              <div>
                <label htmlFor="select-evidence" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Link Evidence Document
                </label>
                <select
                  id="select-evidence"
                  value={selectedDocId}
                  onChange={e => setSelectedDocId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                >
                  <option value="">-- No File Linked (Mark as Missing) --</option>
                  {documents
                    // Only show docs in the same category scope for smart grouping
                    .filter(doc => doc.category === (requirements.find(r => r.id === activeCell.requirement_id)?.category === 'Driver' ? 'Driver' : requirements.find(r => r.id === activeCell.requirement_id)?.category))
                    .map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {doc.title} ({doc.status} • Exp: {doc.expiry_date || 'None'})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveCell(null)}
                  className="w-1/2 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg text-center"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCellLink}
                  className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md"
                  id="matrix-save-link-btn"
                >
                  Save Mapping Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Register New Asset */}
      {showAddTargetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 relative shadow-2xl">
            <button
              onClick={() => setShowAddTargetModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <UserPlus className="w-5 h-5 text-indigo-500" />
              <div>
                <h3 className="text-base font-extrabold text-foreground">Register Target Asset</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Add a fleet vehicle, driver, or warehouse site.</p>
              </div>
            </div>

            <form onSubmit={handleAddTarget} className="space-y-4 text-xs">
              <div>
                <label htmlFor="target-name" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Asset / Entity Identifier Name
                </label>
                <input
                  id="target-name"
                  type="text"
                  required
                  value={newTargetName}
                  onChange={e => setNewTargetName(e.target.value)}
                  placeholder="e.g. Scania HGV Truck #204 or John Vance"
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                />
              </div>

              <div>
                <label htmlFor="target-type" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Asset Type
                </label>
                <select
                  id="target-type"
                  value={newTargetType}
                  onChange={e => setNewTargetType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                >
                  <option value="Vehicle">Vehicle (Truck, Forklift, Trailer)</option>
                  <option value="Personnel">Personnel (Driver, Operator, Manager)</option>
                  <option value="Facility">Facility (Warehouses, Depots, HQ)</option>
                </select>
              </div>

              <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-lg text-[10px] leading-relaxed flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Creating this asset will seed unverified (Missing) checklist rows inside the Evidence Matrix.</span>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddTargetModal(false)}
                  className="w-1/2 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg text-center"
                >
                  Cancel
                </button>
                <button
                  id="matrix-submit-target"
                  type="submit"
                  className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md"
                >
                  Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Add Custom Requirement */}
      {showAddReqModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 relative shadow-2xl">
            <button
              onClick={() => setShowAddReqModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <Grid className="w-5 h-5 text-indigo-500" />
              <div>
                <h3 className="text-base font-extrabold text-foreground">Add Custom Compliance Requirement</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Define a regulatory standard to monitor.</p>
              </div>
            </div>

            <form onSubmit={handleAddRequirement} className="space-y-4 text-xs">
              <div>
                <label htmlFor="req-title" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Requirement Title
                </label>
                <input
                  id="req-title"
                  type="text"
                  required
                  value={newReqTitle}
                  onChange={e => setNewReqTitle(e.target.value)}
                  placeholder="e.g. Forklift Thorough Examination Certificate (LOLER)"
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                />
              </div>

              <div>
                <label htmlFor="req-desc" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Detailed Description
                </label>
                <textarea
                  id="req-desc"
                  rows={2}
                  value={newReqDesc}
                  onChange={e => setNewReqDesc(e.target.value)}
                  placeholder="Describe standard validity conditions and guidelines..."
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none resize-none"
                />
              </div>

              <div>
                <label htmlFor="req-cat" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Compliance Category
                </label>
                <select
                  id="req-cat"
                  value={newReqCategory}
                  onChange={e => setNewReqCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                >
                  <option value="Vehicle">Vehicle (Applicable to trucks and machinery)</option>
                  <option value="Driver">Driver (Applicable to drivers and operators)</option>
                  <option value="Facility">Facility (Applicable to warehouses, depots)</option>
                  <option value="General">General (Applicable to company-wide insurance / admin)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddReqModal(false)}
                  className="w-1/2 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg text-center"
                >
                  Cancel
                </button>
                <button
                  id="matrix-submit-req"
                  type="submit"
                  className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md"
                >
                  Create Requirement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
