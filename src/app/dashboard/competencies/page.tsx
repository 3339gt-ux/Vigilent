'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ActionDetailDrawer } from '@/components/ActionDetailDrawer';
import { buildCompetencyMatrix } from '@/lib/competencyEngine';
import { COMPETENCY_TEMPLATE_PACKS } from '@/lib/competencyTemplates';
import { evidenceAcceptAttribute, formatMaxEvidenceUploadSize } from '@/lib/evidenceStorage';
import type { Action, CompetencyCategory, CompetencyRecord, CompetencyStatus, CompetencyType, Person, PersonType, RequirementRiskLevel } from '@/lib/types';
import { Link as LinkIcon, Plus, Search, Upload, UserCheck, X, ArrowLeft, Calendar, Paperclip, AlertCircle, Eye, EyeOff } from 'lucide-react';
import {
  useFilterFavourites,
  useSavedViews,
  FilterFavouriteButton,
  ActiveFilterChips,
  SavedViewsBar,
  ColumnVisibilityControls,
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

const categories: CompetencyCategory[] = [
  'Safety',
  'Equipment & Vehicle',
  'Transport',
  'Security',
  'Quality & Compliance',
  'Environmental',
  'Operational',
  'Professional',
  'Industry Certification',
  'Other'
];
const personTypes: PersonType[] = ['Employee', 'Contractor', 'Agency', 'Driver', 'Visitor', 'Consultant', 'Other'];
const riskLevels: RequirementRiskLevel[] = ['Low', 'Medium', 'High', 'Critical'];
const statusOptions: CompetencyStatus[] = ['Valid', 'Expiring Soon', 'Expired', 'Missing', 'Not Required'];

const statusClass = (status: CompetencyStatus) => {
  if (status === 'Valid') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  if (status === 'Expiring Soon') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  if (status === 'Expired' || status === 'Missing') return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
  return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
};

type ActiveCell = {
  person: Person;
  competencyType: CompetencyType;
  record: CompetencyRecord | null;
};

export default function CompetencyMatrixPage() {
  const {
    user,
    organization,
    people,
    competencyTypes,
    competencyRecords,
    competencyRecordDocuments,
    documents,
    actionObjectLinks,
    actions,
    actionUpdates,
    actionDocuments,
    frameworkRequirements,
    competencySummary,
    upsertPerson,
    upsertCompetencyType,
    importCompetencyTemplateItems,
    upsertCompetencyRecord,
    linkDocumentToCompetencyRecord,
    unlinkDocumentFromCompetencyRecord,
    uploadCompetencyEvidence,
    createActionForCompetencyGap,
    updateAction,
    addActionUpdate,
    linkDocumentToAction,
    unlinkDocumentFromAction,
    uploadActionAttachment,
    findPossibleDuplicateDocuments,
    getDocumentSignedUrl
  } = useApp();

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Premium filtering and sorting states
  const [roleFilter, setRoleFilter] = useState('All');
  const [personTypeFilter, setPersonTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showOnlyMissingExpired, setShowOnlyMissingExpired] = useState(false);
  const [showOnlyExpiringSoon, setShowOnlyExpiringSoon] = useState(false);
  const [showOnlyFavourites, setShowOnlyFavourites] = useState(false);
  const [showOnlyPeopleWithGaps, setShowOnlyPeopleWithGaps] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [workspaceSearch, setWorkspaceSearch] = useState('');
  const [workspaceStatusFilter, setWorkspaceStatusFilter] = useState<'All' | CompetencyStatus>('All');
  const [isEditingPerson, setIsEditingPerson] = useState(false);
  const [isSavingPerson, setIsSavingPerson] = useState(false);
  const [personFormMessage, setPersonFormMessage] = useState('');
  const [personForm, setPersonForm] = useState({
    first_name: '',
    last_name: '',
    employee_number: '',
    email: '',
    department: '',
    role: '',
    person_type: 'Employee' as PersonType,
    active: true,
    start_date: '',
    end_date: '',
    notes: ''
  });
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [selectedPackId, setSelectedPackId] = useState(COMPETENCY_TEMPLATE_PACKS[0]?.id || '');
  const [importMessage, setImportMessage] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [recordForm, setRecordForm] = useState({
    completed_date: '',
    expiry_date: '',
    trainer: '',
    provider: '',
    certificate_number: '',
    status: 'Valid' as CompetencyStatus,
    notes: ''
  });
  const [linkDocumentId, setLinkDocumentId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isEvidenceDragging, setIsEvidenceDragging] = useState(false);
  const [bulkPersonActive, setBulkPersonActive] = useState('');
  const [bulkPersonDepartment, setBulkPersonDepartment] = useState('');
  const [bulkPersonRole, setBulkPersonRole] = useState('');
  const [bulkPersonType, setBulkPersonType] = useState('');
  const [bulkWorkspaceStatus, setBulkWorkspaceStatus] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');
  const [lastPeopleUndo, setLastPeopleUndo] = useState<null | { label: string; people: Person[] }>(null);
  const [lastCompetencyUndo, setLastCompetencyUndo] = useState<null | {
    label: string;
    rows: Array<{ typeId: string; record: CompetencyRecord | null }>;
  }>(null);

  // Starred / favourite options persistence
  const { favourites, toggleFavourite, isFavourite, clearFavourites } = useFilterFavourites(user?.id || 'guest', 'matrix', organization?.id);

  // Saved Views System
  const defaultViews: SavedView[] = [
    {
      id: 'missing-evidence',
      name: 'Missing Evidence',
      filters: { statusFilter: 'Missing' }
    },
    {
      id: 'expired-training',
      name: 'Expired Training',
      filters: { statusFilter: 'Expired' }
    },
    {
      id: 'expiring-soon',
      name: 'Expiring Soon',
      filters: { statusFilter: 'Expiring Soon' }
    },
    {
      id: 'high-gaps',
      name: 'High Gaps',
      filters: { showOnlyPeopleWithGaps: true, sortBy: 'gaps' }
    },
    {
      id: 'my-favourites',
      name: 'My Favourites',
      filters: { showOnlyFavourites: true }
    }
  ];

  const {
    allViews,
    activeViewId,
    setActiveViewId,
    saveCurrentView,
    deleteCustomView
  } = useSavedViews(user?.id || 'guest', 'matrix', defaultViews, organization?.id);
  const { globalDensity, setGlobalDensity } = useGlobalDensityPreference(user?.id || 'guest', organization?.id);

  const activePeople = useMemo(() => people.filter(person => person.active), [people]);
  const activeTypes = useMemo(() => competencyTypes.filter(type => type.active), [competencyTypes]);
  const departments = useMemo(() => ['All', ...Array.from(new Set(activePeople.map(person => person.department).filter(Boolean) as string[]))], [activePeople]);
  const roles = useMemo(() => ['All', ...Array.from(new Set(activePeople.map(person => person.role).filter(Boolean) as string[]))], [activePeople]);
  const selectedPack = COMPETENCY_TEMPLATE_PACKS.find(pack => pack.id === selectedPackId) || COMPETENCY_TEMPLATE_PACKS[0];

  const matrix = useMemo(
    () => buildCompetencyMatrix(people, competencyTypes, competencyRecords),
    [competencyRecords, competencyTypes, people]
  );

  // Sorting and Favourites for Dropdowns
  const sortedDepartments = useMemo(() => {
    const list = departments.filter(d => d !== 'All');
    const starred = list.filter(d => isFavourite(`dept:${d}`));
    const regular = list.filter(d => !isFavourite(`dept:${d}`));
    return ['All', ...starred, ...regular];
  }, [departments, favourites]);

  const sortedRoles = useMemo(() => {
    const list = roles.filter(r => r !== 'All');
    const starred = list.filter(r => isFavourite(`role:${r}`));
    const regular = list.filter(r => !isFavourite(`role:${r}`));
    return ['All', ...starred, ...regular];
  }, [roles, favourites]);

  const sortedCompetencyCategories = useMemo(() => {
    const starred = categories.filter(c => isFavourite(`cat:${c}`));
    const regular = categories.filter(c => !isFavourite(`cat:${c}`));
    return [...starred, ...regular];
  }, [favourites]);

  // Filtering People
  const filteredPeople = useMemo(() => {
    return activePeople.filter(person => {
      const text = `${person.display_name} ${person.department || ''} ${person.role || ''} ${person.person_type}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const matchesDept = departmentFilter === 'All' || person.department === departmentFilter;
      const matchesRole = roleFilter === 'All' || person.role === roleFilter;
      const matchesType = personTypeFilter === 'All' || person.person_type === personTypeFilter;

      // Matrix cells for this person
      const personCells = matrix.filter(item => item.person.id === person.id);

      // Filter by status if selected
      const matchesStatus = statusFilter === 'All' || personCells.some(cell => {
        const status = cell.status || 'Missing';
        return status === statusFilter;
      });

      // Show only missing/expired
      const hasMissingExpired = personCells.some(cell => {
        const status = cell.status || 'Missing';
        return status === 'Missing' || status === 'Expired';
      });
      const matchesMissingExpired = !showOnlyMissingExpired || hasMissingExpired;

      // Show only expiring soon
      const hasExpiringSoon = personCells.some(cell => {
        const status = cell.status || 'Missing';
        return status === 'Expiring Soon';
      });
      const matchesExpiringSoon = !showOnlyExpiringSoon || hasExpiringSoon;

      // Show only people with gaps
      const matchesGaps = !showOnlyPeopleWithGaps || hasMissingExpired;

      return matchesSearch && matchesDept && matchesRole && matchesType && matchesStatus && matchesMissingExpired && matchesExpiringSoon && matchesGaps;
    });
  }, [activePeople, search, departmentFilter, roleFilter, personTypeFilter, statusFilter, showOnlyMissingExpired, showOnlyExpiringSoon, showOnlyPeopleWithGaps, matrix]);

  // Sorting People
  const sortedPeople = useMemo(() => {
    const list = [...filteredPeople];
    if (sortBy === 'name') {
      list.sort((a, b) => a.display_name.localeCompare(b.display_name));
    } else if (sortBy === 'department') {
      list.sort((a, b) => (a.department || '').localeCompare(b.department || ''));
    } else if (sortBy === 'gaps') {
      list.sort((a, b) => {
        const countA = matrix.filter(cell => cell.person.id === a.id && (cell.status === 'Missing' || cell.status === 'Expired')).length;
        const countB = matrix.filter(cell => cell.person.id === b.id && (cell.status === 'Missing' || cell.status === 'Expired')).length;
        return countB - countA;
      });
    } else if (sortBy === 'expired') {
      list.sort((a, b) => {
        const countA = matrix.filter(cell => cell.person.id === a.id && cell.status === 'Expired').length;
        const countB = matrix.filter(cell => cell.person.id === b.id && cell.status === 'Expired').length;
        return countB - countA;
      });
    } else if (sortBy === 'expiring') {
      list.sort((a, b) => {
        const countA = matrix.filter(cell => cell.person.id === a.id && cell.status === 'Expiring Soon').length;
        const countB = matrix.filter(cell => cell.person.id === b.id && cell.status === 'Expiring Soon').length;
        return countB - countA;
      });
    }
    return list;
  }, [filteredPeople, sortBy, matrix]);

  const peoplePagination = usePagination(
    sortedPeople,
    user?.id || 'guest',
    organization?.id,
    'competency-people',
    [search, departmentFilter, roleFilter, personTypeFilter, statusFilter, showOnlyMissingExpired, showOnlyExpiringSoon, showOnlyPeopleWithGaps, sortBy]
  );
  const peopleSelection = useBulkSelection(peoplePagination.paginatedItems);
  const selectedBulkPeople = sortedPeople.filter(person => peopleSelection.selectedIds.has(person.id));

  // Filtering Competency Columns
  const filteredTypes = useMemo(() => {
    return activeTypes.filter(type => {
      const matchesCategory = typeFilter === 'All' || type.category === typeFilter;
      const matchesFavourite = !showOnlyFavourites || isFavourite(`comp:${type.id}`);
      const isNotHidden = !hiddenColumns.includes(type.id);
      return matchesCategory && matchesFavourite && isNotHidden;
    });
  }, [activeTypes, typeFilter, showOnlyFavourites, hiddenColumns, favourites]);

  // Group and sort visible types by category to align them visually
  const visibleTypes = useMemo(() => {
    const list = filteredTypes.filter(t => !collapsedCategories.includes(t.category));
    list.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
    return list;
  }, [filteredTypes, collapsedCategories]);

  // Calculate spans for visible categories for the table header row
  const categorySpans = useMemo(() => {
    const spans: { category: string; span: number }[] = [];
    let currentCategory = '';
    let currentSpan = 0;

    visibleTypes.forEach(t => {
      if (t.category !== currentCategory) {
        if (currentSpan > 0) {
          spans.push({ category: currentCategory, span: currentSpan });
        }
        currentCategory = t.category;
        currentSpan = 1;
      } else {
        currentSpan++;
      }
    });
    if (currentSpan > 0) {
      spans.push({ category: currentCategory, span: currentSpan });
    }
    return spans;
  }, [visibleTypes]);

  const handleResetFilters = () => {
    setSearch('');
    setDepartmentFilter('All');
    setRoleFilter('All');
    setPersonTypeFilter('All');
    setTypeFilter('All');
    setStatusFilter('All');
    setShowOnlyMissingExpired(false);
    setShowOnlyExpiringSoon(false);
    setShowOnlyFavourites(false);
    setShowOnlyPeopleWithGaps(false);
    setActiveViewId(null);
  };

  const handleSelectView = (view: SavedView | null) => {
    if (view === null) {
      handleResetFilters();
      setActiveViewId(null);
    } else {
      const f = view.filters;
      setSearch(f.search || '');
      setDepartmentFilter(f.departmentFilter || 'All');
      setRoleFilter(f.roleFilter || 'All');
      setPersonTypeFilter(f.personTypeFilter || 'All');
      setTypeFilter(f.typeFilter || 'All');
      setStatusFilter(f.statusFilter || 'All');
      setShowOnlyMissingExpired(!!f.showOnlyMissingExpired);
      setShowOnlyExpiringSoon(!!f.showOnlyExpiringSoon);
      setShowOnlyFavourites(!!f.showOnlyFavourites);
      setShowOnlyPeopleWithGaps(!!f.showOnlyPeopleWithGaps);
      if (f.sortBy) {
        setSortBy(f.sortBy);
      }
      setActiveViewId(view.id);
    }
  };

  const handleSaveView = (name: string) => {
    const filters = {
      search,
      departmentFilter,
      roleFilter,
      personTypeFilter,
      typeFilter,
      statusFilter,
      showOnlyMissingExpired,
      showOnlyExpiringSoon,
      showOnlyFavourites,
      showOnlyPeopleWithGaps,
      sortBy
    };
    saveCurrentView(name, filters);
  };

  const isViewModified = useMemo(() => {
    if (!activeViewId) return false;
    const activeView = allViews.find(v => v.id === activeViewId);
    if (!activeView) return false;
    const f = activeView.filters;

    const searchMatch = (f.search || '') === search;
    const deptMatch = (f.departmentFilter || 'All') === departmentFilter;
    const roleMatch = (f.roleFilter || 'All') === roleFilter;
    const pTypeMatch = (f.personTypeFilter || 'All') === personTypeFilter;
    const catMatch = (f.typeFilter || 'All') === typeFilter;
    const statusMatch = (f.statusFilter || 'All') === statusFilter;
    const missExpMatch = (!!f.showOnlyMissingExpired) === showOnlyMissingExpired;
    const expSoonMatch = (!!f.showOnlyExpiringSoon) === showOnlyExpiringSoon;
    const favMatch = (!!f.showOnlyFavourites) === showOnlyFavourites;
    const gapsMatch = (!!f.showOnlyPeopleWithGaps) === showOnlyPeopleWithGaps;
    const sortMatch = (!f.sortBy) || f.sortBy === sortBy;

    return !(searchMatch && deptMatch && roleMatch && pTypeMatch && catMatch && statusMatch && missExpMatch && expSoonMatch && favMatch && gapsMatch && sortMatch);
  }, [
    activeViewId,
    allViews,
    search,
    departmentFilter,
    roleFilter,
    personTypeFilter,
    typeFilter,
    statusFilter,
    showOnlyMissingExpired,
    showOnlyExpiringSoon,
    showOnlyFavourites,
    showOnlyPeopleWithGaps,
    sortBy
  ]);

  const { storageKey: competenciesViewStateKey } = usePersistentViewState(
    user?.id || 'guest',
    organization?.id,
    'competency-matrix',
    {
      search,
      departmentFilter,
      roleFilter,
      personTypeFilter,
      typeFilter,
      statusFilter,
      showOnlyMissingExpired,
      showOnlyExpiringSoon,
      showOnlyFavourites,
      showOnlyPeopleWithGaps,
      sortBy,
      density,
      collapsedCategories,
      hiddenColumns,
      activeViewId
    },
    stored => {
      if (typeof stored.search === 'string') setSearch(stored.search);
      if (typeof stored.departmentFilter === 'string') setDepartmentFilter(stored.departmentFilter);
      if (typeof stored.roleFilter === 'string') setRoleFilter(stored.roleFilter);
      if (typeof stored.personTypeFilter === 'string') setPersonTypeFilter(stored.personTypeFilter);
      if (typeof stored.typeFilter === 'string') setTypeFilter(stored.typeFilter);
      if (typeof stored.statusFilter === 'string') setStatusFilter(stored.statusFilter);
      if (typeof stored.showOnlyMissingExpired === 'boolean') setShowOnlyMissingExpired(stored.showOnlyMissingExpired);
      if (typeof stored.showOnlyExpiringSoon === 'boolean') setShowOnlyExpiringSoon(stored.showOnlyExpiringSoon);
      if (typeof stored.showOnlyFavourites === 'boolean') setShowOnlyFavourites(stored.showOnlyFavourites);
      if (typeof stored.showOnlyPeopleWithGaps === 'boolean') setShowOnlyPeopleWithGaps(stored.showOnlyPeopleWithGaps);
      if (typeof stored.sortBy === 'string') setSortBy(stored.sortBy);
      if (stored.density === 'comfortable' || stored.density === 'compact') setDensity(stored.density);
      if (Array.isArray(stored.collapsedCategories)) setCollapsedCategories(stored.collapsedCategories.filter((item): item is string => typeof item === 'string'));
      if (Array.isArray(stored.hiddenColumns)) setHiddenColumns(stored.hiddenColumns.filter((item): item is string => typeof item === 'string'));
      if (typeof stored.activeViewId === 'string' || stored.activeViewId === null) setActiveViewId(stored.activeViewId);
    },
    [
      search,
      departmentFilter,
      roleFilter,
      personTypeFilter,
      typeFilter,
      statusFilter,
      showOnlyMissingExpired,
      showOnlyExpiringSoon,
      showOnlyFavourites,
      showOnlyPeopleWithGaps,
      sortBy,
      density,
      collapsedCategories,
      hiddenColumns,
      activeViewId
    ]
  );

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = JSON.parse(localStorage.getItem(competenciesViewStateKey) || '{}');
      if (!stored.density) setDensity(globalDensity);
    } catch {
      setDensity(globalDensity);
    }
  }, [globalDensity, competenciesViewStateKey]);

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
    if (departmentFilter !== 'All') {
      chips.push({
        key: 'dept',
        label: 'Department',
        valueLabel: departmentFilter,
        onClear: () => setDepartmentFilter('All')
      });
    }
    if (roleFilter !== 'All') {
      chips.push({
        key: 'role',
        label: 'Role',
        valueLabel: roleFilter,
        onClear: () => setRoleFilter('All')
      });
    }
    if (personTypeFilter !== 'All') {
      chips.push({
        key: 'personType',
        label: 'Employment Type',
        valueLabel: personTypeFilter,
        onClear: () => setPersonTypeFilter('All')
      });
    }
    if (typeFilter !== 'All') {
      chips.push({
        key: 'category',
        label: 'Competency Category',
        valueLabel: typeFilter,
        onClear: () => setTypeFilter('All')
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
    if (showOnlyMissingExpired) {
      chips.push({
        key: 'missingExpired',
        label: 'Show Only',
        valueLabel: 'Missing/Expired',
        onClear: () => setShowOnlyMissingExpired(false)
      });
    }
    if (showOnlyExpiringSoon) {
      chips.push({
        key: 'expiringSoon',
        label: 'Show Only',
        valueLabel: 'Expiring Soon',
        onClear: () => setShowOnlyExpiringSoon(false)
      });
    }
    if (showOnlyFavourites) {
      chips.push({
        key: 'favourites',
        label: 'Show Only',
        valueLabel: 'Starred Competencies',
        onClear: () => setShowOnlyFavourites(false)
      });
    }
    if (showOnlyPeopleWithGaps) {
      chips.push({
        key: 'gaps',
        label: 'Show Only',
        valueLabel: 'People with Gaps',
        onClear: () => setShowOnlyPeopleWithGaps(false)
      });
    }
    return chips;
  }, [
    search,
    departmentFilter,
    roleFilter,
    personTypeFilter,
    typeFilter,
    statusFilter,
    showOnlyMissingExpired,
    showOnlyExpiringSoon,
    showOnlyFavourites,
    showOnlyPeopleWithGaps
  ]);

  const columnOptions = useMemo(() => {
    return activeTypes.map(type => ({
      id: type.id,
      title: type.title,
      visible: !hiddenColumns.includes(type.id)
    }));
  }, [activeTypes, hiddenColumns]);

  const handleToggleColumn = (id: string) => {
    setHiddenColumns(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleAllColumns = (visible: boolean) => {
    if (visible) {
      setHiddenColumns([]);
    } else {
      setHiddenColumns(activeTypes.map(t => t.id));
    }
  };


  const syncPersonForm = (person: Person) => {
    setPersonForm({
      first_name: person.first_name || '',
      last_name: person.last_name || '',
      employee_number: person.employee_number || '',
      email: person.email || '',
      department: person.department || '',
      role: person.role || '',
      person_type: person.person_type || 'Employee',
      active: person.active ?? true,
      start_date: person.start_date || '',
      end_date: person.end_date || '',
      notes: person.notes || ''
    });
    setPersonFormMessage('');
  };

  const handleSavePersonProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPerson) return;
    setIsSavingPerson(true);
    setPersonFormMessage('');
    try {
      const saved = await upsertPerson({
        id: selectedPerson.id,
        first_name: personForm.first_name.trim() || selectedPerson.first_name,
        last_name: personForm.last_name.trim() || selectedPerson.last_name,
        display_name: `${personForm.first_name} ${personForm.last_name}`.trim() || selectedPerson.display_name,
        employee_number: personForm.employee_number.trim() || null,
        email: personForm.email.trim() || null,
        department: personForm.department.trim() || null,
        role: personForm.role.trim() || null,
        person_type: personForm.person_type,
        active: personForm.active,
        start_date: personForm.start_date || null,
        end_date: personForm.end_date || null,
        notes: personForm.notes.trim() || null
      });
      setSelectedPerson(saved);
      setIsEditingPerson(false);
      setPersonFormMessage('Profile saved successfully.');
    } catch (err) {
      setPersonFormMessage(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setIsSavingPerson(false);
    }
  };

  const applyPeopleBulkUpdate = async () => {
    if (selectedBulkPeople.length === 0) return;
    const updates: Partial<Person> = {};
    if (bulkPersonActive === 'active') updates.active = true;
    if (bulkPersonActive === 'inactive') updates.active = false;
    if (bulkPersonDepartment.trim()) updates.department = bulkPersonDepartment.trim();
    if (bulkPersonRole.trim()) updates.role = bulkPersonRole.trim();
    if (bulkPersonType) updates.person_type = bulkPersonType as PersonType;
    if (Object.keys(updates).length === 0) {
      setBulkMessage('Choose at least one people bulk edit value before applying.');
      return;
    }
    if (!window.confirm(`Apply changes to ${selectedBulkPeople.length} people? Existing person update logging will be used.`)) return;
    setLastPeopleUndo({ label: 'Undo people bulk edit', people: selectedBulkPeople });
    try {
      for (const person of selectedBulkPeople) {
        await upsertPerson({
          id: person.id,
          first_name: person.first_name,
          last_name: person.last_name,
          display_name: person.display_name,
          employee_number: person.employee_number || null,
          email: person.email || null,
          department: person.department || null,
          role: person.role || null,
          person_type: person.person_type,
          active: person.active,
          start_date: person.start_date || null,
          end_date: person.end_date || null,
          notes: person.notes || null,
          ...updates
        });
      }
      peopleSelection.clearSelection();
      setBulkPersonActive('');
      setBulkPersonDepartment('');
      setBulkPersonRole('');
      setBulkPersonType('');
      setBulkMessage(`Updated ${selectedBulkPeople.length} people.`);
    } catch (error) {
      setBulkMessage(error instanceof Error ? error.message : 'Bulk people update failed.');
    }
  };

  const undoPeopleBulkUpdate = async () => {
    if (!lastPeopleUndo) return;
    if (!window.confirm(`Restore previous values for ${lastPeopleUndo.people.length} people?`)) return;
    try {
      for (const person of lastPeopleUndo.people) {
        await upsertPerson({
          id: person.id,
          first_name: person.first_name,
          last_name: person.last_name,
          display_name: person.display_name,
          employee_number: person.employee_number || null,
          email: person.email || null,
          department: person.department || null,
          role: person.role || null,
          person_type: person.person_type,
          active: person.active,
          start_date: person.start_date || null,
          end_date: person.end_date || null,
          notes: person.notes || null
        });
      }
      setLastPeopleUndo(null);
      setBulkMessage('Previous people values restored.');
    } catch (error) {
      setBulkMessage(error instanceof Error ? error.message : 'People undo failed.');
    }
  };

  const applyWorkspaceCompetencyStatus = async () => {
    if (!selectedPerson || selectedWorkspaceRows.length === 0 || !bulkWorkspaceStatus) return;
    if (!window.confirm(`Mark ${selectedWorkspaceRows.length} competency record(s) as ${bulkWorkspaceStatus} for ${selectedPerson.display_name}?`)) return;
    setLastCompetencyUndo({
      label: 'Undo person competency bulk edit',
      rows: selectedWorkspaceRows.map(row => ({ typeId: row.type.id, record: row.cell?.record || null }))
    });
    try {
      for (const row of selectedWorkspaceRows) {
        await upsertCompetencyRecord({
          id: row.cell?.record?.id,
          person_id: selectedPerson.id,
          competency_type_id: row.type.id,
          status: bulkWorkspaceStatus as CompetencyStatus,
          completed_date: row.cell?.record?.completed_date || null,
          expiry_date: row.cell?.record?.expiry_date || null,
          trainer: row.cell?.record?.trainer || null,
          provider: row.cell?.record?.provider || null,
          certificate_number: row.cell?.record?.certificate_number || null,
          notes: row.cell?.record?.notes || null
        });
      }
      workspaceSelection.clearSelection();
      setBulkWorkspaceStatus('');
      setBulkMessage(`Updated ${selectedWorkspaceRows.length} competency record(s).`);
    } catch (error) {
      setBulkMessage(error instanceof Error ? error.message : 'Bulk competency status update failed.');
    }
  };

  const undoWorkspaceCompetencyStatus = async () => {
    if (!selectedPerson || !lastCompetencyUndo) return;
    if (!window.confirm(`Restore previous competency values for ${lastCompetencyUndo.rows.length} row(s)?`)) return;
    try {
      for (const row of lastCompetencyUndo.rows) {
        if (row.record) {
          await upsertCompetencyRecord({
            id: row.record.id,
            person_id: row.record.person_id,
            competency_type_id: row.record.competency_type_id,
            status: row.record.status,
            completed_date: row.record.completed_date || null,
            expiry_date: row.record.expiry_date || null,
            trainer: row.record.trainer || null,
            provider: row.record.provider || null,
            certificate_number: row.record.certificate_number || null,
            notes: row.record.notes || null
          });
        } else {
          await upsertCompetencyRecord({
            person_id: selectedPerson.id,
            competency_type_id: row.typeId,
            status: 'Missing'
          });
        }
      }
      setLastCompetencyUndo(null);
      setBulkMessage('Previous competency values restored.');
    } catch (error) {
      setBulkMessage(error instanceof Error ? error.message : 'Competency undo failed.');
    }
  };

  const [newPerson, setNewPerson] = useState({
    first_name: '',
    last_name: '',
    employee_number: '',
    email: '',
    department: '',
    role: '',
    person_type: 'Employee' as PersonType,
    start_date: '',
    notes: ''
  });
  const [newType, setNewType] = useState({
    title: '',
    category: 'Safety' as CompetencyCategory,
    description: '',
    validity_period_months: '36',
    refresher_period_months: '12',
    evidence_required: true,
    default_risk_level: 'Medium' as RequirementRiskLevel
  });



  const selectedPersonIndex = selectedPerson
    ? sortedPeople.findIndex(person => person.id === selectedPerson.id)
    : -1;
  const canMoveBetweenPeople = selectedPersonIndex >= 0 && sortedPeople.length > 1;

  const moveSelectedPerson = (direction: -1 | 1) => {
    if (!selectedPerson || !canMoveBetweenPeople) return;
    const nextIndex = (selectedPersonIndex + direction + sortedPeople.length) % sortedPeople.length;
    const nextPerson = sortedPeople[nextIndex];
    if (nextPerson) {
      openPersonWorkspace(nextPerson);
    }
  };

  const openPersonWorkspace = (person: Person) => {
    setSelectedPerson(person);
    setActiveCell(null);
    setIsEditingPerson(false);
    syncPersonForm(person);
    setWorkspaceSearch('');
    setWorkspaceStatusFilter('All');
  };

  React.useEffect(() => {
    if (!selectedPerson || isEditingPerson) return;
    const refreshedPerson = activePeople.find(person => person.id === selectedPerson.id);
    if (refreshedPerson && refreshedPerson.updated_at !== selectedPerson.updated_at) {
      setSelectedPerson(refreshedPerson);
      syncPersonForm(refreshedPerson);
    }
  }, [isEditingPerson, activePeople, selectedPerson]);

  // Removed duplicate filteredTypes definition to allow hiddenColumns and showOnlyFavourites filters to work correctly.

  const openCell = (person: Person, competencyType: CompetencyType) => {
    setSelectedPerson(person);
    const cell = matrix.find(item => item.person.id === person.id && item.competencyType.id === competencyType.id);
    setActiveCell({ person, competencyType, record: cell?.record || null });
    setRecordForm({
      completed_date: cell?.record?.completed_date || '',
      expiry_date: cell?.record?.expiry_date || '',
      trainer: cell?.record?.trainer || '',
      provider: cell?.record?.provider || '',
      certificate_number: cell?.record?.certificate_number || '',
      status: cell?.status || 'Valid',
      notes: cell?.record?.notes || ''
    });
    setFormMessage('');
    setLinkDocumentId('');
  };

  const linkedDocuments = activeCell?.record
    ? competencyRecordDocuments
        .filter(link => link.competency_record_id === activeCell.record?.id)
        .map(link => documents.find(document => document.id === link.document_id))
        .filter((document): document is NonNullable<typeof document> => Boolean(document))
    : [];

  const relatedActions = activeCell
    ? actions.filter(action =>
        actionObjectLinks.some(link =>
          link.action_id === action.id &&
          ((link.object_type === 'person' && link.object_id === activeCell.person.id) ||
            (link.object_type === 'competency_type' && link.object_id === activeCell.competencyType.id) ||
            (activeCell.record && link.object_type === 'competency_record' && link.object_id === activeCell.record.id))
        )
      )
    : [];

  const selectedPersonRows = useMemo(() => {
    return selectedPerson
      ? activeTypes.map(type => {
          const cell = matrix.find(item => item.person.id === selectedPerson.id && item.competencyType.id === type.id);
          const evidenceCount = cell?.record
            ? competencyRecordDocuments.filter(link => link.competency_record_id === cell.record?.id).length
            : 0;
          const openActionCount = actions.filter(action =>
            action.status !== 'Complete' &&
            action.status !== 'Cancelled' &&
            actionObjectLinks.some(link =>
              link.action_id === action.id &&
              ((link.object_type === 'person' && link.object_id === selectedPerson.id) ||
                (link.object_type === 'competency_type' && link.object_id === type.id) ||
                (cell?.record && link.object_type === 'competency_record' && link.object_id === cell.record.id))
            )
          ).length;
          return { type, cell, evidenceCount, openActionCount };
        })
      : [];
  }, [selectedPerson, activeTypes, matrix, competencyRecordDocuments, actions, actionObjectLinks]);

  const selectedPersonActions = useMemo(() => {
    return selectedPerson
      ? actions.filter(action =>
          actionObjectLinks.some(link => link.action_id === action.id && link.object_type === 'person' && link.object_id === selectedPerson.id)
        )
      : [];
  }, [selectedPerson, actions, actionObjectLinks]);

  const filteredPersonRows = useMemo(() => {
    return selectedPersonRows.filter(row => {
      const matchesSearch = workspaceSearch.trim() === '' ||
        row.type.title.toLowerCase().includes(workspaceSearch.toLowerCase()) ||
        row.type.category.toLowerCase().includes(workspaceSearch.toLowerCase());

      const status = row.cell?.status || 'Missing';
      const matchesStatus = workspaceStatusFilter === 'All' || status === workspaceStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [selectedPersonRows, workspaceSearch, workspaceStatusFilter]);

  const workspaceSelectableRows = useMemo(
    () => filteredPersonRows.map(row => ({ ...row, id: row.type.id })),
    [filteredPersonRows]
  );
  const workspaceSelection = useBulkSelection(workspaceSelectableRows);
  const selectedWorkspaceRows = workspaceSelectableRows.filter(row => workspaceSelection.selectedIds.has(row.id));

  const selectedPersonGroupedRows = useMemo(() => {
    return selectedPerson
      ? categories.map(category => ({
          category,
          rows: filteredPersonRows.filter(row => row.type.category === category)
        })).filter(group => group.rows.length > 0)
      : [];
  }, [selectedPerson, filteredPersonRows]);

  const selectedPersonStatusBreakdown = useMemo(() => {
    return selectedPersonRows.reduce<Record<CompetencyStatus, number>>((acc, row) => {
      const status = row.cell?.status || 'Missing';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {
      Valid: 0,
      'Expiring Soon': 0,
      Expired: 0,
      Missing: 0,
      'Not Required': 0
    });
  }, [selectedPersonRows]);

  const handleCreatePerson = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newPerson.first_name.trim() || !newPerson.last_name.trim()) return;
    await upsertPerson({
      first_name: newPerson.first_name.trim(),
      last_name: newPerson.last_name.trim(),
      display_name: `${newPerson.first_name} ${newPerson.last_name}`.trim(),
      employee_number: newPerson.employee_number || null,
      email: newPerson.email || null,
      department: newPerson.department || null,
      role: newPerson.role || null,
      person_type: newPerson.person_type,
      start_date: newPerson.start_date || null,
      end_date: null,
      active: true,
      notes: newPerson.notes || null
    });
    setNewPerson({ first_name: '', last_name: '', employee_number: '', email: '', department: '', role: '', person_type: 'Employee', start_date: '', notes: '' });
  };

  const handleCreateType = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newType.title.trim()) return;
    await upsertCompetencyType({
      title: newType.title.trim(),
      category: newType.category,
      description: newType.description || null,
      validity_period_months: newType.validity_period_months ? Number(newType.validity_period_months) : null,
      refresher_period_months: newType.refresher_period_months ? Number(newType.refresher_period_months) : null,
      evidence_required: newType.evidence_required,
      default_risk_level: newType.default_risk_level,
      active: true
    });
    setNewType({ title: '', category: 'Safety', description: '', validity_period_months: '36', refresher_period_months: '12', evidence_required: true, default_risk_level: 'Medium' });
  };

  const handleImportPack = async () => {
    if (!selectedPack) return;
    const imported = await importCompetencyTemplateItems(selectedPack.competencies);
    setImportMessage(`Imported ${imported.length} competency type${imported.length === 1 ? '' : 's'}. Existing duplicates were skipped.`);
  };

  const handleSaveRecord = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeCell) return;
    const saved = await upsertCompetencyRecord({
      id: activeCell.record?.id,
      person_id: activeCell.person.id,
      competency_type_id: activeCell.competencyType.id,
      completed_date: recordForm.completed_date || null,
      expiry_date: recordForm.expiry_date || null,
      trainer: recordForm.trainer || null,
      provider: recordForm.provider || null,
      certificate_number: recordForm.certificate_number || null,
      status: recordForm.status,
      notes: recordForm.notes || null
    });
    setActiveCell({ ...activeCell, record: saved });
    setFormMessage('Competency record saved.');
  };

  const handleUploadEvidence = async (file: File | null) => {
    if (!activeCell?.record || !file) {
      setFormMessage('Save the competency record before uploading evidence.');
      return;
    }
    setUploading(true);
    setFormMessage('');
    try {
      await uploadCompetencyEvidence(activeCell.record.id, file);
      setFormMessage('Evidence uploaded and linked to this competency record.');
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleEvidenceFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;
    for (const file of fileList) {
      await handleUploadEvidence(file);
    }
  };

  const handleMarkNotRequired = async () => {
    if (!activeCell) return;
    const confirmed = window.confirm('Mark this competency as not required for this person? The record is retained for history.');
    if (!confirmed) return;
    const saved = await upsertCompetencyRecord({
      id: activeCell.record?.id,
      person_id: activeCell.person.id,
      competency_type_id: activeCell.competencyType.id,
      completed_date: activeCell.record?.completed_date || null,
      expiry_date: activeCell.record?.expiry_date || null,
      trainer: activeCell.record?.trainer || null,
      provider: activeCell.record?.provider || null,
      certificate_number: activeCell.record?.certificate_number || null,
      status: 'Not Required',
      notes: recordForm.notes || activeCell.record?.notes || null
    });
    setActiveCell({ ...activeCell, record: saved });
    setRecordForm({ ...recordForm, status: 'Not Required' });
    setFormMessage('Competency marked as not required.');
  };

  const handleArchiveFromPerson = async () => {
    if (!activeCell) return;
    const confirmed = window.confirm('Remove this competency from the active person view?\n\nThis keeps history by marking the competency record as Not Required.');
    if (!confirmed) return;
    await handleMarkNotRequired();
  };

  const handleCreateGapAction = async () => {
    if (!activeCell) return;
    await createActionForCompetencyGap({
      personId: activeCell.person.id,
      competencyTypeId: activeCell.competencyType.id,
      competencyRecordId: activeCell.record?.id || null,
      title: `Resolve ${activeCell.competencyType.title} gap for ${activeCell.person.display_name}`,
      dueDate: activeCell.record?.expiry_date || null
    });
    setFormMessage('Action created from competency gap.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Competency Matrix</h1>
          <p className="text-sm text-muted-foreground mt-1">
            People, required competencies, evidence records and renewal gaps in one organisation-scoped view.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          ['Compliance', `${competencySummary.compliancePercent}%`, 'text-indigo-500'],
          ['Expiring Soon', competencySummary.expiringSoon, 'text-amber-500'],
          ['Expired', competencySummary.expired, 'text-rose-500'],
          ['Missing', competencySummary.missing, 'text-rose-500'],
          ['Upcoming Renewals', competencySummary.upcomingRenewals.length, 'text-indigo-500']
        ].map(([label, value, tone]) => (
          <div key={label} className="bg-card border border-border p-4 rounded-xl">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">{label}</span>
            <span className={`text-2xl font-extrabold block mt-1 ${tone}`}>{value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-4">
          {/* Main search and quick actions bar */}
          <div className="bg-card border border-border p-4 rounded-xl space-y-3 shadow-xs">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search people by name, role, department..."
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
                  Filters {(filterChips.length > 0) && <span className="bg-indigo-650 text-white dark:bg-indigo-600 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold">{filterChips.length}</span>}
                </button>

                <DensityControls
                  density={density}
                  onDensityChange={setDensity}
                  globalDensity={globalDensity}
                  onGlobalDensityChange={nextDensity => {
                    setGlobalDensity(nextDensity);
                    setDensity(nextDensity);
                  }}
                />

                <ColumnVisibilityControls
                  columns={columnOptions}
                  onToggleColumn={handleToggleColumn}
                  onToggleAll={handleToggleAllColumns}
                />
              </div>
            </div>

            {/* Collapsible advanced filters */}
            {showFilters && (
              <div className="border-t border-border/60 pt-3 mt-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <StarredFilterSelect
                    label="Dept"
                    value={departmentFilter}
                    onChange={setDepartmentFilter}
                    options={sortedDepartments}
                    isStarred={(opt) => isFavourite(`dept:${opt}`)}
                    onToggleStar={(opt) => toggleFavourite(`dept:${opt}`)}
                  />
                  <StarredFilterSelect
                    label="Role"
                    value={roleFilter}
                    onChange={setRoleFilter}
                    options={sortedRoles}
                    isStarred={(opt) => isFavourite(`role:${opt}`)}
                    onToggleStar={(opt) => toggleFavourite(`role:${opt}`)}
                  />
                  <StarredFilterSelect
                    label="Category"
                    value={typeFilter}
                    onChange={setTypeFilter}
                    options={['All', ...sortedCompetencyCategories]}
                    isStarred={(opt) => isFavourite(`cat:${opt}`)}
                    onToggleStar={(opt) => toggleFavourite(`cat:${opt}`)}
                    allLabel="All Categories"
                  />
                  <StarredFilterSelect
                    label="Status"
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={['All', ...statusOptions]}
                    isStarred={(opt) => isFavourite(`status:${opt}`)}
                    onToggleStar={(opt) => toggleFavourite(`status:${opt}`)}
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Emp Type</label>
                    <select
                      value={personTypeFilter}
                      onChange={event => setPersonTypeFilter(event.target.value)}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs font-semibold text-foreground outline-none cursor-pointer"
                    >
                      <option value="All">All Types</option>
                      {personTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={event => setSortBy(event.target.value)}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs font-semibold text-foreground outline-none cursor-pointer"
                    >
                      <option value="name">Name (A-Z)</option>
                      <option value="department">Department</option>
                      <option value="gaps">Most Gaps (Expired + Missing)</option>
                      <option value="expired">Most Expired</option>
                      <option value="expiring">Expiring Soonest</option>
                    </select>
                  </div>
                </div>

                {/* Quick Toggle Checkboxes */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-border/40 text-xs">
                  <label className="flex items-center gap-2 font-semibold text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOnlyMissingExpired}
                      onChange={e => setShowOnlyMissingExpired(e.target.checked)}
                      className="accent-indigo-650 w-3.5 h-3.5"
                    />
                    <span>Missing / Expired only</span>
                  </label>
                  <label className="flex items-center gap-2 font-semibold text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOnlyExpiringSoon}
                      onChange={e => setShowOnlyExpiringSoon(e.target.checked)}
                      className="accent-indigo-650 w-3.5 h-3.5"
                    />
                    <span>Expiring soon only</span>
                  </label>
                  <label className="flex items-center gap-2 font-semibold text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOnlyFavourites}
                      onChange={e => setShowOnlyFavourites(e.target.checked)}
                      className="accent-indigo-650 w-3.5 h-3.5"
                    />
                    <span>Starred Competencies only</span>
                  </label>
                  <label className="flex items-center gap-2 font-semibold text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOnlyPeopleWithGaps}
                      onChange={e => setShowOnlyPeopleWithGaps(e.target.checked)}
                      className="accent-indigo-650 w-3.5 h-3.5"
                    />
                    <span>People with gaps only</span>
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

            {/* Category Collapsers / Favourites Bar */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1 border-t border-border/40">
              <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px] mr-1">Categories:</span>
              {categories.map(cat => {
                const isCollapsed = collapsedCategories.includes(cat);
                const count = activeTypes.filter(t => t.category === cat).length;
                if (count === 0) return null;
                const isStarred = isFavourite(`cat:${cat}`);
                return (
                  <div
                    key={cat}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
                      isCollapsed
                        ? 'bg-muted/30 border-border/50 text-muted-foreground'
                        : 'bg-indigo-500/5 border-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setCollapsedCategories(prev =>
                          isCollapsed ? prev.filter(c => c !== cat) : [...prev, cat]
                        );
                      }}
                      className="hover:underline text-[11px] cursor-pointer"
                    >
                      {cat} ({count})
                    </button>
                    <FilterFavouriteButton isStarred={isStarred} onToggle={() => toggleFavourite(`cat:${cat}`)} />
                  </div>
                );
              })}
            </div>

            {/* Active chips */}
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

            {/* Row Count Info */}
            <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-1">
              <span>Filtered Results: {sortedPeople.length} / {activePeople.length} people</span>
              <span>Visible Columns: {visibleTypes.length} / {activeTypes.length} competencies</span>
            </div>
          </div>

          {bulkMessage && (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              {bulkMessage}
            </div>
          )}

          <BulkSelectionToolbar
            selectedCount={peopleSelection.selectedCount}
            recordLabel="people"
            onSelectVisible={peopleSelection.selectVisible}
            onClear={peopleSelection.clearSelection}
            message="Selection can span pages in this session."
          >
            <select value={bulkPersonActive} onChange={event => setBulkPersonActive(event.target.value)} className="px-2.5 py-1.5 bg-card border border-border rounded-lg font-bold text-foreground outline-none">
              <option value="">Active state...</option>
              <option value="active">Mark Active</option>
              <option value="inactive">Mark Inactive</option>
            </select>
            <input value={bulkPersonDepartment} onChange={event => setBulkPersonDepartment(event.target.value)} placeholder="Department..." className="px-2.5 py-1.5 bg-card border border-border rounded-lg font-bold text-foreground outline-none w-32" />
            <input value={bulkPersonRole} onChange={event => setBulkPersonRole(event.target.value)} placeholder="Role..." className="px-2.5 py-1.5 bg-card border border-border rounded-lg font-bold text-foreground outline-none w-28" />
            <select value={bulkPersonType} onChange={event => setBulkPersonType(event.target.value)} className="px-2.5 py-1.5 bg-card border border-border rounded-lg font-bold text-foreground outline-none">
              <option value="">Type...</option>
              {personTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
            <button type="button" onClick={applyPeopleBulkUpdate} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer">
              Apply people edit
            </button>
            {lastPeopleUndo && (
              <button type="button" onClick={undoPeopleBulkUpdate} className="px-3 py-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg font-bold cursor-pointer">
                {lastPeopleUndo.label}
              </button>
            )}
          </BulkSelectionToolbar>

          <PaginationControls
            pageSize={peoplePagination.pageSize}
            onPageSizeChange={peoplePagination.setPageSize}
            currentPage={peoplePagination.currentPage}
            totalPages={peoplePagination.totalPages}
            totalItems={peoplePagination.totalItems}
            startItem={peoplePagination.startItem}
            endItem={peoplePagination.endItem}
            onPageChange={peoplePagination.setCurrentPage}
            itemLabel="people"
          />

          {/* Matrix table container */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-auto max-h-[60vh] relative">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted border-b border-border text-muted-foreground uppercase tracking-wider sticky top-0 z-20">
                    <th
                      className="p-3 sticky left-0 top-0 z-30 border-r border-b border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)] font-extrabold uppercase text-[10px] tracking-wider"
                      style={{ backgroundColor: 'hsl(var(--muted))', left: 0, top: 0 }}
                    >
                      <div className="min-w-56 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={peopleSelection.allVisibleSelected}
                          onChange={event => {
                            if (event.target.checked) peopleSelection.selectVisible();
                            else peopleSelection.clearSelection();
                          }}
                          className="rounded border-border text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 bg-muted/40 cursor-pointer"
                          aria-label="Select visible people"
                        />
                        <span>Person</span>
                      </div>
                    </th>
                    {visibleTypes.map(type => {
                      const isStarred = isFavourite(`comp:${type.id}`);
                      return (
                        <th
                          key={type.id}
                          className="p-3 sticky top-0 z-20 border-b border-border text-left font-bold min-w-40"
                          style={{ backgroundColor: 'hsl(var(--muted))', top: 0 }}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="min-w-0">
                              <span className="block text-[8px] opacity-65 uppercase font-medium tracking-wider truncate">{type.category}</span>
                              <span className="block font-extrabold mt-0.5 text-foreground truncate max-w-[150px]" title={type.title}>{type.title}</span>
                            </div>
                            <FilterFavouriteButton
                              isStarred={isStarred}
                              onToggle={() => toggleFavourite(`comp:${type.id}`)}
                            />
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {sortedPeople.length === 0 || visibleTypes.length === 0 ? (
                    <tr>
                      <td colSpan={Math.max(visibleTypes.length + 1, 1)} className="p-8 text-center text-muted-foreground">
                        {sortedPeople.length === 0
                          ? 'No people matches the active filters.'
                          : 'No visible competency columns. Try expanding a category or toggling column visibility.'}
                      </td>
                    </tr>
                  ) : peoplePagination.paginatedItems.map(person => {
                    const personGapsCount = matrix.filter(cell => cell.person.id === person.id && (cell.status === 'Missing' || cell.status === 'Expired')).length;
                    const paddingClass = density === 'comfortable' ? 'p-3' : 'p-1.5';
                    const textClass = density === 'comfortable' ? 'text-xs' : 'text-[11px]';
                    const isPersonSelected = peopleSelection.isSelected(person.id);

                    return (
                      <tr key={person.id} className={`hover:bg-muted/30 transition-colors ${isPersonSelected ? 'bg-indigo-500/5' : ''}`}>
                        <td
                          className={`${paddingClass} sticky left-0 z-10 border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)]`}
                          style={{ backgroundColor: 'hsl(var(--card))', left: 0 }}
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={isPersonSelected}
                              onChange={() => peopleSelection.toggleSelected(person.id)}
                              onClick={event => event.stopPropagation()}
                              className="mt-1 rounded border-border text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 bg-muted/40 cursor-pointer shrink-0"
                              aria-label={`Select ${person.display_name}`}
                            />
                            <button
                              onClick={() => openPersonWorkspace(person)}
                              className="w-full text-left rounded-lg p-1 -m-1 hover:bg-muted cursor-pointer transition-colors"
                            >
                              <span className={`font-extrabold block text-foreground ${textClass}`}>{person.display_name}</span>
                              <span className="text-[9px] text-muted-foreground block truncate mt-0.5 max-w-[200px]">
                                {person.department || 'No dept'} | {person.role || 'No role'}
                              </span>
                              {personGapsCount > 0 && (
                                <span className="inline-block bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold text-[8px] px-1 rounded mt-0.5">
                                  {personGapsCount} gap{personGapsCount > 1 ? 's' : ''}
                                </span>
                              )}
                            </button>
                          </div>
                        </td>
                        {visibleTypes.map(type => {
                          const cell = matrix.find(item => item.person.id === person.id && item.competencyType.id === type.id);
                          const cellStatus = cell?.status || 'Missing';

                          return (
                            <td key={type.id} className={paddingClass}>
                              <button
                                onClick={() => openCell(person, type)}
                                className={`w-full text-left border rounded-lg hover:bg-muted/60 transition-all ${
                                  density === 'comfortable' ? 'px-2.5 py-2' : 'px-1.5 py-1'
                                } ${statusClass(cellStatus)}`}
                              >
                                <span className={`font-extrabold block ${textClass}`}>{cellStatus}</span>
                                <span className="text-[9px] opacity-75 block truncate mt-0.5">
                                  {cell?.record?.expiry_date ? `${cell.record.expiry_date}` : 'No dated record'}
                                </span>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <form onSubmit={handleCreatePerson} className="bg-card border border-border rounded-xl p-4 space-y-3 text-xs">
            <h2 className="text-sm font-extrabold flex items-center gap-2"><UserCheck className="w-4 h-4" /> Add Person</h2>
            <div className="grid grid-cols-2 gap-2">
              <input required placeholder="First name" value={newPerson.first_name} onChange={event => setNewPerson({ ...newPerson, first_name: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
              <input required placeholder="Last name" value={newPerson.last_name} onChange={event => setNewPerson({ ...newPerson, last_name: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Department" value={newPerson.department} onChange={event => setNewPerson({ ...newPerson, department: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
              <input placeholder="Role" value={newPerson.role} onChange={event => setNewPerson({ ...newPerson, role: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
            </div>
            <select value={newPerson.person_type} onChange={event => setNewPerson({ ...newPerson, person_type: event.target.value as PersonType })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none">
              {personTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
            <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg">Save Person</button>
          </form>

          <form onSubmit={handleCreateType} className="bg-card border border-border rounded-xl p-4 space-y-3 text-xs">
            <h2 className="text-sm font-extrabold">Add Competency Type</h2>
            <input required placeholder="Title" value={newType.title} onChange={event => setNewType({ ...newType, title: event.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
            <select value={newType.category} onChange={event => setNewType({ ...newType, category: event.target.value as CompetencyCategory })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none">
              {categories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" min="0" value={newType.validity_period_months} onChange={event => setNewType({ ...newType, validity_period_months: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
              <input type="number" min="0" value={newType.refresher_period_months} onChange={event => setNewType({ ...newType, refresher_period_months: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
              <select value={newType.default_risk_level} onChange={event => setNewType({ ...newType, default_risk_level: event.target.value as RequirementRiskLevel })} className="px-2 py-2 bg-muted border border-border rounded-lg outline-none">
                {riskLevels.map(level => <option key={level} value={level}>{level}</option>)}
              </select>
            </div>
            <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg">Save Type</button>
          </form>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3 text-xs">
            <h2 className="text-sm font-extrabold">Import Template Pack</h2>
            <select value={selectedPackId} onChange={event => { setSelectedPackId(event.target.value); setImportMessage(''); }} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none">
              {COMPETENCY_TEMPLATE_PACKS.map(pack => <option key={pack.id} value={pack.id}>{pack.name}</option>)}
            </select>
            <p className="text-[11px] text-muted-foreground">{selectedPack?.description}</p>
            <button onClick={handleImportPack} className="w-full py-2 bg-muted hover:bg-muted/80 border border-border font-bold rounded-lg">Import Pack</button>
            {importMessage && <p className="text-[11px] text-emerald-500 font-semibold">{importMessage}</p>}
          </div>
        </div>
      </div>

      {activeCell && !selectedPerson && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex justify-end">
          <div className="pointer-events-auto w-full max-w-xl bg-card solid-panel border-l border-border h-full overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold">{activeCell.competencyType.title}</h2>
                <p className="text-xs text-muted-foreground mt-1">{activeCell.person.display_name} | {activeCell.person.role || activeCell.person.person_type}</p>
              </div>
              <button onClick={() => setActiveCell(null)} className="p-2 hover:bg-muted rounded-lg h-fit"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Completed</span>
                  <input type="date" value={recordForm.completed_date} onChange={event => setRecordForm({ ...recordForm, completed_date: event.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Expiry</span>
                  <input type="date" value={recordForm.expiry_date} onChange={event => setRecordForm({ ...recordForm, expiry_date: event.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Trainer" value={recordForm.trainer} onChange={event => setRecordForm({ ...recordForm, trainer: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
                <input placeholder="Provider" value={recordForm.provider} onChange={event => setRecordForm({ ...recordForm, provider: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Certificate number" value={recordForm.certificate_number} onChange={event => setRecordForm({ ...recordForm, certificate_number: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
                <select value={recordForm.status} onChange={event => setRecordForm({ ...recordForm, status: event.target.value as CompetencyStatus })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none">
                  {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <textarea placeholder="Notes" value={recordForm.notes} onChange={event => setRecordForm({ ...recordForm, notes: event.target.value })} rows={3} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none resize-none" />
              <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg">Save Record</button>
            </form>

            {formMessage && <p className="text-[11px] text-muted-foreground border border-border bg-muted/30 rounded-lg p-2">{formMessage}</p>}

            <div className="border-t border-border pt-4 space-y-3 text-xs">
              <h3 className="text-sm font-extrabold">Evidence</h3>
              {linkedDocuments.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No evidence documents linked.</p>
              ) : linkedDocuments.map(document => (
                <div key={document.id} className="p-3 bg-muted/30 border border-border rounded-lg flex justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-bold block truncate">{document.title}</span>
                    <span className="text-[10px] text-muted-foreground truncate block">{document.file_name}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={async () => window.open(await getDocumentSignedUrl(document.id), '_blank')} className="px-2 py-1 bg-indigo-500/10 text-indigo-500 rounded font-bold">Open</button>
                    {activeCell.record && <button onClick={() => unlinkDocumentFromCompetencyRecord(activeCell.record!.id, document.id)} className="px-2 py-1 bg-muted border border-border rounded font-bold">Unlink</button>}
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <select value={linkDocumentId} onChange={event => setLinkDocumentId(event.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none">
                    <option value="">Link existing evidence</option>
                    {documents.map(document => <option key={document.id} value={document.id}>{document.title}</option>)}
                  </select>
                  <button disabled={!activeCell.record || !linkDocumentId} onClick={() => activeCell.record && linkDocumentToCompetencyRecord(activeCell.record.id, linkDocumentId)} className="w-full py-2 bg-muted hover:bg-muted/80 border border-border disabled:opacity-50 rounded-lg font-bold flex items-center justify-center gap-2">
                    <LinkIcon className="w-4 h-4" /> Link Evidence
                  </button>
                </div>
                <label
                  onDragOver={event => {
                    event.preventDefault();
                    setIsEvidenceDragging(true);
                  }}
                  onDragLeave={() => setIsEvidenceDragging(false)}
                  onDrop={event => {
                    event.preventDefault();
                    setIsEvidenceDragging(false);
                    void handleEvidenceFiles(event.dataTransfer.files);
                  }}
                  className={`w-full min-h-24 py-2 px-3 border rounded-lg font-bold flex flex-col items-center justify-center gap-2 cursor-pointer text-center transition-colors ${
                    isEvidenceDragging
                      ? 'bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                      : 'bg-muted hover:bg-muted/80 border-border'
                  }`}
                >
                  <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload Evidence'}
                  <span className="text-[10px] font-medium text-muted-foreground">Click or drop files here</span>
                  <input type="file" accept={evidenceAcceptAttribute} multiple className="hidden" onChange={event => event.target.files && handleEvidenceFiles(event.target.files)} />
                </label>
              </div>
              <p className="text-[10px] text-muted-foreground">Uploads are saved as private Evidence Vault records under Training & Competency. Max {formatMaxEvidenceUploadSize()}.</p>
            </div>

            <div className="border-t border-border pt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold">Actions</h3>
              <button onClick={handleCreateGapAction} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Create Gap Action
                </button>
              </div>
              {relatedActions.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No actions linked to this person or competency.</p>
              ) : relatedActions.map(action => (
                <div key={action.id} className="p-3 bg-muted/30 border border-border rounded-lg flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-bold block truncate">{action.title}</span>
                    <span className="text-[10px] text-muted-foreground">{action.status}{action.target_due_date || action.due_date ? ` | Due ${action.target_due_date || action.due_date}` : ''}</span>
                  </div>
                  <button onClick={() => setSelectedAction(action)} className="px-2 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 rounded font-bold">Open</button>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 grid grid-cols-2 gap-2 text-xs">
              <button onClick={handleMarkNotRequired} className="py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-700 dark:text-amber-300 rounded-lg font-bold">
                Mark Not Required
              </button>
              <button onClick={handleArchiveFromPerson} className="py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-700 dark:text-rose-300 rounded-lg font-bold">
                Remove from Person
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPerson && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-7xl h-[88vh] bg-card solid-panel border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between gap-3 border-b border-border p-5 shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Person Detail Workspace</span>
                <h2 className="text-xl font-extrabold">{selectedPerson.display_name}</h2>
                <p className="text-xs text-muted-foreground mt-1">{selectedPerson.role || selectedPerson.person_type} | {selectedPerson.department || 'No department'}</p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditingPerson ? (
                  <button
                    onClick={() => {
                      syncPersonForm(selectedPerson);
                      setIsEditingPerson(true);
                    }}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shrink-0"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-500/10 px-2.5 py-1.5 rounded-lg border border-indigo-500/20 shrink-0">
                    Editing Profile
                  </span>
                )}
                <button
                  onClick={() => moveSelectedPerson(-1)}
                  disabled={!canMoveBetweenPeople}
                  className="px-3 py-2 bg-muted hover:bg-muted/80 border border-border disabled:opacity-40 rounded-lg text-xs font-bold transition-colors"
                  title="Previous person"
                >
                  Previous
                </button>
                <button
                  onClick={() => moveSelectedPerson(1)}
                  disabled={!canMoveBetweenPeople}
                  className="px-3 py-2 bg-muted hover:bg-muted/80 border border-border disabled:opacity-40 rounded-lg text-xs font-bold transition-colors"
                  title="Next person"
                >
                  Next
                </button>
                <button
                  onClick={() => {
                    setSelectedPerson(null);
                    setActiveCell(null);
                    setIsEditingPerson(false);
                  }}
                  className="p-2 hover:bg-muted rounded-lg h-fit transition-colors ml-1 text-muted-foreground hover:text-foreground"
                  title="Close person workspace"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Workspace columns layout */}
            <div className="relative grid grid-cols-1 lg:grid-cols-[280px_1fr] lg:data-[has-active=true]:grid-cols-[280px_1fr_380px] flex-1 min-h-0" data-has-active={!!(activeCell && activeCell.person.id === selectedPerson.id)}>
              {/* Column 1: Person Summary */}
              <aside className="border-r border-border p-5 overflow-y-auto space-y-4 bg-muted/20">
                <div className="flex items-center justify-between gap-2 border-b border-border/80 pb-2 mb-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Profile Summary</h3>
                </div>

                {isEditingPerson ? (
                  <form onSubmit={handleSavePersonProfile} className="space-y-3 text-xs">
                    <label className="space-y-1 block">
                      <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold block">First Name</span>
                      <input value={personForm.first_name} onChange={event => setPersonForm({ ...personForm, first_name: event.target.value })} className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg outline-none" required />
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold block">Last Name</span>
                      <input value={personForm.last_name} onChange={event => setPersonForm({ ...personForm, last_name: event.target.value })} className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg outline-none" required />
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold block">Employee #</span>
                      <input value={personForm.employee_number} onChange={event => setPersonForm({ ...personForm, employee_number: event.target.value })} className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg outline-none" />
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold block">Email</span>
                      <input type="email" value={personForm.email} onChange={event => setPersonForm({ ...personForm, email: event.target.value })} className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg outline-none" />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="space-y-1 block">
                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold block">Department</span>
                        <input value={personForm.department} onChange={event => setPersonForm({ ...personForm, department: event.target.value })} className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg outline-none" />
                      </label>
                      <label className="space-y-1 block">
                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold block">Role</span>
                        <input value={personForm.role} onChange={event => setPersonForm({ ...personForm, role: event.target.value })} className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg outline-none" />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="space-y-1 block">
                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold block">Type</span>
                        <select value={personForm.person_type} onChange={event => setPersonForm({ ...personForm, person_type: event.target.value as PersonType })} className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg outline-none cursor-pointer">
                          {personTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </label>
                      <label className="space-y-1 block">
                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold block">Status</span>
                        <select value={personForm.active ? 'active' : 'inactive'} onChange={event => setPersonForm({ ...personForm, active: event.target.value === 'active' })} className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg outline-none cursor-pointer">
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="space-y-1 block">
                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold block">Start Date</span>
                        <input type="date" value={personForm.start_date} onChange={event => setPersonForm({ ...personForm, start_date: event.target.value })} className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg outline-none cursor-pointer" />
                      </label>
                      <label className="space-y-1 block">
                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold block">End Date</span>
                        <input type="date" value={personForm.end_date} onChange={event => setPersonForm({ ...personForm, end_date: event.target.value })} className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg outline-none cursor-pointer" />
                      </label>
                    </div>
                    <label className="space-y-1 block">
                      <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold block">Notes</span>
                      <textarea value={personForm.notes} onChange={event => setPersonForm({ ...personForm, notes: event.target.value })} rows={3} className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg outline-none resize-none leading-normal" />
                    </label>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button type="button" onClick={() => { syncPersonForm(selectedPerson); setIsEditingPerson(false); }} className="py-2 bg-muted hover:bg-muted/80 border border-border rounded-lg font-bold transition-colors">
                        Cancel
                      </button>
                      <button type="submit" disabled={isSavingPerson} className="py-2 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg font-bold transition-all">
                        {isSavingPerson ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        ['Employee #', selectedPerson.employee_number || 'Not set'],
                        ['Email', selectedPerson.email || 'Not set'],
                        ['Department', selectedPerson.department || 'Not set'],
                        ['Role', selectedPerson.role || 'Not set'],
                        ['Type', selectedPerson.person_type],
                        ['Status', selectedPerson.active ? 'Active' : 'Inactive'],
                        ['Start', selectedPerson.start_date || 'Not set'],
                        ['End', selectedPerson.end_date || 'Not set']
                      ].map(([label, value]) => (
                        <div key={label} className="p-2.5 bg-card border border-border rounded-lg">
                          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold block">{label}</span>
                          <span className="font-bold text-foreground break-words text-[11px]">{value}</span>
                        </div>
                      ))}
                    </div>

                    {selectedPerson.notes && <p className="text-xs text-muted-foreground bg-card border border-border rounded-lg p-3 leading-normal">{selectedPerson.notes}</p>}
                  </>
                )}

                {personFormMessage && (
                  <p className="text-[10px] text-muted-foreground border border-border bg-card rounded-lg p-2 leading-normal">
                    {personFormMessage}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {statusOptions.map(status => (
                    <div key={status} className={`rounded-lg border p-2 ${statusClass(status)}`}>
                      <span className="text-[9px] font-bold uppercase block">{status}</span>
                      <span className="text-lg font-extrabold">{selectedPersonStatusBreakdown[status] || 0}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 border-t border-border pt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Linked Actions</h3>
                  {selectedPersonActions.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No actions directly linked to this person.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedPersonActions.map(action => (
                        <div key={action.id} className="p-2.5 bg-card border border-border rounded-lg text-xs hover:bg-muted/30 transition-colors">
                          <span className="font-bold block text-foreground truncate">{action.title}</span>
                          <span className="text-[10px] text-muted-foreground mt-0.5 block">{action.status}{action.target_due_date || action.due_date ? ` | Due ${action.target_due_date || action.due_date}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </aside>

              {/* Column 2: Competency Records Grouped by Category */}
              <main className="p-5 overflow-y-auto space-y-5 flex flex-col h-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                  <div>
                    <h3 className="text-base font-extrabold">Competency Checklist</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Select a competency card to manage dates, evidence, or actions.</p>
                  </div>
                  {activeCell && activeCell.person.id === selectedPerson.id && (
                    <span className="inline-flex items-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2.5 py-0.5 w-fit">
                      Selected: {activeCell.competencyType.title}
                    </span>
                  )}
                </div>

                {/* Workspace Search & Filter */}
                <div className="flex flex-col sm:flex-row gap-3 bg-muted/40 border border-border/80 p-3 rounded-xl shrink-0">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={workspaceSearch}
                      onChange={event => setWorkspaceSearch(event.target.value)}
                      placeholder="Search competencies..."
                      className="w-full pl-9 pr-3 py-1.5 bg-card border border-border/80 rounded-lg text-xs outline-none text-foreground placeholder-muted-foreground"
                    />
                    {workspaceSearch && (
                      <button
                        onClick={() => setWorkspaceSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <select
                    value={workspaceStatusFilter}
                    onChange={event => setWorkspaceStatusFilter(event.target.value as any)}
                    className="bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground outline-none cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Valid">Valid</option>
                    <option value="Expiring Soon">Expiring Soon</option>
                    <option value="Expired">Expired</option>
                    <option value="Missing">Missing</option>
                    <option value="Not Required">Not Required</option>
                  </select>
                </div>

                <BulkSelectionToolbar
                  selectedCount={workspaceSelection.selectedCount}
                  recordLabel="competencies for this person"
                  onSelectVisible={workspaceSelection.selectVisible}
                  onClear={workspaceSelection.clearSelection}
                  message="Bulk status changes affect this person only."
                >
                  <select value={bulkWorkspaceStatus} onChange={event => setBulkWorkspaceStatus(event.target.value)} className="px-2.5 py-1.5 bg-card border border-border rounded-lg font-bold text-foreground outline-none">
                    <option value="">Status...</option>
                    {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <button type="button" onClick={applyWorkspaceCompetencyStatus} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer">
                    Apply competency status
                  </button>
                  {lastCompetencyUndo && (
                    <button type="button" onClick={undoWorkspaceCompetencyStatus} className="px-3 py-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg font-bold cursor-pointer">
                      {lastCompetencyUndo.label}
                    </button>
                  )}
                </BulkSelectionToolbar>

                {/* Competency Group List */}
                <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1">
                  {selectedPersonGroupedRows.map(group => (
                    <section key={group.category} className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-[1px] w-4 bg-border/60" />
                        <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">{group.category}</h4>
                        <span className="text-[9px] text-muted-foreground/80 bg-muted px-1.5 py-0.5 rounded-full font-semibold">{group.rows.length}</span>
                        <span className="h-[1px] flex-1 bg-border/60" />
                      </div>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                        {group.rows.map(({ type, cell, evidenceCount, openActionCount }) => {
                          const isActive = activeCell && activeCell.person.id === selectedPerson.id && activeCell.competencyType.id === type.id;
                          const isBulkSelected = workspaceSelection.isSelected(type.id);
                          return (
                            <div
                              key={type.id}
                              className={`w-full px-3.5 py-2.5 border rounded-xl hover:bg-muted/50 transition-all ${
                                isActive
                                  ? 'border-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/15 shadow-sm ring-1 ring-indigo-500/30'
                                  : isBulkSelected
                                    ? 'border-indigo-400 bg-indigo-500/5'
                                  : 'border-border/80 bg-card hover:border-border'
                              } flex items-start justify-between gap-3 group`}
                            >
                              <input
                                type="checkbox"
                                checked={isBulkSelected}
                                onChange={() => workspaceSelection.toggleSelected(type.id)}
                                className="mt-1 rounded border-border text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 bg-muted/40 cursor-pointer shrink-0"
                                aria-label={`Select ${type.title}`}
                              />
                              <button
                                type="button"
                                onClick={() => openCell(selectedPerson, type)}
                                className="min-w-0 flex-1 text-left cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs truncate block text-foreground group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">{type.title}</span>
                                  {type.validity_period_months && (
                                    <span className="text-[9px] text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded font-medium">
                                      {type.validity_period_months}m validity
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                  {cell?.record?.expiry_date ? (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
                                      Expiry: <strong className="text-foreground font-semibold">{cell.record.expiry_date}</strong>
                                    </span>
                                  ) : (
                                    <span className="italic text-muted-foreground/60">No date recorded</span>
                                  )}
                                  {evidenceCount > 0 && (
                                    <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                                      <Paperclip className="w-3.5 h-3.5" /> {evidenceCount} doc{evidenceCount > 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {openActionCount > 0 && (
                                    <span className="flex items-center gap-1 font-semibold text-rose-500">
                                      <AlertCircle className="w-3.5 h-3.5" /> {openActionCount} action{openActionCount > 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              </button>
                              <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold shrink-0 ${statusClass(cell?.status || 'Missing')}`}>
                                {cell?.status || 'Missing'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}

                  {selectedPersonGroupedRows.length === 0 && (
                    <div className="p-8 border border-dashed border-border rounded-xl text-center text-xs text-muted-foreground leading-normal bg-muted/10">
                      No matching competencies found. Try adjusting your search query or status filters.
                    </div>
                  )}
                </div>
              </main>

              {/* Column 3: Integrated Competency Detail Panel */}
              {activeCell && activeCell.person.id === selectedPerson.id && (
                <div className="absolute lg:relative inset-y-0 right-0 w-full lg:w-[380px] bg-card solid-panel border-l border-border z-30 flex flex-col h-full overflow-y-auto p-5 space-y-4.5 shadow-xl lg:shadow-none">
                  <div className="flex justify-between items-start gap-3 border-b border-border pb-3 shrink-0">
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground leading-tight">{activeCell.competencyType.title}</h3>
                      <span className="text-[9px] text-muted-foreground block mt-1 font-medium uppercase tracking-wider">
                        Category: {activeCell.competencyType.category}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveCell(null)}
                        className="lg:hidden px-2.5 py-1 text-[11px] font-bold text-indigo-650 dark:text-indigo-400 flex items-center gap-1 bg-indigo-500/10 rounded-lg hover:bg-indigo-500/20"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back
                      </button>
                      <button
                        onClick={() => setActiveCell(null)}
                        className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        title="Close detail panel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleSaveRecord} className="space-y-3.5 text-xs shrink-0">
                    <div className="grid grid-cols-2 gap-2.5">
                      <label className="space-y-1 block">
                        <span className="text-[9px] font-bold uppercase text-muted-foreground block">Completed</span>
                        <input type="date" value={recordForm.completed_date} onChange={event => setRecordForm({ ...recordForm, completed_date: event.target.value })} className="w-full px-2.5 py-1.5 bg-muted border border-border rounded-lg outline-none text-xs cursor-pointer" />
                      </label>
                      <label className="space-y-1 block">
                        <span className="text-[9px] font-bold uppercase text-muted-foreground block">Expiry</span>
                        <input type="date" value={recordForm.expiry_date} onChange={event => setRecordForm({ ...recordForm, expiry_date: event.target.value })} className="w-full px-2.5 py-1.5 bg-muted border border-border rounded-lg outline-none text-xs cursor-pointer" />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <input placeholder="Trainer" value={recordForm.trainer} onChange={event => setRecordForm({ ...recordForm, trainer: event.target.value })} className="px-2.5 py-1.5 bg-muted border border-border rounded-lg outline-none text-xs" />
                      <input placeholder="Provider" value={recordForm.provider} onChange={event => setRecordForm({ ...recordForm, provider: event.target.value })} className="px-2.5 py-1.5 bg-muted border border-border rounded-lg outline-none text-xs" />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <input placeholder="Certificate number" value={recordForm.certificate_number} onChange={event => setRecordForm({ ...recordForm, certificate_number: event.target.value })} className="px-2.5 py-1.5 bg-muted border border-border rounded-lg outline-none text-xs" />
                      <select value={recordForm.status} onChange={event => setRecordForm({ ...recordForm, status: event.target.value as CompetencyStatus })} className="px-2.5 py-1.5 bg-muted border border-border rounded-lg outline-none text-xs font-semibold cursor-pointer">
                        {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                    <textarea placeholder="Notes / comments..." value={recordForm.notes} onChange={event => setRecordForm({ ...recordForm, notes: event.target.value })} rows={2} className="w-full px-2.5 py-1.5 bg-muted border border-border rounded-lg outline-none resize-none text-xs leading-normal" />
                    <button type="submit" className="w-full py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors text-xs">Save Record</button>
                  </form>

                  {formMessage && <p className="text-[10px] text-muted-foreground border border-border bg-muted/20 rounded-lg p-2 leading-normal shrink-0">{formMessage}</p>}

                  {/* Evidence Section */}
                  <div className="border-t border-border pt-3.5 space-y-2.5 text-xs flex-1 min-h-0 flex flex-col">
                    <h4 className="text-xs font-bold text-foreground">Evidence</h4>

                    {linkedDocuments.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic bg-muted/15 p-2 rounded-lg border border-dashed border-border/80 text-center shrink-0">
                        No evidence documents linked.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 shrink-0">
                        {linkedDocuments.map(document => (
                          <div key={document.id} className="p-2 bg-muted/30 border border-border rounded-lg flex justify-between items-center gap-2 text-xs">
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold block truncate text-foreground text-[10px]">{document.title}</span>
                              <span className="text-[8px] text-muted-foreground truncate block">{document.file_name}</span>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button type="button" onClick={async () => window.open(await getDocumentSignedUrl(document.id), '_blank')} className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded text-[9px] font-bold hover:bg-indigo-500/20 transition-colors">Open</button>
                              {activeCell.record && <button type="button" onClick={() => unlinkDocumentFromCompetencyRecord(activeCell.record!.id, document.id)} className="px-1.5 py-0.5 bg-muted border border-border hover:bg-rose-500/10 hover:text-rose-500 rounded text-[9px] font-bold transition-colors">Unlink</button>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2 shrink-0">
                      <div className="flex gap-1.5">
                        <select value={linkDocumentId} onChange={event => setLinkDocumentId(event.target.value)} className="flex-1 px-2.5 py-1.5 bg-muted border border-border rounded-lg outline-none text-xs font-semibold appearance-none cursor-pointer">
                          <option value="">Link existing evidence...</option>
                          {documents.map(document => <option key={document.id} value={document.id}>{document.title}</option>)}
                        </select>
                        <button disabled={!activeCell.record || !linkDocumentId} onClick={() => activeCell.record && linkDocumentToCompetencyRecord(activeCell.record.id, linkDocumentId)} className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 border border-border disabled:opacity-50 rounded-lg text-xs font-bold transition-colors shrink-0">
                          Link
                        </button>
                      </div>

                      <label
                        onDragOver={event => {
                          event.preventDefault();
                          setIsEvidenceDragging(true);
                        }}
                        onDragLeave={() => setIsEvidenceDragging(false)}
                        onDrop={event => {
                          event.preventDefault();
                          setIsEvidenceDragging(false);
                          void handleEvidenceFiles(event.dataTransfer.files);
                        }}
                        className={`w-full min-h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer p-2.5 transition-all duration-200 ${
                          isEvidenceDragging
                            ? 'bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                            : 'bg-muted/30 border-border hover:bg-muted/50 hover:border-indigo-500/50'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-500" />
                        <div className="text-center">
                          <span className="font-semibold text-[10px] block text-foreground">
                            {uploading ? 'Uploading...' : 'Drop evidence file here'}
                          </span>
                          <span className="text-[8px] text-muted-foreground block">
                            or click to browse files
                          </span>
                        </div>
                        <input type="file" accept={evidenceAcceptAttribute} multiple className="hidden" onChange={event => event.target.files && handleEvidenceFiles(event.target.files)} />
                      </label>
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="border-t border-border pt-3.5 space-y-2 text-xs shrink-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground">Gap Actions</h4>
                      <button onClick={handleCreateGapAction} className="px-2 py-1 bg-indigo-650 hover:bg-indigo-700 text-white rounded text-[9px] font-bold flex items-center gap-1 transition-colors">
                        <Plus className="w-3 h-3" /> Create Gap Action
                      </button>
                    </div>
                    {relatedActions.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic text-center py-1.5 bg-muted/10 rounded-lg border border-dashed border-border/80">No actions linked.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                        {relatedActions.map(action => (
                          <div key={action.id} className="p-2 bg-muted/30 border border-border rounded-lg flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold block truncate text-[10px] text-foreground">{action.title}</span>
                              <span className="text-[8px] text-muted-foreground block">{action.status}{action.target_due_date || action.due_date ? ` | Due ${action.target_due_date || action.due_date}` : ''}</span>
                            </div>
                            <button onClick={() => setSelectedAction(action)} className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded text-[9px] font-bold hover:bg-indigo-500/20 transition-colors">Open</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Archiving controls */}
                  <div className="border-t border-border pt-3.5 grid grid-cols-2 gap-2 text-xs shrink-0">
                    <button onClick={handleMarkNotRequired} className="py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-700 dark:text-amber-300 rounded-lg font-bold transition-colors">
                      Not Required
                    </button>
                    <button onClick={handleArchiveFromPerson} className="py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-700 dark:text-rose-300 rounded-lg font-bold transition-colors">
                      Remove/Archive
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ActionDetailDrawer
        action={selectedAction}
        requirements={frameworkRequirements}
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
