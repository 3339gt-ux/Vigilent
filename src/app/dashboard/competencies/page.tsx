'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { buildCompetencyMatrix } from '@/lib/competencyEngine';
import { COMPETENCY_TEMPLATE_PACKS } from '@/lib/competencyTemplates';
import { evidenceAcceptAttribute, formatMaxEvidenceUploadSize } from '@/lib/evidenceStorage';
import type {
  CompetencyCategory,
  CompetencyRecord,
  CompetencyStatus,
  CompetencyTemplateItem,
  CompetencyType,
  Person,
  PersonType,
  RequirementRiskLevel
} from '@/lib/types';
import { Link as LinkIcon, Plus, Search, Upload, UserCheck, X } from 'lucide-react';

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

const templateKey = (item: Pick<CompetencyTemplateItem, 'title' | 'category'>) =>
  `${item.title.trim().toLowerCase()}::${item.category.trim().toLowerCase()}`;

export default function CompetencyMatrixPage() {
  const {
    people,
    competencyTypes,
    competencyRecords,
    competencyRecordDocuments,
    documents,
    actionObjectLinks,
    actions,
    competencySummary,
    upsertPerson,
    upsertCompetencyType,
    importCompetencyTemplateItems,
    upsertCompetencyRecord,
    linkDocumentToCompetencyRecord,
    unlinkDocumentFromCompetencyRecord,
    uploadCompetencyEvidence,
    createActionForCompetencyGap,
    getDocumentSignedUrl
  } = useApp();

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [personStateFilter, setPersonStateFilter] = useState<typeof personFilterOptions[number]>('Active');
  const [typeStateFilter, setTypeStateFilter] = useState<typeof typeFilterOptions[number]>('Active');
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedType, setSelectedType] = useState<CompetencyType | null>(null);
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
  const [uploading, setUploading] = useState(false);
  const [newPerson, setNewPerson] = useState<PersonForm>(blankPersonForm());
  const [newType, setNewType] = useState<TypeForm>(blankTypeForm());
  const [personEditForm, setPersonEditForm] = useState<PersonForm>(blankPersonForm());
  const [typeEditForm, setTypeEditForm] = useState<TypeForm>(blankTypeForm());
  const [isEditingPerson, setIsEditingPerson] = useState(false);
  const [isEditingType, setIsEditingType] = useState(false);

  const selectedPack = COMPETENCY_TEMPLATE_PACKS.find(pack => pack.id === selectedPackId) || COMPETENCY_TEMPLATE_PACKS[0];
  const existingTemplateKeys = useMemo(
    () => new Set(competencyTypes.map(type => templateKey(type))),
    [competencyTypes]
  );
  const matrix = useMemo(
    () => buildCompetencyMatrix(people, competencyTypes, competencyRecords),
    [competencyRecords, competencyTypes, people]
  );
  const allDepartments = ['All', ...Array.from(new Set([...departmentSuggestions, ...people.map(person => person.department || '').filter(Boolean)]))];
  const visiblePeople = people.filter(person => {
    if (personStateFilter === 'Active' && !person.active) return false;
    if (personStateFilter === 'Inactive' && person.active) return false;
    return true;
  });
  const visibleTypes = competencyTypes.filter(type => {
    if (typeStateFilter === 'Active' && !type.active) return false;
    if (typeStateFilter === 'Inactive' && type.active) return false;
    return true;
  });
  const filteredPeople = visiblePeople.filter(person => {
    const text = `${person.display_name} ${person.department || ''} ${person.role || ''} ${person.person_type}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (departmentFilter === 'All' || person.department === departmentFilter);
  });
  const filteredTypes = visibleTypes.filter(type => categoryFilter === 'All' || type.category === categoryFilter);

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

  const selectedPersonRecords = selectedPerson
    ? competencyRecords.filter(record => record.person_id === selectedPerson.id)
    : [];
  const selectedPersonActions = selectedPerson
    ? actions.filter(action =>
        actionObjectLinks.some(link =>
          link.action_id === action.id &&
          ((link.object_type === 'person' && link.object_id === selectedPerson.id) ||
            selectedPersonRecords.some(record => link.object_type === 'competency_record' && link.object_id === record.id))
        )
      )
    : [];
  const selectedPersonBreakdown = statusOptions.reduce((acc, status) => {
    acc[status] = selectedPersonRecords.filter(record => {
      const cell = matrix.find(item => item.record?.id === record.id);
      return (cell?.status || record.status) === status;
    }).length;
    return acc;
  }, {} as Record<CompetencyStatus, number>);

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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-card border border-border p-4 rounded-xl grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search people..." className="w-full pl-9 pr-3 py-2 bg-muted border border-border rounded-lg text-xs outline-none" />
            </div>
            <select value={departmentFilter} onChange={event => setDepartmentFilter(event.target.value)} className="bg-muted border border-border rounded-lg px-3 py-2 text-xs font-semibold">
              {allDepartments.map(department => <option key={department} value={department}>{department}</option>)}
            </select>
            <select value={personStateFilter} onChange={event => setPersonStateFilter(event.target.value as typeof personFilterOptions[number])} className="bg-muted border border-border rounded-lg px-3 py-2 text-xs font-semibold">
              {personFilterOptions.map(option => <option key={option} value={option}>{option} People</option>)}
            </select>
            <select value={typeStateFilter} onChange={event => setTypeStateFilter(event.target.value as typeof typeFilterOptions[number])} className="bg-muted border border-border rounded-lg px-3 py-2 text-xs font-semibold">
              {typeFilterOptions.map(option => <option key={option} value={option}>{option} Types</option>)}
            </select>
            <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className="bg-muted border border-border rounded-lg px-3 py-2 text-xs font-semibold md:col-span-5">
              <option value="All">All Categories</option>
              {categories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider">
                    <th className="p-3 sticky left-0 bg-muted/95 z-10 min-w-56">Person</th>
                    {filteredTypes.map(type => (
                      <th key={type.id} className="p-3 min-w-40">
                        <button onClick={() => openType(type)} className="text-left hover:text-indigo-500">
                          <span className="font-bold block">{type.title}</span>
                          {!type.active && <span className="text-[9px] text-amber-500">Inactive</span>}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPeople.length === 0 || filteredTypes.length === 0 ? (
                    <tr>
                      <td colSpan={Math.max(filteredTypes.length + 1, 1)} className="p-8 text-center text-muted-foreground">
                        Add people and competency types, or preview a template pack to build the matrix.
                      </td>
                    </tr>
                  ) : filteredPeople.map(person => (
                    <tr key={person.id} className="hover:bg-muted/40 transition-colors">
                      <td className={`p-3 sticky left-0 bg-card z-10 ${selectedPerson?.id === person.id ? 'ring-1 ring-inset ring-indigo-500/40' : ''}`}>
                        <button onClick={() => openPerson(person)} className="text-left w-full hover:text-indigo-500">
                          <span className="font-extrabold block">{person.display_name}</span>
                          <span className="text-[10px] text-muted-foreground">{person.department || 'No department'} | {person.role || person.person_type}</span>
                          {!person.active && <span className="text-[9px] text-amber-500 block">Inactive</span>}
                        </button>
                      </td>
                      {filteredTypes.map(type => {
                        const cell = matrix.find(item => item.person.id === person.id && item.competencyType.id === type.id);
                        return (
                          <td key={type.id} className="p-3">
                            <button
                              onClick={() => openCell(person, type)}
                              title={statusHelp[cell?.status || 'Missing']}
                              className={`w-full text-left border rounded-lg px-2.5 py-2 hover:bg-muted/60 ${statusClass(cell?.status || 'Missing')} ${activeCell?.person.id === person.id && activeCell.competencyType.id === type.id ? 'ring-2 ring-indigo-500/40' : ''}`}
                            >
                              <span className="font-bold block">{cell?.status || 'Missing'}</span>
                              <span className="text-[10px] opacity-80">{cell?.record?.expiry_date ? `Until ${cell.record.expiry_date}` : 'No dated record'}</span>
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
          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            {statusOptions.map(status => (
              <span key={status} className={`px-2 py-1 rounded border ${statusClass(status)}`}>{status}: {statusHelp[status]}</span>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <form onSubmit={handleCreatePerson} className="bg-card border border-border rounded-xl p-4 space-y-3 text-xs">
            <h2 className="text-sm font-extrabold flex items-center gap-2"><UserCheck className="w-4 h-4" /> Add Person</h2>
            {renderPersonFields(newPerson, setNewPerson)}
            <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg">Save Person</button>
          </form>

          <form onSubmit={handleCreateType} className="bg-card border border-border rounded-xl p-4 space-y-3 text-xs">
            <h2 className="text-sm font-extrabold">Add Competency Type</h2>
            {renderTypeFields(newType, setNewType)}
            <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg">Save Type</button>
          </form>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3 text-xs">
            <h2 className="text-sm font-extrabold">Import Template Pack</h2>
            <select value={selectedPackId} onChange={event => { setSelectedPackId(event.target.value); setImportMessage(''); }} className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none">
              {COMPETENCY_TEMPLATE_PACKS.map(pack => <option key={pack.id} value={pack.id}>{pack.name}</option>)}
            </select>
            <p className="text-[11px] text-muted-foreground">{selectedPack?.description}</p>
            <button onClick={openImportPreview} className="w-full py-2 bg-muted hover:bg-muted/80 border border-border font-bold rounded-lg">Preview Pack</button>
            {importMessage && <p className="text-[11px] text-emerald-500 font-semibold">{importMessage}</p>}
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-2 text-xs">
            <h2 className="text-sm font-extrabold">Manage Existing</h2>
            <div className="max-h-36 overflow-y-auto space-y-1">
              {visiblePeople.slice(0, 8).map(person => (
                <button key={person.id} onClick={() => openPerson(person)} className="w-full text-left px-2 py-1.5 rounded bg-muted/30 hover:bg-muted/60">
                  {person.display_name} <span className="text-[10px] text-muted-foreground">{person.active ? '' : '(inactive)'}</span>
                </button>
              ))}
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1 pt-2 border-t border-border">
              {visibleTypes.slice(0, 8).map(type => (
                <button key={type.id} onClick={() => openType(type)} className="w-full text-left px-2 py-1.5 rounded bg-muted/30 hover:bg-muted/60">
                  {type.title} <span className="text-[10px] text-muted-foreground">{type.active ? '' : '(inactive)'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

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
          <div className="w-full max-w-xl bg-card border-l border-border h-full overflow-y-auto p-6 space-y-5">
            <div className="flex justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold">{selectedPerson.display_name}</h2>
                <p className="text-xs text-muted-foreground mt-1">{selectedPerson.department || 'No department'} | {selectedPerson.role || selectedPerson.person_type}</p>
              </div>
              <button onClick={() => setSelectedPerson(null)} className="p-2 hover:bg-muted rounded-lg h-fit"><X className="w-4 h-4" /></button>
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
              }} className="space-y-3 text-xs">
                {renderPersonFields(personEditForm, setPersonEditForm, true)}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsEditingPerson(false)} className="w-1/2 py-2 bg-muted border border-border rounded-lg font-bold">Cancel</button>
                  <button className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold">Save Person</button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <span>Employee #: <strong>{selectedPerson.employee_number || 'Not set'}</strong></span>
                  <span>Email: <strong>{selectedPerson.email || 'Not set'}</strong></span>
                  <span>Type: <strong>{selectedPerson.person_type}</strong></span>
                  <span>Status: <strong>{selectedPerson.active ? 'Active' : 'Inactive'}</strong></span>
                  <span>Start: <strong>{selectedPerson.start_date || 'Not set'}</strong></span>
                  <span>End: <strong>{selectedPerson.end_date || 'Not set'}</strong></span>
                </div>
                {selectedPerson.notes && <p className="text-muted-foreground">{selectedPerson.notes}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setIsEditingPerson(true)} className="flex-1 py-2 bg-muted border border-border rounded-lg font-bold">Edit Person</button>
                  <button onClick={async () => {
                    const saved = await savePerson({ ...personToForm(selectedPerson), active: !selectedPerson.active, end_date: selectedPerson.active ? new Date().toISOString().split('T')[0] : '' }, selectedPerson);
                    if (saved) {
                      setSelectedPerson(saved);
                      setPersonEditForm(personToForm(saved));
                      setPersonMessage(saved.active ? 'Person reactivated.' : 'Person deactivated.');
                    }
                  }} className="flex-1 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg font-bold">
                    {selectedPerson.active ? 'Deactivate Person' : 'Reactivate Person'}
                  </button>
                </div>
              </div>
            )}
            {personMessage && <p className="text-[11px] text-emerald-500 font-semibold">{personMessage}</p>}
            <div className="border-t border-border pt-4 space-y-2 text-xs">
              <h3 className="text-sm font-extrabold">Status Breakdown</h3>
              <div className="grid grid-cols-3 gap-2">
                {statusOptions.map(status => <span key={status} className={`px-2 py-1 rounded border ${statusClass(status)}`}>{status}: {selectedPersonBreakdown[status]}</span>)}
              </div>
            </div>
            <div className="border-t border-border pt-4 space-y-2 text-xs">
              <h3 className="text-sm font-extrabold">Competency Records</h3>
              {selectedPersonRecords.length === 0 ? <p className="text-muted-foreground">No saved competency records.</p> : selectedPersonRecords.map(record => {
                const type = competencyTypes.find(item => item.id === record.competency_type_id);
                const evidenceCount = competencyRecordDocuments.filter(link => link.competency_record_id === record.id).length;
                return (
                  <button key={record.id} onClick={() => type && openCell(selectedPerson, type)} className="w-full text-left p-3 bg-muted/30 border border-border rounded-lg hover:bg-muted/60">
                    <span className="font-bold block">{type?.title || 'Competency'}</span>
                    <span className="text-[10px] text-muted-foreground">{record.status} | Expiry {record.expiry_date || 'Not dated'} | Evidence {evidenceCount}</span>
                  </button>
                );
              })}
            </div>
            <div className="border-t border-border pt-4 space-y-2 text-xs">
              <h3 className="text-sm font-extrabold">Open Related Actions</h3>
              {selectedPersonActions.filter(action => action.status === 'Open' || action.status === 'In Progress').length === 0 ? <p className="text-muted-foreground">No open actions related to this person.</p> : selectedPersonActions.filter(action => action.status === 'Open' || action.status === 'In Progress').map(action => (
                <div key={action.id} className="p-3 bg-muted/30 border border-border rounded-lg">
                  <span className="font-bold block">{action.title}</span>
                  <span className="text-[10px] text-muted-foreground">{action.status}{action.target_due_date || action.due_date ? ` | Due ${action.target_due_date || action.due_date}` : ''}</span>
                </div>
              ))}
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
                <label className="w-full py-2 bg-muted hover:bg-muted/80 border border-border rounded-lg font-bold flex items-center justify-center gap-2 cursor-pointer text-center">
                  <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload Evidence'}
                  <input type="file" accept={evidenceAcceptAttribute} className="hidden" onChange={event => handleUploadEvidence(event.target.files?.[0] || null)} />
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
                <div key={action.id} className="p-3 bg-muted/30 border border-border rounded-lg">
                  <span className="font-bold block">{action.title}</span>
                  <span className="text-[10px] text-muted-foreground">{action.status}{action.target_due_date || action.due_date ? ` | Due ${action.target_due_date || action.due_date}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
