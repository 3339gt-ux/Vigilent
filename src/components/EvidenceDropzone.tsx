'use client';

import React, { useRef, useState } from 'react';
import {
  FileCheck,
  Loader2,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileArchive,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { calculateEvidenceFileHash, evidenceAcceptAttribute, formatMaxEvidenceUploadSize, validateEvidenceFile } from '@/lib/evidenceStorage';
import type { EvidenceDocument } from '@/lib/types';

export type EvidenceUploadQueueItem = {
  id: string;
  fileName: string;
  fileSize: number;
  status: 'validating' | 'uploading' | 'saving record' | 'linking' | 'complete' | 'failed';
  error?: string;
  document?: EvidenceDocument;
};

type EvidenceDropzoneProps = {
  label?: string;
  helperText?: string;
  buttonLabel?: string;
  multiple?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onUpload: (file: File, updateStatus: (status: EvidenceUploadQueueItem['status']) => void) => Promise<EvidenceDocument>;
  onComplete?: (documents: EvidenceDocument[]) => void;
  findDuplicates?: (file: File, fileHash: string) => Promise<EvidenceDocument[]>;
  onOpenExistingDocument?: (document: EvidenceDocument) => Promise<void> | void;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const queueId = () => `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['pdf'].includes(ext || '')) return <FileText className="w-5 h-5 text-rose-500" />;
  if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext || '')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
  if (['doc', 'docx'].includes(ext || '')) return <FileText className="w-5 h-5 text-indigo-500" />;
  if (['zip', 'rar', 'tar', 'gz'].includes(ext || '')) return <FileArchive className="w-5 h-5 text-amber-500" />;
  return <FileText className="w-5 h-5 text-zinc-500" />;
};

export function EvidenceDropzone({
  label = 'Upload evidence documents',
  helperText = `PDF, DOCX, XLSX, PNG, JPG or JPEG. Max ${formatMaxEvidenceUploadSize()}.`,
  buttonLabel = 'Browse Files',
  multiple = true,
  disabled = false,
  compact = false,
  onUpload,
  onComplete,
  findDuplicates,
  onOpenExistingDocument
}: EvidenceDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<EvidenceUploadQueueItem[]>([]);
  const [duplicateDecision, setDuplicateDecision] = useState<{
    file: File;
    fileHash: string;
    matches: EvidenceDocument[];
    resolve: (decision: 'upload' | 'skip' | 'cancel-all') => void;
  } | null>(null);

  const updateItem = (id: string, patch: Partial<EvidenceUploadQueueItem>) => {
    setQueue(current => current.map(item => item.id === id ? { ...item, ...patch } : item));
  };

  const processFiles = async (fileList: FileList | File[]) => {
    if (disabled) return;
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const nextItems = files.map(file => ({
      id: queueId(),
      fileName: file.name,
      fileSize: file.size,
      status: 'validating' as const
    }));
    setQueue(current => [...nextItems, ...current]);

    const uploadedDocs: EvidenceDocument[] = [];
    let cancelRemainingDuplicates = false;
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const item = nextItems[index];
      try {
        updateItem(item.id, { status: 'validating' });
        validateEvidenceFile(file);
        const fileHash = await calculateEvidenceFileHash(file);
        if (findDuplicates && !cancelRemainingDuplicates) {
          const matches = await findDuplicates(file, fileHash);
          if (matches.length > 0) {
            const decision = await new Promise<'upload' | 'skip' | 'cancel-all'>(resolve => {
              setDuplicateDecision({ file, fileHash, matches, resolve });
            });
            setDuplicateDecision(null);
            if (decision === 'cancel-all') {
              cancelRemainingDuplicates = true;
              updateItem(item.id, { status: 'failed', error: 'Cancelled possible duplicate upload.' });
              continue;
            }
            if (decision === 'skip') {
              updateItem(item.id, { status: 'failed', error: 'Skipped possible duplicate.' });
              continue;
            }
          }
        }
        updateItem(item.id, { status: 'uploading' });
        const document = await onUpload(file, status => updateItem(item.id, { status }));
        updateItem(item.id, { status: 'complete', document });
        uploadedDocs.push(document);
      } catch (error) {
        updateItem(item.id, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Upload failed.'
        });
      }
    }

    if (uploadedDocs.length > 0) onComplete?.(uploadedDocs);
    if (inputRef.current) inputRef.current.value = '';
  };

  const dropClasses = isDragging
    ? 'border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10 ring-2 ring-indigo-500/20'
    : 'border-border bg-muted/20 hover:bg-muted/40 hover:border-border-hover text-foreground';

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) inputRef.current?.click();
        }}
        onKeyDown={event => {
          if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            event.stopPropagation();
            inputRef.current?.click();
          }
        }}
        onDragEnter={event => {
          event.preventDefault();
          event.stopPropagation();
          if (!disabled) setIsDragging(true);
        }}
        onDragOver={event => {
          event.preventDefault();
          event.stopPropagation();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={event => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={event => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragging(false);
          processFiles(event.dataTransfer.files);
        }}
        className={`relative border-2 border-dashed rounded-xl transition-all duration-200 ${dropClasses} ${compact ? 'p-3' : 'p-6'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={evidenceAcceptAttribute}
          multiple={multiple}
          disabled={disabled}
          className="hidden"
          onChange={event => {
            event.stopPropagation();
            processFiles(event.target.files || []);
          }}
        />
        <div className={`flex ${compact ? 'items-start gap-2 text-left' : 'flex-col sm:flex-row items-center gap-4 text-center sm:text-left'}`}>
          <div className={`${compact ? 'p-2 rounded-lg' : 'p-3 rounded-xl'} bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0`}>
            {isDragging ? <FileCheck className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} animate-pulse`} /> : <UploadCloud className={compact ? 'w-4 h-4' : 'w-6 h-6'} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`font-extrabold text-foreground ${compact ? 'text-xs leading-tight' : 'text-sm'}`}>
              {isDragging ? 'Drop files here' : label}
            </p>
            <p className={`text-muted-foreground mt-1 ${compact ? 'text-[10px] leading-snug' : 'text-[11px] leading-relaxed'}`}>
              {isDragging ? 'Release files to start uploading' : helperText}
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            className={`${compact ? 'px-2.5 py-1.5 text-[10px]' : 'px-4 py-2 text-xs'} rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold shrink-0 transition-colors shadow-sm`}
          >
            {buttonLabel}
          </button>
        </div>
      </div>

      {queue.length > 0 && (
        <div className="space-y-2 mt-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <span className="font-bold">Upload Queue</span>
            <span>{queue.filter(q => q.status === 'complete').length} of {queue.length} completed</span>
          </div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {queue.map(item => {
              const isFailed = item.status === 'failed';
              const isComplete = item.status === 'complete';
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-3 p-3 bg-card border rounded-xl transition-all ${
                    isFailed ? 'border-rose-500/20 bg-rose-500/5' :
                    isComplete ? 'border-emerald-500/20 bg-emerald-500/5' :
                    'border-border hover:border-border-hover shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-muted rounded-lg shrink-0">
                      {getFileIcon(item.fileName)}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <span className="font-bold text-xs text-foreground block truncate">{item.fileName}</span>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground mt-0.5">
                        <span>{formatBytes(item.fileSize)}</span>
                        <span className="text-muted-foreground/30">•</span>
                        <span className={
                          isFailed ? 'text-rose-600 dark:text-rose-400 font-semibold' :
                          isComplete ? 'text-emerald-600 dark:text-emerald-400 font-semibold' :
                          'text-indigo-600 dark:text-indigo-400 font-medium'
                        }>
                          {item.status === 'validating' && 'Verifying file...'}
                          {item.status === 'uploading' && 'Uploading document...'}
                          {item.status === 'saving record' && 'Saving configuration...'}
                          {item.status === 'linking' && 'Linking to records...'}
                          {item.status === 'complete' && 'Upload successful'}
                          {item.status === 'failed' && (item.error || 'Failed')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isComplete && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {isFailed && <AlertCircle className="w-4 h-4 text-rose-500" />}
                    {!isComplete && !isFailed && (
                      <Loader2 className="w-4 h-4 text-indigo-650 dark:text-indigo-400 animate-spin shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {duplicateDecision && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card solid-panel border border-border rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Potential Duplicate Document</span>
                <h3 className="text-base font-extrabold text-foreground mt-0.5">{duplicateDecision.file.name}</h3>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This file may already exist in the active organization. A hash match indicates identical content, while matching filename and metadata represents a possible duplicate.
            </p>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {duplicateDecision.matches.map(match => {
                const hashMatches = Boolean(match.file_hash && match.file_hash === duplicateDecision.fileHash);
                return (
                  <div key={match.id} className="p-3 border rounded-xl transition-all bg-muted/20 border-border/80">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-extrabold text-xs text-foreground block truncate">{match.title}</span>
                        <span className="text-[10px] text-muted-foreground block truncate">{match.original_file_name || match.file_name}</span>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${hashMatches ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'}`}>
                        {hashMatches ? 'Exact Content Match' : 'Metadata Match'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-[10px] text-muted-foreground border-t border-border/40 pt-2">
                      <span>Category: <strong className="text-foreground">{match.category}</strong></span>
                      <span>Status: <strong className="text-foreground">{match.status === 'deleted' ? 'Archived' : match.status}</strong></span>
                      <span>Uploaded: <strong className="text-foreground">{new Date(match.created_at).toLocaleDateString()}</strong></span>
                      <span>Expiry: <strong className="text-foreground">{match.expiry_date || 'None'}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 border-t border-border/60 pt-4">
              {onOpenExistingDocument && duplicateDecision.matches[0] && (
                <button
                  onClick={() => void onOpenExistingDocument(duplicateDecision.matches[0])}
                  className="px-4 py-2 bg-card hover:bg-muted border border-border rounded-lg font-bold text-xs transition-colors"
                >
                  View Existing
                </button>
              )}
              <button
                onClick={() => duplicateDecision.resolve('skip')}
                className="px-4 py-2 bg-muted hover:bg-muted/80 border border-border rounded-lg font-bold text-xs transition-colors"
              >
                Skip File
              </button>
              <button
                onClick={() => duplicateDecision.resolve('cancel-all')}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 rounded-lg font-bold text-xs transition-colors"
              >
                Cancel All Duplicates
              </button>
              <button
                onClick={() => duplicateDecision.resolve('upload')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs transition-all shadow-md shadow-indigo-650/15"
              >
                Upload Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
