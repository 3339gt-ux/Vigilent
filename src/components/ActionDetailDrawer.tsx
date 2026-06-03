'use client';

import React, { useMemo, useState } from 'react';
import {
  Action,
  ActionDocument,
  ActionUpdate,
  ActionUpdateType,
  EvidenceDocument,
  Requirement
} from '@/lib/types';
import { evidenceAcceptAttribute, formatMaxEvidenceUploadSize } from '@/lib/evidenceStorage';
import { CheckCircle2, FileText, Link as LinkIcon, Loader2, Play, RotateCcw, Upload, X } from 'lucide-react';

type ActionDetailDrawerProps = {
  action: Action | null;
  requirements: Requirement[];
  documents: EvidenceDocument[];
  actionUpdates: ActionUpdate[];
  actionDocuments: ActionDocument[];
  onClose: () => void;
  onUpdateAction: (actionId: string, updates: Partial<Action>) => Promise<Action>;
  onAddUpdate: (actionId: string, updateType: ActionUpdateType, note: string) => Promise<ActionUpdate>;
  onLinkDocument: (actionId: string, documentId: string) => Promise<void>;
  onUnlinkDocument: (actionId: string, documentId: string) => Promise<void>;
  onUploadAttachment: (actionId: string, file: File) => Promise<EvidenceDocument>;
  onOpenDocument: (documentId: string) => Promise<string>;
};

const formatDateTime = (value?: string | null) => value ? new Date(value).toLocaleString() : 'Not recorded';
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString() : 'No date';
const actorLabel = (value?: string | null) => value ? value : 'Not recorded';

const statusClass = (status: Action['status']) => {
  if (status === 'Complete') return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400';
  if (status === 'Cancelled') return 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400';
  if (status === 'In Progress') return 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400';
  return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400';
};

export function ActionDetailDrawer({
  action,
  requirements,
  documents,
  actionUpdates,
  actionDocuments,
  onClose,
  onUpdateAction,
  onAddUpdate,
  onLinkDocument,
  onUnlinkDocument,
  onUploadAttachment,
  onOpenDocument
}: ActionDetailDrawerProps) {
  const [updateType, setUpdateType] = useState<ActionUpdateType>('Note');
  const [updateNote, setUpdateNote] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [completionNote, setCompletionNote] = useState('');
  const [cancellationNote, setCancellationNote] = useState('');
  const [reopenNote, setReopenNote] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const linkedDocumentIds = useMemo(
    () => new Set(actionDocuments.filter(link => link.action_id === action?.id).map(link => link.document_id)),
    [actionDocuments, action?.id]
  );

  if (!action) return null;

  const linkedDocuments = documents.filter(document => linkedDocumentIds.has(document.id));
  const availableDocuments = documents.filter(document => !linkedDocumentIds.has(document.id));
  const updates = actionUpdates
    .filter(update => update.action_id === action.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const runAction = async (operation: () => Promise<void>) => {
    setIsSaving(true);
    setError('');
    try {
      await operation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action update failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!updateNote.trim()) return;
    await runAction(async () => {
      await onAddUpdate(action.id, updateType, updateNote.trim());
      setUpdateNote('');
      setUpdateType('Note');
    });
  };

  const handleLinkDocument = async () => {
    if (!selectedDocumentId) return;
    await runAction(async () => {
      await onLinkDocument(action.id, selectedDocumentId);
      setSelectedDocumentId('');
    });
  };

  const handleUploadAttachment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!uploadFile) return;
    setIsUploading(true);
    setError('');
    setUploadMessage('');
    try {
      const doc = await onUploadAttachment(action.id, uploadFile);
      setUploadFile(null);
      setUploadFileName('');
      setUploadMessage(`Uploaded "${doc.original_file_name || doc.file_name}" to private Evidence Vault category Actions and linked it to this action.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Attachment upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenDocument = async (documentId: string) => {
    await runAction(async () => {
      const url = await onOpenDocument(documentId);
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  };

  const handleComplete = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!completionNote.trim()) return;
    await runAction(async () => {
      await onUpdateAction(action.id, {
        status: 'Complete',
        completion_note: completionNote.trim()
      });
      setCompletionNote('');
    });
  };

  const handleCancel = async (event: React.FormEvent) => {
    event.preventDefault();
    await runAction(async () => {
      await onUpdateAction(action.id, {
        status: 'Cancelled',
        cancellation_note: cancellationNote.trim() || null
      });
      setCancellationNote('');
    });
  };

  const handleReopen = async (event: React.FormEvent) => {
    event.preventDefault();
    await runAction(async () => {
      await onUpdateAction(action.id, {
        status: 'Open',
        cancellation_note: reopenNote.trim() || null
      });
      setReopenNote('');
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="bg-card border-l border-border w-full max-w-3xl h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border p-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Action Record</span>
            <h2 className="text-lg font-extrabold truncate">{action.title}</h2>
            <span className={`inline-block mt-2 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${statusClass(action.status)}`}>
              {action.status}
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg" aria-label="Close action detail">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-600 dark:text-rose-300">
              {error}
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-muted/30 border border-border/60 rounded-lg"><span className="text-muted-foreground block">Owner / Assignee</span><strong>{action.owner || 'Unassigned'}</strong></div>
            <div className="p-3 bg-muted/30 border border-border/60 rounded-lg"><span className="text-muted-foreground block">Target Due Date</span><strong>{formatDate(action.target_due_date || action.due_date)}</strong></div>
            <div className="p-3 bg-muted/30 border border-border/60 rounded-lg"><span className="text-muted-foreground block">Opened</span><strong>{formatDateTime(action.opened_at || action.created_at)}</strong></div>
            <div className="p-3 bg-muted/30 border border-border/60 rounded-lg"><span className="text-muted-foreground block">Opened By</span><strong className="break-all">{actorLabel(action.opened_by || action.created_by)}</strong></div>
            <div className="p-3 bg-muted/30 border border-border/60 rounded-lg"><span className="text-muted-foreground block">Closed</span><strong>{formatDateTime(action.closed_at || action.completed_at || action.cancelled_at)}</strong></div>
            <div className="p-3 bg-muted/30 border border-border/60 rounded-lg"><span className="text-muted-foreground block">Closed By</span><strong className="break-all">{actorLabel(action.closed_by || action.completed_by || action.cancelled_by)}</strong></div>
          </section>

          <section className="border-t border-border/50 pt-5 space-y-2 text-xs">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description</h3>
            <p className="text-muted-foreground leading-relaxed">{action.description || 'No action description recorded.'}</p>
          </section>

          <section className="border-t border-border/50 pt-5 space-y-2 text-xs">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Related Requirements</h3>
            {requirements.length === 0 ? (
              <p className="text-muted-foreground italic">No related requirement found.</p>
            ) : (
              requirements.map(requirement => (
                <div key={requirement.id} className="p-3 bg-muted/30 border border-border/60 rounded-lg">
                  <span className="font-bold block">{requirement.title}</span>
                  <span className="text-[10px] text-muted-foreground">{requirement.category} | {requirement.risk_level} risk</span>
                </div>
              ))
            )}
          </section>

          <section className="border-t border-border/50 pt-5 space-y-3 text-xs">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Attachments</h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Attachments are normal private Evidence Vault records. New uploads are saved in the Actions category and opened through temporary signed URLs only.
            </p>
            {linkedDocuments.length === 0 ? (
              <p className="text-muted-foreground italic">No evidence documents attached to this action.</p>
            ) : (
              linkedDocuments.map(document => (
                <div key={document.id} className="p-3 bg-muted/30 border border-border/60 rounded-lg flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-bold block truncate">{document.title}</span>
                    <span className="text-[10px] text-muted-foreground truncate block">{document.file_name}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleOpenDocument(document.id)} className="px-2 py-1 bg-indigo-500/10 text-indigo-500 rounded font-bold text-[10px]">Open</button>
                    <button onClick={() => runAction(() => onUnlinkDocument(action.id, document.id))} className="px-2 py-1 bg-rose-500/10 text-rose-500 rounded font-bold text-[10px]">Unlink</button>
                  </div>
                </div>
              ))
            )}
            <div className="flex gap-2">
              <select
                value={selectedDocumentId}
                onChange={event => setSelectedDocumentId(event.target.value)}
                className="min-w-0 flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-xs"
              >
                <option value="">Link existing evidence document</option>
                {availableDocuments.map(document => (
                  <option key={document.id} value={document.id}>{document.title}</option>
                ))}
              </select>
              <button
                onClick={handleLinkDocument}
                disabled={!selectedDocumentId || isSaving}
                className="px-3 py-2 bg-indigo-600 disabled:bg-indigo-600/40 text-white rounded-lg"
                title="Link attachment"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUploadAttachment} className="p-3 bg-muted/30 border border-border/60 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Upload New Attachment</span>
              </div>
              <input
                type="file"
                accept={evidenceAcceptAttribute}
                onChange={event => {
                  const file = event.target.files?.[0] || null;
                  setUploadFile(file);
                  setUploadFileName(file?.name || '');
                  setUploadMessage('');
                }}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-[11px]"
              />
              <p className="text-[9px] text-muted-foreground">
                {uploadFileName || `PDF, DOCX, XLSX, PNG, JPG, or JPEG. Max ${formatMaxEvidenceUploadSize()}.`}
              </p>
              {uploadMessage && (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] text-emerald-600 dark:text-emerald-300">
                  {uploadMessage}
                </div>
              )}
              <button
                disabled={!uploadFile || isUploading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white font-bold rounded-lg"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isUploading ? 'Uploading...' : 'Upload Attachment'}
              </button>
            </form>
          </section>

          <section className="border-t border-border/50 pt-5 space-y-3 text-xs">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Lifecycle Controls</h3>
            {(action.status === 'Open' || action.status === 'In Progress') ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {action.status === 'Open' && (
                  <button
                    onClick={() => runAction(() => onUpdateAction(action.id, { status: 'In Progress' }).then(() => undefined))}
                    disabled={isSaving}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold rounded-lg"
                  >
                    <Play className="w-4 h-4" /> Start Work
                  </button>
                )}
                <form onSubmit={handleComplete} className="p-3 bg-muted/30 border border-border/60 rounded-lg space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Completion Note</label>
                  <textarea required value={completionNote} onChange={event => setCompletionNote(event.target.value)} rows={2} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs resize-none" />
                  <button disabled={isSaving || !completionNote.trim()} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 disabled:bg-emerald-600/40 text-white font-bold rounded-lg">
                    <CheckCircle2 className="w-4 h-4" /> Complete
                  </button>
                </form>
                <form onSubmit={handleCancel} className="p-3 bg-muted/30 border border-border/60 rounded-lg space-y-2 md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cancellation Note</label>
                  <textarea value={cancellationNote} onChange={event => setCancellationNote(event.target.value)} rows={2} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs resize-none" />
                  <button disabled={isSaving} className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold rounded-lg">
                    Cancel Action
                  </button>
                </form>
              </div>
            ) : (
              <form onSubmit={handleReopen} className="p-3 bg-muted/30 border border-border/60 rounded-lg space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reopen Note</label>
                <textarea value={reopenNote} onChange={event => setReopenNote(event.target.value)} rows={2} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs resize-none" />
                <button disabled={isSaving} className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg">
                  <RotateCcw className="w-4 h-4" /> Reopen Action
                </button>
              </form>
            )}
          </section>

          <section className="border-t border-border/50 pt-5 space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Action History Timeline</h3>
            </div>
            <form onSubmit={handleAddUpdate} className="p-3 bg-muted/30 border border-border/60 rounded-lg space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <select value={updateType} onChange={event => setUpdateType(event.target.value as ActionUpdateType)} className="px-3 py-2 bg-muted border border-border rounded-lg">
                  <option value="Note">Note</option>
                  <option value="Progress Update">Progress Update</option>
                </select>
                <input value={updateNote} onChange={event => setUpdateNote(event.target.value)} placeholder="Add dated update..." className="md:col-span-2 px-3 py-2 bg-muted border border-border rounded-lg" />
              </div>
              <button disabled={isSaving || !updateNote.trim()} className="px-3 py-2 bg-indigo-600 disabled:bg-indigo-600/40 text-white font-bold rounded-lg">
                Add Update
              </button>
            </form>
              <div className="space-y-3">
                {updates.map(update => (
                  <div key={update.id} className="p-3 border-l-2 border-indigo-600 bg-muted/40 rounded-r-lg text-xs">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <span className="font-bold text-foreground">{update.update_type}</span>
                      <span className="text-[10px] text-muted-foreground">{formatDateTime(update.created_at)}</span>
                    </div>
                    <p className="text-muted-foreground mt-1 leading-relaxed">{update.note}</p>
                    <div className="text-[9px] text-muted-foreground mt-1.5 flex items-center gap-1">
                      <span>Logged by:</span>
                      <span className="font-bold text-foreground truncate max-w-[200px]">{actorLabel(update.user_id)}</span>
                    </div>
                  </div>
                ))}
              </div>
          </section>
        </div>
      </div>
    </div>
  );
}
