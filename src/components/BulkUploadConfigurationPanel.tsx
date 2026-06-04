'use client';

import React, { useState } from 'react';
import { CheckCircle2, Settings2, X } from 'lucide-react';
import type {
  Action,
  CompetencyRecord,
  CompetencyType,
  EvidenceDocument,
  Person,
  Requirement,
  RequirementEvidenceCriterion
} from '@/lib/types';

type BulkUploadConfigurationPanelProps = {
  documents: EvidenceDocument[];
  requirements?: Requirement[];
  criteria?: RequirementEvidenceCriterion[];
  actions?: Action[];
  competencyRecords?: CompetencyRecord[];
  people?: Person[];
  competencyTypes?: CompetencyType[];
  onClose: () => void;
  onUpdateDocument: (docId: string, updates: Partial<EvidenceDocument>) => Promise<EvidenceDocument>;
  onLinkRequirement?: (requirementId: string, docId: string) => Promise<void>;
  onLinkCriterion?: (criterionId: string, docId: string) => Promise<void>;
  onLinkAction?: (actionId: string, docId: string) => Promise<void>;
  onLinkCompetencyRecord?: (recordId: string, docId: string) => Promise<void>;
};

type FormState = {
  title: string;
  category: string;
  tags: string;
  issue_date: string;
  expiry_date: string;
  review_date: string;
  training_date: string;
  calibration_date: string;
  notes: string;
  requirementId: string;
  criterionId: string;
  actionId: string;
  competencyRecordId: string;
};

const formFromDoc = (doc: EvidenceDocument): FormState => ({
  title: doc.title,
  category: doc.category,
  tags: (doc.tags || []).join(', '),
  issue_date: doc.issue_date || '',
  expiry_date: doc.expiry_date || '',
  review_date: doc.review_date || '',
  training_date: doc.training_date || '',
  calibration_date: doc.calibration_date || '',
  notes: typeof doc.metadata?.notes === 'string' ? doc.metadata.notes : '',
  requirementId: '',
  criterionId: '',
  actionId: '',
  competencyRecordId: ''
});

export function BulkUploadConfigurationPanel({
  documents,
  requirements = [],
  criteria = [],
  actions = [],
  competencyRecords = [],
  people = [],
  competencyTypes = [],
  onClose,
  onUpdateDocument,
  onLinkRequirement,
  onLinkCriterion,
  onLinkAction,
  onLinkCompetencyRecord
}: BulkUploadConfigurationPanelProps) {
  const [forms, setForms] = useState<Record<string, FormState>>(() =>
    Object.fromEntries(documents.map(doc => [doc.id, formFromDoc(doc)]))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const setForm = (docId: string, patch: Partial<FormState>) => {
    setForms(current => ({ ...current, [docId]: { ...current[docId], ...patch } }));
  };

  const saveOne = async (doc: EvidenceDocument) => {
    const form = forms[doc.id];
    if (!form) return;
    setSavingId(doc.id);
    setError('');
    setMessage('');
    try {
      await onUpdateDocument(doc.id, {
        title: form.title.trim() || doc.title,
        category: form.category.trim() || 'General',
        tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        issue_date: form.issue_date || null,
        expiry_date: form.expiry_date || null,
        review_date: form.review_date || null,
        training_date: form.training_date || null,
        calibration_date: form.calibration_date || null,
        metadata: {
          ...(doc.metadata || {}),
          notes: form.notes || undefined,
          future_linking: 'asset links can be added when an asset register exists'
        }
      });
      if (form.requirementId && onLinkRequirement) await onLinkRequirement(form.requirementId, doc.id);
      if (form.criterionId && onLinkCriterion) await onLinkCriterion(form.criterionId, doc.id);
      if (form.actionId && onLinkAction) await onLinkAction(form.actionId, doc.id);
      if (form.competencyRecordId && onLinkCompetencyRecord) await onLinkCompetencyRecord(form.competencyRecordId, doc.id);
      setMessage(`Configured ${form.title || doc.title}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save upload configuration.');
    } finally {
      setSavingId(null);
    }
  };

  if (documents.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-4xl bg-card border-l border-border h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border p-5 flex items-start justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bulk Upload Configuration</span>
            <h2 className="text-lg font-extrabold flex items-center gap-2"><Settings2 className="w-5 h-5 text-blue-500" /> Configure uploaded evidence</h2>
            <p className="text-xs text-muted-foreground mt-1">Update metadata and link records to existing requirements, criteria, actions, or competency records.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg" aria-label="Close upload configuration">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {message && <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 rounded-lg text-xs">{message}</div>}
          {error && <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 rounded-lg text-xs">{error}</div>}

          {documents.map(doc => {
            const form = forms[doc.id] || formFromDoc(doc);
            return (
              <div key={doc.id} className="p-4 bg-muted/20 border border-border rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-extrabold block truncate">{doc.original_file_name || doc.file_name}</span>
                    <span className="text-[10px] text-muted-foreground block truncate">{doc.storage_path || doc.file_name}</span>
                  </div>
                  <button
                    onClick={() => saveOne(doc)}
                    disabled={savingId === doc.id}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/40 text-white rounded-lg font-bold flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> {savingId === doc.id ? 'Saving...' : 'Save'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input value={form.title} onChange={event => setForm(doc.id, { title: event.target.value })} placeholder="Title" className="px-3 py-2 bg-card border border-border rounded-lg outline-none" />
                  <input value={form.category} onChange={event => setForm(doc.id, { category: event.target.value })} placeholder="Category" className="px-3 py-2 bg-card border border-border rounded-lg outline-none" />
                  <input value={form.tags} onChange={event => setForm(doc.id, { tags: event.target.value })} placeholder="Tags, comma separated" className="px-3 py-2 bg-card border border-border rounded-lg outline-none md:col-span-2" />
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-muted-foreground">Issue date</span><input type="date" value={form.issue_date} onChange={event => setForm(doc.id, { issue_date: event.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded-lg outline-none" /></label>
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-muted-foreground">Expiry date</span><input type="date" value={form.expiry_date} onChange={event => setForm(doc.id, { expiry_date: event.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded-lg outline-none" /></label>
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-muted-foreground">Review date</span><input type="date" value={form.review_date} onChange={event => setForm(doc.id, { review_date: event.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded-lg outline-none" /></label>
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-muted-foreground">Training date</span><input type="date" value={form.training_date} onChange={event => setForm(doc.id, { training_date: event.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded-lg outline-none" /></label>
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-muted-foreground">Calibration date</span><input type="date" value={form.calibration_date} onChange={event => setForm(doc.id, { calibration_date: event.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded-lg outline-none" /></label>
                  <textarea value={form.notes} onChange={event => setForm(doc.id, { notes: event.target.value })} placeholder="Notes" rows={2} className="px-3 py-2 bg-card border border-border rounded-lg outline-none resize-none" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select value={form.requirementId} onChange={event => setForm(doc.id, { requirementId: event.target.value })} className="px-3 py-2 bg-card border border-border rounded-lg outline-none">
                    <option value="">Link to requirement...</option>
                    {requirements.map(requirement => <option key={requirement.id} value={requirement.id}>{requirement.title}</option>)}
                  </select>
                  <select value={form.criterionId} onChange={event => setForm(doc.id, { criterionId: event.target.value })} className="px-3 py-2 bg-card border border-border rounded-lg outline-none">
                    <option value="">Link to evidence criterion...</option>
                    {criteria.map(criterion => <option key={criterion.id} value={criterion.id}>{criterion.title}</option>)}
                  </select>
                  <select value={form.actionId} onChange={event => setForm(doc.id, { actionId: event.target.value })} className="px-3 py-2 bg-card border border-border rounded-lg outline-none">
                    <option value="">Link to action record...</option>
                    {actions.map(action => <option key={action.id} value={action.id}>{action.title}</option>)}
                  </select>
                  <select value={form.competencyRecordId} onChange={event => setForm(doc.id, { competencyRecordId: event.target.value })} className="px-3 py-2 bg-card border border-border rounded-lg outline-none">
                    <option value="">Link to competency record...</option>
                    {competencyRecords.map(record => {
                      const person = people.find(item => item.id === record.person_id);
                      const type = competencyTypes.find(item => item.id === record.competency_type_id);
                      return <option key={record.id} value={record.id}>{person?.display_name || 'Person'} - {type?.title || 'Competency'}</option>;
                    })}
                  </select>
                </div>
                <p className="text-[10px] text-muted-foreground">Asset links are reserved for a future asset register; no asset module is created in this version.</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
