'use client';

import React, { useState, useMemo } from 'react';
import { useApp, useInterfaceDetailLevel } from '@/context/AppContext';
import { FiltersAndToolsButton, AdvancedControlsPanel } from '@/components/InterfaceDetailControls';
import { MatrixCell, ComplianceRequirement, EvidenceDocument, CellStatus } from '@/lib/types';
import { isDemoMode } from '@/lib/env';
import { exportCsv, exportDateStamp, ExportRow } from '@/lib/exportData';
import { ConfirmDialog, ConfirmRequest, InlineToast, ToastState } from '@/components/AppFeedback';
import {
  Grid,
  Download,
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
  SavedView,
  PaginationControls,
  BulkSelectionToolbar,
  DensityControls,
  useBulkSelection,
  useGlobalDensityPreference,
  usePagination,
  usePersistentViewState
} from '@/components/FilterControls';

export default function EvidenceMatrix() {
  const {
    user,
    organization,
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
  const [showHiddenRows, setShowHiddenRows] = useState(false);
  const [hiddenMatrixRowIds, setHiddenMatrixRowIds] = useState<Set<string>>(new Set());
  const [lastHiddenRowUndo, setLastHiddenRowUndo] = useState<null | { ids: string[]; action: 'hide' | 'restore' }>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const hiddenRowsStorageKey = `vygilence_hidden_matrix_rows_${user?.id || 'guest'}_${organization?.id || 'workspace'}`;

  // Layout states
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [showFilters, setShowFilters] = useState(false);
  const { interfaceDetailLevel } = useInterfaceDetailLevel();

  const activeFiltersCount = useMemo(() => {
    return [
      selectedCategory !== 'All',
      selectedTargetType !== 'All',
      statusFilter !== 'All',
      targetNameFilter !== 'All',
      showOnlyGaps,
      showOnlyStarredReqs,
      showHiddenRows
    ].filter(Boolean).length;
  }, [selectedCategory, selectedTargetType, statusFilter, targetNameFilter, showOnlyGaps, showOnlyStarredReqs, showHiddenRows]);

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
  const { favourites, toggleFavourite, isFavourite, clearFavourites, FavouritesConfirmModal } = useFilterFavourites(user?.id || 'guest', 'evidence-matrix', organization?.id);

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
  } = useSavedViews(user?.id || 'guest', 'evidence-matrix', defaultViews, organization?.id);
  const { globalDensity, setGlobalDensity } = useGlobalDensityPreference(user?.id || 'guest', organization?.id);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = JSON.parse(localStorage.getItem(hiddenRowsStorageKey) || '[]');
      setHiddenMatrixRowIds(new Set(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : []));
    } catch {
      setHiddenMatrixRowIds(new Set());
    }
  }, [hiddenRowsStorageKey]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(hiddenRowsStorageKey, JSON.stringify(Array.from(hiddenMatrixRowIds)));
  }, [hiddenMatrixRowIds, hiddenRowsStorageKey]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('All');
    setSelectedTargetType('All');
    setStatusFilter('All');
    setTargetNameFilter('All');
    setShowOnlyGaps(false);
    setShowOnlyStarredReqs(false);
    setShowHiddenRows(false);
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
      setShowHiddenRows(!!f.showHiddenRows);
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
      showOnlyStarredReqs,
      showHiddenRows
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
      (!!f.showOnlyStarredReqs) === showOnlyStarredReqs &&
      (!!f.showHiddenRows) === showHiddenRows
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
    showOnlyStarredReqs,
    showHiddenRows
  ]);

  const { storageKey: matrixViewStateKey } = usePersistentViewState(
    user?.id || 'guest',
    organization?.id,
    'evidence-matrix',
    {
      search,
      selectedCategory,
      selectedTargetType,
      statusFilter,
      targetNameFilter,
      showOnlyGaps,
      showOnlyStarredReqs,
      showHiddenRows,
      density,
      activeViewId
    },
    stored => {
      if (typeof stored.search === 'string') setSearch(stored.search);
      if (typeof stored.selectedCategory === 'string') setSelectedCategory(stored.selectedCategory);
      if (typeof stored.selectedTargetType === 'string') setSelectedTargetType(stored.selectedTargetType);
      if (typeof stored.statusFilter === 'string') setStatusFilter(stored.statusFilter);
      if (typeof stored.targetNameFilter === 'string') setTargetNameFilter(stored.targetNameFilter);
      if (typeof stored.showOnlyGaps === 'boolean') setShowOnlyGaps(stored.showOnlyGaps);
      if (typeof stored.showOnlyStarredReqs === 'boolean') setShowOnlyStarredReqs(stored.showOnlyStarredReqs);
      if (typeof stored.showHiddenRows === 'boolean') setShowHiddenRows(stored.showHiddenRows);
      if (stored.density === 'comfortable' || stored.density === 'compact') setDensity(stored.density);
      if (typeof stored.activeViewId === 'string' || stored.activeViewId === null) setActiveViewId(stored.activeViewId);
    },
    [search, selectedCategory, selectedTargetType, statusFilter, targetNameFilter, showOnlyGaps, showOnlyStarredReqs, showHiddenRows, density, activeViewId]
  );

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = JSON.parse(localStorage.getItem(matrixViewStateKey) || '{}');
      if (!stored.density) setDensity(globalDensity);
    } catch {
      setDensity(globalDensity);
    }
  }, [globalDensity, matrixViewStateKey]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const filterParam = params.get('filter');
      const reqId = params.get('requirement');
      const targetName = params.get('asset') || params.get('target');

      if (reqId && targetName && matrixCells.length > 0) {
        const cell = matrixCells.find(c => c.requirement_id === reqId && c.target_name === targetName);
        if (cell) {
          handleCellClick(cell);
        }
      } else if (reqId && requirements.length > 0) {
        const req = requirements.find(r => r.id === reqId);
        if (req) {
          setSearch(req.title);
        }
      }

      if (filterParam) {
        if (filterParam.startsWith('req:')) {
          const rId = filterParam.replace('req:', '');
          const req = requirements.find(r => r.id === rId);
          if (req) {
            setSearch(req.title);
          }
        } else if (filterParam.startsWith('cat:')) {
          const catName = filterParam.replace('cat:', '');
          setSelectedCategory(catName);
        } else if (filterParam.startsWith('target:')) {
          const targetNameVal = filterParam.replace('target:', '');
          setTargetNameFilter(targetNameVal);
        }
      }
    }
  }, [requirements, matrixCells]);

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
        valueLabel: 'Favourite Requirements',
        onClear: () => setShowOnlyStarredReqs(false)
      });
    }
    if (showHiddenRows) {
      chips.push({
        key: 'hidden',
        label: 'Display',
        valueLabel: 'Hidden Rows',
        onClear: () => setShowHiddenRows(false)
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
    showOnlyStarredReqs,
    showHiddenRows
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
      const isHidden = hiddenMatrixRowIds.has(r.id);
      if (!showHiddenRows && isHidden) return false;
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
  }, [requirements, hiddenMatrixRowIds, showHiddenRows, selectedCategory, search, showOnlyStarredReqs, statusFilter, showOnlyGaps, matrixCells, favourites, isFavourite]);

  const matrixPagination = usePagination(
    filteredRequirements,
    user?.id || 'guest',
    organization?.id,
    'evidence-matrix-rows',
    [search, selectedCategory, selectedTargetType, statusFilter, targetNameFilter, showOnlyGaps, showOnlyStarredReqs, showHiddenRows]
  );
  const matrixRowSelection = useBulkSelection(matrixPagination.paginatedItems);

  const matrixExportRows = (rows: ComplianceRequirement[]): ExportRow[] => {
    const result: ExportRow[] = [];
    rows.forEach(requirement => {
      filteredTargets.forEach(target => {
        const cell = matrixCells.find(item => item.requirement_id === requirement.id && item.target_name === target.name);
        const doc = cell?.document_id ? documents.find(item => item.id === cell.document_id) : null;
        result.push({
          requirement_title: requirement.title,
          requirement_category: requirement.category,
          target_name: target.name,
          target_type: target.type,
          status: cell?.status || 'N/A',
          linked_document_title: doc?.title || '',
          linked_document_category: doc?.category || '',
          linked_document_expiry: doc?.expiry_date || ''
        });
      });
    });
    return result;
  };

  const exportMatrix = (scope: 'selected' | 'filtered') => {
    const rows = scope === 'selected'
      ? filteredRequirements.filter(requirement => matrixRowSelection.selectedIds.has(requirement.id))
      : filteredRequirements;

    setConfirmRequest({
      title: 'Export Evidence Matrix?',
      description: `You are about to export ${rows.length} requirement-target mappings as a CSV file. Do you want to download this data?`,
      confirmLabel: 'Export CSV',
      tone: 'primary',
      onConfirm: () => {
        try {
          exportCsv(`vygilence-evidence-matrix-${scope}-export-${exportDateStamp()}.csv`, matrixExportRows(rows));
          setToast({ type: 'success', message: 'Evidence Matrix exported successfully.' });
        } catch (e) {
          setToast({ type: 'error', message: 'Failed to export Evidence Matrix.' });
        }
      }
    });
  };

  // Handle cell click
  function handleCellClick(cell: MatrixCell) {
    setActiveCell(cell);
    setSelectedDocId(cell.document_id || '');
  }

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

  const handleHideSelectedRows = () => {
    const ids = Array.from(matrixRowSelection.selectedIds).filter(id => !hiddenMatrixRowIds.has(id));
    if (ids.length === 0) return;
    setConfirmRequest({
      title: 'Hide selected matrix rows?',
      description: `Hide ${ids.length} selected active matrix row(s). This is a personal workspace display preference and does not change readiness scoring or evidence links.`,
      confirmLabel: 'Hide rows',
      tone: 'warning',
      onConfirm: () => {
        setHiddenMatrixRowIds(prev => {
          const next = new Set(prev);
          ids.forEach(id => next.add(id));
          return next;
        });
        setLastHiddenRowUndo({ ids, action: 'hide' });
        matrixRowSelection.clearSelection();
        setToast({ type: 'success', message: `${ids.length} matrix row(s) hidden from your active view.` });
      }
    });
  };

  const handleRestoreSelectedRows = () => {
    const ids = Array.from(matrixRowSelection.selectedIds).filter(id => hiddenMatrixRowIds.has(id));
    if (ids.length === 0) return;
    setConfirmRequest({
      title: 'Restore selected matrix rows?',
      description: `Restore ${ids.length} hidden matrix row(s) to the normal view.`,
      confirmLabel: 'Restore rows',
      tone: 'primary',
      onConfirm: () => {
        setHiddenMatrixRowIds(prev => {
          const next = new Set(prev);
          ids.forEach(id => next.delete(id));
          return next;
        });
        setLastHiddenRowUndo({ ids, action: 'restore' });
        matrixRowSelection.clearSelection();
        setToast({ type: 'success', message: `${ids.length} matrix row(s) restored to the normal view.` });
      }
    });
  };

  const handleRestoreAllHiddenRows = () => {
    const count = hiddenMatrixRowIds.size;
    if (count === 0) return;
    const oldIds = Array.from(hiddenMatrixRowIds);
    setConfirmRequest({
      title: 'Restore all hidden matrix rows?',
      description: `Restore all ${count} hidden row(s) to the normal view.`,
      confirmLabel: 'Restore all',
      tone: 'primary',
      onConfirm: () => {
        setHiddenMatrixRowIds(new Set());
        setLastHiddenRowUndo({ ids: oldIds, action: 'restore' });
        matrixRowSelection.clearSelection();
        setToast({ type: 'success', message: `${count} matrix row(s) restored to the normal view.` });
      }
    });
  };

  const undoMatrixRowVisibility = () => {
    if (!lastHiddenRowUndo) return;
    setHiddenMatrixRowIds(prev => {
      const next = new Set(prev);
      lastHiddenRowUndo.ids.forEach(id => {
        if (lastHiddenRowUndo.action === 'hide') next.delete(id);
        else next.add(id);
      });
      return next;
    });
    setLastHiddenRowUndo(null);
    setToast({ type: 'success', message: 'Matrix row visibility change undone.' });
  };

  // Add a new target entity
  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTargetName) return;
    if (!isDemoMode) {
      setToast({ type: 'info', message: 'Asset registration requires a production database mutation path before it can be enabled.' });
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
      <InlineToast toast={toast} onDismiss={() => setToast(null)} />

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
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-md cursor-pointer"
            id="matrix-add-target-btn"
          >
            <UserPlus className="w-4 h-4" /> Register Asset
          </button>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-card border border-border p-3 rounded-xl space-y-2.5 shadow-xs">
        {interfaceDetailLevel === 'focused' ? (
          // FOCUSED VIEW LAYOUT
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex flex-wrap items-center gap-2 w-full">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search requirements by title, description..."
                    className="w-full pl-9 pr-3 py-2 bg-muted border border-border rounded-lg text-xs outline-none text-foreground placeholder-muted-foreground"
                  />
                </div>
                <FiltersAndToolsButton
                  isOpen={showFilters}
                  onClick={() => setShowFilters(!showFilters)}
                  activeFiltersCount={activeFiltersCount}
                  onClearFilters={handleResetFilters}
                />
                {hiddenMatrixRowIds.size > 0 && (
                  <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-lg shrink-0">
                    <span className="text-[11px] text-amber-700 dark:text-amber-400">Hidden rows · {hiddenMatrixRowIds.size}</span>
                    <button
                      type="button"
                      onClick={handleRestoreAllHiddenRows}
                      className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-extrabold cursor-pointer focus:underline ml-1.5"
                    >
                      Restore all
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => exportMatrix('filtered')}
                  className="px-3 py-2 bg-card hover:bg-muted border border-border rounded-lg font-bold text-foreground text-xs flex items-center gap-1.5 cursor-pointer shrink-0 ml-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            <AdvancedControlsPanel isOpen={showFilters} onClose={() => setShowFilters(false)}>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={hiddenMatrixRowIds.size === 0}
                      onClick={() => setShowHiddenRows(!showHiddenRows)}
                      className={`px-3 py-2 border rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        showHiddenRows
                          ? 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400'
                          : 'bg-muted hover:bg-muted/80 border-border text-foreground'
                      }`}
                    >
                      <span>Show Hidden Rows ({hiddenMatrixRowIds.size})</span>
                    </button>
                    {hiddenMatrixRowIds.size > 0 && (
                      <button
                        type="button"
                        onClick={handleRestoreAllHiddenRows}
                        className="px-3 py-2 bg-muted hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 border border-border rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        Restore all hidden
                      </button>
                    )}
                  </div>

                  <DensityControls
                    density={density}
                    onDensityChange={setDensity}
                    globalDensity={globalDensity}
                    onGlobalDensityChange={nextDensity => {
                      setGlobalDensity(nextDensity);
                      setDensity(nextDensity);
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <StarredFilterSelect
                    label="Category"
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    options={['All', ...sortedCategories]}
                    isStarred={(opt) => isFavourite(`cat:${opt}`)}
                    onToggleStar={(opt) => toggleFavourite(`cat:${opt}`, opt, 'Category')}
                    allLabel="All Categories"
                  />
                  <StarredFilterSelect
                    label="Asset"
                    value={targetNameFilter}
                    onChange={setTargetNameFilter}
                    options={['All', ...sortedTargets]}
                    isStarred={(opt) => isFavourite(`target:${opt}`)}
                    onToggleStar={(opt) => toggleFavourite(`target:${opt}`, opt, 'Target Asset')}
                    allLabel="All Assets"
                  />
                  <StarredFilterSelect
                    label="Status"
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={['All', 'Compliant', 'Expiring Soon', 'Expired', 'Missing']}
                    isStarred={(opt) => isFavourite(`status:${opt}`)}
                    onToggleStar={(opt) => toggleFavourite(`status:${opt}`, opt, 'Status')}
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
                    <span>Favourite Requirements only</span>
                  </label>
                  <label className={`flex items-center gap-2 font-semibold text-foreground cursor-pointer ${hiddenMatrixRowIds.size === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      disabled={hiddenMatrixRowIds.size === 0}
                      checked={showHiddenRows}
                      onChange={e => setShowHiddenRows(e.target.checked)}
                      className="accent-indigo-650 w-3.5 h-3.5 disabled:cursor-not-allowed"
                    />
                    <span>Show hidden rows ({hiddenMatrixRowIds.size})</span>
                  </label>
                </div>

                <SavedViewsBar
                  views={allViews}
                  activeViewId={activeViewId}
                  onSelectView={handleSelectView}
                  onSaveCurrent={handleSaveView}
                  onDeleteCustom={deleteCustomView}
                  isViewModified={isViewModified}
                />
              </div>
            </AdvancedControlsPanel>
          </>
        ) : (
          // ADVANCED VIEW LAYOUT
          <>
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
                      ? 'bg-indigo-55 border-indigo-200 text-indigo-750 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-400'
                      : 'bg-muted hover:bg-muted/80 border-border text-foreground'
                  }`}
                >
                  Filters {(filterChips.length > 0) && <span className="bg-indigo-650 text-white dark:bg-indigo-600 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold">{filterChips.length}</span>}
                </button>

                <button
                  type="button"
                  disabled={hiddenMatrixRowIds.size === 0}
                  onClick={() => setShowHiddenRows(!showHiddenRows)}
                  className={`px-3 py-2 border rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    showHiddenRows
                      ? 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400'
                      : 'bg-muted hover:bg-muted/80 border-border text-foreground'
                  }`}
                >
                  <span>Hidden rows ({hiddenMatrixRowIds.size})</span>
                </button>

                {hiddenMatrixRowIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleRestoreAllHiddenRows}
                    className="px-3 py-2 bg-muted hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 border border-border rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    Restore all hidden
                  </button>
                )}

                <DensityControls
                  density={density}
                  onDensityChange={setDensity}
                  globalDensity={globalDensity}
                  onGlobalDensityChange={nextDensity => {
                    setGlobalDensity(nextDensity);
                    setDensity(nextDensity);
                  }}
                />
              </div>
            </div>

            {/* Collapsible advanced filters */}
            {showFilters && (
              <div className="border-t border-border/60 pt-3 mt-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <StarredFilterSelect
                    label="Category"
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    options={['All', ...sortedCategories]}
                    isStarred={(opt) => isFavourite(`cat:${opt}`)}
                    onToggleStar={(opt) => toggleFavourite(`cat:${opt}`, opt, 'Category')}
                    allLabel="All Categories"
                  />
                  <StarredFilterSelect
                    label="Asset"
                    value={targetNameFilter}
                    onChange={setTargetNameFilter}
                    options={['All', ...sortedTargets]}
                    isStarred={(opt) => isFavourite(`target:${opt}`)}
                    onToggleStar={(opt) => toggleFavourite(`target:${opt}`, opt, 'Target Asset')}
                    allLabel="All Assets"
                  />
                  <StarredFilterSelect
                    label="Status"
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={['All', 'Compliant', 'Expiring Soon', 'Expired', 'Missing']}
                    isStarred={(opt) => isFavourite(`status:${opt}`)}
                    onToggleStar={(opt) => toggleFavourite(`status:${opt}`, opt, 'Status')}
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
                    <span>Favourite Requirements only</span>
                  </label>
                  <label className={`flex items-center gap-2 font-semibold text-foreground cursor-pointer ${hiddenMatrixRowIds.size === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      disabled={hiddenMatrixRowIds.size === 0}
                      checked={showHiddenRows}
                      onChange={e => setShowHiddenRows(e.target.checked)}
                      className="accent-indigo-650 w-3.5 h-3.5 disabled:cursor-not-allowed"
                    />
                    <span>Show hidden rows ({hiddenMatrixRowIds.size})</span>
                    {hiddenMatrixRowIds.size > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreAllHiddenRows();
                        }}
                        className="ml-2 text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline px-2 py-0.5 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 rounded-md transition-colors cursor-pointer"
                      >
                        Restore all hidden
                      </button>
                    )}
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
          </>
        )}

        {/* Active chips (always visible below the toolbar) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <ActiveFilterChips chips={filterChips} onClearAll={handleResetFilters} />
          {favourites.length > 0 && (
            <button
              onClick={clearFavourites}
              className="text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:underline px-2.5 py-1 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-center shrink-0"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              Clear Favourites ({favourites.length})
            </button>
          )}
        </div>

        {/* Results Counter Info */}
        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-1">
          <span>Filtered Rows: {filteredRequirements.length} / {requirements.length} requirements</span>
          <span>Filtered Columns: {filteredTargets.length} / {uniqueTargets.length} assets</span>
        </div>
      </div>

      {interfaceDetailLevel === 'advanced' && (
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
          <button type="button" onClick={() => exportMatrix('filtered')} className="px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-lg font-bold text-foreground flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export filtered
          </button>
          <button type="button" disabled={matrixRowSelection.selectedCount === 0} onClick={() => exportMatrix('selected')} className="px-3 py-1.5 bg-card hover:bg-muted disabled:opacity-40 border border-border rounded-lg font-bold text-foreground flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export selected
          </button>
        </div>
      )}

      <BulkSelectionToolbar
        selectedCount={matrixRowSelection.selectedCount}
        recordLabel="matrix row(s)"
        onSelectVisible={matrixRowSelection.selectVisible}
        onClear={matrixRowSelection.clearSelection}
        message="Row visibility is a user/workspace display preference."
      >
        {Array.from(matrixRowSelection.selectedIds).some(id => !hiddenMatrixRowIds.has(id)) && (
          <button
            type="button"
            onClick={handleHideSelectedRows}
            className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer text-[11px] shrink-0"
          >
            Hide selected
          </button>
        )}
        {Array.from(matrixRowSelection.selectedIds).some(id => hiddenMatrixRowIds.has(id)) && (
          <button
            type="button"
            onClick={handleRestoreSelectedRows}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold cursor-pointer text-[11px] shrink-0"
          >
            Unhide selected
          </button>
        )}
        {lastHiddenRowUndo && (
          <button
            type="button"
            onClick={undoMatrixRowVisibility}
            className="px-2.5 py-1 bg-card hover:bg-muted border border-border text-foreground rounded-lg font-bold cursor-pointer text-[11px] shrink-0"
          >
            Undo row visibility
          </button>
        )}
      </BulkSelectionToolbar>

      <PaginationControls
        pageSize={matrixPagination.pageSize}
        onPageSizeChange={matrixPagination.setPageSize}
        currentPage={matrixPagination.currentPage}
        totalPages={matrixPagination.totalPages}
        totalItems={matrixPagination.totalItems}
        startItem={matrixPagination.startItem}
        endItem={matrixPagination.endItem}
        onPageChange={matrixPagination.setCurrentPage}
        itemLabel="requirements"
      />

      {/* Matrix Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[62vh] relative">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider sticky top-0 z-20">
                <th
                  className="p-4 min-w-[260px] sticky left-0 top-0 z-30 border-r-2 border-b border-border/80 font-extrabold text-[10px]"
                  style={{ backgroundColor: 'hsl(var(--muted))', left: 0, top: 0 }}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={matrixRowSelection.allVisibleSelected}
                      onChange={event => {
                        if (event.target.checked) matrixRowSelection.selectVisible();
                        else matrixRowSelection.clearSelection();
                      }}
                      className="rounded border-border text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 bg-muted/40 cursor-pointer"
                      aria-label="Select visible matrix rows"
                    />
                    <span>Compliance Requirement</span>
                  </div>
                </th>
                {filteredTargets.length === 0 ? (
                  <th className="p-4 text-center">No assets found</th>
                ) : (
                  filteredTargets.map(t => (
                    <th
                      key={t.name}
                      className="p-4 text-center min-w-[130px] whitespace-nowrap sticky top-0 border-b border-border"
                      style={{ backgroundColor: 'hsl(var(--muted))', top: 0 }}
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
                matrixPagination.paginatedItems.map(req => {
                  const isStarred = isFavourite(`req:${req.id}`);
                  const isBulkSelected = matrixRowSelection.isSelected(req.id);
                  const isHiddenRow = hiddenMatrixRowIds.has(req.id);
                  return (
                    <tr key={req.id} className={`hover:bg-muted/10 transition-colors ${isBulkSelected ? 'bg-indigo-500/5' : ''} ${isHiddenRow ? 'opacity-60 grayscale' : ''}`}>
                      {/* Sticky Row Title */}
                      <td
                        className={`${paddingClass} font-semibold text-foreground sticky left-0 z-10 border-r-2 border-border/80 min-w-[260px]`}
                        style={{ backgroundColor: 'hsl(var(--card))', left: 0 }}
                        onClick={(event) => {
                          if (event.ctrlKey || event.metaKey) {
                            matrixRowSelection.toggleSelected(req.id);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isBulkSelected}
                              onChange={() => matrixRowSelection.toggleSelected(req.id)}
                              className="mt-0.5 rounded border-border text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 bg-muted/40 cursor-pointer shrink-0"
                              aria-label={`Select ${req.title}`}
                            />
                            <div className="min-w-0">
                              <span className={`block font-bold text-foreground ${textClass}`}>{req.title}</span>
                              {isHiddenRow && <span className="text-[9px] font-bold uppercase text-muted-foreground">Hidden row</span>}
                              <span className="text-[9px] text-muted-foreground font-medium uppercase mt-0.5 block">{req.category}</span>
                              {density === 'comfortable' && req.description && (
                                <span className="text-[10px] text-muted-foreground font-normal leading-relaxed block mt-1 line-clamp-2" title={req.description}>
                                  {req.description}
                                </span>
                              )}
                            </div>
                          </div>
                          <FilterFavouriteButton
                            isStarred={isStarred}
                            onToggle={() => toggleFavourite(`req:${req.id}`, req.title, 'Requirement')}
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
              <X className="w-4 h-4" />
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
                  className="w-1/2 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md cursor-pointer"
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
              <X className="w-4 h-4" />
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
                  className="w-1/2 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md cursor-pointer"
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
              <X className="w-4 h-4" />
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
                  className="w-1/2 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md cursor-pointer"
                >
                  Create Requirement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <FavouritesConfirmModal />
      <ConfirmDialog request={confirmRequest} onCancel={() => setConfirmRequest(null)} />

    </div>
  );
}
