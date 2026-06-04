'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { buildCompetencyMatrix } from '@/lib/competencyEngine';
import { COMPETENCY_TEMPLATE_PACKS } from '@/lib/competencyTemplates';
import { ActionDetailDrawer } from '@/components/ActionDetailDrawer';
import { EvidenceDropzone } from '@/components/EvidenceDropzone';
import { formatMaxEvidenceUploadSize } from '@/lib/evidenceStorage';
import type {
  Action,
  CompetencyCategory,
  CompetencyRecord,
  CompetencyStatus,
  CompetencyTemplateItem,
  CompetencyType,
  Person,
  PersonType,
  RequirementRiskLevel
} from '@/lib/types';
import { Link as LinkIcon, Plus, Search, Trash2, UserCheck, X, Grid, User, Folder, AlertTriangle, ChevronDown } from 'lucide-react';

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
const personFilterOptions = ['Active', 'Inactive', 'All'] as const;
const typeFilterOptions = ['Active', 'Inactive', 'All'] as const;

const departmentSuggestions = [
  'Operations',
  'Transport',
  'Warehouse',
  'Compliance',
  'Quality',
  'Health & Safety',
  'Security',
  'Fleet',
  'Maintenance',
  'HR',
  'Finance',
  'Customer Service',
  'Administration',
  'IT',
  'Procurement',
  'Environmental',
  'Training',
  'Management',
  'Other'
];

const roleSuggestions = [
  'Driver',
  'Warehouse Operative',
  'Forklift Operator',
  'Transport Planner',
  'Warehouse Supervisor',
  'Warehouse Manager',
  'Compliance Manager',
  'Quality Manager',
  'Health & Safety Officer',
  'Security Officer',
  'Fleet Manager',
  'Maintenance Technician',
  'Administrator',
  'Customer Service Representative',
  'HR Coordinator',
  'Finance Assistant',
  'Operations Manager',
  'Contractor',
  'Agency Worker',
  'Visitor',
  'Other'
];

const statusClass = (status: CompetencyStatus) => {
  if (status === 'Valid') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  if (status === 'Expiring Soon') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  if (status === 'Expired' || status === 'Missing') return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
  return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
};

const statusHelp: Record<CompetencyStatus, string> = {
  Valid: 'Current evidence or record is in place.',
  'Expiring Soon': 'Current now, but renewal or review is due soon.',
  Expired: 'The dated record is past its expiry date.',
  Missing: 'No competency record has been saved for this person.',
  'Not Required': 'This competency is intentionally excluded for this person.'
};

const getStatusBadgeStyles = (status: CompetencyStatus) => {
  switch (status) {
    case 'Valid':
      return {
        bg: 'bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
        dot: 'bg-emerald-500'
      };
    case 'Expiring Soon':
      return {
        bg: 'bg-amber-500/10 hover:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
        dot: 'bg-amber-500'
      };
    case 'Expired':
    case 'Missing':
      return {
        bg: 'bg-rose-500/10 hover:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20',
        dot: 'bg-rose-500'
      };
    case 'Not Required':
    default:
      return {
        bg: 'bg-zinc-100 hover:bg-zinc-200/50 text-zinc-650 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/60 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-800',
        dot: 'bg-zinc-400'
      };
  }
};

const renderEmptyState = (title: string, desc: string, onAction?: () => void, actionText?: string) => (
  <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground max-w-lg mx-auto my-6 shadow-sm">
    <AlertTriangle className="w-10 h-10 text-indigo-500 mx-auto mb-3 opacity-60" />
    <h3 className="font-extrabold text-foreground text-sm">{title}</h3>
    <p className="text-xs mt-1 leading-relaxed">{desc}</p>
    {onAction && actionText && (
      <button onClick={onAction} className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors">
        {actionText}
      </button>
    )}
  </div>
);

type ActiveCell = {
  person: Person;
  competencyType: CompetencyType;
  record: CompetencyRecord | null;
};

type PersonForm = {
  first_name: string;
  last_name: string;
  employee_number: string;
  email: string;
  department: string;
  role: string;
  person_type: PersonType;
  start_date: string;
  end_date: string;
  active: boolean;
  notes: string;
};

type TypeForm = {
  title: string;
  category: CompetencyCategory;
  description: string;
  validity_period_months: string;
  refresher_period_months: string;
  evidence_required: boolean;
  default_risk_level: RequirementRiskLevel;
  active: boolean;
};

type CompetencyRecordForm = {
  completed_date: string;
  expiry_date: string;
  trainer: string;
  provider: string;
  certificate_number: string;
  status: CompetencyStatus;
  notes: string;
};

const blankPersonForm = (): PersonForm => ({
  first_name: '',
  last_name: '',
  employee_number: '',
  email: '',
  department: '',
  role: '',
  person_type: 'Employee',
  start_date: '',
  end_date: '',
  active: true,
  notes: ''
});

const personToForm = (person: Person): PersonForm => ({
  first_name: person.first_name,
  last_name: person.last_name,
  employee_number: person.employee_number || '',
  email: person.email || '',
  department: person.department || '',
  role: person.role || '',
  person_type: person.person_type,
  start_date: person.start_date || '',
  end_date: person.end_date || '',
  active: person.active,
  notes: person.notes || ''
});

const blankTypeForm = (): TypeForm => ({
  title: '',
  category: 'Safety',
  description: '',
  validity_period_months: '36',
  refresher_period_months: '12',
  evidence_required: true,
  default_risk_level: 'Medium',
  active: true
});

const typeToForm = (type: CompetencyType): TypeForm => ({
  title: type.title,
  category: type.category,
  description: type.description || '',
  validity_period_months: type.validity_period_months === null ? '' : String(type.validity_period_months),
  refresher_period_months: type.refresher_period_months === null ? '' : String(type.refresher_period_months),
  evidence_required: type.evidence_required,
  default_risk_level: type.default_risk_level,
  active: type.active
});

const recordToForm = (record: CompetencyRecord | null, status: CompetencyStatus = 'Valid'): CompetencyRecordForm => ({
  completed_date: record?.completed_date || '',
  expiry_date: record?.expiry_date || '',
  trainer: record?.trainer || '',
  provider: record?.provider || '',
  certificate_number: record?.certificate_number || '',
  status: record?.status || status,
  notes: record?.notes || ''
});

const templateKey = (item: Pick<CompetencyTemplateItem, 'title' | 'category'>) =>
  `${item.title.trim().toLowerCase()}::${item.category.trim().toLowerCase()}`;

export default function CompetencyMatrixPage() {
  const {
    people,
    competencyTypes,
    competencyRecords,
    competencyRecordDocuments,
    documents,
    frameworkRequirements,
    requirementActions,
    actionUpdates,
    actionDocuments,
    actionObjectLinks,
    actions,
    competencySummary,
    updateAction,
    addActionUpdate,
    linkDocumentToAction,
    unlinkDocumentFromAction,
    uploadActionAttachment,
    upsertPerson,
    upsertCompetencyType,
    importCompetencyTemplateItems,
    upsertCompetencyRecord,
    deleteCompetencyRecord,
    linkDocumentToCompetencyRecord,
    unlinkDocumentFromCompetencyRecord,
    uploadCompetencyEvidence,
    createActionForCompetencyGap,
    getDocumentSignedUrl,
    findPossibleDuplicateDocuments
  } = useApp();

  const [viewMode, setViewMode] = useState<'matrix' | 'person' | 'category'>('matrix');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [personTypeFilter, setPersonTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [personStateFilter, setPersonStateFilter] = useState<typeof personFilterOptions[number]>('Active');
  const [typeStateFilter, setTypeStateFilter] = useState<typeof typeFilterOptions[number]>('Active');
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedType, setSelectedType] = useState<CompetencyType | null>(null);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [selectedPackId, setSelectedPackId] = useState(COMPETENCY_TEMPLATE_PACKS[0]?.id || '');
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [selectedTemplateKeys, setSelectedTemplateKeys] = useState<Set<string>>(new Set());
  const [importMessage, setImportMessage] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [personMessage, setPersonMessage] = useState('');
  const [typeMessage, setTypeMessage] = useState('');
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
  const [personRecordEditId, setPersonRecordEditId] = useState<string | null>(null);
  const [personRecordForm, setPersonRecordForm] = useState<CompetencyRecordForm>(recordToForm(null));
  const [personRecordLinkIds, setPersonRecordLinkIds] = useState<Record<string, string>>({});
  const [personRecordUploadingId, setPersonRecordUploadingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newPerson, setNewPerson] = useState<PersonForm>(blankPersonForm());
  const [newType, setNewType] = useState<TypeForm>(blankTypeForm());
  const [personEditForm, setPersonEditForm] = useState<PersonForm>(blankPersonForm());
  const [typeEditForm, setTypeEditForm] = useState<TypeForm>(blankTypeForm());
  const [isEditingPerson, setIsEditingPerson] = useState(false);
  const [isEditingType, setIsEditingType] = useState(false);
  const [expandedStatusKey, setExpandedStatusKey] = useState<string | null>(null);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [drawerCategoryFilter, setDrawerCategoryFilter] = useState('All');
  const [drawerStatusFilter, setDrawerStatusFilter] = useState('All');
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [notRequiredConfirmCell, setNotRequiredConfirmCell] = useState<{ person: Person; competencyType: CompetencyType; record: CompetencyRecord | null } | null>(null);
  const [notRequiredNote, setNotRequiredNote] = useState('');
  const [removeConfirmCell, setRemoveConfirmCell] = useState<{ person: Person; competencyType: CompetencyType; record: CompetencyRecord | null; hasEvidence: boolean; hasActions: boolean } | null>(null);

  const selectedPack = COMPETENCY_TEMPLATE_PACKS.find(pack => pack.id === selectedPackId) || COMPETENCY_TEMPLATE_PACKS[0];
  const existingTemplateKeys = useMemo(
    () => new Set(competencyTypes.map(type => templateKey(type))),
    [competencyTypes]
  );
  const matrix = useMemo(
    () => buildCompetencyMatrix(people, competencyTypes, competencyRecords),
    [competencyRecords, competencyTypes, people]
  );

  const allDepartments = useMemo(() => {
    const depts = new Set<string>();
    people.forEach(p => {
      if (p.department) depts.add(p.department);
    });
    departmentSuggestions.forEach(d => depts.add(d));
    return ['All', ...Array.from(depts).sort()];
  }, [people]);

  const allRoles = useMemo(() => {
    const roles = new Set<string>();
    people.forEach(p => {
      if (p.role) roles.add(p.role);
    });
    roleSuggestions.forEach(r => roles.add(r));
    return ['All', ...Array.from(roles).sort()];
  }, [people]);

  const visiblePeople = useMemo(() => {
    return people.filter(person => {
      if (personStateFilter === 'Active' && !person.active) return false;
      if (personStateFilter === 'Inactive' && person.active) return false;
      return true;
    });
  }, [people, personStateFilter]);

  const visibleTypes = useMemo(() => {
    return competencyTypes.filter(type => {
      if (typeStateFilter === 'Active' && !type.active) return false;
      if (typeStateFilter === 'Inactive' && type.active) return false;
      return true;
    });
  }, [competencyTypes, typeStateFilter]);

  const filteredPeople = useMemo(() => {
    return visiblePeople.filter(person => {
      // 1. Text Search (filters by name, department, role, type)
      const text = `${person.display_name} ${person.department || ''} ${person.role || ''} ${person.person_type}`.toLowerCase();
      if (search && !text.includes(search.toLowerCase())) return false;

      // 2. Department Filter
      if (departmentFilter !== 'All' && person.department !== departmentFilter) return false;

      // 3. Role Filter
      if (roleFilter !== 'All' && person.role !== roleFilter) return false;

      // 4. Person Type Filter
      if (personTypeFilter !== 'All' && person.person_type !== personTypeFilter) return false;

      // 5. Status Filter
      if (statusFilter !== 'All') {
        const personCells = matrix.filter(cell => cell.person.id === person.id);
        const hasMatchingCell = personCells.some(cell => cell.status === statusFilter);
        if (!hasMatchingCell) return false;
      }

      return true;
    });
  }, [visiblePeople, search, departmentFilter, roleFilter, personTypeFilter, statusFilter, matrix]);

  const filteredTypes = useMemo(() => {
    const types = visibleTypes.filter(type => categoryFilter === 'All' || type.category === categoryFilter);
    // Sort by category first, then by title
    return [...types].sort((a, b) => {
      const catA = categories.indexOf(a.category);
      const catB = categories.indexOf(b.category);
      if (catA !== catB) return catA - catB;
      return a.title.localeCompare(b.title);
    });
  }, [visibleTypes, categoryFilter]);

  const openCell = (person: Person, competencyType: CompetencyType) => {
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

  const openPerson = (person: Person) => {
    setSelectedPerson(person);
    setPersonEditForm(personToForm(person));
    setIsEditingPerson(false);
    setPersonMessage('');
    setDrawerSearch('');
    setDrawerCategoryFilter('All');
    setDrawerStatusFilter('All');
    setExpandedRecords(new Set());
    setCollapsedCategories(new Set());
  };

  const openType = (type: CompetencyType) => {
    setSelectedType(type);
    setTypeEditForm(typeToForm(type));
    setIsEditingType(false);
    setTypeMessage('');
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

  const selectedPersonRecords = useMemo(() => {
    return selectedPerson
      ? competencyRecords.filter(record => record.person_id === selectedPerson.id)
      : [];
  }, [selectedPerson, competencyRecords]);

  const selectedPersonActions = useMemo(() => {
    return selectedPerson
      ? actions.filter(action =>
          actionObjectLinks.some(link =>
            link.action_id === action.id &&
            ((link.object_type === 'person' && link.object_id === selectedPerson.id) ||
              selectedPersonRecords.some(record => link.object_type === 'competency_record' && link.object_id === record.id))
          )
        )
      : [];
  }, [selectedPerson, actions, actionObjectLinks, selectedPersonRecords]);

  const selectedPersonBreakdown = useMemo(() => {
    return statusOptions.reduce((acc, status) => {
      acc[status] = selectedPersonRecords.filter(record => {
        const cell = matrix.find(item => item.record?.id === record.id);
        return (cell?.status || record.status) === status;
      }).length;
      return acc;
    }, {} as Record<CompetencyStatus, number>);
  }, [selectedPersonRecords, matrix]);
  const selectedPersonRows = useMemo(() => {
    return selectedPerson
      ? competencyTypes
          .filter(type => type.active || selectedPersonRecords.some(record => record.competency_type_id === type.id))
          .map(type => {
            const cell = matrix.find(item => item.person.id === selectedPerson.id && item.competencyType.id === type.id);
            const record = cell?.record || selectedPersonRecords.find(item => item.competency_type_id === type.id) || null;
            const evidenceLinks = record ? competencyRecordDocuments.filter(link => link.competency_record_id === record.id) : [];
            const evidenceDocuments = evidenceLinks
              .map(link => documents.find(document => document.id === link.document_id))
              .filter((document): document is NonNullable<typeof document> => Boolean(document));
            const rowActions = actions.filter(action =>
              actionObjectLinks.some(link =>
                link.action_id === action.id &&
                ((link.object_type === 'person' && link.object_id === selectedPerson.id) ||
                  (link.object_type === 'competency_type' && link.object_id === type.id) ||
                  (record && link.object_type === 'competency_record' && link.object_id === record.id))
              )
            );
            return {
              type,
              record,
              status: (cell?.status || record?.status || 'Missing') as CompetencyStatus,
              evidenceDocuments,
              actions: rowActions
            };
          })
      : [];
  }, [selectedPerson, competencyTypes, selectedPersonRecords, matrix, competencyRecordDocuments, documents, actions, actionObjectLinks]);

  const groupedSelectedPersonRows = useMemo(() => {
    if (!selectedPerson) return {} as Record<CompetencyCategory, typeof selectedPersonRows>;
    const groups = {} as Record<CompetencyCategory, typeof selectedPersonRows>;
    selectedPersonRows.forEach(row => {
      const cat = row.type.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(row);
    });
    return groups;
  }, [selectedPerson, selectedPersonRows]);

  const drawerFilteredRows = useMemo(() => {
    return selectedPersonRows.filter(row => {
      const text = `${row.type.title} ${row.type.description || ''}`.toLowerCase();
      if (drawerSearch && !text.includes(drawerSearch.toLowerCase())) return false;

      if (drawerCategoryFilter !== 'All' && row.type.category !== drawerCategoryFilter) return false;

      if (drawerStatusFilter !== 'All' && row.status !== drawerStatusFilter) return false;

      return true;
    });
  }, [selectedPersonRows, drawerSearch, drawerCategoryFilter, drawerStatusFilter]);

  const groupedDrawerRows = useMemo(() => {
    const groups = {} as Record<CompetencyCategory, typeof selectedPersonRows>;
    drawerFilteredRows.forEach(row => {
      const cat = row.type.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(row);
    });
    return groups;
  }, [drawerFilteredRows]);

  const toggleRecordExpanded = (rowKey: string) => {
    setExpandedRecords(prev => {
      const next = new Set(prev);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  };

  const toggleCategoryCollapsed = (category: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const categoryViewData = useMemo(() => {
    const data: Array<{
      category: CompetencyCategory;
      types: Array<{
        type: CompetencyType;
        statuses: Record<CompetencyStatus, Person[]>;
      }>;
    }> = [];

    categories.forEach(cat => {
      const typesInCat = filteredTypes.filter(t => t.category === cat);
      if (typesInCat.length === 0) return;

      const typesData = typesInCat.map(type => {
        const statuses: Record<CompetencyStatus, Person[]> = {
          Valid: [],
          'Expiring Soon': [],
          Expired: [],
          Missing: [],
          'Not Required': []
        };

        filteredPeople.forEach(person => {
          const cell = matrix.find(
            item => item.person.id === person.id && item.competencyType.id === type.id
          );
          const status = cell?.status || 'Missing';
          statuses[status].push(person);
        });

        return { type, statuses };
      });

      data.push({ category: cat, types: typesData });
    });

    return data;
  }, [matrix, filteredTypes, filteredPeople]);

  const currentSelectedAction = selectedAction ? actions.find(action => action.id === selectedAction.id) || selectedAction : null;
  const selectedActionRequirements = currentSelectedAction
    ? frameworkRequirements.filter(requirement =>
        requirementActions.some(link => link.action_id === currentSelectedAction.id && link.requirement_id === requirement.id)
      )
    : [];

  const resetNewPerson = () => setNewPerson(blankPersonForm());
  const resetNewType = () => setNewType(blankTypeForm());

  const savePerson = async (form: PersonForm, existing?: Person) => {
    if (!form.first_name.trim() || !form.last_name.trim()) return null;
    return upsertPerson({
      id: existing?.id,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      display_name: `${form.first_name} ${form.last_name}`.trim(),
      employee_number: form.employee_number || null,
      email: form.email || null,
      department: form.department || null,
      role: form.role || null,
      person_type: form.person_type,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      active: form.active,
      notes: form.notes || null
    });
  };

  const saveType = async (form: TypeForm, existing?: CompetencyType) => {
    if (!form.title.trim()) return null;
    return upsertCompetencyType({
      id: existing?.id,
      title: form.title.trim(),
      category: form.category,
      description: form.description || null,
      validity_period_months: form.validity_period_months ? Number(form.validity_period_months) : null,
      refresher_period_months: form.refresher_period_months ? Number(form.refresher_period_months) : null,
      evidence_required: form.evidence_required,
      default_risk_level: form.default_risk_level,
      active: form.active
    });
  };

  const handleCreatePerson = async (event: React.FormEvent) => {
    event.preventDefault();
    const saved = await savePerson(newPerson);
    if (saved) resetNewPerson();
  };

  const handleCreateType = async (event: React.FormEvent) => {
    event.preventDefault();
    const saved = await saveType(newType);
    if (saved) resetNewType();
  };

  const openImportPreview = () => {
    if (!selectedPack) return;
    setSelectedTemplateKeys(new Set(
      selectedPack.competencies
        .filter(item => !existingTemplateKeys.has(templateKey(item)))
        .map(item => templateKey(item))
    ));
    setImportMessage('');
    setShowImportPreview(true);
  };

  const handleImportSelected = async () => {
    if (!selectedPack) return;
    const selected = selectedPack.competencies.filter(item =>
      selectedTemplateKeys.has(templateKey(item)) && !existingTemplateKeys.has(templateKey(item))
    );
    const imported = await importCompetencyTemplateItems(selected);
    setImportMessage(`Imported ${imported.length} competency type${imported.length === 1 ? '' : 's'}.`);
    setSelectedTemplateKeys(new Set());
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

  const handleMarkNotRequired = async () => {
    if (!activeCell) return;
    const saved = await upsertCompetencyRecord({
      id: activeCell.record?.id,
      person_id: activeCell.person.id,
      competency_type_id: activeCell.competencyType.id,
      completed_date: null,
      expiry_date: null,
      trainer: null,
      provider: null,
      certificate_number: null,
      status: 'Not Required',
      notes: recordForm.notes || 'Marked not required.'
    });
    setActiveCell({ ...activeCell, record: saved });
    setRecordForm({ ...recordForm, completed_date: '', expiry_date: '', status: 'Not Required' });
    setFormMessage('Competency marked not required.');
  };

  const handleClearRecord = async () => {
    if (!activeCell) return;
    const saved = await upsertCompetencyRecord({
      id: activeCell.record?.id,
      person_id: activeCell.person.id,
      competency_type_id: activeCell.competencyType.id,
      completed_date: null,
      expiry_date: null,
      trainer: null,
      provider: null,
      certificate_number: null,
      status: 'Missing',
      notes: recordForm.notes || null
    });
    setActiveCell({ ...activeCell, record: saved });
    setRecordForm({ completed_date: '', expiry_date: '', trainer: '', provider: '', certificate_number: '', status: 'Missing', notes: saved.notes || '' });
    setFormMessage('Record cleared without deleting history or evidence links.');
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

  const startPersonRecordEdit = (key: string, record: CompetencyRecord | null, status: CompetencyStatus) => {
    setPersonRecordEditId(key);
    setPersonRecordForm(recordToForm(record, status === 'Missing' ? 'Valid' : status));
    setPersonMessage('');
  };

  const savePersonRecord = async (person: Person, competencyType: CompetencyType, record: CompetencyRecord | null) => {
    const saved = await upsertCompetencyRecord({
      id: record?.id,
      person_id: person.id,
      competency_type_id: competencyType.id,
      completed_date: personRecordForm.completed_date || null,
      expiry_date: personRecordForm.expiry_date || null,
      trainer: personRecordForm.trainer || null,
      provider: personRecordForm.provider || null,
      certificate_number: personRecordForm.certificate_number || null,
      status: personRecordForm.status,
      notes: personRecordForm.notes || null
    });
    setPersonRecordEditId(null);
    setPersonMessage(`Saved ${competencyType.title} for ${person.display_name}.`);
    return saved;
  };

  const markPersonRecordNotRequired = async (person: Person, competencyType: CompetencyType, record: CompetencyRecord | null, note?: string) => {
    await upsertCompetencyRecord({
      id: record?.id,
      person_id: person.id,
      competency_type_id: competencyType.id,
      completed_date: null,
      expiry_date: null,
      trainer: record?.trainer || null,
      provider: record?.provider || null,
      certificate_number: record?.certificate_number || null,
      status: 'Not Required',
      notes: note || record?.notes || 'Marked not required from person detail.'
    });
    setPersonMessage(`${competencyType.title} marked not required.`);
  };

  const removePersonRecord = async (person: Person, competencyType: CompetencyType, record: CompetencyRecord | null, hasEvidence: boolean, hasActions: boolean) => {
    if (!record) {
      await markPersonRecordNotRequired(person, competencyType, null, 'Archived via removal from active matrix.');
      return;
    }

    if (hasEvidence || hasActions) {
      await upsertCompetencyRecord({
        ...record,
        status: 'Not Required',
        notes: record.notes || 'Archived from active matrix because evidence, actions or history exists.'
      });
      setPersonMessage(`${competencyType.title} archived as Not Required; evidence and action history were preserved.`);
      return;
    }

    await deleteCompetencyRecord(record.id);
    setPersonMessage(`${competencyType.title} removed from this person.`);
  };

  const linkEvidenceFromPerson = async (record: CompetencyRecord | null, rowKey: string) => {
    const documentId = personRecordLinkIds[rowKey];
    if (!record || !documentId) {
      setPersonMessage('Save the competency record before linking evidence.');
      return;
    }
    await linkDocumentToCompetencyRecord(record.id, documentId);
    setPersonRecordLinkIds({ ...personRecordLinkIds, [rowKey]: '' });
    setPersonMessage('Evidence linked to competency record.');
  };

  const createGapActionFromPerson = async (person: Person, competencyType: CompetencyType, record: CompetencyRecord | null) => {
    const action = await createActionForCompetencyGap({
      personId: person.id,
      competencyTypeId: competencyType.id,
      competencyRecordId: record?.id || null,
      title: `Resolve ${competencyType.title} gap for ${person.display_name}`,
      dueDate: record?.expiry_date || null
    });
    setSelectedAction(action);
    setPersonMessage('Gap action created.');
  };

  const renderPersonFields = (form: PersonForm, setForm: (value: PersonForm) => void, includeActive = false) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input required placeholder="First name" value={form.first_name} onChange={event => setForm({ ...form, first_name: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
        <input required placeholder="Last name" value={form.last_name} onChange={event => setForm({ ...form, last_name: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input placeholder="Employee number" value={form.employee_number} onChange={event => setForm({ ...form, employee_number: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
        <input placeholder="Email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Department</span>
          <input list="department-suggestions" placeholder="e.g. Warehouse" value={form.department} onChange={event => setForm({ ...form, department: event.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Role</span>
          <input list="role-suggestions" placeholder="e.g. Driver" value={form.role} onChange={event => setForm({ ...form, role: event.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={form.person_type} onChange={event => setForm({ ...form, person_type: event.target.value as PersonType })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none">
          {personTypes.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <input type="date" value={form.start_date} onChange={event => setForm({ ...form, start_date: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
      </div>
      {includeActive && (
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={form.end_date} onChange={event => setForm({ ...form, end_date: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
          <label className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-lg">
            <input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} />
            <span>Active person</span>
          </label>
        </div>
      )}
      <textarea placeholder="Notes" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} rows={2} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none resize-none" />
    </div>
  );

  const renderTypeFields = (form: TypeForm, setForm: (value: TypeForm) => void, includeActive = false) => (
    <div className="space-y-3">
      <input required placeholder="Title" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
      <select value={form.category} onChange={event => setForm({ ...form, category: event.target.value as CompetencyCategory })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none">
        {categories.map(category => <option key={category} value={category}>{category}</option>)}
      </select>
      <textarea placeholder="Description" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} rows={2} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none resize-none" />
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Validity period months</span>
          <input type="number" min="0" placeholder="e.g. 36" value={form.validity_period_months} onChange={event => setForm({ ...form, validity_period_months: event.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Refresher period months</span>
          <input type="number" min="0" placeholder="e.g. 12" value={form.refresher_period_months} onChange={event => setForm({ ...form, refresher_period_months: event.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Default risk level</span>
          <select value={form.default_risk_level} onChange={event => setForm({ ...form, default_risk_level: event.target.value as RequirementRiskLevel })} className="w-full px-2 py-2 bg-muted border border-border rounded-lg outline-none">
            {riskLevels.map(level => <option key={level} value={level}>{level}</option>)}
          </select>
        </label>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Validity period controls how long the competency is treated as current. Refresher period can be used to flag earlier review or renewal.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-lg">
          <input type="checkbox" checked={form.evidence_required} onChange={event => setForm({ ...form, evidence_required: event.target.checked })} />
          <span>Evidence required</span>
        </label>
        {includeActive && (
          <label className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-lg">
            <input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} />
            <span>Active type</span>
          </label>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <datalist id="department-suggestions">
        {departmentSuggestions.map(item => <option key={item} value={item} />)}
      </datalist>
      <datalist id="role-suggestions">
        {roleSuggestions.map(item => <option key={item} value={item} />)}
      </datalist>

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

      {/* View switcher */}
      <div className="flex border-b border-border/80">
        {[
          { id: 'matrix', label: 'Matrix View', icon: Grid },
          { id: 'person', label: 'Person View', icon: User },
          { id: 'category', label: 'Category View', icon: Folder }
        ].map(tab => {
          const Icon = tab.icon;
          const active = viewMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as 'matrix' | 'person' | 'category')}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                active
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 font-extrabold bg-indigo-500/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Re-designed Filters Panel */}
      <div className="bg-card border border-border p-4 rounded-xl space-y-3">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Search & Filters</span>
          {(search || departmentFilter !== 'All' || roleFilter !== 'All' || personTypeFilter !== 'All' || statusFilter !== 'All' || categoryFilter !== 'All' || personStateFilter !== 'Active' || typeStateFilter !== 'Active') && (
            <button
              onClick={() => {
                setSearch('');
                setDepartmentFilter('All');
                setRoleFilter('All');
                setPersonTypeFilter('All');
                setStatusFilter('All');
                setCategoryFilter('All');
                setPersonStateFilter('Active');
                setTypeStateFilter('Active');
              }}
              className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              Clear Filters
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search name, role, dept..."
              className="w-full pl-8 pr-3 py-1.5 bg-muted border border-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500/30 text-foreground"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">Department</span>
            <select
              value={departmentFilter}
              onChange={event => setDepartmentFilter(event.target.value)}
              className="bg-muted border border-border rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500/30 text-foreground"
            >
              {allDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">Role</span>
            <select
              value={roleFilter}
              onChange={event => setRoleFilter(event.target.value)}
              className="bg-muted border border-border rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500/30 text-foreground"
            >
              {allRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">Person Type</span>
            <select
              value={personTypeFilter}
              onChange={event => setPersonTypeFilter(event.target.value)}
              className="bg-muted border border-border rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500/30 text-foreground"
            >
              <option value="All">All Types</option>
              {personTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">Status</span>
            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value)}
              className="bg-muted border border-border rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500/30 text-foreground"
            >
              <option value="All">All Statuses</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">Category</span>
            <select
              value={categoryFilter}
              onChange={event => setCategoryFilter(event.target.value)}
              className="bg-muted border border-border rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500/30 text-foreground"
            >
              <option value="All">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">People Status</span>
            <select
              value={personStateFilter}
              onChange={event => setPersonStateFilter(event.target.value as typeof personFilterOptions[number])}
              className="bg-muted border border-border rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500/30 text-foreground"
            >
              {personFilterOptions.map(opt => (
                <option key={opt} value={opt}>{opt} People</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">Types Status</span>
            <select
              value={typeStateFilter}
              onChange={event => setTypeStateFilter(event.target.value as typeof typeFilterOptions[number])}
              className="bg-muted border border-border rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500/30 text-foreground"
            >
              {typeFilterOptions.map(opt => (
                <option key={opt} value={opt}>{opt} Types</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* MATRIX VIEW */}
      {viewMode === 'matrix' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-2 space-y-4">
            {filteredPeople.length === 0 || filteredTypes.length === 0 ? (
              renderEmptyState(
                'No Matrix Results',
                'No people or competency types match your filters. Adjust the filters above or add templates.',
                () => {
                  setSearch('');
                  setDepartmentFilter('All');
                  setRoleFilter('All');
                  setPersonTypeFilter('All');
                  setStatusFilter('All');
                  setCategoryFilter('All');
                  setPersonStateFilter('Active');
                  setTypeStateFilter('Active');
                },
                'Clear All Filters'
              )
            ) : (
              <div className="relative border border-border rounded-xl overflow-hidden bg-card shadow-sm">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/10">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/70 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[9px]">
                        <th className="p-3 sticky left-0 bg-muted/95 z-10 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.03)] min-w-56"></th>
                        {(() => {
                          const headers: Array<{ name: string; colSpan: number }> = [];
                          let currentCat: string | null = null;
                          let count = 0;
                          filteredTypes.forEach(t => {
                            if (t.category !== currentCat) {
                              if (currentCat !== null) headers.push({ name: currentCat, colSpan: count });
                              currentCat = t.category;
                              count = 1;
                            } else count++;
                          });
                          if (currentCat !== null) headers.push({ name: currentCat, colSpan: count });
                          return headers.map((h, i) => (
                            <th key={`${h.name}-${i}`} colSpan={h.colSpan} className="p-2 text-center border-r border-border/30 bg-muted/40 font-extrabold text-[10px] text-foreground tracking-widest">
                              {h.name}
                            </th>
                          ));
                        })()}
                      </tr>
                      <tr className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider text-[9px]">
                        <th className="p-3 sticky left-0 bg-muted/95 z-10 min-w-56 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.03)]">Person</th>
                        {filteredTypes.map(type => (
                          <th key={type.id} className="p-3 min-w-40 border-r border-border/30">
                            <button onClick={() => openType(type)} className="text-left hover:text-indigo-500 font-bold block truncate">
                              <span>{type.title}</span>
                              {!type.active && <span className="text-[8px] text-amber-500 font-normal block">Inactive</span>}
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredPeople.map(person => (
                        <tr key={person.id} className="hover:bg-muted/20 transition-colors group">
                          <td className={`p-3 sticky left-0 bg-card z-10 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.03)] group-hover:bg-muted/25 transition-colors ${selectedPerson?.id === person.id ? 'ring-1 ring-inset ring-indigo-500/20 bg-indigo-500/5' : ''}`}>
                            <button onClick={() => openPerson(person)} className="text-left w-full hover:text-indigo-500">
                              <span className="font-extrabold block text-foreground">{person.display_name}</span>
                              <span className="text-[10px] text-muted-foreground">{person.department || 'No department'} | {person.role || person.person_type}</span>
                              {!person.active && <span className="text-[9px] text-amber-500 block">Inactive</span>}
                            </button>
                          </td>
                          {filteredTypes.map(type => {
                            const cell = matrix.find(item => item.person.id === person.id && item.competencyType.id === type.id);
                            const status: CompetencyStatus = cell?.status || 'Missing';
                            const styles = getStatusBadgeStyles(status);
                            const active = activeCell?.person.id === person.id && activeCell.competencyType.id === type.id;
                            return (
                              <td key={type.id} className="p-3 border-r border-border/30">
                                <button
                                  onClick={() => openCell(person, type)}
                                  title={statusHelp[status]}
                                  className={`w-full flex items-center justify-between border rounded-lg px-2.5 py-1.5 transition-all text-xs font-semibold ${styles.bg} ${active ? 'ring-2 ring-indigo-500/40 border-indigo-500' : ''}`}
                                >
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />
                                    <span className="truncate">{status}</span>
                                  </div>
                                  {cell?.record?.expiry_date && (
                                    <span className="text-[8px] opacity-75 font-normal ml-1 hidden lg:inline shrink-0">
                                      {cell.record.expiry_date}
                                    </span>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground pt-2">
              {statusOptions.map(status => {
                const styles = getStatusBadgeStyles(status);
                return (
                  <span key={status} className={`px-2 py-1 rounded border flex items-center gap-1.5 ${styles.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                    <strong>{status}:</strong> {statusHelp[status]}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <form onSubmit={handleCreatePerson} className="bg-card border border-border rounded-xl p-4 space-y-3 text-xs shadow-sm">
              <h2 className="text-sm font-extrabold flex items-center gap-2"><UserCheck className="w-4 h-4" /> Add Person</h2>
              {renderPersonFields(newPerson, setNewPerson)}
              <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors">Save Person</button>
            </form>

            <form onSubmit={handleCreateType} className="bg-card border border-border rounded-xl p-4 space-y-3 text-xs shadow-sm">
              <h2 className="text-sm font-extrabold">Add Competency Type</h2>
              {renderTypeFields(newType, setNewType)}
              <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors">Save Type</button>
            </form>

            <div className="bg-card border border-border rounded-xl p-4 space-y-3 text-xs shadow-sm">
              <h2 className="text-sm font-extrabold">Import Template Pack</h2>
              <select value={selectedPackId} onChange={event => { setSelectedPackId(event.target.value); setImportMessage(''); }} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none text-foreground">
                {COMPETENCY_TEMPLATE_PACKS.map(pack => <option key={pack.id} value={pack.id}>{pack.name}</option>)}
              </select>
              <p className="text-[11px] text-muted-foreground">{selectedPack?.description}</p>
              <button onClick={openImportPreview} className="w-full py-2 bg-muted hover:bg-muted/80 border border-border font-bold rounded-lg transition-colors text-foreground">Preview Pack</button>
              {importMessage && <p className="text-[11px] text-emerald-500 font-semibold">{importMessage}</p>}
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-2 text-xs shadow-sm">
              <h2 className="text-sm font-extrabold">Manage Existing</h2>
              <div className="max-h-36 overflow-y-auto space-y-1">
                {visiblePeople.slice(0, 8).map(person => (
                  <button key={person.id} onClick={() => openPerson(person)} className="w-full text-left px-2 py-1.5 rounded bg-muted/30 hover:bg-muted/60 text-foreground font-semibold">
                    {person.display_name} <span className="text-[10px] text-muted-foreground font-normal">{person.active ? '' : '(inactive)'}</span>
                  </button>
                ))}
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 pt-2 border-t border-border">
                {visibleTypes.slice(0, 8).map(type => (
                  <button key={type.id} onClick={() => openType(type)} className="w-full text-left px-2 py-1.5 rounded bg-muted/30 hover:bg-muted/60 text-foreground font-semibold">
                    {type.title} <span className="text-[10px] text-muted-foreground font-normal">{type.active ? '' : '(inactive)'}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PERSON VIEW */}
      {viewMode === 'person' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Left panel: List of people */}
          <div className="md:col-span-1 bg-card border border-border rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block border-b border-border/40 pb-2">
              People ({filteredPeople.length})
            </span>
            {filteredPeople.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No people found matching the current filters.
              </div>
            ) : (
              <div className="max-h-[70vh] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {filteredPeople.map(person => {
                  const comp = (() => {
                    const personCells = matrix.filter(cell => cell.person.id === person.id);
                    const assessed = personCells.filter(cell => cell.status !== 'Not Required');
                    const valid = personCells.filter(cell => cell.status === 'Valid').length;
                    const expiring = personCells.filter(cell => cell.status === 'Expiring Soon').length;
                    const pct = assessed.length === 0 ? 0 : Math.round(((valid + expiring * 0.5) / assessed.length) * 100);
                    return { valid, total: assessed.length, percent: pct };
                  })();
                  const active = selectedPerson?.id === person.id;
                  return (
                    <button
                      key={person.id}
                      onClick={() => setSelectedPerson(person)}
                      className={`w-full text-left p-3 border rounded-xl transition-all flex flex-col gap-2 ${
                        active
                          ? 'bg-indigo-50/50 border-indigo-300 ring-1 ring-indigo-500/10 dark:bg-indigo-950/20 dark:border-indigo-850'
                          : 'bg-card border-border hover:bg-muted/20'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 w-full">
                        <div className="min-w-0">
                          <strong className="text-xs font-extrabold block text-foreground truncate">{person.display_name}</strong>
                          <span className="text-[10px] text-muted-foreground truncate block">{person.department || 'No department'} | {person.role || person.person_type}</span>
                        </div>
                        {!person.active && (
                          <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/15 text-[8px] font-bold rounded-full shrink-0">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 w-full mt-0.5">
                        <div className="flex justify-between items-center text-[9px] text-muted-foreground font-semibold">
                          <span>Compliance Score</span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{comp.percent}%</span>
                        </div>
                        <div className="w-full bg-muted dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
                          <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${comp.percent}%` }} />
                        </div>
                        <span className="text-[8px] text-muted-foreground block font-medium">
                          {comp.valid} of {comp.total} required valid
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel: Selected Person's competency cards */}
          <div className="md:col-span-2">
            {selectedPerson ? (
              <div className="bg-card border border-border rounded-xl p-5 space-y-6">
                <div className="flex justify-between items-start gap-4 pb-4 border-b border-border/40">
                  <div>
                    <h2 className="text-xl font-extrabold text-foreground">{selectedPerson.display_name}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedPerson.department || 'No department'} | {selectedPerson.role || selectedPerson.person_type}
                    </p>
                  </div>
                  <button
                    onClick={() => openPerson(selectedPerson)}
                    className="px-3 py-1.5 bg-muted hover:bg-muted/80 border border-border text-xs font-semibold rounded-lg text-foreground transition-colors"
                  >
                    Edit Profile & History
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-muted/20 border border-border/40 p-4 rounded-xl">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Employee No</span>
                    <strong className="text-foreground font-semibold">{selectedPerson.employee_number || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Email</span>
                    <strong className="text-foreground font-semibold truncate block">{selectedPerson.email || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Person Type</span>
                    <strong className="text-foreground font-semibold">{selectedPerson.person_type}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Status</span>
                    <strong className={selectedPerson.active ? 'text-emerald-500' : 'text-rose-500'}>
                      {selectedPerson.active ? 'Active' : 'Inactive'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Start Date</span>
                    <strong className="text-foreground font-semibold">{selectedPerson.start_date || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">End Date</span>
                    <strong className="text-foreground font-semibold">{selectedPerson.end_date || 'N/A'}</strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Compliance Summary</span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {statusOptions.map(status => {
                      const count = selectedPersonBreakdown[status] || 0;
                      const styles = getStatusBadgeStyles(status);
                      return (
                        <div key={status} className={`px-2 py-1.5 border rounded-lg text-center ${styles.bg}`}>
                          <span className="text-[9px] uppercase font-bold block opacity-85 tracking-wide">{status}</span>
                          <strong className="text-sm font-extrabold block mt-0.5">{count}</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">Required Competencies</span>
                  {Object.keys(groupedSelectedPersonRows).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No competency types matching filters.</p>
                  ) : (
                    categories.map(cat => {
                      const rows = groupedSelectedPersonRows[cat];
                      if (!rows || rows.length === 0) return null;
                      return (
                        <div key={cat} className="space-y-2.5">
                          <div className="flex items-center gap-1.5 border-b border-border/40 pb-1 mt-3">
                            <Folder className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-xs font-bold uppercase tracking-wider text-foreground">{cat}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {rows.map(row => {
                              const styles = getStatusBadgeStyles(row.status);
                              const openAct = row.actions.filter(a => a.status === 'Open' || a.status === 'In Progress');
                              return (
                                <div
                                  key={row.type.id}
                                  className="p-3 bg-muted/20 border border-border/70 rounded-xl flex flex-col justify-between hover:shadow-xs hover:border-border transition-all min-h-36"
                                >
                                  <div>
                                    <div className="flex justify-between items-start gap-2 w-full">
                                      <strong className="text-xs font-extrabold text-foreground line-clamp-1">{row.type.title}</strong>
                                      <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${styles.bg} flex items-center gap-1 shrink-0`}>
                                        <span className={`w-1 h-1 rounded-full ${styles.dot}`} />
                                        {row.status}
                                      </span>
                                    </div>
                                    <div className="mt-2 text-[10px] text-muted-foreground space-y-0.5">
                                      {row.record?.completed_date && (
                                        <span className="block">Completed: <strong className="text-foreground font-semibold">{row.record.completed_date}</strong></span>
                                      )}
                                      <span className="block">
                                        Expiry: <strong className="text-foreground font-semibold">{row.record?.expiry_date || 'No dated record'}</strong>
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground gap-2">
                                    <span>{row.evidenceDocuments.length} docs | {openAct.length} actions</span>
                                    <button
                                      onClick={() => openCell(selectedPerson, row.type)}
                                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-[10px] transition-colors"
                                    >
                                      Update
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
                <User className="w-10 h-10 mx-auto opacity-45 mb-3" />
                <h3 className="font-extrabold text-foreground text-sm">No Person Selected</h3>
                <p className="text-xs mt-1">Select a person from the list on the left to see their competency cards.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CATEGORY VIEW */}
      {viewMode === 'category' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryViewData.length === 0 ? (
            <div className="col-span-full">
              {renderEmptyState(
                'No Category Results',
                'No competency types match your filters. Adjust the filters above.',
                () => setCategoryFilter('All'),
                'Reset Category Filter'
              )}
            </div>
          ) : (
            categoryViewData.map(({ category, types }) => (
              <div key={category} className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm hover:shadow-xs transition-shadow">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  <Folder className="w-4 h-4 text-indigo-500" />
                  <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider">{category}</h2>
                </div>

                <div className="divide-y divide-border/50">
                  {types.map(({ type, statuses }) => (
                    <div key={type.id} className="py-3.5 first:pt-0 last:pb-0 space-y-3">
                      <div>
                        <button onClick={() => openType(type)} className="text-xs font-bold text-foreground hover:text-indigo-500 text-left line-clamp-1 block">
                          {type.title}
                        </button>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{type.description || 'No description available'}</p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {['Valid', 'Expiring Soon', 'Expired', 'Missing'].map(statusName => {
                          const list = statuses[statusName as CompetencyStatus] || [];
                          const styles = getStatusBadgeStyles(statusName as CompetencyStatus);
                          const count = list.length;
                          const statusKey = `${type.id}-${statusName}`;
                          const isOpen = expandedStatusKey === statusKey;

                          return (
                            <button
                              key={statusName}
                              disabled={count === 0}
                              onClick={() => setExpandedStatusKey(isOpen ? null : statusKey)}
                              className={`flex flex-col items-center justify-center p-1.5 border rounded-lg transition-all text-center ${styles.bg} ${isOpen ? 'ring-2 ring-indigo-500/30 font-bold border-indigo-400' : ''} ${count === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:shadow-xs'}`}
                            >
                              <span className="text-[8px] uppercase tracking-wider opacity-85 font-extrabold">{statusName}</span>
                              <strong className="text-xs font-extrabold mt-0.5">{count}</strong>
                            </button>
                          );
                        })}
                      </div>

                      {['Valid', 'Expiring Soon', 'Expired', 'Missing'].map(statusName => {
                        const statusKey = `${type.id}-${statusName}`;
                        if (expandedStatusKey !== statusKey) return null;
                        const list = statuses[statusName as CompetencyStatus] || [];

                        return (
                          <div key={statusKey} className="bg-muted/40 border border-border/50 rounded-lg p-2.5 space-y-2 mt-2">
                            <div className="flex items-center justify-between text-[9px] font-bold uppercase text-muted-foreground tracking-wider">
                              <span>People: {statusName} ({list.length})</span>
                              <button onClick={() => setExpandedStatusKey(null)} className="hover:text-foreground">Close</button>
                            </div>
                            <div className="max-h-36 overflow-y-auto space-y-1.5 scrollbar-thin">
                              {list.map(person => (
                                <div key={person.id} className="flex justify-between items-center bg-card border border-border/40 px-2 py-1.5 rounded text-[11px] gap-2">
                                  <div className="min-w-0">
                                    <button onClick={() => openPerson(person)} className="font-bold hover:text-indigo-500 text-left block truncate text-foreground">
                                      {person.display_name}
                                    </button>
                                    <span className="text-[9px] text-muted-foreground block truncate">{person.role || person.person_type}</span>
                                  </div>
                                  <button
                                    onClick={() => openCell(person, type)}
                                    className="px-2 py-1 bg-indigo-55 hover:bg-indigo-100 text-indigo-650 dark:bg-indigo-950/30 dark:text-indigo-400 font-extrabold rounded text-[9px] shrink-0 border border-indigo-100 dark:border-indigo-900/40"
                                  >
                                    Update
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showImportPreview && selectedPack && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[86vh] overflow-hidden bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
            <div className="flex justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold">Preview {selectedPack.name}</h2>
                <p className="text-xs text-muted-foreground mt-1">Choose the competency types to import. Duplicates are skipped.</p>
              </div>
              <button onClick={() => setShowImportPreview(false)} className="p-2 hover:bg-muted rounded-lg h-fit"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSelectedTemplateKeys(new Set(selectedPack.competencies.filter(item => !existingTemplateKeys.has(templateKey(item))).map(item => templateKey(item))))} className="px-3 py-1.5 bg-muted border border-border rounded text-xs font-bold">Select All</button>
              <button onClick={() => setSelectedTemplateKeys(new Set())} className="px-3 py-1.5 bg-muted border border-border rounded text-xs font-bold">Clear All</button>
            </div>
            <div className="overflow-y-auto border border-border rounded-lg divide-y divide-border">
              {selectedPack.competencies.map(item => {
                const key = templateKey(item);
                const duplicate = existingTemplateKeys.has(key);
                const selected = selectedTemplateKeys.has(key);
                return (
                  <label key={key} className={`flex gap-3 p-3 text-xs ${duplicate ? 'opacity-60' : 'hover:bg-muted/30'}`}>
                    <input type="checkbox" checked={selected} disabled={duplicate} onChange={() => {
                      const next = new Set(selectedTemplateKeys);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      setSelectedTemplateKeys(next);
                    }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="font-extrabold">{item.title}</span>
                        {duplicate && <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full text-[9px] font-bold">Duplicate</span>}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-[10px] text-muted-foreground">
                        <span>Category: <strong className="text-foreground">{item.category}</strong></span>
                        <span>Validity: <strong className="text-foreground">{item.validity_period_months ?? 36} months</strong></span>
                        <span>Refresher: <strong className="text-foreground">{item.refresher_period_months ?? 12} months</strong></span>
                        <span>Risk: <strong className="text-foreground">{item.default_risk_level || 'Medium'}</strong></span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowImportPreview(false)} className="px-4 py-2 bg-muted border border-border rounded-lg text-xs font-bold">Cancel</button>
              <button onClick={handleImportSelected} disabled={selectedTemplateKeys.size === 0} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white rounded-lg text-xs font-bold">Import Selected</button>
            </div>
          </div>
        </div>
      )}

      {selectedPerson && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-3xl bg-card border-l border-border h-full flex flex-col">
            {/* Sticky Header Section */}
            <div className="p-6 pb-4 border-b border-border space-y-4 shrink-0">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-indigo-950 dark:text-indigo-50">{selectedPerson.display_name}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedPerson.department || 'No department'} | {selectedPerson.role || selectedPerson.person_type}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditingPerson(!isEditingPerson)}
                    className="px-3 py-1 bg-muted border border-border hover:bg-muted/80 rounded-lg text-xs font-semibold text-foreground transition-all"
                  >
                    {isEditingPerson ? 'View Profile' : 'Edit Profile'}
                  </button>
                  <button
                    onClick={() => setSelectedPerson(null)}
                    className="p-1.5 hover:bg-muted border border-transparent hover:border-border rounded-lg text-muted-foreground transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isEditingPerson ? (
                <form onSubmit={async event => {
                  event.preventDefault();
                  const saved = await savePerson(personEditForm, selectedPerson);
                  if (saved) {
                    setSelectedPerson(saved);
                    setPersonMessage('Person saved.');
                    setIsEditingPerson(false);
                  }
                }} className="space-y-3 text-xs bg-muted/20 p-3 rounded-lg border border-border">
                  {renderPersonFields(personEditForm, setPersonEditForm, true)}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsEditingPerson(false)} className="w-1/2 py-2 bg-muted border border-border rounded-lg font-bold">Cancel</button>
                    <button className="w-1/2 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg font-bold">Save Person</button>
                  </div>
                </form>
              ) : (
                <div className="text-xs grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 bg-muted/25 p-3 rounded-lg border border-border/85">
                  <span>Employee #: <strong className="text-foreground">{selectedPerson.employee_number || 'Not set'}</strong></span>
                  <span>Email: <strong className="text-foreground">{selectedPerson.email || 'Not set'}</strong></span>
                  <span>Type: <strong className="text-foreground">{selectedPerson.person_type}</strong></span>
                  <span>Status: <strong className={`font-semibold ${selectedPerson.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-650 dark:text-rose-450'}`}>{selectedPerson.active ? 'Active' : 'Inactive'}</strong></span>
                  <span>Start: <strong className="text-foreground">{selectedPerson.start_date || 'Not set'}</strong></span>
                  <span>End: <strong className="text-foreground">{selectedPerson.end_date || 'Not set'}</strong></span>
                  {selectedPerson.notes && <div className="col-span-full text-muted-foreground italic border-t border-border/40 pt-1.5 mt-1">{selectedPerson.notes}</div>}
                </div>
              )}

              {personMessage && <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">{personMessage}</p>}

              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status Breakdown</h3>
                <div className="flex flex-wrap gap-1.5">
                  {statusOptions.map(status => {
                    const count = selectedPersonBreakdown[status] || 0;
                    return (
                      <span
                        key={status}
                        className={`px-2.5 py-1 rounded-full border text-[11px] font-medium flex items-center gap-1.5 ${statusClass(status)}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusBadgeStyles(status).dot}`} />
                        {status}: <strong className="font-extrabold">{count}</strong>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-6">
              {/* Search & Filter Controls */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">Competency Records</h3>
                  <span className="text-xs bg-muted border border-border px-2 py-0.5 rounded-full text-muted-foreground font-semibold">
                    {drawerFilteredRows.length} shown
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-muted/20 p-2.5 rounded-xl border border-border">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search competencies..."
                      value={drawerSearch}
                      onChange={e => setDrawerSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 bg-card border border-border rounded-lg text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <select
                    value={drawerCategoryFilter}
                    onChange={e => setDrawerCategoryFilter(e.target.value)}
                    className="w-full px-2 py-1.5 bg-card border border-border rounded-lg text-xs outline-none focus:border-indigo-500"
                  >
                    <option value="All">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <select
                    value={drawerStatusFilter}
                    onChange={e => setDrawerStatusFilter(e.target.value)}
                    className="w-full px-2 py-1.5 bg-card border border-border rounded-lg text-xs outline-none focus:border-indigo-500"
                  >
                    <option value="All">All Statuses</option>
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grouped List */}
              <div className="space-y-4">
                {Object.keys(groupedDrawerRows).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
                    <p className="text-xs font-medium">No competencies match your search/filters.</p>
                  </div>
                ) : (
                  (categories.filter(cat => groupedDrawerRows[cat]?.length > 0) as CompetencyCategory[]).map(category => {
                    const isCollapsed = collapsedCategories.has(category);
                    const categoryRows = groupedDrawerRows[category];

                    return (
                      <div key={category} className="space-y-2">
                        <button
                          onClick={() => toggleCategoryCollapsed(category)}
                          className="w-full flex items-center justify-between py-1 px-2 hover:bg-muted/50 rounded-lg text-xs font-bold text-indigo-950 dark:text-indigo-200 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Folder className="w-3.5 h-3.5 text-indigo-650 dark:text-indigo-400" />
                            <span>{category}</span>
                            <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 px-1.5 py-0.5 rounded-full font-extrabold">
                              {categoryRows.length}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {isCollapsed ? 'Show' : 'Hide'}
                          </span>
                        </button>

                        {!isCollapsed && (
                          <div className="space-y-2 pl-1 border-l-2 border-indigo-500/10 ml-2">
                            {categoryRows.map(row => {
                              const rowKey = row.record?.id || row.type.id;
                              const isExpanded = expandedRecords.has(rowKey);
                              const isEditing = personRecordEditId === rowKey;
                              const openActions = row.actions.filter(action => action.status === 'Open' || action.status === 'In Progress');

                              return (
                                <div
                                  key={rowKey}
                                  className={`bg-card border rounded-xl overflow-hidden transition-all duration-200 ${
                                    isExpanded
                                      ? 'border-indigo-500/30 ring-1 ring-indigo-500/10 shadow-sm'
                                      : 'border-border hover:border-border-hover shadow-xs'
                                  }`}
                                >
                                  <div
                                    onClick={() => toggleRecordExpanded(rowKey)}
                                    className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 cursor-pointer hover:bg-muted/10 transition-colors"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-xs text-foreground block truncate">{row.type.title}</span>
                                        <span className="text-[9px] text-muted-foreground uppercase px-1.5 py-0.5 bg-muted rounded border border-border">
                                          {row.type.default_risk_level || 'Medium'}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground mt-1">
                                        <span>Completed: <strong className="text-foreground">{row.record?.completed_date || 'N/A'}</strong></span>
                                        <span className="text-muted-foreground/30">•</span>
                                        <span>Expiry: <strong className={row.status === 'Expired' ? 'text-rose-605 dark:text-rose-400 font-semibold' : 'text-foreground'}>{row.record?.expiry_date || 'N/A'}</strong></span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusClass(row.status)}`}>
                                        {row.status}
                                      </span>
                                      {row.evidenceDocuments.length > 0 && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-border bg-muted/50 text-muted-foreground flex items-center gap-1">
                                          <LinkIcon className="w-2.5 h-2.5" /> {row.evidenceDocuments.length}
                                        </span>
                                      )}
                                      {openActions.length > 0 && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-rose-500/20 bg-rose-500/5 text-rose-650 dark:text-rose-400 flex items-center gap-1">
                                          <AlertTriangle className="w-2.5 h-2.5 text-rose-500" /> {openActions.length}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        className="p-1 hover:bg-muted rounded text-muted-foreground ml-1"
                                      >
                                        <ChevronDown className={`w-3.5 h-3.5 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                      </button>
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="border-t border-border/80 bg-muted/10 p-3.5 space-y-4 text-xs">
                                      {isEditing ? (
                                        <form onSubmit={async event => {
                                          event.preventDefault();
                                          await savePersonRecord(selectedPerson, row.type, row.record);
                                        }} className="space-y-3 bg-card p-3 rounded-lg border border-border shadow-inner">
                                          <h4 className="font-bold text-xs text-foreground">Edit Competency Record</h4>
                                          <div className="grid grid-cols-2 gap-3">
                                            <label className="space-y-1">
                                              <span className="text-[10px] font-bold uppercase text-muted-foreground">Completed</span>
                                              <input type="date" value={personRecordForm.completed_date} onChange={event => setPersonRecordForm({ ...personRecordForm, completed_date: event.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
                                            </label>
                                            <label className="space-y-1">
                                              <span className="text-[10px] font-bold uppercase text-muted-foreground">Expiry</span>
                                              <input type="date" value={personRecordForm.expiry_date} onChange={event => setPersonRecordForm({ ...personRecordForm, expiry_date: event.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
                                            </label>
                                          </div>
                                          <div className="grid grid-cols-2 gap-3">
                                            <input placeholder="Trainer" value={personRecordForm.trainer} onChange={event => setPersonRecordForm({ ...personRecordForm, trainer: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
                                            <input placeholder="Provider" value={personRecordForm.provider} onChange={event => setPersonRecordForm({ ...personRecordForm, provider: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
                                          </div>
                                          <div className="grid grid-cols-2 gap-3">
                                            <input placeholder="Certificate number" value={personRecordForm.certificate_number} onChange={event => setPersonRecordForm({ ...personRecordForm, certificate_number: event.target.value })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none" />
                                            <select value={personRecordForm.status} onChange={event => setPersonRecordForm({ ...personRecordForm, status: event.target.value as CompetencyStatus })} className="px-3 py-2 bg-muted border border-border rounded-lg outline-none">
                                              {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                                            </select>
                                          </div>
                                          <textarea placeholder="Notes" value={personRecordForm.notes} onChange={event => setPersonRecordForm({ ...personRecordForm, notes: event.target.value })} rows={2} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none resize-none" />
                                          <div className="flex gap-2">
                                            <button type="button" onClick={() => setPersonRecordEditId(null)} className="flex-1 py-2 bg-muted border border-border rounded-lg font-bold">Cancel</button>
                                            <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold">Save Competency</button>
                                          </div>
                                        </form>
                                      ) : (
                                        <div className="space-y-3">
                                          {row.record && (
                                            <div className="grid grid-cols-2 gap-y-1 text-[11px] bg-card/60 p-2.5 rounded-lg border border-border">
                                              <span>Trainer: <strong className="text-foreground">{row.record.trainer || 'Not set'}</strong></span>
                                              <span>Provider: <strong className="text-foreground">{row.record.provider || 'Not set'}</strong></span>
                                              <span>Cert #: <strong className="text-foreground">{row.record.certificate_number || 'Not set'}</strong></span>
                                              {row.record.notes && <span className="col-span-2 text-muted-foreground mt-1 block">Notes: {row.record.notes}</span>}
                                            </div>
                                          )}

                                          <div className="flex flex-wrap gap-2">
                                            <button
                                              onClick={() => startPersonRecordEdit(rowKey, row.record, row.status)}
                                              className="px-3 py-1.5 bg-card border border-border hover:bg-muted/50 rounded-lg font-bold text-foreground transition-all"
                                            >
                                              Edit Competency
                                            </button>
                                            <button
                                              onClick={() => {
                                                setNotRequiredConfirmCell({ person: selectedPerson, competencyType: row.type, record: row.record });
                                                setNotRequiredNote('');
                                              }}
                                              className="px-3 py-1.5 bg-card border border-border hover:bg-muted/50 rounded-lg font-bold text-foreground transition-all"
                                            >
                                              Mark Not Required
                                            </button>
                                            <button
                                              onClick={() => {
                                                setRemoveConfirmCell({
                                                  person: selectedPerson,
                                                  competencyType: row.type,
                                                  record: row.record,
                                                  hasEvidence: row.evidenceDocuments.length > 0,
                                                  hasActions: row.actions.length > 0
                                                });
                                              }}
                                              className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-lg font-bold flex items-center gap-1.5 transition-all"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" /> Remove from person
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/80 pt-3">
                                        <div className="space-y-2.5">
                                          <div className="flex items-center justify-between gap-2">
                                            <h4 className="font-bold text-foreground flex items-center gap-1">
                                              <LinkIcon className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> Evidence
                                            </h4>
                                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">Vault Sec</span>
                                          </div>

                                          {row.evidenceDocuments.length === 0 ? (
                                            <p className="text-[11px] text-muted-foreground italic bg-muted/10 p-2 rounded-lg border border-border/60">No linked evidence documents.</p>
                                          ) : (
                                            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                              {row.evidenceDocuments.map(document => (
                                                <div key={document.id} className="flex items-center justify-between gap-2 p-1.5 bg-card border border-border rounded-lg">
                                                  <span className="font-semibold text-[11px] truncate text-foreground flex-1">{document.title}</span>
                                                  <div className="flex gap-1 shrink-0">
                                                    <button
                                                      onClick={async () => window.open(await getDocumentSignedUrl(document.id), '_blank')}
                                                      className="px-2 py-0.5 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded font-bold text-[10px] transition-all"
                                                    >
                                                      Open
                                                    </button>
                                                    {row.record && (
                                                      <button
                                                        onClick={() => unlinkDocumentFromCompetencyRecord(row.record!.id, document.id)}
                                                        className="px-2 py-0.5 bg-muted hover:bg-muted-hover border border-border rounded font-bold text-[10px] text-muted-foreground transition-all"
                                                      >
                                                        Unlink
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}

                                          <div className="space-y-2 bg-card p-2 rounded-lg border border-border">
                                            <select
                                              value={personRecordLinkIds[rowKey] || ''}
                                              onChange={event => setPersonRecordLinkIds({ ...personRecordLinkIds, [rowKey]: event.target.value })}
                                              className="w-full px-2.5 py-1.5 bg-muted border border-border rounded-lg text-xs outline-none focus:border-indigo-500"
                                            >
                                              <option value="">Link existing evidence...</option>
                                              {documents.map(document => (
                                                <option key={document.id} value={document.id}>{document.title}</option>
                                              ))}
                                            </select>
                                            <div className="grid grid-cols-1 gap-2">
                                              <button
                                                disabled={!row.record || !personRecordLinkIds[rowKey]}
                                                onClick={() => linkEvidenceFromPerson(row.record, rowKey)}
                                                className="py-1.5 bg-muted hover:bg-muted-hover border border-border disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-[11px] text-foreground flex items-center justify-center gap-1 transition-all"
                                              >
                                                <LinkIcon className="w-3.5 h-3.5" /> Link
                                              </button>
                                              <EvidenceDropzone
                                                label="Upload evidence"
                                                helperText="Private vault record linked to this competency."
                                                buttonLabel="Upload"
                                                compact
                                                multiple
                                                disabled={!row.record || personRecordUploadingId === row.record?.id}
                                                onUpload={async (file, updateStatus) => {
                                                  if (!row.record) throw new Error('Save the competency record before uploading evidence.');
                                                  setPersonRecordUploadingId(row.record.id);
                                                  updateStatus('saving record');
                                                  try {
                                                    const doc = await uploadCompetencyEvidence(row.record.id, file);
                                                    updateStatus('linking');
                                                    return doc;
                                                  } finally {
                                                    setPersonRecordUploadingId(null);
                                                  }
                                                }}
                                                onComplete={docs => setPersonMessage(`Uploaded ${docs.length} evidence file${docs.length === 1 ? '' : 's'} to private Evidence Vault and linked to this competency record.`)}
                                                findDuplicates={findPossibleDuplicateDocuments}
                                              />
                                            </div>
                                          </div>
                                        </div>

                                        <div className="space-y-2.5">
                                          <div className="flex items-center justify-between gap-2">
                                            <h4 className="font-bold text-foreground flex items-center gap-1">
                                              <AlertTriangle className="w-3 h-3 text-rose-500" /> Actions
                                            </h4>
                                            <button
                                              onClick={() => createGapActionFromPerson(selectedPerson, row.type, row.record)}
                                              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-705 text-white rounded font-bold text-[10px] flex items-center gap-1 transition-all"
                                            >
                                              <Plus className="w-2.5 h-2.5" /> Create action
                                            </button>
                                          </div>

                                          {row.actions.length === 0 ? (
                                            <p className="text-[11px] text-muted-foreground italic bg-muted/10 p-2 rounded-lg border border-border/60">No linked actions.</p>
                                          ) : (
                                            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                                              {row.actions.map(action => (
                                                <button
                                                  key={action.id}
                                                  onClick={() => setSelectedAction(action)}
                                                  className="w-full text-left p-2 bg-card border border-border rounded-lg hover:bg-muted/40 hover:border-border-hover transition-colors"
                                                >
                                                  <span className="font-bold text-[11px] block truncate text-foreground">{action.title}</span>
                                                  <span className="text-[10px] text-muted-foreground">
                                                    {action.status}
                                                    {action.target_due_date || action.due_date ? ` | Due ${action.target_due_date || action.due_date}` : ''}
                                                  </span>
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* General Person Actions */}
              <div className="border-t border-border pt-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Open Related Actions</h3>
                {selectedPersonActions.filter(action => action.status === 'Open' || action.status === 'In Progress').length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No other open actions related to this person.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedPersonActions.filter(action => action.status === 'Open' || action.status === 'In Progress').map(action => (
                      <button
                        key={action.id}
                        onClick={() => setSelectedAction(action)}
                        className="w-full text-left p-3 bg-muted/20 hover:bg-muted/40 border border-border rounded-xl transition-all"
                      >
                        <span className="font-bold text-xs text-foreground block">{action.title}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">
                          {action.status}
                          {action.target_due_date || action.due_date ? ` | Due ${action.target_due_date || action.due_date}` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-card border-l border-border h-full overflow-y-auto p-6 space-y-5">
            <div className="flex justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold">{selectedType.title}</h2>
                <p className="text-xs text-muted-foreground mt-1">{selectedType.category} | {selectedType.active ? 'Active' : 'Inactive'}</p>
              </div>
              <button onClick={() => setSelectedType(null)} className="p-2 hover:bg-muted rounded-lg h-fit"><X className="w-4 h-4" /></button>
            </div>
            {isEditingType ? (
              <form onSubmit={async event => {
                event.preventDefault();
                const saved = await saveType(typeEditForm, selectedType);
                if (saved) {
                  setSelectedType(saved);
                  setTypeMessage('Competency type saved.');
                  setIsEditingType(false);
                }
              }} className="space-y-3 text-xs">
                {renderTypeFields(typeEditForm, setTypeEditForm, true)}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsEditingType(false)} className="w-1/2 py-2 bg-muted border border-border rounded-lg font-bold">Cancel</button>
                  <button className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold">Save Type</button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <p className="text-muted-foreground">{selectedType.description || 'No description.'}</p>
                <div className="grid grid-cols-2 gap-2">
                  <span>Validity: <strong>{selectedType.validity_period_months ?? 'Not set'} months</strong></span>
                  <span>Refresher: <strong>{selectedType.refresher_period_months ?? 'Not set'} months</strong></span>
                  <span>Risk: <strong>{selectedType.default_risk_level}</strong></span>
                  <span>Evidence: <strong>{selectedType.evidence_required ? 'Required' : 'Optional'}</strong></span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setIsEditingType(true)} className="flex-1 py-2 bg-muted border border-border rounded-lg font-bold">Edit Type</button>
                  <button onClick={async () => {
                    const saved = await saveType({ ...typeToForm(selectedType), active: !selectedType.active }, selectedType);
                    if (saved) {
                      setSelectedType(saved);
                      setTypeEditForm(typeToForm(saved));
                      setTypeMessage(saved.active ? 'Competency type reactivated.' : 'Competency type deactivated.');
                    }
                  }} className="flex-1 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg font-bold">
                    {selectedType.active ? 'Deactivate Type' : 'Reactivate Type'}
                  </button>
                </div>
              </div>
            )}
            {typeMessage && <p className="text-[11px] text-emerald-500 font-semibold">{typeMessage}</p>}
            <div className="border-t border-border pt-4 space-y-2 text-xs">
              <h3 className="text-sm font-extrabold">Records Using This Type</h3>
              {competencyRecords.filter(record => record.competency_type_id === selectedType.id).length === 0 ? <p className="text-muted-foreground">No saved records use this type.</p> : competencyRecords.filter(record => record.competency_type_id === selectedType.id).slice(0, 12).map(record => {
                const person = people.find(item => item.id === record.person_id);
                return (
                  <button key={record.id} onClick={() => person && openCell(person, selectedType)} className="w-full text-left p-3 bg-muted/30 border border-border rounded-lg hover:bg-muted/60">
                    <span className="font-bold block">{person?.display_name || 'Person'}</span>
                    <span className="text-[10px] text-muted-foreground">{record.status} | Expiry {record.expiry_date || 'Not dated'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeCell && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-card border-l border-border h-full overflow-y-auto p-6 space-y-5">
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
            <div className="flex gap-2 text-xs">
              <button onClick={handleMarkNotRequired} className="flex-1 py-2 bg-muted border border-border rounded-lg font-bold">Mark Not Required</button>
              <button onClick={handleClearRecord} className="flex-1 py-2 bg-muted border border-border rounded-lg font-bold">Clear Record</button>
            </div>

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

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-2">
                  <select value={linkDocumentId} onChange={event => setLinkDocumentId(event.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none">
                    <option value="">Link existing evidence</option>
                    {documents.map(document => <option key={document.id} value={document.id}>{document.title}</option>)}
                  </select>
                  <button disabled={!activeCell.record || !linkDocumentId} onClick={() => activeCell.record && linkDocumentToCompetencyRecord(activeCell.record.id, linkDocumentId)} className="w-full py-2 bg-muted hover:bg-muted/80 border border-border disabled:opacity-50 rounded-lg font-bold flex items-center justify-center gap-2">
                    <LinkIcon className="w-4 h-4" /> Link Evidence
                  </button>
                </div>
                <EvidenceDropzone
                  label="Upload evidence"
                  helperText={`Private vault record linked to this competency. Max ${formatMaxEvidenceUploadSize()}.`}
                  buttonLabel="Upload"
                  compact
                  multiple
                  disabled={!activeCell.record || uploading}
                  onUpload={async (file, updateStatus) => {
                    if (!activeCell.record) throw new Error('Save the competency record before uploading evidence.');
                    setUploading(true);
                    updateStatus('saving record');
                    try {
                      const doc = await uploadCompetencyEvidence(activeCell.record.id, file);
                      updateStatus('linking');
                      return doc;
                    } finally {
                      setUploading(false);
                    }
                  }}
                  onComplete={docs => setFormMessage(`Uploaded ${docs.length} evidence file${docs.length === 1 ? '' : 's'} and linked to this competency record.`)}
                  findDuplicates={findPossibleDuplicateDocuments}
                />
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
                <button key={action.id} onClick={() => setSelectedAction(action)} className="w-full text-left p-3 bg-muted/30 border border-border rounded-lg hover:bg-muted/60">
                  <span className="font-bold block">{action.title}</span>
                  <span className="text-[10px] text-muted-foreground">{action.status}{action.target_due_date || action.due_date ? ` | Due ${action.target_due_date || action.due_date}` : ''}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {notRequiredConfirmCell && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Mark as Not Required</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This will mark <strong className="text-foreground">{notRequiredConfirmCell.competencyType.title}</strong> as not required for <strong className="text-foreground">{notRequiredConfirmCell.person.display_name}</strong>. It will no longer count as missing or overdue.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Reason / Note (optional)
              </label>
              <textarea
                placeholder="Specify why this competency is not required for this person..."
                value={notRequiredNote}
                onChange={e => setNotRequiredNote(e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none text-xs resize-none focus:border-indigo-500"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNotRequiredConfirmCell(null)}
                className="px-4 py-2 bg-muted border border-border hover:bg-muted/80 text-foreground rounded-lg text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const { person, competencyType, record } = notRequiredConfirmCell;
                  await markPersonRecordNotRequired(person, competencyType, record, notRequiredNote);
                  setNotRequiredConfirmCell(null);
                }}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {removeConfirmCell && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Remove Competency from Person</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to remove <strong className="text-foreground">{removeConfirmCell.competencyType.title}</strong> from <strong className="text-foreground">{removeConfirmCell.person.display_name}</strong>?
                </p>
              </div>
            </div>

            <div className="bg-muted/30 border border-border/80 rounded-lg p-3 text-xs space-y-1.5">
              {!removeConfirmCell.record ? (
                <p className="text-muted-foreground leading-relaxed">
                  There is currently no saved completed record. To prevent this requirement from showing up as Missing, we will archive/mark it as <strong className="text-foreground">Not Required</strong>.
                </p>
              ) : (removeConfirmCell.hasEvidence || removeConfirmCell.hasActions) ? (
                <p className="text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-amber-600 dark:text-amber-400 block mb-1">Notice: Linked Documents/Actions Found</span>
                  This competency has linked evidence or actions. To preserve this history, the record will not be permanently deleted. Instead, it will be safely archived/marked as <strong className="text-foreground">Not Required</strong> to maintain evidence and action compliance records.
                </p>
              ) : (
                <p className="text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-rose-600 dark:text-rose-400 block mb-1">Warning: Permanent Deletion</span>
                  Since there is no linked evidence or active action tasks, confirming this will permanently delete the competency completion record for this person.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRemoveConfirmCell(null)}
                className="px-4 py-2 bg-muted border border-border hover:bg-muted/80 text-foreground rounded-lg text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const { person, competencyType, record, hasEvidence, hasActions } = removeConfirmCell;
                  await removePersonRecord(person, competencyType, record, hasEvidence, hasActions);
                  setRemoveConfirmCell(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Confirm
              </button>
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
