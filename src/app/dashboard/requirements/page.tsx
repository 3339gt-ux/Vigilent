'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { ActionDetailDrawer } from '@/components/ActionDetailDrawer';
import { EvidenceDropzone } from '@/components/EvidenceDropzone';
import { REQUIREMENT_CATEGORY_GROUPS, flattenCategoryGroups } from '@/lib/categoryPresets';
import type { Action, ActionStatus, Requirement, RequirementEvidenceCoverage, RequirementLifecycleStatus, RequirementStatus } from '@/lib/types';
import { REQUIREMENT_TEMPLATE_PACKS } from '@/lib/requirementTemplatePacks';
import {
  ClipboardList,
  Download,
  Link as LinkIcon,
  Plus,
  Search,
  X,
  Filter,
  ChevronDown,
  Archive
} from 'lucide-react';
import {
  useFilterFavourites,
  useSavedViews,
  FilterFavouriteButton,
  ActiveFilterChips,
  SavedViewsBar,
  StarredFilterSelect,
  ColumnVisibilityControls,
  SavedView,
  PaginationControls,
  BulkSelectionToolbar,
  useBulkSelection,
  usePagination,
  usePersistentViewState
} from '@/components/FilterControls';

const statusClass = (status: RequirementStatus) => {
  if (status === 'GREEN') return 'bg-emerald-500/10 dark:bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400';
  if (status === 'AMBER') return 'bg-amber-500/10 dark:bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400';
  if (status === 'RED') return 'bg-rose-500/10 dark:bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-400';
  return 'bg-zinc-500/10 dark:bg-zinc-500/5 border-zinc-500/20 text-zinc-600 dark:text-zinc-400';
};

const riskOptions: Requirement['risk_level'][] = ['Low', 'Medium', 'High', 'Critical'];
const frequencyOptions: Requirement['review_frequency'][] = ['Weekly', 'Monthly', 'Quarterly', 'Annually', 'Custom'];
const requirementStatusOptions: RequirementStatus[] = ['GREEN', 'AMBER', 'RED', 'GREY'];
type RequirementView = 'active' | 'archive' | 'inactive' | 'actions';

const lifecycleLabel = (status?: RequirementLifecycleStatus) => status || 'ACTIVE';

const coverageChip = (coverage?: RequirementEvidenceCoverage) => {
  if (!coverage) return { label: 'Not Assessed', title: 'Evidence coverage has not been assessed.', className: statusClass('GREY') };
  if (coverage.totalRequired === 0) {
    return { label: 'Criteria Missing', title: coverage.summary || 'No evidence criteria are configured for this requirement.', className: statusClass('GREY') };
  }
  const status: RequirementStatus = coverage.status === 'Fully Covered'
    ? 'GREEN'
    : coverage.status === 'Partially Covered'
      ? 'AMBER'
      : 'RED';
  const label = coverage.status === 'Fully Covered'
    ? `${coverage.coveredRequired}/${coverage.totalRequired} Covered`
    : coverage.status === 'Partially Covered'
      ? `${coverage.coveredRequired}/${coverage.totalRequired} Partial`
      : 'Criteria Missing';
  return {
    label,
    title: coverage.summary,
    className: statusClass(status)
  };
};

export default function RequirementsPage() {
  const {
    user,
    organization,
    documents,
    frameworkRequirements,
    requirementDocuments,
    reviews,
    actions,
    requirementActions,
    actionUpdates,
    actionDocuments,
    competencyTypes,
    requirementCompetencyTypes,
    createFrameworkRequirement,
    importRequirementTemplateItems,
    updateFrameworkRequirement,
    archiveFrameworkRequirement,
    restoreFrameworkRequirement,
    deactivateFrameworkRequirement,
    deleteFrameworkRequirement,
    linkDocumentToRequirement,
    unlinkDocumentFromRequirement,
    upsertRequirementEvidenceCriterion,
    deleteRequirementEvidenceCriterion,
    linkDocumentToEvidenceCriterion,
    unlinkDocumentFromEvidenceCriterion,
    uploadEvidenceForCriterion,
    createActionForRequirement,
    updateAction,
    addActionUpdate,
    linkDocumentToAction,
    unlinkDocumentFromAction,
    uploadActionAttachment,
    getDocumentSignedUrl,
    findPossibleDuplicateDocuments,
    linkCompetencyTypeToRequirement,
    unlinkCompetencyTypeFromRequirement,
    requirementCategories,
    upsertRequirementCategory,
    archiveRequirementCategory,
    readinessReport
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Attention' | RequirementStatus>('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [requirementView, setRequirementView] = useState<RequirementView>('active');

  // Premium filters
  const [ownerFilter, setOwnerFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [radarFilter, setRadarFilter] = useState('All');
  const [showOnlyFavourites, setShowOnlyFavourites] = useState(false);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkRequirementCategory, setBulkRequirementCategory] = useState('');
  const [bulkRequirementOwner, setBulkRequirementOwner] = useState('');
  const [bulkRequirementStatus, setBulkRequirementStatus] = useState('');
  const [bulkRequirementRisk, setBulkRequirementRisk] = useState('');
  const [bulkRequirementReviewDate, setBulkRequirementReviewDate] = useState('');
  const [bulkActionStatus, setBulkActionStatus] = useState('');
  const [bulkActionDueDate, setBulkActionDueDate] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');
  const [lastRequirementUndo, setLastRequirementUndo] = useState<null | { label: string; requirements: Requirement[] }>(null);
  const [lastActionUndo, setLastActionUndo] = useState<null | { label: string; actions: Action[] }>(null);

  // Favourites Persistence
  const { favourites, toggleFavourite, isFavourite, clearFavourites } = useFilterFavourites(user?.id || 'guest', 'requirements', organization?.id);

  // Saved Views System
  const defaultViews: SavedView[] = [
    {
      id: 'attention-required',
      name: 'Needs Attention',
      filters: { selectedStatus: 'Attention' }
    },
    {
      id: 'critical-high-risk',
      name: 'High & Critical Risk',
      filters: { riskFilter: 'High' }
    },
    {
      id: 'overdue-reviews',
      name: 'Overdue Items',
      filters: { radarFilter: 'overdue' }
    },
    {
      id: 'starred-only',
      name: 'Starred Requirements',
      filters: { showOnlyFavourites: true }
    }
  ];

  const {
    allViews,
    activeViewId,
    setActiveViewId,
    saveCurrentView,
    deleteCustomView
  } = useSavedViews(user?.id || 'guest', 'requirements', defaultViews, organization?.id);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedStatus('All');
    setSelectedCategory('All');
    setOwnerFilter('All');
    setRiskFilter('All');
    setRadarFilter('All');
    setShowOnlyFavourites(false);
    setActiveViewId(null);
  };

  const handleSelectView = (view: SavedView | null) => {
    if (view === null) {
      handleResetFilters();
      setActiveViewId(null);
    } else {
      const f = view.filters;
      setSearch(f.search || '');
      setSelectedStatus(f.selectedStatus || 'All');
      setSelectedCategory(f.selectedCategory || 'All');
      setOwnerFilter(f.ownerFilter || 'All');
      setRiskFilter(f.riskFilter || 'All');
      setRadarFilter(f.radarFilter || 'All');
      setShowOnlyFavourites(!!f.showOnlyFavourites);
      setActiveViewId(view.id);
    }
  };

  const handleSaveView = (name: string) => {
    const filters = {
      search,
      selectedStatus,
      selectedCategory,
      ownerFilter,
      riskFilter,
      radarFilter,
      showOnlyFavourites
    };
    saveCurrentView(name, filters);
  };

  const isViewModified = useMemo(() => {
    if (!activeViewId) return false;
    const activeView = allViews.find(v => v.id === activeViewId);
    if (!activeView) return false;
    const f = activeView.filters;
    return (
      search !== (f.search || '') ||
      selectedStatus !== (f.selectedStatus || 'All') ||
      selectedCategory !== (f.selectedCategory || 'All') ||
      ownerFilter !== (f.ownerFilter || 'All') ||
      riskFilter !== (f.riskFilter || 'All') ||
      radarFilter !== (f.radarFilter || 'All') ||
      showOnlyFavourites !== (!!f.showOnlyFavourites)
    );
  }, [activeViewId, allViews, search, selectedStatus, selectedCategory, ownerFilter, riskFilter, radarFilter, showOnlyFavourites]);

  usePersistentViewState(
    user?.id || 'guest',
    organization?.id,
    'requirements',
    {
      search,
      selectedStatus,
      selectedCategory,
      requirementView,
      ownerFilter,
      riskFilter,
      radarFilter,
      showOnlyFavourites,
      density,
      hiddenColumns,
      activeViewId
    },
    stored => {
      if (typeof stored.search === 'string') setSearch(stored.search);
      if (typeof stored.selectedStatus === 'string') setSelectedStatus(stored.selectedStatus as 'All' | 'Attention' | RequirementStatus);
      if (typeof stored.selectedCategory === 'string') setSelectedCategory(stored.selectedCategory);
      if (stored.requirementView === 'active' || stored.requirementView === 'archive' || stored.requirementView === 'inactive' || stored.requirementView === 'actions') setRequirementView(stored.requirementView);
      if (typeof stored.ownerFilter === 'string') setOwnerFilter(stored.ownerFilter);
      if (typeof stored.riskFilter === 'string') setRiskFilter(stored.riskFilter);
      if (typeof stored.radarFilter === 'string') setRadarFilter(stored.radarFilter);
      if (typeof stored.showOnlyFavourites === 'boolean') setShowOnlyFavourites(stored.showOnlyFavourites);
      if (stored.density === 'comfortable' || stored.density === 'compact') setDensity(stored.density);
      if (Array.isArray(stored.hiddenColumns)) setHiddenColumns(stored.hiddenColumns.filter((item): item is string => typeof item === 'string'));
      if (typeof stored.activeViewId === 'string' || stored.activeViewId === null) setActiveViewId(stored.activeViewId);
    },
    [search, selectedStatus, selectedCategory, requirementView, ownerFilter, riskFilter, radarFilter, showOnlyFavourites, density, hiddenColumns, activeViewId]
  );
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState(REQUIREMENT_TEMPLATE_PACKS[0]?.id || '');
  const [selectedTemplateKeys, setSelectedTemplateKeys] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Operations');
  const [newOwner, setNewOwner] = useState('');
  const [newRisk, setNewRisk] = useState<Requirement['risk_level']>('Medium');
  const [newFrequency, setNewFrequency] = useState<Requirement['review_frequency']>('Annually');
  const [newNextDue, setNewNextDue] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [linkingDocumentId, setLinkingDocumentId] = useState('');
  const [linkingCompetencyTypeId, setLinkingCompetencyTypeId] = useState('');
  const [criterionLinkingDocumentId, setCriterionLinkingDocumentId] = useState<Record<string, string>>({});
  const [criterionTitle, setCriterionTitle] = useState('');
  const [criterionEvidenceType, setCriterionEvidenceType] = useState('');
  const [criterionRequired, setCriterionRequired] = useState(true);
  const [criterionValidityRequired, setCriterionValidityRequired] = useState(true);
  const [criterionMinimumCount, setCriterionMinimumCount] = useState('1');
  const [showAddActionForm, setShowAddActionForm] = useState(false);
  const [actionTitle, setActionTitle] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [actionOwner, setActionOwner] = useState('');
  const [actionDueDate, setActionDueDate] = useState('');
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [isEditingRequirement, setIsEditingRequirement] = useState(false);
  const [isSavingRequirement, setIsSavingRequirement] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editOwner, setEditOwner] = useState('');
  const [editRisk, setEditRisk] = useState<Requirement['risk_level']>('Medium');
  const [editStatus, setEditStatus] = useState<RequirementStatus>('GREY');
  const [editFrequency, setEditFrequency] = useState<Requirement['review_frequency']>('Annually');
  const [editReviewDate, setEditReviewDate] = useState('');
  const [editNextDueDate, setEditNextDueDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [newCustomCategory, setNewCustomCategory] = useState('');
  const [categoryMessage, setCategoryMessage] = useState('');
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState('');

  const requirementCategoryOptions = useMemo(() => {
    const names = new Set<string>([
      ...flattenCategoryGroups(REQUIREMENT_CATEGORY_GROUPS),
      ...frameworkRequirements.map(requirement => requirement.category),
      ...requirementCategories.filter(category => category.active).map(category => category.name)
    ].filter(Boolean));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [frameworkRequirements, requirementCategories]);

  const sortedCategories = useMemo(() => {
    const list = requirementCategoryOptions;
    const starred = list.filter(c => isFavourite(`cat:${c}`));
    const regular = list.filter(c => !isFavourite(`cat:${c}`));
    return [...starred, ...regular];
  }, [requirementCategoryOptions, favourites, isFavourite]);

  const ownersList = useMemo(() => {
    const names = new Set(frameworkRequirements.map(r => r.owner).filter(Boolean) as string[]);
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [frameworkRequirements]);

  const sortedOwners = useMemo(() => {
    const starred = ownersList.filter(o => isFavourite(`owner:${o}`));
    const regular = ownersList.filter(o => !isFavourite(`owner:${o}`));
    return ['All', ...starred, ...regular];
  }, [ownersList, favourites, isFavourite]);

  const filteredCatOptions = useMemo(() => {
    const query = catSearchQuery.toLowerCase().trim();
    if (!query) return requirementCategoryOptions;
    return requirementCategoryOptions.filter(cat => cat.toLowerCase().includes(query));
  }, [requirementCategoryOptions, catSearchQuery]);

  const selectRequirement = (req: Requirement | null) => {
    setSelectedRequirement(req);
    setShowAddActionForm(false);
    setActionTitle('');
    setActionDescription('');
    setActionOwner('');
    setActionDueDate('');
    setIsEditingRequirement(false);
    setEditError('');
    setEditSuccess('');
  };

  const openEditRequirement = (requirement: Requirement) => {
    setEditTitle(requirement.title);
    setEditDescription(requirement.description || '');
    setEditCategory(requirement.category);
    setEditOwner(requirement.owner || '');
    setEditRisk(requirement.risk_level);
    setEditStatus(requirement.status);
    setEditFrequency(requirement.review_frequency);
    setEditReviewDate(requirement.review_date || '');
    setEditNextDueDate(requirement.next_due_date || '');
    setEditNotes(requirement.notes || '');
    setEditError('');
    setEditSuccess('');
    setIsEditingRequirement(true);
  };

  const assessedRequirements = useMemo(() => {
    const readinessRows = readinessReport.requirements.map(item => ({
      ...item.requirement,
      status: item.status,
      linkedDocuments: item.linkedDocuments,
      evidenceCoverage: item.evidenceCoverage
    }));
    const readinessIds = new Set(readinessRows.map(requirement => requirement.id));
    const lifecycleRows = frameworkRequirements
      .filter(requirement => !readinessIds.has(requirement.id))
      .map(requirement => ({
        ...requirement,
        linkedDocuments: documents.filter(document =>
          requirementDocuments.some(link => link.requirement_id === requirement.id && link.document_id === document.id)
        ),
        evidenceCoverage: undefined
      }));
    return [...readinessRows, ...lifecycleRows];
  }, [documents, frameworkRequirements, readinessReport.requirements, requirementDocuments]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const statusParam = params.get('status');
      const categoryParam = params.get('category');
      const idParam = params.get('id');
      const actionParam = params.get('action');
      const filterParam = params.get('filter');
      if (filterParam === 'actions' || filterParam === 'overdue' || filterParam === 'due-week') {
        setRequirementView('actions');
        if (filterParam === 'overdue') {
          setRadarFilter('overdue');
        } else if (filterParam === 'due-week') {
          setRadarFilter('due-week');
        } else {
          setRadarFilter('All');
        }
      }
      if (statusParam) {
        setSelectedStatus(statusParam as any);
      }
      if (categoryParam) {
        setSelectedCategory(categoryParam);
      }
      if (actionParam === 'create') {
        setShowCreateModal(true);
      }
      if (idParam && assessedRequirements.length > 0) {
        const req = assessedRequirements.find(r => r.id === idParam);
        if (req) {
          setSelectedRequirement(req);
        }
      } else if (actionParam === 'create-action' && assessedRequirements.length > 0) {
        const firstActiveRequirement = assessedRequirements.find(requirement => lifecycleLabel(requirement.lifecycle_status) === 'ACTIVE');
        if (firstActiveRequirement) {
          setSelectedRequirement(firstActiveRequirement);
          setShowAddActionForm(true);
        }
      }
    }
  }, [assessedRequirements]);

  const activeRadarFilter = useMemo(() => {
    if (radarFilter !== 'All') return radarFilter;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('filter') || 'All';
    }
    return 'All';
  }, [radarFilter]);

  const filteredActions = useMemo(() => {
    return actions.filter(action => {
      const matchesSearch =
        !search ||
        action.title.toLowerCase().includes(search.toLowerCase()) ||
        (action.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (action.owner || '').toLowerCase().includes(search.toLowerCase());

      let matchesStatus = true;
      if (selectedStatus !== 'All') {
        if (['Open', 'In Progress', 'Complete', 'Cancelled'].includes(selectedStatus as any)) {
          matchesStatus = action.status === (selectedStatus as any);
        } else if (selectedStatus === 'Attention') {
          matchesStatus = action.status === 'Open' || action.status === 'In Progress';
        }
      }

      const matchesOwner = ownerFilter === 'All' || action.owner === ownerFilter;

      let matchesRadar = true;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const actionDueDate = action.target_due_date || action.due_date;

      const activeFilter = radarFilter !== 'All' ? radarFilter : (activeRadarFilter || 'All');

      if (activeFilter === 'overdue') {
        matchesRadar = (action.status === 'Open' || action.status === 'In Progress') && !!actionDueDate && new Date(actionDueDate) < today;
      } else if (activeFilter === 'due-week') {
        if (!actionDueDate) matchesRadar = false;
        else {
          const dVal = new Date(actionDueDate);
          const endOfWeek = new Date(today);
          endOfWeek.setDate(today.getDate() + 7);
          matchesRadar = (action.status === 'Open' || action.status === 'In Progress') && dVal >= today && dVal <= endOfWeek;
        }
      }

      return matchesSearch && matchesStatus && matchesOwner && matchesRadar;
    });
  }, [actions, search, selectedStatus, ownerFilter, radarFilter, activeRadarFilter]);

  const filteredRequirements = useMemo(() => {
    return assessedRequirements.filter(requirement => {
      const lifecycle = lifecycleLabel(requirement.lifecycle_status);
      if (requirementView === 'active' && lifecycle !== 'ACTIVE') return false;
      if (requirementView === 'archive' && lifecycle !== 'ARCHIVED') return false;
      if (requirementView === 'inactive' && lifecycle !== 'DEACTIVATED') return false;
      const matchesSearch =
        requirement.title.toLowerCase().includes(search.toLowerCase()) ||
        requirement.category.toLowerCase().includes(search.toLowerCase()) ||
        (requirement.owner || '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = selectedStatus === 'All' ||
        (selectedStatus === 'Attention' ? ['RED', 'AMBER', 'GREY'].includes(requirement.status) : requirement.status === selectedStatus);
      const matchesCategory = selectedCategory === 'All' || requirement.category === selectedCategory;
      const matchesOwner = ownerFilter === 'All' || requirement.owner === ownerFilter;
      const matchesRisk = riskFilter === 'All' || requirement.risk_level === riskFilter;
      const matchesFavourite = !showOnlyFavourites || isFavourite(`req:${requirement.id}`);

      // Support radar filters
      let matchesRadar = true;
      if (activeRadarFilter !== 'All') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const addDays = (d: Date, days: number) => {
          const r = new Date(d);
          r.setDate(r.getDate() + days);
          return r;
        };
        const dStr = requirement.next_due_date;
        if (activeRadarFilter === 'overdue') {
          matchesRadar = !!dStr && new Date(dStr) < today;
        } else if (activeRadarFilter === 'due30') {
          if (!dStr) matchesRadar = false;
          else {
            const d = new Date(dStr);
            matchesRadar = d >= today && d < addDays(today, 30);
          }
        } else if (activeRadarFilter === 'due60') {
          if (!dStr) matchesRadar = false;
          else {
            const d = new Date(dStr);
            matchesRadar = d >= addDays(today, 30) && d < addDays(today, 60);
          }
        } else if (activeRadarFilter === 'due90') {
          if (!dStr) matchesRadar = false;
          else {
            const d = new Date(dStr);
            matchesRadar = d >= addDays(today, 60) && d < addDays(today, 90);
          }
        } else if (activeRadarFilter === 'actions') {
          matchesRadar = actions.some(action =>
            (action.status === 'Open' || action.status === 'In Progress') &&
            requirementActions.some(link => link.requirement_id === requirement.id && link.action_id === action.id)
          );
        }
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesOwner && matchesRisk && matchesFavourite && matchesRadar;
    });
  }, [assessedRequirements, requirementView, search, selectedStatus, selectedCategory, ownerFilter, riskFilter, showOnlyFavourites, activeRadarFilter, actions, requirementActions, favourites, isFavourite]);

  const requirementPagination = usePagination(
    filteredRequirements,
    user?.id || 'guest',
    organization?.id,
    'requirements-list',
    [search, selectedStatus, selectedCategory, ownerFilter, riskFilter, showOnlyFavourites, activeRadarFilter, requirementView]
  );
  const actionPagination = usePagination(
    filteredActions,
    user?.id || 'guest',
    organization?.id,
    'actions-registry',
    [search, selectedStatus, ownerFilter, radarFilter, activeRadarFilter, requirementView]
  );
  const requirementSelection = useBulkSelection(requirementPagination.paginatedItems);
  const actionSelection = useBulkSelection(actionPagination.paginatedItems);
  const selectedBulkRequirements = filteredRequirements.filter(requirement => requirementSelection.selectedIds.has(requirement.id));
  const selectedBulkActions = filteredActions.filter(action => actionSelection.selectedIds.has(action.id));

  const filterChips = useMemo(() => {
    const chips: { key: string; label: string; valueLabel: string; onClear: () => void }[] = [];
    if (search) {
      chips.push({
        key: 'search',
        label: 'Search',
        valueLabel: `"${search}"`,
        onClear: () => setSearch('')
      });
    }
    if (selectedStatus !== 'All') {
      chips.push({
        key: 'status',
        label: 'Status',
        valueLabel: selectedStatus,
        onClear: () => setSelectedStatus('All')
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
    if (ownerFilter !== 'All') {
      chips.push({
        key: 'owner',
        label: 'Owner',
        valueLabel: ownerFilter,
        onClear: () => setOwnerFilter('All')
      });
    }
    if (riskFilter !== 'All') {
      chips.push({
        key: 'risk',
        label: 'Risk',
        valueLabel: riskFilter,
        onClear: () => setRiskFilter('All')
      });
    }
    if (radarFilter !== 'All') {
      chips.push({
        key: 'radar',
        label: 'Due Date Filter',
        valueLabel: radarFilter,
        onClear: () => setRadarFilter('All')
      });
    }
    if (showOnlyFavourites) {
      chips.push({
        key: 'favourites',
        label: 'Starred Only',
        valueLabel: 'Yes',
        onClear: () => setShowOnlyFavourites(false)
      });
    }
    return chips;
  }, [search, selectedStatus, selectedCategory, ownerFilter, riskFilter, radarFilter, showOnlyFavourites]);

  const columnsOptions = useMemo(() => {
    return [
      { id: 'title', title: 'Title', visible: !hiddenColumns.includes('title') },
      { id: 'category', title: 'Category', visible: !hiddenColumns.includes('category') },
      { id: 'owner', title: 'Owner', visible: !hiddenColumns.includes('owner') },
      { id: 'status', title: 'Status', visible: !hiddenColumns.includes('status') },
      { id: 'due_date', title: requirementView === 'archive' ? 'Archived Date' : requirementView === 'inactive' ? 'Deactivated Date' : 'Next Due Date', visible: !hiddenColumns.includes('due_date') },
      { id: 'coverage', title: 'Evidence Coverage', visible: !hiddenColumns.includes('coverage') },
      { id: 'linked_docs', title: 'Linked Evidence', visible: !hiddenColumns.includes('linked_docs') },
      { id: 'actions', title: 'Actions', visible: !hiddenColumns.includes('actions') },
      { id: 'last_review', title: 'Last Review', visible: !hiddenColumns.includes('last_review') }
    ];
  }, [hiddenColumns, requirementView]);

  const handleToggleColumn = (id: string) => {
    setHiddenColumns(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleAllColumns = (visible: boolean) => {
    if (visible) {
      setHiddenColumns([]);
    } else {
      setHiddenColumns(columnsOptions.filter(c => c.id !== 'title').map(c => c.id));
    }
  };

  const selectedAssessed = selectedRequirement
    ? assessedRequirements.find(requirement => requirement.id === selectedRequirement.id) || null
    : null;
  const selectedReadiness = selectedRequirement
    ? readinessReport.requirements.find(item => item.requirement.id === selectedRequirement.id) || null
    : null;
  const selectedCompetencyTypeLinks = selectedRequirement
    ? requirementCompetencyTypes.filter(link => link.requirement_id === selectedRequirement.id)
    : [];
  const selectedCompetencyTypes = selectedCompetencyTypeLinks
    .map(link => competencyTypes.find(type => type.id === link.competency_type_id))
    .filter((type): type is NonNullable<typeof type> => Boolean(type));

  const selectedReviews = selectedRequirement
    ? reviews.filter(review => review.requirement_id === selectedRequirement.id)
    : [];

  const selectedActionIds = selectedRequirement
    ? new Set(requirementActions.filter(link => link.requirement_id === selectedRequirement.id).map(link => link.action_id))
    : new Set<string>();

  const selectedActions = actions.filter(action => selectedActionIds.has(action.id));
  const activeActions = selectedActions.filter(action => action.status === 'Open' || action.status === 'In Progress');
  const completedOrCancelledActions = selectedActions.filter(action => action.status === 'Complete' || action.status === 'Cancelled');
  const selectedActionRequirements = selectedAction
    ? frameworkRequirements.filter(requirement =>
        lifecycleLabel(requirement.lifecycle_status) === 'ACTIVE' &&
        requirementActions.some(link => link.action_id === selectedAction.id && link.requirement_id === requirement.id)
      )
    : [];
  const currentSelectedAction = selectedAction
    ? actions.find(action => action.id === selectedAction.id) || selectedAction
    : null;

  const handleCreateRequirement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTitle.trim()) return;

    await createFrameworkRequirement({
      title: newTitle,
      description: newDescription || null,
      owner: newOwner || user?.full_name || null,
      category: newCategory,
      review_frequency: newFrequency,
      next_due_date: newNextDue || null,
      risk_level: newRisk
    });

    setNewTitle('');
    setNewCategory('Operations');
    setNewOwner('');
    setNewRisk('Medium');
    setNewFrequency('Annually');
    setNewNextDue('');
    setNewDescription('');
    setShowCreateModal(false);
  };

  const handleCreateRequirementCategory = async (overrideName?: string) => {
    const nameToUse = (overrideName || newCustomCategory).trim();
    if (!nameToUse) return;
    try {
      await upsertRequirementCategory({
        name: nameToUse,
        category_group: 'Custom',
        description: 'Custom requirement category',
        active: true
      });
      setNewCategory(nameToUse);
      setSelectedCategory(nameToUse);
      setNewCustomCategory('');
      setCategoryMessage('Requirement category created.');
    } catch (error) {
      setCategoryMessage(error instanceof Error ? error.message : 'Could not create category.');
    }
  };

  const handleArchiveRequirementCategory = async (categoryId: string) => {
    const category = requirementCategories.find(item => item.id === categoryId);
    if (!category) return;
    const inUse = frameworkRequirements.some(requirement => requirement.category === category.name);
    const confirmed = window.confirm(inUse
      ? `Archive "${category.name}"?\n\nExisting requirements keep this category text, but it will be hidden from the managed custom category list.`
      : `Archive unused category "${category.name}"?`);
    if (!confirmed) return;
    try {
      await archiveRequirementCategory(categoryId);
      if (selectedCategory === category.name) setSelectedCategory('All');
      setCategoryMessage('Requirement category archived.');
    } catch (error) {
      setCategoryMessage(error instanceof Error ? error.message : 'Could not archive category.');
    }
  };

  const selectedPack = REQUIREMENT_TEMPLATE_PACKS.find(pack => pack.id === selectedPackId) || REQUIREMENT_TEMPLATE_PACKS[0];
  const existingRequirementKeys = new Set(
    frameworkRequirements
      .filter(requirement => lifecycleLabel(requirement.lifecycle_status) !== 'DELETED')
      .map(requirement => `${requirement.title.trim().toLowerCase()}::${requirement.category.trim().toLowerCase()}`)
  );
  const templateKey = (title: string, category: string) => `${title.trim().toLowerCase()}::${category.trim().toLowerCase()}`;

  const handleSaveRequirementEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRequirement) return;

    if (!editTitle.trim()) {
      setEditError('Requirement title is required.');
      return;
    }

    if (!riskOptions.includes(editRisk)) {
      setEditError('Risk level is not valid.');
      return;
    }

    if (!frequencyOptions.includes(editFrequency)) {
      setEditError('Review frequency is not valid.');
      return;
    }

    setIsSavingRequirement(true);
    setEditError('');
    setEditSuccess('');
    try {
      const updated = await updateFrameworkRequirement(selectedRequirement.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        category: editCategory.trim() || 'Operations',
        owner: editOwner.trim() || null,
        risk_level: editRisk,
        status: editStatus,
        review_frequency: editFrequency,
        review_date: editReviewDate || null,
        next_due_date: editNextDueDate || null,
        notes: editNotes.trim() || null
      });
      setSelectedRequirement(updated);
      setIsEditingRequirement(false);
      setEditSuccess('Requirement saved.');
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Could not save requirement.');
    } finally {
      setIsSavingRequirement(false);
    }
  };

  const handleArchiveRequirement = async () => {
    if (!selectedRequirement) return;
    const confirmed = window.confirm('Archive Requirement?\n\nArchived requirements remain available for historical review but are excluded from readiness scoring and audit packs.');
    if (!confirmed) return;
    setEditError('');
    setEditSuccess('');
    try {
      const updated = await archiveFrameworkRequirement(selectedRequirement.id);
      setSelectedRequirement(updated);
      setRequirementView('archive');
      setEditSuccess('Requirement archived.');
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Could not archive requirement.');
    }
  };

  const handleRestoreRequirement = async () => {
    if (!selectedRequirement) return;
    setEditError('');
    setEditSuccess('');
    try {
      const updated = await restoreFrameworkRequirement(selectedRequirement.id);
      setSelectedRequirement(updated);
      setRequirementView('active');
      setEditSuccess('Requirement restored to Active.');
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Could not restore requirement.');
    }
  };

  const handleDeactivateRequirement = async () => {
    if (!selectedRequirement) return;
    const confirmed = window.confirm('Deactivate Requirement?\n\nDeactivated requirements are retained for history but excluded from readiness scoring and audit packs.');
    if (!confirmed) return;
    setEditError('');
    setEditSuccess('');
    try {
      const updated = await deactivateFrameworkRequirement(selectedRequirement.id);
      setSelectedRequirement(updated);
      setRequirementView('inactive');
      setEditSuccess('Requirement deactivated.');
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Could not deactivate requirement.');
    }
  };

  const handleDeleteRequirement = async () => {
    if (!selectedRequirement) return;
    const confirmed = window.confirm('Delete Requirement?\n\nOnly requirements with no linked evidence, criteria, reviews, actions, or competency history can be deleted. If deletion is blocked, archive the requirement instead.');
    if (!confirmed) return;
    setEditError('');
    setEditSuccess('');
    try {
      await deleteFrameworkRequirement(selectedRequirement.id);
      setSelectedRequirement(null);
      setEditSuccess('Requirement deleted.');
    } catch (error) {
      setEditError(`${error instanceof Error ? error.message : 'Could not delete requirement.'} Archive instead to preserve history.`);
    }
  };

  const handleLinkDocument = async () => {
    if (!selectedRequirement || !linkingDocumentId) return;
    await linkDocumentToRequirement(selectedRequirement.id, linkingDocumentId);
    setLinkingDocumentId('');
  };

  const handleUnlinkDocument = async (documentId: string) => {
    if (!selectedRequirement) return;
    await unlinkDocumentFromRequirement(selectedRequirement.id, documentId);
  };

  const handleLinkCompetencyType = async () => {
    if (!selectedRequirement || !linkingCompetencyTypeId) return;
    await linkCompetencyTypeToRequirement(selectedRequirement.id, linkingCompetencyTypeId);
    setLinkingCompetencyTypeId('');
  };

  const handleUnlinkCompetencyType = async (competencyTypeId: string) => {
    if (!selectedRequirement) return;
    await unlinkCompetencyTypeFromRequirement(selectedRequirement.id, competencyTypeId);
  };

  const handleCreateCriterion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRequirement || !criterionTitle.trim()) return;
    await upsertRequirementEvidenceCriterion({
      requirement_id: selectedRequirement.id,
      title: criterionTitle.trim(),
      description: null,
      evidence_type: criterionEvidenceType.trim() || criterionTitle.trim(),
      is_required: criterionRequired,
      weight: 1,
      minimum_count: Math.max(Number(criterionMinimumCount) || 1, 1),
      frequency: selectedRequirement.review_frequency,
      coverage_period: null,
      validity_required: criterionValidityRequired
    });
    setCriterionTitle('');
    setCriterionEvidenceType('');
    setCriterionRequired(true);
    setCriterionValidityRequired(true);
    setCriterionMinimumCount('1');
  };

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequirement || !actionTitle.trim()) return;

    await createActionForRequirement(selectedRequirement.id, {
      title: actionTitle.trim(),
      description: actionDescription.trim() || null,
      owner: actionOwner.trim() || null,
      due_date: actionDueDate || null,
      status: 'Open'
    });

    setShowAddActionForm(false);
    setActionTitle('');
    setActionDescription('');
    setActionOwner('');
    setActionDueDate('');
  };

  const toggleTemplateItem = (key: string) => {
    const next = new Set(selectedTemplateKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedTemplateKeys(next);
  };

  const handleImportPack = async () => {
    if (!selectedPack) return;
    const selectedItems = selectedPack.requirements.filter(item => selectedTemplateKeys.has(templateKey(item.title, item.category)));
    if (selectedItems.length === 0) return;

    setIsImporting(true);
    setImportMessage('');
    try {
      const created = await importRequirementTemplateItems(selectedItems);
      setImportMessage(`Imported ${created.length} requirement${created.length === 1 ? '' : 's'}.`);
      setSelectedTemplateKeys(new Set());
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : 'Template import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  const handlePackChange = (packId: string) => {
    const pack = REQUIREMENT_TEMPLATE_PACKS.find(item => item.id === packId);
    setSelectedPackId(packId);
    setSelectedTemplateKeys(
      new Set(
        (pack?.requirements || [])
          .filter(item => !existingRequirementKeys.has(templateKey(item.title, item.category)))
          .map(item => templateKey(item.title, item.category))
      )
    );
    setImportMessage('');
  };

  const applyRequirementBulkMetadata = async () => {
    if (selectedBulkRequirements.length === 0) return;
    const updates: Partial<Requirement> = {};
    if (bulkRequirementCategory) updates.category = bulkRequirementCategory;
    if (bulkRequirementOwner.trim()) updates.owner = bulkRequirementOwner.trim();
    if (bulkRequirementStatus) updates.status = bulkRequirementStatus as RequirementStatus;
    if (bulkRequirementRisk) updates.risk_level = bulkRequirementRisk as Requirement['risk_level'];
    if (bulkRequirementReviewDate) updates.next_due_date = bulkRequirementReviewDate;
    if (Object.keys(updates).length === 0) {
      setBulkMessage('Choose at least one requirement bulk edit value before applying.');
      return;
    }
    if (!window.confirm(`Apply changes to ${selectedBulkRequirements.length} requirement(s)? Existing requirement update logging will be used.`)) return;
    setLastRequirementUndo({ label: 'Undo requirement bulk edit', requirements: selectedBulkRequirements });
    try {
      for (const requirement of selectedBulkRequirements) {
        await updateFrameworkRequirement(requirement.id, updates);
      }
      requirementSelection.clearSelection();
      setBulkRequirementCategory('');
      setBulkRequirementOwner('');
      setBulkRequirementStatus('');
      setBulkRequirementRisk('');
      setBulkRequirementReviewDate('');
      setBulkMessage(`Updated ${selectedBulkRequirements.length} requirement(s).`);
    } catch (error) {
      setBulkMessage(error instanceof Error ? error.message : 'Bulk requirement update failed.');
    }
  };

  const applyRequirementBulkLifecycle = async () => {
    if (selectedBulkRequirements.length === 0) return;
    const action = requirementView === 'archive' || requirementView === 'inactive' ? 'restore' : 'archive';
    if (!window.confirm(`${action === 'restore' ? 'Restore' : 'Archive'} ${selectedBulkRequirements.length} selected requirement(s)?`)) return;
    setLastRequirementUndo({ label: 'Undo requirement lifecycle bulk action', requirements: selectedBulkRequirements });
    try {
      for (const requirement of selectedBulkRequirements) {
        if (action === 'restore') await restoreFrameworkRequirement(requirement.id);
        else await archiveFrameworkRequirement(requirement.id);
      }
      requirementSelection.clearSelection();
      setBulkMessage(action === 'restore' ? `Restored ${selectedBulkRequirements.length} requirement(s).` : `Archived ${selectedBulkRequirements.length} requirement(s).`);
    } catch (error) {
      setBulkMessage(error instanceof Error ? error.message : 'Bulk requirement lifecycle action failed.');
    }
  };

  const undoRequirementBulkAction = async () => {
    if (!lastRequirementUndo) return;
    if (!window.confirm(`Restore previous values for ${lastRequirementUndo.requirements.length} requirement(s)?`)) return;
    try {
      for (const requirement of lastRequirementUndo.requirements) {
        await updateFrameworkRequirement(requirement.id, {
          title: requirement.title,
          description: requirement.description || null,
          category: requirement.category,
          owner: requirement.owner || null,
          risk_level: requirement.risk_level,
          status: requirement.status,
          review_frequency: requirement.review_frequency,
          review_date: requirement.review_date || null,
          next_due_date: requirement.next_due_date || null,
          notes: requirement.notes || null,
          lifecycle_status: requirement.lifecycle_status || 'ACTIVE',
          archived_at: requirement.archived_at || null,
          archived_by: requirement.archived_by || null,
          deactivated_at: requirement.deactivated_at || null,
          deactivated_by: requirement.deactivated_by || null
        });
      }
      setLastRequirementUndo(null);
      setBulkMessage('Previous requirement values restored.');
    } catch (error) {
      setBulkMessage(error instanceof Error ? error.message : 'Requirement undo failed.');
    }
  };

  const applyActionBulkUpdate = async () => {
    if (selectedBulkActions.length === 0) return;
    const updates: Partial<Action> = {};
    if (bulkActionStatus) {
      updates.status = bulkActionStatus as ActionStatus;
      if (bulkActionStatus === 'Complete') updates.completion_note = 'Completed by bulk action.';
      if (bulkActionStatus === 'Cancelled') updates.cancellation_note = 'Cancelled by bulk action.';
    }
    if (bulkActionDueDate) {
      updates.due_date = bulkActionDueDate;
      updates.target_due_date = bulkActionDueDate;
    }
    if (Object.keys(updates).length === 0) {
      setBulkMessage('Choose at least one action bulk edit value before applying.');
      return;
    }
    if (!window.confirm(`Apply changes to ${selectedBulkActions.length} action(s)? Existing action history and audit logging will be used.`)) return;
    setLastActionUndo({ label: 'Undo action bulk edit', actions: selectedBulkActions });
    try {
      for (const action of selectedBulkActions) {
        await updateAction(action.id, updates);
      }
      actionSelection.clearSelection();
      setBulkActionStatus('');
      setBulkActionDueDate('');
      setBulkMessage(`Updated ${selectedBulkActions.length} action(s).`);
    } catch (error) {
      setBulkMessage(error instanceof Error ? error.message : 'Bulk action update failed.');
    }
  };

  const undoActionBulkAction = async () => {
    if (!lastActionUndo) return;
    if (!window.confirm(`Restore previous values for ${lastActionUndo.actions.length} action(s)?`)) return;
    try {
      for (const action of lastActionUndo.actions) {
        await updateAction(action.id, {
          status: action.status,
          owner: action.owner || null,
          due_date: action.due_date || null,
          target_due_date: action.target_due_date || null,
          status_changed_at: action.status_changed_at || null,
          status_changed_by: action.status_changed_by || null,
          closed_at: action.closed_at || null,
          closed_by: action.closed_by || null,
          completion_note: action.completion_note || null,
          cancellation_note: action.cancellation_note || null
        });
      }
      setLastActionUndo(null);
      setBulkMessage('Previous action values restored.');
    } catch (error) {
      setBulkMessage(error instanceof Error ? error.message : 'Action undo failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Requirements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Standards-agnostic operating requirements, evidence links, reviews, and actions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              const pack = REQUIREMENT_TEMPLATE_PACKS.find(item => item.id === selectedPackId) || REQUIREMENT_TEMPLATE_PACKS[0];
              const existingKeys = new Set(frameworkRequirements.filter(r => lifecycleLabel(r.lifecycle_status) !== 'DELETED').map(r => `${r.title.trim().toLowerCase()}::${r.category.trim().toLowerCase()}`));
              setSelectedTemplateKeys(new Set(pack.requirements.filter(item => !existingKeys.has(`${item.title.trim().toLowerCase()}::${item.category.trim().toLowerCase()}`)).map(item => `${item.title.trim().toLowerCase()}::${item.category.trim().toLowerCase()}`)));
              setShowImportModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-semibold rounded-lg"
          >
            <Download className="w-4 h-4" /> Import Template Pack
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/15"
          >
            <Plus className="w-4 h-4" /> Add Requirement
          </button>
        </div>
      </div>

      <div className="flex bg-muted p-1 border border-border rounded-xl w-full sm:max-w-xl shadow-xs">
        {([
          ['active', `Active (${frameworkRequirements.filter(requirement => lifecycleLabel(requirement.lifecycle_status) === 'ACTIVE').length})`],
          ['actions', `Actions Registry (${actions.filter(a => a.status === 'Open' || a.status === 'In Progress').length} Open)`],
          ['archive', `Archive (${frameworkRequirements.filter(requirement => requirement.lifecycle_status === 'ARCHIVED').length})`],
          ['inactive', `Inactive (${frameworkRequirements.filter(requirement => requirement.lifecycle_status === 'DEACTIVATED').length})`]
        ] as [RequirementView, string][]).map(([view, label]) => (
          <button
            key={view}
            onClick={() => { setRequirementView(view); setSelectedRequirement(null); setSelectedStatus('All'); }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold text-center transition-all ${
              requirementView === view
                ? 'bg-card text-foreground shadow-xs border border-border/40'
                : 'text-muted-foreground hover:text-foreground hover:bg-card'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {requirementView === 'actions' ? (
          (['Open', 'In Progress', 'Complete', 'Cancelled'] as ActionStatus[]).map(status => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status as any)}
              className={`text-left bg-card border border-border rounded-xl p-4 hover:bg-muted/30 transition-colors ${(selectedStatus as any) === status ? 'ring-2 ring-indigo-500/40' : ''}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{status} Actions</span>
              <span className="block text-3xl font-extrabold mt-1">
                {actions.filter(action => action.status === status).length}
              </span>
            </button>
          ))
        ) : (
          (['GREEN', 'AMBER', 'RED', 'GREY'] as RequirementStatus[]).map(status => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`text-left bg-card border border-border rounded-xl p-4 hover:bg-muted/30 transition-colors ${selectedStatus === status ? 'ring-2 ring-indigo-500/40' : ''}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{status} Requirements</span>
              <span className="block text-3xl font-extrabold mt-1">
                {assessedRequirements.filter(requirement => requirement.status === status).length}
              </span>
            </button>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        <div className="xl:col-span-2 space-y-4">
          {/* Advanced Filter Ribbon Controls */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                {/* Search and Toggle Filter Button */}
                <div className="flex items-center gap-2 w-full md:max-w-md">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={search}
                      onChange={event => setSearch(event.target.value)}
                      placeholder="Search requirements..."
                      className="w-full pl-9 pr-4 py-2 bg-muted border border-border/80 rounded-lg text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-1.5 px-3 py-2 bg-muted hover:bg-muted/80 border border-border font-bold text-xs rounded-lg cursor-pointer transition-colors ${showFilters ? 'ring-2 ring-indigo-500/40' : ''}`}
                  >
                    <Filter className="w-4 h-4 text-indigo-500" />
                    <span>Filters</span>
                  </button>

                  {/* Category Manager Dropdown inline */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
                      className="bg-muted hover:bg-muted/80 border border-border rounded-lg px-3 py-2 text-xs text-foreground font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Category Manager</span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>

                    {isCatDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsCatDropdownOpen(false)} />
                        <div className="absolute right-0 mt-1 w-64 bg-card solid-panel border border-border rounded-xl shadow-xl z-50 p-3 space-y-2.5">
                          {categoryMessage && (
                            <div className={`p-1.5 text-[10px] font-semibold border rounded-lg text-center animate-fade-in ${
                              categoryMessage.toLowerCase().includes('could not') || categoryMessage.toLowerCase().includes('failed')
                                ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {categoryMessage}
                            </div>
                          )}
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={catSearchQuery}
                              onChange={(e) => setCatSearchQuery(e.target.value)}
                              placeholder="Search or add category..."
                              className="w-full pl-8 pr-3 py-1.5 bg-muted border border-border rounded-lg text-xs outline-none focus:border-indigo-500 transition-colors"
                              autoFocus
                            />
                          </div>

                          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                            {filteredCatOptions.length === 0 ? (
                              <p className="text-[10px] text-muted-foreground italic text-center py-2">No matching categories.</p>
                            ) : (
                              filteredCatOptions.map(catName => {
                                const isSelected = selectedCategory === catName;
                                const customCatObj = requirementCategories.find(c => c.name === catName && !c.is_system && c.active);
                                return (
                                  <div
                                    key={catName}
                                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                                      isSelected ? 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 font-bold' : 'hover:bg-muted text-foreground'
                                    }`}
                                    onClick={() => {
                                      setSelectedCategory(catName);
                                      setIsCatDropdownOpen(false);
                                      setCatSearchQuery('');
                                    }}
                                  >
                                    <span className="truncate flex-1">{catName}</span>
                                    {customCatObj && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void handleArchiveRequirementCategory(customCatObj.id);
                                        }}
                                        className="text-muted-foreground hover:text-rose-500 p-0.5 rounded hover:bg-muted-foreground/10 transition-colors shrink-0 cursor-pointer"
                                        title="Archive custom category"
                                      >
                                        <Archive className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {catSearchQuery.trim() && !filteredCatOptions.some(c => c.toLowerCase() === catSearchQuery.trim().toLowerCase()) && (
                            <div className="border-t border-border pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  void handleCreateRequirementCategory(catSearchQuery.trim());
                                  setIsCatDropdownOpen(false);
                                  setCatSearchQuery('');
                                }}
                                className="w-full py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 transition-colors animate-fade-in cursor-pointer"
                              >
                                <Plus className="w-3 h-3" /> Create Category &quot;{catSearchQuery.trim()}&quot;
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Density and Column Visibility Toggles */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <ColumnVisibilityControls
                    columns={columnsOptions}
                    onToggleColumn={handleToggleColumn}
                    onToggleAll={handleToggleAllColumns}
                  />

                  <div className="flex items-center bg-muted border border-border rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setDensity('comfortable')}
                      className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        density === 'comfortable' ? 'bg-card text-foreground shadow-xs border border-border/50' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Comfortable
                    </button>
                    <button
                      type="button"
                      onClick={() => setDensity('compact')}
                      className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
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
                <div className="border-t border-border/60 pt-4 space-y-3">
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
                      label="Owner"
                      value={ownerFilter}
                      onChange={setOwnerFilter}
                      options={sortedOwners}
                      isStarred={(opt) => isFavourite(`owner:${opt}`)}
                      onToggleStar={(opt) => toggleFavourite(`owner:${opt}`)}
                      allLabel="All Owners"
                    />
                    <StarredFilterSelect
                      label="Status"
                      value={selectedStatus}
                      onChange={(val) => setSelectedStatus(val as 'All' | 'Attention' | RequirementStatus)}
                      options={['All', 'Attention', 'GREEN', 'AMBER', 'RED', 'GREY']}
                      isStarred={(opt) => isFavourite(`status:${opt}`)}
                      onToggleStar={(opt) => toggleFavourite(`status:${opt}`)}
                      allLabel="All Statuses"
                    />
                    <StarredFilterSelect
                      label="Risk Level"
                      value={riskFilter}
                      onChange={setRiskFilter}
                      options={['All', 'Low', 'Medium', 'High', 'Critical']}
                      isStarred={(opt) => isFavourite(`risk:${opt}`)}
                      onToggleStar={(opt) => toggleFavourite(`risk:${opt}`)}
                      allLabel="All Risks"
                    />
                  </div>

                  {/* Second Row of Filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <StarredFilterSelect
                      label="Due Date Filter"
                      value={radarFilter}
                      onChange={setRadarFilter}
                      options={['All', 'overdue', 'due-week', 'due30', 'due60', 'due90', 'actions']}
                      isStarred={(opt) => isFavourite(`radar:${opt}`)}
                      onToggleStar={(opt) => toggleFavourite(`radar:${opt}`)}
                      allLabel="No Date Filter"
                    />
                  </div>

                  {/* Quick Toggles */}
                  <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-border/40 text-xs">
                    <label className="flex items-center gap-2 font-semibold text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showOnlyFavourites}
                        onChange={e => setShowOnlyFavourites(e.target.checked)}
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

              {/* Active filter chips */}
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

              {/* Result Count Summary */}
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-1">
                {requirementView === 'actions' ? (
                  `Filtered Results: ${filteredActions.length} / ${actions.length} actions`
                ) : (
                  `Filtered Results: ${filteredRequirements.length} / ${assessedRequirements.length} requirements`
                )}
              </div>
            </div>
          </div>

          {bulkMessage && (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              {bulkMessage}
            </div>
          )}

          {requirementView === 'actions' ? (
            <>
              <BulkSelectionToolbar
                selectedCount={actionSelection.selectedCount}
                recordLabel="action(s)"
                onSelectVisible={actionSelection.selectVisible}
                onClear={actionSelection.clearSelection}
                message="Bulk status changes create normal action history entries."
              >
                <select value={bulkActionStatus} onChange={event => setBulkActionStatus(event.target.value)} className="px-2.5 py-1.5 bg-card border border-border rounded-lg font-bold text-foreground outline-none">
                  <option value="">Status...</option>
                  {(['Open', 'In Progress', 'Complete', 'Cancelled'] as ActionStatus[]).map(status => <option key={status} value={status}>{status}</option>)}
                </select>
                <label className="flex items-center gap-1 font-bold text-foreground">
                  Due
                  <input type="date" value={bulkActionDueDate} onChange={event => setBulkActionDueDate(event.target.value)} className="px-2 py-1.5 bg-card border border-border rounded-lg outline-none" />
                </label>
                <button type="button" onClick={applyActionBulkUpdate} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer">
                  Apply action edit
                </button>
                {lastActionUndo && (
                  <button type="button" onClick={undoActionBulkAction} className="px-3 py-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg font-bold cursor-pointer">
                    {lastActionUndo.label}
                  </button>
                )}
              </BulkSelectionToolbar>
              <PaginationControls
                pageSize={actionPagination.pageSize}
                onPageSizeChange={actionPagination.setPageSize}
                currentPage={actionPagination.currentPage}
                totalPages={actionPagination.totalPages}
                totalItems={actionPagination.totalItems}
                startItem={actionPagination.startItem}
                endItem={actionPagination.endItem}
                onPageChange={actionPagination.setCurrentPage}
                itemLabel="actions"
              />
            </>
          ) : (
            <>
              <BulkSelectionToolbar
                selectedCount={requirementSelection.selectedCount}
                recordLabel="requirement(s)"
                onSelectVisible={requirementSelection.selectVisible}
                onClear={requirementSelection.clearSelection}
                message="Permanent deletion is not available in bulk; archive is the safe lifecycle action."
              >
                <select value={bulkRequirementCategory} onChange={event => setBulkRequirementCategory(event.target.value)} className="px-2.5 py-1.5 bg-card border border-border rounded-lg font-bold text-foreground outline-none">
                  <option value="">Category...</option>
                  {requirementCategoryOptions.map(category => <option key={category} value={category}>{category}</option>)}
                </select>
                <input value={bulkRequirementOwner} onChange={event => setBulkRequirementOwner(event.target.value)} placeholder="Owner..." className="px-2.5 py-1.5 bg-card border border-border rounded-lg font-bold text-foreground outline-none w-28" />
                <select value={bulkRequirementStatus} onChange={event => setBulkRequirementStatus(event.target.value)} className="px-2.5 py-1.5 bg-card border border-border rounded-lg font-bold text-foreground outline-none">
                  <option value="">RAG...</option>
                  {requirementStatusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
                <select value={bulkRequirementRisk} onChange={event => setBulkRequirementRisk(event.target.value)} className="px-2.5 py-1.5 bg-card border border-border rounded-lg font-bold text-foreground outline-none">
                  <option value="">Risk...</option>
                  {riskOptions.map(risk => <option key={risk} value={risk}>{risk}</option>)}
                </select>
                <label className="flex items-center gap-1 font-bold text-foreground">
                  Next review
                  <input type="date" value={bulkRequirementReviewDate} onChange={event => setBulkRequirementReviewDate(event.target.value)} className="px-2 py-1.5 bg-card border border-border rounded-lg outline-none" />
                </label>
                <button type="button" onClick={applyRequirementBulkMetadata} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer">
                  Apply requirement edit
                </button>
                <button type="button" onClick={applyRequirementBulkLifecycle} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold cursor-pointer">
                  {requirementView === 'archive' || requirementView === 'inactive' ? 'Restore selected' : 'Archive selected'}
                </button>
                {lastRequirementUndo && (
                  <button type="button" onClick={undoRequirementBulkAction} className="px-3 py-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg font-bold cursor-pointer">
                    {lastRequirementUndo.label}
                  </button>
                )}
              </BulkSelectionToolbar>
              <PaginationControls
                pageSize={requirementPagination.pageSize}
                onPageSizeChange={requirementPagination.setPageSize}
                currentPage={requirementPagination.currentPage}
                totalPages={requirementPagination.totalPages}
                totalItems={requirementPagination.totalItems}
                startItem={requirementPagination.startItem}
                endItem={requirementPagination.endItem}
                onPageChange={requirementPagination.setCurrentPage}
                itemLabel="requirements"
              />
            </>
          )}

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            {requirementView === 'actions' ? (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider">
                    <th className={`${density === 'compact' ? 'p-2.5 py-2' : 'p-4'} w-10`}>
                      <input
                        type="checkbox"
                        checked={actionSelection.allVisibleSelected}
                        onChange={event => {
                          if (event.target.checked) actionSelection.selectVisible();
                          else actionSelection.clearSelection();
                        }}
                        className="rounded border-border text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 bg-muted/40 cursor-pointer"
                        aria-label="Select visible actions"
                      />
                    </th>
                    <th className={`${density === 'compact' ? 'p-2.5 py-2' : 'p-4'} font-bold uppercase tracking-wider`}>Action Item</th>
                    <th className={`${density === 'compact' ? 'p-2.5 py-2' : 'p-4'} font-bold uppercase tracking-wider`}>Linked Requirement</th>
                    <th className={`${density === 'compact' ? 'p-2.5 py-2' : 'p-4'} font-bold uppercase tracking-wider`}>Owner</th>
                    <th className={`${density === 'compact' ? 'p-2.5 py-2' : 'p-4'} font-bold uppercase tracking-wider`}>Due Date</th>
                    <th className={`${density === 'compact' ? 'p-2.5 py-2' : 'p-4'} text-center font-bold uppercase tracking-wider`}>Status</th>
                    <th className={`${density === 'compact' ? 'p-2.5 py-2' : 'p-4'} font-bold uppercase tracking-wider`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredActions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No actions match the active filters.
                      </td>
                    </tr>
                  ) : (
                    actionPagination.paginatedItems.map(action => {
                      const linkedReqs = frameworkRequirements.filter(req =>
                        requirementActions.some(link => link.action_id === action.id && link.requirement_id === req.id)
                      );
                      const actionDueDate = action.target_due_date || action.due_date;
                      const isOverdue = actionDueDate && new Date(actionDueDate) < new Date() && (action.status === 'Open' || action.status === 'In Progress');
                      const paddingClass = density === 'compact' ? 'p-2 py-1.5' : 'p-4';

                      return (
                        <tr
                          key={action.id}
                          onClick={() => setSelectedAction(action)}
                          className={`hover:bg-muted/50 cursor-pointer transition-colors border-l-2 ${
                            selectedAction?.id === action.id
                              ? 'bg-indigo-500/5 border-l-indigo-600'
                              : actionSelection.isSelected(action.id)
                                ? 'bg-indigo-500/5 border-l-indigo-400'
                                : 'border-l-transparent'
                          }`}
                        >
                          <td className={paddingClass} onClick={event => event.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={actionSelection.isSelected(action.id)}
                              onChange={() => actionSelection.toggleSelected(action.id)}
                              className="rounded border-border text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 bg-muted/40 cursor-pointer"
                              aria-label={`Select ${action.title}`}
                            />
                          </td>
                          <td className={`${paddingClass} font-bold`}>
                            <div>
                              <span className="block text-foreground text-xs">{action.title}</span>
                              {action.description && <span className="block text-[10px] text-muted-foreground font-normal line-clamp-1 mt-0.5">{action.description}</span>}
                            </div>
                          </td>
                          <td className={`${paddingClass} text-muted-foreground font-semibold max-w-[200px] truncate`}>
                            {linkedReqs.length === 0 ? (
                              <span className="text-muted-foreground/60 italic text-[10px]">No linked requirement</span>
                            ) : (
                              linkedReqs.map(r => r.title).join(', ')
                            )}
                          </td>
                          <td className={`${paddingClass} text-muted-foreground font-semibold`}>
                            {action.owner || 'Unassigned'}
                          </td>
                          <td className={`${paddingClass} text-muted-foreground font-semibold`}>
                            <span className={isOverdue ? 'text-rose-500 font-bold' : ''}>
                              {actionDueDate || 'Not set'}
                            </span>
                          </td>
                          <td className={`${paddingClass} text-center`}>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border leading-none shadow-xs ${
                              action.status === 'Complete' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                              action.status === 'Cancelled' ? 'bg-zinc-500/10 border-zinc-500/20 text-zinc-600 dark:text-zinc-400' :
                              action.status === 'In Progress' ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400' :
                              'bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-400'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                action.status === 'Complete' ? 'bg-emerald-500' :
                                action.status === 'Cancelled' ? 'bg-zinc-400' :
                                action.status === 'In Progress' ? 'bg-amber-500' :
                                'bg-indigo-500'
                              }`} />
                              {action.status}
                            </span>
                          </td>
                          <td className={paddingClass}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAction(action);
                              }}
                              className="px-2 py-1 rounded bg-indigo-650 hover:bg-indigo-700 text-white text-[10px] font-bold cursor-pointer"
                            >
                              Edit/Update
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider">
                    <th className={`${density === 'compact' ? 'p-2.5 py-2' : 'p-4'} w-10`}>
                      <input
                        type="checkbox"
                        checked={requirementSelection.allVisibleSelected}
                        onChange={event => {
                          if (event.target.checked) requirementSelection.selectVisible();
                          else requirementSelection.clearSelection();
                        }}
                        className="rounded border-border text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 bg-muted/40 cursor-pointer"
                        aria-label="Select visible requirements"
                      />
                    </th>
                    {columnsOptions.map(col => {
                      if (!col.visible) return null;
                      return (
                        <th
                          key={col.id}
                          className={`${density === 'compact' ? 'p-2.5 py-2' : 'p-4'} ${col.id === 'status' ? 'text-center' : ''} font-bold uppercase tracking-wider`}
                        >
                          {col.title}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredRequirements.length === 0 ? (
                    <tr>
                      <td colSpan={1 + columnsOptions.filter(c => c.visible).length} className="p-8 text-center text-muted-foreground">
                        {frameworkRequirements.length === 0
                          ? 'No requirements yet. Import a template pack to create a practical starter set for this organisation.'
                          : 'No requirements match the current filters.'}
                      </td>
                    </tr>
                  ) : (
                    requirementPagination.paginatedItems.map(requirement => {
                      const lastReview = reviews
                        .filter(review => review.requirement_id === requirement.id)
                        .sort((a, b) => new Date(b.review_date).getTime() - new Date(a.review_date).getTime())[0];
                      const actionCount = requirementActions.filter(link => link.requirement_id === requirement.id).length;
                      const coverage = coverageChip(requirement.evidenceCoverage);
                      const paddingClass = density === 'compact' ? 'p-2 py-1.5' : 'p-4';
                      return (
                        <tr
                          key={requirement.id}
                          onClick={() => selectRequirement(requirement)}
                          className={`hover:bg-muted/50 cursor-pointer transition-colors border-l-2 ${
                            selectedRequirement?.id === requirement.id
                              ? 'bg-indigo-500/5 border-l-indigo-600'
                              : requirementSelection.isSelected(requirement.id)
                                ? 'bg-indigo-500/5 border-l-indigo-400'
                              : 'border-l-transparent'
                          }`}
                        >
                          <td className={paddingClass} onClick={event => event.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={requirementSelection.isSelected(requirement.id)}
                              onChange={() => requirementSelection.toggleSelected(requirement.id)}
                              className="rounded border-border text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 bg-muted/40 cursor-pointer"
                              aria-label={`Select ${requirement.title}`}
                            />
                          </td>
                          {columnsOptions.map(col => {
                            if (!col.visible) return null;
                            switch (col.id) {
                              case 'title':
                                return (
                                  <td key="title" className={`${paddingClass} font-bold`}>
                                    <div className="flex items-center justify-between gap-1.5">
                                      <span className="truncate">{requirement.title}</span>
                                      <FilterFavouriteButton
                                        isStarred={isFavourite(`req:${requirement.id}`)}
                                        onToggle={() => toggleFavourite(`req:${requirement.id}`)}
                                      />
                                    </div>
                                  </td>
                                );
                              case 'category':
                                return (
                                  <td key="category" className={`${paddingClass} text-muted-foreground font-semibold`}>
                                    {requirement.category}
                                  </td>
                                );
                              case 'owner':
                                return (
                                  <td key="owner" className={`${paddingClass} text-muted-foreground font-semibold`}>
                                    {requirement.owner || 'Unassigned'}
                                  </td>
                                );
                              case 'status':
                                return (
                                  <td key="status" className={`${paddingClass} text-center`}>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border leading-none shadow-xs ${statusClass(requirement.status)}`}>
                                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                        requirement.status === 'GREEN' ? 'bg-emerald-500' :
                                        requirement.status === 'AMBER' ? 'bg-amber-500' :
                                        requirement.status === 'RED' ? 'bg-rose-500' :
                                        'bg-zinc-400 dark:bg-zinc-500'
                                      }`} />
                                      {requirement.status}
                                    </span>
                                  </td>
                                );
                              case 'due_date':
                                return (
                                  <td key="due_date" className={`${paddingClass} text-muted-foreground font-semibold`}>
                                    {requirementView === 'archive'
                                      ? (requirement.archived_at ? new Date(requirement.archived_at).toLocaleDateString() : 'Not recorded')
                                      : requirementView === 'inactive'
                                        ? (requirement.deactivated_at ? new Date(requirement.deactivated_at).toLocaleDateString() : 'Not recorded')
                                        : (requirement.next_due_date || 'Not set')}
                                  </td>
                                );
                              case 'coverage':
                                return (
                                  <td key="coverage" className={`${paddingClass} text-muted-foreground font-semibold max-w-[150px]`}>
                                    <span
                                      title={coverage.title}
                                      className={`inline-flex max-w-full items-center justify-center whitespace-nowrap truncate px-2 py-1 rounded border text-[10px] font-bold ${coverage.className}`}
                                    >
                                      {coverage.label}
                                    </span>
                                  </td>
                                );
                              case 'linked_docs':
                                return (
                                  <td key="linked_docs" className={`${paddingClass} text-muted-foreground font-semibold`}>
                                    {requirement.linkedDocuments.length}
                                  </td>
                                );
                              case 'actions':
                                return (
                                  <td key="actions" className={`${paddingClass} text-muted-foreground font-semibold`}>
                                    {requirementView === 'active' ? actionCount : (
                                      <button
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setSelectedRequirement(requirement);
                                          void restoreFrameworkRequirement(requirement.id);
                                          setRequirementView('active');
                                        }}
                                        className="px-2 py-1 rounded bg-indigo-650 text-white text-[10px] font-bold cursor-pointer"
                                      >
                                        Restore
                                      </button>
                                    )}
                                  </td>
                                );
                              case 'last_review':
                                return (
                                  <td key="last_review" className={`${paddingClass} text-muted-foreground font-semibold`}>
                                    {lastReview?.review_date || 'None'}
                                  </td>
                                );
                              default:
                                return null;
                            }
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm sticky top-24">
          {selectedAssessed ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-border/60 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Requirement Detail</span>
                  <h2 className="text-base font-extrabold">{selectedAssessed.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditRequirement(selectedAssessed)}
                    className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 border border-border rounded-md text-[10px] font-bold"
                  >
                    Edit Requirement
                  </button>
                  <button onClick={() => selectRequirement(null)} className="p-1 hover:bg-muted rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {(editError || editSuccess) && (
                <div className={`p-2.5 rounded-lg border text-[11px] ${
                  editError
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
                }`}>
                  {editError || editSuccess}
                </div>
              )}

              {isEditingRequirement ? (
                <form onSubmit={handleSaveRequirementEdit} className="p-3 bg-muted/30 border border-border/70 rounded-lg space-y-3 text-[11px]">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Title</label>
                    <input
                      required
                      value={editTitle}
                      onChange={event => setEditTitle(event.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={event => setEditDescription(event.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Category</label>
                      <select
                        value={editCategory}
                        onChange={event => setEditCategory(event.target.value)}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none"
                      >
                        {requirementCategoryOptions.map(category => <option key={category} value={category}>{category}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Owner</label>
                      <input
                        value={editOwner}
                        onChange={event => setEditOwner(event.target.value)}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Risk</label>
                      <select value={editRisk} onChange={event => setEditRisk(event.target.value as Requirement['risk_level'])} className="w-full px-2 py-2 bg-muted border border-border rounded-lg outline-none">
                        {riskOptions.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Status</label>
                      <select value={editStatus} onChange={event => setEditStatus(event.target.value as RequirementStatus)} className="w-full px-2 py-2 bg-muted border border-border rounded-lg outline-none">
                        {requirementStatusOptions.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Frequency</label>
                      <select value={editFrequency} onChange={event => setEditFrequency(event.target.value as Requirement['review_frequency'])} className="w-full px-2 py-2 bg-muted border border-border rounded-lg outline-none">
                        {frequencyOptions.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Last Review Date</label>
                      <input
                        type="date"
                        value={editReviewDate}
                        onChange={event => setEditReviewDate(event.target.value)}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Next / Target Due Date</label>
                      <input
                        type="date"
                        value={editNextDueDate}
                        onChange={event => setEditNextDueDate(event.target.value)}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Notes</label>
                    <textarea
                      value={editNotes}
                      onChange={event => setEditNotes(event.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setIsEditingRequirement(false); setEditError(''); }}
                      disabled={isSavingRequirement}
                      className="w-1/2 py-2 bg-muted hover:bg-muted/80 border border-border rounded-lg font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={isSavingRequirement || !editTitle.trim()}
                      className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white rounded-lg font-bold"
                    >
                      {isSavingRequirement ? 'Saving...' : 'Save Requirement'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-bold">{selectedAssessed.category}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><span className="font-bold">{selectedAssessed.owner || 'Unassigned'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Risk</span><span className="font-bold">{selectedAssessed.risk_level}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Lifecycle</span><span className="font-bold">{lifecycleLabel(selectedAssessed.lifecycle_status)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">Stored Status</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border leading-none ${statusClass(selectedAssessed.status)}`}>
                      <span className={`h-1 w-1 rounded-full shrink-0 ${
                        selectedAssessed.status === 'GREEN' ? 'bg-emerald-500' :
                        selectedAssessed.status === 'AMBER' ? 'bg-amber-500' :
                        selectedAssessed.status === 'RED' ? 'bg-rose-500' :
                        'bg-zinc-400 dark:bg-zinc-500'
                      }`} />
                      {selectedAssessed.status}
                    </span>
                  </div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Review Frequency</span><span className="font-bold">{selectedAssessed.review_frequency}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Last Review</span><span className="font-bold">{selectedAssessed.review_date || 'Not set'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Next / Target Due</span><span className="font-bold">{selectedAssessed.next_due_date || 'Not set'}</span></div>
                  <p className="text-muted-foreground leading-relaxed pt-2">{selectedAssessed.description || 'No description added.'}</p>
                  {selectedAssessed.notes && (
                    <div className="pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Notes</span>
                      <p className="text-muted-foreground leading-relaxed mt-1">{selectedAssessed.notes}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-border/60 pt-4 space-y-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Lifecycle Management</span>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Archived and deactivated requirements are retained for history but excluded from readiness scoring and audit packs.
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                  {lifecycleLabel(selectedAssessed.lifecycle_status) === 'ACTIVE' ? (
                    <>
                      <button onClick={handleArchiveRequirement} className="py-2 rounded-lg bg-muted hover:bg-muted/80 border border-border">Archive</button>
                      <button onClick={handleDeactivateRequirement} className="py-2 rounded-lg bg-muted hover:bg-muted/80 border border-border">Deactivate</button>
                    </>
                  ) : (
                    <button onClick={handleRestoreRequirement} className="col-span-2 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">Restore to Active</button>
                  )}
                  <button onClick={handleDeleteRequirement} className="col-span-2 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-rose-600 dark:text-rose-300">
                    Delete if Safe
                  </button>
                </div>
              </div>

              <div className="border-t border-border/60 pt-4 space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Evidence Coverage</span>
                  <p className="text-xs font-bold mt-1">{selectedReadiness?.evidenceCoverage.summary || 'Not assessed'}</p>
                  {selectedReadiness?.evidenceCoverage.bestCoverageDate && (
                    <p className="text-[10px] text-muted-foreground mt-1">Best coverage date: {selectedReadiness.evidenceCoverage.bestCoverageDate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Evidence Criteria</span>
                  {selectedReadiness?.evidenceCoverage.criteria.length === 0 ? (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-muted-foreground">
                      No criteria configured. Legacy requirement-document links are shown below but do not make this requirement fully covered.
                    </div>
                  ) : (
                    selectedReadiness?.evidenceCoverage.criteria.map(result => (
                      <div key={result.criterion.id} className="p-3 bg-muted/30 border border-border rounded-lg text-[11px] space-y-2">
                        <div className="flex justify-between gap-3">
                          <div className="min-w-0">
                            <span className="font-extrabold block truncate">{result.criterion.title}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {result.criterion.is_required ? 'Required' : 'Optional'} | {result.criterion.evidence_type || 'Evidence'} | Min {result.criterion.minimum_count}
                            </span>
                          </div>
                          <span className={`px-2 py-1 h-fit rounded border text-[9px] font-bold uppercase ${
                            result.status === 'Fully Covered'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : result.status === 'Partially Covered'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          }`}>
                            {result.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{result.reasons[0]}</p>
                        {result.matchedDocuments.length > 0 && (
                          <div className="space-y-1">
                            {result.matchedDocuments.map(document => (
                              <div key={document.id} className="flex items-center justify-between gap-2 bg-background/60 border border-border/60 rounded px-2 py-1">
                                <span className="truncate font-semibold">{document.title}</span>
                                <button onClick={() => unlinkDocumentFromEvidenceCriterion(result.criterion.id, document.id)} className="text-rose-500 font-bold">Unlink</button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex gap-2">
                            <select
                              value={criterionLinkingDocumentId[result.criterion.id] || ''}
                              onChange={event => setCriterionLinkingDocumentId(prev => ({ ...prev, [result.criterion.id]: event.target.value }))}
                              className="min-w-0 flex-1 px-2 py-1.5 bg-muted border border-border rounded-md text-[11px]"
                            >
                              <option value="">Link document</option>
                              {documents.map(document => (
                                <option key={document.id} value={document.id}>{document.title}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                const documentId = criterionLinkingDocumentId[result.criterion.id];
                                if (documentId) void linkDocumentToEvidenceCriterion(result.criterion.id, documentId);
                              }}
                              disabled={!criterionLinkingDocumentId[result.criterion.id]}
                              className="px-2 bg-indigo-600 disabled:bg-indigo-600/40 text-white rounded-md"
                            >
                              <LinkIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <EvidenceDropzone
                            label="Upload criterion evidence"
                            helperText="Uploaded files are saved as private Evidence Vault records and linked to this criterion."
                            buttonLabel="Upload"
                            compact
                            multiple
                            onUpload={async (file, updateStatus) => {
                              updateStatus('saving record');
                              const doc = await uploadEvidenceForCriterion(result.criterion.id, file, selectedRequirement?.category || 'Evidence');
                              updateStatus('linking');
                              return doc;
                            }}
                            findDuplicates={findPossibleDuplicateDocuments}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setActionTitle(`Provide evidence for: ${result.criterion.title}`);
                              setActionDescription(`Evidence criterion "${result.criterion.title}" is not covered.`);
                              setShowAddActionForm(true);
                            }}
                            className="text-[10px] text-indigo-500 font-bold hover:underline"
                          >
                            Create missing evidence action
                          </button>
                          <button onClick={() => deleteRequirementEvidenceCriterion(result.criterion.id)} className="text-[10px] text-rose-500 font-bold hover:underline">
                            Delete criterion
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleCreateCriterion} className="p-3 bg-muted/20 border border-border rounded-lg space-y-2 text-[11px]">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Add Criterion</span>
                  <input value={criterionTitle} onChange={event => setCriterionTitle(event.target.value)} placeholder="Criterion title" className="w-full px-2 py-1.5 bg-muted border border-border rounded outline-none" />
                  <input value={criterionEvidenceType} onChange={event => setCriterionEvidenceType(event.target.value)} placeholder="Evidence type" className="w-full px-2 py-1.5 bg-muted border border-border rounded outline-none" />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" min="1" value={criterionMinimumCount} onChange={event => setCriterionMinimumCount(event.target.value)} className="px-2 py-1.5 bg-muted border border-border rounded outline-none" />
                    <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <input type="checkbox" checked={criterionRequired} onChange={event => setCriterionRequired(event.target.checked)} /> Required
                    </label>
                    <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <input type="checkbox" checked={criterionValidityRequired} onChange={event => setCriterionValidityRequired(event.target.checked)} /> Dated
                    </label>
                  </div>
                  <button disabled={!criterionTitle.trim()} className="w-full py-1.5 bg-indigo-600 disabled:bg-indigo-600/40 text-white rounded font-bold">Add Criterion</button>
                </form>
              </div>

              <div className="border-t border-border/60 pt-4 space-y-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Linked Documents</span>
                {selectedAssessed.linkedDocuments.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic">No records linked yet.</p>
                ) : (
                  selectedAssessed.linkedDocuments.map(document => (
                    <div key={document.id} className="p-2 bg-muted/40 rounded-lg flex justify-between items-center gap-2 text-[11px]">
                      <span className="font-bold truncate">{document.title}</span>
                      <button onClick={() => handleUnlinkDocument(document.id)} className="text-rose-500 font-bold">Unlink</button>
                    </div>
                  ))
                )}
                <div className="flex gap-2">
                  <select
                    value={linkingDocumentId}
                    onChange={event => setLinkingDocumentId(event.target.value)}
                    className="min-w-0 flex-1 px-2 py-1.5 bg-muted border border-border rounded-md text-[11px]"
                  >
                    <option value="">Select existing record</option>
                    {documents.map(document => (
                      <option key={document.id} value={document.id}>{document.title}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleLinkDocument}
                    disabled={!linkingDocumentId}
                    className="px-2.5 py-1.5 bg-indigo-600 disabled:bg-indigo-600/40 text-white rounded-md"
                    title="Link document"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="border-t border-border/60 pt-4 space-y-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Linked Competency Types</span>
                {selectedCompetencyTypes.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic">No competency types linked to this requirement.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCompetencyTypes.map(type => {
                      const signal = selectedReadiness?.competencySignals.find(item => item.competencyType.id === type.id);
                      return (
                        <div key={type.id} className="p-2 bg-muted/40 rounded-lg text-[11px] space-y-1">
                          <div className="flex justify-between gap-2">
                            <span className="font-bold truncate">{type.title}</span>
                            <button onClick={() => handleUnlinkCompetencyType(type.id)} className="text-rose-500 font-bold">Unlink</button>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{signal?.message || `${type.category} competency linked.`}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-2">
                  <select
                    value={linkingCompetencyTypeId}
                    onChange={event => setLinkingCompetencyTypeId(event.target.value)}
                    className="min-w-0 flex-1 px-2 py-1.5 bg-muted border border-border rounded-md text-[11px]"
                  >
                    <option value="">Select competency type</option>
                    {competencyTypes
                      .filter(type => !selectedCompetencyTypeLinks.some(link => link.competency_type_id === type.id))
                      .map(type => (
                        <option key={type.id} value={type.id}>{type.title}</option>
                      ))}
                  </select>
                  <button
                    onClick={handleLinkCompetencyType}
                    disabled={!linkingCompetencyTypeId}
                    className="px-2.5 py-1.5 bg-indigo-600 disabled:bg-indigo-600/40 text-white rounded-md"
                    title="Link competency type"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="border-t border-border/60 pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Requirement Actions</span>
                  <button
                    onClick={() => setShowAddActionForm(!showAddActionForm)}
                    className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {showAddActionForm ? 'Cancel' : '+ Add Action'}
                  </button>
                </div>

                {showAddActionForm && (
                  <form onSubmit={handleCreateAction} className="p-3 bg-muted/50 rounded-lg border border-border/80 space-y-2 text-[11px]">
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Title</label>
                      <input
                        required
                        value={actionTitle}
                        onChange={e => setActionTitle(e.target.value)}
                        placeholder="e.g. Verify exhaust values"
                        className="w-full px-2 py-1.5 bg-muted border border-border rounded text-[11px] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Description (Optional)</label>
                      <textarea
                        value={actionDescription}
                        onChange={e => setActionDescription(e.target.value)}
                        placeholder="Add some details..."
                        rows={2}
                        className="w-full px-2 py-1.5 bg-muted border border-border rounded text-[11px] outline-none resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Owner / Assignee</label>
                        <input
                          value={actionOwner}
                          onChange={e => setActionOwner(e.target.value)}
                          placeholder="e.g. Stephen Gray"
                          className="w-full px-2 py-1.5 bg-muted border border-border rounded text-[11px] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Due Date</label>
                        <input
                          type="date"
                          value={actionDueDate}
                          onChange={e => setActionDueDate(e.target.value)}
                          className="w-full px-2 py-1.5 bg-muted border border-border rounded text-[11px] outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded"
                    >
                      Save Action
                    </button>
                  </form>
                )}

                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Active Actions</span>
                  {activeActions.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground italic pl-1">No active actions.</p>
                  ) : (
                    activeActions.map(action => (
                      <button
                        key={action.id}
                        onClick={() => setSelectedAction(action)}
                        className="w-full text-left p-3 bg-muted/40 border border-border/40 rounded-lg text-[11px] space-y-2 hover:bg-muted/60 transition-colors"
                      >
                        <span className="font-bold block text-foreground">{action.title}</span>
                        {action.description && <span className="text-muted-foreground text-[10px] block mt-0.5 leading-normal">{action.description}</span>}
                        <span className="flex flex-wrap justify-between items-center gap-2 text-[10px] text-muted-foreground font-medium pt-1">
                          <span>Owner: <strong className="text-foreground">{action.owner || 'Unassigned'}</strong></span>
                          <span>Due: <strong className="text-foreground">{action.target_due_date || action.due_date || 'No date'}</strong></span>
                          <span className={`px-1.5 py-0.5 text-[9px] rounded font-bold uppercase ${
                            action.status === 'In Progress' ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-500'
                          }`}>
                            {action.status}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Completed / Cancelled Actions</span>
                  {completedOrCancelledActions.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground italic pl-1">No completed or cancelled actions.</p>
                  ) : (
                    completedOrCancelledActions.map(action => (
                      <button
                        key={action.id}
                        onClick={() => setSelectedAction(action)}
                        className="w-full text-left p-3 bg-muted/20 border border-border/30 rounded-lg text-[11px] space-y-2 hover:bg-muted/40 transition-colors"
                      >
                        <span className="font-bold block text-muted-foreground">{action.title}</span>
                        <span className="flex flex-wrap justify-between items-center gap-2 text-[10px] text-muted-foreground font-medium pt-1">
                          <span>Owner: <strong className="text-foreground">{action.owner || 'Unassigned'}</strong></span>
                          <span>Closed: <strong className="text-foreground">{action.closed_at || action.completed_at || action.cancelled_at ? new Date(action.closed_at || action.completed_at || action.cancelled_at || '').toLocaleDateString() : 'Not recorded'}</strong></span>
                          <span className={`px-1.5 py-0.5 text-[9px] rounded font-bold uppercase ${
                            action.status === 'Complete' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {action.status}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="border-t border-border/60 pt-4 space-y-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Review History</span>
                {selectedReviews.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic">No reviews recorded.</p>
                ) : (
                  selectedReviews.map(review => (
                    <div key={review.id} className="p-2 bg-muted/40 rounded-lg text-[11px]">
                      <span className="font-bold block">{review.review_date} - {review.status}</span>
                      <span className="text-muted-foreground">{review.notes || 'No notes'}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-border/60 pt-4 space-y-2 text-[10px] text-muted-foreground">
                <span className="font-bold uppercase tracking-widest block">Status History</span>
                <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                  <span>Current calculated status:</span>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded-full border leading-none ${statusClass(selectedAssessed.status)}`}>
                    <span className={`h-1 w-1 rounded-full shrink-0 ${
                      selectedAssessed.status === 'GREEN' ? 'bg-emerald-500' :
                      selectedAssessed.status === 'AMBER' ? 'bg-amber-500' :
                      selectedAssessed.status === 'RED' ? 'bg-rose-500' :
                      'bg-zinc-400 dark:bg-zinc-500'
                    }`} />
                    {selectedAssessed.status}
                  </span>
                </div>
                <span className="font-bold uppercase tracking-widest block pt-2">Notes</span>
                <p>Notes are captured through review entries and action descriptions.</p>
              </div>
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center text-center text-muted-foreground gap-3 border border-dashed border-border rounded-xl bg-muted/10 p-6">
              <ClipboardList className="w-10 h-10 text-muted-foreground/30" />
              <span className="text-xs font-bold text-foreground block">Select a Requirement</span>
              <p className="text-[10px] max-w-[200px] leading-normal">
                Choose a row from the list to inspect linked evidence, add action items, and view review logs.
              </p>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card solid-panel border border-border w-full max-w-lg rounded-2xl p-6 relative shadow-2xl">
            <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 p-1 hover:bg-muted rounded">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 border-b border-border/60 pb-3 mb-5">
              <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-foreground">Add Requirement</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Create a generic operating requirement.</p>
              </div>
            </div>

            <form onSubmit={handleCreateRequirement} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Title</label>
                <input required value={newTitle} onChange={event => setNewTitle(event.target.value)} className="w-full px-3 py-2 bg-muted border border-border/80 rounded-lg outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Category</label>
                  <select value={newCategory} onChange={event => setNewCategory(event.target.value)} className="w-full px-3 py-2 bg-muted border border-border/80 rounded-lg outline-none">
                    {requirementCategoryOptions.map(category => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Owner</label>
                  <input value={newOwner} onChange={event => setNewOwner(event.target.value)} className="w-full px-3 py-2 bg-muted border border-border/80 rounded-lg outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Frequency</label>
                  <select value={newFrequency} onChange={event => setNewFrequency(event.target.value as Requirement['review_frequency'])} className="w-full px-3 py-2 bg-muted border border-border/80 rounded-lg outline-none">
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annually">Annually</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Risk</label>
                  <select value={newRisk} onChange={event => setNewRisk(event.target.value as Requirement['risk_level'])} className="w-full px-3 py-2 bg-muted border border-border/80 rounded-lg outline-none">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Next Due</label>
                  <input type="date" value={newNextDue} onChange={event => setNewNextDue(event.target.value)} className="w-full px-3 py-2 bg-muted border border-border/80 rounded-lg outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Description</label>
                <textarea value={newDescription} onChange={event => setNewDescription(event.target.value)} rows={3} className="w-full px-3 py-2 bg-muted border border-border/80 rounded-lg outline-none resize-none" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg">
                Create Requirement
              </button>
            </form>
          </div>
        </div>
      )}

      {showImportModal && selectedPack && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card solid-panel border border-border w-full max-w-5xl rounded-2xl p-6 relative shadow-2xl max-h-[88vh] overflow-hidden flex flex-col">
            <button onClick={() => setShowImportModal(false)} className="absolute top-4 right-4 p-1 hover:bg-muted rounded">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 border-b border-border/60 pb-3 mb-5">
              <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-foreground">Import Template Pack</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Preview and choose generic starter requirements before importing.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
              <div className="space-y-2 overflow-y-auto pr-1">
                {REQUIREMENT_TEMPLATE_PACKS.map(pack => (
                  <button
                    key={pack.id}
                    onClick={() => handlePackChange(pack.id)}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition-colors ${
                      selectedPackId === pack.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-border bg-muted/20 hover:bg-muted/40'
                    }`}
                  >
                    <span className="font-extrabold block">{pack.name}</span>
                    <span className="text-[10px] text-muted-foreground leading-relaxed block mt-1">{pack.description}</span>
                  </button>
                ))}
              </div>

              <div className="lg:col-span-2 min-h-0 flex flex-col">
                <div className="flex justify-between items-center gap-3 mb-3">
                  <div>
                    <h4 className="text-sm font-extrabold">{selectedPack.name}</h4>
                    <p className="text-[11px] text-muted-foreground">{selectedPack.requirements.length} starter requirements</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedTemplateKeys(new Set(
                        selectedPack.requirements
                          .filter(item => !existingRequirementKeys.has(templateKey(item.title, item.category)))
                          .map(item => templateKey(item.title, item.category))
                      ))}
                      className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 border border-border rounded text-[10px] font-bold"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedTemplateKeys(new Set())}
                      className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 border border-border rounded text-[10px] font-bold"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="border border-border rounded-xl overflow-y-auto divide-y divide-border/60 min-h-0">
                  {selectedPack.requirements.map(item => {
                    const key = templateKey(item.title, item.category);
                    const isDuplicate = existingRequirementKeys.has(key);
                    const isSelected = selectedTemplateKeys.has(key);
                    return (
                      <label key={key} className={`block p-3 text-xs ${isDuplicate ? 'opacity-55' : 'hover:bg-muted/30'}`}>
                        <div className="flex gap-3 items-start">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isDuplicate}
                            onChange={() => toggleTemplateItem(key)}
                            className="mt-1"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-extrabold">{item.title}</span>
                              {isDuplicate && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px] font-bold uppercase">
                                  Already present
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-[10px] text-muted-foreground">
                              <span>Category: <strong className="text-foreground">{item.category}</strong></span>
                              <span>Owner: <strong className="text-foreground">{item.suggested_owner}</strong></span>
                              <span>Review: <strong className="text-foreground">{item.review_frequency}</strong></span>
                              <span>Risk: <strong className="text-foreground">{item.risk_level}</strong></span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2">
                              Evidence: {item.suggested_evidence_types.join(', ')}
                            </p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {importMessage && (
                  <div className="mt-3 p-2.5 rounded-lg border border-border bg-muted/30 text-[11px] text-muted-foreground">
                    {importMessage}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 border border-border rounded-lg text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportPack}
                    disabled={isImporting || selectedTemplateKeys.size === 0}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white rounded-lg text-xs font-bold"
                  >
                    {isImporting ? 'Importing...' : `Import ${selectedTemplateKeys.size} Selected`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <ActionDetailDrawer
        action={currentSelectedAction}
        requirements={selectedActionRequirements}
        documents={documents}
        actionUpdates={actionUpdates}
        actionDocuments={actionDocuments}
        onClose={() => setSelectedAction(null)}
        onUpdateAction={updateAction}
        onAddUpdate={addActionUpdate}
        onLinkDocument={linkDocumentToAction}
        onUnlinkDocument={unlinkDocumentFromAction}
        onUploadAttachment={uploadActionAttachment}
        onOpenDocument={getDocumentSignedUrl}
        onFindDuplicates={findPossibleDuplicateDocuments}
      />
    </div>
  );
}
