'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp, useInterfaceDetailLevel } from '@/context/AppContext';
import { FiltersAndToolsButton, AdvancedControlsPanel } from '@/components/InterfaceDetailControls';
import {
  Asset,
  AssetCheckType,
  AssetCheckAssignment,
  AssetCheckRecord,
  AssetCheckEvidenceLink,
  EvidenceDocument,
  Action
} from '@/lib/types';
import { isDemoMode } from '@/lib/env';
import { exportCsv, exportDateStamp, ExportRow } from '@/lib/exportData';
import { calculateAssetCheckStatus, calculateNextDueDate } from '@/lib/assetEngine';
import { ConfirmDialog, ConfirmRequest, InlineToast, ToastState } from '@/components/AppFeedback';
import {
  Grid,
  Download,
  Plus,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  Link as LinkIcon,
  FileText,
  UserPlus,
  AlertCircle,
  Search,
  Settings,
  Calendar,
  Trash2,
  Edit,
  ClipboardList,
  Activity,
  FileCheck,
  Check,
  Info,
  ShieldAlert
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

export default function AssetMatrix() {
  const {
    user,
    organization,
    assets,
    assetCheckTypes,
    assetCheckAssignments,
    assetCheckRecords,
    assetCheckEvidenceLinks,
    documents,
    actions,
    auditLogs,
    createAsset,
    deleteAsset,
    createAssetCheckType,
    createAssetCheckAssignment,
    updateAssetCheckAssignment,
    createAssetCheckRecord,
    linkAssetCheckEvidence
  } = useApp();

  // Search and Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

  // Drawers and Modals
  const [activeAsset, setActiveAsset] = useState<Asset | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'checks' | 'evidence' | 'actions' | 'history' | 'notes'>('overview');
  
  const [activeCell, setActiveCell] = useState<{ asset: Asset; checkType: AssetCheckType; assignment?: AssetCheckAssignment } | null>(null);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showAddCheckTypeModal, setShowAddCheckTypeModal] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest>(null);
  const [toast, setToast] = useState<ToastState>(null);

  // Form states - New Asset
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetType, setNewAssetType] = useState('Vehicle');
  const [newAssetNumber, setNewAssetNumber] = useState('');
  const [newAssetReg, setNewAssetReg] = useState('');
  const [newAssetSerial, setNewAssetSerial] = useState('');
  const [newAssetMake, setNewAssetMake] = useState('');
  const [newAssetModel, setNewAssetModel] = useState('');
  const [newAssetLocation, setNewAssetLocation] = useState('');
  const [newAssetDept, setNewAssetDept] = useState('');
  const [newAssetOwner, setNewAssetOwner] = useState('');
  const [newAssetNotes, setNewAssetNotes] = useState('');

  // Form states - New Check Type
  const [newCheckTitle, setNewCheckTitle] = useState('');
  const [newCheckDesc, setNewCheckDesc] = useState('');
  const [newCheckCategory, setNewCheckCategory] = useState('Vehicle');
  const [newCheckFreqValue, setNewCheckFreqValue] = useState<number>(12);
  const [newCheckFreqUnit, setNewCheckFreqUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('months');
  const [newCheckWarningDays, setNewCheckWarningDays] = useState<number>(30);
  const [newCheckEvidenceReq, setNewCheckEvidenceReq] = useState(true);
  const [newCheckRiskLevel, setNewCheckRiskLevel] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');

  // Form states - New Check Record / Completion Log
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntilDate, setValidUntilDate] = useState('');
  const [checkResult, setCheckResult] = useState('Pass');
  const [checkReference, setCheckReference] = useState('');
  const [checkNotes, setCheckNotes] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [isLoggingCheck, setIsLoggingCheck] = useState(false);

  const { interfaceDetailLevel } = useInterfaceDetailLevel();

  // Favourites and Saved Views config
  const { favourites, toggleFavourite, isFavourite, clearFavourites } = useFilterFavourites(user?.id || 'guest', 'asset-matrix', organization?.id);

  const defaultViews: SavedView[] = [
    { id: 'overdue-checks', name: 'Overdue Checks', filters: { statusFilter: 'Expired' } },
    { id: 'expiring-soon-checks', name: 'Due Soon Checks', filters: { statusFilter: 'Expiring Soon' } },
    { id: 'missing-records', name: 'Missing Evidence', filters: { statusFilter: 'Missing' } }
  ];

  const { allViews, activeViewId, setActiveViewId, saveCurrentView, deleteCustomView } = useSavedViews(
    user?.id || 'guest',
    'asset-matrix',
    defaultViews,
    organization?.id
  );

  const { globalDensity, setGlobalDensity } = useGlobalDensityPreference(user?.id || 'guest', organization?.id);

  // Synchronise Density
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDensity(globalDensity);
  }, [globalDensity]);

  // Handle Saved View Selection
  const handleSelectView = (view: SavedView | null) => {
    if (view === null) {
      setSearch('');
      setSelectedCategory('All');
      setSelectedType('All');
      setStatusFilter('All');
      setActiveViewId(null);
    } else {
      const f = view.filters;
      setSearch(f.search || '');
      setSelectedCategory(f.selectedCategory || 'All');
      setSelectedType(f.selectedType || 'All');
      setStatusFilter(f.statusFilter || 'All');
      setActiveViewId(view.id);
    }
  };

  const handleSaveView = (name: string) => {
    saveCurrentView(name, { search, selectedCategory, selectedType, statusFilter });
  };

  const isViewModified = useMemo(() => {
    if (!activeViewId) return false;
    const activeView = allViews.find(v => v.id === activeViewId);
    if (!activeView) return false;
    const f = activeView.filters;
    return !(
      (f.search || '') === search &&
      (f.selectedCategory || 'All') === selectedCategory &&
      (f.selectedType || 'All') === selectedType &&
      (f.statusFilter || 'All') === statusFilter
    );
  }, [activeViewId, allViews, search, selectedCategory, selectedType, statusFilter]);

  // Unique lists for filters
  const categoriesList = ['Vehicle', 'Trailer', 'Equipment', 'Material', 'Object', 'Facility'];
  const assetTypesList = useMemo(() => {
    return Array.from(new Set(assets.map(a => a.asset_type))).filter(Boolean);
  }, [assets]);

  // Helper: Get status of a check assignment
  const getAssignmentStatus = (asg?: AssetCheckAssignment): 'Compliant' | 'Expiring Soon' | 'Expired' | 'Missing' | 'N/A' => {
    if (!asg) return 'N/A';
    const asset = assets.find(item => item.id === asg.asset_id);
    const checkType = assetCheckTypes.find(item => item.id === asg.asset_check_type_id);
    if (!asset || !checkType) return 'N/A';

    const latestRecord = assetCheckRecords
      .filter(record => record.asset_id === asset.id && record.asset_check_type_id === checkType.id)
      .sort((a, b) => b.completed_at.localeCompare(a.completed_at))[0];
    const hasEvidence = assetCheckEvidenceLinks.some(link =>
      link.asset_check_assignment_id === asg.id ||
      link.asset_check_record_id === latestRecord?.id
    );
    const status = calculateAssetCheckStatus(asg, latestRecord, asset, checkType, hasEvidence);

    if (status === 'valid') return 'Compliant';
    if (status === 'due_soon') return 'Expiring Soon';
    if (status === 'expired' || status === 'overdue') return 'Expired';
    if (status === 'missing') return 'Missing';
    return 'N/A';
  };

  useEffect(() => {
    if (typeof window === 'undefined' || assets.length === 0) return;
    const assetId = new URLSearchParams(window.location.search).get('asset');
    if (!assetId) return;
    const matchedAsset = assets.find(asset => asset.id === assetId);
    if (matchedAsset) {
      setActiveAsset(matchedAsset);
      setActiveTab('overview');
    }
  }, [assets]);

  // Filter Assets (Rows)
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      if (asset.status === 'archived') return false;

      // Category filter
      const matchesCategory = selectedCategory === 'All' || asset.category === selectedCategory;
      // Type filter
      const matchesType = selectedType === 'All' || asset.asset_type === selectedType;
      // Search term matching
      const query = search.toLowerCase();
      const matchesSearch =
        asset.name.toLowerCase().includes(query) ||
        (asset.asset_number || '').toLowerCase().includes(query) ||
        (asset.registration_number || '').toLowerCase().includes(query) ||
        (asset.serial_number || '').toLowerCase().includes(query) ||
        (asset.make || '').toLowerCase().includes(query) ||
        (asset.model || '').toLowerCase().includes(query);

      // Status Filter
      const assetAssignments = assetCheckAssignments.filter(a => a.asset_id === asset.id && a.active);
      let matchesStatus = statusFilter === 'All';
      if (statusFilter !== 'All') {
        if (statusFilter === 'N/A' && assetAssignments.length === 0) {
          matchesStatus = true;
        } else {
          matchesStatus = assetAssignments.some(asg => getAssignmentStatus(asg) === statusFilter);
        }
      }

      return matchesCategory && matchesType && matchesSearch && matchesStatus;
    });
  }, [assets, assetCheckAssignments, selectedCategory, selectedType, search, statusFilter]);

  // Pagination Configuration
  const pagination = usePagination(
    filteredAssets,
    user?.id || 'guest',
    organization?.id,
    'asset-matrix-rows',
    [search, selectedCategory, selectedType, statusFilter]
  );

  const bulkSelection = useBulkSelection(pagination.paginatedItems);

  // Auto-fill expiry date based on completed date and check frequency
  useEffect(() => {
    if (!activeCell || !completedDate) return;
    const type = activeCell.checkType;
    const value = activeCell.assignment?.frequency_value || type.default_frequency_value || 12;
    const unit = activeCell.assignment?.frequency_unit || type.default_frequency_unit || 'months';

    setValidUntilDate(calculateNextDueDate(completedDate, value, unit));
  }, [completedDate, activeCell]);

  // Save new asset registration
  const handleRegisterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName) return;

    try {
      const created = await createAsset({
        organisation_id: organization?.id || '',
        name: newAssetName,
        asset_type: newAssetType,
        category: newAssetType, // Simple mapping
        asset_number: newAssetNumber || null,
        registration_number: newAssetReg || null,
        serial_number: newAssetSerial || null,
        make: newAssetMake || null,
        model: newAssetModel || null,
        location: newAssetLocation || null,
        department: newAssetDept || null,
        owner: newAssetOwner || null,
        status: 'active',
        notes: newAssetNotes || null,
        archived_at: null
      });

      // Automatically assign check types that match this category
      const matchingCheckTypes = assetCheckTypes.filter(
        ct => ct.active && ct.category === newAssetType
      );
      await Promise.all(
        matchingCheckTypes.map(ct =>
          createAssetCheckAssignment({
            organisation_id: organization?.id || '',
            asset_id: created.id,
            asset_check_type_id: ct.id,
            required: true,
            frequency_value: ct.default_frequency_value,
            frequency_unit: ct.default_frequency_unit,
            warning_days: ct.default_warning_days,
            first_due_date: null,
            next_due_date: null,
            last_completed_date: null,
            last_expiry_date: null,
            status: 'Missing',
            notes: null,
            active: true
          })
        )
      );

      setToast({ type: 'success', message: `Registered asset "${newAssetName}" and assigned ${matchingCheckTypes.length} compliance checks.` });
      setShowAddAssetModal(false);
      resetAssetForm();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to register new asset.' });
    }
  };

  const resetAssetForm = () => {
    setNewAssetName('');
    setNewAssetNumber('');
    setNewAssetReg('');
    setNewAssetSerial('');
    setNewAssetMake('');
    setNewAssetModel('');
    setNewAssetLocation('');
    setNewAssetDept('');
    setNewAssetOwner('');
    setNewAssetNotes('');
  };

  // Add Custom Check Type
  const handleAddCheckType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckTitle) return;

    try {
      const ct = await createAssetCheckType({
        organisation_id: organization?.id || '',
        title: newCheckTitle,
        category: newCheckCategory,
        description: newCheckDesc || null,
        default_frequency_value: newCheckFreqValue || 12,
        default_frequency_unit: newCheckFreqUnit,
        default_warning_days: newCheckWarningDays || 30,
        evidence_required: newCheckEvidenceReq,
        risk_level: newCheckRiskLevel,
        default_status: 'Missing',
        active: true
      });

      // Automatically assign to existing assets of that category
      const matchingAssets = assets.filter(
        asset =>
          asset.status === 'active' &&
          (asset.asset_type === newCheckCategory || asset.category === newCheckCategory)
      );
      await Promise.all(
        matchingAssets.map(a =>
          createAssetCheckAssignment({
            organisation_id: organization?.id || '',
            asset_id: a.id,
            asset_check_type_id: ct.id,
            required: true,
            frequency_value: ct.default_frequency_value,
            frequency_unit: ct.default_frequency_unit,
            warning_days: ct.default_warning_days,
            first_due_date: null,
            next_due_date: null,
            last_completed_date: null,
            last_expiry_date: null,
            status: 'Missing',
            notes: null,
            active: true
          })
        )
      );

      setToast({ type: 'success', message: `Created check type "${newCheckTitle}" and assigned it to ${matchingAssets.length} matching assets.` });
      setShowAddCheckTypeModal(false);
      setNewCheckTitle('');
      setNewCheckDesc('');
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to create compliance check type.' });
    }
  };

  // Log completion of check
  const handleLogCheckCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCell) return;
    setIsLoggingCheck(true);

    try {
      const { asset, checkType, assignment } = activeCell;

      // 1. Create check record
      const record = await createAssetCheckRecord({
        organisation_id: organization?.id || '',
        asset_id: asset.id,
        asset_check_type_id: checkType.id,
        asset_check_assignment_id: assignment?.id || null,
        completed_at: completedDate,
        valid_from: completedDate,
        valid_until: validUntilDate || null,
        result_status: checkResult,
        performed_by: user?.full_name || 'System Operator',
        reference: checkReference || null,
        notes: checkNotes || null
      });

      // 2. Link evidence document if selected
      if (selectedDocId) {
        await linkAssetCheckEvidence(
          assignment?.id || '',
          record.id,
          selectedDocId,
          asset.id
        );
      }

      // 3. Update assignment state with last date & calculate next due date
      if (assignment) {
        const nextDue = validUntilDate || null;
        await updateAssetCheckAssignment(assignment.id, {
          last_completed_date: completedDate,
          last_expiry_date: validUntilDate || null,
          next_due_date: nextDue,
          status: checkResult === 'Pass' ? 'Compliant' : 'Failed'
        });
      }

      setToast({ type: 'success', message: `Recorded check completion for ${asset.name}.` });
      setActiveCell(null);
      resetLogForm();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to save check completion log.' });
    } finally {
      setIsLoggingCheck(false);
    }
  };

  const resetLogForm = () => {
    setCompletedDate(new Date().toISOString().split('T')[0]);
    setValidUntilDate('');
    setCheckResult('Pass');
    setCheckReference('');
    setCheckNotes('');
    setSelectedDocId('');
  };

  // Archive Asset
  const handleDeleteAsset = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    setConfirmRequest({
      title: 'Archive asset?',
      description: `Archive "${asset.name}"? The asset will leave the active matrix while its check and evidence history remains available in the database.`,
      confirmLabel: 'Archive Asset',
      tone: 'warning',
      onConfirm: async () => {
        try {
          await deleteAsset(assetId);
          setToast({ type: 'success', message: `Archived asset "${asset.name}".` });
          setActiveAsset(null);
        } catch (e) {
          setToast({ type: 'error', message: 'Failed to archive asset.' });
        }
      }
    });
  };

  // CSV Export
  const handleExportMatrix = () => {
    const exportRows: ExportRow[] = [];
    filteredAssets.forEach(asset => {
      assetCheckTypes.forEach(ct => {
        const asg = assetCheckAssignments.find(a => a.asset_id === asset.id && a.asset_check_type_id === ct.id);
        const status = getAssignmentStatus(asg);
        if (status !== 'N/A') {
          exportRows.push({
            asset_name: asset.name,
            asset_number: asset.asset_number || '',
            registration: asset.registration_number || '',
            serial_number: asset.serial_number || '',
            asset_type: asset.asset_type,
            check_name: ct.title,
            status: status,
            next_due_date: asg?.next_due_date || '',
            last_completed: asg?.last_completed_date || ''
          });
        }
      });
    });

    try {
      exportCsv(`vygilence-asset-matrix-export-${exportDateStamp()}.csv`, exportRows);
      setToast({ type: 'success', message: 'Asset assurance report exported successfully.' });
    } catch (e) {
      setToast({ type: 'error', message: 'Failed to export CSV.' });
    }
  };

  // Calculations for KPI Cards
  const statsSummary = useMemo(() => {
    let totalAssigned = 0;
    let compliant = 0;
    let dueSoon = 0;
    let overdue = 0;
    let missing = 0;

    assetCheckAssignments.forEach(asg => {
      if (!asg.active || !asg.required) return;
      totalAssigned++;
      const status = getAssignmentStatus(asg);
      if (status === 'Compliant') compliant++;
      else if (status === 'Expiring Soon') dueSoon++;
      else if (status === 'Expired') overdue++;
      else if (status === 'Missing') missing++;
    });

    const totalCalculated = compliant + dueSoon + overdue + missing;
    const compliancePercent = totalCalculated > 0 ? Math.round((compliant / totalCalculated) * 100) : 100;

    return {
      totalAssets: assets.filter(a => a.status === 'active').length,
      totalAssigned,
      compliant,
      dueSoon,
      overdue,
      missing,
      compliancePercent
    };
  }, [assets, assetCheckAssignments]);

  const paddingClass = density === 'comfortable' ? 'p-4' : 'p-2.5';
  const textClass = density === 'comfortable' ? 'text-xs' : 'text-[11px]';
  const activeFiltersCount = [
    selectedCategory !== 'All',
    selectedType !== 'All',
    statusFilter !== 'All'
  ].filter(Boolean).length;
  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('All');
    setSelectedType('All');
    setStatusFilter('All');
  };
  const filterFields = (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Asset Category</label>
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs font-semibold text-foreground outline-none cursor-pointer"
        >
          <option value="All">All Categories</option>
          {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Asset Specific Type</label>
        <select
          value={selectedType}
          onChange={e => setSelectedType(e.target.value)}
          className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs font-semibold text-foreground outline-none cursor-pointer"
        >
          <option value="All">All Types</option>
          {assetTypesList.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Checks Standing</label>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs font-semibold text-foreground outline-none cursor-pointer"
        >
          <option value="All">All Standing Statuses</option>
          <option value="Compliant">Compliant (GREEN)</option>
          <option value="Expiring Soon">Due Soon (AMBER)</option>
          <option value="Expired">Overdue / Expired (RED)</option>
          <option value="Missing">Missing Verification (GREY)</option>
          <option value="N/A">Not Assigned (N/A)</option>
        </select>
      </div>

      <div className="flex items-end">
        <button
          type="button"
          onClick={resetFilters}
          className="w-full py-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg text-xs font-bold transition-all cursor-pointer text-center"
        >
          Reset Filter Fields
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <InlineToast toast={toast} onDismiss={() => setToast(null)} />
      <ConfirmDialog request={confirmRequest} onCancel={() => setConfirmRequest(null)} />

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2" id="matrix-heading">
            <Activity className="w-8 h-8 text-indigo-500 animate-pulse" />
            Asset Matrix
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time compliance ledger and asset maintenance system mapping operations checklist.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowAddCheckTypeModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            id="matrix-add-requirement-btn"
          >
            <Settings className="w-4 h-4" /> Customise Checks
          </button>

          <button
            onClick={() => setShowAddAssetModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
            id="matrix-add-target-btn"
          >
            <UserPlus className="w-4 h-4" /> Register Asset
          </button>
        </div>
      </div>

      {/* Stats Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block">Assurance Index</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-black ${statsSummary.compliancePercent >= 90 ? 'text-emerald-500' : statsSummary.compliancePercent >= 75 ? 'text-amber-500' : 'text-rose-500'}`}>
              {statsSummary.compliancePercent}%
            </span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block">Total Assets</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-foreground">{statsSummary.totalAssets}</span>
            <span className="text-xs text-muted-foreground font-semibold">active</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-emerald-500 dark:text-emerald-400 uppercase font-bold tracking-widest block">Compliant</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{statsSummary.compliant}</span>
            <span className="text-xs text-muted-foreground font-semibold">checks</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-amber-500 dark:text-amber-400 uppercase font-bold tracking-widest block">Due Soon</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{statsSummary.dueSoon}</span>
            <span className="text-xs text-muted-foreground font-semibold">checks</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-rose-500 dark:text-rose-400 uppercase font-bold tracking-widest block">Overdue</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{statsSummary.overdue}</span>
            <span className="text-xs text-muted-foreground font-semibold">overdue</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest block">Missing Docs</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-zinc-500">{statsSummary.missing}</span>
            <span className="text-xs text-muted-foreground font-semibold">no history</span>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="bg-card border border-border p-3.5 rounded-xl space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4.5 h-4.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search assets by name, identifier, make/model, reg, serial..."
              className="w-full pl-9 pr-3 py-2.5 bg-muted border border-border rounded-lg text-xs outline-none text-foreground placeholder-muted-foreground focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {interfaceDetailLevel === 'focused' ? (
              <FiltersAndToolsButton
                isOpen={showFilters}
                onClick={() => setShowFilters(!showFilters)}
                activeFiltersCount={activeFiltersCount}
                onClearFilters={resetFilters}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3.5 py-2 border rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  showFilters || activeFiltersCount > 0
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-750 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-400'
                    : 'bg-muted hover:bg-muted/80 border-border text-foreground'
                }`}
              >
                Filters
                {activeFiltersCount > 0 && (
                  <span className="bg-indigo-650 text-white dark:bg-indigo-600 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold">!</span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleExportMatrix}
              className="px-3.5 py-2 bg-card hover:bg-muted border border-border rounded-lg font-bold text-foreground text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export Matrix
            </button>

            <DensityControls
              density={density}
              onDensityChange={setDensity}
              globalDensity={globalDensity}
              onGlobalDensityChange={setGlobalDensity}
            />
          </div>
        </div>

        {/* Collapsible Filter settings */}
        {interfaceDetailLevel === 'focused' ? (
          <AdvancedControlsPanel isOpen={showFilters} onClose={() => setShowFilters(false)}>
            {filterFields}
          </AdvancedControlsPanel>
        ) : (
          showFilters && (
            <div className="border-t border-border/60 pt-3.5 mt-2.5">
              {filterFields}
            </div>
          )
        )}

        {/* Counter readout */}
        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-1">
          <span>Active Asset Rows: {filteredAssets.length} / {assets.length}</span>
          <span>Compliance Column Types: {assetCheckTypes.length}</span>
        </div>
      </div>

      {/* Pagination Controls */}
      <PaginationControls
        pageSize={pagination.pageSize}
        onPageSizeChange={pagination.setPageSize}
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        startItem={pagination.startItem}
        endItem={pagination.endItem}
        onPageChange={pagination.setCurrentPage}
        itemLabel="assets"
      />

      {/* Grid Container */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[64vh] relative">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider sticky top-0 z-20">
                <th
                  className="p-4 min-w-[280px] sticky left-0 top-0 z-30 border-r-2 border-b border-border/80 font-extrabold text-[10px]"
                  style={{ backgroundColor: 'hsl(var(--muted))', left: 0, top: 0 }}
                >
                  Asset & Registration details
                </th>
                {assetCheckTypes.map(ct => (
                  <th
                    key={ct.id}
                    className="p-4 text-center min-w-[150px] whitespace-nowrap sticky top-0 border-b border-border"
                    style={{ backgroundColor: 'hsl(var(--muted))', top: 0 }}
                    title={ct.description || ''}
                  >
                    <span className="block font-extrabold text-foreground">{ct.title}</span>
                    <span className="text-[9px] text-muted-foreground font-bold uppercase mt-0.5">{ct.category}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={assetCheckTypes.length + 1} className="p-8 text-center text-muted-foreground">
                    No assets matching the current search parameters were found.
                  </td>
                </tr>
              ) : (
                pagination.paginatedItems.map(asset => {
                  return (
                    <tr key={asset.id} className="hover:bg-muted/10 transition-colors">
                      {/* Sticky Asset metadata */}
                      <td
                        className={`${paddingClass} font-semibold text-foreground sticky left-0 z-10 border-r-2 border-border/80 min-w-[280px] hover:bg-muted/20 cursor-pointer`}
                        style={{ backgroundColor: 'hsl(var(--card))', left: 0 }}
                        onClick={() => {
                          setActiveAsset(asset);
                          setActiveTab('overview');
                        }}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="min-w-0">
                            <span className="block font-bold text-foreground hover:text-indigo-650 transition-colors">
                              {asset.name}
                            </span>
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 items-center mt-1 text-[9px] font-bold text-muted-foreground uppercase">
                              <span className="px-1.5 py-0.5 bg-muted rounded">{asset.asset_type}</span>
                              {asset.registration_number && (
                                <span className="text-foreground border border-border px-1 rounded bg-muted/40 font-mono">
                                  {asset.registration_number}
                                </span>
                              )}
                              {asset.serial_number && (
                                <span className="font-mono">SN: {asset.serial_number}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Matrix cells */}
                      {assetCheckTypes.map(ct => {
                        const asg = assetCheckAssignments.find(
                          a => a.asset_id === asset.id && a.asset_check_type_id === ct.id
                        );
                        const status = getAssignmentStatus(asg);

                        return (
                          <td key={`${asset.id}-${ct.id}`} className={paddingClass}>
                            {status === 'N/A' ? (
                              <div className="text-center text-muted-foreground/35 select-none font-bold text-[10px]">
                                —
                              </div>
                            ) : (
                              <button
                                onClick={() => setActiveCell({ asset, checkType: ct, assignment: asg })}
                                className={`w-full py-2 px-2.5 rounded-lg border font-bold text-[10px] uppercase tracking-wide transition-all cursor-pointer hover:shadow-sm text-center ${
                                  status === 'Compliant'
                                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                    : status === 'Expiring Soon'
                                    ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                                    : status === 'Expired'
                                    ? 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                                    : 'bg-zinc-500/10 border-zinc-500/25 text-zinc-500 hover:bg-zinc-500/20'
                                }`}
                              >
                                <span className="flex items-center justify-center gap-1">
                                  {status === 'Compliant' && <CheckCircle2 className="w-3 h-3" />}
                                  {status === 'Expiring Soon' && <AlertTriangle className="w-3 h-3" />}
                                  {status === 'Expired' && <Clock className="w-3 h-3" />}
                                  {status === 'Missing' && <AlertCircle className="w-3 h-3" />}
                                  {status}
                                </span>
                              </button>
                            )}
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
        <span className="font-bold text-foreground">Assurance Indicators:</span>
        <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Compliant (Valid, up-to-date check log)</div>
        <div className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-500" /> Due Soon (Warning limit triggered)</div>
        <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-rose-500" /> Overdue (Check type expired)</div>
        <div className="flex items-center gap-1.5"><AlertCircle className="w-4 h-4 text-zinc-500" /> Missing (Assigned but never verified)</div>
      </div>

      {/* Asset Workspace Drawer (Right Slideout) */}
      {activeAsset && (
        <div className="fixed inset-0 z-40 bg-black/60 flex justify-end">
          <div className="w-full max-w-2xl bg-card border-l border-border h-full flex flex-col shadow-2xl relative animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
            <div className="p-6 border-b border-border flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-500/5 px-2 py-0.5 rounded">
                  {activeAsset.asset_type}
                </span>
                <h3 className="text-xl font-extrabold text-foreground mt-2">{activeAsset.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ID: {activeAsset.asset_number || 'N/A'} • Reg: {activeAsset.registration_number || 'None'}
                </p>
              </div>
              <button
                onClick={() => setActiveAsset(null)}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabbed Nav */}
            <div className="flex border-b border-border bg-muted/40 text-xs px-2">
              {[
                { id: 'overview', label: 'Overview', icon: Info },
                { id: 'checks', label: 'Check Assignments', icon: ClipboardList },
                { id: 'evidence', label: 'Evidence Vault', icon: FileCheck },
                { id: 'actions', label: 'Actions/Tasks', icon: ShieldAlert },
                { id: 'history', label: 'History Logs', icon: Activity }
              ].map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`flex items-center gap-1.5 px-4 py-3 border-b-2 font-bold transition-all cursor-pointer ${
                      activeTab === t.id
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Grid fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/30 border border-border/50 rounded-xl p-3">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block">Manufacturer</span>
                      <span className="text-sm font-extrabold mt-0.5 block">{activeAsset.make || 'Unspecified'}</span>
                    </div>
                    <div className="bg-muted/30 border border-border/50 rounded-xl p-3">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block">Model</span>
                      <span className="text-sm font-extrabold mt-0.5 block">{activeAsset.model || 'Unspecified'}</span>
                    </div>
                    <div className="bg-muted/30 border border-border/50 rounded-xl p-3">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block">Location</span>
                      <span className="text-sm font-extrabold mt-0.5 block">{activeAsset.location || 'Unspecified'}</span>
                    </div>
                    <div className="bg-muted/30 border border-border/50 rounded-xl p-3">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block">Owner / Driver</span>
                      <span className="text-sm font-extrabold mt-0.5 block">{activeAsset.owner || 'Unassigned'}</span>
                    </div>
                  </div>

                  {/* Notes Card */}
                  <div className="bg-muted/30 border border-border/50 rounded-xl p-4 space-y-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block">Asset Notes</span>
                    <p className="text-xs leading-relaxed text-foreground/80 whitespace-pre-line">
                      {activeAsset.notes || 'No notes logged for this asset.'}
                    </p>
                  </div>

                  {/* Danger Zone */}
                  <div className="border border-rose-500/20 bg-rose-500/5 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-extrabold text-rose-600 dark:text-rose-400">Archive Asset</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Remove this asset from the active matrix while retaining its history.</p>
                    </div>
                    <button
                      onClick={() => handleDeleteAsset(activeAsset.id)}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Archive Asset
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'checks' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Compliance Checklist</h4>
                  <div className="space-y-3">
                    {assetCheckTypes
                      .filter(ct => {
                        const asg = assetCheckAssignments.find(a => a.asset_id === activeAsset.id && a.asset_check_type_id === ct.id);
                        return asg && asg.active;
                      })
                      .map(ct => {
                        const asg = assetCheckAssignments.find(a => a.asset_id === activeAsset.id && a.asset_check_type_id === ct.id);
                        const status = getAssignmentStatus(asg);

                        return (
                          <div key={ct.id} className="border border-border p-4 rounded-xl flex justify-between items-center bg-card shadow-xs hover:border-border-hover transition-all">
                            <div>
                              <h5 className="font-extrabold text-xs text-foreground">{ct.title}</h5>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Frequency: Every {asg?.frequency_value || ct.default_frequency_value} {asg?.frequency_unit || ct.default_frequency_unit}
                              </p>
                              {asg?.next_due_date && (
                                <p className="text-[10px] font-bold text-foreground mt-1 flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                  Next Due: {new Date(asg.next_due_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                setActiveCell({ asset: activeAsset, checkType: ct, assignment: asg });
                              }}
                              className={`px-3 py-1.5 rounded-lg border font-bold text-[10px] uppercase tracking-wide transition-all ${
                                status === 'Compliant'
                                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                  : status === 'Expiring Soon'
                                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                                  : status === 'Expired'
                                  ? 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                                  : 'bg-zinc-500/10 border-zinc-500/25 text-zinc-500 hover:bg-zinc-500/20'
                              }`}
                            >
                              {status}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {activeTab === 'evidence' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Compliance Documents</h4>
                  <div className="space-y-3">
                    {assetCheckEvidenceLinks
                      .filter(link => link.asset_id === activeAsset.id)
                      .map(link => {
                        const doc = documents.find(d => d.id === link.document_id);
                        if (!doc) return null;
                        return (
                          <div key={link.id} className="border border-border p-3 rounded-xl flex items-center justify-between bg-card">
                            <div className="flex items-center gap-3">
                              <FileText className="w-8 h-8 text-indigo-500 shrink-0" />
                              <div>
                                <span className="font-extrabold text-xs text-foreground block">{doc.title}</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-semibold mt-0.5 block">
                                  Expiry: {doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : 'N/A'}
                                </span>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              doc.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                            }`}>
                              {doc.status}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {activeTab === 'actions' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Corrective Actions</h4>
                  <div className="space-y-3">
                    {actions
                      .filter(action => {
                        // Find matching action links or if action title mentions asset name
                        return action.title.toLowerCase().includes(activeAsset.name.toLowerCase());
                      })
                      .map(action => (
                        <div key={action.id} className="border border-border p-4 rounded-xl bg-card space-y-2">
                          <div className="flex justify-between items-start">
                            <h5 className="font-extrabold text-xs text-foreground">{action.title}</h5>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              action.status === 'Complete' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                            }`}>
                              {action.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            {action.description || 'No description provided.'}
                          </p>
                          {action.due_date && (
                            <span className="text-[9px] font-bold text-rose-500 block">
                              Due Date: {new Date(action.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Activity Log</h4>
                  <div className="space-y-4 relative pl-4 border-l border-border/80">
                    {auditLogs
                      .filter(log => log.details.toLowerCase().includes(activeAsset.name.toLowerCase()))
                      .map(log => (
                        <div key={log.id} className="space-y-1 relative">
                          <div className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border border-card" />
                          <div className="flex justify-between items-baseline text-[10px] font-bold text-muted-foreground uppercase">
                            <span>{log.action}</span>
                            <span>{new Date(log.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-foreground/80 leading-normal">{log.details}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Log Compliance Check / Upload Evidence */}
      {activeCell && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card solid-panel border border-border w-full max-w-lg rounded-2xl p-6 relative shadow-2xl">
            <button
              onClick={() => setActiveCell(null)}
              className="absolute top-4 right-4 p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 border-b border-border pb-3 mb-4">
              <FileCheck className="w-5 h-5 text-indigo-500 shrink-0" />
              <div>
                <h3 className="text-base font-extrabold text-foreground">Record Compliance Log</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Log completion records and bind vault evidence files.</p>
              </div>
            </div>

            <form onSubmit={handleLogCheckCompletion} className="space-y-4 text-xs">
              <div className="p-3 bg-muted/40 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Asset Target:</span>
                  <span className="text-foreground font-extrabold">{activeCell.asset.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Check Type:</span>
                  <span className="text-foreground font-extrabold">{activeCell.checkType.title}</span>
                </div>
                {activeCell.assignment?.next_due_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-bold">Current Next Due:</span>
                    <span className="text-foreground font-extrabold text-rose-500">
                      {new Date(activeCell.assignment.next_due_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="completed-date" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Completion Date
                  </label>
                  <input
                    id="completed-date"
                    type="date"
                    required
                    value={completedDate}
                    onChange={e => setCompletedDate(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="expiry-date" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Expiry / Validity Expiration
                  </label>
                  <input
                    id="expiry-date"
                    type="date"
                    required
                    value={validUntilDate}
                    onChange={e => setValidUntilDate(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="check-result" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Result Status
                  </label>
                  <select
                    id="check-result"
                    value={checkResult}
                    onChange={e => setCheckResult(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none cursor-pointer"
                  >
                    <option value="Pass">Pass (Compliant)</option>
                    <option value="Fail">Fail (Failed Check)</option>
                    <option value="Advisory">Pass with Advisory</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="check-reference" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Certificate / Reference ID
                  </label>
                  <input
                    id="check-reference"
                    type="text"
                    value={checkReference}
                    onChange={e => setCheckReference(e.target.value)}
                    placeholder="e.g. CVRT-901-44"
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="link-evidence" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Bind Supporting Vault Document
                </label>
                <select
                  id="link-evidence"
                  value={selectedDocId}
                  onChange={e => setSelectedDocId(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none cursor-pointer"
                >
                  <option value="">-- No File Linked (Mark as Missing) --</option>
                  {documents
                    .filter(doc => doc.category === activeCell.checkType.category)
                    .map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {doc.title} ({doc.status} • Exp: {doc.expiry_date || 'None'})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="check-notes" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Compliance Check Notes
                </label>
                <textarea
                  id="check-notes"
                  value={checkNotes}
                  onChange={e => setCheckNotes(e.target.value)}
                  placeholder="Record calibration issues, inspector name or maintenance advice..."
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none h-16 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveCell(null)}
                  className="w-1/2 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoggingCheck}
                  className="w-1/2 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isLoggingCheck ? 'Saving record...' : 'Submit Compliance Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Register New Asset */}
      {showAddAssetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card solid-panel border border-border w-full max-w-md rounded-2xl p-6 relative shadow-2xl">
            <button
              onClick={() => setShowAddAssetModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <UserPlus className="w-5 h-5 text-indigo-500" />
              <div>
                <h3 className="text-base font-extrabold text-foreground">Register Target Asset</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Register a vehicle, trailer, equipment or facility.</p>
              </div>
            </div>

            <form onSubmit={handleRegisterAsset} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="asset-name" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Asset Identifier / Name
                  </label>
                  <input
                    id="asset-name"
                    type="text"
                    required
                    value={newAssetName}
                    onChange={e => setNewAssetName(e.target.value)}
                    placeholder="e.g. Scania HGV Truck #204"
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="asset-class" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Asset Category Type
                  </label>
                  <select
                    id="asset-class"
                    value={newAssetType}
                    onChange={e => setNewAssetType(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none cursor-pointer"
                  >
                    <option value="Vehicle">Vehicle</option>
                    <option value="Trailer">Trailer</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Material">Material</option>
                    <option value="Object">Object</option>
                    <option value="Facility">Facility</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="asset-number" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Asset Number
                  </label>
                  <input
                    id="asset-number"
                    type="text"
                    value={newAssetNumber}
                    onChange={e => setNewAssetNumber(e.target.value)}
                    placeholder="e.g. FL-04"
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="asset-reg" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Registration
                  </label>
                  <input
                    id="asset-reg"
                    type="text"
                    value={newAssetReg}
                    onChange={e => setNewAssetReg(e.target.value)}
                    placeholder="e.g. 211-D-400"
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="asset-serial" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Serial Number
                  </label>
                  <input
                    id="asset-serial"
                    type="text"
                    value={newAssetSerial}
                    onChange={e => setNewAssetSerial(e.target.value)}
                    placeholder="e.g. SN-802-99"
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="asset-make" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Manufacturer / Make
                  </label>
                  <input
                    id="asset-make"
                    type="text"
                    value={newAssetMake}
                    onChange={e => setNewAssetMake(e.target.value)}
                    placeholder="e.g. Scania"
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="asset-model" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Model
                  </label>
                  <input
                    id="asset-model"
                    type="text"
                    value={newAssetModel}
                    onChange={e => setNewAssetModel(e.target.value)}
                    placeholder="e.g. R500 V8"
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label htmlFor="asset-loc" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Current Location / Depot
                  </label>
                  <input
                    id="asset-loc"
                    type="text"
                    value={newAssetLocation}
                    onChange={e => setNewAssetLocation(e.target.value)}
                    placeholder="e.g. Dublin Depot South"
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="asset-owner" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Owner
                  </label>
                  <input
                    id="asset-owner"
                    type="text"
                    value={newAssetOwner}
                    onChange={e => setNewAssetOwner(e.target.value)}
                    placeholder="e.g. John V."
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="asset-notes" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  General Notes
                </label>
                <textarea
                  id="asset-notes"
                  value={newAssetNotes}
                  onChange={e => setNewAssetNotes(e.target.value)}
                  placeholder="Record initial description, maintenance contracts or details..."
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none h-16 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAssetModal(false)}
                  className="w-1/2 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md cursor-pointer"
                >
                  Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manage Check Types */}
      {showAddCheckTypeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card solid-panel border border-border w-full max-w-md rounded-2xl p-6 relative shadow-2xl">
            <button
              onClick={() => setShowAddCheckTypeModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <Settings className="w-5 h-5 text-indigo-500" />
              <div>
                <h3 className="text-base font-extrabold text-foreground">Configure Compliance Check</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Add a new standard compliance check definition.</p>
              </div>
            </div>

            <form onSubmit={handleAddCheckType} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="check-title" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Check Type Title
                  </label>
                  <input
                    id="check-title"
                    type="text"
                    required
                    value={newCheckTitle}
                    onChange={e => setNewCheckTitle(e.target.value)}
                    placeholder="e.g. Calibration, DOE/CVRT"
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="check-cat" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Applicable Asset Category
                  </label>
                  <select
                    id="check-cat"
                    value={newCheckCategory}
                    onChange={e => setNewCheckCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none cursor-pointer"
                  >
                    <option value="Vehicle">Vehicle</option>
                    <option value="Trailer">Trailer</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Material">Material</option>
                    <option value="Object">Object</option>
                    <option value="Facility">Facility</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="check-desc" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Description / Purpose
                </label>
                <input
                  id="check-desc"
                  type="text"
                  value={newCheckDesc}
                  onChange={e => setNewCheckDesc(e.target.value)}
                  placeholder="e.g. Annual roadworthiness test or weekly scales check"
                  className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="check-freq-val" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Frequency Value
                  </label>
                  <input
                    id="check-freq-val"
                    type="number"
                    required
                    min={1}
                    value={newCheckFreqValue}
                    onChange={e => setNewCheckFreqValue(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="check-freq-unit" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Frequency Unit
                  </label>
                  <select
                    id="check-freq-unit"
                    value={newCheckFreqUnit}
                    onChange={e => setNewCheckFreqUnit(e.target.value as any)}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none cursor-pointer"
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="check-warn-days" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Warning Window (Days)
                  </label>
                  <input
                    id="check-warn-days"
                    type="number"
                    required
                    min={1}
                    value={newCheckWarningDays}
                    onChange={e => setNewCheckWarningDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="check-risk" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Risk / Criticality Level
                  </label>
                  <select
                    id="check-risk"
                    value={newCheckRiskLevel}
                    onChange={e => setNewCheckRiskLevel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none cursor-pointer"
                  >
                    <option value="Low">Low Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="High">High Risk</option>
                    <option value="Critical">Critical Risk</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    id="check-evidence-req"
                    type="checkbox"
                    checked={newCheckEvidenceReq}
                    onChange={e => setNewCheckEvidenceReq(e.target.checked)}
                    className="accent-indigo-650 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="check-evidence-req" className="font-bold text-[10px] text-foreground cursor-pointer uppercase">
                    Require Evidence File
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCheckTypeModal(false)}
                  className="w-1/2 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md cursor-pointer"
                >
                  Create Check Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
