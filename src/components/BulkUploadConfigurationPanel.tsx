'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Settings2,
  X,
  AlertCircle,
  Calendar,
  Link as LinkIcon,
  FileText,
  ChevronDown,
  ChevronUp,
  Save,
  Image as ImageIcon,
  FileSpreadsheet,
  FileArchive
} from 'lucide-react';
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
  uploadContext?: 'vault' | 'competency' | 'action' | 'requirement' | 'criteria';
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

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['pdf'].includes(ext || '')) return <FileText className="w-5 h-5 text-rose-500" />;
  if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext || '')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
  if (['doc', 'docx'].includes(ext || '')) return <FileText className="w-5 h-5 text-indigo-500" />;
  if (['zip', 'rar', 'tar', 'gz'].includes(ext || '')) return <FileArchive className="w-5 h-5 text-amber-500" />;
  return <FileText className="w-5 h-5 text-zinc-500" />;
};

const getSuggestedCategory = (doc: EvidenceDocument, props: BulkUploadConfigurationPanelProps) => {
  if (props.uploadContext === 'competency') return 'Training & Competency';
  if (props.uploadContext === 'action') return 'Actions';
  if (props.uploadContext === 'requirement' || props.uploadContext === 'criteria') return 'Requirement Evidence';

  if (props.onLinkCompetencyRecord && !props.onLinkRequirement && !props.onLinkAction) {
    return 'Training & Competency';
  }
  if (props.onLinkAction && !props.onLinkRequirement && !props.onLinkCompetencyRecord) {
    return 'Actions';
  }
  if ((props.onLinkRequirement || props.onLinkCriterion) && !props.onLinkAction && !props.onLinkCompetencyRecord) {
    return 'Requirement Evidence';
  }

  return doc.category || 'General';
};

const formFromDoc = (doc: EvidenceDocument, props: BulkUploadConfigurationPanelProps): FormState => ({
  title: doc.title,
  category: getSuggestedCategory(doc, props),
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

export function BulkUploadConfigurationPanel(props: BulkUploadConfigurationPanelProps) {
  const {
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
  } = props;

  const [forms, setForms] = useState<Record<string, FormState>>(() =>
    Object.fromEntries(documents.map(doc => [doc.id, formFromDoc(doc, props)]))
  );

  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [failedIds, setFailedIds] = useState<Record<string, string>>({});
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);
  const [globalMessage, setGlobalMessage] = useState('');
  const [globalError, setGlobalError] = useState('');

  const setForm = (docId: string, patch: Partial<FormState>) => {
    setForms(current => ({ ...current, [docId]: { ...current[docId], ...patch } }));
  };

  const toggleCardExpanded = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveOne = async (doc: EvidenceDocument, silent = false) => {
    const form = forms[doc.id];
    if (!form) return;

    if (!silent) {
      setSavingId(doc.id);
      setFailedIds(prev => {
        const next = { ...prev };
        delete next[doc.id];
        return next;
      });
    }

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
        }
      });

      if (form.requirementId && onLinkRequirement) {
        await onLinkRequirement(form.requirementId, doc.id);
      }
      if (form.criterionId && onLinkCriterion) {
        await onLinkCriterion(form.criterionId, doc.id);
      }
      if (form.actionId && onLinkAction) {
        await onLinkAction(form.actionId, doc.id);
      }
      if (form.competencyRecordId && onLinkCompetencyRecord) {
        await onLinkCompetencyRecord(form.competencyRecordId, doc.id);
      }

      setSavedIds(prev => new Set(prev).add(doc.id));
      if (!silent) {
        setGlobalMessage(`Saved and linked ${form.title || doc.title}.`);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Could not save record.';
      setFailedIds(prev => ({ ...prev, [doc.id]: errMsg }));
      if (!silent) {
        setGlobalError(`Failed to save ${form.title || doc.title}: ${errMsg}`);
      }
      throw err;
    } finally {
      if (!silent) setSavingId(null);
    }
  };

  const saveAll = async () => {
    setSavingAll(true);
    setGlobalError('');
    setGlobalMessage('');

    let savedCount = 0;
    let failedCount = 0;

    for (const doc of documents) {
      // Skip already saved to avoid duplicate updates
      if (savedIds.has(doc.id)) {
        savedCount++;
        continue;
      }

      try {
        await saveOne(doc, true);
        savedCount++;
      } catch (err) {
        console.error('Failed to save document in bulk:', err);
        failedCount++;
      }
    }

    if (failedCount === 0) {
      setGlobalMessage(`All ${savedCount} documents saved and linked successfully.`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setGlobalError(`Saved ${savedCount} documents. ${failedCount} files failed to save. Please review card errors.`);
    }
    setSavingAll(false);
  };

  if (documents.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-5xl bg-card border-l border-border h-full flex flex-col shadow-2xl">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Batch Upload Manager</span>
            <h2 className="text-lg font-extrabold flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin-once" />
              Configure Uploaded Evidence
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Add metadata, dates, and link records for your uploaded files in bulk.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {documents.length >= 2 && (
              <button
                onClick={saveAll}
                disabled={savingAll || savedIds.size === documents.length}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-755 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-650/15"
              >
                <Save className="w-4 h-4" />
                {savingAll ? 'Saving all...' : `Save All Files (${documents.length})`}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted border border-transparent hover:border-border rounded-lg text-muted-foreground transition-all"
              aria-label="Close configuration panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Cards Grid */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {globalMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
              {globalMessage}
            </div>
          )}
          {globalError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              {globalError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map(doc => {
              const form = forms[doc.id] || formFromDoc(doc, props);
              const isSaved = savedIds.has(doc.id);
              const isSaving = savingId === doc.id;
              const cardError = failedIds[doc.id];
              const isExpanded = expandedCards.has(doc.id);

              return (
                <div
                  key={doc.id}
                  className={`bg-card border rounded-xl p-4 space-y-3.5 transition-all duration-200 ${
                    isSaved ? 'border-emerald-500/20 shadow-emerald-500/2 bg-emerald-500/5 dark:bg-emerald-500/5' :
                    cardError ? 'border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/5' :
                    'border-border shadow-xs hover:border-border-hover'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="p-2 bg-muted rounded-lg shrink-0">
                        {getFileIcon(doc.original_file_name || doc.file_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-extrabold text-xs text-foreground block truncate" title={doc.original_file_name || doc.file_name}>
                          {doc.original_file_name || doc.file_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground block truncate">
                          {doc.category || 'General'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => saveOne(doc)}
                      disabled={isSaving || isSaved || savingAll}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        isSaved ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                        'bg-indigo-600 hover:bg-indigo-755 text-white disabled:opacity-50'
                      }`}
                    >
                      {isSaved ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Saved
                        </>
                      ) : isSaving ? (
                        'Saving...'
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          Save File
                        </>
                      )}
                    </button>
                  </div>

                  {cardError && (
                    <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{cardError}</span>
                    </div>
                  )}

                  {/* Primary Fields */}
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Document Title
                        </label>
                        <input
                          value={form.title}
                          onChange={event => setForm(doc.id, { title: event.target.value })}
                          placeholder="Title"
                          disabled={isSaved || isSaving}
                          className="w-full px-3 py-1.5 bg-muted/40 border border-border focus:border-indigo-500 focus:bg-card rounded-lg text-xs outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Compliance Category
                        </label>
                        <input
                          value={form.category}
                          onChange={event => setForm(doc.id, { category: event.target.value })}
                          placeholder="Category (e.g. Training)"
                          disabled={isSaved || isSaving}
                          className="w-full px-3 py-1.5 bg-muted/40 border border-border focus:border-indigo-500 focus:bg-card rounded-lg text-xs outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Search Tags (comma-separated)
                      </label>
                      <input
                        value={form.tags}
                        onChange={event => setForm(doc.id, { tags: event.target.value })}
                        placeholder="e.g. certificate, training, driver"
                        disabled={isSaved || isSaving}
                        className="w-full px-3 py-1.5 bg-muted/40 border border-border focus:border-indigo-500 focus:bg-card rounded-lg text-xs outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Progressive Disclosure Section Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleCardExpanded(doc.id)}
                    className="w-full flex items-center justify-between py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-t border-border/60 pt-2 hover:text-indigo-600 transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Dates, Notes & Linkages
                    </span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {/* Collapsible Content */}
                  {isExpanded && (
                    <div className="space-y-3.5 pt-1.5 text-xs animate-slide-down">
                      {/* Dates */}
                      <div className="grid grid-cols-2 gap-2.5 bg-muted/10 p-2.5 rounded-lg border border-border/60">
                        <label className="space-y-1">
                          <span className="text-[9px] font-bold uppercase text-muted-foreground">Issue Date</span>
                          <input
                            type="date"
                            value={form.issue_date}
                            onChange={event => setForm(doc.id, { issue_date: event.target.value })}
                            disabled={isSaved || isSaving}
                            className="w-full px-2 py-1 bg-card border border-border rounded-lg outline-none text-xs"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[9px] font-bold uppercase text-muted-foreground">Expiry Date</span>
                          <input
                            type="date"
                            value={form.expiry_date}
                            onChange={event => setForm(doc.id, { expiry_date: event.target.value })}
                            disabled={isSaved || isSaving}
                            className="w-full px-2 py-1 bg-card border border-border rounded-lg outline-none text-xs"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[9px] font-bold uppercase text-muted-foreground">Review Date</span>
                          <input
                            type="date"
                            value={form.review_date}
                            onChange={event => setForm(doc.id, { review_date: event.target.value })}
                            disabled={isSaved || isSaving}
                            className="w-full px-2 py-1 bg-card border border-border rounded-lg outline-none text-xs"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[9px] font-bold uppercase text-muted-foreground">Training Date</span>
                          <input
                            type="date"
                            value={form.training_date}
                            onChange={event => setForm(doc.id, { training_date: event.target.value })}
                            disabled={isSaved || isSaving}
                            className="w-full px-2 py-1 bg-card border border-border rounded-lg outline-none text-xs"
                          />
                        </label>
                        <label className="space-y-1 col-span-2">
                          <span className="text-[9px] font-bold uppercase text-muted-foreground">Calibration Date</span>
                          <input
                            type="date"
                            value={form.calibration_date}
                            onChange={event => setForm(doc.id, { calibration_date: event.target.value })}
                            disabled={isSaved || isSaving}
                            className="w-full px-2 py-1 bg-card border border-border rounded-lg outline-none text-xs"
                          />
                        </label>
                      </div>

                      {/* Notes */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Notes / Description
                        </label>
                        <textarea
                          value={form.notes}
                          onChange={event => setForm(doc.id, { notes: event.target.value })}
                          placeholder="Enter compliance details or certification numbers..."
                          disabled={isSaved || isSaving}
                          rows={2}
                          className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-lg outline-none resize-none focus:border-indigo-500 focus:bg-card"
                        />
                      </div>

                      {/* Linking Controls */}
                      <div className="space-y-2 bg-muted/20 p-2.5 border border-border/80 rounded-lg">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <LinkIcon className="w-3 h-3 text-indigo-650" />
                          Link Compliance Targets
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                          <select
                            value={form.requirementId}
                            onChange={event => setForm(doc.id, { requirementId: event.target.value })}
                            disabled={isSaved || isSaving}
                            className="px-2.5 py-1.5 bg-card border border-border rounded-lg outline-none text-xs"
                          >
                            <option value="">Link to requirement...</option>
                            {requirements.map(requirement => (
                              <option key={requirement.id} value={requirement.id}>{requirement.title}</option>
                            ))}
                          </select>
                          <select
                            value={form.criterionId}
                            onChange={event => setForm(doc.id, { criterionId: event.target.value })}
                            disabled={isSaved || isSaving}
                            className="px-2.5 py-1.5 bg-card border border-border rounded-lg outline-none text-xs"
                          >
                            <option value="">Link to evidence criterion...</option>
                            {criteria.map(criterion => (
                              <option key={criterion.id} value={criterion.id}>{criterion.title}</option>
                            ))}
                          </select>
                          <select
                            value={form.actionId}
                            onChange={event => setForm(doc.id, { actionId: event.target.value })}
                            disabled={isSaved || isSaving}
                            className="px-2.5 py-1.5 bg-card border border-border rounded-lg outline-none text-xs"
                          >
                            <option value="">Link to action record...</option>
                            {actions.map(action => (
                              <option key={action.id} value={action.id}>{action.title}</option>
                            ))}
                          </select>
                          <select
                            value={form.competencyRecordId}
                            onChange={event => setForm(doc.id, { competencyRecordId: event.target.value })}
                            disabled={isSaved || isSaving}
                            className="px-2.5 py-1.5 bg-card border border-border rounded-lg outline-none text-xs"
                          >
                            <option value="">Link to competency record...</option>
                            {competencyRecords.map(record => {
                              const person = people.find(item => item.id === record.person_id);
                              const type = competencyTypes.find(item => item.id === record.competency_type_id);
                              return (
                                <option key={record.id} value={record.id}>
                                  {person?.display_name || 'Person'} - {type?.title || 'Competency'}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-10 bg-card/95 backdrop-blur border-t border-border p-4 flex justify-between items-center shrink-0">
          <div className="text-xs text-muted-foreground">
            {savedIds.size} of {documents.length} files saved
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-muted hover:bg-muted/80 border border-border rounded-lg text-xs font-bold transition-all text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={saveAll}
              disabled={savingAll || savedIds.size === documents.length}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-755 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-650/15"
            >
              <Save className="w-4 h-4" />
              {savingAll ? 'Saving all...' : `Save All Files (${documents.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
