'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ActionDetailDrawer } from '@/components/ActionDetailDrawer';
import type { Action, Requirement, RequirementStatus } from '@/lib/types';
import { calculateRequirementStatus, getLinkedDocumentsForRequirement } from '@/lib/requirementsEngine';
import { REQUIREMENT_TEMPLATE_PACKS } from '@/lib/requirementTemplatePacks';
import {
  ClipboardList,
  Download,
  Link as LinkIcon,
  Plus,
  Search,
  X
} from 'lucide-react';

const statusClass = (status: RequirementStatus) => {
  if (status === 'GREEN') return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400';
  if (status === 'AMBER') return 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400';
  if (status === 'RED') return 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400';
  return 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500';
};

const riskOptions: Requirement['risk_level'][] = ['Low', 'Medium', 'High', 'Critical'];
const frequencyOptions: Requirement['review_frequency'][] = ['Weekly', 'Monthly', 'Quarterly', 'Annually', 'Custom'];
const requirementStatusOptions: RequirementStatus[] = ['GREEN', 'AMBER', 'RED', 'GREY'];

export default function RequirementsPage() {
  const {
    user,
    documents,
    frameworkRequirements,
    requirementDocuments,
    reviews,
    actions,
    requirementActions,
    actionUpdates,
    actionDocuments,
    createFrameworkRequirement,
    importRequirementTemplateItems,
    updateFrameworkRequirement,
    linkDocumentToRequirement,
    unlinkDocumentFromRequirement,
    createActionForRequirement,
    updateAction,
    addActionUpdate,
    linkDocumentToAction,
    unlinkDocumentFromAction,
    uploadActionAttachment,
    getDocumentSignedUrl,
    readinessReport
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'All' | RequirementStatus>('All');
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
    return readinessReport.requirements.map(item => ({
      ...item.requirement,
      status: item.status,
      linkedDocuments: item.linkedDocuments
    }));
  }, [readinessReport.requirements]);

  const filteredRequirements = assessedRequirements.filter(requirement => {
    const matchesSearch =
      requirement.title.toLowerCase().includes(search.toLowerCase()) ||
      requirement.category.toLowerCase().includes(search.toLowerCase()) ||
      (requirement.owner || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = selectedStatus === 'All' || requirement.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const selectedAssessed = selectedRequirement
    ? assessedRequirements.find(requirement => requirement.id === selectedRequirement.id) || null
    : null;

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
        requirementActions.some(link => link.action_id === selectedAction.id && link.requirement_id === requirement.id)
      )
    : [];
  const currentSelectedAction = selectedAction
    ? actions.find(action => action.id === selectedAction.id) || selectedAction
    : null;
  const selectedPack = REQUIREMENT_TEMPLATE_PACKS.find(pack => pack.id === selectedPackId) || REQUIREMENT_TEMPLATE_PACKS[0];
  const existingRequirementKeys = new Set(
    frameworkRequirements.map(requirement => `${requirement.title.trim().toLowerCase()}::${requirement.category.trim().toLowerCase()}`)
  );
  const templateKey = (title: string, category: string) => `${title.trim().toLowerCase()}::${category.trim().toLowerCase()}`;

  const openImportModal = () => {
    const pack = REQUIREMENT_TEMPLATE_PACKS.find(item => item.id === selectedPackId) || REQUIREMENT_TEMPLATE_PACKS[0];
    setSelectedTemplateKeys(
      new Set(
        pack.requirements
          .filter(item => !existingRequirementKeys.has(templateKey(item.title, item.category)))
          .map(item => templateKey(item.title, item.category))
      )
    );
    setImportMessage('');
    setShowImportModal(true);
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

  const handleLinkDocument = async () => {
    if (!selectedRequirement || !linkingDocumentId) return;
    await linkDocumentToRequirement(selectedRequirement.id, linkingDocumentId);
    const linkedDocuments = getLinkedDocumentsForRequirement(selectedRequirement.id, documents, [
      ...requirementDocuments,
      {
        id: 'pending',
        requirement_id: selectedRequirement.id,
        document_id: linkingDocumentId,
        organisation_id: selectedRequirement.organisation_id,
        linked_by: user?.id || null,
        created_at: new Date().toISOString()
      }
    ]);
    await updateFrameworkRequirement(selectedRequirement.id, {
      status: calculateRequirementStatus(selectedRequirement, linkedDocuments)
    });
    setLinkingDocumentId('');
  };

  const handleUnlinkDocument = async (documentId: string) => {
    if (!selectedRequirement) return;
    await unlinkDocumentFromRequirement(selectedRequirement.id, documentId);
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
            onClick={openImportModal}
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

      <div className="bg-card border border-border rounded-xl p-4 text-xs">
        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Getting Started</h2>
        <p className="text-muted-foreground mt-1 leading-relaxed">
          Use <strong className="text-foreground">Import Template Pack</strong> to preview practical starter requirements, select only the items you want, and skip duplicates automatically. After import, open a requirement to link existing evidence records and review its calculated status.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(['GREEN', 'AMBER', 'RED', 'GREY'] as RequirementStatus[]).map(status => (
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
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-card border border-border p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-xs">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search requirements..."
                className="w-full pl-9 pr-4 py-2 bg-muted border border-border/80 rounded-lg text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={event => setSelectedStatus(event.target.value as 'All' | RequirementStatus)}
              className="bg-muted border border-border/80 rounded px-2 py-1 outline-none text-xs text-foreground font-semibold"
            >
              <option value="All">All Statuses</option>
              <option value="GREEN">Green</option>
              <option value="AMBER">Amber</option>
              <option value="RED">Red</option>
              <option value="GREY">Grey</option>
            </select>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="p-4">Title</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Owner</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4">Next Due Date</th>
                    <th className="p-4">Linked Evidence</th>
                    <th className="p-4">Actions</th>
                    <th className="p-4">Last Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredRequirements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        {frameworkRequirements.length === 0
                          ? 'No requirements yet. Import a template pack to create a practical starter set for this organisation.'
                          : 'No requirements match the current filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredRequirements.map(requirement => {
                      const lastReview = reviews
                        .filter(review => review.requirement_id === requirement.id)
                        .sort((a, b) => new Date(b.review_date).getTime() - new Date(a.review_date).getTime())[0];
                      const actionCount = requirementActions.filter(link => link.requirement_id === requirement.id).length;
                      return (
                        <tr
                          key={requirement.id}
                          onClick={() => selectRequirement(requirement)}
                          className={`hover:bg-muted/50 cursor-pointer transition-colors border-l-2 ${
                            selectedRequirement?.id === requirement.id
                              ? 'bg-indigo-500/5 border-l-indigo-600'
                              : 'border-l-transparent'
                          }`}
                        >
                          <td className="p-4 font-bold">{requirement.title}</td>
                          <td className="p-4 text-muted-foreground font-semibold">{requirement.category}</td>
                          <td className="p-4 text-muted-foreground font-semibold">{requirement.owner || 'Unassigned'}</td>
                          <td className="p-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${statusClass(requirement.status)}`}>
                              {requirement.status}
                            </span>
                          </td>
                          <td className="p-4 text-muted-foreground font-semibold">{requirement.next_due_date || 'Not set'}</td>
                          <td className="p-4 text-muted-foreground font-semibold">{requirement.linkedDocuments.length}</td>
                          <td className="p-4 text-muted-foreground font-semibold">{actionCount}</td>
                          <td className="p-4 text-muted-foreground font-semibold">{lastReview?.review_date || 'None'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
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
                      <input
                        value={editCategory}
                        onChange={event => setEditCategory(event.target.value)}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg outline-none"
                      />
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
                  <div className="flex justify-between"><span className="text-muted-foreground">Stored Status</span><span className="font-bold">{selectedAssessed.status}</span></div>
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
                <p>Current calculated status: {selectedAssessed.status}</p>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl p-6 relative shadow-2xl">
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
                  <input value={newCategory} onChange={event => setNewCategory(event.target.value)} className="w-full px-3 py-2 bg-muted border border-border/80 rounded-lg outline-none" />
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-5xl rounded-2xl p-6 relative shadow-2xl max-h-[88vh] overflow-hidden flex flex-col">
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
      />
    </div>
  );
}
