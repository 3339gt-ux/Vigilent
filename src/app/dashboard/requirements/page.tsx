'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import type { Requirement, RequirementStatus } from '@/lib/types';
import { calculateRequirementStatus, getLinkedDocumentsForRequirement } from '@/lib/requirementsEngine';
import {
  ClipboardList,
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

export default function RequirementsPage() {
  const {
    user,
    documents,
    frameworkRequirements,
    requirementDocuments,
    reviews,
    actions,
    requirementActions,
    createFrameworkRequirement,
    updateFrameworkRequirement,
    linkDocumentToRequirement,
    unlinkDocumentFromRequirement
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'All' | RequirementStatus>('All');
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Operations');
  const [newOwner, setNewOwner] = useState('');
  const [newRisk, setNewRisk] = useState<Requirement['risk_level']>('Medium');
  const [newFrequency, setNewFrequency] = useState<Requirement['review_frequency']>('Annually');
  const [newNextDue, setNewNextDue] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [linkingDocumentId, setLinkingDocumentId] = useState('');

  const assessedRequirements = useMemo(() => {
    return frameworkRequirements.map(requirement => {
      const linkedDocuments = getLinkedDocumentsForRequirement(requirement.id, documents, requirementDocuments);
      return {
        ...requirement,
        status: calculateRequirementStatus(requirement, linkedDocuments),
        linkedDocuments
      };
    });
  }, [documents, frameworkRequirements, requirementDocuments]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Requirements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Standards-agnostic operating requirements, evidence links, reviews, and actions.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/15"
        >
          <Plus className="w-4 h-4" /> Add Requirement
        </button>
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
                        No requirements match the current filters.
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
                          onClick={() => setSelectedRequirement(requirement)}
                          className="hover:bg-muted/30 cursor-pointer transition-colors"
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
                <button onClick={() => setSelectedRequirement(null)} className="p-1 hover:bg-muted rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-bold">{selectedAssessed.category}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><span className="font-bold">{selectedAssessed.owner || 'Unassigned'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Risk</span><span className="font-bold">{selectedAssessed.risk_level}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Review Frequency</span><span className="font-bold">{selectedAssessed.review_frequency}</span></div>
                <p className="text-muted-foreground leading-relaxed pt-2">{selectedAssessed.description || 'No description added.'}</p>
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
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Open Actions</span>
                {selectedActions.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic">No actions linked.</p>
                ) : (
                  selectedActions.map(action => (
                    <div key={action.id} className="p-2 bg-muted/40 rounded-lg text-[11px]">
                      <span className="font-bold block">{action.title}</span>
                      <span className="text-muted-foreground">{action.status} {action.due_date ? `- Due ${action.due_date}` : ''}</span>
                    </div>
                  ))
                )}
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
            <div className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
              <ClipboardList className="w-10 h-10 text-muted/30" />
              <span className="text-xs font-bold block">No Requirement Selected</span>
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
    </div>
  );
}
