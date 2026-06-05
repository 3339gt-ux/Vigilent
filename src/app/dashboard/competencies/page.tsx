'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ActionDetailDrawer } from '@/components/ActionDetailDrawer';
import { buildCompetencyMatrix } from '@/lib/competencyEngine';
import { COMPETENCY_TEMPLATE_PACKS } from '@/lib/competencyTemplates';
import { evidenceAcceptAttribute, formatMaxEvidenceUploadSize } from '@/lib/evidenceStorage';
import type { Action, CompetencyCategory, CompetencyRecord, CompetencyStatus, CompetencyType, Person, PersonType, RequirementRiskLevel } from '@/lib/types';
import { Link as LinkIcon, Plus, Search, Upload, UserCheck, X, ArrowLeft, Calendar, Paperclip, AlertCircle } from 'lucide-react';

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

  const activePeople = useMemo(() => people.filter(person => person.active), [people]);
  const activeTypes = useMemo(() => competencyTypes.filter(type => type.active), [competencyTypes]);
  const departments = useMemo(() => ['All', ...Array.from(new Set(activePeople.map(person => person.department).filter(Boolean) as string[]))], [activePeople]);
  const selectedPack = COMPETENCY_TEMPLATE_PACKS.find(pack => pack.id === selectedPackId) || COMPETENCY_TEMPLATE_PACKS[0];

  const matrix = useMemo(
    () => buildCompetencyMatrix(people, competencyTypes, competencyRecords),
    [competencyRecords, competencyTypes, people]
  );

  const filteredPeople = useMemo(() => {
    return activePeople.filter(person => {
      const text = `${person.display_name} ${person.department || ''} ${person.role || ''} ${person.person_type}`.toLowerCase();
      return text.includes(search.toLowerCase()) && (departmentFilter === 'All' || person.department === departmentFilter);
    });
  }, [activePeople, search, departmentFilter]);

  const selectedPersonIndex = selectedPerson
    ? filteredPeople.findIndex(person => person.id === selectedPerson.id)
    : -1;
  const canMoveBetweenPeople = selectedPersonIndex >= 0 && filteredPeople.length > 1;

  const moveSelectedPerson = (direction: -1 | 1) => {
    if (!selectedPerson || !canMoveBetweenPeople) return;
    const nextIndex = (selectedPersonIndex + direction + filteredPeople.length) % filteredPeople.length;
    const nextPerson = filteredPeople[nextIndex];
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

  const filteredTypes = useMemo(() => {
    return activeTypes.filter(type =>
      typeFilter === 'All' || type.category === typeFilter
    );
  }, [activeTypes, typeFilter]);

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
          <div className="bg-card border border-border p-4 rounded-xl flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search people..." className="w-full pl-9 pr-3 py-2 bg-muted border border-border rounded-lg text-xs outline-none" />
            </div>
            <select value={departmentFilter} onChange={event => setDepartmentFilter(event.target.value)} className="bg-muted border border-border rounded-lg px-3 py-2 text-xs font-semibold">
              {departments.map(department => <option key={department} value={department}>{department}</option>)}
            </select>
            <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} className="bg-muted border border-border rounded-lg px-3 py-2 text-xs font-semibold">
              <option value="All">All Categories</option>
              {categories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider">
                    <th className="p-3 sticky left-0 bg-muted/95 z-10 min-w-52">Person</th>
                    {filteredTypes.map(type => <th key={type.id} className="p-3 min-w-40">{type.title}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPeople.length === 0 || filteredTypes.length === 0 ? (
                    <tr>
                      <td colSpan={Math.max(filteredTypes.length + 1, 1)} className="p-8 text-center text-muted-foreground">
                        Add people and competency types, or import a template pack to build the matrix.
                      </td>
                    </tr>
                  ) : filteredPeople.map(person => (
                    <tr key={person.id} className="hover:bg-muted/30">
                      <td className="p-3 sticky left-0 bg-card z-10">
                        <button
                          onClick={() => openPersonWorkspace(person)}
                          className="w-full text-left rounded-lg p-1 -m-1 hover:bg-muted cursor-pointer transition-colors"
                        >
                          <span className="font-extrabold block">{person.display_name}</span>
                          <span className="text-[10px] text-muted-foreground">{person.department || 'No department'} | {person.person_type}</span>
                        </button>
                      </td>
                      {filteredTypes.map(type => {
                        const cell = matrix.find(item => item.person.id === person.id && item.competencyType.id === type.id);
                        return (
                          <td key={type.id} className="p-3">
                            <button
                              onClick={() => openCell(person, type)}
                              className={`w-full text-left border rounded-lg px-2.5 py-2 hover:bg-muted/60 ${statusClass(cell?.status || 'Missing')}`}
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
                          return (
                            <button
                              key={type.id}
                              onClick={() => openCell(selectedPerson, type)}
                              className={`w-full text-left px-3.5 py-2.5 border rounded-xl hover:bg-muted/50 transition-all ${
                                isActive
                                  ? 'border-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/15 shadow-sm ring-1 ring-indigo-500/30'
                                  : 'border-border/80 bg-card hover:border-border'
                              } flex items-center justify-between gap-3 cursor-pointer group`}
                            >
                              <div className="min-w-0 flex-1">
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
                              </div>
                              <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold shrink-0 ${statusClass(cell?.status || 'Missing')}`}>
                                {cell?.status || 'Missing'}
                              </span>
                            </button>
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
                <div className="absolute lg:relative inset-y-0 right-0 w-full lg:w-auto bg-card border-l border-border z-30 flex flex-col h-full overflow-y-auto p-5 space-y-4.5 shadow-xl lg:shadow-none">
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
