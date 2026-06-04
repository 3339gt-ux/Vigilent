'use client';

import React, { useRef, useState } from 'react';
import { FileCheck, Loader2, UploadCloud } from 'lucide-react';
import { evidenceAcceptAttribute, formatMaxEvidenceUploadSize, validateEvidenceFile } from '@/lib/evidenceStorage';
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
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const queueId = () => `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function EvidenceDropzone({
  label = 'Upload evidence',
  helperText = `PDF, DOCX, XLSX, PNG, JPG or JPEG. Max ${formatMaxEvidenceUploadSize()}.`,
  buttonLabel = 'Choose files',
  multiple = true,
  disabled = false,
  compact = false,
  onUpload,
  onComplete
}: EvidenceDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<EvidenceUploadQueueItem[]>([]);

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
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const item = nextItems[index];
      try {
        updateItem(item.id, { status: 'validating' });
        validateEvidenceFile(file);
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
    ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300'
    : 'border-border bg-muted/20 hover:bg-muted/40 text-foreground';

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={event => {
          if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={event => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={event => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={event => {
          event.preventDefault();
          setIsDragging(false);
          processFiles(event.dataTransfer.files);
        }}
        className={`relative border-2 border-dashed rounded-xl transition-colors ${dropClasses} ${compact ? 'p-3' : 'p-5'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={evidenceAcceptAttribute}
          multiple={multiple}
          disabled={disabled}
          className="hidden"
          onChange={event => processFiles(event.target.files || [])}
        />
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-300 shrink-0">
            {isDragging ? <FileCheck className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-xs">{isDragging ? 'Drop evidence files to upload' : label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{helperText}</p>
          </div>
          <span className="ml-auto px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-bold shrink-0">
            {buttonLabel}
          </span>
        </div>
      </div>

      {queue.length > 0 && (
        <div className="space-y-1.5 text-[10px]">
          {queue.slice(0, 8).map(item => (
            <div key={item.id} className="flex items-center justify-between gap-3 p-2 bg-card border border-border rounded-lg">
              <div className="min-w-0">
                <span className="font-bold block truncate">{item.fileName}</span>
                <span className="text-muted-foreground">{formatBytes(item.fileSize)}</span>
                {item.error && <span className="text-rose-500 block mt-0.5">{item.error}</span>}
              </div>
              <span className={`shrink-0 px-2 py-1 rounded font-bold uppercase ${
                item.status === 'complete' ? 'bg-emerald-500/10 text-emerald-500' :
                item.status === 'failed' ? 'bg-rose-500/10 text-rose-500' :
                'bg-blue-500/10 text-blue-500'
              }`}>
                {item.status !== 'complete' && item.status !== 'failed' && <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />}
                {item.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
