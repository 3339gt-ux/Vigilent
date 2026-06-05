'use client';

import React, { useState, useMemo } from 'react';
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
  AlertCircle,
  Search
} from 'lucide-react';
import {
  useFilterFavourites,
  useSavedViews,
  FilterFavouriteButton,
  ActiveFilterChips,
  SavedViewsBar,
  StarredFilterSelect,
  SavedView
} from '@/components/FilterControls';

export default function EvidenceMatrix() {
  const {
    user,
    requirements,
    matrixCells,
    documents,
    updateCellMapping,
    createRequirement
  } = useApp();

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTargetType, setSelectedTargetType] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [targetNameFilter, setTargetNameFilter] = useState<string>('All');
  const [showOnlyGaps, setShowOnlyGaps] = useState(false);
  const [showOnlyStarredReqs, setShowOnlyStarredReqs] = useState(false);

  // Layout states
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [showFilters, setShowFilters] = useState(false);

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

  // Starred / favourite options persistence
  const { favourites, toggleFavourite, isFavourite } = useFilterFavourites(user?.id || 'guest', 'evidence-matrix');

  // Saved Views System
  const defaultViews: SavedView[] = [
    {
      id: 'missing-evidence',
      name: 'Missing Evidence',
      filters: { statusFilter: 'Missing' }
    },
    {
      id: 'expired-evidence',
      name: 'Expired Status',
      filters: { statusFilter: 'Expired' }
    },
    {
      id: 'expiring-soon',
      name: 'Expiring Soon',
      filters: { statusFilter: 'Expiring Soon' }
    },
    {
      id: 'red-amber',
      name: 'Red/Amber Alerts',
      filters: { showOnlyGaps: true }
    }
  ];

  const {
    allViews,
    activeViewId,
    setActiveViewId,
    saveCurrentView,
    deleteCustomView
  } = useSavedViews(user?.id || 'guest', 'evidence-matrix', defaultViews);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('All');
    setSelectedTargetType('All');
    setStatusFilter('All');
    setTargetNameFilter('All');
    setShowOnlyGaps(false);
    setShowOnlyStarredReqs(false);
    setActiveViewId(null);
  };

  const handleSelectView = (view: SavedView | null) => {
    if (view === null) {
      handleResetFilters();
      setActiveViewId(null);
    } else {
      const f = view.filters;
      setSearch(f.search || '');
      setSelectedCategory(f.selectedCategory || 'All');
      setSelectedTargetType(f.selectedTargetType || 'All');
      setStatusFilter(f.statusFilter || 'All');
      setTargetNameFilter(f.targetNameFilter || 'All');
      setShowOnlyGaps(!!f.showOnlyGaps);
      setShowOnlyStarredReqs(!!f.showOnlyStarredReqs);
      setActiveViewId(view.id);
    }
  };

  const handleSaveView = (name: string) => {
    const filters = {
      search,
      selectedCategory,
      selectedTargetType,
      statusFilter,
      targetNameFilter,
      showOnlyGaps,
      showOnlyStarredReqs
    };
    saveCurrentView(name, filters);
  };

  const isViewModified = useMemo(() => {
    if (!activeViewId) return false;
    const activeView = allViews.find(v => v.id === activeViewId);
    if (!activeView) return false;
    const f = activeView.filters;

    return !(
      (f.search || '') === search &&
      (f.selectedCategory || 'All') === selectedCategory &&
      (f.selectedTargetType || 'All') === selectedTargetType &&
      (f.statusFilter || 'All') === statusFilter &&
      (f.targetNameFilter || 'All') === targetNameFilter &&
      (!!f.showOnlyGaps) === showOnlyGaps &&
      (!!f.showOnlyStarredReqs) === showOnlyStarredReqs
    );
  }, [
    activeViewId,
    allViews,
    search,
    selectedCategory,
    selectedTargetType,
    statusFilter,
    targetNameFilter,
    showOnlyGaps,
    showOnlyStarredReqs
  ]);

  const filterChips = useMemo(() => {
    const chips: any[] = [];
    if (search) {
      chips.push({
        key: 'search',
        label: 'Search',
        valueLabel: search,
        onClear: () => setSearch('')
      });
    }
    if (selectedCategory !== 'All') {
      chips.push({
        key: 'category',
        label: 'Category',
        valueLabel: selectedCategory,
        onClear: () => setSelectedCategory('All')
      });
    }
    if (selectedTargetType !== 'All') {
      chips.push({
        key: 'targetType',
        label: 'Asset Type',
        valueLabel: selectedTargetType,
        onClear: () => setSelectedTargetType('All')
      });
    }
    if (statusFilter !== 'All') {
      chips.push({
        key: 'status',
        label: 'Status',
        valueLabel: statusFilter,
        onClear: () => setStatusFilter('All')
      });
    }
    if (targetNameFilter !== 'All') {
      chips.push({
        key: 'targetName',
        label: 'Asset Name',
        valueLabel: targetNameFilter,
        onClear: () => setTargetNameFilter('All')
      });
    }
    if (showOnlyGaps) {
      chips.push({
        key: 'gaps',
        label: 'Show Only',
        valueLabel: 'Gaps (Alerts)',
        onClear: () => setShowOnlyGaps(false)
      });
    }
    if (showOnlyStarredReqs) {
      chips.push({
        key: 'starred',
        label: 'Show Only',
        valueLabel: 'Starred Requirements',
        onClear: () => setShowOnlyStarredReqs(false)
      });
    }
    return chips;
  }, [
    search,
    selectedCategory,
    selectedTargetType,
    statusFilter,
    targetNameFilter,
    showOnlyGaps,
    showOnlyStarredReqs
  ]);

  // Find unique targets across the cells
  const uniqueTargets = useMemo(() => {
    return Array.from(new Set(matrixCells.map(c => c.target_name))).map(name => {
      const matchingCell = matrixCells.find(c => c.target_name === name);
      return {
        name,
        type: matchingCell ? matchingCell.target_type : 'Vehicle'
      };
    });
  }, [matrixCells]);

  // Dropdown list sorting
  const categoriesList = ['Vehicle', 'Driver', 'Facility', 'General'];
  const sortedCategories = useMemo(() => {
    const starred = categoriesList.filter(c => isFavourite(`cat:${c}`));
    const regular = categoriesList.filter(c => !isFavourite(`cat:${c}`));
    return [...starred, ...regular];
  }, [favourites]);

  const targetNames = useMemo(() => {
    return Array.from(new Set(uniqueTargets.map(t => t.name)));
  }, [uniqueTargets]);

  const sortedTargets = useMemo(() => {
    const starred = targetNames.filter(t => isFavourite(`target:${t}`));
    const regular = targetNames.filter(t => !isFavourite(`target:${t}`));
    return [...starred, ...regular];
  }, [targetNames, favourites]);

  // Filter targets based on selection
  const filteredTargets = useMemo(() => {
    return uniqueTargets.filter(t => {
      const matchesType = selectedTargetType === 'All' || t.type === selectedTargetType;
      const matchesName = targetNameFilter === 'All' || t.name === targetNameFilter;
      return matchesType && matchesName;
    });
  }, [uniqueTargets, selectedTargetType, targetNameFilter]);

  // Filter requirements based on selection
  const filteredRequirements = useMemo(() => {
    return requirements.filter(r => {
      const matchesCategory = selectedCategory === 'All' || r.category === selectedCategory;
      const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
                            (r.description || '').toLowerCase().includes(search.toLowerCase());
      const matchesStarred = !showOnlyStarredReqs || isFavourite(`req:${r.id}`);

      // Filter based on whether any cell matches status filter or gaps
      const reqCells = matrixCells.filter(c => c.requirement_id === r.id);

      const matchesStatus = statusFilter === 'All' || reqCells.some(c => c.status === statusFilter);
      const matchesGaps = !showOnlyGaps || reqCells.some(c => c.status === 'Missing' || c.status === 'Expired' || c.status === 'Expiring Soon');

      return matchesCategory && matchesSearch && matchesStarred && matchesStatus && matchesGaps;
    });
  }, [requirements, selectedCategory, search, showOnlyStarredReqs, statusFilter, showOnlyGaps, matrixCells, favourites]);

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

  const paddingClass = density === 'comfortable' ? 'p-4' : 'p-2';
  const textClass = density === 'comfortable' ? 'text-xs' : 'text-[11px]';

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
            className="flex items-center gap-1.5 px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-semibold rounded-lg cursor-pointer"
            id="matrix-add-requirement-btn"
          >
            <Plus className="w-4 h-4" /> Add Requirement
          </button>

          <button
            onClick={() => setShowAddTargetModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-650 hover:bg-indigo-755 text-white text-xs font-semibold rounded-lg shadow-md cursor-pointer"
            id="matrix-add-target-btn"
          >
            <UserPlus className="w-4 h-4" /> Register Asset
          </button>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-card border border-border p-4 rounded-xl space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search requirements by title, description..."
              className="w-full pl-9 pr-3 py-2 bg-muted border border-border rounded-lg text-xs outline-none text-foreground placeholder-muted-foreground"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 border rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                showFilters || filterChips.length > 0
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-400'
                  : 'bg-muted hover:bg-muted/80 border-border text-foreground'
              }`}
            >
              Filters {(filterChips.length > 0) && <span className="bg-indigo-650 text-white dark:bg-indigo-550 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold">{filterChips.length}</span>}
            </button>

            {/* Density controls */}
            <div className="flex bg-muted p-0.5 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setDensity('comfortable')}
                className={`px-2 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  density === 'comfortable' ? 'bg-card text-foreground shadow-xs border border-border/50' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Comfortable
              </button>
              <button
                type="button"
                onClick={() => setDensity('compact')}
                className={`px-2 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  density === 'compact' ? 'bg-card text-foreground shadow-xs border border-border/50' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Compact
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible advanced filters */}
        {showFilters && (
          <div className="border-t border-border/60 pt-3.5 mt-3.5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <StarredFilterSelect
                label="Category"
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={['All', ...sortedCategories]}
                isStarred={(opt) => isFavourite(`cat:${opt}`)}
                onToggleStar={(opt) => toggleFavourite(`cat:${opt}`)}
                allLabel="All Categories"
              />
              <StarredFilterSelect
                label="Asset"
                value={targetNameFilter}
                onChange={setTargetNameFilter}
                options={['All', ...sortedTargets]}
                isStarred={(opt) => isFavourite(`target:${opt}`)}
                onToggleStar={(opt) => toggleFavourite(`target:${opt}`)}
                allLabel="All Assets"
              />
              <StarredFilterSelect
                label="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={['All', 'Compliant', 'Expiring Soon', 'Expired', 'Missing']}
                isStarred={(opt) => isFavourite(`status:${opt}`)}
                onToggleStar={(opt) => toggleFavourite(`status:${opt}`)}
              />
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Asset Type</label>
                <select
                  value={selectedTargetType}
                  onChange={event => setSelectedTargetType(event.target.value)}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs font-semibold text-foreground outline-none cursor-pointer"
                >
                  <option value="All">All Types</option>
                  <option value="Vehicle">Vehicle</option>
                  <option value="Personnel">Personnel / Driver</option>
                  <option value="Facility">Facility</option>
                </select>
              </div>
            </div>

            {/* Quick Toggle Checkboxes */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-border/40 text-xs">
              <label className="flex items-center gap-2 font-semibold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyGaps}
                  onChange={e => setShowOnlyGaps(e.target.checked)}
                  className="accent-indigo-650 w-3.5 h-3.5"
                />
                <span>Red/Amber Status Gaps only</span>
              </label>
              <label className="flex items-center gap-2 font-semibold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyStarredReqs}
                  onChange={e => setShowOnlyStarredReqs(e.target.checked)}
                  className="accent-indigo-650 w-3.5 h-3.5"
                />
                <span>Starred Requirements only</span>
              </label>
            </div>
          </div>
        )}

        {/* Saved Views Bar */}
        <SavedViewsBar
          views={allViews}
          activeViewId={activeViewId}
          onSelectView={handleSelectView}
          onSaveCurrent={handleSaveView}
          onDeleteCustom={deleteCustomView}
          isViewModified={isViewModified}
        />

        {/* Active chips */}
        <ActiveFilterChips chips={filterChips} onClearAll={handleResetFilters} />

        {/* Results Counter Info */}
        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-1">
          <span>Filtered Rows: {filteredRequirements.length} / {requirements.length} requirements</span>
          <span>Filtered Columns: {filteredTargets.length} / {uniqueTargets.length} assets</span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[62vh] relative">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider sticky top-0 z-20">
                <th
                  className="p-4 min-w-[260px] sticky left-0 top-0 z-35 border-r border-b border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)] font-extrabold text-[10px]"
                  style={{ backgroundColor: 'var(--muted)', left: 0, top: 0 }}
                >
                  Compliance Requirement
                </th>
                {filteredTargets.length === 0 ? (
                  <th className="p-4 text-center">No assets found</th>
                ) : (
                  filteredTargets.map(t => (
                    <th
                      key={t.name}
                      className="p-4 text-center min-w-[130px] whitespace-nowrap sticky top-0 border-b border-border"
                      style={{ backgroundColor: 'var(--muted)', top: 0 }}
                    >
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
                filteredRequirements.map(req => {
                  const isStarred = isFavourite(`req:${req.id}`);
                  return (
                    <tr key={req.id} className="hover:bg-muted/10 transition-colors">
                      {/* Sticky Row Title */}
                      <td
                        className={`${paddingClass} font-semibold text-foreground sticky left-0 z-10 border-r border-border min-w-[260px] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)]`}
                        style={{ backgroundColor: 'var(--card)', left: 0 }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className={`block font-bold text-foreground ${textClass}`}>{req.title}</span>
                            <span className="text-[9px] text-muted-foreground font-medium uppercase mt-0.5 block">{req.category}</span>
                            {density === 'comfortable' && req.description && (
                              <span className="text-[10px] text-muted-foreground font-normal leading-relaxed block mt-1 line-clamp-2" title={req.description}>
                                {req.description}
                              </span>
                            )}
                          </div>
                          <FilterFavouriteButton
                            isStarred={isStarred}
                            onToggle={() => toggleFavourite(`req:${req.id}`)}
                          />
                        </div>
                      </td>

                      {/* Matrix Cells */}
                      {filteredTargets.map(target => {
                        // Find if a matrix cell exists mapping target name to this requirement
                        const cell = matrixCells.find(
                          c => c.requirement_id === req.id && c.target_name === target.name
                        );

                        if (!cell) {
                          return (
                            <td key={`${req.id}-${target.name}`} className="p-4 text-center text-muted-foreground/45 italic select-none">
                              N/A
                            </td>
                          );
                        }

                        // Status styles
                        return (
                          <td
                            key={cell.id}
                            className={paddingClass}
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
                  );
                })
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
          <div className="bg-card solid-panel border border-border w-full max-w-md rounded-2xl p-6 relative shadow-2xl">
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
                  className="w-1/2 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCellLink}
                  className="w-1/2 py-2 bg-indigo-650 hover:bg-indigo-755 text-white font-bold rounded-lg shadow-md cursor-pointer"
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
          <div className="bg-card solid-panel border border-border w-full max-w-sm rounded-2xl p-6 relative shadow-2xl">
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
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none cursor-pointer"
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
                  className="w-1/2 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="matrix-submit-target"
                  type="submit"
                  className="w-1/2 py-2 bg-indigo-650 hover:bg-indigo-755 text-white font-bold rounded-lg shadow-md cursor-pointer"
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
          <div className="bg-card solid-panel border border-border w-full max-w-md rounded-2xl p-6 relative shadow-2xl">
            <button
              onClick={() => setShowAddReqModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded animate-none"
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
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none resize-none leading-relaxed"
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
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none cursor-pointer"
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
                  className="w-1/2 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="matrix-submit-req"
                  type="submit"
                  className="w-1/2 py-2 bg-indigo-650 hover:bg-indigo-755 text-white font-bold rounded-lg shadow-md cursor-pointer"
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
