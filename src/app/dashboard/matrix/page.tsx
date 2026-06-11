'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp, useInterfaceDetailLevel } from '@/context/AppContext';
import { FiltersAndToolsButton, AdvancedControlsPanel } from '@/components/InterfaceDetailControls';
import {
  Asset,
  AssetCheckType,
  AssetCheckAssignment
} from '@/lib/types';
import { exportCsv, exportDateStamp, ExportRow } from '@/lib/exportData';
import { calculateAssetCheckStatus, calculateNextDueDate } from '@/lib/assetEngine';
import { ConfirmDialog, ConfirmRequest, InlineToast, ToastState } from '@/components/AppFeedback';
import {
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  FileText,
  UserPlus,
  AlertCircle,
  Search,
  Settings,
  Trash2,
  ClipboardList,
  Activity,
  FileCheck,
  Info,
  ShieldAlert
} from 'lucide-react';
import {
  useSavedViews,
  ActiveFilterChips,
  SavedViewsBar,
  SavedView,
  PaginationControls,
  DensityControls,
  useGlobalDensityPreference,
  usePagination
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
    assetRequirementLinks,
    assetHistoryEvents,
    documents,
    actions,
    frameworkRequirements,
    createAsset,
    updateAsset,
    deleteAsset,
    createAssetCheckType,
    createAssetCheckAssignment,
    updateAssetCheckAssignment,
    createAssetCheckRecord,
    linkAssetCheckEvidence,
    unlinkAssetCheckEvidence,
    uploadAssetEvidence,
    createAssetHistoryEvent
  } = useApp();

  // Search and Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

  // Display and Sorting Preferences
  const [columnMode, setColumnMode] = useState<'detailed' | 'compact' | 'status'>('detailed');
  const [columnGrouping, setColumnGrouping] = useState<'none' | 'category' | 'risk'>('none');

  // Drawers and Modals
  const [activeAsset, setActiveAsset] = useState<Asset | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'checks' | 'evidence' | 'requirements' | 'actions' | 'history'>('overview');
  
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

  // Form states - Asset Edit
  const [isEditingAsset, setIsEditingAsset] = useState(false);
  const [editedAssetName, setEditedAssetName] = useState('');
  const [editedAssetType, setEditedAssetType] = useState('Vehicle');
  const [editedAssetNumber, setEditedAssetNumber] = useState('');
  const [editedAssetReg, setEditedAssetReg] = useState('');
  const [editedAssetSerial, setEditedAssetSerial] = useState('');
  const [editedAssetMake, setEditedAssetMake] = useState('');
  const [editedAssetModel, setEditedAssetModel] = useState('');
  const [editedAssetLocation, setEditedAssetLocation] = useState('');
  const [editedAssetDept, setEditedAssetDept] = useState('');
  const [editedAssetOwner, setEditedAssetOwner] = useState('');
  const [editedAssetNotes, setEditedAssetNotes] = useState('');

  // Form states - Maintenance / Ad-hoc History logs
  const [showAddHistoryInWorkspace, setShowAddHistoryInWorkspace] = useState(false);
  const [historyEventTitle, setHistoryEventTitle] = useState('');
  const [historyEventDate, setHistoryEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyEventType, setHistoryEventType] = useState<'service' | 'repair' | 'defect' | 'inspection' | 'calibration' | 'part_replacement' | 'incident' | 'maintenance' | 'general'>('maintenance');
  const [historyEventSupplier, setHistoryEventSupplier] = useState('');
  const [historyEventCost, setHistoryEventCost] = useState('');
  const [historyEventOdo, setHistoryEventOdo] = useState('');
  const [historyEventComments, setHistoryEventComments] = useState('');
  const [isLoggingHistoryEvent, setIsLoggingHistoryEvent] = useState(false);

  // Workspace Evidence linking states
  const [selectedDocIdForWorkspace, setSelectedDocIdForWorkspace] = useState('');

  const { interfaceDetailLevel } = useInterfaceDetailLevel();

  // Load / Save Column Preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedMode = localStorage.getItem('vygilence_matrix_column_mode');
    if (savedMode === 'detailed' || savedMode === 'compact' || savedMode === 'status') {
      setColumnMode(savedMode);
    }
    const savedGrouping = localStorage.getItem('vygilence_matrix_column_grouping');
    if (savedGrouping === 'none' || savedGrouping === 'category' || savedGrouping === 'risk') {
      setColumnGrouping(savedGrouping as any);
    }
  }, []);

  const handleColumnModeChange = (mode: 'detailed' | 'compact' | 'status') => {
    setColumnMode(mode);
    localStorage.setItem('vygilence_matrix_column_mode', mode);
  };

  const handleColumnGroupingChange = (grouping: 'none' | 'category' | 'risk') => {
    setColumnGrouping(grouping);
    localStorage.setItem('vygilence_matrix_column_grouping', grouping);
  };

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

  // Sync edit form fields when asset opens
  useEffect(() => {
    if (activeAsset) {
      setEditedAssetName(activeAsset.name || '');
      setEditedAssetType(activeAsset.asset_type || 'Vehicle');
      setEditedAssetNumber(activeAsset.asset_number || '');
      setEditedAssetReg(activeAsset.registration_number || '');
      setEditedAssetSerial(activeAsset.serial_number || '');
      setEditedAssetMake(activeAsset.make || '');
      setEditedAssetModel(activeAsset.model || '');
      setEditedAssetLocation(activeAsset.location || '');
      setEditedAssetDept(activeAsset.department || '');
      setEditedAssetOwner(activeAsset.owner || '');
      setEditedAssetNotes(activeAsset.notes || '');
      setIsEditingAsset(false);

      // Default workspace right column state
      setActiveCell(null);
      setShowAddHistoryInWorkspace(false);
    }
  }, [activeAsset]);

  // Reset ad-hoc history log states when triggered
  useEffect(() => {
    setHistoryEventTitle('');
    setHistoryEventDate(new Date().toISOString().split('T')[0]);
    setHistoryEventType('maintenance');
    setHistoryEventSupplier('');
    setHistoryEventCost('');
    setHistoryEventOdo('');
    setHistoryEventComments('');
  }, [showAddHistoryInWorkspace]);

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

  // URL Deep Link check
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

  // Sort/Group Columns (Check Types)
  const sortedCheckTypes = useMemo(() => {
    const list = [...assetCheckTypes];
    if (columnGrouping === 'category') {
      return list.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    }
    if (columnGrouping === 'risk') {
      const riskOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
      return list.sort((a, b) => {
        const rA = riskOrder[a.risk_level as keyof typeof riskOrder] || 0;
        const rB = riskOrder[b.risk_level as keyof typeof riskOrder] || 0;
        return rB - rA; // High risk first
      });
    }
    return list;
  }, [assetCheckTypes, columnGrouping]);

  // Pagination Configuration
  const pagination = usePagination(
    filteredAssets,
    user?.id || 'guest',
    organization?.id,
    'asset-matrix-rows',
    [search, selectedCategory, selectedType, statusFilter]
  );

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
    } catch {
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
    } catch {
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
    } catch {
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
        } catch {
          setToast({ type: 'error', message: 'Failed to archive asset.' });
        }
      }
    });
  };

  // CSV Export
  const handleExportMatrix = () => {
    const exportRows: ExportRow[] = [];
    filteredAssets.forEach(asset => {
      sortedCheckTypes.forEach(ct => {
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
    } catch {
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

  // Adjust table layout class values based on compact column preference
  const cellPaddingClass = useMemo(() => {
    if (columnMode === 'status') return 'p-1';
    if (columnMode === 'compact') return 'p-2';
    return density === 'comfortable' ? 'p-4' : 'p-2.5';
  }, [columnMode, density]);

  const stickyHeaderWidth = useMemo(() => {
    if (columnMode === 'status') return 'min-w-[190px]';
    if (columnMode === 'compact') return 'min-w-[220px]';
    return 'min-w-[280px]';
  }, [columnMode]);

  const activeFiltersCount = [
    search.length > 0,
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

  const filterChips = useMemo(() => {
    const chips = [];
    if (selectedCategory !== 'All') {
      chips.push({
        key: 'category',
        label: 'Category',
        valueLabel: selectedCategory,
        onClear: () => setSelectedCategory('All')
      });
    }
    if (selectedType !== 'All') {
      chips.push({
        key: 'type',
        label: 'Type',
        valueLabel: selectedType,
        onClear: () => setSelectedType('All')
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
    if (search) {
      chips.push({
        key: 'search',
        label: 'Search',
        valueLabel: search,
        onClear: () => setSearch('')
      });
    }
    return chips;
  }, [selectedCategory, selectedType, statusFilter, search]);

  const filterFields = (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
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

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Group Columns By</label>
        <select
          value={columnGrouping}
          onChange={e => handleColumnGroupingChange(e.target.value as any)}
          className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs font-semibold text-foreground outline-none cursor-pointer"
        >
          <option value="none">Default Order</option>
          <option value="category">Category</option>
          <option value="risk">Risk Level</option>
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
            Assurance ledger mapping scheduled checks, calibrations, services, and private Evidence Vault records.
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
            <span className="text-xs text-muted-foreground font-semibold">expired</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest block">Missing Docs</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-zinc-500">{statsSummary.missing}</span>
            <span className="text-xs text-muted-foreground font-semibold">no logs</span>
          </div>
        </div>
      </div>

      {/* Saved Views Bar */}
      <SavedViewsBar
        views={allViews}
        activeViewId={activeViewId}
        onSelectView={handleSelectView}
        onSaveCurrent={handleSaveView}
        onDeleteCustom={deleteCustomView}
        isViewModified={isViewModified}
      />

      {/* Filters Panel */}
      <div className="bg-card border border-border p-3.5 rounded-xl space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4.5 h-4.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search assets by name, identifier, make/model, registration, serial..."
              className="w-full pl-9 pr-3 py-2.5 bg-muted border border-border rounded-lg text-xs outline-none text-foreground placeholder-muted-foreground focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Column Mode Preferential Selector */}
            <div className="flex items-center gap-1 bg-muted border border-border p-1 rounded-lg">
              <button
                type="button"
                onClick={() => handleColumnModeChange('detailed')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                  columnMode === 'detailed' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Render detailed headers and statuses"
              >
                Detailed
              </button>
              <button
                type="button"
                onClick={() => handleColumnModeChange('compact')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                  columnMode === 'compact' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Render compact titles and abbreviated pills"
              >
                Compact
              </button>
              <button
                type="button"
                onClick={() => handleColumnModeChange('status')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                  columnMode === 'status' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Render status dots only"
              >
                Status Only
              </button>
            </div>

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
          <span>Compliance Column Types: {sortedCheckTypes.length}</span>
        </div>
      </div>

      {/* Active Filter Chips */}
      <ActiveFilterChips
        chips={filterChips}
        onClearAll={resetFilters}
      />

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
                  className={`p-4 sticky left-0 top-0 z-30 border-r-2 border-b border-border/80 font-extrabold text-[10px] ${stickyHeaderWidth}`}
                  style={{ backgroundColor: 'hsl(var(--muted))', left: 0, top: 0 }}
                >
                  Asset & Identification details
                </th>
                {sortedCheckTypes.map(ct => {
                  if (columnMode === 'status') {
                    return (
                      <th
                        key={ct.id}
                        className="p-1 text-center min-w-[50px] max-w-[60px] whitespace-nowrap sticky top-0 border-b border-border text-[9px]"
                        style={{ backgroundColor: 'hsl(var(--muted))', top: 0 }}
                        title={`${ct.title} (${ct.category})`}
                      >
                        <span className="block font-black text-foreground truncate w-10 mx-auto" title={ct.title}>{ct.title.substring(0, 4)}..</span>
                      </th>
                    );
                  }
                  if (columnMode === 'compact') {
                    return (
                      <th
                        key={ct.id}
                        className="p-2 text-center min-w-[95px] max-w-[110px] whitespace-nowrap sticky top-0 border-b border-border text-[10px]"
                        style={{ backgroundColor: 'hsl(var(--muted))', top: 0 }}
                        title={`${ct.title} (${ct.category})`}
                      >
                        <span className="block font-extrabold text-foreground truncate">{ct.title}</span>
                        <span className="text-[8px] text-muted-foreground font-bold uppercase block mt-0.5 truncate">{ct.category}</span>
                      </th>
                    );
                  }
                  return (
                    <th
                      key={ct.id}
                      className="p-4 text-center min-w-[150px] whitespace-nowrap sticky top-0 border-b border-border"
                      style={{ backgroundColor: 'hsl(var(--muted))', top: 0 }}
                      title={ct.description || ''}
                    >
                      <span className="block font-extrabold text-foreground">{ct.title}</span>
                      <span className="text-[9px] text-muted-foreground font-bold uppercase mt-0.5">{ct.category}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={sortedCheckTypes.length + 1} className="p-8 text-center text-muted-foreground">
                    No assets matching the current search parameters were found.
                  </td>
                </tr>
              ) : (
                pagination.paginatedItems.map(asset => {
                  return (
                    <tr key={asset.id} className="hover:bg-muted/10 transition-colors">
                      {/* Sticky Asset metadata */}
                      <td
                        className={`${cellPaddingClass} font-semibold text-foreground sticky left-0 z-10 border-r-2 border-border/80 hover:bg-muted/20 cursor-pointer ${stickyHeaderWidth}`}
                        style={{ backgroundColor: 'hsl(var(--card))', left: 0 }}
                        onClick={() => {
                          setActiveAsset(asset);
                          setActiveTab('overview');
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <div className="min-w-0">
                            <span className="block font-bold text-foreground hover:text-indigo-650 transition-colors truncate">
                              {asset.name}
                            </span>
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 items-center mt-1 text-[9px] font-bold text-muted-foreground uppercase">
                              <span className="px-1 py-0.5 bg-muted rounded truncate max-w-[80px]">{asset.asset_type}</span>
                              {asset.registration_number && (
                                <span className="text-foreground border border-border px-1 rounded bg-muted/40 font-mono truncate">
                                  {asset.registration_number}
                                </span>
                              )}
                              {columnMode === 'detailed' && asset.serial_number && (
                                <span className="font-mono truncate">SN: {asset.serial_number}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Matrix cells */}
                      {sortedCheckTypes.map(ct => {
                        const asg = assetCheckAssignments.find(
                          a => a.asset_id === asset.id && a.asset_check_type_id === ct.id
                        );
                        const status = getAssignmentStatus(asg);

                        return (
                          <td key={`${asset.id}-${ct.id}`} className={cellPaddingClass}>
                            {status === 'N/A' ? (
                              <div className="text-center text-muted-foreground/35 select-none font-bold text-[10px]">
                                —
                              </div>
                            ) : (
                              <>
                                {columnMode === 'status' ? (
                                  <div className="flex justify-center">
                                    <button
                                      onClick={() => {
                                        setActiveAsset(asset);
                                        setActiveCell({ asset, checkType: ct, assignment: asg });
                                      }}
                                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer hover:scale-110 ${
                                        status === 'Compliant' ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs' :
                                        status === 'Expiring Soon' ? 'bg-amber-500 border-amber-600 text-white shadow-xs' :
                                        status === 'Expired' ? 'bg-rose-500 border-rose-600 text-white shadow-xs' :
                                        'bg-zinc-400 border-zinc-500 text-white shadow-xs'
                                      }`}
                                      title={`${ct.title}: ${status}`}
                                    >
                                      {status === 'Compliant' && <CheckCircle2 className="w-3 h-3 text-white" />}
                                      {status === 'Expiring Soon' && <AlertTriangle className="w-3 h-3 text-white" />}
                                      {status === 'Expired' && <Clock className="w-3 h-3 text-white" />}
                                      {status === 'Missing' && <AlertCircle className="w-3 h-3 text-white" />}
                                    </button>
                                  </div>
                                ) : columnMode === 'compact' ? (
                                  <button
                                    onClick={() => {
                                      setActiveAsset(asset);
                                      setActiveCell({ asset, checkType: ct, assignment: asg });
                                    }}
                                    className={`w-full py-1 px-1 rounded border font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer hover:shadow-xs text-center ${
                                      status === 'Compliant' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20' :
                                      status === 'Expiring Soon' ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20' :
                                      status === 'Expired' ? 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20' :
                                      'bg-zinc-500/10 border-zinc-500/25 text-zinc-500 hover:bg-zinc-500/20'
                                    }`}
                                    title={`${ct.title}: ${status}`}
                                  >
                                    <span className="flex items-center justify-center gap-0.5">
                                      {status === 'Compliant' && <CheckCircle2 className="w-2.5 h-2.5" />}
                                      {status === 'Expiring Soon' && <AlertTriangle className="w-2.5 h-2.5" />}
                                      {status === 'Expired' && <Clock className="w-2.5 h-2.5" />}
                                      {status === 'Missing' && <AlertCircle className="w-2.5 h-2.5" />}
                                      {status === 'Compliant' ? 'OK' : status === 'Expiring Soon' ? 'DUE' : status === 'Expired' ? 'EXP' : 'MIS'}
                                    </span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setActiveAsset(asset);
                                      setActiveCell({ asset, checkType: ct, assignment: asg });
                                    }}
                                    className={`w-full py-2 px-2 rounded-lg border font-bold text-[10px] uppercase tracking-wide transition-all cursor-pointer hover:shadow-sm text-center ${
                                      status === 'Compliant' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20' :
                                      status === 'Expiring Soon' ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20' :
                                      status === 'Expired' ? 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20' :
                                      'bg-zinc-500/10 border-zinc-500/25 text-zinc-500 hover:bg-zinc-500/20'
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
                              </>
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
        <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Compliant (Valid, up-to-date log)</div>
        <div className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-500" /> Due Soon (Warning limit triggered)</div>
        <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-rose-500" /> Overdue (Check type expired)</div>
        <div className="flex items-center gap-1.5"><AlertCircle className="w-4 h-4 text-zinc-500" /> Missing (Assigned but never logged)</div>
      </div>

      {/* Asset Workspace Drawer (Right Slideout Wide Overlay) */}
      {activeAsset && (
        <div className="fixed inset-0 z-40 bg-black/60 flex justify-end">
          <div className="w-full max-w-7xl bg-card border-l border-border h-full flex flex-col shadow-2xl relative animate-in slide-in-from-right duration-250">

            {/* Drawer Header */}
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-500/5 px-2 py-0.5 rounded">
                  {activeAsset.asset_type}
                </span>
                <h3 className="text-lg font-black text-foreground">{activeAsset.name}</h3>
                {activeAsset.registration_number && (
                  <span className="text-[10px] font-mono border border-border px-1.5 py-0.5 rounded bg-muted/40 font-bold">
                    {activeAsset.registration_number}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setActiveAsset(null);
                  setActiveCell(null);
                  setShowAddHistoryInWorkspace(false);
                  setIsEditingAsset(false);
                }}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Three-Column Grid */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-full divide-x divide-border">

              {/* Column 1: Left Sidebar (Asset Metadata & Quick Edit) */}
              <div className="lg:col-span-3 p-5 overflow-y-auto space-y-5 flex flex-col justify-between border-b lg:border-b-0">
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-border/60 pb-2">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Asset Details</h4>
                    <button
                      type="button"
                      onClick={() => setIsEditingAsset(!isEditingAsset)}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {isEditingAsset ? 'Cancel Edit' : 'Edit Details'}
                    </button>
                  </div>

                  {!isEditingAsset ? (
                    <div className="space-y-3.5 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Asset ID / Number</span>
                        <span className="font-extrabold text-foreground">{activeAsset.asset_number || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Registration Number</span>
                        <span className="font-extrabold font-mono text-foreground">{activeAsset.registration_number || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Serial Number / VIN</span>
                        <span className="font-extrabold font-mono text-foreground">{activeAsset.serial_number || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Make & Model</span>
                        <span className="font-extrabold text-foreground">
                          {activeAsset.make || activeAsset.model ? `${activeAsset.make || ''} ${activeAsset.model || ''}`.trim() : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Department / Team</span>
                        <span className="font-extrabold text-foreground">{activeAsset.department || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Current Location / Depot</span>
                        <span className="font-extrabold text-foreground">{activeAsset.location || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Assigned Owner / Lead</span>
                        <span className="font-extrabold text-foreground">{activeAsset.owner || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Notes</span>
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-line bg-muted/20 p-2.5 rounded-lg border border-border/40 mt-1">
                          {activeAsset.notes || 'No notes logged for this asset.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          await updateAsset(activeAsset.id, {
                            name: editedAssetName,
                            asset_type: editedAssetType,
                            category: editedAssetType,
                            asset_number: editedAssetNumber || null,
                            registration_number: editedAssetReg || null,
                            serial_number: editedAssetSerial || null,
                            make: editedAssetMake || null,
                            model: editedAssetModel || null,
                            location: editedAssetLocation || null,
                            department: editedAssetDept || null,
                            owner: editedAssetOwner || null,
                            notes: editedAssetNotes || null
                          });
                          setToast({ type: 'success', message: 'Asset details updated successfully.' });
                          setIsEditingAsset(false);

                          // Sync active state in drawer
                          setActiveAsset({
                            ...activeAsset,
                            name: editedAssetName,
                            asset_type: editedAssetType,
                            category: editedAssetType,
                            asset_number: editedAssetNumber || null,
                            registration_number: editedAssetReg || null,
                            serial_number: editedAssetSerial || null,
                            make: editedAssetMake || null,
                            model: editedAssetModel || null,
                            location: editedAssetLocation || null,
                            department: editedAssetDept || null,
                            owner: editedAssetOwner || null,
                            notes: editedAssetNotes || null
                          });
                        } catch {
                          setToast({ type: 'error', message: 'Failed to update asset details.' });
                        }
                      }}
                      className="space-y-3 text-xs"
                    >
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Asset Name</label>
                        <input
                          type="text"
                          required
                          value={editedAssetName}
                          onChange={(e) => setEditedAssetName(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-muted border border-border focus:border-indigo-500 rounded-md outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Type</label>
                          <select
                            value={editedAssetType}
                            onChange={(e) => setEditedAssetType(e.target.value)}
                            className="w-full px-2 py-1.5 bg-muted border border-border focus:border-indigo-500 rounded-md outline-none cursor-pointer"
                          >
                            <option value="Vehicle">Vehicle</option>
                            <option value="Trailer">Trailer</option>
                            <option value="Equipment">Equipment</option>
                            <option value="Material">Material</option>
                            <option value="Object">Object</option>
                            <option value="Facility">Facility</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Asset ID</label>
                          <input
                            type="text"
                            value={editedAssetNumber}
                            onChange={(e) => setEditedAssetNumber(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-muted border border-border focus:border-indigo-500 rounded-md outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Reg Number</label>
                          <input
                            type="text"
                            value={editedAssetReg}
                            onChange={(e) => setEditedAssetReg(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-muted border border-border focus:border-indigo-500 rounded-md outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Serial / VIN</label>
                          <input
                            type="text"
                            value={editedAssetSerial}
                            onChange={(e) => setEditedAssetSerial(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-muted border border-border focus:border-indigo-500 rounded-md outline-none font-mono"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Make</label>
                          <input
                            type="text"
                            value={editedAssetMake}
                            onChange={(e) => setEditedAssetMake(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-muted border border-border focus:border-indigo-500 rounded-md outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Model</label>
                          <input
                            type="text"
                            value={editedAssetModel}
                            onChange={(e) => setEditedAssetModel(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-muted border border-border focus:border-indigo-500 rounded-md outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Location</label>
                          <input
                            type="text"
                            value={editedAssetLocation}
                            onChange={(e) => setEditedAssetLocation(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-muted border border-border focus:border-indigo-500 rounded-md outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Owner</label>
                          <input
                            type="text"
                            value={editedAssetOwner}
                            onChange={(e) => setEditedAssetOwner(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-muted border border-border focus:border-indigo-500 rounded-md outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Notes</label>
                        <textarea
                          value={editedAssetNotes}
                          onChange={(e) => setEditedAssetNotes(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-muted border border-border focus:border-indigo-500 rounded-md outline-none h-16 resize-none"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-md shadow-sm transition-all"
                      >
                        Save Details
                      </button>
                    </form>
                  )}
                </div>

                {/* Left Sidebar Footer: Danger Zone */}
                <div className="pt-4 border-t border-border/60">
                  <button
                    onClick={() => handleDeleteAsset(activeAsset.id)}
                    className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Archive Asset
                  </button>
                </div>
              </div>

              {/* Column 2: Center Workspace (Tabs Content) */}
              <div className="lg:col-span-5 flex flex-col h-full overflow-hidden">
                {/* Tabbed Navigation Bar */}
                <div className="flex border-b border-border bg-muted/40 text-[11px] px-2 overflow-x-auto shrink-0">
                  {[
                    { id: 'overview', label: 'Overview', icon: Info },
                    { id: 'checks', label: 'Checks', icon: ClipboardList },
                    { id: 'evidence', label: 'Evidence Vault', icon: FileCheck },
                    { id: 'requirements', label: 'Requirements', icon: Settings },
                    { id: 'actions', label: 'Actions/Tasks', icon: ShieldAlert },
                    { id: 'history', label: 'History & Logs', icon: Activity }
                  ].map(t => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setActiveTab(t.id as any);
                          // Clear workspace form states when changing tabs
                          setActiveCell(null);
                          setShowAddHistoryInWorkspace(false);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-3 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap ${
                          activeTab === t.id
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-card/40'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                {/* Scrollable Content Workspace */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-card">

                  {/* TAB: Overview */}
                  {activeTab === 'overview' && (() => {
                    const assignments = assetCheckAssignments.filter(
                      assignment => assignment.asset_id === activeAsset.id && assignment.active
                    );
                    const statusCounts = assignments.reduce(
                      (counts, assignment) => {
                        const status = getAssignmentStatus(assignment);
                        counts[status] += 1;
                        return counts;
                      },
                      {
                        Compliant: 0,
                        'Expiring Soon': 0,
                        Expired: 0,
                        Missing: 0,
                        'N/A': 0
                      } as Record<'Compliant' | 'Expiring Soon' | 'Expired' | 'Missing' | 'N/A', number>
                    );
                    const linkedEvidenceCount = assetCheckEvidenceLinks.filter(link => link.asset_id === activeAsset.id).length;
                    const historyCount = assetHistoryEvents.filter(event => event.asset_id === activeAsset.id).length;

                    return (
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Asset Overview</h4>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Current scheduled-check standing and linked record totals for this asset.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="border border-border rounded-xl p-3 bg-muted/20">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Checks</span>
                            <span className="block text-xl font-black text-foreground mt-1">{assignments.length}</span>
                          </div>
                          <div className="border border-border rounded-xl p-3 bg-muted/20">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Linked Evidence</span>
                            <span className="block text-xl font-black text-foreground mt-1">{linkedEvidenceCount}</span>
                          </div>
                          <div className="border border-border rounded-xl p-3 bg-muted/20">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">History Entries</span>
                            <span className="block text-xl font-black text-foreground mt-1">{historyCount}</span>
                          </div>
                          <div className="border border-border rounded-xl p-3 bg-muted/20">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Requires Attention</span>
                            <span className="block text-xl font-black text-foreground mt-1">
                              {statusCounts.Expired + statusCounts.Missing + statusCounts['Expiring Soon']}
                            </span>
                          </div>
                        </div>
                        <div className="border border-border rounded-xl divide-y divide-border bg-card">
                          {[
                            ['Compliant', statusCounts.Compliant, 'text-emerald-600 dark:text-emerald-400'],
                            ['Due Soon', statusCounts['Expiring Soon'], 'text-amber-600 dark:text-amber-400'],
                            ['Expired / Overdue', statusCounts.Expired, 'text-rose-600 dark:text-rose-400'],
                            ['Missing', statusCounts.Missing, 'text-zinc-600 dark:text-zinc-400']
                          ].map(([label, count, colour]) => (
                            <div key={String(label)} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                              <span className="font-semibold text-muted-foreground">{label}</span>
                              <span className={`font-black ${colour}`}>{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* TAB: Checks */}
                  {activeTab === 'checks' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Assigned Compliance Checks</h4>
                        <span className="text-[10px] text-muted-foreground font-semibold">Select a check type to record completion log</span>
                      </div>

                      <div className="space-y-2.5">
                        {sortedCheckTypes
                          .filter(ct => {
                            const asg = assetCheckAssignments.find(a => a.asset_id === activeAsset.id && a.asset_check_type_id === ct.id);
                            return asg && asg.active;
                          })
                          .map(ct => {
                            const asg = assetCheckAssignments.find(a => a.asset_id === activeAsset.id && a.asset_check_type_id === ct.id);
                            const status = getAssignmentStatus(asg);
                            const isSelected = activeCell?.checkType.id === ct.id;

                            return (
                              <div
                                key={ct.id}
                                onClick={() => {
                                  setActiveCell({ asset: activeAsset, checkType: ct, assignment: asg });
                                  setShowAddHistoryInWorkspace(false);
                                }}
                                className={`border p-3.5 rounded-xl flex items-center justify-between bg-card shadow-xs cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-800 transition-all ${
                                  isSelected ? 'ring-2 ring-indigo-500 border-transparent bg-indigo-500/5' : 'border-border'
                                }`}
                              >
                                <div className="space-y-1 pr-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-xs text-foreground">{ct.title}</span>
                                    {ct.risk_level && (
                                      <span className={`text-[8px] font-black uppercase px-1 rounded-sm ${
                                        ct.risk_level === 'Critical' ? 'bg-rose-500/10 text-rose-500' :
                                        ct.risk_level === 'High' ? 'bg-orange-500/10 text-orange-500' :
                                        'bg-zinc-500/10 text-zinc-500'
                                      }`}>
                                        {ct.risk_level}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground leading-normal">{ct.description || 'No description logged.'}</p>
                                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] font-bold text-muted-foreground uppercase pt-1">
                                    <span>Freq: {asg?.frequency_value || ct.default_frequency_value} {asg?.frequency_unit || ct.default_frequency_unit}</span>
                                    {asg?.next_due_date && (
                                      <span className="text-foreground">Due: {new Date(asg.next_due_date).toLocaleDateString()}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0 flex flex-col items-end gap-1.5">
                                  <span className={`px-2.5 py-1 rounded-md border font-extrabold text-[9px] uppercase tracking-wider ${
                                    status === 'Compliant' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                                    status === 'Expiring Soon' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' :
                                    status === 'Expired' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' :
                                    'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                                  }`}>
                                    {status}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* TAB: Evidence */}
                  {activeTab === 'evidence' && (
                    <div className="space-y-4">
                      {/* Upload Box */}
                      <div className="border-2 border-dashed border-border hover:border-indigo-500 rounded-xl p-6 text-center transition-all bg-card/50 relative">
                        <input
                          type="file"
                          id="workspace-file-upload"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setToast({ type: 'info', message: `Uploading "${file.name}" to asset vault...` });
                            try {
                              await uploadAssetEvidence(activeAsset.id, null, null, file);
                              setToast({ type: 'success', message: `Successfully uploaded and linked "${file.name}"` });
                            } catch {
                              setToast({ type: 'error', message: 'Failed to upload document.' });
                            }
                          }}
                        />
                        <FileCheck className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                        <span className="text-xs font-bold text-foreground block">Upload Evidence to Vault</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">Drag and drop file here or click to browse</span>
                      </div>

                      {/* Link Existing Document Section */}
                      <div className="bg-card border border-border p-3.5 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Associate Existing Document</label>
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={selectedDocIdForWorkspace}
                            onChange={(e) => setSelectedDocIdForWorkspace(e.target.value)}
                            className="flex-1 bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none cursor-pointer"
                          >
                            <option value="">-- Select from Vault --</option>
                            {documents
                              .filter(doc => !assetCheckEvidenceLinks.some(l => l.document_id === doc.id && l.asset_id === activeAsset.id))
                              .map(doc => (
                                <option key={doc.id} value={doc.id}>
                                  {doc.title} ({doc.category} • Expiry: {doc.expiry_date || 'None'})
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!selectedDocIdForWorkspace) return;
                              try {
                                await linkAssetCheckEvidence(null, null, selectedDocIdForWorkspace, activeAsset.id);
                                setToast({ type: 'success', message: 'Linked vault document to asset.' });
                                setSelectedDocIdForWorkspace('');
                              } catch {
                                setToast({ type: 'error', message: 'Failed to link document.' });
                              }
                            }}
                            disabled={!selectedDocIdForWorkspace}
                            className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                          >
                            Link File
                          </button>
                        </div>
                      </div>

                      {/* List Linked Evidence Documents */}
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Associated Vault Documents</h4>

                        {assetCheckEvidenceLinks.filter(link => link.asset_id === activeAsset.id).length === 0 ? (
                          <div className="text-xs text-muted-foreground text-center p-6 bg-muted/10 rounded-lg">
                            No evidence files currently linked to this asset.
                          </div>
                        ) : (
                          assetCheckEvidenceLinks
                            .filter(link => link.asset_id === activeAsset.id)
                            .map(link => {
                              const doc = documents.find(d => d.id === link.document_id);
                              if (!doc) return null;
                              return (
                                <div key={link.id} className="border border-border p-3.5 rounded-xl flex items-center justify-between bg-card shadow-xs">
                                  <div className="flex items-center gap-3">
                                    <FileText className="w-8 h-8 text-indigo-500 shrink-0" />
                                    <div>
                                      <span className="font-extrabold text-xs text-foreground block">{doc.title}</span>
                                      <span className="text-[9px] text-muted-foreground uppercase font-bold mt-0.5 block">
                                        Type: {doc.category} • Size: {Math.round(doc.file_size_bytes / 1024)} KB
                                      </span>
                                      {doc.expiry_date && (
                                        <span className="text-[9px] font-bold text-rose-500 block mt-0.5">
                                          Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                      doc.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-rose-500/10 border-rose-500/20 text-rose-600'
                                    }`}>
                                      {doc.status}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        setConfirmRequest({
                                          title: 'Unlink Document?',
                                          description: `Are you sure you want to remove the association with "${doc.title}"? The file will remain in the Vault.`,
                                          confirmLabel: 'Unlink File',
                                          tone: 'warning',
                                          onConfirm: async () => {
                                            try {
                                              await unlinkAssetCheckEvidence(link.id);
                                              setToast({ type: 'success', message: `Unlinked document "${doc.title}".` });
                                            } catch {
                                              setToast({ type: 'error', message: 'Failed to unlink document.' });
                                            }
                                          }
                                        });
                                      }}
                                      className="p-1 hover:bg-muted text-muted-foreground hover:text-rose-600 rounded transition-colors"
                                      title="Unlink document"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB: Requirements */}
                  {activeTab === 'requirements' && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Linked Requirements</h4>
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        Requirements linked to the scheduled checks assigned to this asset.
                      </p>

                      <div className="space-y-2.5">
                        {frameworkRequirements.length === 0 ? (
                          <div className="text-xs text-muted-foreground text-center p-6 bg-muted/10 rounded-lg">
                            No active framework requirements linked.
                          </div>
                        ) : (
                          (() => {
                            const assetTypes = assetCheckTypes.filter(ct => {
                              const asg = assetCheckAssignments.find(a => a.asset_id === activeAsset.id && a.asset_check_type_id === ct.id);
                              return asg && asg.active;
                            });

                            const matchedReqs = frameworkRequirements.filter(req =>
                              assetRequirementLinks.some(link =>
                                link.requirement_id === req.id &&
                                assetTypes.some(ct => ct.id === link.asset_check_type_id)
                              )
                            );

                            if (matchedReqs.length === 0) {
                              return (
                                <div className="text-xs text-muted-foreground text-center p-6 bg-muted/10 rounded-lg">
                                  No requirements are linked to this asset&apos;s scheduled checks.
                                </div>
                              );
                            }

                            return matchedReqs.map(req => (
                              <div key={req.id} className="border border-border p-3.5 rounded-xl bg-card space-y-2 shadow-xs">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h5 className="font-extrabold text-xs text-foreground">{req.title}</h5>
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">{req.category}</span>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                    req.status === 'GREEN' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' :
                                    req.status === 'AMBER' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                                    'bg-rose-500/10 border-rose-500/20 text-rose-600'
                                  }`}>
                                    {req.status === 'GREEN' ? 'Compliant' : req.status === 'AMBER' ? 'Due soon' : 'Expired'}
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                  {req.description || 'No description provided.'}
                                </p>
                              </div>
                            ));
                          })()
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB: Actions */}
                  {activeTab === 'actions' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Corrective Action Items</h4>
                      </div>

                      <div className="space-y-2.5">
                        {actions.filter(action => action.title.toLowerCase().includes(activeAsset.name.toLowerCase())).length === 0 ? (
                          <div className="text-xs text-muted-foreground text-center p-6 bg-muted/10 rounded-lg">
                            No corrective actions found for this asset.
                          </div>
                        ) : (
                          actions
                            .filter(action => action.title.toLowerCase().includes(activeAsset.name.toLowerCase()))
                            .map(action => (
                              <div key={action.id} className="border border-border p-3.5 rounded-xl bg-card space-y-2 shadow-xs">
                                <div className="flex justify-between items-start">
                                  <h5 className="font-extrabold text-xs text-foreground">{action.title}</h5>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                    action.status === 'Complete' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' :
                                    action.status === 'In Progress' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                                    'bg-rose-500/10 border-rose-500/20 text-rose-600'
                                  }`}>
                                    {action.status}
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                  {action.description || 'No description provided.'}
                                </p>
                                <div className="flex justify-between items-center text-[9px] font-bold text-muted-foreground pt-1 border-t border-border/40 uppercase">
                                  <span>Owner: {action.owner || 'Unassigned'}</span>
                                  {action.due_date && (
                                    <span className="text-rose-500">Due: {new Date(action.due_date).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB: History */}
                  {activeTab === 'history' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-border/60 pb-2">
                        <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Asset Maintenance Chronology</h4>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddHistoryInWorkspace(true);
                            setActiveCell(null);
                          }}
                          className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-700 text-white rounded text-[10px] font-bold transition-all cursor-pointer"
                        >
                          Log Repair / Ad-hoc Event
                        </button>
                      </div>

                      {/* Chronological List of Check completions + History Events */}
                      <div className="relative pl-4 border-l-2 border-border/60 ml-2 space-y-5">
                        {(() => {
                          const recordsList = assetCheckRecords
                            .filter(r => r.asset_id === activeAsset.id)
                            .map(r => ({
                              id: r.id,
                              date: r.completed_at,
                              title: `Compliance Check Completed: ${assetCheckTypes.find(ct => ct.id === r.asset_check_type_id)?.title || 'Check'}`,
                              description: r.notes || `Reference: ${r.reference || 'None'} • Performed by: ${r.performed_by || 'Unknown'}`,
                              type: 'check_completed',
                              cost: null,
                              supplier: null
                            }));

                          const eventsList = assetHistoryEvents
                            .filter(ev => ev.asset_id === activeAsset.id)
                            .map(ev => ({
                              id: ev.id,
                              date: ev.event_date,
                              title: `${ev.title} (${ev.event_type.toUpperCase()})`,
                              description: ev.description,
                              type: ev.event_type,
                              cost: ev.cost,
                              supplier: ev.supplier
                            }));

                          const combined = [...recordsList, ...eventsList].sort((a, b) => b.date.localeCompare(a.date));

                          if (combined.length === 0) {
                            return (
                              <div className="text-xs text-muted-foreground text-center p-6 bg-muted/10 rounded-lg -ml-4 border-l-0">
                                No history logs recorded for this asset.
                              </div>
                            );
                          }

                          return combined.map((item, idx) => (
                            <div key={`${item.id}-${idx}`} className="relative space-y-1">
                              {/* Timeline Dot */}
                              <div className={`absolute -left-[22.5px] top-1 w-3 h-3 rounded-full border-2 border-card ${
                                item.type === 'check_completed' ? 'bg-emerald-500' :
                                item.type === 'repair' ? 'bg-rose-500' :
                                item.type === 'incident' ? 'bg-orange-500' :
                                item.type === 'service' ? 'bg-blue-500' :
                                'bg-indigo-500'
                              }`} />

                              <div className="flex justify-between items-baseline text-[9px] font-bold text-muted-foreground uppercase">
                                <span>{new Date(item.date).toLocaleDateString()}</span>
                                {item.cost && <span className="text-foreground font-black">Cost: €{item.cost}</span>}
                              </div>
                              <h5 className="font-extrabold text-xs text-foreground">{item.title}</h5>
                              <p className="text-[11px] text-muted-foreground leading-normal">{item.description}</p>
                              {item.supplier && (
                                <span className="text-[9px] font-bold text-muted-foreground block uppercase">Supplier: {item.supplier}</span>
                              )}
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Column 3: Right Workspace (Context-Driven Actions Form Panel) */}
              <div className="lg:col-span-4 p-5 overflow-y-auto space-y-4 bg-muted/15 flex flex-col justify-start">

                {/* STATE 1: Record Check Completion Form */}
                {activeCell && (
                  <div className="space-y-4">
                    <div className="border-b border-border/80 pb-3 mb-2 flex justify-between items-start">
                      <div>
                        <h4 className="font-black text-sm text-foreground">Record Compliance Log</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Log completion records and bind evidence documents.</p>
                      </div>
                      <button
                        onClick={() => setActiveCell(null)}
                        className="p-1 hover:bg-muted text-muted-foreground rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleLogCheckCompletion} className="space-y-3.5 text-xs">
                      <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 border border-border/60">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-semibold">Check Type:</span>
                          <span className="text-foreground font-extrabold">{activeCell.checkType.title}</span>
                        </div>
                        {activeCell.assignment?.next_due_date && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground font-semibold">Current Next Due:</span>
                            <span className="text-rose-500 font-extrabold">
                              {new Date(activeCell.assignment.next_due_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label htmlFor="ws-completed-date" className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                          Completion Date
                        </label>
                        <input
                          id="ws-completed-date"
                          type="date"
                          required
                          value={completedDate}
                          onChange={e => setCompletedDate(e.target.value)}
                          className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                        />
                      </div>

                      <div>
                        <label htmlFor="ws-expiry-date" className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                          Expiry / Validity Expiration
                        </label>
                        <input
                          id="ws-expiry-date"
                          type="date"
                          required
                          value={validUntilDate}
                          onChange={e => setValidUntilDate(e.target.value)}
                          className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label htmlFor="ws-check-result" className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            Result Status
                          </label>
                          <select
                            id="ws-check-result"
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
                          <label htmlFor="ws-check-reference" className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            Certificate Ref ID
                          </label>
                          <input
                            id="ws-check-reference"
                            type="text"
                            value={checkReference}
                            onChange={e => setCheckReference(e.target.value)}
                            placeholder="e.g. CVRT-901-44"
                            className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="ws-link-evidence" className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                          Link Supporting Document
                        </label>
                        <select
                          id="ws-link-evidence"
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
                        <label htmlFor="ws-check-notes" className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                          Notes / Details
                        </label>
                        <textarea
                          id="ws-check-notes"
                          value={checkNotes}
                          onChange={e => setCheckNotes(e.target.value)}
                          placeholder="Record calibration issues, inspector name or maintenance advice..."
                          className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none h-16 resize-none"
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveCell(null)}
                          className="w-1/2 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg text-center cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isLoggingCheck}
                          className="w-1/2 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md cursor-pointer disabled:opacity-50"
                        >
                          {isLoggingCheck ? 'Saving...' : 'Submit Log'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* STATE 2: Log Repair / Ad-Hoc History Event Form */}
                {showAddHistoryInWorkspace && !activeCell && (
                  <div className="space-y-4">
                    <div className="border-b border-border/80 pb-3 mb-2 flex justify-between items-start">
                      <div>
                        <h4 className="font-black text-sm text-foreground">Log Maintenance Event</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Record repairs, calibrations, services, incidents and costs.</p>
                      </div>
                      <button
                        onClick={() => setShowAddHistoryInWorkspace(false)}
                        className="p-1 hover:bg-muted text-muted-foreground rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setIsLoggingHistoryEvent(true);
                        try {
                          await createAssetHistoryEvent({
                            asset_id: activeAsset.id,
                            asset_check_assignment_id: null,
                            asset_check_record_id: null,
                            event_type: historyEventType,
                            event_date: historyEventDate,
                            title: historyEventTitle,
                            description: historyEventComments || null,
                            status: 'completed',
                            cost: historyEventCost ? Number(historyEventCost) : null,
                            performed_by: user?.full_name || 'System Operator',
                            supplier: historyEventSupplier || null,
                            odometer_or_hours: historyEventOdo ? Number(historyEventOdo) : null,
                            evidence_document_id: null
                          });

                          setToast({ type: 'success', message: 'Logged asset history event.' });
                          setShowAddHistoryInWorkspace(false);
                        } catch {
                          setToast({ type: 'error', message: 'Failed to log maintenance event.' });
                        } finally {
                          setIsLoggingHistoryEvent(false);
                        }
                      }}
                      className="space-y-3.5 text-xs"
                    >
                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                          Event Title / Action Taken
                        </label>
                        <input
                          type="text"
                          required
                          value={historyEventTitle}
                          onChange={e => setHistoryEventTitle(e.target.value)}
                          placeholder="e.g. Front axle brake pad replacement"
                          className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            Event Date
                          </label>
                          <input
                            type="date"
                            required
                            value={historyEventDate}
                            onChange={e => setHistoryEventDate(e.target.value)}
                            className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            Event Type
                          </label>
                          <select
                            value={historyEventType}
                            onChange={e => setHistoryEventType(e.target.value as any)}
                            className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none cursor-pointer"
                          >
                            <option value="maintenance">Maintenance</option>
                            <option value="repair">Repair</option>
                            <option value="service">Service</option>
                            <option value="calibration">Calibration</option>
                            <option value="part_replacement">Part Replacement</option>
                            <option value="defect">Defect Log</option>
                            <option value="inspection">Inspection</option>
                            <option value="incident">Incident / Collision</option>
                            <option value="general">General Note</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            Supplier / Garage Name
                          </label>
                          <input
                            type="text"
                            value={historyEventSupplier}
                            onChange={e => setHistoryEventSupplier(e.target.value)}
                            placeholder="e.g. Scania Dublin Central"
                            className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            Cost (€)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={historyEventCost}
                            onChange={e => setHistoryEventCost(e.target.value)}
                            placeholder="450"
                            className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            Odometer / Hours
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={historyEventOdo}
                            onChange={e => setHistoryEventOdo(e.target.value)}
                            placeholder="e.g. 184500"
                            className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                          Comments / Work Description
                        </label>
                        <textarea
                          value={historyEventComments}
                          onChange={e => setHistoryEventComments(e.target.value)}
                          placeholder="Provide details about components replaced, calibration report numbers or work warranty..."
                          className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none h-20 resize-none"
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddHistoryInWorkspace(false)}
                          className="w-1/2 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg text-center cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isLoggingHistoryEvent}
                          className="w-1/2 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md cursor-pointer disabled:opacity-50"
                        >
                          {isLoggingHistoryEvent ? 'Saving...' : 'Save Event'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* STATE 3: Default Empty State */}
                {!activeCell && !showAddHistoryInWorkspace && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground/60 space-y-3 border border-dashed border-border rounded-xl bg-card/20">
                    <ClipboardList className="w-12 h-12 text-muted-foreground/30" />
                    <div>
                      <span className="text-xs font-bold text-foreground block">Action Workspace</span>
                      <span className="text-[10px] leading-relaxed mt-1 block">
                        Select a check assignment on the left, or log a maintenance repair event to perform assurance updates.
                      </span>
                    </div>
                  </div>
                )}

              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal: Log Compliance Check / Upload Evidence (Outside drawer only) */}
      {activeCell && !activeAsset && (
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
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none font-mono"
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
                    className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none font-mono"
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
                <p className="text-[11px] text-muted-foreground mt-0.5">Add a new scheduled asset check definition.</p>
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
